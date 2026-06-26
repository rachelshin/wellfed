import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalSheet } from '../../lib/sharedStyles';
import { loadPantry } from '../../store/pantry';
import { loadPrices } from '../../store/prices';
import theme from '../../lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  uid?: string | null;
}

type CopyState = 'idle' | 'loading' | 'copied';

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function InfoModal({ visible, onClose, onSignOut, uid }: Props) {
  const insets = useSafeAreaInsets();
  const [pantryState, setPantryState] = useState<CopyState>('idle');
  const [pricesState, setPricesState] = useState<CopyState>('idle');

  const handleCopyPantry = async () => {
    if (pantryState !== 'idle') return;
    setPantryState('loading');
    try {
      const items = await loadPantry(uid);
      await copyToClipboard(JSON.stringify(items, null, 2));
      setPantryState('copied');
      setTimeout(() => setPantryState('idle'), 2000);
    } catch {
      setPantryState('idle');
    }
  };

  const handleCopyPrices = async () => {
    if (pricesState !== 'idle') return;
    setPricesState('loading');
    try {
      const prices = await loadPrices(uid);
      await copyToClipboard(JSON.stringify(prices, null, 2));
      setPricesState('copied');
      setTimeout(() => setPricesState('idle'), 2000);
    } catch {
      setPricesState('idle');
    }
  };

  const pantryLabel = pantryState === 'loading' ? 'Copying…' : pantryState === 'copied' ? 'Copied!' : 'Copy pantry';
  const pricesLabel = pricesState === 'loading' ? 'Copying…' : pricesState === 'copied' ? 'Copied!' : 'Copy pricing';

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={modalSheet.title}>Well Fed</Text>

          <Text style={s.sectionLabel}>Export your data</Text>
          <Text style={s.hint}>Copy your data as JSON to paste into an AI tool.</Text>

          <TouchableOpacity
            style={[s.row, pantryState !== 'idle' && s.rowDisabled]}
            onPress={handleCopyPantry}
            disabled={pantryState !== 'idle'}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>{pantryLabel}</Text>
            <Text style={[s.rowIcon, pantryState === 'copied' && s.rowIconDone]}>
              {pantryState === 'copied' ? '✓' : '⎘'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, pricesState !== 'idle' && s.rowDisabled]}
            onPress={handleCopyPrices}
            disabled={pricesState !== 'idle'}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>{pricesLabel}</Text>
            <Text style={[s.rowIcon, pricesState === 'copied' && s.rowIconDone]}>
              {pricesState === 'copied' ? '✓' : '⎘'}
            </Text>
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.signOutBtn} onPress={() => { onClose(); onSignOut(); }} activeOpacity={0.7}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
            <Text style={modalSheet.cancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: theme.textFaint,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  hint: {
    fontSize: 13, color: theme.textMuted, marginBottom: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: theme.bgTint, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border,
    marginBottom: 10,
  },
  rowDisabled: { opacity: 0.5 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: theme.textDark },
  rowIcon: { fontSize: 18, color: theme.textFaint },
  rowIconDone: { color: theme.positive },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 16 },
  signOutBtn: { padding: 14, alignItems: 'center' },
  signOutText: { fontSize: 16, fontWeight: '700', color: theme.negative },
});
