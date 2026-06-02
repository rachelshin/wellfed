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
  entry: PriceEntry | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Omit<PriceEntry, 'id'>>) => void;
  onDelete: (id: string) => void;
  existingCategories: string[];
}

export default function EditPriceModal({ entry, onClose, onSave, onDelete, existingCategories }: Props) {
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
    if (entry) {
      setDisplayName(entry.displayName);
      setGroup(entry.itemName);
      setStore(entry.store);
      setPrice(String(entry.price));
      setSize(String(entry.size));
      setUnit(entry.unit);
    }
  }, [entry]);

  useEffect(() => {
    if (!entry) {
      setDisplayName(''); setGroup(''); setStore(''); setPrice('');
      setSize(''); setUnit('oz'); setShowUnitPicker(false);
    }
  }, [entry]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleSave = () => {
    const priceVal = parseFloat(price);
    const sizeVal = parseFloat(size);
    if (!displayName.trim() || isNaN(priceVal) || priceVal <= 0 || !entry) return;
    const resolvedGroup = group.trim().toLowerCase() || displayName.trim().toLowerCase();
    onSave(entry.id, {
      displayName: displayName.trim(),
      itemName: resolvedGroup,
      store: store.trim(),
      price: priceVal,
      size: isNaN(sizeVal) ? 1 : sizeVal,
      unit,
    });
  };

  return (
    <Modal visible={!!entry} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>Edit Price</Text>

            <Text style={modalSheet.label}>Item Name</Text>
            <TextInput style={modalSheet.input} value={displayName} onChangeText={setDisplayName}
              placeholder="e.g. Organic Firm Tofu" placeholderTextColor={theme.placeholder} autoFocus />

            <Text style={modalSheet.label}>Group</Text>
            <TextInput style={modalSheet.input} value={group} onChangeText={(v) => setGroup(v.toLowerCase())}
              placeholder="e.g. tofu" placeholderTextColor={theme.placeholder} />
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

            <Text style={modalSheet.label}>Store</Text>
            <TextInput style={modalSheet.input} value={store} onChangeText={setStore}
              placeholder="e.g. Trader Joe's" placeholderTextColor={theme.placeholder} />

            <Text style={modalSheet.label}>Price ($)</Text>
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

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
              <Text style={modalSheet.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
              <Text style={modalSheet.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={() => entry && onDelete(entry.id)}>
              <Text style={s.deleteBtnText}>Remove this price</Text>
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
