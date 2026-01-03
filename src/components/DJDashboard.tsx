import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Radio, Upload, Play, FileAudio, Plus, Calendar, Edit, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { formatUKDateTime, formatUKTime, utcToUKTime, createUKDateTimeRange } from "@/utils/timezone";
import { Switch } from "@/components/ui/switch";
import { RunnerStatus } from "@/components/RunnerStatus";

interface RecurringShow {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  show_type: 'live' | 'prerecorded';
  file_path: string | null;
  storage_path: string | null;
  recurring_slot_id: string | null;
  dj_id: string;
  schedule_status: string | null;
  dj_name?: string;
}

interface DJ {
  id: string;
  display_name: string;
  user_id: string;
}

interface NewShowForm {
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number;
  show_type: 'live' | 'prerecorded';
  dj_id: string;
  audio_file?: File;
}

export const DJDashboard = () => {
  const [upcomingShows, setUpcomingShows] = useState<RecurringShow[]>([]);
  const [pastShows, setPastShows] = useState<RecurringShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const [editingShow, setEditingShow] = useState<RecurringShow | null>(null);
  const [editMode, setEditMode] = useState(false); // true for edit, false for create
  const [deleteExistingAudio, setDeleteExistingAudio] = useState(false); // Track if user wants to delete existing audio

  // Add logging for dialog state changes
  useEffect(() => {
    console.log('🔍 Dialog State Changed:', {
      showAddDialog,
      editMode,
      editingShow: editingShow?.id || null
    });
  }, [showAddDialog, editMode, editingShow]);
  const [djs, setDJs] = useState<DJ[]>([]);
  const [newShow, setNewShow] = useState<NewShowForm>({
    title: '',
    description: '',
    start_time: '',
    duration_minutes: 60,
    show_type: 'live',
    dj_id: ''
  });
  const [newShowUploading, setNewShowUploading] = useState(false);
  const [newShowUploadProgress, setNewShowUploadProgress] = useState(0);
  const [showOnlyMyShows, setShowOnlyMyShows] = useState(false);
  const [currentUserDJ, setCurrentUserDJ] = useState<DJ | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchUpcomingShows = async () => {
    if (!user) return;

    try {
      const now = new Date();
      
      if (profile?.role === 'ADMIN') {
        let upcomingQuery = supabase
          .from('shows')
          .select(`
            *,
            schedules (
              id,
              status,
              starts_at,
              ends_at
            ),
            djs (
              display_name
            )
          `)
          .gte('end_time', now.toISOString()) // Include shows that haven't ended yet
          .order('start_time', { ascending: true })
          .limit(20);

        let pastQuery = supabase
          .from('shows')
          .select(`
            *,
            schedules (
              id,
              status,
              starts_at,
              ends_at
            ),
            djs (
              display_name
            )
          `)
          .lt('end_time', now.toISOString())
          .order('start_time', { ascending: false })
          .limit(20);

        // If admin wants to see only their own shows, filter by their DJ profile or user_id
        if (showOnlyMyShows) {
          console.log('🔍 Admin filtering for own shows for user:', user.id);
          
          // Try to get their DJ profile first
          const { data: djData } = await supabase
            .from('djs')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle(); // Use maybeSingle to avoid errors if no DJ profile exists

          console.log('👤 Admin DJ profile found:', djData);

          if (djData) {
            // Filter by either dj_id OR user_id to catch all shows assigned to this admin
            upcomingQuery = upcomingQuery.or(`dj_id.eq.${djData.id},user_id.eq.${user.id}`);
            pastQuery = pastQuery.or(`dj_id.eq.${djData.id},user_id.eq.${user.id}`);
            console.log('🔍 Filtering by DJ ID or user ID');
          } else {
            // No DJ profile, just filter by user_id
            upcomingQuery = upcomingQuery.eq('user_id', user.id);
            pastQuery = pastQuery.eq('user_id', user.id);
            console.log('🔍 Filtering by user ID only (no DJ profile)');
          }
        }

        const { data: upcomingData, error: upcomingError } = await upcomingQuery;
        if (upcomingError) throw upcomingError;
        setUpcomingShows((upcomingData || []).map(show => ({
          ...show,
          show_type: show.show_type as 'live' | 'prerecorded',
          schedule_status: show.schedules?.[0]?.status || null,
          dj_name: show.djs?.display_name || null
        })));

        const { data: pastData, error: pastError } = await pastQuery;
        if (pastError) throw pastError;
        setPastShows((pastData || []).map(show => ({
          ...show,
          show_type: show.show_type as 'live' | 'prerecorded',
          schedule_status: show.schedules?.[0]?.status || null,
          dj_name: show.djs?.display_name || null
        })));
      } else {
        // Get DJ profile first for regular DJs
        const { data: djData } = await supabase
          .from('djs')
          .select('id, display_name, user_id')
          .eq('user_id', user.id)
          .single();

        if (!djData) return;

        // Store current user's DJ info
        setCurrentUserDJ(djData);

        // Fetch upcoming shows for this DJ (including currently live shows) with schedule status
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('shows')
          .select(`
            *,
            schedules (
              id,
              status,
              starts_at,
              ends_at
            )
          `)
          .eq('dj_id', djData.id)
          .gte('end_time', now.toISOString()) // Include shows that haven't ended yet
          .order('start_time', { ascending: true })
          .limit(10);

        if (upcomingError) throw upcomingError;
        setUpcomingShows((upcomingData || []).map(show => ({
          ...show,
          show_type: show.show_type as 'live' | 'prerecorded',
          schedule_status: show.schedules?.[0]?.status || null
        })));

        // Fetch past shows for this DJ with schedule status
        const { data: pastData, error: pastError } = await supabase
          .from('shows')
          .select(`
            *,
            schedules (
              id,
              status,
              starts_at,
              ends_at
            )
          `)
          .eq('dj_id', djData.id)
          .lt('end_time', now.toISOString())
          .order('start_time', { ascending: false })
          .limit(10);

        if (pastError) throw pastError;
        setPastShows((pastData || []).map(show => ({
          ...show,
          show_type: show.show_type as 'live' | 'prerecorded',
          schedule_status: show.schedules?.[0]?.status || null
        })));
      }
    } catch (error) {
      console.error('Error fetching shows:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch shows",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDJs = async () => {
    try {
      const { data, error } = await supabase
        .from('djs')
        .select('id, display_name, user_id')
        .order('display_name');

      if (error) throw error;
      setDJs(data || []);
    } catch (error) {
      console.error('Error fetching DJs:', error);
    }
  };

  useEffect(() => {
    fetchUpcomingShows();
    fetchDJs();
  }, [user, profile, showOnlyMyShows]);

  const toggleShowType = async (showId: string, currentType: string) => {
    try {
      const newType = currentType === 'live' ? 'prerecorded' : 'live';
      const newStatus = newType === 'live' ? 'pending' : 'scheduled';
      
      const { error } = await supabase
        .from('shows')
        .update({ 
          show_type: newType,
          status: newStatus
        })
        .eq('id', showId);

      if (error) throw error;

      toast({
        title: `Show switched to ${newType}`,
        description: newType === 'prerecorded' ? 'You can now upload an audio file' : 'Show will be broadcast live',
      });

      fetchUpcomingShows();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update show type",
      });
    }
  };

  const createShow = async () => {
    if (!profile) return;

    // For edit mode, call update function instead
    if (editMode && editingShow) {
      return updateShow();
    }

    if (profile.role !== 'ADMIN') return;

    try {
      const selectedDJ = djs.find(dj => dj.id === newShow.dj_id);
      if (!selectedDJ) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a DJ",
        });
        return;
      }

      // Convert UK time to UTC for database storage
      const { startUTC, endUTC } = createUKDateTimeRange(
        new Date(newShow.start_time), 
        '', // Empty since we already have a datetime
        newShow.duration_minutes
      );
      
      // For datetime-local input, we need to extract the time from the input
      const inputDateTime = new Date(newShow.start_time);
      const endTime = new Date(inputDateTime.getTime() + (newShow.duration_minutes * 60 * 1000));

      // Create the show first
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .insert({
          title: newShow.title,
          description: newShow.description || null,
          start_time: inputDateTime.toISOString(),
          end_time: endTime.toISOString(),
          show_type: newShow.show_type,
          dj_id: newShow.dj_id,
          user_id: selectedDJ.user_id,
          status: newShow.show_type === 'live' ? 'pending' : 'pending', // Will be set to 'scheduled' after upload
          duration_seconds: newShow.duration_minutes * 60
        })
        .select()
        .single();

      if (showError) throw showError;

      // If it's a prerecorded show and there's an audio file, upload it
      if (newShow.show_type === 'prerecorded' && newShow.audio_file) {
        await uploadAudioForShow(showData.id, newShow.audio_file);
      }

      toast({
        title: "Show created successfully",
        description: `${newShow.title} has been scheduled`,
      });

      setShowAddDialog(false);
      setNewShow({
        title: '',
        description: '',
        start_time: '',
        duration_minutes: 60,
        show_type: 'live',
        dj_id: ''
      });
      setNewShowUploading(false);
      setNewShowUploadProgress(0);
      fetchUpcomingShows();
    } catch (error: any) {
      console.error('Error creating show:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create show",
      });
    }
  };


  const openEditDialog = (show: RecurringShow) => {
    console.log('📝 Opening Edit Dialog for show:', { 
      showId: show.id, 
      title: show.title,
      showType: show.show_type,
      userRole: profile?.role 
    });
    
    // Convert UTC time to UK time for display
    const utcStartTime = new Date(show.start_time);
    const ukStartTime = utcToUKTime(utcStartTime);
    const endTime = new Date(show.end_time);
    const duration = Math.round((endTime.getTime() - utcStartTime.getTime()) / (60 * 1000));
    
    // Format UK time for datetime-local input (YYYY-MM-DDTHH:MM)
    const ukTimeString = format(ukStartTime, "yyyy-MM-dd'T'HH:mm");
    
    console.log('⏰ Calculated duration:', duration, 'minutes');
    console.log('🕐 Original UTC time:', show.start_time);
    console.log('🇬🇧 UK time for display:', ukTimeString);
    console.log('👤 Current user DJ ID from currentUserDJ:', currentUserDJ?.id);
    console.log('🎭 Show DJ ID:', show.dj_id);
    
    setEditingShow(show);
    setDeleteExistingAudio(false); // Reset delete flag when opening edit
    setNewShow({
      title: show.title,
      description: show.description || '',
      start_time: ukTimeString,
      duration_minutes: duration,
      show_type: show.show_type,
      dj_id: show.dj_id || currentUserDJ?.id || '', // Ensure DJ ID is set
      audio_file: undefined
    });
    
    console.log('🔄 Setting edit mode to true and opening dialog');
    setEditMode(true);
    setShowAddDialog(true);
    
    console.log('✅ Edit dialog should now be open with DJ ID:', show.dj_id || currentUserDJ?.id);
  };

  const openCreateDialog = () => {
    setEditingShow(null);
    setDeleteExistingAudio(false); // Reset delete flag
    setNewShow({
      title: '',
      description: '',
      start_time: '',
      duration_minutes: 60,
      show_type: 'live',
      dj_id: '',
      audio_file: undefined
    });
    setEditMode(false);
    setShowAddDialog(true);
  };

  const handleEditClick = (show: RecurringShow) => {
    console.log('🎯 Edit Click:', { 
      showId: show.id, 
      showTitle: show.title,
      userRole: profile?.role,
      isAdmin: profile?.role === 'ADMIN' 
    });
    
    console.log('🎧 Opening unified edit dialog for all users');
    openEditDialog(show);
  };


  const updateShow = async () => {
    if (!editingShow) {
      console.error('❌ updateShow: No editing show found');
      return;
    }

    console.log('🔄 Starting updateShow for show:', editingShow.id);
    console.log('📝 Update data:', {
      title: newShow.title,
      showType: newShow.show_type,
      hasAudioFile: !!newShow.audio_file,
      djId: newShow.dj_id,
      startTime: newShow.start_time,
      duration: newShow.duration_minutes,
      userRole: profile?.role
    });

    try {
      // Treat the datetime-local input as UK time and convert to UTC for database storage
      const ukDateTime = new Date(newShow.start_time);
      
      // Convert UK time to UTC using timezone utility
      const { startUTC, endUTC } = createUKDateTimeRange(
        ukDateTime, 
        format(ukDateTime, 'HH:mm'), 
        newShow.duration_minutes
      );
      
      console.log('⏰ Calculated times:', {
        inputUKTime: newShow.start_time,
        startTime: startUTC.toISOString(),
        endTime: endUTC.toISOString()
      });

      // Update the show - ensure dj_id is properly set
      console.log('🔄 Step 1: Updating show record...');
      const updateData: any = {
        title: newShow.title,
        description: newShow.description || null,
        start_time: startUTC.toISOString(),
        end_time: endUTC.toISOString(),
        show_type: newShow.show_type,
        duration_seconds: newShow.duration_minutes * 60
      };

      // Allow changing DJ assignment for both admins and DJs when editing a show
      if (profile?.role === 'ADMIN') {
        if (newShow.dj_id) {
          updateData.dj_id = newShow.dj_id;
          // Update user_id to match the selected DJ
          const selectedDJ = djs.find(dj => dj.id === newShow.dj_id);
          if (selectedDJ) {
            updateData.user_id = selectedDJ.user_id;
            console.log('🎯 Admin setting user_id to selected DJ user:', selectedDJ.user_id);
          } else {
            console.error('⚠️ Selected DJ not found in DJs list:', newShow.dj_id);
          }
        }
      } else {
        // DJs can reassign a single show to another DJ
        if (newShow.dj_id) {
          updateData.dj_id = newShow.dj_id;
          const selectedDJ = djs.find(dj => dj.id === newShow.dj_id);
          if (selectedDJ) {
            updateData.user_id = selectedDJ.user_id;
            console.log('🎯 DJ reassigning show to user_id:', selectedDJ.user_id);
          } else {
            console.error('⚠️ Selected DJ not found in DJs list:', newShow.dj_id);
          }
        } else if (currentUserDJ?.id) {
          updateData.dj_id = currentUserDJ.id;
          updateData.user_id = currentUserDJ.user_id;
          console.log('🎯 Defaulting to current user DJ:', currentUserDJ.id);
        }
      }

      console.log('📝 Update payload:', updateData);

      const { error: showError } = await supabase
        .from('shows')
        .update(updateData)
        .eq('id', editingShow.id);

      if (showError) {
        console.error('❌ Show update failed:', showError);
        throw showError;
      }
      console.log('✅ Step 1 complete: Show record updated');

      // If switching to prerecorded and there's a file, upload it and handle scheduling
      if (newShow.show_type === 'prerecorded' && newShow.audio_file) {
        console.log('🔄 Step 2: Uploading audio file for prerecorded show...');
        console.log('📁 File details:', {
          name: newShow.audio_file.name,
          size: newShow.audio_file.size,
          type: newShow.audio_file.type
        });
        
        try {
          await uploadAudioForShow(editingShow.id, newShow.audio_file);
          console.log('✅ Step 2 complete: Audio file uploaded successfully');
        } catch (uploadError) {
          console.error('❌ Step 2 failed: Audio upload error:', uploadError);
          throw uploadError;
        }
      } else if (newShow.show_type === 'prerecorded' && !newShow.audio_file && editingShow.show_type === 'prerecorded') {
        // Editing an existing prerecorded show without uploading new file
        // Need to update schedule and job with new times
        console.log('🔄 Step 2: Updating schedule and job for existing prerecorded show...');
        
        const { data: existingSchedule, error: scheduleCheckError } = await supabase
          .from('schedules')
          .select('id')
          .eq('show_id', editingShow.id)
          .maybeSingle();
        
        if (scheduleCheckError) {
          console.error('❌ Failed to check existing schedule:', scheduleCheckError);
          throw scheduleCheckError;
        }

        if (existingSchedule) {
          // Update existing schedule
          console.log('📅 Updating existing schedule:', existingSchedule.id);
          const { error: scheduleUpdateError } = await supabase
            .from('schedules')
            .update({
              starts_at: startUTC.toISOString(),
              ends_at: endUTC.toISOString(),
              status: 'scheduled' // Reset status from cancelled back to scheduled
            })
            .eq('id', existingSchedule.id);
          
          if (scheduleUpdateError) {
            console.error('❌ Failed to update schedule:', scheduleUpdateError);
            throw scheduleUpdateError;
          }
          console.log('✅ Schedule updated successfully');

          // Update associated job - reset status to pending if it failed
          const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({
              run_at: startUTC.toISOString(),
              status: 'pending' // Reset to pending so failed jobs get another chance
            })
            .eq('schedule_id', existingSchedule.id);
          
          if (jobUpdateError) {
            console.error('❌ Failed to update job:', jobUpdateError);
            throw jobUpdateError;
          }
          console.log('✅ Job updated successfully (status reset to pending)');
        } else {
          // No schedule exists - create one (edge case)
          console.log('📅 No schedule found, creating new schedule and job...');
          const { data: newSchedule, error: scheduleCreateError } = await supabase
            .from('schedules')
            .insert({
              show_id: editingShow.id,
              starts_at: startUTC.toISOString(),
              ends_at: endUTC.toISOString(),
              status: 'scheduled'
            })
            .select()
            .single();
          
          if (scheduleCreateError) {
            console.error('❌ Failed to create schedule:', scheduleCreateError);
            throw scheduleCreateError;
          }
          console.log('✅ Schedule created:', newSchedule);

          // Create job
          const { error: jobCreateError } = await supabase
            .from('jobs')
            .insert({
              schedule_id: newSchedule.id,
              run_at: startUTC.toISOString(),
              status: 'pending'
            });
          
          if (jobCreateError) {
            console.error('❌ Failed to create job:', jobCreateError);
            throw jobCreateError;
          }
          console.log('✅ Job created successfully');
        }
        
        console.log('✅ Step 2 complete: Schedule and job updated');
      } else if (newShow.show_type === 'prerecorded' && editingShow.show_type === 'live') {
        console.log('🔄 Step 2: Switching to prerecorded without file - updating status...');
        // Just switched to prerecorded without file - update status
        const { error: statusError } = await supabase
          .from('shows')
          .update({ status: 'scheduled' })
          .eq('id', editingShow.id);
        
        if (statusError) {
          console.error('❌ Status update failed:', statusError);
          throw statusError;
        }
        console.log('✅ Step 2 complete: Status updated to scheduled');
      } else if (newShow.show_type === 'live' && editingShow.show_type === 'prerecorded') {
        console.log('🔄 Step 2: Switching from prerecorded to live - cleaning up...');
        
        // Get schedules for this show to find associated jobs
        const { data: schedules, error: schedulesFetchError } = await supabase
          .from('schedules')
          .select('id')
          .eq('show_id', editingShow.id);
        
        if (schedulesFetchError) {
          console.error('❌ Failed to fetch schedules:', schedulesFetchError);
          throw schedulesFetchError;
        }

        // Delete jobs associated with schedules
        if (schedules && schedules.length > 0) {
          console.log('🗑️ Deleting jobs for schedules:', schedules.map(s => s.id));
          const { error: jobsDeleteError } = await supabase
            .from('jobs')
            .delete()
            .in('schedule_id', schedules.map(s => s.id));
          
          if (jobsDeleteError) {
            console.error('❌ Failed to delete jobs:', jobsDeleteError);
            throw jobsDeleteError;
          }
          console.log('✅ Jobs deleted successfully');
        }

        // Delete schedules
        const { error: schedulesDeleteError } = await supabase
          .from('schedules')
          .delete()
          .eq('show_id', editingShow.id);
        
        if (schedulesDeleteError) {
          console.error('❌ Failed to delete schedules:', schedulesDeleteError);
          throw schedulesDeleteError;
        }
        console.log('✅ Schedules deleted successfully');

        // Delete media file from storage if it exists
        if (editingShow.storage_path) {
          console.log('🗑️ Deleting media file from storage:', editingShow.storage_path);
          const { error: storageDeleteError } = await supabase.storage
            .from('show-audio')
            .remove([editingShow.storage_path]);
          
          if (storageDeleteError) {
            console.error('❌ Failed to delete media file:', storageDeleteError);
            // Don't throw here as file might not exist
          } else {
            console.log('✅ Media file deleted successfully');
          }
        }

        // Update show to remove file paths and set status to pending
        const { error: statusError } = await supabase
          .from('shows')
          .update({ 
            status: 'pending',
            file_path: null,
            storage_path: null
          })
          .eq('id', editingShow.id);
        
        if (statusError) {
          console.error('❌ Status update failed:', statusError);
          throw statusError;
        }
        console.log('✅ Step 2 complete: Show cleaned up and status updated to pending');
      } else if (newShow.show_type === 'live') {
        console.log('🔄 Step 2: Switching to live - updating status...');
        // Switched back to live - update status
        const { error: statusError } = await supabase
          .from('shows')
          .update({ status: 'pending' })
          .eq('id', editingShow.id);
        
        if (statusError) {
          console.error('❌ Status update failed:', statusError);
          throw statusError;
        }
        console.log('✅ Step 2 complete: Status updated to pending');
      } else {
        console.log('📝 Step 2: No additional updates needed (staying live without changes)');
      }

      console.log('✅ All steps completed successfully');
      toast({
        title: "Show updated",
        description: `${newShow.title} has been updated`,
      });

      setShowAddDialog(false);
      setEditingShow(null);
      setEditMode(false);
      
      // Refresh the shows list after all operations complete
      fetchUpcomingShows();
    } catch (error: any) {
      console.error('❌ updateShow failed with error:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update show: ${error.message || 'Unknown error'}`,
      });
    }
  };

  const deleteShow = async (showId: string, showTitle: string) => {
    if (!profile || profile.role !== 'ADMIN') return;

    if (!confirm(`Are you sure you want to delete "${showTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', showId);

      if (error) throw error;

      toast({
        title: "Show deleted successfully",
        description: `${showTitle} has been removed`,
      });

      fetchUpcomingShows();
    } catch (error: any) {
      console.error('Error deleting show:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete show",
      });
    }
  };

  const uploadAudioForShow = async (showId: string, file: File) => {
    console.log('🎵 Starting uploadAudioForShow:', { showId, fileName: file.name, fileSize: file.size });
    
    try {
      setNewShowUploading(true);
      setNewShowUploadProgress(0);

      // Create a unique file path for shows folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${showId}.${fileExt}`;
      const filePath = `shows/${fileName}`;

      console.log('📁 File details:', { fileName, filePath, fileExt });

      // Simulate progress for file preparation
      setNewShowUploadProgress(10);

      console.log('☁️ Step 1: Uploading to Supabase Storage using resumable upload...');
      
      // Use TUS resumable upload for large files
      const tus = await import('tus-js-client');
      const Upload = tus.Upload || (tus as any).default?.Upload || (tus as any).default;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: `https://rihknnbvhukomiacgcxp.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'show-audio',
            objectName: filePath,
            contentType: file.type,
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024, // 6MB chunks (required by Supabase)
          onError: (error: Error) => {
            console.error('❌ Upload failed:', error);
            reject(error);
          },
          onProgress: (bytesUploaded: number, bytesTotal: number) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 40) + 10; // 10-50%
            setNewShowUploadProgress(percentage);
            console.log(`📊 Upload progress: ${percentage}% (${bytesUploaded}/${bytesTotal} bytes)`);
          },
          onSuccess: () => {
            console.log('✅ Step 1 complete: File uploaded to storage');
            setNewShowUploadProgress(50);
            resolve();
          },
        });

        // Check for previous uploads and resume if possible
        upload.findPreviousUploads().then((previousUploads: any[]) => {
          if (previousUploads.length) {
            console.log('📎 Resuming previous upload');
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        });
      });

      // Update progress after upload
      setNewShowUploadProgress(50);

      console.log('📝 Step 2: Updating show record with file paths...');
      // Update the show record with file path
      const { error: updateError } = await supabase
        .from('shows')
        .update({
          file_path: fileName,
          storage_path: filePath,
          status: 'scheduled'
        })
        .eq('id', showId);

      if (updateError) {
        console.error('❌ Step 2 failed: Show update error:', updateError);
        console.error('❌ Error details:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }
      console.log('✅ Step 2 complete: Show record updated');

      // Update progress
      setNewShowUploadProgress(70);

      console.log('🔍 Step 3: Fetching show details for scheduling...');
      // Now get show details for scheduling
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .select('start_time, end_time, dj_id, user_id')
        .eq('id', showId)
        .single();

      if (showError) {
        console.error('❌ Step 3 failed: Show fetch error:', showError);
        throw showError;
      }
      console.log('✅ Step 3 complete: Show data fetched:', showData);

      // Update progress
      setNewShowUploadProgress(85);

      console.log('📅 Step 4: Creating schedule entry...');
      // Create schedule entry for the show runner to pick up
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          show_id: showId,
          starts_at: showData.start_time,
          ends_at: showData.end_time,
          status: 'scheduled'
        })
        .select()
        .single();

      if (scheduleError) {
        console.error('❌ Step 4 failed: Schedule creation error:', scheduleError);
        console.error('❌ Schedule error details:', {
          message: scheduleError.message,
          code: scheduleError.code,
          details: scheduleError.details,
          hint: scheduleError.hint
        });
        throw scheduleError;
      }
      console.log('✅ Step 4 complete: Schedule created:', scheduleData);

      // Update progress
      setNewShowUploadProgress(95);

      console.log('⚙️ Step 5: Creating job entry...');
      // Create job entry for the show runner
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          schedule_id: scheduleData.id,
          run_at: showData.start_time,
          status: 'pending'
        })
        .select()
        .single();

      if (jobError) {
        console.error('❌ Step 5 failed: Job creation error:', jobError);
        console.error('❌ Job error details:', {
          message: jobError.message,
          code: jobError.code,
          details: jobError.details,
          hint: jobError.hint
        });
        
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Show scheduled but job creation failed. Check with admin.",
        });
      } else {
        console.log('✅ Step 5 complete: Job created successfully:', jobData);
      }

      // Complete progress
      setNewShowUploadProgress(100);

      console.log('🎉 All steps completed successfully!');
      toast({
        title: "Audio uploaded successfully",
        description: "Show is now scheduled and ready for playback",
      });
    } catch (error: any) {
      console.error('💥 uploadAudioForShow failed with error:', error);
      console.error('💥 Full error object:', {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: `${error.message || 'Failed to upload audio file'}`,
      });
      throw error;
    } finally {
      setNewShowUploading(false);
      setNewShowUploadProgress(0);
    }
  };

  const uploadAudioFile = async (showId: string, file: File) => {
    try {
      setUploading({ ...uploading, [showId]: true });
      setUploadProgress({ ...uploadProgress, [showId]: 0 });

      // Create a unique file path for shows folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${showId}.${fileExt}`;
      const filePath = `shows/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('show-audio')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the show details to create schedule
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .select('start_time, end_time')
        .eq('id', showId)
        .single();

      if (showError) throw showError;

      // Update the show record with file path and set status to scheduled
      const { error: updateError } = await supabase
        .from('shows')
        .update({
          file_path: fileName,
          storage_path: filePath,
          show_type: 'prerecorded',
          status: 'scheduled'
        })
        .eq('id', showId);

      if (updateError) throw updateError;

      // Create schedule entry for the show runner to pick up
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          show_id: showId,
          starts_at: showData.start_time,
          ends_at: showData.end_time,
          status: 'scheduled'
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Create job entry for the show runner
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          schedule_id: scheduleData.id,
          run_at: showData.start_time,
          status: 'pending'
        })
        .select()
        .single();

      if (jobError) {
        console.error('Error creating job:', jobError);
        toast({
          variant: "destructive", 
          title: "Warning",
          description: "Show scheduled but job creation failed. Check with admin.",
        });
      } else {
        console.log('Job created successfully:', jobData);
      }

      toast({
        title: "Audio uploaded successfully",
        description: "Your show is now set to prerecorded",
      });

      fetchUpcomingShows();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload audio file",
      });
    } finally {
      setUploading({ ...uploading, [showId]: false });
      setUploadProgress({ ...uploadProgress, [showId]: 0 });
    }
  };

  const handleFileSelect = (showId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (MP3 or OGG)
    const isMP3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3');
    const isOGG = file.type === 'audio/ogg' || file.name.toLowerCase().endsWith('.ogg');
    
    if (!isMP3 && !isOGG) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an MP3 or OGG audio file",
      });
      return;
    }

    // Validate file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select a file smaller than 500MB",
      });
      return;
    }

    uploadAudioFile(showId, file);
  };

  if (loading) {
    return <div>Loading your dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                DJ Dashboard
              </CardTitle>
              <CardDescription>
                {profile?.role === 'ADMIN' ? 'Manage all shows and create new ones' : 'Manage your upcoming shows and audio uploads'}
              </CardDescription>
              <div className="mt-4">
                <RunnerStatus />
              </div>
            </div>
            <div className="flex items-center gap-4">
              {profile?.role === 'ADMIN' && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <label htmlFor="my-shows-filter" className="text-sm font-medium">
                    Show only my shows
                  </label>
                  <Switch
                    id="my-shows-filter"
                    checked={showOnlyMyShows}
                    onCheckedChange={setShowOnlyMyShows}
                  />
                </div>
              )}
              {profile?.role === 'ADMIN' && (
                <Button className="flex items-center gap-2" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Add Show
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Add/Edit Show Dialog - Available for all users */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Show' : 'Add New Show'}</DialogTitle>
          </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newShow.title}
                          onChange={(e) => setNewShow({ ...newShow, title: e.target.value })}
                          placeholder="Enter show title"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newShow.description}
                          onChange={(e) => setNewShow({ ...newShow, description: e.target.value })}
                          placeholder="Enter show description (optional)"
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="dj">DJ</Label>
                        <Select 
                          value={newShow.dj_id} 
                          onValueChange={(value) => setNewShow({ ...newShow, dj_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a DJ" />
                          </SelectTrigger>
                          <SelectContent>
                            {djs.map((dj) => (
                              <SelectItem key={dj.id} value={dj.id}>
                                {dj.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="start_time">Start Time</Label>
                          <Input
                            id="start_time"
                            type="datetime-local"
                            value={newShow.start_time}
                            onChange={(e) => setNewShow({ ...newShow, start_time: e.target.value })}
                            disabled={editMode && profile?.role !== 'ADMIN'}
                            className={editMode && profile?.role !== 'ADMIN' ? 'bg-muted' : ''}
                          />
                        </div>
                        <div className="grid gap-2">
                           <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                           <Input
                             id="duration_minutes"
                             type="number"
                             min="5"
                             max="480"
                             step="5"
                             value={newShow.duration_minutes}
                             onChange={(e) => setNewShow({ ...newShow, duration_minutes: parseInt(e.target.value) || 60 })}
                             disabled={editMode && profile?.role !== 'ADMIN'}
                             className={editMode && profile?.role !== 'ADMIN' ? 'bg-muted' : ''}
                           />
                         </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="show_type">Show Type</Label>
                        <Select value={newShow.show_type} onValueChange={(value: 'live' | 'prerecorded') => setNewShow({ ...newShow, show_type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="prerecorded">Pre-recorded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newShow.show_type === 'prerecorded' && (
                        <div className="grid gap-2">
                          {editMode && editingShow?.file_path && !deleteExistingAudio ? (
                            // Show existing audio file with delete option
                            <div className="space-y-2">
                              <Label>Current Audio File</Label>
                              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <FileAudio className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <span className="text-sm text-green-700 flex-1">
                                  {editingShow.file_path}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteExistingAudio(true)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete & Re-upload
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Click "Delete & Re-upload" to replace with a new file
                              </p>
                            </div>
                          ) : (
                            // Show upload box for new shows or when user wants to replace
                            <>
                              <Label htmlFor="audio_file">
                                {deleteExistingAudio ? 'Upload New MP3 Audio File' : 'Upload MP3 Audio File'}
                              </Label>
                              {deleteExistingAudio && (
                                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                                  <span>⚠️ Existing audio will be replaced when you save</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteExistingAudio(false)}
                                    className="ml-auto"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                              <Input
                                id="audio_file"
                                type="file"
                                accept="audio/mp3,audio/mpeg,audio/ogg,.mp3,.ogg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Validate file type (MP3 or OGG)
                                    const isMP3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3');
                                    const isOGG = file.type === 'audio/ogg' || file.name.toLowerCase().endsWith('.ogg');
                                    
                                    if (!isMP3 && !isOGG) {
                                      toast({
                                        variant: "destructive",
                                        title: "Invalid file type",
                                        description: "Please select an MP3 or OGG audio file",
                                      });
                                      e.target.value = '';
                                      return;
                                    }
                                    
                                    // Validate file size (500MB limit)
                                    if (file.size > 500 * 1024 * 1024) {
                                      toast({
                                        variant: "destructive",
                                        title: "File too large",
                                        description: "Please select a file smaller than 500MB",
                                      });
                                      e.target.value = '';
                                      return;
                                    }
                                    
                                    setNewShow({ ...newShow, audio_file: file });
                                  }
                                }}
                              />
                              <p className="text-sm text-muted-foreground">
                                Upload an MP3 or OGG file for pre-recorded show. Max size: 500MB
                              </p>
                              {newShowUploading && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Uploading and scheduling...</span>
                                    <span>{newShowUploadProgress}%</span>
                                  </div>
                                  <Progress value={newShowUploadProgress} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={createShow}
                          disabled={newShowUploading || !newShow.title || 
                                   (profile?.role === 'ADMIN' && !newShow.dj_id) || 
                                   (!editMode && !newShow.start_time) || 
                                   (newShow.show_type === 'prerecorded' && !editMode && !newShow.audio_file)}
                        >
                          {newShowUploading ? (editMode ? 'Updating & Uploading...' : 'Creating & Uploading...') : 
                           (editMode ? 'Update Show' : 'Create Show')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>


      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Shows ({upcomingShows.length})</TabsTrigger>
          <TabsTrigger value="past">Past Shows ({pastShows.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingShows.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No upcoming shows scheduled
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingShows.map((show) => (
              <Card key={show.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                       <CardTitle className="flex items-center gap-2">
                         {show.title}
                         <Badge variant={show.show_type === 'live' ? 'default' : 'secondary'}>
                           {show.show_type === 'live' ? (
                             <>
                               <Radio className="h-3 w-3 mr-1" />
                               Live
                             </>
                           ) : (
                             <>
                               <FileAudio className="h-3 w-3 mr-1" />
                               Pre-recorded
                             </>
                           )}
                         </Badge>
                         {show.recurring_slot_id && (
                           <Badge variant="outline">Recurring</Badge>
                         )}
                         {show.schedule_status && (
                           <Badge 
                             variant={
                               show.schedule_status === 'live' ? 'destructive' :
                               show.schedule_status === 'completed' ? 'secondary' :
                               show.schedule_status === 'cancelled' ? 'outline' :
                               'default'
                             }
                           >
                             {show.schedule_status.toUpperCase()}
                           </Badge>
                         )}
                       </CardTitle>
                        <CardDescription>
                          {formatUKDateTime(show.start_time, 'PPP p')} - {formatUKTime(show.end_time, 'p')}
                          {profile?.role === 'ADMIN' && show.dj_name && (
                            <span className="block text-sm text-muted-foreground mt-1">
                              DJ: {show.dj_name}
                            </span>
                          )}
                       </CardDescription>
                      {show.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {show.description}
                        </p>
                      )}
                    </div>
                     <div className="flex items-center gap-2">
                       {show.schedule_status === 'live' ? (
                         // Show only stop button when status is live
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              try {
                                const scheduleId = (show as any).schedules?.[0]?.id;
                                if (!scheduleId) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "No schedule found for this show",
                                  });
                                  return;
                                }

                                const { error } = await supabase.functions.invoke('stop-show', {
                                  body: { scheduleId }
                                });
                                
                                if (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to stop show",
                                  });
                                } else {
                                  toast({
                                    title: "Success",
                                    description: "Show stopped successfully",
                                  });
                                  fetchUpcomingShows(); // Refresh to update status
                                }
                              } catch (error) {
                                toast({
                                  variant: "destructive",
                                  title: "Error",
                                  description: "Failed to stop show",
                                });
                              }
                            }}
                          >
                            Stop Show
                          </Button>
                        ) : (
                          // Show normal buttons when not live
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(show)}
                              disabled={uploading[show.id]}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Show
                            </Button>
                            {profile?.role === 'ADMIN' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteShow(show.id, show.title)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                     </div>
                  </div>
                </CardHeader>
                
                {show.show_type === 'prerecorded' && (
                  <CardContent>
                    <div className="space-y-4">
                      {show.file_path ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <FileAudio className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">
                            Audio file uploaded: {show.file_path}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor={`audio-${show.id}`}>Upload Audio File</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`audio-${show.id}`}
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleFileSelect(show.id, e)}
                              disabled={uploading[show.id]}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              disabled={uploading[show.id]}
                              onClick={() => document.getElementById(`audio-${show.id}`)?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Browse
                            </Button>
                          </div>
                          {uploading[show.id] && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Uploading...</span>
                                <span>{uploadProgress[show.id] || 0}%</span>
                              </div>
                              <Progress value={uploadProgress[show.id] || 0} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastShows.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No past shows found
                </p>
              </CardContent>
            </Card>
          ) : (
            pastShows.map((show) => (
              <Card key={show.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                       <CardTitle className="flex items-center gap-2">
                         {show.title}
                         <Badge variant={show.show_type === 'live' ? 'default' : 'secondary'}>
                           {show.show_type === 'live' ? (
                             <>
                               <Radio className="h-3 w-3 mr-1" />
                               Live
                             </>
                           ) : (
                             <>
                               <FileAudio className="h-3 w-3 mr-1" />
                               Pre-recorded
                             </>
                           )}
                         </Badge>
                         {show.recurring_slot_id && (
                           <Badge variant="outline">Recurring</Badge>
                         )}
                         {show.schedule_status && (
                           <Badge 
                             variant={
                               show.schedule_status === 'live' ? 'destructive' :
                               show.schedule_status === 'completed' ? 'secondary' :
                               show.schedule_status === 'cancelled' ? 'outline' :
                               'default'
                             }
                           >
                             {show.schedule_status.toUpperCase()}
                           </Badge>
                         )}
                         <Badge variant="outline" className="text-gray-500">
                           Completed
                         </Badge>
                       </CardTitle>
                        <CardDescription>
                          {formatUKDateTime(show.start_time, 'PPP p')} - {formatUKTime(show.end_time, 'p')}
                          {profile?.role === 'ADMIN' && show.dj_name && (
                            <span className="block text-sm text-muted-foreground mt-1">
                              DJ: {show.dj_name}
                            </span>
                          )}
                       </CardDescription>
                      {show.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {show.description}
                        </p>
                      )}
                    </div>
                     <div className="flex items-center gap-2">
                       {show.schedule_status === 'live' ? (
                         // Show only stop button when status is live
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              try {
                                const scheduleId = (show as any).schedules?.[0]?.id;
                                if (!scheduleId) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "No schedule found for this show",
                                  });
                                  return;
                                }

                                const { error } = await supabase.functions.invoke('stop-show', {
                                  body: { scheduleId }
                                });
                                
                                if (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to stop show",
                                  });
                                } else {
                                  toast({
                                    title: "Success",
                                    description: "Show stopped successfully",
                                  });
                                  fetchUpcomingShows(); // Refresh to update status
                                }
                              } catch (error) {
                                toast({
                                  variant: "destructive",
                                  title: "Error",
                                  description: "Failed to stop show",
                                });
                              }
                            }}
                          >
                            Stop Show
                          </Button>
                       ) : (
                         // Show only delete button for past shows when not live
                         profile?.role === 'ADMIN' && (
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => deleteShow(show.id, show.title)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )
                       )}
                     </div>
                  </div>
                </CardHeader>
                
                {show.show_type === 'prerecorded' && show.file_path && (
                  <CardContent>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <FileAudio className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-700">
                        Audio file: {show.file_path}
                      </span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};