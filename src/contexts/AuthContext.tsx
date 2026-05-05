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
  auto_print_tickets?: boolean;
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
      // Fetch profile and roles in parallel for better resilience
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role, restaurant_id').eq('user_id', userId)
      ]);

      if (profileRes.error) {
        console.error('[AuthContext] Profile fetch error:', profileRes.error);
      }

      const profileData = profileRes.data;
      const rolesData = (rolesRes.data as UserRole[]) || [];

      setProfile(profileData);
      setUserRoles(rolesData);

      // Fetch restaurant data if possible
      if (profileData?.restaurant_id) {
        const { data: restaurantRes } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', profileData.restaurant_id)
          .maybeSingle();
        
        setRestaurant(restaurantRes as Restaurant || null);
      } else {
        setRestaurant(null);
      }

      console.log('[AuthContext] Success loading user data:', { 
        userId, 
        hasProfile: !!profileData, 
        rolesCount: rolesData.length 
      });
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
    // 1. Standard database role check
    const hasDbRole = userRoles.some(r => r.role === role);
    if (hasDbRole) return true;

    // 2. Special case for Super Admin (Master User)
    // We recognize specific emails as system-wide admins even if they don't have a record in user_roles
    // (since user_roles requires a restaurant_id NOT NULL constraint)
    const masterEmails = [
      'smartmenug2@gmail.com', 
      'josejacob.pn@gmail.com', 
      'smartbeautyg2@gmail.com'
    ];
    
    if (role === 'admin' && user?.email && masterEmails.includes(user.email.toLowerCase())) {
      console.log('[AuthContext] Master Admin recognized by email:', user.email);
      return true;
    }

    return false;
  }, [userRoles, user?.email]);

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


