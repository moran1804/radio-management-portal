import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Admin-create-user function started')
    
    const { email, name, role, icecast_username } = await req.json()
    console.log('Request data:', { email, name, role, icecast_username })

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No Authorization header')
      throw new Error('Authorization header missing')
    }
    
    const token = authHeader.replace('Bearer ', '')
    console.log('Token received, length:', token.length)

    // Decode JWT to get user ID (simple base64 decode of payload)
    let userId: string
    try {
      const payload = token.split('.')[1]
      const decoded = JSON.parse(atob(payload))
      userId = decoded.sub
      console.log('Decoded user ID:', userId)
    } catch (e) {
      console.error('Token decode error:', e)
      throw new Error('Invalid token format')
    }

    // Verify token is valid by checking if user exists
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authError || !authUser.user) {
      console.error('User verification error:', authError)
      throw new Error('Invalid or expired token')
    }

    console.log('Authenticated user verified:', authUser.user.id)

    // Check if current user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      throw new Error('Failed to verify admin status')
    }
    
    if (profile?.role !== 'ADMIN') {
      console.error('User is not admin:', profile?.role)
      throw new Error('Only admins can create users')
    }

    console.log('Admin verification passed')

    // Check if user with this email already exists
    const { data: existingUsers, error: existingError } = await supabaseAdmin.auth.admin.listUsers()
    if (existingError) {
      console.error('Error checking existing users:', existingError)
      throw new Error('Failed to check existing users')
    }

    const existingUser = existingUsers.users.find(u => u.email === email)
    if (existingUser) {
      console.error('User already exists with email:', email)
      throw new Error('A user with this email already exists')
    }

    console.log('Creating user with metadata:', { email, name, role })

    // Create user directly with proper metadata
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      user_metadata: { name, role },
      email_confirm: false, // Skip email confirmation for admin-created users
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    if (!newUser.user) {
      console.error('No user object returned')
      throw new Error('Failed to create user')
    }

    console.log('User created successfully:', newUser.user.id)

    console.log('User created successfully, waiting for profile creation...')

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Upsert the profile with additional info (INSERT ... ON CONFLICT UPDATE)
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        user_id: newUser.user.id,
        icecast_username: icecast_username || null,
        name,
        role: role as 'DJ' | 'ADMIN'
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })

    if (upsertError) {
      console.error('Error upserting profile:', upsertError)
      throw new Error(`Failed to update profile: ${upsertError.message}`)
    }

    console.log('Profile upserted successfully, creating DJ entry...')

    // All users (both DJs and Admins) need entries in the djs table
    const { error: djError } = await supabaseAdmin
      .from('djs')
      .insert({
        user_id: newUser.user.id,
        display_name: name,
        icecast_username: icecast_username || null,
        icecast_password_encrypted: null, // Will be set later by the user
        icecast_address: 'mystation.micast.media',
        icecast_port: 8025,
        icecast_mountpoint: '/live'
      })

    if (djError) {
      console.error('Error creating DJ entry:', djError)
      throw new Error(`Failed to create DJ entry: ${djError.message}`)
    }

    console.log('DJ entry created successfully, sending invitation...')

    // Send invitation email for password setup
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `https://mgmt.sdradiouk.co.uk/auth?mode=setup-password`
    })

    if (inviteError) {
      console.warn('Failed to send invitation email:', inviteError.message)
      // Don't throw error here as user is already created
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user?.id, email: newUser.user?.email } 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})