import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Station ID is hardcoded for micast.media
    const stationId = '3';
    const baseUrl = 'https://mystation.micast.media';

    console.log(`Fetching listener stats from micast.media station ${stationId}`);
    
    
    // Fetch station statistics
    const statsResponse = await fetch(`${baseUrl}/api/station/${stationId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!statsResponse.ok) {
      throw new Error(`Micast API error: ${statsResponse.status} ${statsResponse.statusText}`);
    }

    const statsData = await statsResponse.json();
    
    // Fetch now playing information with API key
    const nowPlayingResponse = await fetch(`${baseUrl}/api/nowplaying/${stationId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Basic ' + btoa('8f9b016f6d46b07d:b6bbd433fe48ed9db9eafbccb0cf8e1b'),
      },
    });

    let nowPlayingData = null;
    if (nowPlayingResponse.ok) {
      nowPlayingData = await nowPlayingResponse.json();
    }

    // Extract current DJ info from live data
    let currentDJ = null;
    if (nowPlayingData?.live) {
      currentDJ = {
        name: nowPlayingData.live.streamer_name || 'Auto DJ',
        is_live: nowPlayingData.live.is_live || false
      };
    }

    // Format the response data
    const formattedStats = {
      listeners: {
        current: statsData.mounts?.[0]?.listeners?.current || 0,
        unique: statsData.mounts?.[0]?.listeners?.unique || 0,
        total: statsData.mounts?.[0]?.listeners?.total || 0,
      },
      bitrate: statsData.mounts?.[0]?.bitrate || 128,
      format: statsData.mounts?.[0]?.format?.toUpperCase() || 'MP3',
      station: {
        name: statsData.name || 'Social Distance Radio',
        description: statsData.description || '',
      },
      now_playing: nowPlayingData?.now_playing ? {
        song: {
          title: nowPlayingData.now_playing.song?.title || 'Unknown',
          artist: nowPlayingData.now_playing.song?.artist || 'Unknown Artist',
          album: nowPlayingData.now_playing.song?.album || '',
        },
        duration: nowPlayingData.now_playing.duration || 0,
        elapsed: nowPlayingData.now_playing.elapsed || 0,
      } : null,
      current_dj: currentDJ,
    };

    console.log('Successfully fetched listener stats:', {
      current_listeners: formattedStats.listeners.current,
      unique_listeners: formattedStats.listeners.unique,
      now_playing: formattedStats.now_playing?.song?.title || 'None'
    });

    return new Response(
      JSON.stringify(formattedStats),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching listener stats:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch listener stats',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});