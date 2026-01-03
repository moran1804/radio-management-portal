import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, TestTube, Upload, User } from "lucide-react";
import { ImageCropper } from "@/components/ImageCropper";

interface DJCredentials {
  display_name: string;
  icecast_username: string;
  icecast_password_encrypted: string;
  icecast_mountpoint: string;
  bio: string;
  profile_picture_url: string;
}

export const DJCredentials = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [credentials, setCredentials] = useState<DJCredentials>({
    display_name: "",
    icecast_username: "",
    icecast_password_encrypted: "",
    icecast_mountpoint: "/live",
    bio: "",
    profile_picture_url: ""
  });

  useEffect(() => {
    const fetchDJProfile = async () => {
      if (!user) return;
      
      try {
        // Fetch from djs table first
        const { data: djData } = await supabase
          .from('djs')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (djData) {
          setCredentials({
            display_name: djData.display_name || "",
            icecast_username: djData.icecast_username || "",
            icecast_password_encrypted: djData.icecast_password_encrypted || "",
            icecast_mountpoint: djData.icecast_mountpoint || "/live",
            bio: djData.bio || "",
            profile_picture_url: djData.profile_picture_url || ""
          });
        } else {
          // Fallback to profile table
          setCredentials({
            display_name: profile?.name || "",
            icecast_username: profile?.icecast_username || "",
            icecast_password_encrypted: profile?.icecast_password_encrypted || "",
            icecast_mountpoint: profile?.icecast_mountpoint || "/live",
            bio: "",
            profile_picture_url: ""
          });
        }
      } catch (error) {
        console.error('Error fetching DJ profile:', error);
      }
    };

    fetchDJProfile();
  }, [user, profile]);

  const handleInputChange = (field: keyof DJCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "Image must be smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setShowCropper(true);
  };

  const handleCroppedImage = async (croppedImageBlob: Blob) => {
    if (!user) return;

    setUploadLoading(true);
    setShowCropper(false);

    try {
      const fileName = `${user.id}/profile.png`;

      // Delete existing profile picture if any
      if (credentials.profile_picture_url) {
        const existingPath = credentials.profile_picture_url.split('/').pop();
        if (existingPath) {
          await supabase.storage
            .from('dj-profiles')
            .remove([`${user.id}/${existingPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('dj-profiles')
        .upload(fileName, croppedImageBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dj-profiles')
        .getPublicUrl(fileName);

      setCredentials(prev => ({ ...prev, profile_picture_url: publicUrl }));

      toast({
        title: "Success",
        description: "Profile picture uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!credentials.icecast_username || !credentials.icecast_password_encrypted) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Update DJ table
      const { error: djError } = await supabase
        .from('djs')
        .upsert({
          user_id: user.id,
          display_name: credentials.display_name || profile?.name || user.email || 'DJ',
          icecast_username: credentials.icecast_username,
          icecast_password_encrypted: credentials.icecast_password_encrypted,
          icecast_mountpoint: credentials.icecast_mountpoint,
          icecast_address: profile?.icecast_address || 'mystation.micast.media',
          icecast_port: profile?.icecast_port || 8025,
          bio: credentials.bio,
          profile_picture_url: credentials.profile_picture_url
        }, {
          onConflict: 'user_id'
        });

      if (djError) throw djError;

      // Also update profiles table for backward compatibility and sync
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: credentials.display_name, // Sync DJ display name with profile name
          icecast_username: credentials.icecast_username,
          icecast_password_encrypted: credentials.icecast_password_encrypted,
          icecast_mountpoint: credentials.icecast_mountpoint
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;
      
      toast({
        title: "Success",
        description: "DJ profile saved successfully"
      });
    } catch (error) {
      console.error('Error saving DJ profile:', error);
      toast({
        title: "Error",
        description: "Failed to save DJ profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestCredentials = async () => {
    if (!credentials.icecast_username || !credentials.icecast_password_encrypted) {
      toast({
        title: "Error",
        description: "Username and password are required for testing",
        variant: "destructive"
      });
      return;
    }

    setTestLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-icecast-connection', {
        body: {
          address: profile?.icecast_address || 'mystation.micast.media',
          port: profile?.icecast_port || 8025,
          mountpoint: credentials.icecast_mountpoint,
          username: credentials.icecast_username,
          password: credentials.icecast_password_encrypted
        }
      });

      if (error) throw error;
      
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error testing credentials:', error);
      toast({
        title: "Test Failed",
        description: "Unable to test connection. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>DJ Profile</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {credentials.profile_picture_url ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
                  <img 
                    src={credentials.profile_picture_url} 
                    alt="Profile picture"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-gray-100 border-2 border-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                size="sm"
              >
                {uploadLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Photo
              </Button>
            </div>
          </div>

          {/* DJ Name Section */}
          <div className="space-y-2">
            <Label htmlFor="dj-display-name">DJ Display Name</Label>
            <Input
              id="dj-display-name"
              value={credentials.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder="Enter your DJ display name"
            />
          </div>

          {/* Bio Section */}
          <div className="space-y-2">
            <Label htmlFor="dj-bio">Bio</Label>
            <Textarea
              id="dj-bio"
              value={credentials.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Image Cropper Dialog */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        onSave={handleCroppedImage}
        imageFile={selectedFile}
      />

      <Card>
        <CardHeader>
          <CardTitle>Streaming Credentials</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dj-username">Icecast Username</Label>
            <Input
              id="dj-username"
              value={credentials.icecast_username}
              onChange={(e) => handleInputChange('icecast_username', e.target.value)}
              placeholder="Enter your Icecast username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dj-password">Icecast Password</Label>
            <Input
              id="dj-password"
              type="password"
              value={credentials.icecast_password_encrypted}
              onChange={(e) => handleInputChange('icecast_password_encrypted', e.target.value)}
              placeholder="Enter your Icecast password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dj-mountpoint">Mountpoint</Label>
            <Input
              id="dj-mountpoint"
              value={credentials.icecast_mountpoint}
              onChange={(e) => handleInputChange('icecast_mountpoint', e.target.value)}
              placeholder="/live"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Profile
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTestCredentials} 
              disabled={testLoading || !credentials.icecast_username || !credentials.icecast_password_encrypted}
            >
              {testLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-md">
            <strong>Debug Info:</strong><br />
            Bucket: show-audio<br />
            Storage path format: shows/&lt;uuid&gt;.&lt;ext&gt;<br />
            {credentials.icecast_username && (
              <>Username: {credentials.icecast_username}<br /></>
            )}
            Mountpoint: {credentials.icecast_mountpoint}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};