import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onDelete?: (keepEntries: boolean) => void;
  initialName?: string;
  entryCount?: number;
  existingNames?: string[];
}

export default function CategoryModal({ visible, onClose, onSave, onDelete, initialName, entryCount = 0, existingNames = [] }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);
  const isEdit = !!initialName;

  useEffect(() => {
    if (visible) {
      setName(initialName ?? '');
      setConfirmingDelete(false);
    } else {
      setName('');
      setConfirmingDelete(false);
    }
  }, [visible, initialName]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const isDuplicate = existingNames.some(
    (n) => n.toLowerCase() === name.trim().toLowerCase() && n.toLowerCase() !== initialName?.toLowerCase(),
  );

  const handleSave = () => {
    if (!name.trim() || isDuplicate) return;
    onSave(name.trim());
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          {confirmingDelete ? (
            <>
              <Text style={modalSheet.title}>Delete "{initialName}"?</Text>
              {entryCount > 0 ? (
                <>
                  <Text style={s.confirmText}>
                    This category has {entryCount} price {entryCount === 1 ? 'entry' : 'entries'}.
                    What should happen to them?
                  </Text>
                  <TouchableOpacity
                    style={s.keepBtn}
                    onPress={() => { onDelete?.(true); setConfirmingDelete(false); }}
                  >
                    <Text style={s.keepBtnText}>Move to Uncategorized</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.deleteEntriesBtn}
                    onPress={() => { onDelete?.(false); setConfirmingDelete(false); }}
                  >
                    <Text style={s.deleteEntriesBtnText}>Delete entries too</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={s.deleteEntriesBtn}
                  onPress={() => { onDelete?.(false); setConfirmingDelete(false); }}
                >
                  <Text style={s.deleteEntriesBtnText}>Delete category</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={modalSheet.cancelBtn} onPress={() => setConfirmingDelete(false)}>
                <Text style={modalSheet.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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
              {isDuplicate && (
                <Text style={s.dupError}>A category with this name already exists.</Text>
              )}

              <TouchableOpacity style={[modalSheet.primaryBtn, isDuplicate && s.btnDisabled]} onPress={handleSave}>
                <Text style={modalSheet.primaryBtnText}>{isEdit ? 'Save' : 'Add Category'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
                <Text style={modalSheet.cancelText}>Cancel</Text>
              </TouchableOpacity>
              {onDelete && (
                <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmingDelete(true)}>
                  <Text style={s.deleteBtnText}>Delete category</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  confirmText: {
    fontSize: 15, color: theme.textFaint, lineHeight: 22, marginBottom: 20,
  },
  keepBtn: {
    backgroundColor: theme.bgTint, borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 12,
    borderWidth: 1.5, borderColor: theme.border,
  },
  keepBtnText: { fontSize: 16, fontWeight: '700', color: theme.textDark },
  deleteEntriesBtn: { alignItems: 'center', paddingVertical: 14, marginBottom: 4 },
  deleteEntriesBtnText: { fontSize: 15, color: theme.negative, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  deleteBtnText: { fontSize: 15, color: theme.negative, fontWeight: '600' },
  dupError: { fontSize: 13, color: theme.negative, marginTop: -8, marginBottom: 12 },
  btnDisabled: { opacity: 0.4 },
});
