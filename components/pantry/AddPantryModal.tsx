import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantryItem, todayDate } from '../../store/pantry';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PantryItem, 'id'>) => void;
}

export default function AddPantryModal({ visible, onClose, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (!visible) { setName(''); setQuantity(''); }
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
    if (!name.trim()) return;
    onAdd({
      displayName: name.trim(),
      itemName: name.trim().toLowerCase(),
      quantity: quantity.trim() || 'some',
      addedDate: todayDate(),
      source: 'manual',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.handle} />
            <Text style={s.title}>Add to Pantry 🥫</Text>

            <Text style={s.label}>Item Name *</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Pasta, Eggs, Olive oil"
              placeholderTextColor={theme.placeholder}
              autoFocus
            />

            <Text style={s.label}>Quantity</Text>
            <TextInput
              style={s.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 2 bags, half a jar, plenty"
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />

            <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
              <Text style={s.addBtnText}>Add to Pantry</Text>
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
    padding: 24, paddingTop: 16,
  },
  handle: { width: 40, height: 4, backgroundColor: theme.handle, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: theme.textDark, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 2, borderColor: theme.border, borderRadius: 14,
    padding: 14, fontSize: 16, color: theme.textDark,
    backgroundColor: theme.bgTint, marginBottom: 16,
  },
  addBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 12,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  addBtnText: { color: theme.card, fontSize: 17, fontWeight: '800' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: theme.textFaint, fontSize: 15 },
});
