import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FundsRecord, today } from '../../store/budget';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  record?: FundsRecord | null;
  onSave: (record: Omit<FundsRecord, 'id' | 'timestamp'>) => void;
  onDelete?: () => void;
}

export default function FundsRecordModal({ visible, onClose, record, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const isEdit = !!record;
  const isDailyIncrement = record?.type === 'daily-increment';
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (visible) {
      setAmount(record ? String(record.amount) : '');
      setNote(record?.note ?? '');
    } else {
      setAmount('');
      setNote('');
    }
  }, [visible, record]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleSave = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    onSave({
      date: record?.date ?? today(),
      amount: val,
      note: note.trim(),
      type: record?.type ?? 'manual',
    });
  };

  const title = isEdit
    ? (isDailyIncrement ? 'Daily Budget' : 'Edit Funds')
    : 'Add Funds';

  return (
    <AppModal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>{title}</Text>

            {isDailyIncrement && (
              <View style={s.infoBadge}>
                <Text style={s.infoText}>Auto-generated daily budget record</Text>
              </View>
            )}

            <Text style={modalSheet.label}>Amount</Text>
            <View style={s.amountRow}>
              <Text style={s.plus}>+</Text>
              <Text style={s.dollar}>$</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.placeholder}
                autoFocus={!isDailyIncrement}
                editable={!isDailyIncrement}
              />
            </View>

            <Text style={modalSheet.label}>Note (optional)</Text>
            <TextInput
              style={modalSheet.input}
              value={note}
              onChangeText={setNote}
              placeholder={isDailyIncrement ? 'Daily budget added' : 'e.g. ATM withdrawal'}
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
            />

            {!isDailyIncrement && (
              <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
                <Text style={modalSheet.primaryBtnText}>{isEdit ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            )}

            {isEdit && onDelete && !isDailyIncrement && (
              <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
                <Text style={s.deleteBtnText}>Delete record</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
              <Text style={modalSheet.cancelText}>
                {isDailyIncrement ? 'Close' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  infoBadge: {
    backgroundColor: theme.primaryLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20,
  },
  infoText: { fontSize: 13, color: theme.textMuted, fontWeight: '600' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 16,
    backgroundColor: theme.bgTint, paddingHorizontal: 16, marginBottom: 20,
  },
  plus: { fontSize: 28, fontWeight: '800', color: '#4CAF50', marginRight: 2 },
  dollar: { fontSize: 28, fontWeight: '800', color: theme.textFaint, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: theme.textDark, paddingVertical: 14 },

  deleteBtn: { padding: 14, alignItems: 'center', marginBottom: 4 },
  deleteBtnText: { color: theme.negative, fontSize: 15, fontWeight: '600' },
});
