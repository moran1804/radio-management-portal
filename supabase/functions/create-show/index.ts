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
    // Create client with service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get and validate the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user info
    let userId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      
      if (!userId) {
        throw new Error('No user ID in token');
      }
    } catch (err) {
      console.error('Failed to decode JWT:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { djId, storagePath, title, durationSeconds } = await req.json();

    if (!djId || !storagePath || !title || !durationSeconds) {
      return new Response(
        JSON.stringify({ error: 'djId, storagePath, title, and durationSeconds are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating show for DJ:', djId, 'with storage path:', storagePath);

    // Verify the DJ exists and belongs to the user (or user is admin)
    const { data: djData, error: djError } = await supabaseClient
      .from('djs')
      .select('id, user_id')
      .eq('id', djId)
      .single();

    if (djError || !djData) {
      return new Response(
        JSON.stringify({ error: 'DJ not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns this DJ profile or is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isOwner = djData.user_id === userId;
    const isAdmin = userRole?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only create shows for your own DJ profile' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the show
    const { data: showData, error: showError } = await supabaseClient
      .from('shows')
      .insert({
        dj_id: djId,
        storage_path: storagePath,
        title: title,
        duration_seconds: durationSeconds,
        // Note: status is now managed in schedules table, not shows
        user_id: djData.user_id,
        file_path: storagePath,
        start_time: new Date().toISOString(), // Default start time
        end_time: new Date(Date.now() + (durationSeconds * 1000)).toISOString() // Default end time
      })
      .select()
      .single();

    if (showError) {
      console.error('Error creating show:', showError);
      return new Response(
        JSON.stringify({ error: 'Failed to create show' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        show: showData,
        message: 'Show created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-show:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
