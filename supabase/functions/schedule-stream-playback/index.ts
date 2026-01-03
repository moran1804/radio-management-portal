import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamRequest {
  showId: string;
}

// Upload and queue audio file via AzuraCast API
async function streamToAzuraCast(
  supabase: any,
  showId: string,
  filePath: string,
  showTitle: string
) {
  console.log('Starting AzuraCast integration...');
  
  const azuracastUrl = Deno.env.get('AZURACAST_BASE_URL');
  const azuracastApiKey = Deno.env.get('AZURACAST_API_KEY');
  const stationId = Deno.env.get('AZURACAST_STATION_ID');
  
  if (!azuracastUrl || !azuracastApiKey || !stationId) {
    throw new Error('AzuraCast configuration missing (URL, API key, or station ID)');
  }
  
  try {
    // Download the audio file from Supabase storage
    console.log(`Downloading audio file: ${filePath}`);
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('show-audio')
      .download(filePath);
    
    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio file: ${downloadError?.message}`);
    }
    
    console.log(`Downloaded ${audioData.size} bytes`);
    
    // Convert blob to array buffer for upload
    const arrayBuffer = await audioData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Create form data for file upload to AzuraCast
    const formData = new FormData();
    const filename = `show_${showId}_${Date.now()}.mp3`;
    const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
    formData.append('file', blob, filename);
    
    // Upload file to AzuraCast media library
    console.log('Uploading file to AzuraCast...');
    const uploadResponse = await fetch(`${azuracastUrl}/api/station/${stationId}/files`, {
      method: 'POST',
      headers: {
        'X-API-Key': azuracastApiKey,
      },
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`AzuraCast upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('File uploaded successfully:', uploadResult);
    
    // Add the file to the queue
    console.log('Adding file to AzuraCast queue...');
    const queueResponse = await fetch(`${azuracastUrl}/api/station/${stationId}/queue`, {
      method: 'POST',
      headers: {
        'X-API-Key': azuracastApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_id: uploadResult.id,
        cue_in: 0,
        cue_out: 0,
        fade_overlap: 0,
        fade_in: 0,
        fade_out: 0,
      }),
    });
    
    if (!queueResponse.ok) {
      const errorText = await queueResponse.text();
      throw new Error(`AzuraCast queue failed: ${queueResponse.status} - ${errorText}`);
    }
    
    const queueResult = await queueResponse.json();
    console.log('File queued successfully:', queueResult);
    
    // Trigger immediate playback by skipping to next song
    console.log('Triggering immediate playback...');
    const skipResponse = await fetch(`${azuracastUrl}/api/station/${stationId}/backend/skip`, {
      method: 'POST',
      headers: {
        'X-API-Key': azuracastApiKey,
      },
    });
    
    if (!skipResponse.ok) {
      console.warn('Skip command failed, but file is queued');
    }
    
    // Mark show as completed
    await supabase.from('shows').update({ status: 'completed' }).eq('id', showId);
    console.log('Show marked as completed');
    
  } catch (error) {
    console.error('AzuraCast streaming error:', error);
    
    // Update show status to cancelled on error
    try {
      await supabase.from('shows').update({ status: 'cancelled' }).eq('id', showId);
    } catch (updateError) {
      console.error('Failed to update show status on error:', updateError);
    }
    
    throw error;
  }
}

serve(async (req) => {
  console.log('=== STREAM PLAYBACK FUNCTION ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { showId } = await req.json() as StreamRequest;
    console.log(`Processing stream request for show: ${showId}`);

    // Get show data  
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .single();

    if (showError || !show) {
      throw new Error('Show not found');
    }

    if (!show.file_path) {
      throw new Error('No audio file found for show');
    }

    console.log(`Show: "${show.title}", File: ${show.file_path}`);

    // Update show status to live
    await supabase
      .from('shows')
      .update({ status: 'live' })
      .eq('id', showId);

    console.log(`Starting AzuraCast upload and streaming...`);

    // Start AzuraCast integration in background
    // Note: EdgeRuntime.waitUntil is not available in Supabase Edge Functions
    // So we'll call the function directly (blocking)
    await streamToAzuraCast(supabase, showId, show.file_path, show.title);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'AzuraCast streaming initiated',
        showId,
        message_detail: 'File will be uploaded to AzuraCast and queued for playback'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Stream failed';
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});