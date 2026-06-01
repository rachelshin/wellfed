import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  loadPantry, addPantryItem, deletePantryItem, PantryItem,
} from '../../store/pantry';
import AddPantryModal from '../../components/pantry/AddPantryModal';
import { useAuth } from '../../context/auth';

export default function PantryTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => setItems(await loadPantry(user?.uid));
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = (item: PantryItem) => {
    Alert.alert('Remove from pantry?', item.displayName, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => setItems(await deletePantryItem(items, item.id, user?.uid)),
      },
    ]);
  };

  const filtered = search.trim()
    ? items.filter((i) => i.itemName.includes(search.toLowerCase().trim()))
    : items;

  // Group alphabetically
  const grouped = filtered
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .reduce<Record<string, PantryItem[]>>((acc, item) => {
      const letter = item.displayName[0].toUpperCase();
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(item);
      return acc;
    }, {});

  const receiptCount = items.filter((i) => i.source === 'receipt').length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>What's in your kitchen?</Text>
          <Text style={s.headerTitle}>Pantry 🥫</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity
            style={s.recipesBtn}
            onPress={() => router.push('/(tabs)/recipes')}
          >
            <Text style={s.recipesBtnText}>🍳 Recipes</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats bar */}
      {items.length > 0 && (
        <View style={s.statsBar}>
          <View style={s.statChip}>
            <Text style={s.statChipText}>🥫 {items.length} total items</Text>
          </View>
          {receiptCount > 0 && (
            <View style={[s.statChip, s.statChipReceipt]}>
              <Text style={[s.statChipText, s.statChipReceiptText]}>📄 {receiptCount} from receipts</Text>
            </View>
          )}
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search your pantry…"
          placeholderTextColor="#C4B5C8"
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />}
      >
        {items.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🥫</Text>
            <Text style={s.emptyTitle}>Your pantry is empty!</Text>
            <Text style={s.emptySub}>
              Tap + to add items manually, or scan a receipt in the Prices tab — items will appear here automatically.{'\n\n'}
              The more you add, the better your recipe suggestions will be!
            </Text>
          </View>
        )}

        {items.length > 0 && filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🕵️</Text>
            <Text style={s.emptyText}>Nothing matches "{search}"</Text>
          </View>
        )}

        {Object.entries(grouped).map(([letter, groupItems]) => (
          <View key={letter}>
            <Text style={s.groupLetter}>{letter}</Text>
            {groupItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.itemRow}
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <View style={s.itemIcon}>
                  <Text style={s.itemSourceEmoji}>{item.source === 'receipt' ? '📄' : '✏️'}</Text>
                </View>
                <View style={s.itemInfo}>
                  <Text style={s.itemName}>{item.displayName}</Text>
                  <Text style={s.itemQty}>{item.quantity}</Text>
                </View>
                <Text style={s.itemDate}>{item.addedDate}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {items.length > 0 && (
          <Text style={s.hint}>Hold an item to remove it</Text>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <AddPantryModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (item) => {
          setItems(await addPantryItem(items, item, user?.uid));
          setShowAdd(false);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 10, paddingTop: 6,
  },
  headerEyebrow: { fontSize: 12, fontWeight: '700', color: '#C4B5C8', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#1E1B4B' },
  recipesBtn: {
    backgroundColor: '#FFD6EA', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 2,
  },
  recipesBtnText: { color: '#FF6B9D', fontWeight: '800', fontSize: 14 },

  statsBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10, flexWrap: 'wrap',
  },
  statChip: { backgroundColor: '#F3E8FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statChipReceipt: { backgroundColor: '#E0F2FE' },
  statChipText: { fontSize: 12, fontWeight: '700', color: '#A78BFA' },
  statChipReceiptText: { color: '#0891B2' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, borderWidth: 2, borderColor: '#FCE7F3',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12, color: '#1E1B4B' },
  clearIcon: { fontSize: 16, color: '#C4B5C8', padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#1E1B4B', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  emptyText: { fontSize: 15, color: '#C4B5C8', fontWeight: '600' },

  groupLetter: {
    fontSize: 12, fontWeight: '800', color: '#C4B5C8', letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 16, marginBottom: 6, paddingLeft: 4,
  },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 6,
    shadowColor: '#FF6B9D', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
    borderWidth: 1.5, borderColor: '#FCE7F3',
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF5F8',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  itemSourceEmoji: { fontSize: 18 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  itemQty: { fontSize: 12, color: '#C4B5C8', marginTop: 2, fontWeight: '500' },
  itemDate: { fontSize: 11, color: '#E5D5E5' },

  hint: { textAlign: 'center', fontSize: 12, color: '#E8D5E8', marginTop: 8 },

  fab: {
    position: 'absolute', right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FF6B9D', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B9D', shadowOpacity: 0.5, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
});
