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
  badge: string;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  metric1Label: string;
  metric1Val: string;
  metric2Label: string;
  metric2Val: string;
  centerVal: string;
  centerUnit: string;
  centerSub: string;
  badge1Label: string;
  badge1Val: string;
  badge1Status: string;
  badge1Icon: keyof typeof Ionicons.glyphMap;
  badge2Label: string;
  badge2Val: string;
  badge2Status: string;
  badge2Icon: keyof typeof Ionicons.glyphMap;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    badge: 'GARÁŽ & PŘEHLED',
    title: 'Měj své auto pod kontrolou',
    description:
      'Digitální garáž pro tvůj vůz. Eviduj tachometr, technické parametry a hlídej blížící se termíny STK i výměny oleje na jednom místě.',
    iconName: 'speedometer-outline',
    metric1Label: 'OIL TEMP',
    metric1Val: '95°C',
    metric2Label: 'TYRE PRESS',
    metric2Val: '62 PSI',
    centerVal: '85',
    centerUnit: 'MPH / KMH',
    centerSub: '245 kW • GEAR: D',
    badge1Label: 'BATTERY STATUS',
    badge1Val: '88%',
    badge1Status: 'NORMAL',
    badge1Icon: 'flash',
    badge2Label: 'TYRE & LOCK',
    badge2Val: 'OK',
    badge2Status: 'SECURED',
    badge2Icon: 'lock-closed',
  },
  {
    id: '2',
    badge: 'SPOTŘEBA & VÝDAJE',
    title: 'Každá kapka i výdaj v merku',
    description:
      'Zapisuj tankování během vteřiny. Získej reálnou spotřebu, cenu za každý ujetý kilometr a přehledné grafy provozních nákladů.',
    iconName: 'water-outline',
    metric1Label: 'PRŮMĚR',
    metric1Val: '5.8 l/100',
    metric2Label: 'NÁDRŽ',
    metric2Val: 'PLNÁ',
    centerVal: '2.45',
    centerUnit: 'KČ / KM',
    centerSub: 'EFEKTIVITA JÍZDY: A+',
    badge1Label: 'POSLEDNÍ ČERPÁNÍ',
    badge1Val: '460 Kč',
    badge1Status: '10.0 L',
    badge1Icon: 'water',
    badge2Label: 'DOJEZD NÁDRŽE',
    badge2Val: '780 km',
    badge2Status: 'OPTIMAL',
    badge2Icon: 'navigate',
  },
  {
    id: '3',
    badge: 'DIGITÁLNÍ SERVIS',
    title: 'Servisní knížka bez papírování',
    description:
      'Měj historii oprav a účtenky bezpečně uložené v telefonu. Konec ztraceným fakturám a vyšší prodejní hodnota tvého vozu.',
    iconName: 'construct-outline',
    metric1Label: 'STK TERMÍN',
    metric1Val: '10/2027',
    metric2Label: 'DIAGNOSTIKA',
    metric2Val: '0 CHYB',
    centerVal: '100 %',
    centerUnit: 'STAV VOZU',
    centerSub: 'OBD-II • BLE PŘIPOJENO',
    badge1Label: 'VÝMĚNA OLEJE',
    badge1Val: 'za 4 500 km',
    badge1Status: '5W-30',
    badge1Icon: 'construct',
    badge2Label: 'SERVISNÍ REŽIM',
    badge2Val: 'RBAC',
    badge2Status: 'OVĚŘENO',
    badge2Icon: 'shield-checkmark',
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
      <View pointerEvents="none" style={styles.ambientTopGlow} />
      <View pointerEvents="none" style={styles.ambientBottomGlow} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          {/* Circular badge with CarLogix_Logo.png and neon glow */}
          <View style={styles.logoBadge}>
            <Image
              source={require('../CarLogix_Logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandName, { color: theme.textPrimary }]}>CarLogix</Text>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
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
            styles.animatedCardWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* High-fidelity Neon Cockpit Telemetry HUD Card */}
          <View style={styles.hudCardGlowBorder}>
            <View style={styles.hudCardInner}>
              {/* Top status chips */}
              <View style={styles.hudTopBar}>
                <View style={styles.hudLiveChip}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.hudLiveText}>TELEMETRY LIVE</Text>
                </View>
                <View style={styles.hudMetricsRight}>
                  <View style={styles.hudMiniBadgePink}>
                    <Text style={styles.hudMiniBadgeTextPink}>{currentSlide.metric1Val} {currentSlide.metric1Label}</Text>
                  </View>
                  <View style={styles.hudMiniBadgeMuted}>
                    <Text style={styles.hudMiniBadgeTextMuted}>{currentSlide.metric2Val}</Text>
                  </View>
                </View>
              </View>

              {/* Central Speedometer Readout */}
              <View style={styles.gaugeContainer}>
                {/* Gauge Decorative Arc Graphic */}
                <View style={styles.gaugeArcWrapper}>
                  <View style={styles.gaugeTrackArc} />
                  <View style={styles.gaugeActiveArc} />
                  <View style={styles.gaugeInnerGlow} />
                </View>

                {/* Central Digital Readout */}
                <View style={styles.gaugeReadout}>
                  <Text style={styles.gaugeBigNumber}>{currentSlide.centerVal}</Text>
                  <Text style={styles.gaugeUnitText}>{currentSlide.centerUnit}</Text>
                  <View style={styles.gaugeSubBadge}>
                    <Text style={styles.gaugeSubText}>{currentSlide.centerSub}</Text>
                  </View>
                </View>
              </View>

              {/* Lower Instrument Cards (2 cols) */}
              <View style={styles.instrumentGrid}>
                {/* Card 1 */}
                <View style={styles.instrumentBox}>
                  <View style={styles.instrumentMeta}>
                    <Text style={styles.instrumentLabel}>{currentSlide.badge1Label}</Text>
                    <View style={styles.instrumentValRow}>
                      <Text style={styles.instrumentValPink}>{currentSlide.badge1Val}</Text>
                      <Text style={styles.instrumentValStatus}>{currentSlide.badge1Status}</Text>
                    </View>
                  </View>
                  <Ionicons name={currentSlide.badge1Icon} size={18} color="#FF018F" />
                </View>

                {/* Card 2 */}
                <View style={styles.instrumentBox}>
                  <View style={styles.instrumentMeta}>
                    <Text style={styles.instrumentLabel}>{currentSlide.badge2Label}</Text>
                    <View style={styles.instrumentValRow}>
                      <Text style={styles.instrumentValGreen}>{currentSlide.badge2Val}</Text>
                      <Text style={styles.instrumentValSub}>{currentSlide.badge2Status}</Text>
                    </View>
                  </View>
                  <Ionicons name={currentSlide.badge2Icon} size={18} color="#9CA3AF" />
                </View>
              </View>

              {/* Floating Pill Badge: "GARÁŽ & PŘEHLED" */}
              <View style={styles.floatingBadgeRow}>
                <View style={styles.floatingBadge}>
                  <Ionicons name={currentSlide.iconName} size={14} color="#FF018F" />
                  <Text style={styles.floatingBadgeText}>{currentSlide.badge}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Intro Text Content */}
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
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                activeOpacity={0.8}
                accessibilityLabel={`Přejít na snímek ${index + 1}`}
              >
                <View
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
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
    paddingHorizontal: 20,
    width: '100%',
  },
  animatedCardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  hudCardGlowBorder: {
    width: '100%',
    borderRadius: 26,
    padding: 1.5,
    backgroundColor: '#2A0C62',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 1, 143, 0.5)',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 16,
  },
  hudCardInner: {
    backgroundColor: '#121118',
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
  },
  hudTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
    marginBottom: 8,
  },
  hudLiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF018F',
  },
  hudLiveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hudMetricsRight: {
    flexDirection: 'row',
    gap: 6,
  },
  hudMiniBadgePink: {
    backgroundColor: 'rgba(255, 1, 143, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hudMiniBadgeTextPink: {
    color: '#FF018F',
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hudMiniBadgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hudMiniBadgeTextMuted: {
    color: '#D1D5DB',
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 125,
    marginVertical: 4,
    position: 'relative',
  },
  gaugeArcWrapper: {
    position: 'absolute',
    width: 170,
    height: 100,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  gaugeTrackArc: {
    position: 'absolute',
    top: 4,
    width: 160,
    height: 90,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    borderWidth: 9,
    borderBottomWidth: 0,
    borderColor: '#22222E',
  },
  gaugeActiveArc: {
    position: 'absolute',
    top: 4,
    width: 160,
    height: 90,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    borderWidth: 9,
    borderBottomWidth: 0,
    borderColor: '#FF018F',
    borderRightColor: '#2A0C62',
    transform: [{ rotate: '-15deg' }],
  },
  gaugeInnerGlow: {
    position: 'absolute',
    top: 15,
    width: 110,
    height: 60,
    backgroundColor: 'rgba(255, 1, 143, 0.08)',
    borderRadius: 40,
  },
  gaugeReadout: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  gaugeBigNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  gaugeUnitText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#FF018F',
    marginTop: -4,
  },
  gaugeSubBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gaugeSubText: {
    fontSize: 9.5,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  instrumentGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  instrumentBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instrumentMeta: {
    flex: 1,
  },
  instrumentLabel: {
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  instrumentValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  instrumentValPink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF018F',
  },
  instrumentValStatus: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#34D399',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  instrumentValGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },
  instrumentValSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  floatingBadgeRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  floatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(42, 12, 98, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 1, 143, 0.4)',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#FF018F',
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 6,
    minHeight: 88,
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 12,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#FF018F',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  dotInactive: {
    width: 8,
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
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
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


