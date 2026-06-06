import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  loadPantry, addPantryItem, updatePantryItem, deletePantryItem, PantryItem,
} from '../../store/pantry';
import AddPantryModal from '../../components/pantry/AddPantryModal';
import EditPantryModal from '../../components/pantry/EditPantryModal';
import HeroHeader from '../../components/HeroHeader';
import { fab, darkSearch } from '../../lib/sharedStyles';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

const DOT_PALETTE = [
  '#8a7aaa', '#7BAFD4', '#94B8A4', '#E87830',
  '#D4A574', '#9a8aaa', '#7CC8A4', '#F4A8A8',
];

function itemColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return DOT_PALETTE[Math.abs(h) % DOT_PALETTE.length];
}

export default function PantryTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => setItems(await loadPantry(user?.uid));
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = async (id: string) => {
    setItems(await deletePantryItem(items, id, user?.uid));
  };

  const handleEdit = async (id: string, displayName: string, itemName: string) => {
    setItems(await updatePantryItem(items, id, { displayName, itemName }, user?.uid));
    setEditing(null);
  };

  const filtered = search.trim()
    ? items.filter((i) => i.itemName.includes(search.toLowerCase().trim()))
    : items;

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
    <View style={s.root}>
      <HeroHeader
        title="Pantry"
        cardColor={theme.heroPantry}
      >
        <View style={darkSearch.wrap}>
          <TextInput
            style={darkSearch.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Search your pantry…"
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
        {items.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing stocked yet.</Text>
            <Text style={s.emptySub}>
              Tap + to add items, or scan a receipt in the Prices tab — they'll show up here automatically.
            </Text>
          </View>
        )}

        {items.length > 0 && filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyText}>Nothing matches "{search}"</Text>
          </View>
        )}

        {Object.entries(grouped).map(([letter, groupItems]) => (
          <View key={letter}>
            <Text style={s.groupLetter}>{letter}</Text>
            {groupItems.map((item) => {
              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.itemRow}
                  onPress={() => setEditing(item)}
                  activeOpacity={0.7}
                >
                  <View style={[s.itemDot, { backgroundColor: itemColor(item.itemName) }]} />
                  <View style={s.itemInfo}>
                    <Text style={s.itemName}>{item.displayName}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={s.deleteX}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={{ height: 110 }} />
      </ScrollView>

      <TouchableOpacity
        style={[fab.btn, { bottom: insets.bottom + 72 }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.85}
      >
        <Text style={fab.label}>+</Text>
      </TouchableOpacity>

      <AddPantryModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (item) => {
          setItems(await addPantryItem(items, item, user?.uid));
          setShowAdd(false);
        }}
      />
      <EditPantryModal
        item={editing}
        onClose={() => setEditing(null)}
        onSave={handleEdit}
        onDelete={async (id) => {
          setItems(await deletePantryItem(items, id, user?.uid));
          setEditing(null);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  heroStats: {
    fontSize: 12, color: theme.textFaint,
    fontWeight: '500', marginBottom: 12,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textDark, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.textFaint, textAlign: 'center', lineHeight: 22 },
  emptyText: { fontSize: 15, color: theme.textFaint, fontWeight: '600' },

  groupLetter: {
    fontSize: 12, fontWeight: '800', color: theme.textFaint, letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 16, marginBottom: 6, paddingLeft: 4,
  },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
  },
  itemDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: theme.textDark },
  deleteBtn: { padding: 4 },
  deleteX: { fontSize: 14, color: theme.textFaint, fontWeight: '700' },
});
