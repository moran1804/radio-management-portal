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

    const url = new URL(req.url);
    const jobId = url.pathname.split('/').pop();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, extraSeconds } = await req.json();

    console.log('Job control request:', jobId, action, extraSeconds);

    // Verify the job exists and user has permission
    const { data: jobData, error: jobError } = await supabaseClient
      .from('jobs')
      .select(`
        *,
        schedules!inner (
          *,
          shows!inner (
            *,
            djs!inner (
              user_id
            )
          )
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns this job or is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isOwner = jobData.schedules.shows.djs.user_id === user.id;
    const isAdmin = userRole?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'stop') {
      // Update job status to canceled
      const { error: updateError } = await supabaseClient
        .from('jobs')
        .update({ status: 'canceled' })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to cancel job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete the media file from storage if it exists
      const storagePath = jobData.schedules.shows.storage_path;
      if (storagePath) {
        console.log('Deleting media file:', storagePath);
        const { error: storageError } = await supabaseClient.storage
          .from('show-audio')
          .remove([storagePath]);

        if (storageError) {
          console.error('Error deleting media file:', storageError);
          // Don't fail the whole operation if storage deletion fails
          await supabaseClient
            .from('job_events')
            .insert({
              job_id: jobId,
              level: 'warn',
              message: `Failed to delete media file: ${storageError.message}`
            });
        } else {
          await supabaseClient
            .from('job_events')
            .insert({
              job_id: jobId,
              level: 'info',
              message: `Media file deleted: ${storagePath}`
            });
        }
      }

      // Log the stop action
      await supabaseClient
        .from('job_events')
        .insert({
          job_id: jobId,
          level: 'info',
          message: `Job stopped by ${isAdmin ? 'admin' : 'DJ'}: ${user.email}`
        });

      return new Response(
        JSON.stringify({ message: 'Job stopped and media deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'extend') {
      if (!extraSeconds || extraSeconds <= 0) {
        return new Response(
          JSON.stringify({ error: 'extraSeconds must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extend the schedule end time
      const currentEndTime = new Date(jobData.schedules.ends_at);
      const newEndTime = new Date(currentEndTime.getTime() + (extraSeconds * 1000));

      const { error: updateError } = await supabaseClient
        .from('schedules')
        .update({ ends_at: newEndTime.toISOString() })
        .eq('id', jobData.schedule_id);

      if (updateError) {
        console.error('Error extending schedule:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to extend schedule' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the extension
      await supabaseClient
        .from('job_events')
        .insert({
          job_id: jobId,
          level: 'info',
          message: `Show extended by ${extraSeconds} seconds by ${isAdmin ? 'admin' : 'DJ'}: ${user.email}`
        });

      return new Response(
        JSON.stringify({ 
          message: 'Schedule extended successfully',
          newEndTime: newEndTime.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "stop" or "extend"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in job-control:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});