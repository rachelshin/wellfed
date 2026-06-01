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
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>Track & Compare</Text>
          <Text style={s.headerTitle}>Prices 🏷️</Text>
        </View>
        <TouchableOpacity style={s.scanBtn} onPress={() => setShowScan(true)}>
          <Text style={s.scanBtnText}>📄 Scan</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search your items…"
          placeholderTextColor={theme.placeholder}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={s.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {prices.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🛍️</Text>
            <Text style={s.emptyTitle}>Nothing tracked yet!</Text>
            <Text style={s.emptySub}>
              Scan a receipt to add prices automatically, or tap + to add them yourself.{'\n'}
              The more you track, the easier it is to find the best deals!
            </Text>
          </View>
        )}

        {prices.length > 0 && filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🕵️</Text>
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
                                <Text style={s.bestBadgeText}>Best deal 🌟</Text>
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
                  <Text style={s.longPressHint}>Hold an entry to remove it</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>+</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, paddingTop: 6,
  },
  headerEyebrow: { fontSize: 12, fontWeight: '700', color: theme.textFaint, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: theme.textDark },
  scanBtn: { backgroundColor: theme.primaryLight, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 2 },
  scanBtnText: { color: theme.primary, fontWeight: '800', fontSize: 14 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, borderWidth: 2, borderColor: theme.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12, color: theme.textDark },
  clearIcon: { fontSize: 16, color: theme.textFaint, padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: theme.textDark, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  emptyText: { fontSize: 15, color: theme.textFaint, fontWeight: '600' },

  card: {
    backgroundColor: theme.card, borderRadius: 18, marginBottom: 10,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
    overflow: 'hidden', borderWidth: 1.5, borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: theme.textDark },
  cardCount: { fontSize: 12, color: theme.textFaint, marginTop: 2, fontWeight: '500' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bestWrap: { alignItems: 'flex-end' },
  bestPrice: { fontSize: 15, fontWeight: '800', color: theme.primary },
  bestStore: { fontSize: 11, color: theme.textFaint },
  chevron: { fontSize: 11, color: theme.textFaint },

  cardBody: { borderTopWidth: 1.5, borderTopColor: theme.border, paddingHorizontal: 12, paddingBottom: 12 },

  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginTop: 8, backgroundColor: theme.bgTint,
  },
  entryRowBest: { backgroundColor: theme.primaryLight },
  entryLeft: { flex: 1 },
  bestBadge: { backgroundColor: theme.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4 },
  bestBadgeText: { fontSize: 10, fontWeight: '800', color: theme.card },
  entryStore: { fontSize: 14, fontWeight: '700', color: theme.textDark },
  entryBrand: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  entrySize: { fontSize: 12, color: theme.textFaint, marginTop: 2 },
  entryRight: { alignItems: 'flex-end' },
  entryPPU: { fontSize: 14, fontWeight: '800', color: '#9CA3AF' },
  entryPPUBest: { color: theme.primary },
  entryDate: { fontSize: 11, color: theme.border, marginTop: 2 },

  longPressHint: { textAlign: 'center', fontSize: 11, color: theme.border, marginTop: 8 },

  fab: {
    position: 'absolute', right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.primaryShadow, shadowOpacity: 0.4, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  fabText: { color: theme.card, fontSize: 30, fontWeight: '300', lineHeight: 34 },
});
