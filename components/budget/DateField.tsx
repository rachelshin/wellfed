import React from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface Props {
  value: string;           // YYYY-MM-DD
  onChange: (val: string) => void;
}

export default function DateField({ value, onChange }: Props) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={modalSheet.label}>Date</Text>
      {Platform.OS === 'web' ? (
        // @ts-ignore — raw <input type="date"> is the only reliable iOS PWA date picker
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 16,             // MUST be ≥16 — prevents iOS viewport zoom on focus
            padding: '14px',
            border: `1.5px solid ${theme.border}`,
            borderRadius: 14,
            backgroundColor: theme.bgTint,
            color: theme.textDark,
            outline: 'none',          // no blue focus ring on PWA
            fontFamily: 'inherit',
          } as any}
        />
      ) : (
        // Expo Go / native fallback (not the primary target)
        <TextInput
          style={[modalSheet.input, { marginBottom: 0 }]}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.placeholder}
          keyboardType="numbers-and-punctuation"
        />
      )}
    </View>
  );
}
