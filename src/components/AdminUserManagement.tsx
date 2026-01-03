import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, MoreHorizontal, Trash2, RotateCcw, UserCog, Mail } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatUKDateTime } from "@/utils/timezone";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: 'DJ' | 'ADMIN';
  icecast_username: string | null;
  icecast_password_encrypted: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  email_confirmed_at?: string | null;
}

const AdminUserManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const fetchProfiles = async () => {
    try {
      // Fetch profiles with user data including email and verification status
      const { data, error } = await supabase.functions.invoke('get-users-with-verification', {});

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch user profiles",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'ADMIN') {
      fetchProfiles();
    }
  }, [profile]);

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as 'DJ' | 'ADMIN';
    const icecastUsername = formData.get("icecast_username") as string;

    try {
      // Create user using admin API (sends invite email)
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          name,
          role,
          icecast_username: icecastUsername || null
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `${name} has been invited to join as a ${role.toLowerCase()}. They will receive an email to verify their account and set their password.`,
      });

      setDialogOpen(false);
      fetchProfiles();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating user",
        description: error.message || "Failed to create user",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User updated",
        description: `User has been ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      fetchProfiles();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user status",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: 'DJ' | 'ADMIN') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `User role has been changed to ${newRole}`,
      });

      fetchProfiles();
      setRoleChangeDialogOpen(false);
      setSelectedProfile(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role",
      });
    }
  };

  const resendVerification = async (userId: string, userName: string) => {
    setResendLoading(userId);
    
    try {
      const { error } = await supabase.functions.invoke('resend-verification', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: `A new verification email has been sent to ${userName}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error sending verification email",
        description: error.message || "Failed to resend verification email",
      });
    } finally {
      setResendLoading(null);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast({
        title: "User deleted",
        description: `${userName} has been permanently deleted`,
      });

      fetchProfiles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting user",
        description: error.message || "Failed to delete user",
      });
    }
  };

  if (profile?.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage DJ accounts and permissions
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add DJ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a new DJ or Admin. They will receive an email to verify their account and set their password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createUser}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">DJ Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DJ">DJ</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icecast_username">Icecast Username (Optional)</Label>
                    <Input id="icecast_username" name="icecast_username" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createLoading}>
                    {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Name</TableHead>
               <TableHead>Email</TableHead>
               <TableHead>Role</TableHead>
               <TableHead>Verification</TableHead>
               <TableHead>Icecast Username</TableHead>
               <TableHead>Status</TableHead>
               <TableHead>Created</TableHead>
               <TableHead className="w-[70px]"></TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {profiles.map((profile) => (
               <TableRow key={profile.id}>
                 <TableCell className="font-medium">{profile.name}</TableCell>
                 <TableCell>{profile.email || '-'}</TableCell>
                 <TableCell>
                   <Badge variant={profile.role === 'ADMIN' ? 'default' : 'secondary'}>
                     {profile.role}
                   </Badge>
                 </TableCell>
                 <TableCell>
                   <Badge variant={profile.email_confirmed_at ? 'default' : 'destructive'}>
                     {profile.email_confirmed_at ? 'Verified' : 'Unverified'}
                   </Badge>
                 </TableCell>
                 <TableCell>{profile.icecast_username || '-'}</TableCell>
                 <TableCell>
                   <Badge variant={profile.active ? 'default' : 'destructive'}>
                     {profile.active ? 'Active' : 'Inactive'}
                   </Badge>
                 </TableCell>
                 <TableCell>
                   {formatUKDateTime(profile.created_at, 'PPP')}
                 </TableCell>
                 <TableCell>
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="h-8 w-8 p-0">
                         <MoreHorizontal className="h-4 w-4" />
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       {!profile.email_confirmed_at && (
                         <DropdownMenuItem 
                           onClick={() => resendVerification(profile.user_id, profile.name)}
                           disabled={resendLoading === profile.user_id}
                         >
                           {resendLoading === profile.user_id ? (
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           ) : (
                             <Mail className="mr-2 h-4 w-4" />
                           )}
                           Resend Verification Email
                         </DropdownMenuItem>
                       )}
                       <DropdownMenuItem onClick={() => {
                         setSelectedProfile(profile);
                         setRoleChangeDialogOpen(true);
                       }}>
                         <UserCog className="mr-2 h-4 w-4" />
                         Change Role
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => toggleUserStatus(profile.user_id, profile.active)}>
                         <RotateCcw className="mr-2 h-4 w-4" />
                         {profile.active ? 'Deactivate' : 'Activate'}
                       </DropdownMenuItem>
                       {!profile.active && (
                         <DropdownMenuItem 
                           onClick={() => deleteUser(profile.user_id, profile.name)}
                           className="text-destructive focus:text-destructive"
                         >
                           <Trash2 className="mr-2 h-4 w-4" />
                           Delete User
                         </DropdownMenuItem>
                       )}
                     </DropdownMenuContent>
                   </DropdownMenu>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
        </Table>
      </CardContent>

      {/* Role Change Dialog */}
      <Dialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedProfile?.name}. This will affect their permissions in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <Badge variant={selectedProfile?.role === 'ADMIN' ? 'default' : 'secondary'}>
                {selectedProfile?.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select onValueChange={(value: 'DJ' | 'ADMIN') => {
                if (selectedProfile) {
                  updateUserRole(selectedProfile.user_id, value);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DJ">DJ</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminUserManagement;