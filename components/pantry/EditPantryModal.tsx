import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  ScrollView, StyleSheet,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantryItem } from '../../store/pantry';
import { toTitleCase } from '../../lib/utils';
import { modalSheet } from '../../lib/sharedStyles';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
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
  const [saving, setSaving] = useState(false);
  const iosPWAKeyboard = useIosPWAKeyboard();

  useEffect(() => {
    if (item) setName(item.displayName);
    else setSaving(false);
  }, [item]);

  const handleSave = () => {
    if (!name.trim() || !item || saving) return;
    setSaving(true);
    onSave(item.id, toTitleCase(name.trim()), name.trim().toLowerCase());
    onClose();
  };

  return (
    <AppModal visible={!!item} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
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

            <TouchableOpacity style={[modalSheet.primaryBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
              <Text style={modalSheet.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
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
    </AppModal>
  );
}

const s = StyleSheet.create({
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  deleteBtn: { alignItems: 'center', paddingVertical: 8 },
  deleteBtnText: { fontSize: 15, color: theme.negative, fontWeight: '600' },
});
