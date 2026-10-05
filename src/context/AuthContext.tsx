import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string; requiresVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<{ error?: string; success?: boolean }>;
  simulateVerifyEmail: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = '@carlogix_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured());

  // Initialize session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured()) {
          setIsDemoMode(false);
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            mapSupabaseUser(session.user);
          } else {
            setUser(null);
          }

          // Listen for Supabase auth state changes
          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              mapSupabaseUser(session.user);
            } else {
              setUser(null);
            }
          });
        } else {
          // Local demo storage mode for preview without active backend
          setIsDemoMode(true);
          const savedDemoUser = await AsyncStorage.getItem(DEMO_USER_KEY);
          if (savedDemoUser) {
            setUser(JSON.parse(savedDemoUser));
          } else {
            // Default demo user initialized (verified)
            const defaultUser: User = {
              id: 'demo-user-1',
              email: 'lukas.cernik@example.cz',
              emailVerified: true,
              displayName: 'Lukáš Černík',
              isMechanic: false,
              createdAt: new Date().toISOString(),
            };
            setUser(defaultUser);
            await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(defaultUser));
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const mapSupabaseUser = (sbUser: any) => {
    const isVerified = Boolean(sbUser.email_confirmed_at);
    const mappedUser: User = {
      id: sbUser.id,
      email: sbUser.email || '',
      emailVerified: isVerified,
      displayName:
        sbUser.user_metadata?.full_name ||
        sbUser.user_metadata?.displayName ||
        sbUser.email?.split('@')[0] ||
        'Řidič CarLogix',
      isMechanic: Boolean(sbUser.user_metadata?.isMechanic),
      workshopName: sbUser.user_metadata?.workshopName,
      createdAt: sbUser.created_at,
    };
    setUser(mappedUser);
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          mapSupabaseUser(data.user);
        }
        return {};
      } else {
        // Demo mode sign-in
        const newUser: User = {
          id: 'demo-user-' + Date.now(),
          email,
          emailVerified: true,
          displayName: email.split('@')[0],
          isMechanic: false,
          createdAt: new Date().toISOString(),
        };
        setUser(newUser);
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser));
        return {};
      }
    } catch (err: any) {
      return { error: err.message || 'Nastala chyba při přihlašování' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ error?: string; requiresVerification?: boolean }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const redirectUrl = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { displayName },
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) return { error: error.message };
        if (data.user) {
          mapSupabaseUser(data.user);
          const needsVerification = !data.user.email_confirmed_at;
          return { requiresVerification: needsVerification };
        }
        return { requiresVerification: true };
      } else {
        // Demo sign up with unverified status to showcase verification requirement!
        const newUser: User = {
          id: 'demo-user-' + Date.now(),
          email,
          emailVerified: false,
          displayName,
          isMechanic: false,
          createdAt: new Date().toISOString(),
        };
        setUser(newUser);
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser));
        return { requiresVerification: true };
      }
    } catch (err: any) {
      return { error: err.message || 'Chyba registrace' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const redirectUrl = makeRedirectUri({
          scheme: 'carlogix',
          path: 'auth/callback',
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) return { error: error.message };
        if (!data?.url) return { error: 'Nepodařilo se vygenerovat přihlašovací odkaz.' };

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          // Robust parameter extraction for custom schemes (exp://, carlogix://)
          const urlStr = result.url;
          const params: Record<string, string> = {};
          const queryIdx = urlStr.indexOf('?');
          const hashIdx = urlStr.indexOf('#');

          const queryPart =
            queryIdx !== -1
              ? hashIdx !== -1
                ? urlStr.substring(queryIdx + 1, hashIdx)
                : urlStr.substring(queryIdx + 1)
              : '';
          const hashPart = hashIdx !== -1 ? urlStr.substring(hashIdx + 1) : '';

          [queryPart, hashPart].forEach((part) => {
            if (!part) return;
            part.split('&').forEach((pair) => {
              const [k, v] = pair.split('=');
              if (k && v) {
                params[decodeURIComponent(k)] = decodeURIComponent(v);
              }
            });
          });

          const code = params.code;
          const accessToken = params.access_token;
          const refreshToken = params.refresh_token;

          if (code) {
            const { data: sessionData, error: sessionErr } =
              await supabase.auth.exchangeCodeForSession(code);
            if (sessionErr) return { error: sessionErr.message };
            if (sessionData.user) mapSupabaseUser(sessionData.user);
          } else if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionErr) return { error: sessionErr.message };
            if (sessionData.user) mapSupabaseUser(sessionData.user);
          }
        } else {
          // Fallback: Pokud se okno zavře nebo prohlížeč neprovede redirect,
          // zkontrolujeme, zda v Supabase již vznikla nová aktivní session
          const { data: sessionCheck } = await supabase.auth.getSession();
          if (sessionCheck?.session?.user) {
            mapSupabaseUser(sessionCheck.session.user);
          }
        }
        return {};
      } else {
        // Demo Google sign-in
        const googleUser: User = {
          id: 'google-demo-' + Date.now(),
          email: 'lukas.cernik@gmail.com',
          emailVerified: true,
          displayName: 'Lukáš Černík (Google)',
          isMechanic: false,
          createdAt: new Date().toISOString(),
        };
        setUser(googleUser);
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(googleUser));
        return {};
      }
    } catch (err: any) {
      return { error: err.message || 'Chyba při přihlašování přes Google' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      } else {
        await AsyncStorage.removeItem(DEMO_USER_KEY);
      }
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (refreshedUser) {
        mapSupabaseUser(refreshedUser);
        return Boolean(refreshedUser.email_confirmed_at);
      }
      return false;
    } else {
      return user ? user.emailVerified : false;
    }
  };

  const resendVerificationEmail = async (): Promise<{ error?: string; success?: boolean }> => {
    if (!user?.email) return { error: 'Není zadán žádný e-mail.' };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) return { error: error.message };
      return { success: true };
    } else {
      return { success: true };
    }
  };

  const simulateVerifyEmail = () => {
    if (user) {
      const verifiedUser: User = { ...user, emailVerified: true };
      setUser(verifiedUser);
      AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(verifiedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        isEmailVerified: Boolean(user?.emailVerified),
        isDemoMode,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        checkEmailVerification,
        resendVerificationEmail,
        simulateVerifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
