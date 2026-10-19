import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export interface WelcomeScreenProps {
  onStartJourney: () => void;
  onNavigateToLogin: () => void;
}

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Měj své auto pod kontrolou',
    description:
      'Digitální garáž pro tvůj vůz. Eviduj tachometr, technické parametry a hlídej blížící se termíny STK i výměny oleje na jednom místě.',
    iconName: 'car-sport-outline',
  },
  {
    id: '2',
    title: 'Každá kapka i výdaj v merku',
    description:
      'Zapisuj tankování během vteřiny. Získej reálnou spotřebu, cenu za každý ujetý kilometr a přehledné grafy provozních nákladů.',
    iconName: 'water-outline',
  },
  {
    id: '3',
    title: 'Digitální servisní knížka',
    description:
      'Konec ztraceným fakturám a papírování. Eviduj opravy, rozpad práce i materiálu a chraň se před nákupem špatných dílů díky Blacklistu.',
    iconName: 'construct-outline',
  },
  {
    id: '4',
    title: 'Živá telemetrie',
    description:
      'Propoj mobil přes Bluetooth s adaptérem ELM327. Sleduj reálné otáčky, teplotu chladicí kapaliny i okamžitou spotřebu paliva.',
    iconName: 'speedometer-outline',
  },
  {
    id: '5',
    title: 'Diagnostika chybových kódů',
    description:
      'Vyčti paměť závad řídicí jednotky (ECU) přímo v mobilu. Zjisti příčinu kontrolky Check Engine v češtině a vymaž chyby bez návštěvy servisu.',
    iconName: 'alert-circle-outline',
  },
  {
    id: '6',
    title: 'Chytré skenování faktur & AI díly',
    description:
      'Stačí vyfotit servisní fakturu nebo protokol STK a Gemini AI automaticky vytěží data. AI ti navíc doporučí kompatibilní díly přesně pro tvůj motor.',
    iconName: 'sparkles-outline',
  },
];

