import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantryItem } from '../../store/pantry';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  item: PantryItem | null;
  onClose: () => void;
  onSave: (id: string, displayName: string, itemName: string, quantity: string) => void;
}

export default function EditPantryModal({ item, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (item) {
      setName(item.displayName);
      setQuantity(item.quantity);
    }
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
    onSave(item.id, name.trim(), name.trim().toLowerCase(), quantity.trim() || 'some');
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
            />

            <Text style={modalSheet.label}>Quantity</Text>
            <TextInput
              style={modalSheet.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 2 bags, half a jar"
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
              <Text style={modalSheet.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
              <Text style={modalSheet.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
