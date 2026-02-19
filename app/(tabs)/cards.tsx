import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, TextInput, Alert, Platform, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopButton } from '@/components/NeoPopButton';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { CreditCardVisual } from '@/components/CreditCardVisual';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const { cards, removeCard } = useData();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

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

  const handleDelete = () => {
    const card = filteredCards[activeIndex];
    if (!card) return;
    if (Platform.OS === 'web') {
      if (confirm(`Remove "${card.cardName}"?`)) {
        removeCard(card.id);
        setActiveIndex(0);
      }
    } else {
      Alert.alert('Remove Card', `Remove "${card.cardName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { removeCard(card.id); setActiveIndex(0); } },
      ]);
    }
  };

  const handleEdit = () => {
    const card = filteredCards[activeIndex];
    if (!card) return;
    router.push({ pathname: '/edit-card', params: { cardId: card.id } });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>MY CARDS ({cards.length})</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cards..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {filteredCards.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{search ? 'No cards found' : 'No cards yet'}</Text>
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
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.carousel}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
              setActiveIndex(Math.max(0, Math.min(idx, filteredCards.length - 1)));
            }}
            renderItem={({ item }) => (
              <View style={[styles.cardSlide, { width: CARD_WIDTH }]}>
                <CreditCardVisual card={item} onCopy={handleCopy} />
              </View>
            )}
          />

          <View style={styles.dots}>
            {filteredCards.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>

          {copiedLabel && (
            <View style={styles.copiedBanner}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.positive} />
              <Text style={styles.copiedText}>{copiedLabel} copied</Text>
            </View>
          )}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <NeoPopButton onPress={handleEdit} variant="secondary">
                <View style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={18} color={Colors.white} />
                  <Text style={styles.actionBtnText}>EDIT CARD</Text>
                </View>
              </NeoPopButton>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <NeoPopButton onPress={handleDelete} variant="danger">
                <View style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.negative} />
                  <Text style={[styles.actionBtnText, { color: Colors.negative }]}>REMOVE</Text>
                </View>
              </NeoPopButton>
            </View>
          </View>
        </View>
      )}

      {filteredCards.length > 0 && (
        <View style={[styles.addFab, { bottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100 }]}>
          <NeoPopTiltedButton onPress={() => router.push('/add-card')} showShimmer>
            <Ionicons name="add" size={24} color="#000" />
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
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 2,
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
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  carousel: {
    paddingHorizontal: 24,
    gap: 12,
  },
  cardSlide: {
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
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
    fontFamily: 'Inter_500Medium',
    color: Colors.positive,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
    letterSpacing: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.textMuted,
    marginTop: 16,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 1,
  },
  addFab: {
    position: 'absolute',
    right: 20,
  },
});
