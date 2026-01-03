import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DJDashboard } from "@/components/DJDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { User, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DJDashboardPage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");

  useEffect(() => {
    const fetchDJProfile = async () => {
      if (!user) return;
      
      try {
        const { data: djData } = await supabase
          .from('djs')
          .select('profile_picture_url')
          .eq('user_id', user.id)
          .single();

        if (djData?.profile_picture_url) {
          setProfilePictureUrl(djData.profile_picture_url);
        }
      } catch (error) {
        console.error('Error fetching DJ profile picture:', error);
      }
    };

    fetchDJProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center px-4">
              <SidebarTrigger className="mr-4" />
              <div className="flex-1 flex items-center justify-between">
                <div></div> {/* Left spacer */}
                <div className="text-center">
                  <h1 className="text-xl font-semibold">Dashboard</h1>
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {profile?.name || user?.email?.split('@')[0] || 'User'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {profile?.role && (
                    <Badge variant={profile.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {profile.role}
                    </Badge>
                  )}
                  <HoverCard>
                     <HoverCardTrigger asChild>
                       <Avatar className="h-8 w-8 cursor-pointer">
                         <AvatarImage src={profilePictureUrl} />
                         <AvatarFallback>
                           <User className="h-4 w-4" />
                         </AvatarFallback>
                       </Avatar>
                     </HoverCardTrigger>
                    <HoverCardContent className="w-64">
                      <div className="space-y-3">
                        <div className="border-b pb-2">
                          <p className="text-sm font-medium">{user?.email}</p>
                        </div>
                        <Button variant="ghost" className="w-full justify-start h-8 px-2" asChild>
                          <Link to="/change-password">
                            <KeyRound className="h-4 w-4 mr-2" />
                            Change password
                          </Link>
                        </Button>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <DJDashboard />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DJDashboardPage;