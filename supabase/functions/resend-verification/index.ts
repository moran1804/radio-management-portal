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
    console.log('Resend-verification function started');
    
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token received, length:', token.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the authenticated user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    console.log('Authenticated user verified:', user.id);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      throw new Error('Unauthorized - admin access required');
    }

    console.log('Admin verification passed');

    const { user_id } = await req.json();
    console.log('Request data:', { user_id });

    if (!user_id) {
      throw new Error('User ID is required');
    }

    // Get user email first
    const { data: userData, error: userDataError } = await supabase.auth.admin.getUserById(user_id);
    
    if (userDataError || !userData.user) {
      console.error('Error fetching user:', userDataError);
      throw new Error('User not found');
    }

    console.log('Found user email:', userData.user.email);

    // Send new invite email using the user's email
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      userData.user.email || '',
      {
        redirectTo: `https://mgmt.sdradiouk.co.uk/auth?mode=setup-password`
      }
    );

    if (inviteError) {
      console.error('Error sending invite:', inviteError);
      throw inviteError;
    }

    console.log('Verification email resent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification email resent successfully'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in resend-verification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});