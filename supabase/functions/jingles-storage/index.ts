import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== jingles-storage function called ===');
  console.log('Request method:', req.method);

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get credentials from environment variables
    const nextcloudUrl = Deno.env.get('NEXTCLOUD_URL');
    const nextcloudUsername = Deno.env.get('NEXTCLOUD_USERNAME');
    const nextcloudPassword = Deno.env.get('NEXTCLOUD_PASSWORD');

    console.log('Environment variables:');
    console.log('- NEXTCLOUD_URL:', nextcloudUrl);
    console.log('- NEXTCLOUD_USERNAME:', nextcloudUsername);
    console.log('- NEXTCLOUD_PASSWORD:', nextcloudPassword ? '***' : 'NOT SET');

    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Nextcloud credentials' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body to get the path
    const { path } = await req.json();
    console.log('Requested path:', path);
    
    // Construct the base URL
    const baseUrl = nextcloudUrl.startsWith('http') ? nextcloudUrl : `https://${nextcloudUrl}`;
    console.log('Using Nextcloud base URL:', baseUrl);
    
    // Construct the full WebDAV URL for Jingles directory
    const webdavPath = path ? `Jingles/${path}` : 'Jingles';
    const webdavUrl = `${baseUrl}/remote.php/dav/files/${nextcloudUsername}/${webdavPath}`;
    
    console.log('Fetching files from:', webdavUrl);

    // Create Basic Auth header
    const auth = btoa(`${nextcloudUsername}:${nextcloudPassword}`);
    
    // Make WebDAV PROPFIND request
    const response = await fetch(webdavUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Depth': '1',
        'Content-Type': 'text/xml; charset=utf-8'
      },
      body: `<?xml version="1.0"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:displayname/>
            <d:getcontentlength/>
            <d:getlastmodified/>
            <d:resourcetype/>
            <d:getcontenttype/>
          </d:prop>
        </d:propfind>`
    });

    console.log('WebDAV response status:', response.status);
    
    if (!response.ok) {
      console.error('WebDAV request failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `WebDAV request failed: ${response.status} ${response.statusText}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const xmlText = await response.text();
    console.log('WebDAV response received');
    
    // Parse the WebDAV response
    const files = parseWebDAVResponse(xmlText, baseUrl, nextcloudUsername, webdavPath);
    
    return new Response(
      JSON.stringify({ files }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in jingles-storage function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function parseWebDAVResponse(xmlText: string, baseUrl: string, username: string, currentPath: string) {
  console.log('Parsing WebDAV response...');
  
  const files: Array<{
    name: string;
    size: number;
    modified: string;
    downloadUrl: string;
    streamUrl: string;
    isDirectory: boolean;
  }> = [];

  try {
    // Simple regex-based XML parsing for WebDAV responses
    const responsePattern = /<d:response[^>]*>(.*?)<\/d:response>/gs;
    const hrefPattern = /<d:href[^>]*>(.*?)<\/d:href>/s;
    const contentLengthPattern = /<d:getcontentlength[^>]*>(.*?)<\/d:getcontentlength>/s;
    const lastModifiedPattern = /<d:getlastmodified[^>]*>(.*?)<\/d:getlastmodified>/s;
    const collectionPattern = /<d:collection/;

    let match;
    while ((match = responsePattern.exec(xmlText)) !== null) {
      const responseXml = match[1];
      
      // Extract href
      const hrefMatch = hrefPattern.exec(responseXml);
      if (!hrefMatch) continue;
      
      const href = hrefMatch[1].trim();
      
      // Skip the current directory entry
      if (href.endsWith(`/remote.php/dav/files/${username}/${currentPath}/`) || 
          href.endsWith(`/remote.php/dav/files/${username}/${currentPath}`)) {
        continue;
      }
      
      // Extract filename from href
      const pathParts = href.split('/');
      const fileName = decodeURIComponent(pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]);
      
      if (!fileName || fileName === currentPath) continue;
      
      // Check if it's a directory
      const isDirectory = collectionPattern.test(responseXml);
      
      // Get file size
      const contentLengthMatch = contentLengthPattern.exec(responseXml);
      const size = contentLengthMatch ? parseInt(contentLengthMatch[1].trim()) : 0;
      
      // Get modification date
      const lastModifiedMatch = lastModifiedPattern.exec(responseXml);
      const modified = lastModifiedMatch ? lastModifiedMatch[1].trim() : '';
      
      // Construct file path for URLs
      const filePath = currentPath === 'Jingles' ? fileName : `${currentPath.replace('Jingles/', '')}/${fileName}`;
      const encodedFilePath = encodeURIComponent(filePath);
      
      // Create download and stream URLs using the stream-audio-proxy function
      const downloadUrl = `https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/stream-audio-proxy?file=Jingles/${encodedFilePath}&download=true`;
      const streamUrl = `https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/stream-audio-proxy?file=Jingles/${encodedFilePath}`;
      
      files.push({
        name: fileName,
        size: size,
        modified: modified,
        downloadUrl: downloadUrl,
        streamUrl: streamUrl,
        isDirectory: isDirectory
      });
    }
    
    // Sort files: directories first, then alphabetically
    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    console.log(`Parsed ${files.length} files/directories`);
    
  } catch (error) {
    console.error('Error parsing WebDAV response:', error);
  }
  
  return files;
}