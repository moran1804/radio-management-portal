import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting audio cleanup process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff time - 48 hours ago
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 48);
    
    console.log('🕒 Cutoff time for cleanup:', cutoffTime.toISOString());

    // Find shows that ended more than 48 hours ago and have audio files
    const { data: showsToCleanup, error: queryError } = await supabase
      .from('shows')
      .select('id, title, end_time, file_path, storage_path')
      .lt('end_time', cutoffTime.toISOString())
      .not('storage_path', 'is', null)
      .not('file_path', 'is', null);

    if (queryError) {
      console.error('❌ Error querying shows:', queryError);
      throw queryError;
    }

    console.log(`📋 Found ${showsToCleanup?.length || 0} shows with audio files to cleanup`);

    if (!showsToCleanup || showsToCleanup.length === 0) {
      console.log('✅ No audio files to cleanup');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No audio files to cleanup',
          cleanedCount: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let cleanedCount = 0;
    const errors: string[] = [];

    // Process each show for cleanup
    for (const show of showsToCleanup) {
      try {
        console.log(`🗑️ Processing show: "${show.title}" (ID: ${show.id})`);
        console.log(`📁 Storage path: ${show.storage_path}`);

        // Delete the file from storage
        if (show.storage_path) {
          const { error: deleteError } = await supabase.storage
            .from('show-audio')
            .remove([show.storage_path]);

          if (deleteError) {
            console.error(`❌ Error deleting file for show ${show.id}:`, deleteError);
            errors.push(`Failed to delete file for show "${show.title}": ${deleteError.message}`);
            continue;
          }

          console.log(`✅ Deleted file: ${show.storage_path}`);
        }

        // Clear the file paths from the database
        const { error: updateError } = await supabase
          .from('shows')
          .update({ 
            file_path: null, 
            storage_path: null 
          })
          .eq('id', show.id);

        if (updateError) {
          console.error(`❌ Error updating show ${show.id}:`, updateError);
          errors.push(`Failed to update database for show "${show.title}": ${updateError.message}`);
          continue;
        }

        console.log(`✅ Cleaned up show: "${show.title}"`);
        cleanedCount++;

      } catch (error) {
        console.error(`❌ Error processing show ${show.id}:`, error);
        errors.push(`Error processing show "${show.title}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`🎉 Cleanup completed. Cleaned ${cleanedCount} files. Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.error('❌ Cleanup errors:', errors);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Cleanup completed successfully`,
        cleanedCount,
        totalFound: showsToCleanup.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in cleanup process:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});