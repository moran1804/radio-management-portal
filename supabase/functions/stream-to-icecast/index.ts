import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamRequest {
  showId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== DIRECT ICECAST STREAMING ===');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { showId }: StreamRequest = await req.json();
    console.log(`Processing stream request for show: ${showId}`);

    // Get show details
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .single();

    if (showError || !show) {
      console.error('Show not found:', showError);
      throw new Error('Show not found');
    }

    console.log(`Show: "${show.title}", File: ${show.audio_file_path}`);

    // Get user's Icecast configuration
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('icecast_address, icecast_port, icecast_mountpoint, icecast_username, icecast_password_encrypted')
      .eq('user_id', show.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      throw new Error('User profile not found');
    }

    // Download audio file from Supabase Storage
    console.log(`Downloading audio file: ${show.audio_file_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('show-audio')
      .download(show.audio_file_path);

    if (downloadError || !fileData) {
      console.error('Failed to download audio file:', downloadError);
      throw new Error('Failed to download audio file');
    }

    const audioBuffer = await fileData.arrayBuffer();
    console.log(`Downloaded ${audioBuffer.byteLength} bytes`);

    // Update show status to 'live'
    const { error: updateError } = await supabase
      .from('shows')
      .update({ status: 'live' })
      .eq('id', showId);

    if (updateError) {
      console.error('Failed to update show status:', updateError);
    }

    // Stream directly to Icecast using SOURCE method
    console.log('Connecting to Icecast server...');
    const icecastUrl = `http://${profile.icecast_address}:${profile.icecast_port}${profile.icecast_mountpoint}`;
    
    // Create SOURCE request to Icecast
    const auth = btoa(`${profile.icecast_username}:${profile.icecast_password_encrypted}`);
    
    const streamResponse = await fetch(icecastUrl, {
      method: 'SOURCE',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'audio/mpeg',
        'User-Agent': 'Lovable-Stream/1.0',
        'Ice-Name': show.title,
        'Ice-Genre': 'Talk',
        'Ice-Public': '0'
      },
      body: audioBuffer
    });

    if (!streamResponse.ok) {
      const responseText = await streamResponse.text();
      console.error('Icecast streaming failed:', streamResponse.status, responseText);
      throw new Error(`Icecast streaming failed: ${streamResponse.status} - ${responseText}`);
    }

    console.log('Successfully started streaming to Icecast');

    // Schedule auto-stop based on show duration (estimate from file size)
    const estimatedDurationMinutes = Math.ceil(audioBuffer.byteLength / (128000 / 8 * 60)); // Rough estimate for 128kbps
    console.log(`Estimated duration: ${estimatedDurationMinutes} minutes`);

    // Set a timeout to stop the stream (this will run in background)
    setTimeout(async () => {
      try {
        await supabase
          .from('shows')
          .update({ status: 'completed' })
          .eq('id', showId)
          .eq('status', 'live');
        
        console.log(`Auto-stopped show ${showId} after estimated duration`);
      } catch (error) {
        console.error('Failed to auto-stop show:', error);
      }
    }, estimatedDurationMinutes * 60 * 1000);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Stream started successfully',
        showId,
        estimatedDuration: estimatedDurationMinutes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in stream-to-icecast:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to start stream'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});