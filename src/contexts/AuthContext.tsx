import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Guard to prevent multiple simultaneous fetches
  const fetchingRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;
    
    setLoading(true);
    console.log('[AuthContext] Fetching data for:', userId);

    try {
      // Fetch everything in one go for speed
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        const [rolesRes, restaurantRes] = await Promise.all([
          supabase.from('user_roles').select('role, restaurant_id').eq('user_id', userId),
          profileData.restaurant_id 
            ? supabase.from('restaurants').select('*').eq('id', profileData.restaurant_id).maybeSingle()
            : Promise.resolve({ data: null, error: null })
        ]);

        setProfile(profileData);
        setUserRoles(rolesRes.data as UserRole[] || []);
        setRestaurant(restaurantRes.data as Restaurant || null);
        console.log('[AuthContext] Success loading profile:', profileData.id);
      } else {
        console.warn('[AuthContext] No profile found');
        setProfile(null);
      }
    } catch (error) {
      console.error('[AuthContext] Fetch error:', error);
    } finally {
      fetchingRef.current = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(s);
        setUser(s?.user ?? null);
        
        if (s?.user) {
          await fetchUserData(s.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext] Init error:', err);
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      console.log('[AuthContext] Event:', event);
      
      setSession(s);
      setUser(s?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (s?.user) fetchUserData(s.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setRestaurant(null);
        setUserRoles([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const refreshRestaurantData = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, restaurantName: string) => {
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
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRestaurant(null);
    setUserRoles([]);
    setUser(null);
    setSession(null);
  }, []);

  const hasRole = useCallback((role: 'admin' | 'attendant' | 'kitchen') => {
    return userRoles.some(r => r.role === role);
  }, [userRoles]);

  const value = useMemo(() => ({
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
  }), [
    user, session, profile, userRoles, restaurant, loading, 
    signUp, signIn, signOut, hasRole, refreshRestaurantData
  ]);

  return (
    <AuthContext.Provider value={value}>
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


