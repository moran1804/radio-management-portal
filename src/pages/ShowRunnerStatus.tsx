import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Clock, Radio, Server, AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RunnerStatus } from "@/components/RunnerStatus";
import { formatUKDateTime } from "@/utils/timezone";

interface RunnerStatus {
  ok: boolean;
  runner: {
    pid: number;
    tz: string;
    now: string;
    supabase_url: string;
    bucket: string;
  };
  config: {
    SAFETY_RESYNC_MS: number;
    PREFETCH_MS: number;
    PREEMPT_WAIT_MS: number;
    PREEMPT_POLL_MS: number;
    RETRY_TOTAL_MS: number;
    RETRY_DELAY_MS: number;
    CONNECT_GRACE_MS: number;
    RECONNECT_DELAY_MS: number;
    EOF_BEHAVIOR: string;
  };
  timers: {
    start_timers: number;
    prefetch_timers: number;
    active_procs: number;
    last_bootstrap_at: string;
  };
  realtime: Record<string, {
    state: string;
    at: string;
  }>;
  icecast: {
    host: string;
    port: string;
    reachable: boolean;
    status: {
      error?: string;
    };
  };
  active_processes: any[];
  live: any[];
  upcoming: any[];
  recent_events: {
    error?: string;
  };
  last_ffmpeg_errors: any[];
}

export default function ShowRunnerStatus() {
  const [status, setStatus] = useState<RunnerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-runner-status');
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch runner status');
      }
      
      setStatus(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [user, navigate]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-success' : 'bg-destructive';
  };

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Show Runner Status</h1>
                <p className="text-muted-foreground">Monitor the radio show automation system</p>
              </div>
              <Button onClick={fetchStatus} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}

            <div className="mt-4">
              <RunnerStatus />
            </div>

            {status && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* System Status */}
                <Card>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Status</CardTitle>
                    <Activity className="h-4 w-4 ml-auto" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall</span>
                        <Badge className={getStatusColor(status.ok)}>
                          {status.ok ? 'Healthy' : 'Error'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>PID: {status.runner.pid}</p>
                        <p>Timezone: {status.runner.tz}</p>
                        <p>Current Time: {formatTimestamp(status.runner.now)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Icecast Status */}
                <Card>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Icecast Server</CardTitle>
                    <Radio className="h-4 w-4 ml-auto" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Connection</span>
                        <Badge className={getStatusColor(status.icecast.reachable)}>
                          {status.icecast.reachable ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>Host: {status.icecast.host}</p>
                        <p>Port: {status.icecast.port}</p>
                        {status.icecast.status.error && (
                          <p className="text-destructive">Error: {status.icecast.status.error}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timers */}
                <Card>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Timers</CardTitle>
                    <Clock className="h-4 w-4 ml-auto" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Start Timers:</span>
                        <span>{status.timers.start_timers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Prefetch Timers:</span>
                        <span>{status.timers.prefetch_timers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Active Processes:</span>
                        <span>{status.timers.active_procs}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last Bootstrap: {formatTimestamp(status.timers.last_bootstrap_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Realtime Connections */}
                <Card>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Realtime Connections</CardTitle>
                    <Server className="h-4 w-4 ml-auto" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(status.realtime).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm">{key}</span>
                          <Badge className={getStatusColor(value.state === 'OPEN')}>
                            {value.state}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Shows */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Live Shows</CardTitle>
                    <CardDescription>{status.live.length} currently live</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {status.live.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No live shows</p>
                    ) : (
                      <div className="space-y-3">
                        {status.live.map((show, index) => (
                           <div key={index} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                             <div className="flex items-center justify-between mb-2">
                               <h4 className="font-medium text-sm">{show?.show?.title || show?.title || 'Unknown Show'}</h4>
                               <Badge variant="destructive" className="bg-red-600">
                                 LIVE
                               </Badge>
                             </div>
                             <div className="space-y-1 text-xs text-muted-foreground">
                               <div className="flex justify-between">
                                 <span>DJ:</span>
                                 <span className="font-medium">{show?.dj?.display_name || 'Unknown DJ'}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>Started:</span>
                                 <span className="font-medium">
                                   {show?.run_at ? formatUKDateTime(show.run_at, 'PPP p') : 'Unknown time'}
                                 </span>
                               </div>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Shows */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Upcoming Shows</CardTitle>
                    <CardDescription>{status.upcoming.length} scheduled</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {status.upcoming.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming shows</p>
                    ) : (
                      <div className="space-y-3">
                        {status.upcoming.map((show, index) => (
                           <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                             <div className="flex items-center justify-between mb-2">
                               <h4 className="font-medium text-sm">{show?.show?.title || show?.title || 'Unknown Show'}</h4>
                               <Badge variant={show?.status === 'scheduled' ? 'default' : 'secondary'}>
                                 {show?.status || 'Unknown'}
                               </Badge>
                             </div>
                             <div className="space-y-1 text-xs text-muted-foreground">
                               <div className="flex justify-between">
                                 <span>DJ:</span>
                                 <span className="font-medium">{show?.dj?.display_name || 'Unknown DJ'}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>Scheduled:</span>
                                 <span className="font-medium">
                                   {show?.run_at ? formatUKDateTime(show.run_at, 'PPP p') : 'Unknown time'}
                                 </span>
                               </div>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Configuration */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Configuration</CardTitle>
                    <CardDescription>System configuration parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {Object.entries(status.config).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="font-medium text-foreground">{key}</span>
                          <span className="text-muted-foreground">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Log File */}
                {status.last_ffmpeg_errors.length > 0 && (
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Log File</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {status.last_ffmpeg_errors.map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertDescription>{JSON.stringify(error)}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}