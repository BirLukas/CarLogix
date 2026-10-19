import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onBackToWelcome?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister, onBackToWelcome }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { signIn, signInWithGoogle, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadLastEmail = async () => {
      try {
        const last = await AsyncStorage.getItem('@carlogix_last_email');
        if (last && !email) {
          setEmail(last);
        }
      } catch {}
    };
    loadLastEmail();
  }, []);

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('Vyplňte prosím e-mail a heslo.');
      return;
    }

    const res = await signIn(email.trim(), password);
    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    const res = await signInWithGoogle();
    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Ambient background glows */}
      <View pointerEvents="none" style={[styles.ambientTopGlow, { backgroundColor: theme.ambientGlowPrimary }]} />
      <View pointerEvents="none" style={[styles.ambientRightGlow, { backgroundColor: theme.ambientGlowSecondary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {onBackToWelcome && (
            <TouchableOpacity
              onPress={onBackToWelcome}
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          )}

          {/* Brand header with Neon Halo & CarLogix_Logo.png */}
          <View style={styles.brandHeader}>
            <View style={styles.haloGlowContainer}>
              <View style={[styles.outerGlowCircle, { backgroundColor: isDark ? 'rgba(42, 12, 98, 0.8)' : 'rgba(255, 1, 143, 0.15)' }]} />
              <View style={styles.badgeRing}>
                <View style={styles.badgeInner}>
                  <Image
                    source={require('../../assets/CarLogix_Logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>CarLogix</Text>
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
              Chytrá správa vozidla a diagnostika OBD-II
            </Text>
          </View>

          {/* Login Card with glassmorphism border */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                shadowColor: theme.shadowColor,
                shadowOpacity: theme.shadowOpacity,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Přihlášení k účtu</Text>

            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: theme.danger + '18', borderColor: theme.danger }]}>
                <Ionicons name="alert-circle" size={18} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>E-mailová adresa</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="mail-outline" size={19} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="např. uzivatel@email.cz"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Heslo</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={19} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Zadejte heslo"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Přihlásit se</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>NEBO</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                },
              ]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color="#EA4335" style={styles.googleIcon} />
              <Text style={[styles.googleButtonText, { color: theme.textPrimary }]}>
                Pokračovat přes Google
              </Text>
            </TouchableOpacity>
          </View>

          {/* Switch to Register */}
          <View style={styles.footerSwitch}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Nemáte ještě účet? </Text>
            <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Zaregistrujte se</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(42, 12, 98, 0.5)',
  },
  ambientRightGlow: {
    position: 'absolute',
    top: '30%',
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 1, 143, 0.12)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    justifyContent: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  haloGlowContainer: {
    position: 'relative',
    width: 86,
    height: 86,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  outerGlowCircle: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(42, 12, 98, 0.8)',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 8,
  },
  badgeRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    padding: 2,
    backgroundColor: '#2A0C62',
    borderWidth: 1.5,
    borderColor: '#FF018F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInner: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
    backgroundColor: '#121118',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandSubtitle: {
    fontSize: 12.5,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: 'rgba(24, 22, 34, 0.95)',
    padding: 22,
    shadowColor: '#2A0C62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#121118',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
  },
  submitButton: {
    borderRadius: 12,
    height: 48,
    backgroundColor: '#FF018F',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2C2242',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#9CA3AF',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#121118',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 13.5,
  },
  footerLink: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FF018F',
  },
});

