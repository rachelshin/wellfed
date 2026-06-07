import { StyleSheet } from 'react-native';
import theme from './theme';


// Blush FAB — shared across all tabs
export const fab = StyleSheet.create({
  btn: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#d4c4a8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.textDark, shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  label: {
    color: theme.textDark, fontSize: 30, fontWeight: '300',
    lineHeight: 30, textAlign: 'center', includeFontPadding: false,
    marginTop: -1,
  },
});

// Search bar that sits in the page header
export const darkSearch = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bgTint, borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: theme.border,
  },
  input: { flex: 1, fontSize: 16, color: theme.textDark, paddingVertical: 11, outlineWidth: 0, outlineStyle: 'none' },
  clear: { color: theme.textFaint, fontSize: 15, padding: 4 },
});

// Outline button in the page header (Scan, Sign in)
export const heroOutlineBtn = StyleSheet.create({
  btn: {
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  text: { color: theme.textMuted, fontWeight: '700', fontSize: 14 },
});

// Notebook-style content area — applies left margin rule below the header
export const notebookArea = StyleSheet.create({
  container: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(200, 140, 100, 0.28)',
    marginLeft: 40,
  },
  scrollContent: {
    paddingLeft: 14,
    paddingRight: 20,
    paddingTop: 28,
  },
});

// Bottom sheet modals — backdrop, sheet container, common fields
export const modalSheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
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
    backgroundColor: theme.bgTint, marginBottom: 16, outlineWidth: 0, outlineStyle: 'none',
  },
  primaryBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: theme.textFaint, fontSize: 15 },
});
