import React, { useState } from 'react';
import {
  ActivityIndicator,
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
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { signUp, signInWithGoogle, isLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    setErrorMessage('');
    if (!displayName.trim() || !email.trim() || !password) {
      setErrorMessage('Vyplňte prosím všechna povinná pole.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Heslo musí mít alespoň 6 znaků.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Hesla se neshodují.');
      return;
    }

    const res = await signUp(email.trim(), password, displayName.trim());
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onNavigateToLogin} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>Vytvořit účet</Text>
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
              Zaregistrujte se pro správu vozidla a telemetrii CarLogix
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: theme.danger + '20', borderColor: theme.danger }]}>
                <Ionicons name="alert-circle" size={18} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Display name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Jméno a příjmení</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="např. Jan Novák"
                  placeholderTextColor={theme.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
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
              <Text style={[styles.label, { color: theme.textSecondary }]}>Heslo (min. 6 znaků)</Text>
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
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Requirement note from PRD */}
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
                Při registraci přes e-mail je vyžadováno potvrzení odkazu před odemčením databáze.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.accent }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
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
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>nebo</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={handleGoogleSignup}
              disabled={isLoading}
              activeOpacity={0.8}
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
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={[styles.footerLink, { color: theme.accent }]}>Přihlaste se</Text>
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
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
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
