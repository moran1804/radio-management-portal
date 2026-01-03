import { supabase } from "@/integrations/supabase/client";

export const regenerateRecurringShows = async () => {
  try {
    // Generate any missing shows (database function will handle duplicates)
    const { data, error } = await supabase.functions.invoke('generate-recurring-shows', {
      body: { weeks_ahead: 3 }
    });

    if (error) {
      console.error('Error regenerating shows:', error);
      throw error;
    }

    // Update title and description for existing live shows based on their recurring slots
    // But preserve customizations like show_type, file_path, storage_path, etc.
    const { data: slotsData } = await supabase
      .from('recurring_slots')
      .select('id, title, description');

    if (slotsData) {
      for (const slot of slotsData) {
        await supabase
          .from('shows')
          .update({
            title: slot.title,
            description: slot.description
          })
          .eq('recurring_slot_id', slot.id)
          .neq('show_type', 'prerecorded'); // Don't update prerecorded shows to avoid disruption
      }
    }

    console.log('Successfully regenerated shows:', data);
    return data;
  } catch (error) {
    console.error('Error in regenerateRecurringShows:', error);
    throw error;
  }
};