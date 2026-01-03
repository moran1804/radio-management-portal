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
    const { address, port, mountpoint, username, password } = await req.json();

    if (!address || !port || !username || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required connection parameters" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client to manage test show status
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let testShow = null; // Initialize test show variable

    console.log(`Testing connection to ${address}:${port}${mountpoint}`);

    // Prepare Icecast connection
    const icecastUrl = `http://${address}:${port}${mountpoint}`;
    const auth = btoa(`${username}:${password}`);

    console.log('Step 1: Testing basic connectivity...');

    // First test - simple HTTP connection to check server availability
    const basicController = new AbortController();
    const basicTimeoutId = setTimeout(() => basicController.abort(), 10000); // 10 second timeout

    try {
      // Try a simple GET request first to see if server is reachable
      const basicResponse = await fetch(`http://${address}:${port}/`, {
        method: 'GET',
        signal: basicController.signal
      });

      clearTimeout(basicTimeoutId);
      console.log(`Basic connectivity test: ${basicResponse.status}`);

    } catch (basicError) {
      clearTimeout(basicTimeoutId);
      if (basicError instanceof Error && basicError.name === 'AbortError') {
        console.log('Basic connectivity timeout');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Server is not reachable - check your server address and port" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      const errorMessage = basicError instanceof Error ? basicError.message : 'Unknown error';
      console.log('Basic connectivity error:', errorMessage);
    }

    // Get user info for creating test show
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create temporary test show
    const testStartTime = new Date();
    const testEndTime = new Date(testStartTime.getTime() + 10000); // 10 seconds test

    const { data: testShowData, error: showError } = await supabase
      .from('shows')
      .insert({
        user_id: user.id,
        title: 'Connection Test',
        description: 'Testing Icecast connection',
        start_time: testStartTime.toISOString(),
        end_time: testEndTime.toISOString(),
        status: 'live'
      })
      .select()
      .single();

    if (showError || !testShowData) {
      console.error('Failed to create test show:', showError);
    } else {
      testShow = testShowData;
      console.log('Test show created and marked as live');
    }

    console.log('Step 2: Testing Icecast SOURCE connection with 5 seconds of MP3 audio...');

    // Generate a proper MP3 frame for 128kbps, 44.1kHz, Stereo (417 bytes per frame)
    const createMp3Frame = () => {
      const frame = new Uint8Array(417);
      // MP3 Frame Header for 128kbps, 44.1kHz, Stereo, MPEG1 Layer III
      frame[0] = 0xFF; // Frame sync (11 bits)
      frame[1] = 0xFB; // Frame sync + MPEG1 + Layer III
      frame[2] = 0x90; // 128kbps bitrate
      frame[3] = 0x64; // 44.1kHz sample rate + padding
      
      // Fill the rest with valid MP3 silence data
      for (let i = 4; i < 417; i++) {
        frame[i] = i % 2 === 0 ? 0x00 : 0xFF;
      }
      return frame;
    };

    // Second test - actual Icecast SOURCE connection with streaming test
    const sourceController = new AbortController();
    const sourceTimeoutId = setTimeout(() => sourceController.abort(), 40000); // 40 second timeout

    try {
      // For MP3 at 128kbps, 44.1kHz: ~38.28 frames per second
      const framesPerSecond = 38.28;
      const totalFrames = Math.floor(5 * framesPerSecond); // 5 seconds
      const frameInterval = 1000 / framesPerSecond; // ~26.12ms per frame

      console.log(`Will send ${totalFrames} MP3 frames over 5 seconds (${frameInterval.toFixed(2)}ms intervals)`);

      let framesSent = 0;
      const startTime = Date.now();

      // Create a ReadableStream to send 5 seconds of MP3 data
      const audioStream = new ReadableStream({
        start(controller) {
          console.log('Starting 5-second MP3 audio stream...');
          
          const sendFrame = () => {
            if (framesSent < totalFrames) {
              const frame = createMp3Frame();
              controller.enqueue(frame);
              framesSent++;
              
              if (framesSent % 38 === 0) { // Log every second
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`Sent ${framesSent}/${totalFrames} frames (${elapsed}s elapsed)`);
              }
              
              setTimeout(sendFrame, frameInterval);
            } else {
              const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
              console.log(`Test audio stream complete - sent ${framesSent} frames in ${totalTime}s`);
              controller.close();
            }
          };
          
          sendFrame();
        }
      });

      const response = await fetch(icecastUrl, {
        method: 'SOURCE',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'audio/mpeg',
          'Ice-Name': 'Connection Test',
          'Ice-Description': 'SOURCE connection test with audio from dashboard',
          'Ice-Genre': 'Test',
          'Ice-Public': '0',
          'Ice-Audio-Info': 'ice-samplerate=44100;ice-bitrate=128;ice-channels=2',
        },
        body: audioStream,
        signal: sourceController.signal
      });

      clearTimeout(sourceTimeoutId);

      if (!response.ok) {
        console.log(`SOURCE connection failed with status: ${response.status}`);
        
        // Remove test show after failed test
        if (testShow) {
          await supabase
            .from('shows')
            .delete()
            .eq('id', testShow.id);
          console.log('Test show removed after failed test');
        }
        
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Authentication failed - check username and password" 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (response.status === 404) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Mountpoint not found - check your mountpoint configuration" 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `SOURCE connection failed with status ${response.status}` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log('Step 2: SOURCE connection successful with test audio streaming!');

      // Remove test show after successful test
      if (testShow) {
        await supabase
          .from('shows')
          .delete()
          .eq('id', testShow.id);
        console.log('Test show removed after successful test');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Successfully connected to Icecast server and streamed test audio" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (sourceError) {
      clearTimeout(sourceTimeoutId);
      
      // Remove test show after error
      if (testShow) {
        await supabase
          .from('shows')
          .delete()
          .eq('id', testShow.id);
        console.log('Test show removed after connection error');
      }
      
      if (sourceError instanceof Error && sourceError.name === 'AbortError') {
        console.log('SOURCE connection timeout');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "SOURCE connection timeout - server may not support streaming" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log('SOURCE connection error:', sourceError instanceof Error ? sourceError.message : String(sourceError));
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `SOURCE connection error: ${sourceError instanceof Error ? sourceError.message : String(sourceError)}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in test-icecast-connection function:', error);
    
    // Clean up test show if it exists
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Get user from auth header to find test show
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          // Remove any test shows for this user
          await supabase
            .from('shows')
            .delete()
            .eq('user_id', user.id)
            .eq('title', 'Connection Test');
          console.log('Cleaned up test show after error');
        }
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup test show:', cleanupError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Internal server error during connection test" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});