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
  
  // Guard to prevent multiple simultaneous fetches
  const fetchingRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Skip if already fetching same user
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;

    console.log('[AuthContext] Fetching user data for:', userId);

    // Set a safety timeout - reduced further for faster recovery
    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] fetchUserData timed out after 5s');
      if (fetchingRef.current === userId) {
        setLoading(false);
        fetchingRef.current = null;
      }
    }, 5000);

    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role, restaurant_id').eq('user_id', userId)
      ]);

      if (profileRes.error) {
        console.error('[AuthContext] Profile fetch error:', profileRes.error);
        throw profileRes.error;
      }

      const profileData = profileRes.data;
      let restaurantData = null;

      if (profileData?.restaurant_id) {
        const { data: rData, error: rError } = await supabase
          .from('restaurants')
          .select('id, name, slug, trial_ends_at, subscription_ends_at')
          .eq('id', profileData.restaurant_id)
          .maybeSingle();

        if (rError) console.error('[AuthContext] Restaurant fetch error:', rError);
        restaurantData = rData;
      }

      // Batch all updates
      setProfile(profileData);
      setRestaurant(restaurantData);
      setUserRoles(rolesRes.data as UserRole[] || []);

      if (!profileData && userId) {
        console.warn('[AuthContext] Session exists but no profile found. Signing out.');
        await supabase.auth.signOut();
        setProfile(null);
        setRestaurant(null);
        setUserRoles([]);
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('[AuthContext] fetchUserData caught error:', error);
    } finally {
      clearTimeout(timeoutId);
      fetchingRef.current = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety timeout for initialization
    const initTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[AuthContext] Initialization timeout reached');
        setLoading(false);
      }
    }, 6000);

    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing auth...');
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthContext] getSession error:', sessionError);
          if (mounted) setLoading(false);
          return;
        }

        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchUserData(initialSession.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] initializeAuth error:', error);
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(initTimeout);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        console.log('[AuthContext] Auth state change:', event);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRestaurant(null);
          setUserRoles([]);
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentSession?.user) {
            await fetchUserData(currentSession.user.id);
          } else {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
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


