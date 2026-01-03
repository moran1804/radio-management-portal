import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, Check, X } from "lucide-react";

interface ProfileField {
  field: string;
  label: string;
  description: string;
  isComplete: boolean;
}

export const ProfileCompletionDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileFields, setProfileFields] = useState<ProfileField[]>([]);
  const [djProfile, setDjProfile] = useState<any>(null);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Reset session tracking when user changes (new login)
  useEffect(() => {
    setHasShownThisSession(false);
  }, [user?.id]);

  // Fetch DJ profile data
  useEffect(() => {
    const fetchDjProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('djs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setDjProfile(data);
    };

    if (user?.id) {
      fetchDjProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!profile || !user) return;

    // Define required fields and check their completion status
    const fields: ProfileField[] = [
      {
        field: 'name',
        label: 'DJ Name',
        description: 'Your display name as a DJ',
        isComplete: !!(profile.name && profile.name.trim())
      },
      {
        field: 'bio',
        label: 'Bio',
        description: 'Tell listeners about yourself and your shows',
        isComplete: !!(djProfile?.bio && djProfile.bio.trim())
      },
      {
        field: 'icecast_username',
        label: 'Icecast Username',
        description: 'Your streaming username for going live',
        isComplete: !!(profile.icecast_username && profile.icecast_username.trim())
      },
      {
        field: 'icecast_password_encrypted',
        label: 'Icecast Password',
        description: 'Your streaming password for authentication',
        isComplete: !!(profile.icecast_password_encrypted && profile.icecast_password_encrypted.trim())
      }
    ];

    setProfileFields(fields);
    
    // Don't show dialog on auth pages
    const isAuthPage = location.pathname === '/auth';
    
    // Show dialog if any fields are incomplete AND we haven't shown it this session AND not on auth page
    const hasIncompleteFields = fields.some(field => !field.isComplete);
    if (hasIncompleteFields && !hasShownThisSession && !isAuthPage) {
      setIsOpen(true);
      setHasShownThisSession(true);
    }
  }, [profile, user, djProfile, hasShownThisSession]);

  const handleComplete = () => {
    setIsOpen(false);
    navigate('/dj-profile');
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  const incompleteCount = profileFields.filter(field => !field.isComplete).length;

  if (!profile || profileFields.length === 0 || incompleteCount === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-left">Complete Your DJ Profile</DialogTitle>
              <DialogDescription className="text-left">
                {incompleteCount} field{incompleteCount > 1 ? 's' : ''} remaining to complete your profile
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium text-sm mb-3">Profile Status:</h4>
            <div className="space-y-3">
              {profileFields.map((field) => (
                <div key={field.field} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {field.isComplete ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                        <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className={`font-medium text-sm ${field.isComplete ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {field.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Complete your profile to start streaming and managing your shows</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            Remind Me Later
          </Button>
          <Button onClick={handleComplete} className="gap-2">
            <User className="h-4 w-4" />
            Complete Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};