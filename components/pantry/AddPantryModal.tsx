import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  ScrollView, StyleSheet,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantryItem, todayDate } from '../../store/pantry';
import { toTitleCase } from '../../lib/utils';
import { modalSheet } from '../../lib/sharedStyles';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (items: Array<Omit<PantryItem, 'id'>>) => void;
}

export default function AddPantryModal({ visible, onClose, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [queued, setQueued] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const iosPWAKeyboard = useIosPWAKeyboard();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) { setName(''); setQueued([]); setSaving(false); }
  }, [visible]);

  const addToQueue = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (!queued.some((q) => q.toLowerCase() === lower)) {
      setQueued((prev) => [...prev, trimmed]);
    }
    setName('');
    inputRef.current?.focus();
  };

  const removeFromQueue = (index: number) => {
    setQueued((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const pending = name.trim();
    const all = pending
      ? [...queued, ...(queued.some((q) => q.toLowerCase() === pending.toLowerCase()) ? [] : [pending])]
      : queued;
    if (all.length === 0 || saving) return;
    setSaving(true);
    onAdd(
      all.map((raw) => ({
        displayName: toTitleCase(raw),
        itemName: raw.toLowerCase(),
        addedDate: todayDate(),
        source: 'manual' as const,
      })),
    );
  };

  const total = queued.length + (name.trim() && !queued.some((q) => q.toLowerCase() === name.trim().toLowerCase()) ? 1 : 0);

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>Add to Pantry</Text>

            <View style={s.inputRow}>
              <TextInput
                ref={inputRef}
                style={[modalSheet.input, s.inputFlex]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Pasta, Eggs, Olive oil"
                placeholderTextColor={theme.placeholder}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addToQueue}
              />
              <TouchableOpacity
                style={[s.addBtn, !name.trim() && s.addBtnDisabled]}
                onPress={addToQueue}
                disabled={!name.trim()}
                activeOpacity={0.75}
              >
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {queued.length > 0 && (
              <View style={s.chipWrap}>
                {queued.map((item, i) => (
                  <View key={i} style={s.chip}>
                    <Text style={s.chipText}>{item}</Text>
                    <TouchableOpacity onPress={() => removeFromQueue(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.chipX}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[modalSheet.primaryBtn, (total === 0 || saving) && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={total === 0 || saving}
            >
              <Text style={modalSheet.primaryBtnText}>
                {saving ? 'Adding…' : total > 0 ? `Add ${total} item${total !== 1 ? 's' : ''}` : 'Add'}
              </Text>
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
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  inputFlex: { flex: 1, marginBottom: 0 },
  addBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 26 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.primaryLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 14, color: theme.primary, fontWeight: '600' },
  chipX: { fontSize: 11, color: theme.primary, fontWeight: '700' },
});
