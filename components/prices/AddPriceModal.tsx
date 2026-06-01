import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PriceEntry, Unit, UNITS } from '../../store/prices';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (entry: Omit<PriceEntry, 'id'>) => void;
  prefill?: Partial<PriceEntry>;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddPriceModal({ visible, onClose, onAdd, prefill }: Props) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [brand, setBrand] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<Unit>('oz');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (visible && prefill) {
      setDisplayName(prefill.displayName ?? '');
      setBrand(prefill.brand ?? '');
      setStore(prefill.store ?? '');
      setPrice(prefill.price ? String(prefill.price) : '');
      setSize(prefill.size ? String(prefill.size) : '');
      setUnit(prefill.unit ?? 'oz');
    }
    if (!visible) {
      setDisplayName(''); setBrand(''); setStore('');
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
    onAdd({
      itemName: displayName.trim().toLowerCase(),
      displayName: displayName.trim(),
      brand: brand.trim(),
      store: store.trim(),
      price: priceVal,
      size: isNaN(sizeVal) ? 1 : sizeVal,
      unit,
      dateAdded: today(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.handle} />
            <Text style={s.title}>Track a price 🏷️</Text>

            <Text style={s.label}>Item Name *</Text>
            <TextInput style={s.input} value={displayName} onChangeText={setDisplayName}
              placeholder="e.g. Whole Milk" placeholderTextColor={theme.placeholder} autoFocus />

            <Text style={s.label}>Brand</Text>
            <TextInput style={s.input} value={brand} onChangeText={setBrand}
              placeholder="e.g. Organic Valley" placeholderTextColor={theme.placeholder} />

            <Text style={s.label}>Store *</Text>
            <TextInput style={s.input} value={store} onChangeText={setStore}
              placeholder="e.g. Trader Joe's" placeholderTextColor={theme.placeholder} />

            <Text style={s.label}>Price ($) *</Text>
            <TextInput style={s.input} value={price} onChangeText={setPrice}
              keyboardType="decimal-pad" placeholder="e.g. 4.99" placeholderTextColor={theme.placeholder} />

            <Text style={s.label}>Size & Unit</Text>
            <View style={s.sizeRow}>
              <TextInput style={[s.input, s.sizeInput]} value={size} onChangeText={setSize}
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

            <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
              <Text style={s.addBtnText}>Save price!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Never mind</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 16, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, backgroundColor: theme.handle, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: theme.textDark, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 2, borderColor: theme.border, borderRadius: 14,
    padding: 14, fontSize: 16, color: theme.textDark,
    backgroundColor: theme.bgTint, marginBottom: 16,
  },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sizeInput: { flex: 1, marginBottom: 0 },
  unitBtn: {
    borderWidth: 2, borderColor: theme.border, borderRadius: 14,
    paddingHorizontal: 18, justifyContent: 'center', backgroundColor: theme.bgTint,
  },
  unitBtnText: { fontSize: 15, fontWeight: '700', color: theme.textDark },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 2, borderColor: theme.border, backgroundColor: theme.bgTint,
  },
  unitChipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  unitChipText: { fontSize: 13, color: theme.textFaint, fontWeight: '600' },
  unitChipTextActive: { color: theme.primary, fontWeight: '800' },
  addBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 12,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  addBtnText: { color: theme.card, fontSize: 17, fontWeight: '800' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: theme.textFaint, fontSize: 15 },
});
