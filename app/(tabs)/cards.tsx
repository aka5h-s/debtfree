import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ScrollView, Pressable, TextInput, Alert, Platform, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '@/components/Icon';
import Animated, { useAnimatedStyle, useSharedValue, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { CreditCardVisual } from '@/components/CreditCardVisual';
import { CardNetworkSymbol } from '@/components/CardNetworkSymbol';
import { Fonts } from '@/lib/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

function AnimatedCard({ card, index, scrollX, totalCards, onCopy, onEdit, onDelete }: {
  card: any;
  index: number;
  scrollX: SharedValue<number>;
  totalCards: number;
  onCopy: (label: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ width: CARD_WIDTH }, animatedStyle]}>
      <CreditCardVisual card={card} onCopy={onCopy} onEdit={onEdit} onDelete={onDelete} />
    </Animated.View>
  );
}

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const { cards, removeCard } = useData();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [showCvv, setShowCvv] = useState(false);
  const scrollX = useSharedValue(0);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const filteredCards = cards.filter(c => {
    const q = search.toLowerCase();
    return c.cardName.toLowerCase().includes(q) ||
      c.cardNumber.includes(q) ||
      c.nameOnCard.toLowerCase().includes(q) ||
      c.cardType.toLowerCase().includes(q);
  });

  const activeCard = filteredCards[activeIndex] || filteredCards[0];

  const handleCopy = (label: string) => {
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2500);
  };

  const copyToClipboard = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    handleCopy(label);
  };

  const handleDelete = (cardId: string, cardName: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Remove "${cardName}"?`)) {
        removeCard(cardId);
        setActiveIndex(0);
      }
    } else {
      Alert.alert('Remove Card', `Remove "${cardName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { removeCard(cardId); setActiveIndex(0); } },
      ]);
    }
  };

  const handleEdit = (cardId: string) => {
    router.push({ pathname: '/edit-card', params: { cardId } });
  };

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = e.nativeEvent.contentOffset.x;
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (idx !== activeIndex && idx >= 0 && idx < filteredCards.length) {
      setActiveIndex(idx);
      setShowCvv(false);
    }
  }, [activeIndex, filteredCards.length]);

  const renderCard = useCallback(({ item, index }: { item: any; index: number }) => (
    <AnimatedCard
      card={item}
      index={index}
      scrollX={scrollX}
      totalCards={filteredCards.length}
      onCopy={handleCopy}
      onEdit={() => handleEdit(item.id)}
      onDelete={() => handleDelete(item.id, item.cardName)}
    />
  ), [filteredCards.length]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>My Cards</Text>
        <Text style={styles.cardCount}>{cards.length}</Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cards..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Icon name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {copiedLabel && (
        <View style={styles.copiedToast}>
          <Icon name="checkmark-circle" size={16} color="#000" />
          <Text style={styles.copiedToastText}>{copiedLabel} copied</Text>
        </View>
      )}

      {filteredCards.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="card-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{search ? 'No cards found' : 'No cards yet'}</Text>
          <Text style={styles.emptySubtext}>Store your card details securely</Text>
          {!search && (
            <View style={{ marginTop: 24, width: '70%' }}>
              <NeoPopTiltedButton onPress={() => router.push('/add-card')} showShimmer>
                <Text style={styles.ctaText}>ADD YOUR FIRST CARD</Text>
              </NeoPopTiltedButton>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Carousel */}
          <FlatList
            data={filteredCards}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH,
              offset: CARD_WIDTH * index,
              index,
            })}
          />

          {/* Dots */}
          <View style={styles.dots}>
            {filteredCards.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>

          {/* Active Card Quick Actions & Details Hub */}
          {activeCard && (
            <View style={styles.hubContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>QUICK ACTIONS</Text>
                <Text style={styles.sectionSub}>Tap any tile to copy</Text>
              </View>

              {/* Quick Copy Tiles Row */}
              <View style={styles.quickTilesRow}>
                {/* Card Number Tile */}
                <Pressable
                  style={styles.quickTile}
                  onPress={() => copyToClipboard(activeCard.cardNumber, 'Card number')}
                >
                  <View style={styles.tileTop}>
                    <Icon name="card-outline" size={16} color={Colors.primary} />
                    <Icon name="copy-outline" size={13} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.tileValue} numberOfLines={1}>
                    •••• {activeCard.cardNumber.replace(/\s/g, '').slice(-4)}
                  </Text>
                  <Text style={styles.tileLabel}>CARD NUMBER</Text>
                </Pressable>

                {/* CVV Tile */}
                <Pressable
                  style={styles.quickTile}
                  onPress={() => {
                    setShowCvv(true);
                    copyToClipboard(activeCard.cvv, 'CVV');
                    setTimeout(() => setShowCvv(false), 4000);
                  }}
                >
                  <View style={styles.tileTop}>
                    <Icon name={showCvv ? "eye-outline" : "eye-off-outline"} size={16} color={Colors.primary} />
                    <Icon name="copy-outline" size={13} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.tileValue}>
                    {showCvv ? activeCard.cvv : '•••'}
                  </Text>
                  <Text style={styles.tileLabel}>{showCvv ? 'REVEALED' : 'CVV'}</Text>
                </Pressable>

                {/* Expiry Tile */}
                <Pressable
                  style={styles.quickTile}
                  onPress={() => copyToClipboard(activeCard.expiry, 'Expiry')}
                >
                  <View style={styles.tileTop}>
                    <Icon name="calendar-outline" size={16} color={Colors.primary} />
                    <Icon name="copy-outline" size={13} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.tileValue}>
                    {activeCard.expiry}
                  </Text>
                  <Text style={styles.tileLabel}>EXPIRES</Text>
                </Pressable>
              </View>

              {/* Card Specs Card */}
              <View style={styles.detailsCard}>
                <View style={styles.detailsCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsCardTitle}>{activeCard.cardName}</Text>
                    <Text style={styles.detailsCardSubtitle}>{activeCard.cardType} Credit Card</Text>
                  </View>
                  <CardNetworkSymbol type={activeCard.cardType} />
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>CARDHOLDER</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {activeCard.nameOnCard ? activeCard.nameOnCard.toUpperCase() : 'NOT SPECIFIED'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>VAULT STATUS</Text>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Active • Encrypted</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Security Shield Box */}
              <View style={styles.securityBox}>
                <View style={styles.securityIconCircle}>
                  <Icon name="shield-checkmark" size={18} color={Colors.primary} />
                </View>
                <View style={styles.securityTextBox}>
                  <Text style={styles.securityTitle}>On-Device Vault Protection</Text>
                  <Text style={styles.securityDesc}>
                    Card credentials are encrypted on this device and never leave your phone.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {filteredCards.length > 0 && (
        <View style={[styles.addFab, { bottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100 }]}>
          <NeoPopTiltedButton onPress={() => router.push('/add-card')} showShimmer>
            <Icon name="add" size={24} color="#000" />
          </NeoPopTiltedButton>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 1,
  },
  cardCount: {
    fontSize: 12,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    backgroundColor: 'rgba(229,254,64,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 18,
  },
  scrollBody: {
    paddingBottom: 110,
  },
  hubContainer: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  quickTilesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileValue: {
    color: Colors.white,
    fontFamily: Fonts.serif,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tileLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: Fonts.semibold,
    letterSpacing: 1,
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
  },
  detailsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsCardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  detailsCardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.positive,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.positive,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 254, 64, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(229, 254, 64, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
    gap: 12,
  },
  securityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 254, 64, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextBox: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    marginBottom: 2,
  },
  securityDesc: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  copiedToast: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 8,
  },
  copiedToastText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 4,
    opacity: 0.7,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  addFab: {
    position: 'absolute',
    right: 20,
  },
});
