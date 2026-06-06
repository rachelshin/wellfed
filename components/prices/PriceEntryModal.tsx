import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import DatePicker from '../DatePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PriceEntry, Unit, UNITS, pricePerUnit, formatPricePerUnit } from '../../store/prices';
import { toTitleCase } from '../../lib/utils';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  entry?: PriceEntry | null;
  prefill?: Partial<PriceEntry>;
  existingCategories?: string[];
  existingStores?: string[];
  onClose: () => void;
  onSave: (data: Omit<PriceEntry, 'id'>, id?: string) => void;
  onDelete?: (id: string) => void;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PriceEntryModal({ visible, entry, prefill, existingCategories = [], existingStores = [], onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<Unit>('oz');
  const [dateAdded, setDateAdded] = useState(today());
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (!visible) {
      setViewMode(false);
      setDisplayName(''); setCategory(''); setStore('');
      setPrice(''); setSize(''); setUnit('oz'); setShowUnitPicker(false);
      setDateAdded(today());
      return;
    }
    setViewMode(!!entry);
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

  const filteredStores = store.trim()
    ? existingStores.filter((n) => n.toLowerCase().includes(store.trim().toLowerCase())).slice(0, 6)
    : existingStores.slice(0, 6);

  const handleSave = () => {
    const priceVal = parseFloat(price);
    const sizeVal = parseFloat(size);
    if (!displayName.trim() || isNaN(priceVal) || priceVal <= 0) return;
    const matched = existingCategories.find((n) => n.toLowerCase() === category.trim().toLowerCase());
    const resolvedCategory = matched
      ? matched.toLowerCase()
      : category.trim().toLowerCase() || displayName.trim().toLowerCase();
    onSave(
      {
        category: resolvedCategory,
        itemName: toTitleCase(displayName.trim()),
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

  // ── INFO CARD (edit mode, initial view) ──────────────────────────────────
  if (viewMode && entry) {
    const ppu = pricePerUnit(entry);
    const ppuStr = isFinite(ppu) ? formatPricePerUnit(entry, undefined) : '';

    return (
      <AppModal visible={visible} animationType="slide" transparent>
        <View style={modalSheet.backdrop}>
          <View style={[s.infoSheet, { paddingBottom: insets.bottom + 24 }]}>
            <TouchableOpacity style={s.infoCard} onPress={() => setViewMode(false)} activeOpacity={0.85}>
              <View style={s.infoTop}>
                <View style={s.infoLeft}>
                  <Text style={s.infoName}>{entry.itemName}</Text>
                  <Text style={s.infoStore}>{entry.store || 'Unknown store'}</Text>
                </View>
                <View style={s.infoRight}>
                  <Text style={s.infoPPU}>{ppuStr}</Text>
                  <Text style={s.infoPackage}>{entry.size} {entry.unit} · ${entry.price.toFixed(2)}</Text>
                </View>
              </View>
              <View style={s.infoFooter}>
                <Text style={s.infoCategory}>{entry.category}</Text>
                <Text style={s.infoDate}>{entry.dateAdded}</Text>
              </View>
              <Text style={s.infoHint}>Tap to edit</Text>
            </TouchableOpacity>

            {onDelete && (
              <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(entry.id)}>
                <Text style={s.deleteBtnText}>Remove this price</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
              <Text style={modalSheet.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
    );
  }

  // ── EDIT / ADD FORM ───────────────────────────────────────────────────────
  return (
    <AppModal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>{isEdit ? 'Edit price' : 'Track a price'}</Text>

            <Text style={modalSheet.label}>Item Name *</Text>
            <TextInput style={modalSheet.input} value={displayName} onChangeText={setDisplayName}
              placeholder="e.g. Organic Whole Milk" placeholderTextColor={theme.placeholder} />

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
                    <TouchableOpacity key={name} style={[s.chip, active && s.chipActive]} onPress={() => setCategory(name)}>
                      <Text style={[s.chipText, active && s.chipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={modalSheet.label}>Store *</Text>
            <TextInput style={modalSheet.input} value={store} onChangeText={setStore}
              placeholder="e.g. Trader Joe's" placeholderTextColor={theme.placeholder} />
            {filteredStores.length > 0 && (
              <View style={s.chipRow}>
                {filteredStores.map((name) => {
                  const active = name.toLowerCase() === store.trim().toLowerCase();
                  return (
                    <TouchableOpacity key={name} style={[s.chip, active && s.chipActive]} onPress={() => setStore(name)}>
                      <Text style={[s.chipText, active && s.chipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

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
            <TouchableOpacity style={modalSheet.cancelBtn} onPress={isEdit ? () => setViewMode(true) : onClose}>
              <Text style={modalSheet.cancelText}>{isEdit ? 'Back' : 'Cancel'}</Text>
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
  // Info card
  infoSheet: {
    backgroundColor: theme.bg,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingTop: 28,
  },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 16, padding: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border,
    marginBottom: 8,
  },
  infoTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  infoLeft: { flex: 1, paddingRight: 12 },
  infoName: { fontSize: 20, fontWeight: '700', color: theme.textDark, marginBottom: 4 },
  infoStore: { fontSize: 14, color: theme.textFaint },
  infoRight: { alignItems: 'flex-end' },
  infoPPU: { fontSize: 22, fontWeight: '800', color: theme.textDark, fontVariant: ['tabular-nums'] },
  infoPackage: { fontSize: 12, color: theme.textFaint, marginTop: 3 },
  infoFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
  },
  infoCategory: { fontSize: 12, fontWeight: '600', color: theme.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoDate: { fontSize: 12, color: theme.textFaint },
  infoHint: { fontSize: 11, color: theme.textFaint, opacity: 0.5, textAlign: 'center', marginTop: 12 },

  // Form
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
