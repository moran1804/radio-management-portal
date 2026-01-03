import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Users, Radio, Headphones, TrendingUp, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ListenerStats {
  listeners: {
    current: number;
    unique: number;
    total: number;
  };
  bitrate: number;
  format: string;
  station: {
    name: string;
    description: string;
  };
  now_playing: {
    song: {
      title: string;
      artist: string;
      album: string;
    };
    duration: number;
    elapsed: number;
  };
  current_dj: {
    name: string;
    is_live: boolean;
  } | null;
}

const LiveControlRoom = () => {
  const [stats, setStats] = useState<ListenerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  const fetchListenerStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-listener-stats');
      
      if (error) throw error;
      
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching listener stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch listener statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListenerStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchListenerStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load Minnit chat script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://minnit.chat/js/embed.js?c=1752216300';
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      const existingScript = document.querySelector('script[src="https://minnit.chat/js/embed.js?c=1752216300"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!stats?.now_playing) return 0;
    return (stats.now_playing.elapsed / stats.now_playing.duration) * 100;
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Error playing audio:', error);
        toast({
          title: "Error",
          description: "Failed to play audio stream",
          variant: "destructive"
        });
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4">
              <div>
                <h1 className="text-2xl font-bold">Live Control Room</h1>
                <p className="text-sm text-muted-foreground">
                  Monitor your radio station's live statistics and chat
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-xs">
                  {profile?.role || 'USER'}
                </Badge>
                <Button
                  onClick={fetchListenerStats}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </header>

          <div className="container mx-auto p-4 space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Listeners</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : stats?.listeners.current || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active connections
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Listeners</CardTitle>
                  <Headphones className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : stats?.listeners.unique || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Individual users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : stats?.listeners.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All connections today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stream Quality</CardTitle>
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : `${stats?.bitrate || 0}k`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.format || "Unknown"} format
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Hidden Audio Element */}
            <audio 
              ref={audioRef}
              preload="none"
              onEnded={() => setIsPlaying(false)}
              onError={() => setIsPlaying(false)}
            >
              <source src="https://mystation.micast.media/listen/social_distance_radio/radio.mp3" type="audio/mpeg" />
            </audio>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Now Playing */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Radio className="h-4 w-4" />
                      Now Playing
                    </CardTitle>
                    <Button
                      onClick={handlePlayPause}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3 w-3" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Play Live
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {stats?.now_playing ? (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold truncate">
                            {stats.now_playing.song.title || "Unknown Track"}
                          </h3>
                          <Badge variant={stats.current_dj?.is_live ? "default" : "secondary"} className="text-xs ml-2 flex-shrink-0">
                            {stats.current_dj?.is_live && stats.current_dj?.name
                              ? `Live: ${stats.current_dj.name}` 
                              : "Auto DJ"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {stats.now_playing.song.artist} 
                          {stats.now_playing.song.album && ` • ${stats.now_playing.song.album}`}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatTime(stats.now_playing.elapsed)}</span>
                          <span>{formatTime(stats.now_playing.duration)}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                            style={{ width: `${getProgressPercentage()}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      {loading ? "Loading now playing info..." : "No track information available"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Live Chat */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Live Chat</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="min-h-[350px] w-full">
                    <span 
                      style={{ display: 'none' }} 
                      className="minnit-chat-sembed" 
                      data-chatname="https://organizations.minnit.chat/519477543519458/c/Main?embed" 
                      data-style="width:100%; height:350px; max-height:90vh;" 
                      data-version="1.52"
                    >
                      Chat
                    </span>
                    <p className="powered-by-minnit text-xs text-muted-foreground mt-2">
                      <a href="https://minnit.chat" target="_blank" rel="noopener noreferrer">
                        Chatroom embedded via Minnit Chat
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-center text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default LiveControlRoom;