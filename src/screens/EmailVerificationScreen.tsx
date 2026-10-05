import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
    simulateVerifyEmail,
    signOut,
    isDemoMode,
  } = useAuth();

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setFeedbackMessage(null);
    try {
      const verified = await checkEmailVerification();
      if (!verified) {
        setFeedbackMessage('E-mail zatím nebyl potvrzen. Zkontrolujte prosím svoji doručenou poštu (i složku Spam).');
      }
    } finally {
      setIsChecking(false);
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

  const handleSimulate = () => {
    simulateVerifyEmail();
    Alert.alert('Ověřeno', 'E-mail byl v rámci demonstrace úspěšně označen jako ověřený.');
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
            Podmínka školní směrnice: Před odemčením databáze a garáže je nutné potvrdit e-mailovou adresu.
          </Text>

          <View style={[styles.emailBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="mail" size={16} color={theme.accent} />
            <Text style={[styles.emailText, { color: theme.textPrimary }]}>{user?.email || 'Váš e-mail'}</Text>
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

          {/* Quick Demo Bypass for Project Defense */}
          <TouchableOpacity
            style={[styles.demoBypassButton, { backgroundColor: theme.success + '20', borderColor: theme.success }]}
            onPress={handleSimulate}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={18} color={theme.success} style={styles.buttonIcon} />
            <Text style={[styles.demoBypassText, { color: theme.success }]}>
              Simulovat potvrzení (Demo pro obhajobu)
            </Text>
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
    paddingTop: 40,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    marginTop: 18,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
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
  demoBypassButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  demoBypassText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
