import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  loadPrices, loadPricesFromCache, saveNewPrices, addPrice, updatePrice, deletePrice,
  pricePerUnit, formatPricePerUnit, bestPrice, unitGroup, getPricesSync,
  PriceEntry, Unit,
} from '../../store/prices';
import {
  loadCategories, loadCategoriesFromCache, seedDefaultCategories,
  saveCategory, saveNewCategories, updateCategory, deleteCategory, setCategoryDisplayUnit,
  getCategoriesSync, PriceCategory,
} from '../../store/categories';
import { loadPantry, addPantryItemsFromReceipt, todayDate } from '../../store/pantry';
import { addSingleEntry } from '../../store/budget';
import PriceEntryModal from '../../components/prices/PriceEntryModal';
import CategoryModal from '../../components/prices/CategoryModal';
import ReceiptScanModal, { ScannedItem, ReceiptBudgetEntry } from '../../components/prices/ReceiptScanModal';
import HeroHeader from '../../components/HeroHeader';
import { fab, darkSearch, heroOutlineBtn } from '../../lib/sharedStyles';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';
import { toTitleCase } from '../../lib/utils';

const Svg = 'svg' as any;
const Path = 'path' as any;

// Three slightly-offset strokes (3°, 63°, 123°) so it reads as handwritten
const ASTERISK_STROKE = 'M 10,1.5 Q 13.5,8 10.5,18.5 L 9.5,18.5 Q 6,12 10,1.5 Z';

function HandwrittenAsterisk({ color }: { color: string }) {
  if (Platform.OS !== 'web') {
    return <Text style={{ color, fontSize: 13, marginRight: 4, fontWeight: '700' }}>*</Text>;
  }
  return (
    <View style={{ width: 14, height: 14, marginRight: 5 }}>
      <Svg width="14" height="14" viewBox="0 0 20 20">
        <Path d={ASTERISK_STROKE} fill={color} transform="rotate(3 10 10)" />
        <Path d={ASTERISK_STROKE} fill={color} transform="rotate(63 10 10)" />
        <Path d={ASTERISK_STROKE} fill={color} transform="rotate(123 10 10)" />
      </Svg>
    </View>
  );
}

const CAT_PALETTE = [
  '#8a7aaa', '#7BAFD4', '#94B8A4', '#E87830',
  '#D4A574', '#9a8aaa', '#7CC8A4', '#F4A8A8',
];

function categoryColor(category: string): string {
  let h = 0;
  for (let i = 0; i < category.length; i++) h = category.charCodeAt(i) + ((h << 5) - h);
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length];
}

