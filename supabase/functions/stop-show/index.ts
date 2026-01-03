import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { scheduleId } = await req.json();
    console.log('Received scheduleId:', scheduleId);

    // Check if schedule exists first
    const { data: schedule, error: scheduleCheckError } = await supabase
      .from('schedules')
      .select('id, status')
      .eq('id', scheduleId)
      .single();
    
    if (scheduleCheckError) {
      console.error('Schedule check error:', scheduleCheckError);
      throw new Error(`Schedule not found: ${scheduleCheckError.message}`);
    }
    
    console.log('Found schedule:', schedule);

    // Check if jobs exist
    const { data: jobs, error: jobsCheckError } = await supabase
      .from('jobs')
      .select('id, status, schedule_id')
      .eq('schedule_id', scheduleId);
    
    if (jobsCheckError) {
      console.error('Jobs check error:', jobsCheckError);
      throw new Error(`Jobs check failed: ${jobsCheckError.message}`);
    }
    
    console.log('Found jobs:', jobs);

    // Update schedule status to cancelled
    console.log('Updating schedule status to cancelled...');
    const { error: scheduleError } = await supabase
      .from('schedules')
      .update({ status: 'cancelled' })
      .eq('id', scheduleId);

    if (scheduleError) {
      console.error('Schedule update error:', scheduleError);
      throw new Error(`Schedule update failed: ${scheduleError.message}`);
    }
    console.log('Schedule updated successfully');

    // Update job status to cancelled (try without status filter first)
    console.log('Updating job status to cancelled...');
    const { data: updatedJobs, error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('schedule_id', scheduleId)
      .select('id, status');

    if (jobError) {
      console.error('Job update error:', jobError);
      throw new Error(`Job update failed: ${jobError.message}`);
    }
    
    console.log('Jobs updated successfully:', updatedJobs);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Show stopped successfully',
        updatedJobs: updatedJobs?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stop-show error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});