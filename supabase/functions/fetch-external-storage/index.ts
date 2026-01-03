import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExternalFile {
  name: string;
  size: number;
  modified: string;
  downloadUrl: string;
  streamUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const EXTERNAL_STORAGE_URL = "https://storage.chapmoran.co.uk/s/iWyHqQSKmayQHnR"
    
    console.log('Fetching external storage from:', EXTERNAL_STORAGE_URL)

    // Fetch the external storage page
    const response = await fetch(EXTERNAL_STORAGE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Radio Station Manager)',
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch external storage: ${response.status}`)
    }

    const html = await response.text()
    console.log('HTML fetched, length:', html.length)
    
    // Add more debugging - log snippets of HTML
    console.log('HTML contains "mp3":', html.includes('mp3'))
    console.log('HTML contains "openfile":', html.includes('openfile'))
    console.log('HTML contains "stream_":', html.includes('stream_'))
    
    // Log first 2000 characters to see the structure
    console.log('HTML first 2000 chars:', html.substring(0, 2000))
    
    // Parse the HTML to extract file information
    const files: ExternalFile[] = []
    
    // Strategy 1: Look for table rows containing file information
    const tableRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi
    const rows = html.match(tableRowPattern) || []
    console.log('Found table rows:', rows.length)
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      // First, check if this row contains any file extension
      if (row.match(/\.(mp3|wav|ogg|m4a|flac)/i)) {
        console.log(`Row ${i} contains audio file:`, row.substring(0, 200))
        
        // Look for file links with openfile parameter
        const fileMatch = row.match(/href="[^"]*[\?&]openfile=(\d+)"[^>]*>([^<]+\.(mp3|wav|ogg|m4a|flac))/i)
        if (fileMatch) {
          const [, fileId, fileName] = fileMatch
          console.log('Found file with openfile:', fileName, 'ID:', fileId)
          
          // Extract file size from the same row
          let sizeInBytes = 0
          const sizeMatch = row.match(/([\d.]+)\s*(B|KB|MB|GB)/i)
          if (sizeMatch) {
            const [, value, unit] = sizeMatch
            const numValue = parseFloat(value)
            switch (unit.toUpperCase()) {
              case 'GB': sizeInBytes = numValue * 1024 * 1024 * 1024; break
              case 'MB': sizeInBytes = numValue * 1024 * 1024; break
              case 'KB': sizeInBytes = numValue * 1024; break
              default: sizeInBytes = numValue; break
            }
          }
          
          // Extract modification time
          let modified = 'Unknown'
          const timeMatch = row.match(/(\d+\s+\w+\s+ago)/i)
          if (timeMatch) {
            modified = timeMatch[1].trim()
          }
          
          files.push({
            name: fileName.trim(),
            size: Math.round(sizeInBytes),
            modified: modified,
            downloadUrl: `${EXTERNAL_STORAGE_URL}/download?path=%2F&files=${encodeURIComponent(fileName.trim())}`,
            streamUrl: `${EXTERNAL_STORAGE_URL}?path=%2F&openfile=${fileId}`
          })
        } else {
          // Try to extract filename without openfile parameter
          const simpleFileMatch = row.match(/([^\/\s"<>]+\.(mp3|wav|ogg|m4a|flac))/i)
          if (simpleFileMatch) {
            const fileName = simpleFileMatch[1]
            console.log('Found file without openfile:', fileName)
            
            // Extract size
            let sizeInBytes = 0
            const sizeMatch = row.match(/([\d.]+)\s*(B|KB|MB|GB)/i)
            if (sizeMatch) {
              const [, value, unit] = sizeMatch
              const numValue = parseFloat(value)
              switch (unit.toUpperCase()) {
                case 'GB': sizeInBytes = numValue * 1024 * 1024 * 1024; break
                case 'MB': sizeInBytes = numValue * 1024 * 1024; break
                case 'KB': sizeInBytes = numValue * 1024; break
                default: sizeInBytes = numValue; break
              }
            }
            
            files.push({
              name: fileName.trim(),
              size: Math.round(sizeInBytes),
              modified: 'Recently',
              downloadUrl: `${EXTERNAL_STORAGE_URL}/download?path=%2F&files=${encodeURIComponent(fileName.trim())}`,
              streamUrl: `${EXTERNAL_STORAGE_URL}?path=%2F&files=${encodeURIComponent(fileName.trim())}`
            })
          }
        }
      }
    }
    
    // Strategy 2: Global search for audio files
    if (files.length === 0) {
      console.log('No files found in table rows, trying global search...')
      
      const audioFilePattern = /([^\/\s"<>]+\.(mp3|wav|ogg|m4a|flac))/gi
      const matches = html.match(audioFilePattern)
      if (matches) {
        console.log('Found audio files globally:', matches)
        const uniqueFiles = [...new Set(matches)]
        
        uniqueFiles.forEach(fileName => {
          console.log('Processing globally found file:', fileName)
          
          // Find the context around this filename
          const fileIndex = html.indexOf(fileName)
          const contextAfter = html.substring(fileIndex, fileIndex + 500)
          
          // Look for size in context
          let sizeInBytes = 20 * 1024 * 1024 // Default 20MB
          const sizeMatch = contextAfter.match(/([\d.]+)\s*(MB|KB|GB)/i)
          if (sizeMatch) {
            const [, value, unit] = sizeMatch
            const numValue = parseFloat(value)
            switch (unit.toUpperCase()) {
              case 'GB': sizeInBytes = numValue * 1024 * 1024 * 1024; break
              case 'MB': sizeInBytes = numValue * 1024 * 1024; break
              case 'KB': sizeInBytes = numValue * 1024; break
            }
          }
          
          files.push({
            name: fileName,
            size: Math.round(sizeInBytes),
            modified: 'Recently',
            downloadUrl: `${EXTERNAL_STORAGE_URL}/download?path=%2F&files=${encodeURIComponent(fileName)}`,
            streamUrl: `${EXTERNAL_STORAGE_URL}?path=%2F&files=${encodeURIComponent(fileName)}`
          })
        })
      }
    }
    
    // If no files found, try alternative parsing for the specific format we saw
    if (files.length === 0) {
      console.log('No files found with primary method, trying alternative...')
      
      // Look for the specific patterns from the markdown we saw
      const specificFileMatch = html.match(/stream_\d{8}-\d{6}\.mp3/i)
      if (specificFileMatch) {
        const fileName = specificFileMatch[0]
        console.log('Found file via alternative method:', fileName)
        
        files.push({
          name: fileName,
          size: 25 * 1024 * 1024, // 25MB approximate
          modified: 'Recently',
          downloadUrl: `${EXTERNAL_STORAGE_URL}/download?path=%2F&files=${encodeURIComponent(fileName)}`,
          streamUrl: `${EXTERNAL_STORAGE_URL}?path=%2F&files=${encodeURIComponent(fileName)}`
        })
      }
    }

    console.log(`Found ${files.length} files:`, files.map(f => ({ name: f.name, size: f.size })))

    return new Response(
      JSON.stringify({ 
        success: true, 
        files,
        message: `Found ${files.length} files`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error fetching external storage:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
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