const AUTO_PLAY_DELAY = 4500;
const useNativeDriver = Platform.OS !== 'web';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartJourney,
  onNavigateToLogin,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const isAnimating = useRef(false);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Stop auto-play timer
  const stopAutoPlay = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  // Transition to specific slide index with animation
  const transitionTo = useCallback(
    (targetIndex: number, direction: 'next' | 'prev', currentOffset: number = 0) => {
      if (isAnimating.current || targetIndex === activeIndexRef.current) return;
      isAnimating.current = true;
      stopAutoPlay();

      const exitDistance = direction === 'next' ? -width * 0.35 : width * 0.35;
      const enterStart = direction === 'next' ? width * 0.35 : -width * 0.35;

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: currentOffset + exitDistance,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 160,
          useNativeDriver,
        }),
      ]).start(() => {
        setActiveIndex(targetIndex);
        slideAnim.setValue(enterStart);
        scaleAnim.setValue(0.94);

        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 9,
            tension: 75,
            useNativeDriver,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 9,
            tension: 75,
            useNativeDriver,
          }),
        ]).start(() => {
          isAnimating.current = false;
          startAutoPlay();
        });
      });
    },
    [fadeAnim, scaleAnim, slideAnim, stopAutoPlay, width]
  );

  const goToNext = useCallback(() => {
    const nextIndex = (activeIndexRef.current + 1) % SLIDES.length;
    transitionTo(nextIndex, 'next');
  }, [transitionTo]);

  const goToPrev = useCallback(() => {
    const prevIndex = (activeIndexRef.current - 1 + SLIDES.length) % SLIDES.length;
    transitionTo(prevIndex, 'prev');
  }, [transitionTo]);

  const startAutoPlay = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }
    autoPlayTimerRef.current = setInterval(() => {
      goToNext();
    }, AUTO_PLAY_DELAY);
  }, [goToNext]);

  const handleDotPress = (index: number) => {
    if (index === activeIndex || isAnimating.current) return;
    const direction = index > activeIndex ? 'next' : 'prev';
    transitionTo(index, direction);
  };

  useEffect(() => {
    startAutoPlay();
    return () => {
      stopAutoPlay();
    };
  }, [startAutoPlay, stopAutoPlay]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderGrant: () => {
        stopAutoPlay();
      },
      onPanResponderMove: (_, gestureState) => {
        slideAnim.setValue(gestureState.dx * 0.45);
        const dragProgress = Math.min(Math.abs(gestureState.dx) / (width * 0.8), 0.5);
        fadeAnim.setValue(1 - dragProgress);
      },
      onPanResponderRelease: (_, gestureState) => {
        const isSwipeLeft = gestureState.dx < -40 || gestureState.vx < -0.3;
        const isSwipeRight = gestureState.dx > 40 || gestureState.vx > 0.3;

        if (isSwipeLeft) {
          const nextIndex = (activeIndexRef.current + 1) % SLIDES.length;
          transitionTo(nextIndex, 'next', gestureState.dx * 0.45);
        } else if (isSwipeRight) {
          const prevIndex = (activeIndexRef.current - 1 + SLIDES.length) % SLIDES.length;
          transitionTo(prevIndex, 'prev', gestureState.dx * 0.45);
        } else {
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              friction: 8,
              tension: 70,
              useNativeDriver,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver,
            }),
          ]).start(() => {
            startAutoPlay();
          });
        }
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 70,
            useNativeDriver,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver,
          }),
        ]).start(() => {
          startAutoPlay();
        });
      },
    })
  ).current;

  const currentSlide = SLIDES[activeIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Ambient glowing backdrop blurs */}
      <View pointerEvents="none" style={[styles.ambientTopGlow, { backgroundColor: theme.ambientGlowPrimary }]} />
      <View pointerEvents="none" style={[styles.ambientBottomGlow, { backgroundColor: theme.ambientGlowSecondary }]} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          {/* Circular badge with CarLogix_Logo.png and neon glow */}
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/CarLogix_Logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandName, { color: theme.textPrimary }]}>CarLogix</Text>
        </View>

        <TouchableOpacity
          style={[styles.skipButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}
          onPress={onStartJourney}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Přeskočit</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable & Auto-Advancing Center Area */}
      <View style={styles.carouselContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.animatedSlideContent,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Clean Hero Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={currentSlide.iconName} size={80} color="#FF018F" />
          </View>

          {/* Clean Typography: Title & Description */}
          <View style={styles.textContainer}>
            <Text style={[styles.slideTitle, { color: theme.textPrimary }]}>
              {currentSlide.title}
            </Text>
            <Text style={[styles.slideDescription, { color: theme.textSecondary }]}>
              {currentSlide.description}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Pagination & Bottom Action Section */}
      <View
        style={[
          styles.bottomSection,
          {
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDotPress(index)}
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                activeOpacity={0.8}
                accessibilityLabel={`Přejít na snímek ${index + 1}`}
              >
                <View
                  style={[
                    styles.dot,
                    isActive
                      ? styles.dotActive
                      : [
                          styles.dotInactive,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.25)'
                              : 'rgba(0, 0, 0, 0.18)',
                          },
                        ],
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primary Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onStartJourney}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Začni svou jízdu</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
            style={styles.primaryButtonIcon}
          />
        </TouchableOpacity>

        {/* Secondary Button: Login */}
        <TouchableOpacity
          style={styles.loginLinkButton}
          onPress={onNavigateToLogin}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginPromptText, { color: theme.textSecondary }]}>
            Máš už účet?{' '}
            <Text style={styles.loginHighlightText}>Přihlásit se</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(42, 12, 98, 0.4)',
    opacity: 0.8,
  },
  ambientBottomGlow: {
    position: 'absolute',
    top: '35%',
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 1, 143, 0.15)',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(42, 12, 98, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 1, 143, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    padding: 2,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  animatedSlideContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 31,
    letterSpacing: -0.4,
    marginBottom: 12,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 15,
    lineHeight: 22.5,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 340,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FF018F',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  dotInactive: {
    width: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FF018F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  primaryButtonIcon: {
    marginLeft: 8,
  },
  loginLinkButton: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginHighlightText: {
    fontWeight: '800',
    color: '#FF018F',
  },
});
