import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose?: () => void;
  currentValue: number | null;
  onSave: (value: number) => void;
}

export default function EditDailyBudgetModal({ visible, onClose, currentValue, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (visible) {
      setValue(currentValue != null ? String(currentValue) : '');
    } else {
      setValue('');
    }
  }, [visible, currentValue]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleSave = () => {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    onSave(val);
  };

  const isFirstTime = currentValue == null;

  return (
    <AppModal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>
              {isFirstTime ? 'Set your daily budget' : 'Edit daily budget'}
            </Text>

            <Text style={modalSheet.label}>Amount per day</Text>
            <View style={s.amountRow}>
              <Text style={s.dollar}>$</Text>
              <TextInput
                style={s.amountInput}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.placeholder}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
              <Text style={modalSheet.primaryBtnText}>{isFirstTime ? 'Set budget' : 'Save'}</Text>
            </TouchableOpacity>

            {!isFirstTime && onClose && (
              <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
                <Text style={modalSheet.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
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
    backgroundColor: theme.bgTint, paddingHorizontal: 16, marginBottom: 24,
  },
  dollar: { fontSize: 28, fontWeight: '800', color: theme.textFaint, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: theme.textDark, paddingVertical: 14 },
});
