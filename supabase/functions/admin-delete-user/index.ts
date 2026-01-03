import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()

    // Check if the current user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) {
      throw new Error('Unauthorized')
    }

    // Verify admin role
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single()

    if (adminError || adminProfile?.role !== 'ADMIN') {
      throw new Error('Only admins can delete users')
    }

    // Check if user is deactivated before deletion
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('active, name, role')
      .eq('user_id', user_id)
      .single()

    if (profileError) {
      throw new Error('User not found')
    }

    if (targetProfile.active) {
      throw new Error('User must be deactivated before deletion')
    }

    console.log(`Starting deletion process for user ${targetProfile.name} (${user_id})`)

    // Get DJ ID for this user (check if they have a DJ profile)
    let djId = null
    const { data: djData } = await supabaseAdmin
      .from('djs')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()
    
    djId = djData?.id
    console.log(`DJ ID found: ${djId}`)

    // Delete all shows and recurring slots if user has DJ entry
    if (djId) {
      console.log(`Deleting data for DJ ID: ${djId}`)
      
      // Get all recurring slots for this DJ
      const { data: recurringSlots } = await supabaseAdmin
        .from('recurring_slots')
        .select('id')
        .eq('dj_id', djId)

      if (recurringSlots && recurringSlots.length > 0) {
        const slotIds = recurringSlots.map(slot => slot.id)
        console.log(`Deleting shows for recurring slots: ${slotIds}`)
        
        // Delete shows that reference these recurring slots
        const { error: showsError1 } = await supabaseAdmin
          .from('shows')
          .delete()
          .in('recurring_slot_id', slotIds)
        
        if (showsError1) {
          console.error('Error deleting shows with recurring slots:', showsError1)
        }
      }

      // Delete recurring slots created by this DJ
      console.log(`Deleting recurring slots for DJ: ${djId}`)
      const { error: recursingSlotsError } = await supabaseAdmin
        .from('recurring_slots')
        .delete()
        .eq('dj_id', djId)
      
      if (recursingSlotsError) {
        console.error('Error deleting recurring slots:', recursingSlotsError)
      }

      // Delete any shows directly assigned to this DJ
      console.log(`Deleting direct shows for DJ: ${djId}`)
      const { error: showsError2 } = await supabaseAdmin
        .from('shows')
        .delete()
        .eq('dj_id', djId)
      
      if (showsError2) {
        console.error('Error deleting direct shows:', showsError2)
      }

      // Delete the DJ entry
      console.log(`Deleting DJ entry: ${djId}`)
      const { error: djError } = await supabaseAdmin
        .from('djs')
        .delete()
        .eq('id', djId)
      
      if (djError) {
        console.error('Error deleting DJ entry:', djError)
      }
    }

    // Delete any schedules related to shows by this user
    console.log(`Deleting schedules for user: ${user_id}`)
    const { data: userShows } = await supabaseAdmin
      .from('shows')
      .select('id')
      .eq('user_id', user_id)
    
    if (userShows && userShows.length > 0) {
      const showIds = userShows.map(show => show.id)
      const { error: schedulesError } = await supabaseAdmin
        .from('schedules')
        .delete()
        .in('show_id', showIds)
      
      if (schedulesError) {
        console.error('Error deleting schedules:', schedulesError)
      }
    }
    // Delete any remaining shows for this user
    console.log(`Deleting remaining shows for user: ${user_id}`)
    const { error: remainingShowsError } = await supabaseAdmin
      .from('shows')
      .delete()
      .eq('user_id', user_id)
    
    if (remainingShowsError) {
      console.error('Error deleting remaining shows:', remainingShowsError)
    }

    // Delete user_roles if they exist
    console.log(`Deleting user roles for user: ${user_id}`)
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id)
    
    if (rolesError) {
      console.error('Error deleting user roles:', rolesError)
    }

    // Explicitly delete the profile (in case cascade doesn't work)
    console.log(`Deleting profile for user: ${user_id}`)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', user_id)
    
    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
    }

    // Finally, delete user from auth
    console.log(`Deleting auth user: ${user_id}`)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (deleteError) {
      throw deleteError
    }

    console.log(`User ${targetProfile.name} (${user_id}) deleted successfully`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${targetProfile.name} deleted successfully` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error deleting user:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})