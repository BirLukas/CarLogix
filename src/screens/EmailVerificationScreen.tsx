import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
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

export const EmailVerificationScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const {
    user,
    checkEmailVerification,
    resendVerificationEmail,
    signOut,
    signIn,
  } = useAuth();

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Manual password completion state
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auto-check verification status when returning to app from email client / browser
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        try {
          await checkEmailVerification();
        } catch {
          // Silent on automatic resume check
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkEmailVerification]);

  const handleCheck = async () => {
    setIsChecking(true);
    setFeedbackMessage(null);
    try {
      const verified = await checkEmailVerification();
      if (!verified) {
        setFeedbackMessage(
          'E-mail zatím nebyl potvrzen, nebo server ještě nezaregistroval změnu. Pokud jste již odkaz v e-mailu otevřeli, můžete níže zadat heslo a ihned vstoupit.'
        );
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleManualLogin = async () => {
    if (!password) {
      setFeedbackMessage('Zadejte prosím heslo k účtu.');
      return;
    }
    setIsLoggingIn(true);
    setFeedbackMessage(null);
    try {
      const res = await signIn(user?.email || '', password);
      if (res.error) {
        setFeedbackMessage(res.error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setFeedbackMessage(null);
    try {
      const res = await resendVerificationEmail();
      if (res.error) {
        Alert.alert('Chyba', res.error);
      } else {
        setFeedbackMessage('Ověřovací e-mail byl znovu úspěšně odeslán.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Verification Icon Box */}
        <View style={styles.centerSection}>
          <View style={[styles.iconRing, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
            <Ionicons name="mail-unread" size={48} color={theme.warning} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>Ověření e-mailu</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Pro aktivaci účtu a přístup k vašim vozidlům prosím potvrďte svou e-mailovou adresu kliknutím na odkaz v e-mailu.
          </Text>

          <View style={[styles.emailBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="mail" size={16} color={theme.accent} />
            <Text style={[styles.emailText, { color: theme.textPrimary }]}>{user?.email || 'Váš e-mail'}</Text>
          </View>
        </View>

        {/* Informative Hint about White Screen in Browser */}
        <View style={[styles.infoBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.accent} style={styles.infoBannerIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: theme.textPrimary }]}>
              Bílá stránka v prohlížeči po potvrzení?
            </Text>
            <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
              Po kliknutí na odkaz v e-mailu Supabase adresu ověří a v prohlížeči se může ukázat prázdná stránka. To je v pořádku! Stačí se vrátit sem a klepnout na „Zkontrolovat stav ověření“.
            </Text>
          </View>
        </View>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <View style={[styles.feedbackBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="information-circle" size={20} color={theme.accent} />
            <Text style={[styles.feedbackText, { color: theme.textPrimary }]}>{feedbackMessage}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={handleCheck}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Zkontrolovat stav ověření</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quick Manual Login without full sign-out */}
          <View style={[styles.manualLoginCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.manualLoginHeader}
              onPress={() => setShowManualLogin(!showManualLogin)}
              activeOpacity={0.7}
            >
              <View style={styles.manualLoginHeaderLeft}>
                <Ionicons name="key-outline" size={18} color={theme.accent} />
                <Text style={[styles.manualLoginTitle, { color: theme.textPrimary }]}>
                  Máte odkaz potvrzený? Dokončit heslem
                </Text>
              </View>
              <Ionicons
                name={showManualLogin ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {showManualLogin && (
              <View style={styles.manualLoginContent}>
                <Text style={[styles.manualLoginDesc, { color: theme.textSecondary }]}>
                  Pokud jste v e-mailu již klikli na odkaz, zadejte heslo a aplikace se ihned odemkne:
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
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
                      size={18}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.manualLoginBtn, { backgroundColor: theme.accent }]}
                  onPress={handleManualLogin}
                  disabled={isLoggingIn}
                  activeOpacity={0.8}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.manualLoginBtnText}>Přihlásit se a odemknout</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handleResend}
            disabled={isResending}
            activeOpacity={0.8}
          >
            {isResending ? (
              <ActivityIndicator color={theme.textPrimary} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color={theme.textPrimary} style={styles.buttonIcon} />
                <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>
                  Znovu odeslat ověřovací e-mail
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Sign Out option */}
          <TouchableOpacity style={styles.signOutButton} onPress={signOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={theme.danger} style={styles.buttonIcon} />
            <Text style={[styles.signOutText, { color: theme.danger }]}>Odhlásit se a zkusit jiný účet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 14,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerIcon: {
    marginTop: 2,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  actionsSection: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  manualLoginCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  manualLoginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualLoginHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  manualLoginTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  manualLoginContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cccccc33',
  },
  manualLoginDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  manualLoginBtn: {
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
