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

    const { showId, startsAtISO, endsAtISO } = await req.json();

    console.log('Creating schedule for show:', showId, 'from', startsAtISO, 'to', endsAtISO);

    // Convert ISO strings to UTC timestamps and add 1 second to start time
    const originalStartTime = new Date(startsAtISO);
    const adjustedStartTime = new Date(originalStartTime.getTime() + 1000); // Add 1 second
    const startsAt = adjustedStartTime.toISOString();
    const endsAt = new Date(endsAtISO).toISOString();

    console.log('Time adjustment debug:');
    console.log('  Original start time:', originalStartTime.toISOString());
    console.log('  Adjusted start time (+1s):', startsAt);
    console.log('  End time:', endsAt);

    // Validate times
    if (new Date(endsAt) <= new Date(startsAt)) {
      return new Response(
        JSON.stringify({ error: 'End time must be after start time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for conflicts - get the DJ's mount point from the show
    const { data: showData, error: showError } = await supabaseClient
      .from('shows')
      .select(`
        *,
        djs!inner (
          id,
          icecast_mountpoint
        )
      `)
      .eq('id', showId)
      .single();

    if (showError || !showData) {
      return new Response(
        JSON.stringify({ error: 'Show not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for overlapping schedules for the same DJ (same mount point)
    const { data: conflictData, error: conflictError } = await supabaseClient
      .from('schedules')
      .select(`
        id,
        shows!inner (
          djs!inner (
            icecast_mountpoint
          )
        )
      `)
      .not('status', 'eq', 'cancelled')
      .or(`and(starts_at.lte.${startsAt},ends_at.gt.${startsAt}),and(starts_at.lt.${endsAt},ends_at.gte.${endsAt}),and(starts_at.gte.${startsAt},ends_at.lte.${endsAt})`);

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      return new Response(
        JSON.stringify({ error: 'Failed to check for conflicts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter conflicts for same mount point
    const sameMount = conflictData?.filter(conflict => 
      conflict.shows.djs.icecast_mountpoint === showData.djs.icecast_mountpoint
    );

    if (sameMount && sameMount.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Time slot conflicts with existing schedule for this mount point' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the schedule
    console.log('Inserting schedule with adjusted times:');
    console.log('  starts_at:', startsAt);
    console.log('  ends_at:', endsAt);
    
    const { data: scheduleData, error: scheduleError } = await supabaseClient
      .from('schedules')
      .insert({
        show_id: showId,
        starts_at: startsAt,
        ends_at: endsAt,
        status: 'scheduled'
      })
      .select()
      .single();

    if (scheduleData) {
      console.log('Schedule created successfully with times:');
      console.log('  Database starts_at:', scheduleData.starts_at);
      console.log('  Database ends_at:', scheduleData.ends_at);
    }

    if (scheduleError) {
      console.error('Error creating schedule:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Failed to create schedule' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the job
    console.log('Inserting job with adjusted time:');
    console.log('  run_at:', startsAt);
    
    const { data: jobData, error: jobError } = await supabaseClient
      .from('jobs')
      .insert({
        schedule_id: scheduleData.id,
        run_at: startsAt,
        status: 'pending'
      })
      .select()
      .single();

    if (jobData) {
      console.log('Job created successfully with time:');
      console.log('  Database run_at:', jobData.run_at);
    }

    if (jobError) {
      console.error('Error creating job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        scheduleId: scheduleData.id, 
        jobId: jobData.id,
        message: 'Schedule and job created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-schedule:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});