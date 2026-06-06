export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  body: 'SpaceGrotesk_500Medium',
};

const theme = {
  // Backgrounds — warm ivory, matching splash screen
  bg: '#faf7f2',
  bgTint: '#f2ede5',
  card: '#fffdf9',

  // Primary — deep plum (action color, ties to text undertones)
  primary: '#5a3870',
  primaryLight: '#e8dff2',
  primaryShadow: '#5a3870',

  // Accent — warm orange (from bag's orange in splash)
  accent: '#E87830',
  accentLight: '#fde8d5',

  // Borders — warm tan (from bag fold tones)
  border: '#e5d8cc',

  // Hero card colors — one per tab, all dark enough for white text
  heroCard: '#2d5a3d',     // Budget — deep forest green
  heroPantry: '#b06820',   // Pantry  — warm amber
  heroPrices: '#3a6ba0',   // Prices  — slate blue
  heroRecipes: '#7a3048',  // Recipes — fig burgundy

  // Text
  textDark: '#2B2040',
  textMuted: '#6B5070',
  textFaint: '#9a8aaa',         // matches splash wordmark
  placeholder: '#c0aac8',
  placeholderOnHero: 'rgba(255,255,255,0.55)',  // hero is now dark green

  // Semantic
  negative: '#C0392B',
  positive: '#4d9060',          // forest green (bag leaves)
  warning: '#d4a855',           // warm amber

  // Modal
  backdrop: 'rgba(43,32,64,0.5)',
  handle: '#e5d8cc',

  // Tab bar
  tabActive: '#5a3870',
  tabInactive: '#a890b8',
  tabBorder: '#e5d8cc',
};

export default theme;
