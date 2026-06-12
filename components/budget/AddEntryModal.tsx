import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Category, CATEGORIES, SpendingEntry, today } from '../../store/budget';
import { modalSheet } from '../../lib/sharedStyles';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import theme from '../../lib/theme';
import DateField from './DateField';

interface Props {
  visible: boolean;
  onClose: () => void;
  entry?: SpendingEntry | null;
  onSave: (entry: Omit<SpendingEntry, 'id' | 'timestamp'>) => void;
  onDelete?: () => void;
}

export default function AddEntryModal({ visible, onClose, entry, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const isEdit = !!entry;
  const [category, setCategory] = useState<Category>('groceries');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const iosPWAKeyboard = useIosPWAKeyboard();

  useEffect(() => {
    if (visible) {
      setCategory(entry?.category ?? 'groceries');
      setAmount(entry ? String(entry.amount) : '');
      setDescription(entry?.description ?? '');
      setDate(entry?.date ?? today());
    } else {
      setCategory('groceries');
      setAmount('');
      setDescription('');
      setDate(today());
    }
  }, [visible, entry]);

  const handleSave = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    onSave({ date, amount: val, category, description: description.trim() });
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>{isEdit ? 'Edit entry' : 'What did you spend on?'}</Text>

            <View style={s.categoryGrid}>
              {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][])
                .filter(([key]) => key !== 'drinks')
                .map(([key, cat]) => (
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

            <Text style={modalSheet.label}>Amount</Text>
            <View style={s.amountRow}>
              <Text style={s.dollar}>$</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.placeholder}
                autoFocus
              />
            </View>

            <DateField value={date} onChange={setDate} />

            <Text style={modalSheet.label}>Note (optional)</Text>
            <TextInput
              style={modalSheet.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Whole Foods haul"
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
            />

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
              <Text style={modalSheet.primaryBtnText}>{isEdit ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>

            {isEdit && onDelete && (
              <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
                <Text style={s.deleteBtnText}>Delete entry</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
              <Text style={modalSheet.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  categoryBtn: {
    width: '31%', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 14, borderWidth: 2, borderColor: theme.border,
    alignItems: 'center', gap: 4, backgroundColor: theme.bg,
  },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { fontSize: 11, color: theme.textFaint, fontWeight: '600' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 16,
    backgroundColor: theme.bgTint, paddingHorizontal: 16, marginBottom: 20,
  },
  dollar: { fontSize: 28, fontWeight: '800', color: theme.textFaint, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: theme.textDark, paddingVertical: 14, outlineWidth: 0 },

  deleteBtn: { padding: 14, alignItems: 'center', marginBottom: 4 },
  deleteBtnText: { color: theme.negative, fontSize: 15, fontWeight: '600' },
});
