import { StyleSheet } from 'react-native';
import theme from './theme';


// Blush FAB — shared across all tabs
export const fab = StyleSheet.create({
  btn: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.textDark, shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  label: {
    color: '#FFFFFF', fontSize: 28, fontWeight: '300',
    lineHeight: 32, textAlign: 'center', includeFontPadding: false,
  },
});

// Search bar that sits inside the hero card
export const darkSearch = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  input: { flex: 1, fontSize: 16, color: '#FFFFFF', paddingVertical: 11, outlineWidth: 0 },
  clear: { color: 'rgba(255,255,255,0.7)', fontSize: 15, padding: 4 },
});

// Outline button on the hero card (Scan, Recipes →, Sign in)
export const heroOutlineBtn = StyleSheet.create({
  btn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

// Bottom sheet modals — backdrop, sheet container, common fields
export const modalSheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 24, maxHeight: '92%',
  },
  title: { fontSize: 22, fontWeight: '800', color: theme.textDark, marginBottom: 20 },
  label: {
    fontSize: 12, fontWeight: '700', color: theme.textFaint,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 14,
    padding: 14, fontSize: 16, color: theme.textDark,
    backgroundColor: theme.bgTint, marginBottom: 16, outlineWidth: 0,
  },
  primaryBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: theme.textFaint, fontSize: 15 },
});
