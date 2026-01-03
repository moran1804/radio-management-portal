import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Copy, Check, Edit, X } from "lucide-react";

interface StreamingCredentials {
  id: string;
  type: string;
  address: string;
  port: number;
  password: string;
  mountpoint: string;
  username: string;
}

export const StreamingCredentials = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<StreamingCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('streaming_credentials')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCredentials(data);
      }
    } catch (error) {
      console.error('Error fetching streaming credentials:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load streaming credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof StreamingCredentials, value: string | number) => {
    if (!isAdmin || !credentials || !isEditing) return;
    
    setCredentials({
      ...credentials,
      [field]: value
    });
  };

  const handleSave = async () => {
    if (!credentials || !isAdmin || !isEditing) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('streaming_credentials')
        .update({
          type: credentials.type,
          address: credentials.address,
          port: credentials.port,
          password: credentials.password,
          mountpoint: credentials.mountpoint,
          username: credentials.username
        })
        .eq('id', credentials.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Streaming credentials updated successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save streaming credentials",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    if (isAdmin) {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchCredentials(); // Reload original data
  };

  const copyToClipboard = async (value: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied",
        description: `${fieldName} copied to clipboard`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!credentials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Streaming Credentials</CardTitle>
          <CardDescription>No streaming credentials configured</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Streaming Credentials
          {isAdmin && (
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <Button onClick={handleEdit} size="sm" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button onClick={handleCancel} size="sm" variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </div>
          )}
        </CardTitle>
        <CardDescription>
          {isAdmin 
            ? (isEditing ? "Edit streaming server credentials" : "View streaming server credentials - click Edit to modify") 
            : "View streaming server credentials"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="type"
                value={credentials.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                disabled={!isAdmin || !isEditing}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.type, 'Type')}
              >
                {copiedField === 'Type' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="address"
                value={credentials.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                disabled={!isAdmin || !isEditing}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.address, 'Address')}
              >
                {copiedField === 'Address' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="port"
                type="number"
                value={credentials.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                disabled={!isAdmin || !isEditing}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.port.toString(), 'Port')}
              >
                {copiedField === 'Port' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="username"
                value={credentials.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={!isAdmin || !isEditing}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.username, 'Username')}
              >
                {copiedField === 'Username' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="password"
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={!isAdmin || !isEditing}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.password, 'Password')}
              >
                {copiedField === 'Password' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mountpoint">Mountpoint</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="mountpoint"
                value={credentials.mountpoint}
                onChange={(e) => handleInputChange('mountpoint', e.target.value)}
                disabled={!isAdmin || !isEditing}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.mountpoint, 'Mountpoint')}
              >
                {copiedField === 'Mountpoint' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};