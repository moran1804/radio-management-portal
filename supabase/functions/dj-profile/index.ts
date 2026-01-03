import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!;
    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: '',
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      // Get DJ profile
      const { data, error } = await supabaseClient
        .from('djs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching DJ profile:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ profile: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { display_name, icecast_address, icecast_port, icecast_mountpoint, icecast_username, icecast_password_encrypted } = await req.json();

      if (!display_name || !icecast_username || !icecast_password_encrypted) {
        return new Response(
          JSON.stringify({ error: 'display_name, icecast_username, and icecast_password_encrypted are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Updating DJ profile for user:', user.id);

      // Check if profile exists
      const { data: existingProfile } = await supabaseClient
        .from('djs')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabaseClient
          .from('djs')
          .update({
            display_name,
            icecast_address: icecast_address || 'mystation.micast.media',
            icecast_port: icecast_port || 8025,
            icecast_mountpoint: icecast_mountpoint || '/',
            icecast_username,
            icecast_password_encrypted
          })
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new profile
        result = await supabaseClient
          .from('djs')
          .insert({
            user_id: user.id,
            display_name,
            icecast_address: icecast_address || 'mystation.micast.media',
            icecast_port: icecast_port || 8025,
            icecast_mountpoint: icecast_mountpoint || '/',
            icecast_username,
            icecast_password_encrypted
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving DJ profile:', result.error);
        return new Response(
          JSON.stringify({ error: 'Failed to save profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          profile: result.data,
          message: existingProfile ? 'Profile updated successfully' : 'Profile created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dj-profile:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});