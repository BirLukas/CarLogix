import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
  image: any;
  iconName: keyof typeof Ionicons.glyphMap;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    badge: 'PŘEHLED & GARÁŽ',
    title: 'Měj své auto pod absolutní kontrolou',
    description:
      'CarLogix ti přináší kompletní digitální zázemí pro tvůj vůz. Eviduj technické parametry, stav tachometru a získej včasná upozornění na blížící se STK, výměnu oleje či konec dálniční známky – vše přehledně na jednom místě.',
    image: require('../../assets/intro/slide_dashboard.jpg'),
    iconName: 'speedometer-outline',
  },
  {
    id: '2',
    badge: 'SPOTŘEBA & NÁKLADY',
    title: 'Každá kapka paliva a výdaj pod dohledem',
    description:
      'Zaznamenávej tankování během několika vteřin. Aplikace ti automaticky spočítá reálnou průměrnou spotřebu na 100 km, cenu za každý ujetý kilometr a v grafech zobrazí dlouhodobý vývoj tvých provozních výdajů.',
    image: require('../../assets/intro/slide_refuel.jpg'),
    iconName: 'water-outline',
  },
  {
    id: '3',
    badge: 'DIGITÁLNÍ SERVIS',
    title: 'Servisní knížka nové generace bez papírů',
    description:
      'Konec ztraceným fakturám a nepřehledným papírům. Zaznamenávej veškeré opravy, nahrávej účtenky a buduj si nezpochybnitelnou servisní historii, která ti ušetří peníze a zhodnotí tvůj vůz při prodeji. Sdílej profil auta i s mechanikem.',
    image: require('../../assets/intro/slide_service.jpg'),
    iconName: 'construct-outline',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartJourney,
  onNavigateToLogin,
}) => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const isDark = colorScheme === 'dark';
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Responsive image dimensions that adapt to device size
  const imageContainerHeight = Math.min(width * 0.72, height * 0.35);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index >= 0 && index < SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleNextOrFinish = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    } else {
      onStartJourney();
    }
  };

  const scrollToSlide = (index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const renderSlideItem = ({ item }: { item: OnboardingSlide }) => {
    return (
      <View style={[styles.slideItem, { width }]}>
        {/* Illustration Card */}
        <View
          style={[
            styles.imageWrapper,
            {
              height: imageContainerHeight,
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: theme.border,
            },
          ]}
        >
          <Image
            source={item.image}
            style={styles.slideImage}
            resizeMode="cover"
          />

          {/* Floating Category Pill */}
          <View
            style={[
              styles.floatingBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.88)'
                  : 'rgba(255, 255, 255, 0.94)',
                borderColor: theme.accent + '40',
              },
            ]}
          >
            <Ionicons name={item.iconName} size={14} color={theme.accent} />
            <Text style={[styles.badgeText, { color: theme.accent }]}>
              {item.badge}
            </Text>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={[styles.slideTitle, { color: theme.textPrimary }]}>
            {item.title}
          </Text>
          <Text style={[styles.slideDescription, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.logoBadge, { backgroundColor: theme.accent }]}>
            <Ionicons name="speedometer" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandName, { color: theme.textPrimary }]}>CarLogix</Text>
        </View>

        {activeIndex < SLIDES.length - 1 ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onStartJourney}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>Přeskočit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      {/* Swipeable Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderSlideItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.flatListContent}
        />
      </View>

      {/* Pagination Dots */}
      <View style={styles.paginationRow}>
        {SLIDES.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToSlide(index)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.dot,
                  isActive
                    ? [styles.dotActive, { backgroundColor: theme.accent }]
                    : [
                        styles.dotInactive,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'rgba(0, 0, 0, 0.15)',
                        },
                      ],
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom Actions Section */}
      <View
        style={[
          styles.actionSection,
          {
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Primary Button: Start Your Journey (Začni svou jízdu) */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          onPress={onStartJourney}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Začni svou jízdu</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.primaryButtonIcon} />
        </TouchableOpacity>

        {/* Secondary: Have account? Login (Máš už účet? Přihlásit se) */}
        <TouchableOpacity
          style={styles.loginLinkButton}
          onPress={onNavigateToLogin}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginPromptText, { color: theme.textSecondary }]}>
            Máš už účet?{' '}
            <Text style={[styles.loginHighlightText, { color: theme.accent }]}>
              Přihlásit se
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipPlaceholder: {
    width: 60,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  flatListContent: {
    alignItems: 'center',
  },
  slideItem: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  imageWrapper: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  floatingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  textContainer: {
    paddingHorizontal: 4,
  },
  slideTitle: {
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  slideDescription: {
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '400',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 26,
  },
  dotInactive: {
    width: 8,
  },
  actionSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryButtonIcon: {
    marginLeft: 8,
  },
  loginLinkButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginHighlightText: {
    fontWeight: '700',
  },
});