export default function PricesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prices, setPrices] = useState<PriceEntry[]>(() => getPricesSync() ?? []);
  const [categories, setCategories] = useState<PriceCategory[]>(() => getCategoriesSync() ?? []);
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PriceCategory | null>(null);
  const [editing, setEditing] = useState<PriceEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(() => getPricesSync() !== null);
  const loadGen = useRef(0);

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
    setLoaded(true);

    const [p, c] = await Promise.all([loadPrices(user?.uid), loadCategories(user?.uid)]);
    if (gen !== loadGen.current) return;
    const seeded = await seedDefaultCategories(c, user?.uid);
    if (gen !== loadGen.current) return;
    setPrices(p);
    setCategories(seeded);
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleExpand = (category: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  const handleSaveEntry = async (data: Omit<PriceEntry, 'id'>, id?: string) => {
    loadGen.current++;
    if (id) {
      const [updatedPrices, updatedCategories] = await Promise.all([
        updatePrice(prices, id, data, user?.uid),
        ensureCategory(categories, data.category),
      ]);
      setPrices(updatedPrices);
      setCategories(updatedCategories);
      setEditing(null);
    } else {
      const updatedPrices = await addPrice(prices, data, user?.uid);
      const updatedCategories = await ensureCategory(categories, data.category);
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

  const handleAddCategory = async (name: string, displayUnit?: Unit) => {
    loadGen.current++;
    const category = name.toLowerCase().trim();
    setCategories(await saveCategory(categories, { name, category, displayUnit }, user?.uid));
    setShowAddCategory(false);
  };

  const handleUpdateCategory = async (name: string, _displayUnit?: Unit) => {
    if (!editingCategory) return;
    loadGen.current++;
    setCategories(await updateCategory(categories, editingCategory.id, name, user?.uid));
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (keepEntries: boolean) => {
    if (!editingCategory) return;
    loadGen.current++;
    const itemEntries = prices.filter((p) => p.category === editingCategory.category);
    if (!keepEntries) {
      let updatedPrices = prices;
      for (const entry of itemEntries) {
        updatedPrices = await deletePrice(updatedPrices, entry.id, user?.uid);
      }
      setPrices(updatedPrices);
      setCategories(await deleteCategory(categories, editingCategory.id, user?.uid));
    } else {
      let updatedPrices = prices;
      for (const entry of itemEntries) {
        updatedPrices = await updatePrice(updatedPrices, entry.id, { category: 'uncategorized' }, user?.uid);
      }
      setPrices(updatedPrices);
      setCategories(await deleteCategory(categories, editingCategory.id, user?.uid));
    }
    setEditingCategory(null);
  };

  const handleSetDisplayUnit = async (catId: string, unit: Unit) => {
    setCategories(await setCategoryDisplayUnit(categories, catId, unit, user?.uid));
  };

  const ensureCategory = async (
    current: PriceCategory[],
    category: string,
  ): Promise<PriceCategory[]> => {
    if (current.some((c) => c.category === category)) return current;
    // Derive display name from the category key itself, not the item name
    const catName = category.charAt(0).toUpperCase() + category.slice(1);
    return saveCategory(current, { name: catName, category }, user?.uid);
  };

  // True when the only category is the seeded Uncategorized placeholder
  const noRealCategories = !categories.some((c) => c.category !== 'uncategorized');

  const SUGGESTED_CATEGORIES = [
    'Bread', 'Milk', 'Eggs', 'Produce', 'Meat', 'Dairy', 'Snacks', 'Beverages',
  ];

  // Build display list from categories only; hide Uncategorized when it has no entries
  let displayList = categories
    .map((cat) => ({
      cat,
      entries: prices.filter((p) => p.category === cat.category),
    }))
    .filter(({ cat, entries }) => {
      if (cat.category === 'uncategorized' && entries.length === 0) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return cat.category.includes(q) || cat.name.toLowerCase().includes(q);
    })
    .sort((a, b) => a.cat.name.localeCompare(b.cat.name));

  const categoryNames = categories.map((c) => c.name);
  const storeNames = [...new Set(prices.map((p) => p.store).filter(Boolean))].sort();

  return (
    <View style={s.root}>
      <HeroHeader
        title="Prices"
        cardColor={theme.heroPrices}
        hideBorder
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
        {loaded && noRealCategories && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing tracked yet.</Text>
            <Text style={s.emptySub}>
              Tap + to add a price, scan a receipt, or start with a suggestion:
            </Text>
            <View style={s.suggestRow}>
              {SUGGESTED_CATEGORIES.filter(
                (n) => !categories.some((c) => c.name.toLowerCase() === n.toLowerCase())
              ).map((name) => (
                <TouchableOpacity
                  key={name}
                  style={s.suggestChip}
                  onPress={() => handleAddCategory(name)}
                >
                  <Text style={s.suggestChipText}>+ {name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {search.trim().length > 0 && displayList.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyText}>No categories match "{search}"</Text>
          </View>
        )}

        {displayList.map(({ cat, entries }) => {
          const best = bestPrice(entries);
          const isExpanded = expandedItems.has(cat.category);
          const catColor = categoryColor(cat.category);
          const du = cat.displayUnit;
          const entryGroups = new Set(entries.map((e) => unitGroup(e.unit)));
          const catUnitGroup = entryGroups.has('weight') ? 'weight' : entryGroups.has('volume') ? 'volume' : entryGroups.size > 0 ? 'count' : undefined;

          return (
            <View key={cat.id} style={s.card}>
              <View style={s.cardHeader}>
                <TouchableOpacity
                  style={s.cardTitleWrap}
                  onPress={() => setEditingCategory(cat)}
                  activeOpacity={0.7}
                >
                  <View style={s.cardTitleRow}>
                    <View style={[s.catDot, { backgroundColor: catColor }]} />
                    <Text style={s.cardTitle}>{cat.name}</Text>
                  </View>
                </TouchableOpacity>
                <View style={s.cardRight}>
                  {best && (
                    <View style={s.bestWrap}>
                      <Text style={s.bestPrice}>{formatPricePerUnit(best, du)}</Text>
                      <Text style={s.bestStore}>{best.store || 'Unknown'}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => toggleExpand(cat.category)}
                    hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                    activeOpacity={0.6}
                  >
                    <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

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
                            style={s.entryRow}
                            onPress={() => setEditing(entry)}
                            activeOpacity={0.7}
                          >
                            <View style={s.entryLeft}>
                              <View style={s.entryNameRow}>
                                {isBest && <HandwrittenAsterisk color={catColor} />}
                                <Text style={s.entryName} numberOfLines={1}>{toTitleCase(entry.itemName)}</Text>
                              </View>
                              <Text style={s.entryStore}>{toTitleCase(entry.store || 'Unknown store')}</Text>
                            </View>
                            <Text style={[s.entryPPU, isBest && s.entryPPUBest]}>
                              {formatPricePerUnit(entry, du)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                  )}
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
        existingNames={categories.map((c) => c.name)}
      />
      <CategoryModal
        visible={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={handleUpdateCategory}
        onDelete={editingCategory?.category !== 'uncategorized' ? handleDeleteCategory : undefined}
        initialName={editingCategory?.name}
        entryCount={prices.filter((p) => p.category === editingCategory?.category).length}
        existingNames={categories.map((c) => c.name)}
        unitGroup={(() => {
          if (!editingCategory) return undefined;
          const groups = new Set(prices.filter((p) => p.category === editingCategory.category).map((p) => unitGroup(p.unit)));
          return groups.has('weight') ? 'weight' : groups.has('volume') ? 'volume' : groups.has('count') ? 'count' : undefined;
        })()}
        displayUnit={editingCategory?.displayUnit}
        onDisplayUnitChange={(unit) => editingCategory && handleSetDisplayUnit(editingCategory.id, unit)}
      />
      <PriceEntryModal
        visible={showAdd || !!editing}
        entry={editing}
        existingCategories={categoryNames}
        existingStores={storeNames}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />
      <ReceiptScanModal
        visible={showScan}
        onClose={() => setShowScan(false)}
        existingCategories={categoryNames}
        onAddItems={async (taggedItems: ScannedItem[], budget?: ReceiptBudgetEntry) => {
          loadGen.current++;
          const priceItems = taggedItems.filter((i) => i.addToPrice);
          const pantryItems = taggedItems.filter((i) => i.addToPantry);

          // Build all new state locally — no I/O, just JS
          const existingCatKeys = new Set(categories.map((c) => c.category));
          const uniqueCats = [...new Set(taggedItems.map((i) => i.entry.category))];
          const newCats: PriceCategory[] = uniqueCats
            .filter((cat) => !existingCatKeys.has(cat))
            .map((cat) => ({
              id: `${Date.now()}-${Math.random()}`,
              name: cat.charAt(0).toUpperCase() + cat.slice(1),
              category: cat,
            }));
          const allCategories = [...categories, ...newCats];

          const newPriceEntries: PriceEntry[] = [];
          for (const { entry } of priceItems) {
            const isDup = !!entry.scannedName && prices.some(
              (p) => p.scannedName === entry.scannedName &&
                Math.abs(p.price - entry.price) < 0.001 &&
                p.store.toLowerCase() === entry.store.toLowerCase(),
            );
            if (!isDup) newPriceEntries.push({ ...entry, id: `${Date.now()}-${Math.random()}` });
          }
          const allPrices = [...prices, ...newPriceEntries];

          // Update UI and close modal immediately
          setCategories(allCategories);
          setPrices(allPrices);
          setShowScan(false);

          // Persist everything in parallel — user doesn't wait for this
          await Promise.all([
            saveNewCategories(newCats, allCategories, user?.uid),
            saveNewPrices(newPriceEntries, allPrices, user?.uid),
          ]);

          // Pantry writes — also after modal is already closed
          if (pantryItems.length > 0) {
            const pantry = await loadPantry(user?.uid);
            await addPantryItemsFromReceipt(
              pantry,
              pantryItems.map(({ entry }) => {
                const cat = allCategories.find((c) => c.category === entry.category);
                const catName = cat?.name ?? (entry.category.charAt(0).toUpperCase() + entry.category.slice(1));
                return {
                  displayName: catName,
                  itemName: entry.category,
                  addedDate: todayDate(),
                  source: 'receipt' as const,
                };
              }),
              user?.uid,
            );
          }

          // Budget entry — fire and forget
          if (budget && budget.amount > 0) {
            await addSingleEntry({
              amount: budget.amount,
              category: 'groceries',
              description: budget.store || 'Grocery shopping',
              date: budget.date,
            }, user?.uid);
          }
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
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 },
  suggestChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: theme.border,
  },
  suggestChipText: { fontSize: 13, color: theme.textMuted, fontWeight: '600' },

  card: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, justifyContent: 'space-between' },
  cardTitleWrap: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 16, fontWeight: '400', color: theme.textDark },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bestWrap: { alignItems: 'flex-end' },
  bestPrice: { fontSize: 16, fontWeight: '700', color: theme.textDark },
  bestStore: { fontSize: 11, color: theme.textFaint },
  chevron: { fontSize: 17, color: theme.textMuted },

  cardBody: { paddingBottom: 8 },
  emptyEntries: { paddingVertical: 16, alignItems: 'center' },
  emptyEntriesText: { fontSize: 13, color: theme.textFaint },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
  },
  entryLeft: { flex: 1, paddingRight: 12 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center' },
  entryName: { flex: 1, fontSize: 16, fontWeight: '400', color: theme.textDark },
  entryStore: { fontSize: 12, color: theme.textFaint, marginTop: 2 },
  entryPPU: { fontSize: 16, fontWeight: '700', color: theme.textFaint, fontVariant: ['tabular-nums'] },
  entryPPUBest: { color: theme.textDark },

  addCatBtn: { alignItems: 'center', paddingVertical: 18 },
  addCatBtnText: { fontSize: 15, color: theme.primary, fontWeight: '700' },
});
