import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  isInitializing: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInAsDemoUser: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string; requiresVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<{ error?: string; success?: boolean }>;
  simulateVerifyEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = '@carlogix_demo_user';
const VERIFIED_OVERRIDE_PREFIX = '@carlogix_email_verified_override_';
const PENDING_AUTH_KEY = '@carlogix_pending_auth';
const LAST_EMAIL_KEY = '@carlogix_last_email';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured());

  const mapSupabaseUser = async (sbUser: any): Promise<User> => {
    const isVerifiedInSb = Boolean(sbUser.email_confirmed_at);
    let localOverride = false;
    try {
      const val = await AsyncStorage.getItem(VERIFIED_OVERRIDE_PREFIX + sbUser.id);
      localOverride = val === 'true';
    } catch {
      // ignore storage error
    }

    const isVerified = isVerifiedInSb || localOverride;
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
    return mappedUser;
  };

  const processAuthUrl = async (urlStr: string): Promise<{ error?: string; success?: boolean }> => {
    try {
      if (!urlStr) return {};

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

      if (params.error_description || params.error) {
        return { error: params.error_description || params.error };
      }

      const code = params.code;
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (code && isSupabaseConfigured()) {
        const { data: sessionData, error: sessionErr } =
          await supabase.auth.exchangeCodeForSession(code);
        if (sessionErr) return { error: sessionErr.message };
        if (sessionData.user) {
          await mapSupabaseUser(sessionData.user);
          await AsyncStorage.removeItem(PENDING_AUTH_KEY);
        }
        return { success: true };
      } else if (accessToken && refreshToken && isSupabaseConfigured()) {
        const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionErr) return { error: sessionErr.message };
        if (sessionData.user) {
          await mapSupabaseUser(sessionData.user);
          await AsyncStorage.removeItem(PENDING_AUTH_KEY);
        }
        return { success: true };
      }

      if (isSupabaseConfigured()) {
        const { data: sessionCheck } = await supabase.auth.getSession();
        if (sessionCheck?.session?.user) {
          await mapSupabaseUser(sessionCheck.session.user);
          await AsyncStorage.removeItem(PENDING_AUTH_KEY);
          return { success: true };
        }
      }

      return {};
    } catch (err: any) {
      console.error('Error processing auth URL:', err);
      return { error: err.message };
    }
  };

  // 1. Initialize session on cold start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured()) {
          setIsDemoMode(false);
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await mapSupabaseUser(session.user);
            await AsyncStorage.removeItem(PENDING_AUTH_KEY);
          } else {
            // Check if there is a pending registration waiting for email verification
            const pendingAuthStr = await AsyncStorage.getItem(PENDING_AUTH_KEY);
            if (pendingAuthStr) {
              try {
                const { email, password } = JSON.parse(pendingAuthStr);
                if (email && password) {
                  // Attempt silent login in case the user clicked the verification link while app was closed
                  const { data: signInData, error: signInError } =
                    await supabase.auth.signInWithPassword({
                      email,
                      password,
                    });
                  if (!signInError && signInData?.user) {
                    await mapSupabaseUser(signInData.user);
                    await AsyncStorage.removeItem(PENDING_AUTH_KEY);
                    return;
                  } else {
                    // Still unverified: restore unverified state so user sees EmailVerificationScreen
                    const unverifiedUser: User = {
                      id: 'pending-' + Date.now(),
                      email,
                      emailVerified: false,
                      displayName: email.split('@')[0],
                      isMechanic: false,
                      createdAt: new Date().toISOString(),
                    };
                    setUser(unverifiedUser);
                    return;
                  }
                }
              } catch (e) {
                console.warn('Error reading pending auth on boot:', e);
              }
            }
            setUser(null);
          }

          // Listen for Supabase auth state changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              await mapSupabaseUser(session.user);
              await AsyncStorage.removeItem(PENDING_AUTH_KEY);
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
            const defaultUser: User = {
              id: 'demo-user-1',
              email: 'lukas.cernik@example.cz',
              emailVerified: true,
              displayName: 'Lukáš Černík (Demo)',
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
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  // 2. Global Deep Linking Listener for auth callbacks (OAuth, Email verification)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        processAuthUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        processAuthUrl(event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const lower = error.message.toLowerCase();
          if (lower.includes('email not confirmed')) {
            return {
              error: 'E-mail nebyl dosud potvrzen. Zkontrolujte prosím svoji doručenou poštu.',
            };
          }
          if (lower.includes('invalid login credentials')) {
            return {
              error: 'Neplatný e-mail nebo heslo. Pokud účet ještě nemáte, zvolte registraci níže.',
            };
          }
          return { error: error.message };
        }
        if (data.user) {
          await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim());
          await AsyncStorage.removeItem(PENDING_AUTH_KEY);
          await mapSupabaseUser(data.user);
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
        await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim());
        return {};
      }
    } catch (err: any) {
      return { error: err.message || 'Nastala chyba při přihlašování' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsDemoUser = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const defaultUser: User = {
        id: 'demo-user-1',
        email: 'lukas.cernik@example.cz',
        emailVerified: true,
        displayName: 'Lukáš Černík (Maturitní demo)',
        isMechanic: false,
        createdAt: new Date().toISOString(),
      };
      setUser(defaultUser);
      await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(defaultUser));
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
        if (error) {
          const lower = error.message.toLowerCase();
          if (lower.includes('rate limit')) {
            return {
              error: 'Byl vyčerpán limit odesílání e-mailů (3 za hodinu). Zkuste to prosím později.',
            };
          }
          if (
            lower.includes('password should') ||
            lower.includes('password must') ||
            lower.includes('password does not meet') ||
            lower.includes('pwned') ||
            lower.includes('weak') ||
            lower.includes('character')
          ) {
            return {
              error:
                'Heslo nesplňuje bezpečnostní pravidla (min. 8 znaků, velké i malé písmeno, číslice a symbol).',
            };
          }
          return { error: error.message };
        }

        // Store pending credentials so checkEmailVerification can verify & log in smoothly
        await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim());
        await AsyncStorage.setItem(
          PENDING_AUTH_KEY,
          JSON.stringify({ email: email.trim(), password })
        );

        if (data.user) {
          const mapped = await mapSupabaseUser(data.user);
          const needsVerification = !data.user.email_confirmed_at && !mapped.emailVerified;
          return { requiresVerification: needsVerification };
        }
        return { requiresVerification: true };
      } else {
        // Demo sign up with unverified status to showcase verification requirement
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
        await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim());
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
        const redirectUrl = Linking.createURL('auth/callback');

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
          const res = await processAuthUrl(result.url);
          return res;
        } else {
          // Fallback check if user completed authentication
          const { data: sessionCheck } = await supabase.auth.getSession();
          if (sessionCheck?.session?.user) {
            await mapSupabaseUser(sessionCheck.session.user);
            await AsyncStorage.removeItem(PENDING_AUTH_KEY);
            return {};
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
      await AsyncStorage.removeItem(PENDING_AUTH_KEY);
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
      // 1. If we already have a session, refresh and check user
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: { user: refreshedUser } } = await supabase.auth.getUser();
          if (refreshedUser?.email_confirmed_at) {
            await mapSupabaseUser(refreshedUser);
            await AsyncStorage.removeItem(PENDING_AUTH_KEY);
            return true;
          }
        }
      } catch (e) {
        console.warn('Session check warning:', e);
      }

      // 2. If no active session or session user not verified yet, try pending credentials
      try {
        const pendingAuthStr = await AsyncStorage.getItem(PENDING_AUTH_KEY);
        if (pendingAuthStr) {
          const { email: pendingEmail, password: pendingPassword } = JSON.parse(pendingAuthStr);
          if (pendingEmail && pendingPassword) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: pendingEmail,
              password: pendingPassword,
            });

            if (!signInError && signInData?.user) {
              // Successfully signed in! Email is confirmed and session is created!
              await mapSupabaseUser(signInData.user);
              await AsyncStorage.removeItem(PENDING_AUTH_KEY);
              return true;
            }
          }
        }
      } catch (e) {
        console.error('Error verifying with pending credentials:', e);
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
      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('rate limit')) {
          return {
            error: 'Byl vyčerpán limit odesílání e-mailů. Zkuste to prosím později.',
          };
        }
        return { error: error.message };
      }
      return { success: true };
    } else {
      return { success: true };
    }
  };

  const simulateVerifyEmail = async (): Promise<void> => {
    if (user) {
      try {
        await AsyncStorage.setItem(VERIFIED_OVERRIDE_PREFIX + user.id, 'true');
      } catch {}
      const verifiedUser: User = { ...user, emailVerified: true };
      setUser(verifiedUser);
      if (isDemoMode) {
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(verifiedUser));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isInitializing,
        isLoading,
        isAuthenticated: Boolean(user),
        isEmailVerified: Boolean(user?.emailVerified),
        isDemoMode,
        signIn,
        signInAsDemoUser,
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
