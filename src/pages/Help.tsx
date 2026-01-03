import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Radio, 
  Monitor, 
  Mic, 
  User2, 
  CalendarDays, 
  Activity, 
  Server, 
  Users, 
  Clock,
  Upload,
  Play,
  Pause,
  Settings,
  Lock,
  Mail,
  FileAudio,
  Calendar as CalendarIcon,
  MessageSquare
} from "lucide-react";

const Help = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Help & Documentation</h1>
            <p className="text-muted-foreground mt-2">
              Complete guide to using the SD Radio Station Management System
            </p>
          </div>

          <Tabs defaultValue="getting-started" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="dj-features">DJ Features</TabsTrigger>
              <TabsTrigger value="admin-features">Admin Features</TabsTrigger>
              <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
            </TabsList>

            <TabsContent value="getting-started" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5" />
                    Welcome to SD Radio
                  </CardTitle>
                  <CardDescription>
                    Your complete radio station management platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Account Setup</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">1</Badge>
                        <div>
                          <p className="font-medium">First Login</p>
                          <p className="text-sm text-muted-foreground">
                            After account creation, check your email for a verification link. Click it to set up your password.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">2</Badge>
                        <div>
                          <p className="font-medium">Complete Your Profile</p>
                          <p className="text-sm text-muted-foreground">
                            Go to DJ Profile to add your display name, bio, and profile picture.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">3</Badge>
                        <div>
                          <p className="font-medium">Configure Streaming</p>
                          <p className="text-sm text-muted-foreground">
                            Set up your Icecast credentials in your DJ Profile for live streaming.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">User Roles</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User2 className="h-4 w-4" />
                          <h4 className="font-medium">DJ</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Can manage their own shows, upload content, go live, and view the calendar.
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="h-4 w-4" />
                          <h4 className="font-medium">Admin</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Full access to manage users, recurring slots, and all DJ functions.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dj-features" className="space-y-6">
              {/* Dashboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5" />
                    Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Your main hub for managing shows and content.</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Upload className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Upload Audio Files</p>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop MP3 files to upload content for your shows. Files are stored securely and can be used for prerecorded shows.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Schedule Shows</p>
                        <p className="text-sm text-muted-foreground">
                          Create new shows by selecting audio files, setting dates/times, and adding descriptions.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Activity className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Show Management</p>
                        <p className="text-sm text-muted-foreground">
                          View your upcoming shows, edit details, or cancel shows as needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Control Room */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Live Control Room
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Your broadcasting center for live shows.</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Play className="h-4 w-4 mt-1 text-green-500" />
                      <div>
                        <p className="font-medium">Go Live</p>
                        <p className="text-sm text-muted-foreground">
                          Start live broadcasting using your configured streaming software or built-in tools.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileAudio className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Now Playing Display</p>
                        <p className="text-sm text-muted-foreground">
                          See current track information and listener statistics in real-time.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Chat Integration</p>
                        <p className="text-sm text-muted-foreground">
                          Interact with listeners through the integrated chat system during live shows.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prerecord */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Prerecord
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Schedule and manage prerecorded content.</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Upload className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Upload Content</p>
                        <p className="text-sm text-muted-foreground">
                          Upload pre-recorded shows, jingles, or other audio content.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Schedule Playback</p>
                        <p className="text-sm text-muted-foreground">
                          Set specific times for prerecorded content to air automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other DJ Features */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User2 className="h-5 w-5" />
                      DJ Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">• Update display name and bio</p>
                      <p className="text-sm">• Upload profile picture</p>
                      <p className="text-sm">• Configure streaming credentials</p>
                      <p className="text-sm">• Set Icecast server details</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Calendar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">• View all scheduled shows</p>
                      <p className="text-sm">• See recurring slots</p>
                      <p className="text-sm">• Check availability</p>
                      <p className="text-sm">• Color-coded by DJ</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Jobs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">• Monitor scheduled tasks</p>
                      <p className="text-sm">• View job status and logs</p>
                      <p className="text-sm">• Track automation progress</p>
                      <p className="text-sm">• Debug scheduling issues</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Runner Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">• Check system health</p>
                      <p className="text-sm">• Monitor automation service</p>
                      <p className="text-sm">• View last update times</p>
                      <p className="text-sm">• Get status indicators</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="admin-features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Complete control over system users and permissions.</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">Add</Badge>
                      <div>
                        <p className="font-medium">Create New DJs</p>
                        <p className="text-sm text-muted-foreground">
                          Add new DJ accounts with email verification. New users receive setup instructions via email.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">Edit</Badge>
                      <div>
                        <p className="font-medium">Manage Existing Users</p>
                        <p className="text-sm text-muted-foreground">
                          Update user roles, deactivate accounts, or resend verification emails.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive" className="mt-1">Delete</Badge>
                      <div>
                        <p className="font-medium">Remove Users</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete user accounts and all associated data. Only available for deactivated users.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recurring Slots
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Set up regular show schedules that generate automatically.</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Weekly Schedules</p>
                        <p className="text-sm text-muted-foreground">
                          Create recurring time slots for DJs that automatically generate shows each week.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Settings className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Slot Configuration</p>
                        <p className="text-sm text-muted-foreground">
                          Set day of week, start time, duration, title, and description for each recurring slot.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Activity className="h-4 w-4 mt-1 text-primary" />
                      <div>
                        <p className="font-medium">Automatic Generation</p>
                        <p className="text-sm text-muted-foreground">
                          The system automatically creates future shows based on active recurring slots.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="troubleshooting" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Common Issues & Solutions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Login & Authentication
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Can't receive verification email</p>
                        <p className="text-sm text-muted-foreground">Check spam folder. Contact admin to resend verification email.</p>
                      </div>
                      <div>
                        <p className="font-medium">Password reset not working</p>
                        <p className="text-sm text-muted-foreground">Ensure you're clicking the latest reset link. Links expire after use.</p>
                      </div>
                      <div>
                        <p className="font-medium">Account locked or deactivated</p>
                        <p className="text-sm text-muted-foreground">Contact your administrator to reactivate your account.</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Streaming Issues
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Can't connect to stream</p>
                        <p className="text-sm text-muted-foreground">Check your Icecast credentials in DJ Profile. Ensure server details are correct.</p>
                      </div>
                      <div>
                        <p className="font-medium">Poor audio quality</p>
                        <p className="text-sm text-muted-foreground">Check your internet connection and streaming software settings.</p>
                      </div>
                      <div>
                        <p className="font-medium">Stream keeps disconnecting</p>
                        <p className="text-sm text-muted-foreground">Verify stable internet connection and server availability.</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      File Upload Issues
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Upload fails or times out</p>
                        <p className="text-sm text-muted-foreground">Check file size and format. Only MP3 files are supported. Large files may take longer.</p>
                      </div>
                      <div>
                        <p className="font-medium">File not appearing in list</p>
                        <p className="text-sm text-muted-foreground">Refresh the page. If problem persists, try uploading again.</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Need More Help?
                    </h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">
                        If you're still experiencing issues, contact your system administrator or technical support team. 
                        Provide details about the error message and what you were trying to do when the problem occurred.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Help;
