import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  loadPrices, addPrice, deletePrice,
  pricePerUnit, formatPricePerUnit, groupByItem, bestPrice,
  PriceEntry,
} from '../../store/prices';
import { loadPantry, addPantryItemsFromReceipt, todayDate } from '../../store/pantry';
import AddPriceModal from '../../components/prices/AddPriceModal';
import ReceiptScanModal from '../../components/prices/ReceiptScanModal';
import HeroHeader from '../../components/HeroHeader';
import { fab, darkSearch, heroOutlineBtn } from '../../lib/sharedStyles';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

export default function PricesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => setPrices(await loadPrices(user?.uid));
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(itemName) ? next.delete(itemName) : next.add(itemName);
      return next;
    });
  };

  const handleDelete = (entry: PriceEntry) => {
    Alert.alert('Remove this price?', `${entry.displayName} @ ${entry.store}`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => setPrices(await deletePrice(prices, entry.id, user?.uid)),
      },
    ]);
  };

  const grouped = groupByItem(prices);
  const filtered = search.trim()
    ? Array.from(grouped.entries()).filter(([key]) => key.includes(search.toLowerCase().trim()))
    : Array.from(grouped.entries());
  filtered.sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <View style={s.root}>
      <HeroHeader
        eyebrow="Track & Compare"
        title="Prices"
        right={
          <TouchableOpacity style={heroOutlineBtn.btn} onPress={() => setShowScan(true)}>
            <Text style={heroOutlineBtn.text}>Scan</Text>
          </TouchableOpacity>
        }
      >
        <View style={darkSearch.wrap}>
          <TextInput
            style={darkSearch.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Search items…"
            placeholderTextColor="rgba(254,246,240,0.35)"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={darkSearch.clear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </HeroHeader>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />}
      >
        {prices.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing tracked yet</Text>
            <Text style={s.emptySub}>
              Scan a receipt to add prices automatically, or tap + to add them yourself.
            </Text>
          </View>
        )}

        {prices.length > 0 && filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyText}>No items match "{search}"</Text>
          </View>
        )}

        {filtered.map(([itemName, entries]) => {
          const best = bestPrice(entries);
          const isExpanded = expandedItems.has(itemName);
          const displayName = entries[0]?.displayName ?? itemName;

          return (
            <View key={itemName} style={s.card}>
              <TouchableOpacity style={s.cardHeader} onPress={() => toggleExpand(itemName)} activeOpacity={0.7}>
                <View style={s.cardTitleWrap}>
                  <Text style={s.cardTitle}>{displayName}</Text>
                  <Text style={s.cardCount}>
                    {entries.length} {entries.length === 1 ? 'store' : 'stores'}
                  </Text>
                </View>
                <View style={s.cardRight}>
                  {best && (
                    <View style={s.bestWrap}>
                      <Text style={s.bestPrice}>{formatPricePerUnit(best)}</Text>
                      <Text style={s.bestStore}>{best.store || 'Unknown store'}</Text>
                    </View>
                  )}
                  <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={s.cardBody}>
                  {entries
                    .slice()
                    .sort((a, b) => pricePerUnit(a) - pricePerUnit(b))
                    .map((entry) => {
                      const isBest = best?.id === entry.id;
                      return (
                        <TouchableOpacity
                          key={entry.id}
                          style={[s.entryRow, isBest && s.entryRowBest]}
                          onLongPress={() => handleDelete(entry)}
                          activeOpacity={0.7}
                        >
                          <View style={s.entryLeft}>
                            {isBest && (
                              <View style={s.bestBadge}>
                                <Text style={s.bestBadgeText}>✦ Best</Text>
                              </View>
                            )}
                            <Text style={s.entryStore}>{entry.store || 'Unknown store'}</Text>
                            {entry.brand ? <Text style={s.entryBrand}>{entry.brand}</Text> : null}
                            <Text style={s.entrySize}>{entry.size} {entry.unit} · ${entry.price.toFixed(2)}</Text>
                          </View>
                          <View style={s.entryRight}>
                            <Text style={[s.entryPPU, isBest && s.entryPPUBest]}>{formatPricePerUnit(entry)}</Text>
                            <Text style={s.entryDate}>{entry.dateAdded}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  <Text style={s.hint}>Hold to remove</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>

      <TouchableOpacity
        style={[fab.btn, { bottom: insets.bottom + 72 }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.85}
      >
        <Text style={fab.label}>+</Text>
      </TouchableOpacity>

      <AddPriceModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (entry) => { setPrices(await addPrice(prices, entry, user?.uid)); setShowAdd(false); }}
      />
      <ReceiptScanModal
        visible={showScan}
        onClose={() => setShowScan(false)}
        onAddItems={async (newItems) => {
          let current = prices;
          for (const item of newItems) current = await addPrice(current, item, user?.uid);
          setPrices(current);
          const pantry = await loadPantry(user?.uid);
          await addPantryItemsFromReceipt(
            pantry,
            newItems.map((item) => ({
              displayName: item.displayName,
              itemName: item.itemName,
              quantity: `${item.size} ${item.unit}`,
              addedDate: todayDate(),
              source: 'receipt' as const,
            })),
            user?.uid,
          );
          setShowScan(false);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textDark, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.textFaint, textAlign: 'center', lineHeight: 22 },
  emptyText: { fontSize: 15, color: theme.textFaint, fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 10,
    overflow: 'hidden', borderLeftWidth: 3, borderLeftColor: theme.accent,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: theme.textDark },
  cardCount: { fontSize: 12, color: theme.textFaint, marginTop: 2, fontWeight: '500' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bestWrap: { alignItems: 'flex-end' },
  bestPrice: { fontSize: 15, fontWeight: '800', color: theme.textDark },
  bestStore: { fontSize: 11, color: theme.textFaint },
  chevron: { fontSize: 11, color: theme.textFaint },

  cardBody: { borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 12, paddingBottom: 12 },

  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginTop: 8,
    backgroundColor: theme.bg,
  },
  entryRowBest: { backgroundColor: 'rgba(244,207,110,0.12)' },
  entryLeft: { flex: 1 },
  bestBadge: {
    backgroundColor: theme.warning, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '800', color: theme.textDark },
  entryStore: { fontSize: 14, fontWeight: '700', color: theme.textDark },
  entryBrand: { fontSize: 12, color: theme.textFaint, marginTop: 1 },
  entrySize: { fontSize: 12, color: theme.textFaint, marginTop: 2 },
  entryRight: { alignItems: 'flex-end' },
  entryPPU: { fontSize: 14, fontWeight: '800', color: theme.textFaint },
  entryPPUBest: { color: theme.textDark },
  entryDate: { fontSize: 11, color: theme.textFaint, opacity: 0.5, marginTop: 2 },

  hint: { textAlign: 'center', fontSize: 11, color: theme.textFaint, opacity: 0.5, marginTop: 8 },
});
