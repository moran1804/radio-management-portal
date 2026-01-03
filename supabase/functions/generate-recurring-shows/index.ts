import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting recurring shows generation...');

    // Parse request body to get weeks_ahead parameter
    let weeksAhead = 3; // Default to 3 weeks
    try {
      const body = await req.json();
      if (body?.weeks_ahead && typeof body.weeks_ahead === 'number') {
        weeksAhead = body.weeks_ahead;
      }
    } catch (e) {
      // If no body or invalid JSON, use default
      console.log('Using default weeks_ahead:', weeksAhead);
    }

    // Call the database function to generate recurring shows
    const { data, error } = await supabase.rpc('generate_recurring_shows', {
      p_start_date: new Date().toISOString().split('T')[0],
      p_weeks_ahead: weeksAhead
    });

    if (error) {
      console.error('Error generating recurring shows:', error);
      throw error;
    }

    console.log(`Generated ${data} recurring shows`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated_count: data,
        message: `Successfully generated ${data} recurring shows`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    console.error('Error in generate-recurring-shows:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
});