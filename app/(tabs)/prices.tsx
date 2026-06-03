import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  loadPrices, loadPricesFromCache, addPrice, updatePrice, deletePrice,
  pricePerUnit, formatPricePerUnit, bestPrice,
  PriceEntry,
} from '../../store/prices';
import {
  loadCategories, loadCategoriesFromCache, saveCategory, updateCategory, deleteCategory,
  PriceCategory,
} from '../../store/categories';
import { loadPantry, addPantryItemsFromReceipt, todayDate } from '../../store/pantry';
import PriceEntryModal from '../../components/prices/PriceEntryModal';
import CategoryModal from '../../components/prices/CategoryModal';
import ReceiptScanModal from '../../components/prices/ReceiptScanModal';
import HeroHeader from '../../components/HeroHeader';
import { fab, darkSearch, heroOutlineBtn } from '../../lib/sharedStyles';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

const CAT_PALETTE = [
  '#A78BDB', '#7BAFD4', '#94B8A4', '#F7A8C4',
  '#D4A574', '#C4A8D4', '#7CC8A4', '#F4A8A8',
];

function categoryColor(itemName: string): string {
  let h = 0;
  for (let i = 0; i < itemName.length; i++) h = itemName.charCodeAt(i) + ((h << 5) - h);
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length];
}

