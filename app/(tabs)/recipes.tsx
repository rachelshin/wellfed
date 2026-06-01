import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadPantry, PantryItem } from '../../store/pantry';
import {
  generateRecipes, loadCachedRecipes, getCachedPantryHash, hashItems,
  AIRecipe,
} from '../../lib/ai';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

const CATEGORY_COLORS: Record<string, string> = {
  Italian: '#F97316', Asian: '#EF4444', Mexican: '#FBBF24',
  American: '#3B82F6', Mediterranean: '#A78BFA', Breakfast: '#FB923C',
  Indian: '#F59E0B', Seafood: '#06B6D4', Vegetarian: '#10B981',
  Comfort: '#EC4899',
};
function categoryColor(cat: string) { return CATEGORY_COLORS[cat] ?? '#A78BFA'; }

export default function RecipesTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [aiRecipes, setAiRecipes] = useState<AIRecipe[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AIRecipe | null>(null);

  const hasApiKey = true;

  const load = async () => {
    const items = await loadPantry(user?.uid);
    setPantryItems(items);

    const cached = await loadCachedRecipes();
    const cachedHash = await getCachedPantryHash();
    if (cached && cachedHash === hashItems(items.map((i) => i.displayName))) {
      setAiRecipes(cached);
    } else {
      setAiRecipes([]);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleGenerate = async () => {
    if (pantryItems.length === 0) {
      Alert.alert('Pantry is empty!', 'Add some items to your pantry first!');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const recipes = await generateRecipes(pantryItems.map((i) => i.displayName));
      setAiRecipes(recipes);
    } catch (e: unknown) {
      const msg = String((e as Error)?.message ?? '');
      if (msg.includes('EXPO_PUBLIC_ANTHROPIC_API_KEY')) {
        setAiError('Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file to enable AI recipes.');
      } else if (msg.includes('401')) {
        setAiError('Invalid API key — check EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file.');
      } else {
        setAiError('Couldn\'t reach the AI right now. Check your connection and try again!');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const pantryCount = pantryItems.length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerEyebrow}>What can you make?</Text>
        <Text style={s.headerTitle}>Recipes 🍳</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        <TouchableOpacity style={s.pantryStrip} onPress={() => router.push('/(tabs)/pantry')} activeOpacity={0.7}>
          <Text style={s.pantryStripText}>🥫 Pantry · {pantryCount} item{pantryCount !== 1 ? 's' : ''}</Text>
          <Text style={s.pantryStripArrow}>Manage →</Text>
        </TouchableOpacity>

        {!hasApiKey && (
          <View style={s.noKeyCard}>
            <Text style={s.noKeyEmoji}>🔑</Text>
            <Text style={s.noKeyTitle}>API key needed</Text>
            <Text style={s.noKeyText}>
              Add <Text style={s.mono}>EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...</Text> to your <Text style={s.mono}>.env</Text> file and restart the dev server.
            </Text>
          </View>
        )}

        {hasApiKey && (
          <TouchableOpacity
            style={[s.generateBtn, aiLoading && s.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={aiLoading}
            activeOpacity={0.85}
          >
            {aiLoading ? (
              <View style={s.generateBtnInner}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.generateBtnText}>Thinking up recipes…</Text>
              </View>
            ) : (
              <Text style={s.generateBtnText}>
                {aiRecipes.length > 0 ? '✨ Regenerate' : '✨ Generate AI Recipes'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {aiError ? (
          <View style={s.errorCard}>
            <Text style={s.errorText}>😅 {aiError}</Text>
          </View>
        ) : null}

        {!aiLoading && aiRecipes.length === 0 && hasApiKey && !aiError && pantryCount === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🥫</Text>
            <Text style={s.emptyTitle}>Stock your pantry first!</Text>
            <Text style={s.emptySub}>
              Add items to your pantry and Claude will suggest personalised recipes based on what you actually have.
            </Text>
            <TouchableOpacity style={s.goToPantryBtn} onPress={() => router.push('/(tabs)/pantry')}>
              <Text style={s.goToPantryBtnText}>Go to Pantry →</Text>
            </TouchableOpacity>
          </View>
        )}

        {!aiLoading && aiRecipes.length === 0 && hasApiKey && !aiError && pantryCount > 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🤖</Text>
            <Text style={s.emptyTitle}>Ready when you are!</Text>
            <Text style={s.emptySub}>
              Tap "Generate AI Recipes" and Claude will suggest 5 personalised recipes from your {pantryCount} pantry items — with full instructions!
            </Text>
          </View>
        )}

        {aiRecipes.map((recipe, i) => {
          const haveCount = recipe.ingredients.filter((ing) => ing.have).length;
          const pct = recipe.ingredients.length > 0 ? haveCount / recipe.ingredients.length : 0;
          const color = categoryColor(recipe.category);

          return (
            <TouchableOpacity key={i} style={s.card} onPress={() => setSelected(recipe)} activeOpacity={0.75}>
              <View style={[s.catChip, { backgroundColor: color + '18' }]}>
                <Text style={[s.catChipText, { color }]}>{recipe.category}</Text>
              </View>
              <Text style={s.recipeName}>{recipe.name}</Text>
              <Text style={s.recipeDesc} numberOfLines={2}>{recipe.description}</Text>

              <View style={s.metaRow}>
                <Text style={s.metaText}>⏱ {recipe.time}</Text>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.metaText}>🍽 {recipe.servings} servings</Text>
                <Text style={s.metaDot}>·</Text>
                <Text style={[s.metaText, haveCount > 0 && s.metaHave]}>
                  ✅ {haveCount}/{recipe.ingredients.length} in pantry
                </Text>
              </View>

              <View style={s.progressTrack}>
                <View style={[
                  s.progressFill,
                  { width: `${pct * 100}%`, backgroundColor: pct >= 0.7 ? theme.accent : pct >= 0.4 ? '#FBBF24' : theme.border },
                ]} />
              </View>

              {haveCount > 0 && (
                <View style={s.ingRow}>
                  {recipe.ingredients.filter((ing) => ing.have).slice(0, 5).map((ing) => (
                    <View key={ing.name} style={s.ingChip}>
                      <Text style={s.ingChipText}>✓ {ing.name}</Text>
                    </View>
                  ))}
                  {haveCount > 5 && (
                    <View style={s.ingChip}>
                      <Text style={s.ingChipText}>+{haveCount - 5}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" transparent>
        {selected && (
          <View style={s.modalBackdrop}>
            <View style={[s.detailSheet, { paddingBottom: insets.bottom + 24 }]}>
              <ScrollView bounces={false}>
                <View style={s.detailHandle} />

                <View style={[s.detailCatChip, { backgroundColor: categoryColor(selected.category) + '20' }]}>
                  <Text style={[s.detailCatText, { color: categoryColor(selected.category) }]}>{selected.category}</Text>
                </View>

                <Text style={s.detailTitle}>{selected.name}</Text>
                <Text style={s.detailDesc}>{selected.description}</Text>

                <View style={s.detailMeta}>
                  <Text style={s.detailMetaText}>⏱ {selected.time}</Text>
                  <Text style={s.detailMetaText}>🍽 {selected.servings} servings</Text>
                </View>

                {(() => {
                  const have = selected.ingredients.filter((i) => i.have).length;
                  return have > 0 ? (
                    <View style={s.haveCard}>
                      <Text style={s.haveText}>
                        You already have {have} of {selected.ingredients.length} ingredients 🎉
                      </Text>
                    </View>
                  ) : null;
                })()}

                <Text style={s.detailSection}>Ingredients</Text>
                {selected.ingredients.map((ing) => (
                  <View key={ing.name} style={[s.ingRow2, ing.have && s.ingRow2Have]}>
                    <Text style={s.ingCheck}>{ing.have ? '🌿' : '○'}</Text>
                    <View style={s.ingInfo}>
                      <Text style={[s.ingName, ing.have && s.ingNameHave]}>{ing.name}</Text>
                      <Text style={s.ingAmt}>{ing.amount}</Text>
                    </View>
                  </View>
                ))}

                <Text style={[s.detailSection, { marginTop: 24 }]}>Instructions</Text>
                {selected.steps.map((step, i) => (
                  <View key={i} style={s.stepRow}>
                    <View style={s.stepNum}>
                      <Text style={s.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={s.stepText}>{step}</Text>
                  </View>
                ))}

                <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={s.closeBtnText}>Got it! 👍</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 6 },
  headerEyebrow: { fontSize: 12, fontWeight: '700', color: theme.textFaint, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: theme.textDark },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  pantryStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.bgTint, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
    marginBottom: 14, borderWidth: 1.5, borderColor: theme.border,
  },
  pantryStripText: { fontSize: 13, color: theme.textFaint, fontWeight: '600' },
  pantryStripArrow: { fontSize: 13, color: theme.primary, fontWeight: '700' },

  noKeyCard: {
    backgroundColor: theme.bgTint, borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 2, borderColor: theme.border, alignItems: 'center',
  },
  noKeyEmoji: { fontSize: 32, marginBottom: 8 },
  noKeyTitle: { fontSize: 16, fontWeight: '800', color: theme.textDark, marginBottom: 6 },
  noKeyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  mono: { fontFamily: 'monospace', color: theme.primary },

  generateBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  generateBtnDisabled: { opacity: 0.7, shadowOpacity: 0 },
  generateBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generateBtnText: { color: theme.card, fontSize: 17, fontWeight: '800' },

  errorCard: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1.5, borderColor: '#FECACA',
  },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: theme.textDark, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  goToPantryBtn: { backgroundColor: theme.primaryLight, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12 },
  goToPantryBtnText: { color: theme.primary, fontWeight: '800', fontSize: 15 },

  card: {
    backgroundColor: theme.card, borderRadius: 20, padding: 16, marginBottom: 10,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
    borderWidth: 1.5, borderColor: theme.border,
  },
  catChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  catChipText: { fontSize: 11, fontWeight: '800' },
  recipeName: { fontSize: 18, fontWeight: '800', color: theme.textDark, marginBottom: 4 },
  recipeDesc: { fontSize: 13, color: '#9CA3AF', marginBottom: 10, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: theme.textFaint, fontWeight: '500' },
  metaHave: { color: theme.accent, fontWeight: '700' },
  metaDot: { color: theme.border },
  progressTrack: { height: 5, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3 },
  ingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingChip: { backgroundColor: theme.accentLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ingChipText: { fontSize: 11, color: theme.accent, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 16, maxHeight: '92%',
  },
  detailHandle: { width: 40, height: 4, backgroundColor: theme.handle, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  detailCatChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  detailCatText: { fontSize: 12, fontWeight: '800' },
  detailTitle: { fontSize: 26, fontWeight: '900', color: theme.textDark, marginBottom: 6 },
  detailDesc: { fontSize: 14, color: '#9CA3AF', marginBottom: 12, lineHeight: 20 },
  detailMeta: { flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  detailMetaText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  haveCard: { backgroundColor: theme.accentLight, borderRadius: 14, padding: 14, marginBottom: 20 },
  haveText: { fontSize: 14, color: theme.accent, fontWeight: '700', lineHeight: 20 },
  detailSection: {
    fontSize: 12, fontWeight: '800', color: theme.textFaint, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  ingRow2: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.bgTint,
  },
  ingRow2Have: { backgroundColor: theme.bgTint, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 10 },
  ingCheck: { fontSize: 16, width: 22, textAlign: 'center' },
  ingInfo: { flex: 1 },
  ingName: { fontSize: 15, color: theme.textFaint, textTransform: 'capitalize' },
  ingNameHave: { color: theme.textDark, fontWeight: '700' },
  ingAmt: { fontSize: 12, color: theme.border, marginTop: 1 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accentLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  stepNumText: { fontSize: 13, fontWeight: '800', color: theme.accent },
  stepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 22 },
  closeBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  closeBtnText: { color: theme.card, fontSize: 17, fontWeight: '800' },
});
