import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator, Alert,
  TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadPantry, PantryItem } from '../../store/pantry';
import {
  generateRecipes, loadCachedRecipes, getCachedPantryHash, hashItems,
  AIRecipe,
} from '../../lib/ai';
import {
  loadSavedRecipes, saveRecipe, updateSavedRecipe, deleteSavedRecipe,
  SavedRecipe,
} from '../../store/savedRecipes';
import HeroHeader from '../../components/HeroHeader';
import EditRecipeModal from '../../components/recipes/EditRecipeModal';
import { modalSheet } from '../../lib/sharedStyles';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

const CATEGORY_COLORS: Record<string, string> = {
  Italian: '#A78BDB', Asian: '#7BAFD4', Mexican: '#F4CF6E',
  American: '#94B8A4', Mediterranean: '#F7A8C4', Breakfast: '#F4CF6E',
  Indian: '#D4A574', Seafood: '#7BAFD4', Vegetarian: '#94B8A4',
  Comfort: '#C4A8D4',
};
function categoryColor(cat: string) { return CATEGORY_COLORS[cat] ?? theme.primary; }

type Segment = 'ideas' | 'saved';

export default function RecipesTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [segment, setSegment] = useState<Segment>('ideas');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [aiRecipes, setAiRecipes] = useState<AIRecipe[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AIRecipe | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<SavedRecipe | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // recipe name being saved

  const hasApiKey = true;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

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
    setSavedRecipes(await loadSavedRecipes(user?.uid));
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openPrompt = () => {
    if (pantryItems.length === 0) {
      Alert.alert('Pantry is empty', 'Add some items to your pantry first.');
      return;
    }
    setPromptText('');
    setShowPrompt(true);
  };

  const handleGenerate = async (prompt?: string) => {
    setShowPrompt(false);
    setAiLoading(true);
    setAiError('');
    try {
      const recipes = await generateRecipes(pantryItems.map((i) => i.displayName), prompt);
      setAiRecipes(recipes);
    } catch (e: unknown) {
      const msg = String((e as Error)?.message ?? '');
      if (msg.includes('EXPO_PUBLIC_ANTHROPIC_API_KEY')) {
        setAiError('Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file to enable AI recipes.');
      } else if (msg.includes('401')) {
        setAiError('Invalid API key — check EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file.');
      } else {
        setAiError('Couldn\'t reach the AI right now. Check your connection and try again.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: AIRecipe) => {
    setSaving(recipe.name);
    try {
      const updated = await saveRecipe(savedRecipes, {
        title: recipe.name,
        ingredients: recipe.ingredients.map((ing) => ({ name: ing.name, amount: ing.amount })),
        steps: recipe.steps,
        savedAt: new Date().toISOString(),
      }, user?.uid);
      setSavedRecipes(updated);
      setSelected(null);
      setSegment('saved');
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateRecipe = async (id: string, updates: { title: string; ingredients: { name: string; amount: string }[]; steps: string[] }) => {
    setSavedRecipes(await updateSavedRecipe(savedRecipes, id, updates, user?.uid));
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = async (id: string) => {
    setSavedRecipes(await deleteSavedRecipe(savedRecipes, id, user?.uid));
    setEditingRecipe(null);
  };

  const pantryCount = pantryItems.length;
  const alreadySaved = (recipe: AIRecipe) =>
    savedRecipes.some((r) => r.title === recipe.name);

  return (
    <View style={s.root}>
      <HeroHeader eyebrow="What can you make?" title="Recipes 🍳" cardColor="#F4CF6E" />

      <View style={s.segmentWrap}>
        <TouchableOpacity
          style={[s.segBtn, segment === 'ideas' && s.segBtnActive]}
          onPress={() => setSegment('ideas')}
          activeOpacity={0.7}
        >
          <Text style={[s.segBtnText, segment === 'ideas' && s.segBtnTextActive]}>Ideas ✨</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.segBtn, segment === 'saved' && s.segBtnActive]}
          onPress={() => setSegment('saved')}
          activeOpacity={0.7}
        >
          <Text style={[s.segBtnText, segment === 'saved' && s.segBtnTextActive]}>
            Recipe Box {savedRecipes.length > 0 ? `(${savedRecipes.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />}
      >
        {segment === 'ideas' && (
          <>
            <TouchableOpacity style={s.pantryStrip} onPress={() => router.push('/(tabs)/pantry')} activeOpacity={0.7}>
              <Text style={s.pantryStripText}>Pantry · {pantryCount} item{pantryCount !== 1 ? 's' : ''}</Text>
              <Text style={s.pantryStripArrow}>Manage →</Text>
            </TouchableOpacity>

            {!hasApiKey && (
              <View style={s.infoCard}>
                <Text style={s.infoTitle}>API key needed</Text>
                <Text style={s.infoText}>
                  Add <Text style={s.mono}>EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...</Text> to your <Text style={s.mono}>.env</Text> file and restart the dev server.
                </Text>
              </View>
            )}

            {hasApiKey && (
              <TouchableOpacity
                style={[s.generateBtn, aiLoading && s.generateBtnDisabled]}
                onPress={openPrompt}
                disabled={aiLoading}
                activeOpacity={0.85}
              >
                {aiLoading ? (
                  <View style={s.generateBtnInner}>
                    <ActivityIndicator size="small" color={theme.bg} />
                    <Text style={s.generateBtnText}>Thinking up recipes…</Text>
                  </View>
                ) : (
                  <Text style={s.generateBtnText}>
                    {aiRecipes.length > 0 ? 'Regenerate ✨' : 'Get recipe ideas ✨'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {aiError ? (
              <View style={s.errorCard}>
                <Text style={s.errorText}>{aiError}</Text>
              </View>
            ) : null}

            {!aiLoading && aiRecipes.length === 0 && hasApiKey && !aiError && pantryCount === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>Stock your pantry first</Text>
                <Text style={s.emptySub}>
                  Add items to your pantry and Claude will suggest recipes based on what you actually have.
                </Text>
                <TouchableOpacity style={s.goToPantryBtn} onPress={() => router.push('/(tabs)/pantry')}>
                  <Text style={s.goToPantryBtnText}>Go to Pantry →</Text>
                </TouchableOpacity>
              </View>
            )}

            {!aiLoading && aiRecipes.length === 0 && hasApiKey && !aiError && pantryCount > 0 && (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>Ready when you are</Text>
                <Text style={s.emptySub}>
                  Tap "Get recipe ideas" and Claude will suggest 5 personalised recipes from your {pantryCount} pantry items.
                </Text>
              </View>
            )}

            {aiRecipes.map((recipe, i) => {
              const haveCount = recipe.ingredients.filter((ing) => ing.have).length;
              const pct = recipe.ingredients.length > 0 ? haveCount / recipe.ingredients.length : 0;
              const color = categoryColor(recipe.category);
              const saved = alreadySaved(recipe);

              return (
                <TouchableOpacity
                  key={i}
                  style={[s.card, { borderLeftColor: color }]}
                  onPress={() => setSelected(recipe)}
                  activeOpacity={0.75}
                >
                  <View style={s.cardTopRow}>
                    <View style={[s.catChip, { backgroundColor: color + '18' }]}>
                      <Text style={[s.catChipText, { color }]}>{recipe.category}</Text>
                    </View>
                    {saved && (
                      <View style={s.savedBadge}>
                        <Text style={s.savedBadgeText}>Saved</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.recipeName}>{recipe.name}</Text>
                  <Text style={s.recipeDesc} numberOfLines={2}>{recipe.description}</Text>

                  <View style={s.metaRow}>
                    <Text style={s.metaText}>{recipe.time}</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaText}>{recipe.servings} servings</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={[s.metaText, haveCount > 0 && s.metaHave]}>
                      {haveCount}/{recipe.ingredients.length} in pantry
                    </Text>
                  </View>

                  <View style={s.progressTrack}>
                    <View style={[
                      s.progressFill,
                      { width: `${pct * 100}%` as any, backgroundColor: pct >= 0.7 ? theme.accent : pct >= 0.4 ? theme.warning : theme.border },
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
          </>
        )}

        {segment === 'saved' && (
          <>
            {savedRecipes.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>Recipe box is empty</Text>
                <Text style={s.emptySub}>
                  Generate recipe ideas and tap "Save to Recipe Box" to keep the ones you like.
                </Text>
                <TouchableOpacity style={s.goToPantryBtn} onPress={() => setSegment('ideas')}>
                  <Text style={s.goToPantryBtnText}>Browse ideas →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              savedRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={s.savedCard}
                  onPress={() => setEditingRecipe(recipe)}
                  activeOpacity={0.75}
                >
                  <View style={s.savedCardInner}>
                    <Text style={s.savedCardTitle}>{recipe.title}</Text>
                    <Text style={s.savedCardMeta}>
                      {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''} · {recipe.steps.length} step{recipe.steps.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={s.savedCardArrow}>✎</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Prompt modal */}
      <Modal visible={showPrompt} animationType="slide" transparent>
        <View style={modalSheet.backdrop}>
          <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
            <Text style={modalSheet.title}>What are you in the mood for? 🍽️</Text>
            <Text style={s.promptSub}>Tell Claude what you're craving, or let it surprise you.</Text>
            <TextInput
              style={modalSheet.input}
              value={promptText}
              onChangeText={setPromptText}
              placeholder="e.g. something quick, spicy, Thai food, use the chicken…"
              placeholderTextColor={theme.placeholder}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => handleGenerate(promptText.trim() || undefined)}
            />
            <TouchableOpacity
              style={modalSheet.primaryBtn}
              onPress={() => handleGenerate(promptText.trim() || undefined)}
            >
              <Text style={modalSheet.primaryBtnText}>Generate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.surpriseBtn}
              onPress={() => handleGenerate(undefined)}
            >
              <Text style={s.surpriseBtnText}>🎲 Surprise me!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalSheet.cancelBtn} onPress={() => setShowPrompt(false)}>
              <Text style={modalSheet.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI recipe detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        {selected && (
          <View style={s.modalBackdrop}>
            <View style={[s.detailSheet, { paddingBottom: insets.bottom + 24 }]}>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                <View style={[s.detailCatChip, { backgroundColor: categoryColor(selected.category) + '20' }]}>
                  <Text style={[s.detailCatText, { color: categoryColor(selected.category) }]}>{selected.category}</Text>
                </View>

                <Text style={s.detailTitle}>{selected.name}</Text>
                <Text style={s.detailDesc}>{selected.description}</Text>

                <View style={s.detailMeta}>
                  <Text style={s.detailMetaText}>{selected.time}</Text>
                  <Text style={s.detailMetaText}>{selected.servings} servings</Text>
                </View>

                {(() => {
                  const have = selected.ingredients.filter((i) => i.have).length;
                  return have > 0 ? (
                    <View style={s.haveCard}>
                      <Text style={s.haveText}>
                        You have {have} of {selected.ingredients.length} ingredients
                      </Text>
                    </View>
                  ) : null;
                })()}

                <Text style={s.detailSection}>Ingredients</Text>
                {selected.ingredients.map((ing) => (
                  <View key={ing.name} style={[s.ingRow2, ing.have && s.ingRow2Have]}>
                    <Text style={[s.ingCheck, ing.have && s.ingCheckHave]}>{ing.have ? '✓' : '·'}</Text>
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

                {alreadySaved(selected) ? (
                  <View style={s.alreadySavedNote}>
                    <Text style={s.alreadySavedText}>Saved to Recipe Box</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.saveRecipeBtn}
                    onPress={() => handleSaveRecipe(selected)}
                    disabled={saving === selected.name}
                    activeOpacity={0.85}
                  >
                    {saving === selected.name ? (
                      <ActivityIndicator size="small" color={theme.bg} />
                    ) : (
                      <Text style={s.saveRecipeBtnText}>Save to Recipe Box</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={s.closeBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      <EditRecipeModal
        recipe={editingRecipe}
        onClose={() => setEditingRecipe(null)}
        onSave={handleUpdateRecipe}
        onDelete={handleDeleteRecipe}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  segmentWrap: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 4,
    backgroundColor: theme.bgTint, borderRadius: 14, padding: 3,
  },
  segBtn: {
    flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11,
  },
  segBtnActive: { backgroundColor: '#FFFFFF' },
  segBtnText: { fontSize: 14, fontWeight: '700', color: theme.textFaint },
  segBtnTextActive: { color: theme.textDark },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  pantryStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: theme.accent,
  },
  pantryStripText: { fontSize: 14, color: theme.textDark, fontWeight: '600' },
  pantryStripArrow: { fontSize: 13, color: theme.primary, fontWeight: '700' },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: theme.warning,
  },
  infoTitle: { fontSize: 16, fontWeight: '800', color: theme.textDark, marginBottom: 6 },
  infoText: { fontSize: 13, color: theme.textFaint, lineHeight: 20 },
  mono: { fontFamily: 'monospace', color: theme.primary },

  promptSub: { fontSize: 14, color: theme.textFaint, marginBottom: 20, lineHeight: 20 },
  surpriseBtn: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 16,
    padding: 16, alignItems: 'center', marginBottom: 8,
  },
  surpriseBtnText: { fontSize: 16, fontWeight: '700', color: theme.textDark },

  generateBtn: {
    backgroundColor: theme.textDark, borderRadius: 16, padding: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generateBtnText: { color: theme.bg, fontSize: 17, fontWeight: '800' },

  errorCard: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#FECACA',
  },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textDark, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.textFaint, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  goToPantryBtn: {
    backgroundColor: theme.textDark, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12,
  },
  goToPantryBtnText: { color: theme.bg, fontWeight: '800', fontSize: 15 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    borderLeftWidth: 3,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  catChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catChipText: { fontSize: 11, fontWeight: '800' },
  savedBadge: {
    backgroundColor: theme.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  savedBadgeText: { fontSize: 11, fontWeight: '700', color: theme.primary },
  recipeName: { fontSize: 18, fontWeight: '800', color: theme.textDark, marginBottom: 4 },
  recipeDesc: { fontSize: 13, color: theme.textFaint, marginBottom: 10, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: theme.textFaint, fontWeight: '500' },
  metaHave: { color: theme.accent, fontWeight: '700' },
  metaDot: { color: theme.border },
  progressTrack: { height: 5, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3 },
  ingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingChip: { backgroundColor: 'rgba(167,139,219,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ingChipText: { fontSize: 11, color: theme.primary, fontWeight: '700' },

  savedCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderLeftColor: theme.primary,
  },
  savedCardInner: { flex: 1 },
  savedCardTitle: { fontSize: 17, fontWeight: '800', color: theme.textDark, marginBottom: 4 },
  savedCardMeta: { fontSize: 13, color: theme.textFaint },
  savedCardArrow: { fontSize: 17, color: theme.textFaint, marginLeft: 8 },

  modalBackdrop: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 24, maxHeight: '92%',
  },
  detailCatChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  detailCatText: { fontSize: 12, fontWeight: '800' },
  detailTitle: { fontSize: 26, fontWeight: '900', color: theme.textDark, marginBottom: 6 },
  detailDesc: { fontSize: 14, color: theme.textFaint, marginBottom: 12, lineHeight: 20 },
  detailMeta: { flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  detailMetaText: { fontSize: 13, color: theme.textFaint, fontWeight: '500' },
  haveCard: { backgroundColor: 'rgba(167,139,219,0.1)', borderRadius: 14, padding: 14, marginBottom: 20 },
  haveText: { fontSize: 14, color: theme.primary, fontWeight: '700', lineHeight: 20 },
  detailSection: {
    fontSize: 12, fontWeight: '800', color: theme.textFaint, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  ingRow2: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.bg,
  },
  ingRow2Have: { backgroundColor: theme.bg, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 10 },
  ingCheck: { fontSize: 16, width: 20, textAlign: 'center', color: theme.textFaint },
  ingCheckHave: { color: theme.primary, fontWeight: '800' },
  ingInfo: { flex: 1 },
  ingName: { fontSize: 15, color: theme.textFaint, textTransform: 'capitalize' },
  ingNameHave: { color: theme.textDark, fontWeight: '700' },
  ingAmt: { fontSize: 12, color: theme.border, marginTop: 1 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(167,139,219,0.12)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  stepNumText: { fontSize: 13, fontWeight: '800', color: theme.primary },
  stepText: { flex: 1, fontSize: 14, color: theme.textDark, lineHeight: 22 },

  saveRecipeBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 16,
    alignItems: 'center', marginTop: 24, marginBottom: 10,
  },
  saveRecipeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  alreadySavedNote: {
    backgroundColor: theme.primaryLight, borderRadius: 14, padding: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 10,
  },
  alreadySavedText: { color: theme.primary, fontSize: 14, fontWeight: '700' },

  closeBtn: {
    backgroundColor: theme.textDark, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10,
  },
  closeBtnText: { color: theme.bg, fontSize: 17, fontWeight: '800' },
});
