import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StopRequest {
  showId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { showId }: StopRequest = await req.json();
    console.log(`Stopping AzuraCast show: ${showId}`);

    // Get AzuraCast configuration
    const azuracastUrl = Deno.env.get('AZURACAST_BASE_URL');
    const azuracastApiKey = Deno.env.get('AZURACAST_API_KEY');
    const stationId = Deno.env.get('AZURACAST_STATION_ID');

    if (!azuracastUrl || !azuracastApiKey || !stationId) {
      console.log('AzuraCast config missing, updating show status only');
    } else {
      try {
        // Skip to next song to stop current show
        console.log('Skipping current track on AzuraCast...');
        const skipResponse = await fetch(`${azuracastUrl}/api/station/${stationId}/backend/skip`, {
          method: 'POST',
          headers: {
            'X-API-Key': azuracastApiKey,
          },
        });

        if (skipResponse.ok) {
          console.log('Successfully skipped to next track');
        } else {
          console.warn('Skip command failed, but continuing with status update');
        }
      } catch (azuracastError) {
        console.warn('AzuraCast stop failed:', azuracastError);
      }
    }

    // Update show status to completed
    const { error: updateError } = await supabase
      .from('shows')
      .update({ status: 'completed' })
      .eq('id', showId)
      .eq('status', 'live'); // Only stop if currently live

    if (updateError) {
      console.error('Failed to update show status:', updateError);
      throw new Error('Failed to stop show in database');
    }

    console.log('Show stopped successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Show stopped successfully',
        showId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in azuracast-stop-show:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to stop show'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});