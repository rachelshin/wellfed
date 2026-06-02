import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onDelete?: () => void;
  initialName?: string;
}

export default function CategoryModal({ visible, onClose, onSave, onDelete, initialName }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);
  const isEdit = !!initialName;

  useEffect(() => {
    if (visible) setName(initialName ?? '');
    else setName('');
  }, [visible, initialName]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <Text style={modalSheet.title}>{isEdit ? 'Edit Category' : 'New Category'}</Text>

          <Text style={modalSheet.label}>Category Name</Text>
          <TextInput
            style={modalSheet.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Eggs, Bread, Tofu"
            placeholderTextColor={theme.placeholder}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleSave}>
            <Text style={modalSheet.primaryBtnText}>{isEdit ? 'Save' : 'Add Category'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
            <Text style={modalSheet.cancelText}>Cancel</Text>
          </TouchableOpacity>
          {onDelete && (
            <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
              <Text style={s.deleteBtnText}>Delete category</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  deleteBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  deleteBtnText: { fontSize: 15, color: theme.negative, fontWeight: '600' },
});
