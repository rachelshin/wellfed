import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../lib/theme';

interface Props {
  eyebrow: string;
  title: string;
  cardColor?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export default function HeroHeader({ eyebrow, title, cardColor, right, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.hero, { marginTop: insets.top + 8 }, cardColor ? { backgroundColor: cardColor } : null]}>
      <View style={s.row}>
        <View style={s.left}>
          <Text style={s.eyebrow}>{eyebrow}</Text>
          <Text style={s.title}>{title}</Text>
        </View>
        {right != null && <View style={s.rightSlot}>{right}</View>}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: theme.heroCard,
    borderRadius: 32,
    marginHorizontal: 16,
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 28,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 16,
  },
  left: { flex: 1 },
  rightSlot: { marginLeft: 12 },
  eyebrow: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
});
