import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalSheet } from '../../lib/sharedStyles';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentAvailable: number;
  onSave: (newAmount: number) => void;
}

export default function EditAvailableModal({ visible, onClose, currentAvailable, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const iosPWAKeyboard = useIosPWAKeyboard();

  useEffect(() => {
    if (visible) {
      setValue(currentAvailable.toFixed(2));
    } else {
      setValue('');
      setSaving(false);
    }
  }, [visible, currentAvailable]);

  const handleSave = () => {
    const val = parseFloat(value);
    if (isNaN(val) || saving) return;
    if (val === currentAvailable) { onClose(); return; }
    setSaving(true);
    onSave(val);
    onClose();
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>Set available balance</Text>
            <Text style={s.hint}>
              Enter the amount you actually have available. An adjustment record will be added to your history.
            </Text>

            <Text style={modalSheet.label}>Available</Text>
            <View style={s.amountRow}>
              <Text style={s.dollar}>$</Text>
              <TextInput
                style={s.amountInput}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <TouchableOpacity
              style={[modalSheet.primaryBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={modalSheet.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>

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
  hint: {
    fontSize: 14, color: theme.textMuted, marginBottom: 20, lineHeight: 20,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 16,
    backgroundColor: theme.bgTint, paddingHorizontal: 16, marginBottom: 24,
  },
  dollar: { fontSize: 28, fontWeight: '800', color: theme.textFaint, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: theme.textDark, paddingVertical: 14, outlineWidth: 0 },
});
