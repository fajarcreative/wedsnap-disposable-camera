import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissBanner, setDismissBanner] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!configured) {
        return {
          error: { message: 'Supabase is not configured', status: 500 } as unknown as AuthError,
        };
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    },
    [configured]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!configured) {
        return {
          error: { message: 'Supabase is not configured', status: 500 } as unknown as AuthError,
        };
      }
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    },
    [configured]
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [configured]);

  return (
    <AuthContext.Provider value={{ user, loading, configured, signIn, signUp, signOut }}>
      {!configured && !dismissBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] px-4 py-1.5 text-center text-xs font-semibold bg-[#ffdea4] text-[#443000] border-b border-[#cca72f] flex items-center justify-between">
          <span className="flex-1 text-center">
            Mode Demo / Offline — Supabase belum dikonfigurasi di .env
          </span>
          <button
            type="button"
            onClick={() => setDismissBanner(true)}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 text-xs font-bold shrink-0 ml-2"
            title="Tutup pemberitahuan"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
