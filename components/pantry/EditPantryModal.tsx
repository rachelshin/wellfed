import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  Platform, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantryItem } from '../../store/pantry';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  item: PantryItem | null;
  onClose: () => void;
  onSave: (id: string, displayName: string, itemName: string) => void;
  onDelete: (id: string) => void;
}

export default function EditPantryModal({ item, onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (item) setName(item.displayName);
  }, [item]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleSave = () => {
    if (!name.trim() || !item) return;
    onSave(item.id, name.trim(), name.trim().toLowerCase());
  };

  return (
    <Modal visible={!!item} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>Edit Item</Text>

            <Text style={modalSheet.label}>Item Name</Text>
            <TextInput
              style={modalSheet.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Pasta, Eggs, Olive oil"
              placeholderTextColor={theme.placeholder}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
              <Text style={modalSheet.primaryBtnText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={modalSheet.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={() => item && onDelete(item.id)}>
            <Text style={s.deleteBtnText}>Remove from pantry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  deleteBtn: { alignItems: 'center', paddingVertical: 8 },
  deleteBtnText: { fontSize: 15, color: theme.negative, fontWeight: '600' },
});
