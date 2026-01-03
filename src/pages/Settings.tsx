import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [chatMobileEnabled, setChatMobileEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && profile && profile.role !== 'ADMIN') {
      navigate("/");
    }
  }, [profile, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleChatMobileToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('remote-config', {
        body: {
          Show_chat_Mobile_Tablet: enabled,
          admin_key: "SetMobileToTrue1234&"
        }
      });

      if (error) {
        console.error('Error updating remote config:', error);
        toast.error("Failed to update mobile chatroom setting");
        return;
      }

      setChatMobileEnabled(enabled);
      toast.success(`Mobile chatroom ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error calling remote-config function:', error);
      toast.error("Failed to update mobile chatroom setting");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !profile || profile.role !== 'ADMIN') {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center px-4">
              <SidebarTrigger className="mr-4" />
              <div className="flex items-center justify-between w-full">
                <div>
                  <h1 className="text-xl font-semibold">Settings</h1>
                  <p className="text-sm text-muted-foreground">Manage system configuration</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mobile Features</CardTitle>
                  <CardDescription>
                    Configure mobile and tablet specific features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="chat-mobile">Chatroom on Mobile</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable the chatroom feature on mobile and tablet devices
                      </p>
                    </div>
                    <Switch
                      id="chat-mobile"
                      checked={chatMobileEnabled}
                      onCheckedChange={handleChatMobileToggle}
                      disabled={isUpdating}
                    />
                  </div>
                  {isUpdating && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating setting...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;