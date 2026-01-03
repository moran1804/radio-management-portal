import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== show-recordings-storage function called ===');
  console.log('Request method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const nextcloudUrlRaw = Deno.env.get('NEXTCLOUD_URL');
    const nextcloudUsername = Deno.env.get('NEXTCLOUD_USERNAME');
    const nextcloudPassword = Deno.env.get('NEXTCLOUD_PASSWORD');

    console.log('Environment variables:');
    console.log('- NEXTCLOUD_URL:', nextcloudUrlRaw);
    console.log('- NEXTCLOUD_USERNAME:', nextcloudUsername);
    console.log('- NEXTCLOUD_PASSWORD:', nextcloudPassword ? '***' : 'NOT SET');

    if (!nextcloudUrlRaw || !nextcloudUsername || !nextcloudPassword) {
      throw new Error('Missing Nextcloud credentials');
    }

    // Normalize base URL: ensure scheme and remove trailing slash
    const nextcloudUrl = (nextcloudUrlRaw.startsWith('http://') || nextcloudUrlRaw.startsWith('https://'))
      ? nextcloudUrlRaw
      : `https://${nextcloudUrlRaw}`;
    const normalizedBaseUrl = nextcloudUrl.replace(/\/+$/, '');

    console.log(`Using Nextcloud base URL: ${normalizedBaseUrl}`);

    // Parse request body to get the path
    let requestPath = '';
    try {
      const body = await req.json();
      requestPath = body.path || '';
    } catch (e) {
      // If no body, use empty path (root)
      console.log('No request body provided, using root path');
    }

    // Build the full WebDAV path for show recordings (configurable)
    const envPathRaw = Deno.env.get('NEXTCLOUD_PATH')?.trim();
    let pathPart = envPathRaw && envPathRaw.length > 0 ? envPathRaw : 'SDRShows';
    // If a full URL was provided by mistake, extract the path after /remote.php/dav/files/<username>
    if (/^https?:\/\//i.test(pathPart)) {
      try {
        const u = new URL(pathPart);
        const match = u.pathname.match(/\/remote\.php\/dav\/files\/[^/]+(\/.*)/);
        pathPart = match?.[1]?.replace(/^\/+/, '') || 'SDRShows';
      } catch {
        pathPart = 'SDRShows';
      }
    }
    const basePath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
    const fullPath = requestPath ? `${basePath}/${requestPath}` : basePath;
    const webdavUrl = `${normalizedBaseUrl}/remote.php/dav/files/${nextcloudUsername}${fullPath}`;

    console.log(`Fetching files from: ${webdavUrl}`);

    // Create basic auth credentials
    const credentials = btoa(`${nextcloudUsername}:${nextcloudPassword}`);

    // Ensure directory URL ends with trailing slash
    const dirUrl = webdavUrl.endsWith('/') ? webdavUrl : webdavUrl + '/';

    // Make WebDAV PROPFIND request to list directory contents
    const response = await fetch(dirUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Depth': '1',
        'Content-Type': 'text/xml',
      },
      body: `<?xml version="1.0"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:getcontentlength/>
            <d:getlastmodified/>
            <d:resourcetype/>
          </d:prop>
        </d:propfind>`
    });

    if (!response.ok) {
      console.error(`WebDAV request failed: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch directory listing: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('WebDAV response received');

    // Parse the WebDAV XML response
    const files = parseWebDAVResponse(xmlText, webdavUrl, normalizedBaseUrl, nextcloudUsername, basePath, requestPath);

    return new Response(
      JSON.stringify({
        success: true,
        files,
        currentPath: requestPath,
        message: `Found ${files.length} items in ${requestPath || 'root'}`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );

  } catch (error) {
    console.error('Error in show-recordings-storage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        files: []
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
});

function parseWebDAVResponse(xmlText: string, webdavUrl: string, nextcloudUrl: string, username: string, basePath: string, currentPath: string) {
  const files: any[] = [];

  // Find all <d:response> blocks (case-insensitive)
  const responses = xmlText.match(/<[^>]*:response[\s\S]*?<\/[^^>]*:response>/gi) || [];

  // Compute the target directory path to skip self entry
  const targetRel = `/remote.php/dav/files/${username}${currentPath ? `${basePath}/${currentPath}` : basePath}`.replace(/\/+$/, '') + '/';

  for (const responseBlock of responses) {
    try {
      // Extract href (file path)
      const hrefMatch = responseBlock.match(/<[^>]*:href[^>]*>([^<]+)<\/[^^>]*:href>/i);
      if (!hrefMatch) continue;
      const href = decodeURIComponent(hrefMatch[1]);

      // Skip the current directory itself
      const hrefNormalized = href.endsWith('/') ? href : href + '/';
      if (hrefNormalized.endsWith(targetRel)) continue;

      // Extract filename from href
      const pathParts = href.split('/').filter(Boolean);
      const fileName = href.endsWith('/') ? pathParts[pathParts.length - 1] : pathParts[pathParts.length - 1];
      if (!fileName) continue;

      // Check if it's a directory
      const isDirectory = /<[^>]*:collection\s*\/>/i.test(responseBlock) || /<[^>]*:resourcetype[^>]*>[\s\S]*?<[^>]*:collection\s*\/>[\s\S]*?<\/[^^>]*:resourcetype>/i.test(responseBlock);

      // Extract file size (only for files)
      let size = 0;
      if (!isDirectory) {
        const sizeMatch = responseBlock.match(/<[^>]*:getcontentlength[^>]*>([^<]+)<\/[^^>]*:getcontentlength>/i);
        if (sizeMatch) size = parseInt(sizeMatch[1], 10) || 0;
      }

      // Extract last modified date
      let modified = '';
      const modifiedMatch = responseBlock.match(/<[^>]*:getlastmodified[^>]*>([^<]+)<\/[^^>]*:getlastmodified>/i);
      if (modifiedMatch) {
        const d = new Date(modifiedMatch[1]);
        modified = isNaN(d.getTime()) ? modifiedMatch[1] : d.toLocaleDateString();
      }

      // Build download/stream URLs using the proxy
      const filePath = currentPath ? `${basePath}/${currentPath}/${fileName}` : `${basePath}/${fileName}`;
      const proxyBaseUrl = `https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/stream-audio-proxy`;
      const downloadUrl = `${proxyBaseUrl}?file=${encodeURIComponent(filePath.replace(/^\//, ''))}&download=true`;
      const streamUrl = `${proxyBaseUrl}?file=${encodeURIComponent(filePath.replace(/^\//, ''))}`;

      files.push({
        name: fileName,
        size,
        modified,
        downloadUrl,
        streamUrl,
        isDirectory
      });
    } catch (error) {
      console.error('Error parsing WebDAV response item:', error);
      continue;
    }
  }

  // Sort files - directories first, then by name
  files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return files;
}