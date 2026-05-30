import React, { useRef, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Animated,
  Dimensions, ImageBackground, Image, ScrollView,
} from 'react-native';
import { useNavigation } from '../context/NavigationContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH  = width - 48;
const CARD_HEIGHT = CARD_WIDTH * 0.58;

const CARD_FRONT = require('../../assets/titanium_card_front.png');
const CARD_BACK  = require('../../assets/titanium_card_back.jpeg');

export default function TitaniumScreen() {
  const { user, refreshUser } = useNavigation();
  const titanium  = user?.titanium;

  const flipAnim  = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(-CARD_WIDTH)).current;

  // Refresh user on mount so card details are always up-to-date
  React.useEffect(() => { refreshUser(); }, []);

  // Start shimmer loop
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: CARD_WIDTH * 2,
        duration: 2400,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const frontRotation = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotation = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const flipCard = () => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 180,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setFlipped(v => !v);
  };

  // Format: 6 digits · 4 digits · 7 digits  e.g. "290815 2026 2000000"
  const formatCardDisplay = (raw) => {
    if (!raw) return '000000 0000 0000000';
    const digits = raw.replace(/\D/g, '');
    const p1 = digits.slice(0, 6);
    const p2 = digits.slice(6, 10);
    const p3 = digits.slice(10, 17);
    return [p1, p2, p3].filter(Boolean).join(' ');
  };
  const displayCardNumber = formatCardDisplay(titanium?.card_number);

  const displayName = titanium?.card_holder_name
    ? titanium.card_holder_name.toUpperCase()
    : 'MEMBER NAME';

  const displayExpiry = titanium?.expiry_date || 'MM/YY';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* Header glow */}
      <View style={styles.glowTop} />

      {/* Title */}
      <View style={styles.titleWrap}>
        <Text style={styles.crown}>♛</Text>
        <Text style={styles.title}>Titanium Member</Text>
        <Text style={styles.subtitle}>Exclusive Membership Card</Text>
      </View>

      {/* Card flip area */}
      <TouchableOpacity activeOpacity={0.95} onPress={flipCard} style={styles.cardTouchable}>

        {/* FRONT */}
        <Animated.View
          style={[
            styles.cardFace,
            { transform: [{ perspective: 1200 }, { rotateY: frontRotation }] },
            { opacity: flipped ? 0 : 1 },
          ]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <ImageBackground
            source={CARD_FRONT}
            style={styles.cardImage}
            imageStyle={styles.cardImageStyle}
            resizeMode="cover"
          >
            {/* Shimmer overlay */}
            <Animated.View
              style={[styles.shimmer, { transform: [{ translateX: shimmerAnim }] }]}
              pointerEvents="none"
            />

            {/* Card details overlay — right half only */}
            <View style={styles.cardOverlay}>
              {/* Card number */}
              <Text style={styles.cardNumberText} numberOfLines={1} adjustsFontSizeToFit>{displayCardNumber}</Text>
              {/* Name + Expiry row */}
              <View style={styles.cardBottom}>
                <View style={styles.cardHolderWrap}>
                  <Text style={styles.cardLabel}>CARD HOLDER</Text>
                  <Text style={styles.cardValue} numberOfLines={1}>{displayName}</Text>
                </View>
                <View style={styles.cardExpiryWrap}>
                  <Text style={styles.cardLabel}>EXPIRES</Text>
                  <Text style={styles.cardValue}>{displayExpiry}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* BACK */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            { transform: [{ perspective: 1200 }, { rotateY: backRotation }] },
            { opacity: flipped ? 1 : 0 },
          ]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          <ImageBackground
            source={CARD_BACK}
            style={styles.cardImage}
            imageStyle={styles.cardImageStyle}
            resizeMode="cover"
          >
            <Animated.View
              style={[styles.shimmer, { transform: [{ translateX: shimmerAnim }] }]}
              pointerEvents="none"
            />
          </ImageBackground>
        </Animated.View>

      </TouchableOpacity>

      {/* Tap hint */}
      <Text style={styles.tapHint}>
        {flipped ? '↩ Tap to see front' : '↩ Tap to flip card'}
      </Text>

      {/* Perks section */}
      <View style={styles.perksWrap}>
        <Text style={styles.perksTitle}>✦ Titanium Privileges</Text>
        {PERKS.map((perk, i) => (
          <View key={i} style={styles.perkRow}>
            <Text style={styles.perkIcon}>{perk.icon}</Text>
            <View>
              <Text style={styles.perkLabel}>{perk.label}</Text>
              <Text style={styles.perkDesc}>{perk.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Bottom glow */}
      <View style={styles.glowBottom} />
    </ScrollView>
  );
}

const PERKS = [
  { icon: '🥇', label: 'Priority Support',     desc: 'Dedicated support line, faster response' },
  { icon: '🎁', label: 'Exclusive Offers',      desc: 'Members-only deals and discounts' },
  { icon: '✦',  label: 'Premium Badge',         desc: 'Titanium badge on your business profile' },
  { icon: '🔓', label: 'Unlimited Access',      desc: 'Full access to all Tapify features' },
];

const GOLD = '#c1a046';
const GOLD_LIGHT = '#e8c96a';

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },

  glowTop: {
    position: 'absolute',
    top: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: GOLD,
    opacity: 0.07,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: GOLD,
    opacity: 0.06,
  },

  titleWrap: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 28,
  },
  crown: {
    fontSize: 28,
    color: GOLD,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: GOLD_LIGHT,
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  cardTouchable: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardFace: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backfaceVisibility: 'hidden',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 18,
  },
  cardBack: {
    top: 0,
    left: 0,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  cardImageStyle: {
    borderRadius: 18,
  },

  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-20deg' }],
  },

  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    // Slightly left of centre so expiry stays within card bounds
    left: '44%',
    right: 0,
    paddingRight: 18,
    paddingLeft: 6,
    paddingBottom: 22,
  },
  cardNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolderWrap: {
    flex: 1,
    marginRight: 8,
  },
  cardLabel: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardExpiryWrap: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },

  tapHint: {
    marginTop: 16,
    fontSize: 12,
    color: 'rgba(193,160,70,0.7)',
    letterSpacing: 0.5,
  },

  perksWrap: {
    marginTop: 32,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193,160,70,0.2)',
    padding: 20,
  },
  perksTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1,
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  perkIcon: {
    fontSize: 20,
    width: 36,
    marginTop: 1,
  },
  perkLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  perkDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