export default function PricesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PriceCategory | null>(null);
  const [editing, setEditing] = useState<PriceEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadGen = useRef(0);

  const applyLoaded = async (p: PriceEntry[], c: PriceCategory[]) => {
    const categoryItemNames = new Set(c.map((cat) => cat.itemName));
    let current = c;
    for (const itemName of new Set(p.map((e) => e.itemName))) {
      if (!categoryItemNames.has(itemName)) {
        const catName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
        current = await saveCategory(current, { name: catName, itemName }, user?.uid);
        categoryItemNames.add(itemName);
      }
    }
    setPrices(p);
    setCategories(current);
  };

  const load = async () => {
    const gen = ++loadGen.current;

    const [cachedP, cachedC] = await Promise.all([
      loadPricesFromCache(user?.uid),
      loadCategoriesFromCache(user?.uid),
    ]);
    if (gen !== loadGen.current) return;
    if (cachedP.length > 0 || cachedC.length > 0) {
      setPrices(cachedP);
      setCategories(cachedC);
    }

    const [p, c] = await Promise.all([loadPrices(user?.uid), loadCategories(user?.uid)]);
    if (gen !== loadGen.current) return;
    await applyLoaded(p, c);
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(itemName) ? next.delete(itemName) : next.add(itemName);
      return next;
    });
  };

  const handleSaveEntry = async (data: Omit<PriceEntry, 'id'>, id?: string) => {
    loadGen.current++;
    if (id) {
      setPrices(await updatePrice(prices, id, data, user?.uid));
      setEditing(null);
    } else {
      const updatedPrices = await addPrice(prices, data, user?.uid);
      const updatedCategories = await ensureCategory(categories, data.itemName, data.displayName);
      setPrices(updatedPrices);
      setCategories(updatedCategories);
      setShowAdd(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    loadGen.current++;
    setPrices(await deletePrice(prices, id, user?.uid));
    setEditing(null);
  };

  const handleAddCategory = async (name: string) => {
    loadGen.current++;
    const itemName = name.toLowerCase().trim();
    setCategories(await saveCategory(categories, { name, itemName }, user?.uid));
    setShowAddCategory(false);
  };

  const handleUpdateCategory = async (name: string) => {
    if (!editingCategory) return;
    loadGen.current++;
    setCategories(await updateCategory(categories, editingCategory.id, name, user?.uid));
    setEditingCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    loadGen.current++;
    setCategories(await deleteCategory(categories, editingCategory.id, user?.uid));
    setEditingCategory(null);
  };

  const ensureCategory = async (
    current: PriceCategory[],
    itemName: string,
    displayName: string,
  ): Promise<PriceCategory[]> => {
    if (current.some((c) => c.itemName === itemName)) return current;
    const catName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    return saveCategory(current, { name: catName, itemName }, user?.uid);
  };

  // Build display list from categories only
  let displayList = categories
    .map((cat) => ({
      cat,
      entries: prices.filter((p) => p.itemName === cat.itemName),
    }))
    .filter(({ cat }) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return cat.itemName.includes(q) || cat.name.toLowerCase().includes(q);
    })
    .sort((a, b) => a.cat.name.localeCompare(b.cat.name));

  const categoryNames = categories.map((c) => c.itemName);

  return (
    <View style={s.root}>
      <HeroHeader
        eyebrow="Track & Compare"
        title="Prices 🏷️"
        cardColor="#F7A8C4"
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
            placeholder="Search categories…"
            placeholderTextColor={theme.placeholder}
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
        {categories.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No categories yet</Text>
            <Text style={s.emptySub}>
              Scan a receipt, tap + to add a price, or use "Add a category" below.
            </Text>
          </View>
        )}

        {categories.length > 0 && displayList.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyText}>No categories match "{search}"</Text>
          </View>
        )}

        {displayList.map(({ cat, entries }) => {
          const best = bestPrice(entries);
          const isExpanded = expandedItems.has(cat.itemName);
          const catColor = categoryColor(cat.itemName);

          return (
            <View key={cat.id} style={[s.card, { borderLeftColor: catColor }]}>
              <TouchableOpacity
                style={s.cardHeader}
                onPress={() => toggleExpand(cat.itemName)}
                activeOpacity={0.7}
              >
                <View style={s.cardTitleWrap}>
                  <View style={s.cardTitleRow}>
                    <View style={[s.catDot, { backgroundColor: catColor }]} />
                    <Text style={s.cardTitle}>{cat.name}</Text>
                  </View>
                  <Text style={s.cardCount}>
                    {entries.length === 0
                      ? 'No entries'
                      : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
                  </Text>
                </View>
                <View style={s.cardRight}>
                  {best && (
                    <View style={s.bestWrap}>
                      <Text style={s.bestPrice}>{formatPricePerUnit(best)}</Text>
                      <Text style={s.bestStore}>{best.store || 'Unknown'}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => setEditingCategory(cat)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
                  >
                    <Text style={s.editIcon}>✎</Text>
                  </TouchableOpacity>
                  <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={s.cardBody}>
                  {entries.length === 0 ? (
                    <View style={s.emptyEntries}>
                      <Text style={s.emptyEntriesText}>No price entries yet — tap + to add one.</Text>
                    </View>
                  ) : (
                    entries
                      .slice()
                      .sort((a, b) => pricePerUnit(a) - pricePerUnit(b))
                      .map((entry) => {
                        const isBest = best?.id === entry.id;
                        return (
                          <TouchableOpacity
                            key={entry.id}
                            style={[s.entryRow, isBest && s.entryRowBest]}
                            onPress={() => setEditing(entry)}
                            activeOpacity={0.7}
                          >
                            <View style={s.entryLeft}>
                              {isBest && (
                                <View style={s.bestBadge}>
                                  <Text style={s.bestBadgeText}>✦ Best</Text>
                                </View>
                              )}
                              <Text style={s.entryName}>{entry.displayName}</Text>
                              <Text style={s.entryStore}>{entry.store || 'Unknown store'}</Text>
                              <Text style={s.entrySize}>{entry.size} {entry.unit} · ${entry.price.toFixed(2)}</Text>
                            </View>
                            <View style={s.entryRight}>
                              <Text style={[s.entryPPU, isBest && s.entryPPUBest]}>{formatPricePerUnit(entry)}</Text>
                              <Text style={s.entryDate}>{entry.dateAdded}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                  )}
                  {entries.length > 0 && <Text style={s.hint}>Tap entry to edit or move</Text>}
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={s.addCatBtn} onPress={() => setShowAddCategory(true)}>
          <Text style={s.addCatBtnText}>+ Add a category</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>

      <TouchableOpacity
        style={[fab.btn, { bottom: insets.bottom + 72 }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.85}
      >
        <Text style={fab.label}>+</Text>
      </TouchableOpacity>

      <CategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={handleAddCategory}
      />
      <CategoryModal
        visible={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={handleUpdateCategory}
        onDelete={handleDeleteCategory}
        initialName={editingCategory?.name}
      />
      <PriceEntryModal
        visible={showAdd || !!editing}
        entry={editing}
        existingGroups={categoryNames}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />
      <ReceiptScanModal
        visible={showScan}
        onClose={() => setShowScan(false)}
        existingCategories={categoryNames}
        onAddItems={async (newItems) => {
          loadGen.current++;
          let currentPrices = prices;
          let currentCategories = categories;
          for (const item of newItems) {
            currentPrices = await addPrice(currentPrices, item, user?.uid);
            currentCategories = await ensureCategory(currentCategories, item.itemName, item.itemName);
          }
          setPrices(currentPrices);
          setCategories(currentCategories);
          const pantry = await loadPantry(user?.uid);
          await addPantryItemsFromReceipt(
            pantry,
            newItems.map((item) => {
              const cat = currentCategories.find((c) => c.itemName === item.itemName);
              const catName = cat?.name ?? (item.itemName.charAt(0).toUpperCase() + item.itemName.slice(1));
              return {
                displayName: catName,
                itemName: item.itemName,
                addedDate: todayDate(),
                source: 'receipt' as const,
              };
            }),
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
    overflow: 'hidden', borderLeftWidth: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  cardTitleWrap: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: theme.textDark },
  cardCount: { fontSize: 12, color: theme.textFaint, marginTop: 2, fontWeight: '500' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  bestWrap: { alignItems: 'flex-end' },
  bestPrice: { fontSize: 15, fontWeight: '800', color: theme.textDark },
  bestStore: { fontSize: 11, color: theme.textFaint },
  editIcon: { fontSize: 15, color: theme.textFaint },
  chevron: { fontSize: 11, color: theme.textFaint },

  cardBody: { borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 12, paddingBottom: 12 },
  emptyEntries: { paddingVertical: 16, alignItems: 'center' },
  emptyEntriesText: { fontSize: 13, color: theme.textFaint },

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
  entryName: { fontSize: 14, fontWeight: '700', color: theme.textDark },
  entryStore: { fontSize: 12, color: theme.textFaint, marginTop: 1 },
  entrySize: { fontSize: 12, color: theme.textFaint, marginTop: 2 },
  entryRight: { alignItems: 'flex-end' },
  entryPPU: { fontSize: 14, fontWeight: '800', color: theme.textFaint },
  entryPPUBest: { color: theme.textDark },
  entryDate: { fontSize: 11, color: theme.textFaint, opacity: 0.5, marginTop: 2 },

  hint: { textAlign: 'center', fontSize: 11, color: theme.textFaint, opacity: 0.5, marginTop: 8 },

  addCatBtn: { alignItems: 'center', paddingVertical: 18 },
  addCatBtnText: { fontSize: 15, color: theme.primary, fontWeight: '700' },
});
