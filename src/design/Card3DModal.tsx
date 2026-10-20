import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Line, Rect, Circle } from 'react-native-svg';
import { Box, X, RotateCw } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useToast } from '@/components/neo/Toast';
import { CreditCard, CardType } from '@/lib/types';
import { haptic, shade } from './tokens';

export interface Card3DModalProps {
  visible: boolean;
  card: CreditCard | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 44, 345);
const CARD_HEIGHT = Math.round(CARD_WIDTH / 1.586);

const EMPTY_CARD: CreditCard = {
  id: '',
  cardName: 'CREDIT CARD',
  cardNumber: '•••• •••• •••• ••••',
  cardType: 'VISA',
  nameOnCard: 'CARDHOLDER',
  expiry: 'MM/YY',
  cvv: '•••',
  color: '#1B5E20',
  createdAt: 0,
};

function getSentenceCaseSubtitle(type?: CardType | string): string {
  switch (type) {
    case 'RUPAY':
      return 'RuPay credit card';
    case 'MASTERCARD':
      return 'Mastercard credit card';
    case 'AMEX':
      return 'Amex credit card';
    case 'VISA':
      return 'Visa credit card';
    default:
      if (!type) return 'Credit card';
      return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() + ' credit card';
  }
}

export function Card3DModal({ visible, card, onClose }: Card3DModalProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [isFlipped, setIsFlipped] = useState(false);

  // Tilt animation shared values
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const flipAnim = useSharedValue(0); // 0 = front, 180 = back

  // Reset card state when opening/switching card
  useEffect(() => {
    if (visible) {
      setIsFlipped(false);
      tiltX.value = 0;
      tiltY.value = 0;
      flipAnim.value = 0;
    }
  }, [visible, card?.id]);

  // Pan gesture for finger tilt
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const offsetX = Math.max(-0.5, Math.min(0.5, (e.x - CARD_WIDTH / 2) / CARD_WIDTH));
      const offsetY = Math.max(-0.5, Math.min(0.5, (e.y - CARD_HEIGHT / 2) / CARD_HEIGHT));
      tiltY.value = offsetX * 24;
      tiltX.value = -offsetY * 20;
    })
    .onEnd(() => {
      tiltX.value = withSpring(0, { damping: 15, stiffness: 120 });
      tiltY.value = withSpring(0, { damping: 15, stiffness: 120 });
    });

  const frontStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1100 },
        { rotateX: `${tiltX.value}deg` },
        { rotateY: `${flipAnim.value + tiltY.value}deg` },
      ],
      backfaceVisibility: 'hidden',
      zIndex: flipAnim.value < 90 ? 1 : 0,
      opacity: flipAnim.value < 90 ? 1 : 0,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1100 },
        { rotateX: `${tiltX.value}deg` },
        { rotateY: `${flipAnim.value + tiltY.value + 180}deg` },
      ],
      backfaceVisibility: 'hidden',
      zIndex: flipAnim.value >= 90 ? 1 : 0,
      opacity: flipAnim.value >= 90 ? 1 : 0,
    };
  });

  const currentCard = card || EMPTY_CARD;
  const baseColor = currentCard.color || '#1B5E20';
  const cLight = shade(baseColor, 25);
  const cDark = shade(baseColor, -35);

  const rawNum = (currentCard.cardNumber || '').replace(/\s+/g, '');
  const last4 = rawNum.slice(-4) || '••••';
  // 4-digit groups separated by single space
  const formattedFullNumber = rawNum
    ? rawNum.replace(/(.{4})/g, '$1 ').trim()
    : `•••• •••• •••• ${last4}`;
  const cardHolderName = (currentCard.nameOnCard || 'CARDHOLDER').toUpperCase();
  const cvvValue = currentCard.cvv || '•••';
  const expiryValue = currentCard.expiry || 'MM/YY';

  const handleCopy = async (text: string, label: string) => {
    haptic('light');
    await Clipboard.setStringAsync(text);
    showToast(`${label} copied`);
  };

  const handleFlipCard = () => {
    haptic('light');
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    flipAnim.value = withTiming(nextFlipped ? 180 : 0, {
      duration: 550,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });
  };

  const renderNetworkSymbol = (type: CardType) => {
    switch (type) {
      case 'MASTERCARD':
        return (
          <Svg width={44} height={28} viewBox="0 0 44 28">
            <Circle cx={14} cy={14} r={14} fill="#EB001B" />
            <Circle cx={30} cy={14} r={14} fill="#F79E1B" fillOpacity={0.88} />
          </Svg>
        );
      case 'VISA':
        return <Text style={styles.networkTextItalic}>VISA</Text>;
      case 'RUPAY':
        return <Text style={styles.networkTextItalic}>RuPay</Text>;
      case 'AMEX':
        return <Text style={styles.networkTextItalic}>AMEX</Text>;
      default:
        return <Text style={styles.networkTextItalic}>{type}</Text>;
    }
  };

  return (
    <Modal
      visible={visible && !!card}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        {/* Backdrop 95% black + blur */}
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 5, 5, 0.94)' }]}
          onPress={() => {
            haptic('light');
            onClose();
          }}
        >
          {Platform.OS === 'ios' && (
            <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
          )}
        </Pressable>

        {/* Safe Area Container */}
        <View
          style={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, 16) + 6,
              paddingBottom: Math.max(insets.bottom, 16) + 20,
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            {/* Yellow Outline Badge: 3D CARD tag top-left */}
            <View style={styles.topTag}>
              <Box size={13} color="#E3FF46" strokeWidth={2.4} />
              <Text style={styles.topTagText}>3D CARD</Text>
            </View>

            {/* Circular Close Button */}
            <Pressable
              onPress={() => {
                haptic('light');
                onClose();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X size={18} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Card in Centre with Gesture Tilt & Tap to Flip */}
          <View style={styles.cardCenterWrapper}>
            <GestureDetector gesture={panGesture}>
              <Pressable onPress={handleFlipCard} style={styles.cardHitBox}>
                {/* FRONT FACE */}
                <Animated.View style={[styles.cardCommon, frontStyle]}>
                  <LinearGradient
                    colors={[cLight, cDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Diagonal hatched lines pattern overlay */}
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg width="100%" height="100%">
                      <Defs>
                        <Pattern
                          id="card3d_stripes"
                          width="6"
                          height="6"
                          patternTransform="rotate(-45)"
                          patternUnits="userSpaceOnUse"
                        >
                          <Line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="6"
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                            strokeOpacity="0.04"
                          />
                        </Pattern>
                      </Defs>
                      <Rect width="100%" height="100%" fill="url(#card3d_stripes)" />
                    </Svg>
                  </View>

                  {/* Soft Light Sheen */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.16)', 'transparent']}
                    locations={[0, 0.45]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />

                  <View style={styles.frontInner}>
                    {/* Top Section: Left Title + Subtitle and Right Brand */}
                    <View style={styles.frontTopRow}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text numberOfLines={1} style={styles.frontCardName}>
                          {currentCard.cardName || 'Card'}
                        </Text>
                        <Text style={styles.frontCardType}>
                          {getSentenceCaseSubtitle(currentCard.cardType)}
                        </Text>
                      </View>

                      {/* Brand Logo (e.g. RuPay, VISA, Mastercard) */}
                      <View style={styles.networkContainer}>
                        {renderNetworkSymbol(currentCard.cardType || 'RUPAY')}
                      </View>
                    </View>

                    {/* EMV Chip on the Left */}
                    <View style={styles.frontChip}>
                      <LinearGradient
                        colors={['#C4E242', '#86A71C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.chipBorder} />
                      <View style={styles.chipLineH} />
                      <View style={styles.chipLineV1} />
                      <View style={styles.chipLineV2} />
                      <View style={styles.chipCenter} />
                    </View>

                    {/* Middle: Full Card Number (Tap to copy) */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCopy(rawNum || formattedFullNumber, 'Card number');
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      style={styles.copyableRow}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        style={styles.frontNumber}
                      >
                        {formattedFullNumber}
                      </Text>
                    </Pressable>

                    {/* Bottom Row: Cardholder + Expiry (both tap to copy) */}
                    <View style={styles.frontBottomRow}>
                      {/* Cardholder */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCopy(cardHolderName, 'Cardholder name');
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.metaCap}>CARDHOLDER</Text>
                        <Text numberOfLines={1} style={styles.metaVal}>
                          {cardHolderName}
                        </Text>
                      </Pressable>

                      {/* Valid Thru / Expiry (Copyable) */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCopy(expiryValue, 'Expiry date');
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                        style={{ alignItems: 'flex-end' }}
                      >
                        <Text style={styles.metaCap}>VALID THRU</Text>
                        <Text style={styles.metaValRight}>
                          {expiryValue}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>

                {/* BACK FACE */}
                <Animated.View style={[styles.cardCommon, styles.backCard, backStyle]}>
                  <LinearGradient
                    colors={[cLight, cDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Diagonal hatched lines pattern overlay */}
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg width="100%" height="100%">
                      <Defs>
                        <Pattern
                          id="card3d_back_stripes"
                          width="6"
                          height="6"
                          patternTransform="rotate(-45)"
                          patternUnits="userSpaceOnUse"
                        >
                          <Line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="6"
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                            strokeOpacity="0.04"
                          />
                        </Pattern>
                      </Defs>
                      <Rect width="100%" height="100%" fill="url(#card3d_back_stripes)" />
                    </Svg>
                  </View>

                  <View style={styles.backInner}>
                    {/* Magnetic Stripe full width bleed */}
                    <View style={styles.magneticStrip} />

                    {/* Signature bar & CVV box */}
                    <View style={styles.sigAndCvvSection}>
                      <View style={styles.sigAndCvvRow}>
                        <View style={styles.signatureBar} />

                        {/* White CVV Box: padding 12x6, JetBrainsMono_700Bold 18 */}
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCopy(cvvValue, 'CVV');
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.cvvBox}
                        >
                          <Text style={styles.cvvText}>{cvvValue}</Text>
                        </Pressable>
                      </View>

                      {/* CVV · TAP TO COPY: Manrope_800ExtraBold 8, letterSpacing 1.6, uppercase, right aligned, 60% opacity */}
                      <Text style={styles.cvvCaption}>CVV · TAP TO COPY</Text>
                    </View>
                  </View>
                </Animated.View>
              </Pressable>
            </GestureDetector>
          </View>

          {/* Below Card: Flip Pill Button & Copy Hint */}
          <View style={styles.bottomControls}>
            <Pressable onPress={handleFlipCard} style={styles.flipPill}>
              <RotateCw size={14} color="#E3FF46" strokeWidth={2.4} />
              <Text style={styles.flipPillText}>
                {isFlipped ? 'Tap card to flip to front' : 'Tap card to flip & view CVV'}
              </Text>
            </Pressable>

            <Text style={styles.hintText}>
              Tap any detail (number, name, CVV) to copy
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E3FF46',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topTagText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: '#E3FF46',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHitBox: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  cardCommon: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.65,
    shadowRadius: 26,
    elevation: 22,
  },
  backCard: {
    backgroundColor: '#0D0D0D',
  },
  frontInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  frontTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  frontCardName: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 20,
    letterSpacing: 0,
    lineHeight: 24,
    color: '#F2F2F2',
  },
  frontCardType: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    letterSpacing: 0,
    color: 'rgba(242, 242, 242, 0.7)',
    marginTop: 2,
  },
  networkContainer: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  networkTextItalic: {
    fontFamily: 'Fraunces_900Black_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    letterSpacing: -0.3,
    color: '#F2F2F2',
  },
  frontChip: {
    width: 44,
    height: 32,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 2,
  },
  chipBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 4,
  },
  chipLineH: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  chipLineV1: {
    position: 'absolute',
    left: 13,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  chipLineV2: {
    position: 'absolute',
    right: 13,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  chipCenter: {
    position: 'absolute',
    left: 15,
    top: 8,
    width: 14,
    height: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.22)',
  },
  copyableRow: {
    paddingVertical: 2,
  },
  frontNumber: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 20,
    letterSpacing: 2.4,
    color: '#F2F2F2',
    fontVariant: ['tabular-nums'],
  },
  frontBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaCap: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(242, 242, 242, 0.6)',
    marginBottom: 3,
  },
  metaVal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    letterSpacing: 0,
    textTransform: 'uppercase',
    color: '#F2F2F2',
  },
  metaValRight: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    letterSpacing: 0,
    color: '#F2F2F2',
    textAlign: 'right',
  },
  backInner: {
    flex: 1,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  magneticStrip: {
    height: 42,
    backgroundColor: '#0A0D0B',
    marginHorizontal: -20,
  },
  sigAndCvvSection: {
    gap: 6,
  },
  sigAndCvvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signatureBar: {
    flex: 1,
    height: 36,
    backgroundColor: '#CAD2C5',
    borderRadius: 2,
  },
  cvvBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvvText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
    color: '#0D0D0D',
  },
  cvvCaption: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(242, 242, 242, 0.6)',
    alignSelf: 'flex-end',
  },
  bottomControls: {
    alignItems: 'center',
    gap: 12,
  },
  flipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  flipPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#E3FF46',
  },
  hintText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
    textAlign: 'center',
  },
});
