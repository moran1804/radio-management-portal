import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Radio, RadioIcon } from "lucide-react";

interface LiveStatus {
  is_live: boolean;
  streamer_name: string;
  broadcast_start: string | null;
  art: string | null;
}

interface NowPlayingResponse {
  live: LiveStatus;
}

export const LiveStatusBanner = () => {
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiveStatus = async () => {
      try {
        const response = await fetch('https://mystation.micast.media/api/nowplaying/36');
        if (!response.ok) {
          throw new Error('Failed to fetch live status');
        }
        const data: NowPlayingResponse = await response.json();
        setLiveStatus(data.live);
        setError(null);
      } catch (err) {
        console.error('Error fetching live status:', err);
        setError('Failed to load live status');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchLiveStatus();

    // Poll every 3 seconds for quicker updates
    const interval = setInterval(fetchLiveStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="w-full mb-6">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Checking studio status...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full mb-6 border-yellow-200 bg-yellow-50">
        <div className="flex items-center justify-center py-6">
          <RadioIcon className="h-6 w-6 text-yellow-600 mr-2" />
          <span className="text-yellow-800">Unable to check studio status</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`w-full mb-6 ${liveStatus?.is_live 
      ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-100' 
      : 'border-green-500 bg-gradient-to-r from-green-50 to-green-100'
    }`}>
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-4">
          {liveStatus?.is_live ? (
            <>
              <div className="relative">
                <Radio className="h-8 w-8 text-red-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center">
                <Badge variant="destructive" className="text-lg px-4 py-2 font-bold">
                  LIVE RECORDING IN PROGRESS
                </Badge>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <RadioIcon className="h-8 w-8 text-green-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-lg px-4 py-2 font-bold text-green-700 border-green-500 bg-green-100">
                  STUDIO FREE
                </Badge>
                <p className="text-green-700 font-medium mt-2">
                  Ready for recording
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};