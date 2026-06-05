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
        // Flex-row wrapper so flex:1 on the input resolves against the container width,
        // not the viewport. minWidth:0 prevents the input's intrinsic width from overflowing.
        <View style={{ flexDirection: 'row' }}>
          {/* @ts-ignore — raw <input type="date"> triggers iOS native date picker */}
          <input
            type="date"
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 16,
              padding: '14px',
              border: `1.5px solid ${theme.border}`,
              borderRadius: 14,
              backgroundColor: theme.bgTint,
              color: theme.textDark,
              outline: 'none',
            } as any}
          />
        </View>
      ) : (
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
