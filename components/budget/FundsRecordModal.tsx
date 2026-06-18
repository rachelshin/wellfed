import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FundsRecord, today } from '../../store/budget';
import { modalSheet } from '../../lib/sharedStyles';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import theme from '../../lib/theme';
import DateField from './DateField';

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
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const iosPWAKeyboard = useIosPWAKeyboard();

  useEffect(() => {
    if (visible) {
      setAmount(record ? String(record.amount) : '');
      setNote(record?.note ?? '');
      setDate(record?.date ?? today());
    } else {
      setAmount('');
      setNote('');
      setDate(today());
      setSaving(false);
    }
  }, [visible, record]);

  const handleSave = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || saving) return;
    setSaving(true);
    onSave({
      date,
      amount: val,
      note: note.trim(),
      type: record?.type ?? 'manual',
    });
    onClose();
  };

  const title = isEdit ? (record!.type === 'daily-increment' ? 'Edit Daily Budget' : 'Edit Funds') : 'Add Funds';

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>{title}</Text>

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
                autoFocus
              />
            </View>

            <DateField value={date} onChange={setDate} />

            <Text style={modalSheet.label}>Note (optional)</Text>
            <TextInput
              style={modalSheet.input}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. ATM withdrawal"
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
            />

            <TouchableOpacity style={[modalSheet.primaryBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
              <Text style={modalSheet.primaryBtnText}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>

            {isEdit && onDelete && (
              <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
                <Text style={s.deleteBtnText}>Delete record</Text>
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
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 16,
    backgroundColor: theme.bgTint, paddingHorizontal: 16, marginBottom: 20,
  },
  plus: { fontSize: 28, fontWeight: '800', color: theme.positive, marginRight: 2 },
  dollar: { fontSize: 28, fontWeight: '800', color: theme.textFaint, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: theme.textDark, paddingVertical: 14, outlineWidth: 0 },

  deleteBtn: { padding: 14, alignItems: 'center', marginBottom: 4 },
  deleteBtnText: { color: theme.negative, fontSize: 15, fontWeight: '600' },
});
