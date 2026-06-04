import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import DatePicker from '../DatePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PriceEntry, Unit, UNITS } from '../../store/prices';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  entry?: PriceEntry | null;
  prefill?: Partial<PriceEntry>;
  existingCategories?: string[];  // display names, e.g. ["Beef", "Beverages"]
  onClose: () => void;
  onSave: (data: Omit<PriceEntry, 'id'>, id?: string) => void;
  onDelete?: (id: string) => void;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PriceEntryModal({ visible, entry, prefill, existingCategories = [], onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('');  // holds the display name while typing/selecting
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<Unit>('oz');
  const [dateAdded, setDateAdded] = useState(today());
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (!visible) {
      setDisplayName(''); setCategory(''); setStore('');
      setPrice(''); setSize(''); setUnit('oz'); setShowUnitPicker(false);
      setDateAdded(today());
      return;
    }
    if (entry) {
      setDisplayName(entry.itemName);
      const matched = existingCategories.find((n) => n.toLowerCase() === entry.category);
      setCategory(matched ?? entry.category);
      setStore(entry.store);
      setPrice(String(entry.price));
      setSize(String(entry.size));
      setUnit(entry.unit);
      setDateAdded(entry.dateAdded);
    } else if (prefill) {
      setDisplayName(prefill.itemName ?? '');
      const matched = existingCategories.find((n) => n.toLowerCase() === prefill.category);
      setCategory(matched ?? prefill.category ?? '');
      setStore(prefill.store ?? '');
      setPrice(prefill.price ? String(prefill.price) : '');
      setSize(prefill.size ? String(prefill.size) : '');
      setUnit(prefill.unit ?? 'oz');
      setDateAdded(prefill.dateAdded ?? today());
    }
  }, [visible, entry, prefill]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const filteredCategories = category.trim()
    ? existingCategories.filter((n) => n.toLowerCase().includes(category.trim().toLowerCase())).slice(0, 6)
    : existingCategories.slice(0, 6);

  const handleSave = () => {
    const priceVal = parseFloat(price);
    const sizeVal = parseFloat(size);
    if (!displayName.trim() || isNaN(priceVal) || priceVal <= 0) return;
    // Resolve the category key: match display name case-insensitively, else lowercase the input
    const matched = existingCategories.find((n) => n.toLowerCase() === category.trim().toLowerCase());
    const resolvedCategory = matched
      ? matched.toLowerCase()
      : category.trim().toLowerCase() || displayName.trim().toLowerCase();
    onSave(
      {
        category: resolvedCategory,
        itemName: displayName.trim(),
        store: store.trim(),
        price: priceVal,
        size: isNaN(sizeVal) ? 1 : sizeVal,
        unit,
        dateAdded,
      },
      entry?.id,
    );
  };

  const isEdit = !!entry;

  return (
    <AppModal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>{isEdit ? 'Edit price' : 'Track a price'}</Text>

            <Text style={modalSheet.label}>Item Name *</Text>
            <TextInput style={modalSheet.input} value={displayName} onChangeText={setDisplayName}
              placeholder="e.g. Organic Whole Milk" placeholderTextColor={theme.placeholder} autoFocus />

            <Text style={modalSheet.label}>Category *</Text>
            <TextInput
              style={modalSheet.input}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Dairy"
              placeholderTextColor={theme.placeholder}
            />
            {filteredCategories.length > 0 && (
              <View style={s.chipRow}>
                {filteredCategories.map((name) => {
                  const active = name.toLowerCase() === category.trim().toLowerCase();
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setCategory(name)}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={modalSheet.label}>Store *</Text>
            <TextInput style={modalSheet.input} value={store} onChangeText={setStore}
              placeholder="e.g. Trader Joe's" placeholderTextColor={theme.placeholder} />

            <Text style={modalSheet.label}>Price ($) *</Text>
            <TextInput style={modalSheet.input} value={price} onChangeText={setPrice}
              keyboardType="decimal-pad" placeholder="e.g. 4.99" placeholderTextColor={theme.placeholder} />

            <Text style={modalSheet.label}>Size & Unit</Text>
            <View style={s.sizeRow}>
              <TextInput style={[modalSheet.input, s.sizeInput]} value={size} onChangeText={setSize}
                keyboardType="decimal-pad" placeholder="e.g. 64" placeholderTextColor={theme.placeholder} />
              <TouchableOpacity style={s.unitBtn} onPress={() => setShowUnitPicker(!showUnitPicker)}>
                <Text style={s.unitBtnText}>{unit} ▾</Text>
              </TouchableOpacity>
            </View>

            {showUnitPicker && (
              <View style={s.unitGrid}>
                {UNITS.map((u) => (
                  <TouchableOpacity key={u}
                    style={[s.unitChip, unit === u && s.unitChipActive]}
                    onPress={() => { setUnit(u); setShowUnitPicker(false); }}>
                    <Text style={[s.unitChipText, unit === u && s.unitChipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={modalSheet.label}>Date</Text>
            <DatePicker value={dateAdded} onChange={setDateAdded} />

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
              <Text style={modalSheet.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
              <Text style={modalSheet.cancelText}>Cancel</Text>
            </TouchableOpacity>
            {isEdit && onDelete && (
              <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(entry!.id)}>
                <Text style={s.deleteBtnText}>Remove this price</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bgTint,
  },
  chipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  chipText: { fontSize: 12, color: theme.textFaint, fontWeight: '600' },
  chipTextActive: { color: theme.primary, fontWeight: '800' },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sizeInput: { flex: 1, marginBottom: 0 },
  unitBtn: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 14,
    paddingHorizontal: 18, justifyContent: 'center', backgroundColor: theme.bgTint,
  },
  unitBtnText: { fontSize: 16, fontWeight: '700', color: theme.textDark },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bgTint,
  },
  unitChipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  unitChipText: { fontSize: 13, color: theme.textFaint, fontWeight: '600' },
  unitChipTextActive: { color: theme.primary, fontWeight: '800' },
  deleteBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  deleteBtnText: { fontSize: 15, color: theme.negative, fontWeight: '600' },
});
