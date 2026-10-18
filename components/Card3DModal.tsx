import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { Fonts } from '@/lib/fonts';
import { CardNetworkSymbol } from '@/components/CardNetworkSymbol';
import { formatCardNumber, getProminentCardGradient } from '@/lib/formatters';
import type { CreditCard } from '@/lib/types';

interface Card3DModalProps {
  visible: boolean;
  card: CreditCard | null;
  onClose: () => void;
  onEdit?: (cardId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_3D_WIDTH = Math.min(SCREEN_WIDTH - 44, 345);
const CARD_3D_HEIGHT = Math.round(CARD_3D_WIDTH / 1.586);

export function Card3DModal({ visible, card, onClose, onEdit }: Card3DModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const rotateAnim = useSharedValue(0);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = `${rotateAnim.value}deg`;
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: rotateValue },
        { rotateX: '8deg' },
      ],
      zIndex: rotateAnim.value < 90 ? 1 : 0,
      opacity: rotateAnim.value < 90 ? 1 : 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = `${rotateAnim.value + 180}deg`;
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: rotateValue },
        { rotateX: '8deg' },
      ],
      zIndex: rotateAnim.value >= 90 ? 1 : 0,
      opacity: rotateAnim.value >= 90 ? 1 : 0,
    };
  });

  if (!card) return null;

  const gradient = getProminentCardGradient(card.cardName, card.cardType);

  const toggleFlip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    rotateAnim.value = withSpring(nextFlipped ? 180 : 0, {
      damping: 14,
      stiffness: 85,
    });
  };

  const copyDetail = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2400);
  };

  const getNetworkLabel = () => {
    switch (card.cardType) {
      case 'RUPAY':
        return 'RuPay Credit Card';
      case 'MASTERCARD':
        return 'Mastercard Credit Card';
      case 'AMEX':
        return 'Amex Credit Card';
      case 'VISA':
      default:
        return 'VISA Credit Card';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {/* Top Floating Bar */}
        <View style={styles.topBar}>
          {copiedField ? (
            <View style={styles.toastPill}>
              <Icon name="checkmark-circle" size={14} color="#000000" />
              <Text style={styles.toastPillText}>{copiedField} copied</Text>
            </View>
          ) : (
            <View style={styles.brandBadge}>
              <Icon name="cube" size={13} color="#EDFF24" />
              <Text style={styles.brandBadgeText}>3D CARD</Text>
            </View>
          )}

          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Icon name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Center Stage: ONLY the 3D Flippable Card */}
        <View style={styles.centerContainer}>
          <Pressable style={styles.cardTouchArea} onPress={toggleFlip}>
            {/* FRONT OF CARD */}
            <Animated.View style={[styles.cardWrapper, frontAnimatedStyle]}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0.3 }}
                end={{ x: 1, y: 0.7 }}
                style={styles.cardFace}
              >
                {/* Specular Diagonal Highlight */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.03)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.85, y: 0.85 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />

                {/* Top Row: Card Issuer Name (Tap to Copy) & Network Logo */}
                <View style={styles.cardTopRow}>
                  <Pressable
                    onPress={() => copyDetail(card.cardName, 'Card name')}
                    style={({ pressed }) => [styles.namePressable, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.cardIssuerName} numberOfLines={1}>
                      {card.cardName}
                    </Text>
                    <Text style={styles.cardSubLabel}>{getNetworkLabel()}</Text>
                  </Pressable>
                  <CardNetworkSymbol type={card.cardType} size="md" />
                </View>

                {/* EMV Microchip & Contactless Wave */}
                <View style={styles.emvRow}>
                  <View style={styles.emvChip}>
                    <View style={styles.emvLineH} />
                    <View style={styles.emvLineV} />
                    <View style={styles.emvCore} />
                  </View>
                  <Icon
                    name="wifi"
                    size={18}
                    color="rgba(255,255,255,0.75)"
                    style={{ transform: [{ rotate: '90deg' }] }}
                  />
                </View>

                {/* Card Number Row (Tap to Copy Full Unmasked Number) */}
                <Pressable
                  onPress={() => copyDetail(card.cardNumber, 'Card number')}
                  style={({ pressed }) => [styles.numberPressable, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.fullCardNumber}>
                    {formatCardNumber(card.cardNumber, card.cardType)}
                  </Text>
                </Pressable>

                {/* Bottom Row: Cardholder (Tap to Copy) & Valid Thru (Tap to Copy) */}
                <View style={styles.cardBottomRow}>
                  <Pressable
                    onPress={() => copyDetail(card.nameOnCard, 'Cardholder name')}
                    style={({ pressed }) => [styles.cardholderPressable, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.cardInfoLabel}>CARDHOLDER</Text>
                    <Text style={styles.cardInfoValue} numberOfLines={1}>
                      {(card.nameOnCard || 'CARD MEMBER').toUpperCase()}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => copyDetail(card.expiry, 'Expiry')}
                    style={({ pressed }) => [styles.expiryPressable, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.cardInfoLabel}>VALID THRU</Text>
                    <Text style={styles.cardInfoValue}>{card.expiry || 'MM/YY'}</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* BACK OF CARD (Rendered on 180° Flip) */}
            <Animated.View style={[styles.cardWrapper, styles.backWrapper, backAnimatedStyle]}>
              <LinearGradient
                colors={gradient}
                start={{ x: 1, y: 0.3 }}
                end={{ x: 0, y: 0.7 }}
                style={[styles.cardFace, styles.cardBackFace]}
              >
                {/* Black Magnetic Stripe */}
                <View style={styles.magneticStripe} />

                {/* Signature Bar & CVV (Tap to Copy CVV) */}
                <View style={styles.signatureRow}>
                  <View style={styles.signaturePanel}>
                    <Text style={styles.signatureWatermark}>
                      AUTHORIZED SIGNATURE • NOT VALID UNLESS SIGNED
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => copyDetail(card.cvv, 'CVV')}
                    style={({ pressed }) => [styles.cvvBox, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.cvvCode}>{card.cvv || '•••'}</Text>
                  </Pressable>
                </View>

                {/* Security Hologram & Bank Notice */}
                <View style={styles.backBottomRow}>
                  <View style={styles.hologramBadge}>
                    <View style={styles.holoCircle1} />
                    <View style={styles.holoCircle2} />
                  </View>
                  <Text style={styles.backLegalText}>
                    This card is property of the issuing bank. Tap CVV to copy. Return if found.
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </Pressable>

          {/* Minimal 3D Interactive Instruction Pill */}
          <Pressable style={styles.instructionPill} onPress={toggleFlip}>
            <Icon name="sync-outline" size={13} color="#EDFF24" />
            <Text style={styles.instructionPillText}>
              {isFlipped ? 'Tap card to flip front' : 'Tap card to flip back & view CVV'}
            </Text>
          </Pressable>

          <Text style={styles.subHintText}>Tap any detail (number, name, CVV) to copy</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 999,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(237, 255, 36, 0.12)',
    borderWidth: 1,
    borderColor: '#EDFF24',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  brandBadgeText: {
    color: '#EDFF24',
    fontSize: 11,
    fontFamily: Fonts.extraBold,
    letterSpacing: 1.4,
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDFF24',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 8,
  },
  toastPillText: {
    color: '#000000',
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: '#33333E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cardTouchArea: {
    width: CARD_3D_WIDTH,
    height: CARD_3D_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: CARD_3D_WIDTH,
    height: CARD_3D_HEIGHT,
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  backWrapper: {
    position: 'absolute',
  },
  cardFace: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.75,
    shadowRadius: 26,
    elevation: 16,
  },
  cardBackFace: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'flex-start',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  namePressable: {
    flex: 1,
    marginRight: 10,
  },
  cardIssuerName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
  cardSubLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  emvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  emvChip: {
    width: 38,
    height: 28,
    backgroundColor: '#E5B869',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C29849',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvLineH: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#A87C30',
  },
  emvLineV: {
    position: 'absolute',
    left: '48%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#A87C30',
  },
  emvCore: {
    width: 14,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#A87C30',
    backgroundColor: 'rgba(255, 235, 180, 0.35)',
  },
  numberPressable: {
    marginVertical: 4,
    paddingVertical: 2,
  },
  fullCardNumber: {
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: Fonts.bold,
    letterSpacing: 2.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardholderPressable: {
    flex: 1.2,
    marginRight: 10,
  },
  expiryPressable: {
    alignItems: 'flex-end',
  },
  cardInfoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 7.5,
    fontFamily: Fonts.semibold,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  cardInfoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  magneticStripe: {
    width: '100%',
    height: 40,
    backgroundColor: '#0A0A0A',
    marginTop: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1F1F1F',
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 8,
  },
  signaturePanel: {
    flex: 1,
    height: 34,
    backgroundColor: '#EBEBEB',
    borderRadius: 2,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  signatureWatermark: {
    fontSize: 6.5,
    fontFamily: Fonts.regular,
    color: '#888888',
    letterSpacing: 0.4,
  },
  cvvBox: {
    width: 56,
    height: 34,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  cvvCode: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#000000',
    fontStyle: 'italic',
    letterSpacing: 1.5,
  },
  backBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 'auto',
    marginBottom: 16,
    gap: 12,
  },
  hologramBadge: {
    width: 36,
    height: 26,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  holoCircle1: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 220, 100, 0.35)',
    left: 2,
  },
  holoCircle2: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(100, 220, 255, 0.35)',
    right: 2,
  },
  backLegalText: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 11,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#303038',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 26,
  },
  instructionPillText: {
    color: '#EDFF24',
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  subHintText: {
    color: '#777777',
    fontSize: 10.5,
    fontFamily: Fonts.regular,
    marginTop: 8,
  },
});
