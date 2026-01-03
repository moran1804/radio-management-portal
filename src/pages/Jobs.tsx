import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Square, Clock, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Job {
  id: string;
  status: string;
  run_at: string;
  pid: number | null;
  schedules: {
    id: string;
    starts_at: string;
    ends_at: string;
    shows: {
      id: string;
      title: string;
      duration_seconds: number;
    };
  };
}

interface JobEvent {
  id: number;
  ts: string;
  level: string;
  message: string;
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobEvents, setJobEvents] = useState<JobEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  useEffect(() => {
    if (selectedJob && dialogOpen) {
      fetchJobEvents(selectedJob.id);
      
      // Subscribe to realtime updates for job events
      const channel = supabase
        .channel('job-events-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'job_events',
            filter: `job_id=eq.${selectedJob.id}`
          },
          (payload) => {
            setJobEvents(prev => [...prev, payload.new as JobEvent]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedJob, dialogOpen]);

  const fetchJobs = async () => {
    try {
      console.log('Fetching jobs for user:', user?.id);
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          schedules!inner (
            id,
            starts_at,
            ends_at,
            shows!inner (
              id,
              title,
              duration_seconds,
              djs!inner (
                user_id
              )
            )
          )
        `)
        .order('run_at', { ascending: false });

      console.log('Jobs query result:', { data, error, count: data?.length });

      if (error) throw error;

      // Filter jobs based on user role
      const userJobs = data?.filter(job => {
        // Admins can see all jobs
        if (profile?.role === 'ADMIN') {
          console.log('Admin access - showing job:', job.id);
          return true;
        }
        
        // DJs can only see their own jobs
        const belongs = job.schedules.shows.djs.user_id === user?.id;
        console.log('DJ access - Job filter check:', {
          jobId: job.id,
          djUserId: job.schedules.shows.djs.user_id,
          currentUserId: user?.id,
          belongs
        });
        return belongs;
      }) || [];

      console.log('Filtered user jobs:', userJobs.length);
      setJobs(userJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobEvents = async (jobId: string) => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_events')
        .select('*')
        .eq('job_id', jobId)
        .order('ts', { ascending: true });

      if (error) throw error;

      setJobEvents(data || []);
    } catch (error) {
      console.error('Error fetching job events:', error);
      toast.error('Failed to load job logs');
    } finally {
      setEventsLoading(false);
    }
  };

  const handleJobControl = async (jobId: string, action: 'stop' | 'extend', extraSeconds?: number) => {
    try {
      const { data, error } = await supabase.functions.invoke(`job-control/${jobId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: {
          action,
          extraSeconds
        }
      });

      if (error) throw error;

      toast.success(data.message);
      fetchJobs(); // Refresh jobs list
    } catch (error: any) {
      console.error('Error controlling job:', error);
      toast.error(error.message || `Failed to ${action} job`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'starting': return 'default';
      case 'running': return 'default';
      case 'ended': return 'secondary';
      case 'failed': return 'destructive';
      case 'canceled': return 'outline';
      default: return 'secondary';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-destructive';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Jobs</h1>
                <p className="text-muted-foreground">Monitor your scheduled broadcasts</p>
              </div>
            </div>

            {jobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Jobs Yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You haven't scheduled any shows yet. Create a schedule to see jobs here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{job.schedules.shows.title}</CardTitle>
                          <CardDescription>
                            Scheduled for {format(new Date(job.run_at), 'PPp')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          {job.pid && <Badge variant="outline">PID: {job.pid}</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Duration: {Math.floor(job.schedules.shows.duration_seconds / 60)}m {job.schedules.shows.duration_seconds % 60}s
                        </div>
                        <div className="flex gap-2">
                          {job.status === 'running' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleJobControl(job.id, 'stop')}
                            >
                              <Square className="h-4 w-4 mr-2" />
                              Stop
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>
                    Job Logs: {selectedJob?.schedules.shows.title}
                  </DialogTitle>
                  <DialogDescription>
                    Live logs from the broadcast job
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 w-full rounded-md border p-4">
                  {eventsLoading ? (
                    <div className="text-center py-4">Loading logs...</div>
                  ) : jobEvents.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No logs available yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {jobEvents.map((event) => (
                        <div key={event.id} className="text-sm font-mono">
                          <span className="text-muted-foreground">
                            {format(new Date(event.ts), 'HH:mm:ss')}
                          </span>
                          <span className={`ml-2 font-medium ${getLevelColor(event.level)}`}>
                            [{event.level.toUpperCase()}]
                          </span>
                          <span className="ml-2">{event.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Jobs;