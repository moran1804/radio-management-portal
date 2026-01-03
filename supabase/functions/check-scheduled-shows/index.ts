import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for scheduled shows to start and shows to stop...');

    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60000); // 1 minute buffer

    // Find shows that should be starting now (within 1 minute)
    const { data: showsToStart, error: startError } = await supabase
      .from('shows')
      .select('*')
      .eq('status', 'scheduled')
      .gte('start_time', now.toISOString())
      .lt('start_time', oneMinuteFromNow.toISOString())
      .not('file_path', 'is', null);

    // Find shows that should be stopping now (end time has passed)
    const { data: showsToStop, error: stopError } = await supabase
      .from('shows')
      .select('*')
      .eq('status', 'live')
      .lt('end_time', now.toISOString());

    if (startError) {
      console.error('Error fetching scheduled shows:', startError);
      throw startError;
    }

    if (stopError) {
      console.error('Error fetching shows to stop:', stopError);
      throw stopError;
    }

    console.log(`Found ${showsToStart?.length || 0} shows to start`);
    console.log(`Found ${showsToStop?.length || 0} shows to stop`);

    const results = [];

    // Handle starting shows
    if (showsToStart && showsToStart.length > 0) {
      for (const show of showsToStart) {
        try {
          console.log(`Starting show: ${show.title} (ID: ${show.id})`);
          
          // For pre-recorded shows, use the AzuraCast scheduler
          // For live shows without files, use direct Icecast streaming
          const functionName = show.file_path ? 'schedule-stream-playback' : 'stream-to-icecast';
          
          // Call the appropriate streaming function
          const streamResponse = await supabase.functions.invoke(functionName, {
            body: { showId: show.id }
          });

          if (streamResponse.error) {
            console.error(`Failed to start show ${show.id}:`, streamResponse.error);
            results.push({
              showId: show.id,
              title: show.title,
              action: 'start',
              success: false,
              error: streamResponse.error
            });
          } else {
            console.log(`Successfully started show ${show.id}`);
            results.push({
              showId: show.id,
              title: show.title,
              action: 'start',
              success: true
            });
          }
        } catch (error) {
          console.error(`Error starting show ${show.id}:`, error);
          results.push({
            showId: show.id,
            title: show.title,
            action: 'start',
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    // Handle stopping shows
    if (showsToStop && showsToStop.length > 0) {
      for (const show of showsToStop) {
        try {
          console.log(`Stopping show: ${show.title} (ID: ${show.id})`);
          
          // Call the stop function
          const stopResponse = await supabase.functions.invoke('stop-show', {
            body: { showId: show.id }
          });

          if (stopResponse.error) {
            console.error(`Failed to stop show ${show.id}:`, stopResponse.error);
            results.push({
              showId: show.id,
              title: show.title,
              action: 'stop',
              success: false,
              error: stopResponse.error
            });
          } else {
            console.log(`Successfully stopped show ${show.id}`);
            results.push({
              showId: show.id,
              title: show.title,
              action: 'stop',
              success: true
            });
          }
        } catch (error) {
          console.error(`Error stopping show ${show.id}:`, error);
          results.push({
            showId: show.id,
            title: show.title,
            action: 'stop',
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked shows at ${now.toISOString()}`,
        showsToStart: showsToStart?.length || 0,
        showsToStop: showsToStop?.length || 0,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-scheduled-shows:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to check scheduled shows'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});