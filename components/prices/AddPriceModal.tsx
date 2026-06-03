import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PriceEntry, Unit, UNITS } from '../../store/prices';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (entry: Omit<PriceEntry, 'id'>) => void;
  prefill?: Partial<PriceEntry>;
  existingCategories?: string[];
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddPriceModal({ visible, onClose, onAdd, prefill, existingCategories = [] }: Props) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [group, setGroup] = useState('');

  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<Unit>('oz');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (visible && prefill) {
      setDisplayName(prefill.displayName ?? '');
      setGroup(prefill.itemName ?? '');

      setStore(prefill.store ?? '');
      setPrice(prefill.price ? String(prefill.price) : '');
      setSize(prefill.size ? String(prefill.size) : '');
      setUnit(prefill.unit ?? 'oz');
    }
    if (!visible) {
      setDisplayName(''); setGroup(''); setStore('');
      setPrice(''); setSize(''); setUnit('oz'); setShowUnitPicker(false);
    }
  }, [visible, prefill]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleAdd = () => {
    const priceVal = parseFloat(price);
    const sizeVal = parseFloat(size);
    if (!displayName.trim() || isNaN(priceVal) || priceVal <= 0) return;
    const resolvedGroup = group.trim().toLowerCase() || displayName.trim().toLowerCase();
    onAdd({
      itemName: resolvedGroup,
      displayName: displayName.trim(),

      store: store.trim(),
      price: priceVal,
      size: isNaN(sizeVal) ? 1 : sizeVal,
      unit,
      dateAdded: today(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>Track a price</Text>

            <Text style={modalSheet.label}>Item Name *</Text>
            <TextInput style={modalSheet.input} value={displayName} onChangeText={setDisplayName}
              placeholder="e.g. Whole Milk" placeholderTextColor={theme.placeholder} autoFocus />

            <Text style={modalSheet.label}>Group *</Text>
            <TextInput style={modalSheet.input} value={group} onChangeText={(v) => setGroup(v.toLowerCase())}
              placeholder="e.g. milk" placeholderTextColor={theme.placeholder} />
            {existingCategories.length > 0 && (
              <View style={s.catChipRow}>
                {existingCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.catChip, group === cat && s.catChipActive]}
                    onPress={() => setGroup(cat)}
                  >
                    <Text style={[s.catChipText, group === cat && s.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
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

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleAdd}>
              <Text style={modalSheet.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
              <Text style={modalSheet.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  catChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, marginTop: -8 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bgTint,
  },
  catChipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  catChipText: { fontSize: 13, color: theme.textFaint, fontWeight: '600' },
  catChipTextActive: { color: theme.primary, fontWeight: '800' },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sizeInput: { flex: 1, marginBottom: 0 },
  unitBtn: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 14,
    paddingHorizontal: 18, justifyContent: 'center', backgroundColor: theme.bgTint,
  },
  unitBtnText: { fontSize: 15, fontWeight: '700', color: theme.textDark },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bgTint,
  },
  unitChipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  unitChipText: { fontSize: 13, color: theme.textFaint, fontWeight: '600' },
  unitChipTextActive: { color: theme.primary, fontWeight: '800' },
});
