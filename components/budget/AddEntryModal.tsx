import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Category, CATEGORIES, SpendingEntry, today } from '../../store/budget';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (entry: Omit<SpendingEntry, 'id' | 'timestamp'>) => void;
}

export default function AddEntryModal({ visible, onClose, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<Category>('groceries');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (!visible) { setAmount(''); setDescription(''); setCategory('groceries'); }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    onAdd({ date: today(), amount: val, category, description: description.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.handle} />
            <Text style={s.title}>What did you spend on?</Text>

            <View style={s.categoryGrid}>
              {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(
                ([key, cat]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      s.categoryBtn,
                      category === key && { backgroundColor: cat.color + '18', borderColor: cat.color },
                    ]}
                    onPress={() => setCategory(key)}
                  >
                    <Text style={s.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={[s.categoryLabel, category === key && { color: cat.color, fontWeight: '700' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={s.label}>Amount</Text>
            <View style={s.amountRow}>
              <Text style={s.dollar}>$</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#D1C4D4"
                autoFocus
              />
            </View>

            <Text style={s.label}>Note (optional)</Text>
            <TextInput
              style={s.descInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Whole Foods haul 🛍️"
              placeholderTextColor="#D1C4D4"
              returnKeyType="done"
            />

            <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
              <Text style={s.addBtnText}>Add it!</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(30,15,40,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 16, maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#F3E8FF',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  categoryBtn: {
    width: '31%', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 14, borderWidth: 2, borderColor: '#F3E8FF',
    alignItems: 'center', gap: 4, backgroundColor: '#FAFAFA',
  },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { fontSize: 11, color: '#C4B5C8', fontWeight: '600' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#FCE7F3', borderRadius: 16,
    backgroundColor: '#FFF5F8', paddingHorizontal: 16, marginBottom: 20,
  },
  dollar: { fontSize: 28, fontWeight: '800', color: '#C4B5C8', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: '#1E1B4B', paddingVertical: 14 },

  descInput: {
    borderWidth: 2, borderColor: '#FCE7F3', borderRadius: 14,
    padding: 14, fontSize: 16, color: '#1E1B4B',
    backgroundColor: '#FFF5F8', marginBottom: 24,
  },

  addBtn: {
    backgroundColor: '#FF6B9D', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12,
    shadowColor: '#FF6B9D', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  addBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#C4B5C8', fontSize: 15 },
});
