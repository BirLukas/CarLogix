import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onBackToWelcome?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin, onBackToWelcome }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { signUp, signInWithGoogle, isLoading } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasLower && hasUpper && hasDigit && hasSymbol;

  const handleRegister = async () => {
    setErrorMessage('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setErrorMessage('Vyplňte prosím všechna povinná pole.');
      return;
    }

    if (!isPasswordValid) {
      if (!hasMinLength) {
        setErrorMessage('Heslo musí mít alespoň 8 znaků.');
      } else if (!hasUpper) {
        setErrorMessage('Heslo musí obsahovat alespoň jedno velké písmeno (A-Z).');
      } else if (!hasLower) {
        setErrorMessage('Heslo musí obsahovat alespoň jedno malé písmeno (a-z).');
      } else if (!hasDigit) {
        setErrorMessage('Heslo musí obsahovat alespoň jednu číslici (0-9).');
      } else if (!hasSymbol) {
        setErrorMessage('Heslo musí obsahovat alespoň jeden symbol či speciální znak (např. !?@#*).');
      }
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Hesla se neshodují.');
      return;
    }

    const displayName = `${firstName.trim()} ${lastName.trim()}`;
    const res = await signUp(email.trim(), password, displayName);
    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleGoogleSignup = async () => {
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onBackToWelcome || onNavigateToLogin}
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

            <View style={styles.haloGlowContainer}>
              <View style={[styles.outerGlowCircle, { backgroundColor: isDark ? 'rgba(42, 12, 98, 0.8)' : 'rgba(255, 1, 143, 0.15)' }]} />
              <View style={styles.badgeRing}>
                <View style={styles.badgeInner}>
                  <Image
                    source={require('../CarLogix_Logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>Vytvořit účet</Text>
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
              Zaregistrujte se pro správu vozidla a telemetrii CarLogix
            </Text>
          </View>

          {/* Form Card */}
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
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: theme.danger + '18', borderColor: theme.danger }]}>
                <Ionicons name="alert-circle" size={20} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* First name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Jméno</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="např. Jan"
                  placeholderTextColor={theme.textSecondary}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>

            {/* Last name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Příjmení</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="např. Novák"
                  placeholderTextColor={theme.textSecondary}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>E-mailová adresa</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="např. jan.novak@email.cz"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Heslo (min. 8 znaků, A-Z, a-z, 0-9, symbol)</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Zadejte silné heslo"
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

              {/* Dynamic Password Policy Rules */}
              {password.length > 0 && (
                <View style={[styles.rulesCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View style={styles.rulesGrid}>
                    <View style={styles.ruleItem}>
                      <Ionicons
                        name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={hasMinLength ? theme.success : theme.textSecondary}
                      />
                      <Text style={[styles.ruleText, { color: hasMinLength ? theme.success : theme.textSecondary }]}>
                        Min. 8 znaků
                      </Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Ionicons
                        name={hasUpper ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={hasUpper ? theme.success : theme.textSecondary}
                      />
                      <Text style={[styles.ruleText, { color: hasUpper ? theme.success : theme.textSecondary }]}>
                        Velké písmeno (A-Z)
                      </Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Ionicons
                        name={hasLower ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={hasLower ? theme.success : theme.textSecondary}
                      />
                      <Text style={[styles.ruleText, { color: hasLower ? theme.success : theme.textSecondary }]}>
                        Malé písmeno (a-z)
                      </Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Ionicons
                        name={hasDigit ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={hasDigit ? theme.success : theme.textSecondary}
                      />
                      <Text style={[styles.ruleText, { color: hasDigit ? theme.success : theme.textSecondary }]}>
                        Číslice (0-9)
                      </Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Ionicons
                        name={hasSymbol ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={hasSymbol ? theme.success : theme.textSecondary}
                      />
                      <Text style={[styles.ruleText, { color: hasSymbol ? theme.success : theme.textSecondary }]}>
                        Symbol (!@#$...)
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Potvrzení hesla</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Zopakujte heslo"
                  placeholderTextColor={theme.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={10}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Requirement note */}
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
                Po odeslání registrace obdržíte potvrzovací e-mail pro aktivaci vašeho účtu.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Zaregistrovat se</Text>
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
              onPress={handleGoogleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color="#EA4335" style={styles.googleIcon} />
              <Text style={[styles.googleButtonText, { color: theme.textPrimary }]}>
                Zaregistrovat se přes Google
              </Text>
            </TouchableOpacity>
          </View>

          {/* Switch back to Login */}
          <View style={styles.footerSwitch}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Již máte vytvořený účet? </Text>
            <TouchableOpacity onPress={onNavigateToLogin} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Přihlaste se</Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  haloGlowContainer: {
    position: 'relative',
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  outerGlowCircle: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(42, 12, 98, 0.8)',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 8,
  },
  badgeRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    borderRadius: 33,
    backgroundColor: '#121118',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 5,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: 'rgba(24, 22, 34, 0.95)',
    padding: 20,
    shadowColor: '#2A0C62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
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
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
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
  rulesCard: {
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#121118',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  rulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  ruleText: {
    fontSize: 11,
    fontWeight: '600',
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

