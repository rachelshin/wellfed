import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantryItem, todayDate } from '../../store/pantry';
import { modalSheet } from '../../lib/sharedStyles';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PantryItem, 'id'>) => void;
}

export default function AddPantryModal({ visible, onClose, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const iosPWAKeyboard = useIosPWAKeyboard();

  useEffect(() => {
    if (!visible) { setName(''); }
  }, [visible]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      displayName: name.trim(),
      itemName: name.trim().toLowerCase(),
      addedDate: todayDate(),
      source: 'manual',
    });
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>Add to Pantry</Text>

            <Text style={modalSheet.label}>Item Name *</Text>
            <TextInput
              style={modalSheet.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Pasta, Eggs, Olive oil"
              placeholderTextColor={theme.placeholder}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleAdd}>
              <Text style={modalSheet.primaryBtnText}>Add</Text>
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
