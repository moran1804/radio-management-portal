import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedShows, UnifiedShow } from "@/hooks/useUnifiedShows";
import { format } from "date-fns";
import { formatUKTime, formatUKDate, formatUKTimeRange, createUKDateTimeRange, utcToUKTime } from "@/utils/timezone";
import { normalizeStoragePath } from "@/utils/storagePathNormalizer";
import { Loader2, Upload, CalendarIcon, Clock, Edit, Trash2, Save, X, Play, Pause, Volume2, Plus, FileAudio, Square, Eye, Radio } from "lucide-react";

interface ScheduleShow {
  id?: string;
  title: string;
  description: string;
  startDate: Date | undefined;
  startTime: string;
  duration: number;
  file: File | null;
  djId?: string;
}

interface DJ {
  id: string;
  display_name: string;
  user_id: string;
}

export const UnifiedShowsCard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { shows, fetchShows, getScheduledShows, getUpcomingShows, getPastShows } = useUnifiedShows();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [stoppingShow, setStoppingShow] = useState<string | null>(null);
  const [djs, setDjs] = useState<DJ[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [formData, setFormData] = useState<ScheduleShow>({
    title: "",
    description: "",
    startDate: undefined,
    startTime: "",
    duration: 60,
    file: null,
    djId: undefined
  });

  const scheduledShows = getScheduledShows();
  const upcomingShows = getUpcomingShows();
  const pastShows = getPastShows();

  // Fetch DJs for the dropdown
  useEffect(() => {
    const fetchDJs = async () => {
      try {
        const { data, error } = await supabase
          .from('djs')
          .select('id, display_name, user_id')
          .order('display_name');
        
        if (error) throw error;
        setDjs(data || []);
      } catch (error) {
        console.error('Error fetching DJs:', error);
      }
    };

    fetchDJs();
  }, []);

  const getAudioUrl = async (filePath: string, showId: string) => {
    if (audioUrls[showId]) {
      return audioUrls[showId];
    }

    try {
      const { data } = await supabase.storage
        .from('show-audio')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        setAudioUrls(prev => ({ ...prev, [showId]: data.signedUrl }));
        return data.signedUrl;
      }
    } catch (error) {
      console.error('Error getting audio URL:', error);
      toast({
        title: "Error",
        description: "Failed to load audio file",
        variant: "destructive"
      });
    }
    return null;
  };

  const handlePlayAudio = async (show: UnifiedShow) => {
    if (!show.file_path) return;

    try {
      if (playingId === show.id) {
        // Pause current audio
        if (audioRef.current) {
          audioRef.current.pause();
          setPlayingId(null);
        }
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audioUrl = await getAudioUrl(show.file_path, show.id);
      if (!audioUrl) return;

      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingId(null);
      };

      audio.onerror = () => {
        toast({
          title: "Playback Error",
          description: "Failed to play audio file",
          variant: "destructive"
        });
        setPlayingId(null);
      };

      await audio.play();
      setPlayingId(show.id);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play audio file",
        variant: "destructive"
      });
    }
  };

  const handleStopShow = async (scheduleId: string) => {
    console.log('handleStopShow called with scheduleId:', scheduleId);
    setStoppingShow(scheduleId);
    
    try {      
      const { data, error } = await supabase.functions.invoke('stop-show', {
        body: { scheduleId }
      });

      console.log('Stop show response:', { data, error });

      if (error) {
        console.error('Error stopping show:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to stop show",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Show stopped successfully"
      });
      await fetchShows(); // Reload to get updated status
    } catch (error) {
      console.error('Error stopping show:', error);
      toast({
        title: "Error",
        description: "Failed to stop show",
        variant: "destructive"
      });
    } finally {
      setStoppingShow(null);
    }
  };

  const handlePlayNow = async (show: UnifiedShow) => {
    if (!show.file_path) {
      toast({
        title: "No Audio File",
        description: "This show doesn't have an audio file to stream",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Starting Stream",
        description: "Initiating live stream to Icecast server..."
      });

      const { error } = await supabase.functions.invoke('stream-to-icecast', {
        body: { showId: show.id }
      });

      if (error) {
        console.error('Error starting stream:', error);
        toast({
          title: "Streaming Error",
          description: `Failed to start stream: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Stream Started",
        description: "Live stream to Icecast has begun successfully!"
      });
      
      // Refresh shows to see updated status
      await fetchShows();
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Streaming Error",
        description: "Failed to start live stream",
        variant: "destructive"
      });
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'live':
        return { text: 'NOW PLAYING', color: 'text-red-600 bg-red-50 border-red-200' };
      case 'completed':
        return { text: 'COMPLETED', color: 'text-green-600 bg-green-50 border-green-200' };
      case 'stopped':
        return { text: 'STOPPED', color: 'text-orange-600 bg-orange-50 border-orange-200' };
      case 'cancelled':
        return { text: 'CANCELLED', color: 'text-gray-600 bg-gray-50 border-gray-200' };
      default:
        return { text: 'SCHEDULED', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
  };

  const handleInputChange = (field: keyof ScheduleShow, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/ogg' || file.type === 'audio/mp3' || file.name.toLowerCase().endsWith('.mp3') || file.name.toLowerCase().endsWith('.ogg'))) {
      handleInputChange('file', file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select an MP3 or OGG audio file",
        variant: "destructive"
      });
    }
  };

  const checkConflict = async (startTime: Date, endTime: Date, excludeId?: string) => {
    const { data } = await supabase.rpc('check_show_conflict', {
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString(),
      p_exclude_show_id: excludeId || null
    });
    return data;
  };

  // Storage path normalization helper
  const normalizeStoragePath = (path: string): string => {
    if (!path) return '';
    
    // Remove leading slash
    let normalized = path.replace(/^\/+/, '');
    
    // If it starts with show-audio/, remove that prefix
    if (normalized.startsWith('show-audio/')) {
      normalized = normalized.replace('show-audio/', '');
    }
    
    // If it's a full URL like /storage/v1/object/public/show-audio/<key>, extract <key>
    const urlMatch = normalized.match(/.*\/storage\/v1\/object\/public\/show-audio\/(.+)$/);
    if (urlMatch) {
      normalized = urlMatch[1];
    }
    
    // Ensure it starts with shows/
    if (!normalized.startsWith('shows/')) {
      // If it looks like a direct filename, prepend shows/
      if (!normalized.includes('/')) {
        normalized = `shows/${normalized}`;
      }
    }
    
    return normalized;
  };

  const uploadFileWithProgress = async (file: File, tempId: string) => {
    const fileExt = file.name.split('.').pop();
    const key = `shows/${tempId}.${fileExt}`;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate file
      const maxSizeMB = 200;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`);
      }

      const validTypes = ['audio/mpeg', 'audio/ogg', 'audio/mp3'];
      const validExtensions = ['.mp3', '.ogg'];
      const isValidType = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValidType) {
        throw new Error(`Invalid file type: ${file.type}. Please use MP3 or OGG files.`);
      }

      // Upload with progress simulation for large files
      const chunkSize = 1024 * 1024; // 1MB chunks
      
      if (file.size <= chunkSize) {
        const { data, error: uploadError } = await supabase.storage
          .from('show-audio')
          .upload(key, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;
        setUploadProgress(100);
        
        // Return data.path from the upload response
        return data.path;
      } else {
        let progressInterval: ReturnType<typeof setInterval>;
        
        const uploadPromise = supabase.storage
          .from('show-audio')
          .upload(key, file, {
            cacheControl: '3600',
            upsert: true
          });

        // Simulate progress for large files
        progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) return prev; // Stop at 90% until upload completes
            return prev + Math.random() * 10;
          });
        }, 500);

        const { data, error: uploadError } = await uploadPromise;
        clearInterval(progressInterval);
        
        if (uploadError) throw uploadError;
        setUploadProgress(100);
        
        // Return data.path from the upload response
        return data.path;
      }
    } catch (error) {
      setUploadProgress(0);
      throw error;
    } finally {
      setIsUploading(false);
      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.startDate || !formData.startTime || !formData.file) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and select an MP3 or OGG audio file",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      // Convert UK time to UTC for database storage
      const { startUTC, endUTC } = createUKDateTimeRange(
        formData.startDate, 
        formData.startTime, 
        formData.duration
      );
      
      // Add 1 second to prevent exact overlap
      const utcStartTime = new Date(startUTC);
      utcStartTime.setSeconds(utcStartTime.getSeconds() + 1);
      
      const utcEndTime = endUTC;

      // Check for conflicts first
      const hasConflict = await checkConflict(utcStartTime, utcEndTime, formData.id);
      if (hasConflict) {
        toast({
          title: "Time Conflict",
          description: "Another show is already scheduled for this time slot",
          variant: "destructive"
        });
        return;
      }

      let showId = formData.id;
      let filePath: string | null = null;

      if (formData.id) {
        // Update existing show
        showId = formData.id;
        
        // If there's a new file, upload it first
        if (formData.file) {
          toast({
            title: "Uploading...",
            description: "Please wait while we upload your audio file"
          });
          
          try {
            filePath = await uploadFileWithProgress(formData.file, showId);
          } catch (uploadError) {
            toast({
              title: "Upload Failed",
              description: `Failed to upload audio file: ${uploadError.message}. Show not updated.`,
              variant: "destructive"
            });
            return;
          }
        }

        // Update show only after successful upload (or if no new file)
        const updates: any = {
          title: formData.title,
          description: formData.description,
          start_time: utcStartTime.toISOString(),
          end_time: utcEndTime.toISOString(),
        };

        // If reassigning to a different DJ, update dj_id and user_id
        if (formData.djId) {
          const selectedDJ = djs.find(dj => dj.id === formData.djId);
          if (selectedDJ) {
            updates.dj_id = selectedDJ.id;
            updates.user_id = selectedDJ.user_id;
          }
        }

        // If adding an audio file, convert to prerecorded
        if (filePath) {
          updates.storage_path = normalizeStoragePath(filePath);
          updates.show_type = 'prerecorded';
        }

        const { error } = await supabase
          .from('shows')
          .update(updates)
          .eq('id', formData.id);

        if (error) throw error;

        // If we added an audio file, create schedule and job for the prerecorded show
        if (filePath) {
          toast({
            title: "Creating Schedule...",
            description: "Setting up schedule and job for prerecorded show"
          });

          const { data: scheduleResponse, error: scheduleError } = await supabase.functions.invoke('create-schedule', {
            body: {
              showId,
              startsAtISO: utcStartTime.toISOString(),
              endsAtISO: utcEndTime.toISOString()
            }
          });

          if (scheduleError) {
            toast({
              title: "Error",
              description: "Failed to create schedule for prerecorded show",
              variant: "destructive"
            });
            return;
          }
        } else {
          // No new audio uploaded. If this is a prerecorded show, ensure schedule and job are updated
          try {
            // Check if a schedule exists for this show
            const { data: existingSchedule, error: scheduleCheckError } = await supabase
              .from('schedules')
              .select('id')
              .eq('show_id', showId!)
              .maybeSingle();

            if (scheduleCheckError) throw scheduleCheckError;

            if (existingSchedule) {
              // Update schedule times
              const { error: scheduleUpdateError } = await supabase
                .from('schedules')
                .update({
                  starts_at: utcStartTime.toISOString(),
                  ends_at: utcEndTime.toISOString(),
                  status: 'scheduled' // Reset status in case it was cancelled or failed
                })
                .eq('id', existingSchedule.id);

              if (scheduleUpdateError) throw scheduleUpdateError;

              // Update associated job run time and reset status to pending
              const { error: jobUpdateError } = await supabase
                .from('jobs')
                .update({ 
                  run_at: utcStartTime.toISOString(),
                  status: 'pending' // Reset to pending so failed jobs get another chance
                })
                .eq('schedule_id', existingSchedule.id);

              if (jobUpdateError) throw jobUpdateError;
            } else {
              // Only create schedule/job if the show is prerecorded
              const { data: showRow, error: showFetchError } = await supabase
                .from('shows')
                .select('show_type')
                .eq('id', showId!)
                .single();

              if (showFetchError) throw showFetchError;

              if (showRow?.show_type === 'prerecorded') {
                const { error: scheduleCreateError } = await supabase.functions.invoke('create-schedule', {
                  body: {
                    showId,
                    startsAtISO: utcStartTime.toISOString(),
                    endsAtISO: utcEndTime.toISOString()
                  }
                });
                if (scheduleCreateError) throw scheduleCreateError;
              }
            }
          } catch (e) {
            console.error('Failed to update schedule/job for edited show:', e);
            toast({
              title: 'Schedule Update Failed',
              description: 'The show time was updated, but schedule/job could not be fully updated.',
              variant: 'destructive'
            });
            return;
          }
        }
      } else {
        // Create new show using the edge function flow
        const tempId = crypto.randomUUID();
        
        toast({
          title: "Uploading Audio...",
          description: "Please wait while we upload your audio file"
        });
        
        try {
          filePath = await uploadFileWithProgress(formData.file, tempId);
        } catch (uploadError) {
          toast({
            title: "Upload Failed", 
            description: `Failed to upload audio file: ${uploadError.message}. Show not scheduled.`,
            variant: "destructive"
          });
          return;
        }

        // Get audio duration
        const audioElement = document.createElement('audio');
        const audioUrl = URL.createObjectURL(formData.file);
        audioElement.src = audioUrl;
        
        const durationSeconds = await new Promise<number>((resolve) => {
          audioElement.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(audioUrl);
            resolve(Math.floor(audioElement.duration));
          });
        });

        // Get or create DJ profile
        let djId: string;
        const { data: existingDJ } = await supabase
          .from('djs')
          .select('id')
          .eq('user_id', user!.id)
          .single();

        if (existingDJ) {
          djId = existingDJ.id;
        } else {
          const { data: djData, error: djError } = await supabase
            .from('djs')
            .insert({
              user_id: user!.id,
              display_name: profile?.name || `${user!.email?.split('@')[0]} DJ`,
              icecast_address: profile?.icecast_address,
              icecast_port: profile?.icecast_port,
              icecast_mountpoint: profile?.icecast_mountpoint,
              icecast_username: profile?.icecast_username,
              icecast_password_encrypted: profile?.icecast_password_encrypted
            })
            .select('id')
            .single();

          if (djError) {
            toast({
              title: "Error",
              description: "Failed to create DJ profile",
              variant: "destructive"
            });
            return;
          }
          djId = djData.id;
        }

        // Create show using edge function
        toast({
          title: "Creating Show...",
          description: "Setting up your show"
        });

        const { data: showResponse, error: showError } = await supabase.functions.invoke('create-show', {
          body: {
            djId,
            storagePath: normalizeStoragePath(filePath),
            title: formData.title,
            durationSeconds
          }
        });

        if (showError) {
          toast({
            title: "Error",
            description: "Failed to create show",
            variant: "destructive"
          });
          return;
        }

        showId = showResponse.show.id;

        // Create schedule and job using edge function
        toast({
          title: "Scheduling Show...",
          description: "Creating schedule and job"
        });

        const { data: scheduleResponse, error: scheduleError } = await supabase.functions.invoke('create-schedule', {
          body: {
            showId,
            startsAtISO: utcStartTime.toISOString(),
            endsAtISO: utcEndTime.toISOString()
          }
        });

        if (scheduleError) {
          toast({
            title: "Error",
            description: "Failed to create schedule",
            variant: "destructive"
          });
          return;
        }

        // Rename the uploaded file to use the actual show ID
        const fileExt = formData.file.name.split('.').pop();
        const finalKey = `shows/${showId}.${fileExt}`;
        
        try {
          // Move file to final name with show ID
          const { error: moveError } = await supabase.storage
            .from('show-audio')
            .move(filePath, finalKey);
            
          if (!moveError) {
            // Update the storage path in the shows table
            await supabase
              .from('shows')
              .update({ storage_path: normalizeStoragePath(finalKey) })
              .eq('id', showId);
          } else {
            console.error('File rename failed, but show created:', moveError);
          }
        } catch (moveError) {
          console.error('File rename failed, but show created:', moveError);
        }
      }

      // Reset form and hide it
      setFormData({
        title: "",
        description: "",
        startDate: undefined,
        startTime: "",
        duration: 60,
        file: null
      });
      setEditingId(null);
      setShowForm(false);
      setUploadProgress(0);
      
      await fetchShows();
      
      toast({
        title: "Success!",
        description: `Show ${formData.id ? 'updated' : 'scheduled'} successfully with audio file`
      });
    } catch (error) {
      console.error('Error scheduling show:', error);
      toast({
        title: "Error",
        description: `Failed to ${formData.id ? 'update' : 'schedule'} show. ${error.message || 'Please try again.'}`,
        variant: "destructive"
      });
      setUploadProgress(0);
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  const handleEdit = (show: UnifiedShow) => {
    // Ensure we're parsing the UTC time correctly
    const utcStartTime = new Date(show.start_time);
    console.log('Original show.start_time:', show.start_time);
    console.log('Parsed as UTC:', utcStartTime.toISOString());
    
    const ukTime = utcToUKTime(utcStartTime);
    console.log('Converted to UK time:', ukTime);
    console.log('UK time formatted:', format(ukTime, 'HH:mm'));
    
    // Extract just the date part (without time) for the date picker
    const ukDateOnly = new Date(ukTime.getFullYear(), ukTime.getMonth(), ukTime.getDate());
    
    setFormData({
      id: show.id,
      title: show.title,
      description: show.description || "",
      startDate: ukDateOnly,
      startTime: format(ukTime, 'HH:mm'),
      duration: Math.round((new Date(show.end_time).getTime() - new Date(show.start_time).getTime()) / 60000),
      file: null,
      djId: show.dj_id || undefined
    });
    setEditingId(show.id);
    setShowForm(true);
  };

  const handleDelete = async (showId: string) => {
    if (!confirm('Are you sure you want to delete this show? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', showId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Show deleted successfully"
      });
      await fetchShows();
    } catch (error) {
      console.error('Error deleting show:', error);
      toast({
        title: "Error",
        description: "Failed to delete show",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      title: "",
      description: "",
      startDate: undefined,
      startTime: "",
      duration: 60,
      file: null,
      djId: undefined
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddNew = () => {
    setFormData({
      title: "",
      description: "",
      startDate: undefined,
      startTime: "",
      duration: 60,
      file: null
    });
    setEditingId(null);
    setShowForm(true);
  };

  const renderShowCard = (show: UnifiedShow) => {
    const isPlaying = playingId === show.id;
    // Use schedule status if available, otherwise default to 'scheduled'
    const showStatus = show.schedule?.status || 'scheduled';
    const statusDisplay = getStatusDisplay(showStatus);
    const hasJob = show.job !== null;
    const hasSchedule = show.schedule !== null;

    console.log(`Rendering show card for ${show.title}:`, {
      showId: show.id,
      scheduleId: show.schedule?.id,
      scheduleStatus: show.schedule?.status,
      jobStatus: show.job?.status,
      hasSchedule,
      hasJob
    });

    return (
      <div key={show.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-medium">{show.title}</p>
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
            <Badge variant="outline" className={statusDisplay.color}>
              {statusDisplay.text}
            </Badge>
            {hasJob && (
              <Badge 
                variant={show.job.status === 'running' ? 'default' : 'outline'} 
                className={`text-xs ${show.job.status === 'running' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                JOB: {show.job.status.toUpperCase()}
                {show.job.pid && ` (PID: ${show.job.pid})`}
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span>{formatUKDate(show.start_time)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatUKTimeRange(show.start_time, show.end_time)} UK
                  <span className="text-xs ml-1">
                    ({Math.round((new Date(show.end_time).getTime() - new Date(show.start_time).getTime()) / 60000)}min)
                  </span>
                </span>
              </div>
            </div>
            
            {hasJob && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>
                  Job scheduled for: {format(new Date(show.job.run_at), 'PPp')}
                  {show.job.status === 'running' && ' • Currently streaming'}
                  {show.job.status === 'pending' && ' • Waiting to start'}
                  {show.job.status === 'ended' && ' • Completed'}
                  {show.job.status === 'failed' && ' • Failed'}
                </span>
              </div>
            )}
          </div>
          
          {show.description && (
            <p className="text-xs text-muted-foreground mt-2">
              {show.description}
            </p>
          )}
          {show.file_path && (
            <>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                <span className="font-medium">Storage:</span> {normalizeStoragePath(show.storage_path || show.file_path || '')}
              </p>
              <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted/50 rounded">
                <div><strong>Debug:</strong> Bucket: show-audio</div>
                <div>Key: {normalizeStoragePath(show.storage_path || show.file_path || '')}</div>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-1">
          {show.job?.status === 'running' ? (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => handleStopShow(show.schedule?.id || show.id)}
              disabled={stoppingShow === (show.schedule?.id || show.id) || !show.schedule?.id}
              title="Stop live stream"
            >
              {stoppingShow === (show.schedule?.id || show.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <>
              {show.file_path && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handlePlayAudio(show)}
                    disabled={!show.file_path || showStatus === 'live'}
                    title="Preview audio locally"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEdit(show)}
                disabled={showStatus === 'live' || show.job?.status === 'running'}
                title="Edit show"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDelete(show.id)}
                disabled={showStatus === 'live' || show.job?.status === 'running'}
                title="Delete show"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Shows ({shows.length})</span>
            {profile?.role === 'ADMIN' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddNew}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Show
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Form - only show when showForm is true */}
          {showForm && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {editingId ? 'Edit Show' : 'Schedule Show'}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Show Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter show title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter show description (optional)"
                  rows={3}
                />
              </div>

              {editingId && djs.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="djSelect">Reassign to DJ (optional)</Label>
                  <Select 
                    value={formData.djId || ""} 
                    onValueChange={(value) => handleInputChange('djId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a DJ to reassign this show" />
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
              )}

              <div className="space-y-2">
                <Label>Start Date (UK Time)</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, 'PPP') : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => {
                        handleInputChange('startDate', date);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time (GB Time)</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="480"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 60)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audioFile">Audio File (MP3 or OGG)</Label>
                <Input
                  id="audioFile"
                  type="file"
                  accept=".mp3,.ogg,audio/mpeg,audio/ogg"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  disabled={loading || isUploading}
                />
                {formData.file && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <FileAudio className="h-4 w-4" />
                      <span>Selected: {formData.file.name}</span>
                      <span className="text-xs">({(formData.file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                    {isUploading && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || isUploading} 
                  className="flex-1"
                >
                  {loading || isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? `Uploading ${Math.round(uploadProgress)}%` : 
                   editingId ? 'Update Show' : 'Schedule Show'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={loading || isUploading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Shows List with Tabs */}
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming Shows ({upcomingShows.length})</TabsTrigger>
              <TabsTrigger value="past">Past Shows ({pastShows.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3">
              {upcomingShows.length > 0 ? (
                upcomingShows.map(renderShowCard)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming shows</p>
                  <p className="text-sm">Click "Add Show" to schedule your first show</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3">
              {pastShows.length > 0 ? (
                pastShows.map(renderShowCard)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No past shows</p>
                  <p className="text-sm">Completed shows will appear here</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
