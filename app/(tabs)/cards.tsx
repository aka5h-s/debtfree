import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, TextInput, Alert, Platform, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import Animated, { useAnimatedStyle, useSharedValue, interpolate, Extrapolation } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { CreditCardVisual } from '@/components/CreditCardVisual';
import { Fonts } from '@/lib/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

function AnimatedCard({ card, index, scrollX, totalCards, onCopy, onEdit, onDelete }: {
  card: any;
  index: number;
  scrollX: Animated.SharedValue<number>;
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

  const handleCopy = (label: string) => {
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
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
        <Text style={styles.title}>MY CARDS</Text>
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
        <View style={{ flex: 1 }}>
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

          <View style={styles.dots}>
            {filteredCards.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>

          {copiedLabel && (
            <View style={styles.copiedBanner}>
              <Icon name="checkmark-circle" size={16} color={Colors.positive} />
              <Text style={styles.copiedText}>{copiedLabel} copied</Text>
            </View>
          )}

          <View style={styles.hint}>
            <Icon name="hand-left-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.hintText}>Swipe to browse cards. Tap details to copy.</Text>
          </View>
        </View>
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
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  cardCount: {
    fontSize: 11,
    fontFamily: Fonts.bold,
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
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 8,
  },
  copiedText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.positive,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  hintText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
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
