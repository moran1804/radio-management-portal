import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NextcloudFile {
  name: string;
  size: number;  
  modified: string;
  downloadUrl: string;
  streamUrl: string;
  isDirectory: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Nextcloud credentials
    const nextcloudUsername = Deno.env.get('NEXTCLOUD_USERNAME')?.trim()
    const nextcloudPassword = Deno.env.get('NEXTCLOUD_PASSWORD')

    if (!nextcloudUsername || !nextcloudPassword) {
      throw new Error('Missing Nextcloud credentials')
    }

    console.log(`Connecting to Nextcloud for user: ${nextcloudUsername}`)

    // Build the WebDAV URL  
    const webdavUrl = `https://storage.chapmoran.co.uk/remote.php/dav/files/${nextcloudUsername}/prerecords`
    console.log(`WebDAV URL: ${webdavUrl}`)
    
    // Create Basic Auth
    const credentials = btoa(`${nextcloudUsername}:${nextcloudPassword}`)
    
    // Make PROPFIND request
    const response = await fetch(webdavUrl, {
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
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('WebDAV error:', errorText)
      throw new Error(`WebDAV failed: ${response.status}`)
    }

    const xmlResponse = await response.text()
    console.log('WebDAV success! Response length:', xmlResponse.length)
    
    // Parse files from XML response
    const files: NextcloudFile[] = []
    
    // Look for href tags containing files
    const hrefPattern = /<d:href>([^<]*)<\/d:href>/g
    const sizePattern = /<d:getcontentlength>(\d+)<\/d:getcontentlength>/g
    const modifiedPattern = /<d:getlastmodified>([^<]+)<\/d:getlastmodified>/g
    
    let hrefMatch
    const sizes: string[] = []
    const dates: string[] = []
    
    // Extract sizes and dates
    let sizeMatch
    while ((sizeMatch = sizePattern.exec(xmlResponse)) !== null) {
      sizes.push(sizeMatch[1])
    }
    
    let dateMatch
    while ((dateMatch = modifiedPattern.exec(xmlResponse)) !== null) {
      dates.push(dateMatch[1])
    }
    
    let fileIndex = 0
    
    // Extract file paths
    while ((hrefMatch = hrefPattern.exec(xmlResponse)) !== null) {
      const href = decodeURIComponent(hrefMatch[1])
      const fileName = href.split('/').pop()
      
      // Skip directories and non-audio files
      if (!fileName || href.endsWith('/') || !/\.(mp3|wav|ogg|m4a|flac|aac|aiff|wma)$/i.test(fileName)) {
        continue
      }
      
      console.log(`Found file: ${fileName}`)
      
      const size = sizes[fileIndex] ? parseInt(sizes[fileIndex]) : 0
      const modified = dates[fileIndex] ? new Date(dates[fileIndex]).toLocaleDateString() : 'Unknown'
      
      files.push({
        name: fileName,
        size: size,
        modified: modified,
        downloadUrl: `https://storage.chapmoran.co.uk/remote.php/dav/files/${nextcloudUsername}/prerecords/${fileName}`,
        streamUrl: `https://storage.chapmoran.co.uk/remote.php/dav/files/${nextcloudUsername}/prerecords/${fileName}`,
        isDirectory: false
      })
      
      fileIndex++
    }
    
    console.log(`Parsed ${files.length} files`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        files,
        source: 'nextcloud_webdav',
        message: `Found ${files.length} files in Nextcloud`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Nextcloud error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        files: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})