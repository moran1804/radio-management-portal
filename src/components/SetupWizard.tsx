import { useState } from "react";
import { useStationConfig } from "@/hooks/useStationConfig";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Radio, Upload, Globe, Server, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = "welcome" | "station" | "streaming" | "admin" | "complete";

export const SetupWizard = () => {
  const { saveConfig, completeSetup } = useStationConfig();
  const { signUp } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  
  // Station info
  const [stationName, setStationName] = useState("");
  const [stationLogo, setStationLogo] = useState<string | null>(null);
  const [platformUrl, setPlatformUrl] = useState(window.location.origin);
  
  // Streaming config
  const [streamingHost, setStreamingHost] = useState("");
  const [streamingPort, setStreamingPort] = useState("8000");
  const [streamingMountpoint, setStreamingMountpoint] = useState("/live");
  const [streamingUsername, setStreamingUsername] = useState("source");
  const [streamingPassword, setStreamingPassword] = useState("");
  
  // Admin user
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStationLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStationSubmit = () => {
    if (!stationName.trim()) {
      toast.error("Please enter a station name");
      return;
    }
    saveConfig({
      stationName,
      stationLogo,
      platformUrl,
    });
    setCurrentStep("streaming");
  };

  const handleStreamingSubmit = () => {
    if (!streamingHost.trim()) {
      toast.error("Please enter a streaming host");
      return;
    }
    saveConfig({
      streamingHost,
      streamingPort: parseInt(streamingPort) || 8000,
      streamingMountpoint,
      streamingUsername,
      streamingPassword,
    });
    setCurrentStep("admin");
  };

  const handleAdminSubmit = async () => {
    if (!adminEmail.trim() || !adminPassword.trim() || !adminName.trim()) {
      toast.error("Please fill in all admin user fields");
      return;
    }

    if (adminPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(adminEmail, adminPassword, adminName);

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      // The user will need to verify email, but we can proceed with setup
      toast.success("Admin account created! Please check your email to verify.");
      setCurrentStep("complete");
    } catch (err) {
      toast.error("Failed to create admin account");
    }

    setIsLoading(false);
  };

  const handleComplete = () => {
    completeSetup();
    window.location.reload();
  };

  const steps = [
    { id: "welcome", label: "Welcome" },
    { id: "station", label: "Station" },
    { id: "streaming", label: "Streaming" },
    { id: "admin", label: "Admin User" },
    { id: "complete", label: "Complete" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Progress indicator */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                ${index < currentStepIndex ? 'bg-primary text-primary-foreground' : ''}
                ${index === currentStepIndex ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                ${index > currentStepIndex ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {index < currentStepIndex ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 sm:w-24 h-1 mx-2 ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {steps.map((step) => (
            <span key={step.id} className="w-10 text-center">{step.label}</span>
          ))}
        </div>
      </div>

      {/* Welcome Step */}
      {currentStep === "welcome" && (
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Radio className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Station Manager</CardTitle>
            <CardDescription>
              Let's set up your radio station management platform. This wizard will guide you through the initial configuration.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setCurrentStep("station")} size="lg">
              Get Started
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Station Info Step */}
      {currentStep === "station" && (
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Station Information</CardTitle>
                <CardDescription>Set up your station's identity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stationName">Station Name</Label>
              <Input
                id="stationName"
                placeholder="My Radio Station"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="platformUrl">Platform URL</Label>
              <Input
                id="platformUrl"
                placeholder="https://mystation.com"
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The URL where this platform is hosted</p>
            </div>

            <div className="space-y-2">
              <Label>Station Logo</Label>
              <div className="flex items-center gap-4">
                {stationLogo ? (
                  <img src={stationLogo} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border border-dashed">
                    <Radio className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Label htmlFor="logoUpload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Upload className="h-4 w-4" />
                      Upload Logo
                    </div>
                  </Label>
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("welcome")}>
              Back
            </Button>
            <Button onClick={handleStationSubmit}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Streaming Config Step */}
      {currentStep === "streaming" && (
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Streaming Configuration</CardTitle>
                <CardDescription>Configure your Icecast/Shoutcast server</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="streamingHost">Host</Label>
                <Input
                  id="streamingHost"
                  placeholder="stream.mystation.com"
                  value={streamingHost}
                  onChange={(e) => setStreamingHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="streamingPort">Port</Label>
                <Input
                  id="streamingPort"
                  type="number"
                  placeholder="8000"
                  value={streamingPort}
                  onChange={(e) => setStreamingPort(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="streamingMountpoint">Mountpoint</Label>
              <Input
                id="streamingMountpoint"
                placeholder="/live"
                value={streamingMountpoint}
                onChange={(e) => setStreamingMountpoint(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="streamingUsername">Username</Label>
                <Input
                  id="streamingUsername"
                  placeholder="source"
                  value={streamingUsername}
                  onChange={(e) => setStreamingUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="streamingPassword">Password</Label>
                <Input
                  id="streamingPassword"
                  type="password"
                  placeholder="••••••••"
                  value={streamingPassword}
                  onChange={(e) => setStreamingPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("station")}>
              Back
            </Button>
            <Button onClick={handleStreamingSubmit}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Admin User Step */}
      {currentStep === "admin" && (
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Create Admin Account</CardTitle>
                <CardDescription>Set up the first administrator account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Full Name</Label>
              <Input
                id="adminName"
                placeholder="John Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email Address</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@mystation.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("streaming")} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={handleAdminSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Admin
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Complete Step */}
      {currentStep === "complete" && (
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Setup Complete!</CardTitle>
            <CardDescription>
              Your station manager is ready to use. You may need to verify your email before signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Station:</span>
                <span className="font-medium">{stationName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform URL:</span>
                <span className="font-medium">{platformUrl}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Streaming:</span>
                <span className="font-medium">{streamingHost}:{streamingPort}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Admin Email:</span>
                <span className="font-medium">{adminEmail}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={handleComplete} size="lg">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
