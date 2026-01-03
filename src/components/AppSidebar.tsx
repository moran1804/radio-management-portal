import { NavLink, useLocation } from "react-router-dom";
import { User, Calendar, Activity, Users, CalendarDays, User2, Radio, Clock, Server, Monitor, Mic, HelpCircle, FolderOpen, Music, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logoImage from "@/assets/logo.png";

const djItems = [
  { title: "Dashboard", url: "/dj-dashboard", icon: Radio },
  { title: "Control Room", url: "/live-control-room", icon: Monitor },
  { title: "Prerecord", url: "/prerecord", icon: Mic },
  { title: "DJ Profile", url: "/dj-profile", icon: User2 },
  { title: "Show Recordings", url: "/show-recordings", icon: FolderOpen },
  { title: "Jingles", url: "/jingles", icon: Music },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Jobs", url: "/jobs", icon: Activity },
  { title: "Runner Status", url: "/show-runner-status", icon: Server },
];

const adminItems = [
  { title: "Users", url: "/users", icon: Users },
  { title: "Recurring Slots", url: "/recurring-slots", icon: Clock },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useAuth();
  const { state } = useSidebar();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    return path !== "/" && currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50";
  };

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"}>
      <SidebarContent>
        {/* Logo and Title */}
        <div className={`p-4 border-b ${isCollapsed ? "px-2" : ""}`}>
          <div className="flex items-center space-x-3">
            <img 
              src={logoImage} 
              alt="SD Radio Logo" 
              className="h-8 w-8 flex-shrink-0" 
            />
            {!isCollapsed && (
              <div>
                <h2 className="font-semibold text-sm">SD Radio</h2>
                <p className="text-xs text-muted-foreground">Station Manager</p>
              </div>
            )}
          </div>
        </div>

        {/* DJ Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>DJ Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {djItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {profile?.role === 'ADMIN' && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClass(item.url)}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Help Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/help" className={getNavClass("/help")}>
                    <HelpCircle className="h-4 w-4" />
                    {!isCollapsed && <span>Help</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  );
}