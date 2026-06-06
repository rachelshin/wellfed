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
    <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
      <View style={s.row}>
        <View style={s.left}>
          <Text style={s.eyebrow}>{eyebrow}</Text>
          <Text style={[s.title, cardColor ? { color: cardColor } : null]}>{title}</Text>
        </View>
        {right != null && <View style={s.rightSlot}>{right}</View>}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 12,
  },
  left: { flex: 1 },
  rightSlot: { marginLeft: 12, marginTop: 6 },
  eyebrow: {
    fontSize: 11, fontWeight: '700', color: theme.textFaint,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '900', color: theme.textDark },
});
