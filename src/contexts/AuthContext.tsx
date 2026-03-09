import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  restaurant_id: string | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface UserRole {
  role: 'admin' | 'attendant' | 'kitchen';
  restaurant_id: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRoles: UserRole[];
  restaurant: Restaurant | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, restaurantName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: 'admin' | 'attendant' | 'kitchen') => boolean;
  refreshRestaurantData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Initial session fetch error:', error);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        // Only trigger full update if the session/user actually changed
        // or during specific events like SIGNED_IN
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRoles([]);
          setRestaurant(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            setLoading(true);
            await fetchUserData(currentSession.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData?.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('id, name, slug, trial_ends_at, subscription_ends_at')
          .eq('id', profileData.restaurant_id)
          .maybeSingle();

        setRestaurant(restaurantData);

        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role, restaurant_id')
          .eq('user_id', userId);

        setUserRoles(rolesData as UserRole[] || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRestaurantData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, restaurantName: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            restaurant_name: restaurantName,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // Data creation is now handled by Database Trigger (handle_new_user)
      // This avoids RLS issues with unconfirmed emails

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserRoles([]);
    setRestaurant(null);
  };

  const hasRole = (role: 'admin' | 'attendant' | 'kitchen') => {
    return userRoles.some(r => r.role === role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      userRoles,
      restaurant,
      loading,
      signUp,
      signIn,
      signOut,
      hasRole,
      refreshRestaurantData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
