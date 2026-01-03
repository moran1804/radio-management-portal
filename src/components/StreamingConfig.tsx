import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit, Save, Zap, CheckCircle, XCircle } from "lucide-react";
import { UnifiedShowsCard } from "./UnifiedShowsCard";

interface StreamingConfig {
  icecast_address: string;
  icecast_port: number;
  icecast_mountpoint: string;
  icecast_username: string;
  icecast_password_encrypted: string;
}

export const StreamingConfig = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [config, setConfig] = useState<StreamingConfig>({
    icecast_address: "mystation.micast.media",
    icecast_port: 8025,
    icecast_mountpoint: "/live",
    icecast_username: "",
    icecast_password_encrypted: ""
  });

  // Memoize profile configuration to prevent unnecessary re-renders
  const profileConfig = useMemo(() => {
    if (!profile) return null;
    
    return {
      icecast_address: profile.icecast_address || "mystation.micast.media",
      icecast_port: profile.icecast_port || 8025,
      icecast_mountpoint: profile.icecast_mountpoint || "/live",
      icecast_username: profile.icecast_username || "",
      icecast_password_encrypted: profile.icecast_password_encrypted || ""
    };
  }, [profile?.icecast_address, profile?.icecast_port, profile?.icecast_mountpoint, profile?.icecast_username, profile?.icecast_password_encrypted]);

  // Check if user has streaming data configured
  const hasStreamingData = useMemo(() => {
    return !!(profile?.icecast_username && profile?.icecast_password_encrypted);
  }, [profile?.icecast_username, profile?.icecast_password_encrypted]);

  useEffect(() => {
    if (profileConfig) {
      setConfig(profileConfig);
      setHasData(hasStreamingData);
      setIsEditing(!hasStreamingData);
    }
  }, [profileConfig, hasStreamingData]);

  const handleInputChange = useCallback((field: keyof StreamingConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;

    if (!config.icecast_username || !config.icecast_password_encrypted) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          icecast_address: config.icecast_address,
          icecast_port: config.icecast_port,
          icecast_mountpoint: config.icecast_mountpoint,
          icecast_username: config.icecast_username,
          icecast_password_encrypted: config.icecast_password_encrypted
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Upsert into djs table
      const { error: djError } = await supabase
        .from('djs')
        .upsert({
          user_id: user.id,
          display_name: profile?.name || user.email || 'DJ',
          icecast_address: config.icecast_address,
          icecast_port: config.icecast_port,
          icecast_mountpoint: config.icecast_mountpoint,
          icecast_username: config.icecast_username,
          icecast_password_encrypted: config.icecast_password_encrypted
        }, {
          onConflict: 'user_id'
        });

      if (djError) throw djError;

      setHasData(true);
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Streaming configuration saved successfully"
      });
    } catch (error) {
      console.error('Error saving streaming config:', error);
      toast({
        title: "Error",
        description: "Failed to save streaming configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, config, profile?.name, toast]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (hasData && profileConfig) {
      setIsEditing(false);
      setConfig(profileConfig);
    }
  }, [hasData, profileConfig]);

  const handleTestConnection = useCallback(async () => {
    if (!config.icecast_username || !config.icecast_password_encrypted) {
      toast({
        title: "Error",
        description: "Username and password are required for testing",
        variant: "destructive"
      });
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-icecast-connection', {
        body: {
          address: config.icecast_address,
          port: config.icecast_port,
          mountpoint: config.icecast_mountpoint,
          username: config.icecast_username,
          password: config.icecast_password_encrypted
        }
      });

      if (error) throw error;

      setTestResult(data);
      
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ success: false, message: "Failed to test connection" });
      toast({
        title: "Test Failed",
        description: "Unable to test connection. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTestLoading(false);
    }
  }, [config, toast]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
      <Card className={`w-full lg:w-[35%] ${!hasData ? 'border-destructive bg-destructive/5' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Streaming Configuration
            {hasData && !isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </CardTitle>
          {!hasData && (
            <p className="text-sm text-destructive">Please enter your streaming details</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={config.icecast_address}
              onChange={(e) => handleInputChange('icecast_address', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={config.icecast_port}
              onChange={(e) => handleInputChange('icecast_port', parseInt(e.target.value) || 8025)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mountpoint">Mountpoint</Label>
            <Input
              id="mountpoint"
              value={config.icecast_mountpoint}
              onChange={(e) => handleInputChange('icecast_mountpoint', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={config.icecast_username}
              onChange={(e) => handleInputChange('icecast_username', e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={config.icecast_password_encrypted}
              onChange={(e) => handleInputChange('icecast_password_encrypted', e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

           {testResult && (
             <div className={`p-3 rounded-md border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
               <div className="flex items-center gap-2">
                 {testResult.success ? (
                   <CheckCircle className="h-4 w-4 text-green-600" />
                 ) : (
                   <XCircle className="h-4 w-4 text-red-600" />
                 )}
                 <span className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                   {testResult.message}
                 </span>
               </div>
             </div>
           )}

           {hasData && (
             <Button 
               variant="secondary" 
               onClick={handleTestConnection} 
               disabled={testLoading || !config.icecast_username || !config.icecast_password_encrypted}
               className="w-full"
             >
               {testLoading ? (
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
               ) : (
                 <Zap className="h-4 w-4 mr-2" />
               )}
               Test Connection
             </Button>
           )}

           {isEditing && (
             <div className="flex gap-2 pt-4">
               <Button onClick={handleSave} disabled={loading} className="flex-1">
                 {loading ? (
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 ) : (
                   <Save className="h-4 w-4 mr-2" />
                 )}
                 Save
               </Button>
               {hasData && (
                 <Button variant="outline" onClick={handleCancel} disabled={loading}>
                   Cancel
                 </Button>
               )}
             </div>
           )}
        </CardContent>
      </Card>

      {/* Show the unified shows card - 60% width */}
      <div className="w-full lg:w-[60%]">
        <UnifiedShowsCard />
      </div>
    </div>
  );
};