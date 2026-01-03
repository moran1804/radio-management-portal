import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const fileName = url.searchParams.get('file')
    const download = url.searchParams.get('download') === 'true'
    const deleteFile = url.searchParams.get('delete') === 'true'
    
    if (!fileName) {
      throw new Error('Missing file parameter')
    }

    // Get Nextcloud credentials
    const nextcloudUsername = Deno.env.get('NEXTCLOUD_USERNAME')?.trim()
    const nextcloudPassword = Deno.env.get('NEXTCLOUD_PASSWORD')
    
    if (!nextcloudUsername || !nextcloudPassword) {
      throw new Error('Missing Nextcloud credentials')
    }

    // Build the file URL - handle both prerecords and SDRShows paths
    let fileUrl;
    if (fileName.includes('/')) {
      // Already contains path structure like "SDRShows/MadMoney/filename.mp3"
      fileUrl = `https://storage.chapmoran.co.uk/remote.php/dav/files/${nextcloudUsername}/${fileName}`;
    } else {
      // Legacy single file path - assume it's in prerecords
      fileUrl = `https://storage.chapmoran.co.uk/remote.php/dav/files/${nextcloudUsername}/prerecords/${fileName}`;
    }
    
    // Create Basic Auth
    const credentials = btoa(`${nextcloudUsername}:${nextcloudPassword}`)
    
    console.log(`${deleteFile ? 'Deleting' : download ? 'Downloading' : 'Proxying'} audio file: ${fileName}`)
    
    // Handle delete request
    if (deleteFile) {
      const response = await fetch(fileUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${credentials}`,
        }
      })

      if (!response.ok) {
        console.error(`Failed to delete file: ${response.status}`)
        throw new Error(`Failed to delete file: ${response.status}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `File ${fileName} deleted successfully`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Fetch the file with authentication
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch file: ${response.status}`)
      throw new Error(`Failed to fetch file: ${response.status}`)
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'audio/mpeg'
    
    // Set appropriate headers for download vs streaming
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
    }
    
    if (download) {
      responseHeaders['Content-Disposition'] = `attachment; filename="${fileName}"`
    } else {
      responseHeaders['Accept-Ranges'] = 'bytes'
      responseHeaders['Cache-Control'] = 'public, max-age=3600'
    }
    
    // Stream the file back with proper headers
    return new Response(response.body, {
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Proxy error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})