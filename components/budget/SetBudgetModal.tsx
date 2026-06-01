import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BudgetSettings, today } from '../../store/budget';

interface Props {
  visible: boolean;
  current: BudgetSettings | null;
  onClose: () => void;
  onSave: (settings: BudgetSettings) => void;
}

export default function SetBudgetModal({ visible, current, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (current) setAmount(String(current.dailyBudget));
  }, [current, visible]);

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
    onSave({ dailyBudget: val, startDate: current?.startDate ?? today() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.handle} />
            <Text style={s.emoji}>💸</Text>
            <Text style={s.title}>Your daily budget</Text>
            <Text style={s.sub}>
              Anything you don't spend rolls over to tomorrow — every saved dollar counts!
            </Text>

            <TextInput
              style={s.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="$30"
              placeholderTextColor="#D1C4D4"
              autoFocus
            />

            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={s.saveBtnText}>Let's go! ✨</Text>
            </TouchableOpacity>

            {current && (
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,15,40,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingTop: 16,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#F3E8FF',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#1E1B4B', marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 28, lineHeight: 21, textAlign: 'center' },
  input: {
    borderWidth: 2, borderColor: '#FCE7F3', borderRadius: 16,
    padding: 18, fontSize: 32, fontWeight: '800', color: '#1E1B4B',
    backgroundColor: '#FFF5F8', marginBottom: 24, textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#FF6B9D', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12,
    shadowColor: '#FF6B9D', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#C4B5C8', fontSize: 15 },
});
