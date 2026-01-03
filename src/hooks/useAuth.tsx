import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: 'DJ' | 'ADMIN';
  icecast_username: string | null;
  icecast_password_encrypted: string | null;
  icecast_address: string | null;
  icecast_port: number | null;
  icecast_mountpoint: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    console.log('fetchProfile called, session:', session?.user?.id);
    if (!session?.user) {
      console.log('No session user, setting profile to null');
      setProfile(null);
      return;
    }

    try {
      console.log('Fetching profile for user:', session.user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle(); // Use maybeSingle instead of single

      if (error) {
        console.error('Error fetching profile:', error);
        // Don't return here, create a profile if it doesn't exist
      }

      if (data) {
        console.log('Profile found:', data);
        setProfile(data);
      } else {
        console.log('No profile found, this might be expected for new users');
        // For now, set a temporary profile object
        const tempProfile = {
          id: session.user.id,
          user_id: session.user.id,
          name: session.user.email?.split('@')[0] || 'User',
          role: 'DJ' as const,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          icecast_username: null,
          icecast_password_encrypted: null,
          icecast_address: null,
          icecast_port: null,
          icecast_mountpoint: null
        };
        setProfile(tempProfile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Set a fallback profile
      const fallbackProfile = {
        id: session.user.id,
        user_id: session.user.id,
        name: session.user.email?.split('@')[0] || 'User',
        role: 'DJ' as const,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        icecast_username: null,
        icecast_password_encrypted: null,
        icecast_address: null,
        icecast_port: null,
        icecast_mountpoint: null
      };
      setProfile(fallbackProfile);
    }
  };

  useEffect(() => {
    console.log('🚀 useAuth - Initializing auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 AUTH STATE CHANGE EVENT:', {
          event,
          userId: session?.user?.id || 'none',
          userEmail: session?.user?.email || 'none',
          hasSession: !!session,
          sessionExpiry: session?.expires_at,
          timestamp: new Date().toISOString()
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer profile fetching to avoid deadlock
        if (session?.user) {
          console.log('⏳ Scheduling profile fetch for user:', session.user.id);
          setTimeout(() => {
            console.log('📡 Starting profile query for user:', session.user.id);
            supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle()
              .then(({ data, error }) => {
                console.log('📋 PROFILE QUERY RESULT:', {
                  success: !error,
                  hasData: !!data,
                  data: data,
                  error: error,
                  userId: session.user.id,
                  timestamp: new Date().toISOString()
                });
                
                if (error) {
                  console.error('❌ Profile fetch error:', error);
                  console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                  });
                  setProfile(null);
                } else if (data) {
                  console.log('✅ Profile successfully loaded:', data);
                  setProfile(data);
                } else {
                  console.log('⚠️  No profile found - this may be expected for new users');
                  setProfile(null);
                }
              }, (err) => {
                console.error('💥 Profile query caught error:', err);
                setProfile(null);
              });
          }, 100); // Slight delay to ensure auth context is ready
        } else {
          console.log('👤 No session user - clearing profile');
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    console.log('🔍 Checking for existing session...');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('💾 INITIAL SESSION CHECK:', {
        hasSession: !!session,
        userId: session?.user?.id || 'none',
        userEmail: session?.user?.email || 'none',
        timestamp: new Date().toISOString()
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        console.log('🎯 Initial session found - fetching profile for:', session.user.id);
        try {
          console.log('📡 Making initial profile query...');
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          console.log('📊 INITIAL PROFILE RESULT:', {
            success: !error,
            hasData: !!data,
            data: data,
            error: error,
            timestamp: new Date().toISOString()
          });

          if (error) {
            console.error('❌ Initial profile fetch error:', error);
            console.error('Error details:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
            setProfile(null);
          } else if (data) {
            console.log('✅ Initial profile loaded successfully:', data);
            setProfile(data);
          } else {
            console.log('⚠️  No initial profile found');
            setProfile(null);
          }
        } catch (error) {
          console.error('💥 Initial profile fetch caught error:', error);
          setProfile(null);
        }
      } else {
        console.log('🚫 No initial session found');
      }
    }).catch(error => {
      console.error('💥 Session check failed:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};