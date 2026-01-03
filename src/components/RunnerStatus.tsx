import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const RunnerStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const navigate = useNavigate();

  const checkRunnerStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-runner-status');
      
      if (error || !data) {
        setIsOnline(false);
      } else {
        setIsOnline(true);
      }
    } catch (error) {
      setIsOnline(false);
    }
    setLastChecked(new Date());
  };

  useEffect(() => {
    // Check immediately on mount
    checkRunnerStatus();

    // Then check every 5 seconds
    const interval = setInterval(checkRunnerStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => navigate('/show-runner-status')}
    >
      <Badge variant={isOnline ? "default" : "destructive"}>
        Show Runner status - {isOnline ? "OK" : "Down"}
      </Badge>
      {lastChecked && (
        <span className="text-xs text-muted-foreground">
          Last checked: {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};