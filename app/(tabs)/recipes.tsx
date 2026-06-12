import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Pressable,
} from 'react-native';
import AppModal from '../../components/AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadPantry, addPantryItem, todayDate, PantryItem, getPantrySync } from '../../store/pantry';
import { loadPrices, groupByItem, bestPrice } from '../../store/prices';
import {
  generateRecipes, loadCachedRecipes, getCachedPantryHash, hashItems,
  generateMealPlan, loadCachedMealPlan, getAiRecipesSync, getMealPlanSync,
  AIRecipe, MealPlan, MealPlanMeal, MealPlanOptions, PrepSession, PrepDish, GroceryListItem,
} from '../../lib/ai';
import {
  loadSavedRecipes, saveRecipe, updateSavedRecipe, deleteSavedRecipe,
  getSavedRecipesSync, SavedRecipe,
} from '../../store/savedRecipes';
import {
  loadSavedMealPlans, saveMealPlan, deleteSavedMealPlan, getSavedMealPlansSync, SavedMealPlan,
} from '../../store/savedMealPlans';
import HeroHeader from '../../components/HeroHeader';
import EditRecipeModal from '../../components/recipes/EditRecipeModal';
import MealPlanModal from '../../components/recipes/MealPlanModal';
import { modalSheet } from '../../lib/sharedStyles';
import { showAlert } from '../../lib/dialogs';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

const CATEGORY_COLORS: Record<string, string> = {
  Italian: '#8a7aaa', Asian: '#7BAFD4', Mexican: '#d4a855',
  American: '#94B8A4', Mediterranean: '#E87830', Breakfast: '#d4a855',
  Indian: '#D4A574', Seafood: '#7BAFD4', Vegetarian: '#94B8A4',
  Comfort: '#9a8aaa',
};
function categoryColor(cat: string) { return CATEGORY_COLORS[cat] ?? theme.primary; }

type Segment = 'ideas' | 'saved' | 'plan';

const Svg = 'svg' as any;
const Path = 'path' as any;

function BoxIcon({ color }: { color: string }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 22 22">
      <Path d="M 3,10 L 3,4 L 19,4 L 19,10"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M 1,10 L 21,10"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <Path d="M 3,10 L 3,18 L 19,18 L 19,10"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export default function RecipesTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [segment, setSegment] = useState<Segment>('ideas');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(() => getPantrySync() ?? []);
  const [aiRecipes, setAiRecipes] = useState<AIRecipe[]>(() => {
    const mem = getAiRecipesSync();
    return mem ? mem.recipes : [];
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AIRecipe | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [allowExtra, setAllowExtra] = useState(false);
  const iosPWAKeyboard = useIosPWAKeyboard();

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(() => getSavedRecipesSync() ?? []);
  const [editingRecipe, setEditingRecipe] = useState<SavedRecipe | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(() => getMealPlanSync());
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [mealPlanError, setMealPlanError] = useState('');
  const [showMealPlanPrompt, setShowMealPlanPrompt] = useState(false);
  const [savedMealPlans, setSavedMealPlans] = useState<SavedMealPlan[]>(() => getSavedMealPlansSync() ?? []);
  const [planSaving, setPlanSaving] = useState(false);
  const [loaded, setLoaded] = useState(() => getPantrySync() !== null);

  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [expandedPrepDishes, setExpandedPrepDishes] = useState<Set<string>>(new Set());
  const [addedToPantrySet, setAddedToPantrySet] = useState<Set<string>>(new Set());
  const [addedFromPantrySet, setAddedFromPantrySet] = useState<Set<string>>(new Set());

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
    const cachedPlan = await loadCachedMealPlan();
    if (cachedPlan) setMealPlan(cachedPlan);
    setSavedMealPlans(await loadSavedMealPlans(user?.uid));
    setLoaded(true);
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openPrompt = () => {
    if (pantryItems.length === 0) {
      showAlert('Pantry is empty', 'Add some items to your pantry first.');
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
      const recipes = await generateRecipes(pantryItems.map((i) => i.displayName), prompt, allowExtra);
      setAiRecipes(recipes);
    } catch {
      setAiError('Couldn\'t reach the AI right now. Check your connection and try again.');
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

  const handleGenerateMealPlan = async (opts: MealPlanOptions) => {
    setShowMealPlanPrompt(false);
    setMealPlanLoading(true);
    setMealPlanError('');
    try {
      const prices = await loadPrices(user?.uid);
      const priceData = Array.from(groupByItem(prices).entries())
        .map(([, entries]) => {
          const best = bestPrice(entries);
          return best ? { name: best.itemName, price: best.price, size: best.size, unit: best.unit } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const plan = await generateMealPlan(pantryItems.map((i) => i.displayName), priceData, opts);
      setMealPlan(plan);
      setAddedToPantrySet(new Set());
      setAddedFromPantrySet(new Set());
    } catch (e: unknown) {
      const msg = String((e as Error)?.message ?? '');
      setMealPlanError(`Couldn't build the meal plan right now. ${msg ? `Error: ${msg}` : 'Check your connection and try again.'}`);
    } finally {
      setMealPlanLoading(false);
    }
  };

  const handleSaveMealPlan = async () => {
    if (!mealPlan) return;
    setPlanSaving(true);
    try {
      const now = new Date();
      const title = `Prep – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      setSavedMealPlans(await saveMealPlan(savedMealPlans, mealPlan, title, user?.uid));
    } finally {
      setPlanSaving(false);
    }
  };

  const toggleMeal = (key: string) =>
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const togglePrepDish = (key: string) =>
    setExpandedPrepDishes((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleAddToPantry = async (item: GroceryListItem) => {
    const updated = await addPantryItem(pantryItems, {
      displayName: item.item,
      itemName: item.item.toLowerCase(),
      addedDate: todayDate(),
      source: 'manual',
    }, user?.uid);
    setPantryItems(updated);
    setAddedToPantrySet((prev) => new Set([...prev, item.item]));
  };

  const handleAddFromPantryToGrocery = (itemName: string) =>
    setAddedFromPantrySet((prev) => new Set([...prev, itemName]));

  const handleShareGroceryList = async () => {
    if (!mealPlan) return;
    const toBuy = mealPlan.groceryList
      .filter((i) => !i.inPantry || addedFromPantrySet.has(i.item));
    const text = toBuy
      .map((i) => `${i.item} — ${i.amount}${i.estimatedCost ? ` (~$${i.estimatedCost.toFixed(2)})` : ''}`)
      .join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showAlert('Copied!', 'Open Reminders, tap into a list, then paste — each item will be added as a separate reminder.');
    } else {
      showAlert('Grocery List', text);
    }
  };

  const pantryCount = pantryItems.length;
  const alreadySaved = (recipe: AIRecipe) =>
    savedRecipes.some((r) => r.title === recipe.name);

  return (
    <View style={s.root}>
      <HeroHeader
        title="Recipes"
        cardColor={theme.heroRecipes}
        right={
          <TouchableOpacity
            onPress={() => setSegment(segment === 'saved' ? 'ideas' : 'saved')}
            activeOpacity={0.7}
            style={s.boxIconBtn}
          >
            <BoxIcon color={segment === 'saved' ? theme.heroRecipes : theme.textMuted} />
          </TouchableOpacity>
        }
      >
        {segment === 'ideas' && pantryCount > 0 && (
          <Text style={s.headerSub}>
            From your {pantryCount} pantry item{pantryCount !== 1 ? 's' : ''}
          </Text>
        )}
      </HeroHeader>

      <View style={s.segmentWrap}>
        <TouchableOpacity
          style={[s.segBtn, segment === 'ideas' && s.segBtnActive]}
          onPress={() => setSegment('ideas')}
          activeOpacity={0.7}
        >
          <Text style={[s.segBtnText, segment === 'ideas' && s.segBtnTextActive]}>Ideas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.segBtn, segment === 'plan' && s.segBtnActive]}
          onPress={() => setSegment('plan')}
          activeOpacity={0.7}
        >
          <Text style={[s.segBtnText, segment === 'plan' && s.segBtnTextActive]}>Meal Prep</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          segment === 'ideas' && !aiLoading && !aiError && aiRecipes.length === 0 && pantryCount > 0 && s.scrollContentCentered,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />}
      >
        {segment === 'ideas' && (
          <>
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
                  {aiRecipes.length > 0 ? 'Regenerate ✦' : 'Get recipe ideas ✦'}
                </Text>
              )}
            </TouchableOpacity>

            {aiError ? (
              <View style={s.errorCard}>
                <Text style={s.errorText}>{aiError}</Text>
              </View>
            ) : null}

            {loaded && !aiLoading && aiRecipes.length === 0 && !aiError && pantryCount === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>Stock your pantry first.</Text>
                <Text style={s.emptySub}>
                  Add what you have on hand and Claude will suggest recipes built around it.
                </Text>
                <TouchableOpacity style={s.goToPantryBtn} onPress={() => router.push('/(tabs)/pantry')}>
                  <Text style={s.goToPantryBtnText}>Go to Pantry →</Text>
                </TouchableOpacity>
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
                    {recipe.groceryList && recipe.groceryList.length > 0 && (
                      <>
                        <Text style={s.metaDot}>·</Text>
                        <Text style={s.metaBuy}>🛒 {recipe.groceryList.length} to buy</Text>
                      </>
                    )}
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
                <Text style={s.emptyTitle}>Recipe box is empty.</Text>
                <Text style={s.emptySub}>
                  Browse ideas and save the ones worth making again.
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

        {segment === 'plan' && (
          <>
            {savedMealPlans.length > 0 && (
              <View style={s.savedPlansSection}>
                <Text style={s.planSectionTitle}>Saved Plans</Text>
                {savedMealPlans.map((sp) => (
                  <TouchableOpacity
                    key={sp.id}
                    style={s.savedPlanRow}
                    onPress={() => setMealPlan(sp.plan)}
                    activeOpacity={0.7}
                  >
                    <View style={s.savedPlanInfo}>
                      <Text style={s.savedPlanTitle}>{sp.title}</Text>
                      <Text style={s.savedPlanMeta}>{sp.plan.days.length} days</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteSavedMealPlan(savedMealPlans, sp.id, user?.uid).then(setSavedMealPlans)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={s.savedPlanDelete}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[s.generateBtn, mealPlanLoading && s.generateBtnDisabled]}
              onPress={() => setShowMealPlanPrompt(true)}
              disabled={mealPlanLoading}
              activeOpacity={0.85}
            >
              {mealPlanLoading ? (
                <View style={s.generateBtnInner}>
                  <ActivityIndicator size="small" color={theme.bg} />
                  <Text style={s.generateBtnText}>Building your week…</Text>
                </View>
              ) : (
                <Text style={s.generateBtnText}>
                  {mealPlan ? 'Regenerate prep plan ✦' : 'Create meal prep plan ✦'}
                </Text>
              )}
            </TouchableOpacity>

            {mealPlanError ? (
              <View style={s.errorCard}>
                <Text style={s.errorText}>{mealPlanError}</Text>
              </View>
            ) : null}

            {loaded && !mealPlanLoading && !mealPlan && !mealPlanError && (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>Prep your week 🥘</Text>
                <Text style={s.emptySub}>
                  Claude will batch cook a week of meals around your pantry — with leftovers built in — and give you a grocery list for the rest.
                </Text>
              </View>
            )}

            {mealPlan && !mealPlanLoading && (
              <>
                {mealPlan.prepSessions && mealPlan.prepSessions.length > 0 && (
                  <>
                    <Text style={s.planSectionTitle}>Prep Sessions</Text>
                    {mealPlan.prepSessions.map((session: PrepSession, i: number) => (
                      <View key={i} style={s.prepCard}>
                        <View style={s.prepCardHeader}>
                          <Text style={s.prepCardDay}>{session.day} — batch cook</Text>
                          <Text style={s.prepCardTime}>{session.estimatedTime}</Text>
                        </View>
                        {session.dishes.map((dish: PrepDish | string, j: number) => {
                          const dishName = typeof dish === 'string' ? dish : dish.name;
                          const ings = typeof dish === 'string' ? [] : (dish.ingredients ?? []);
                          const steps = typeof dish === 'string' ? [] : (dish.steps ?? []);
                          const hasDetail = ings.length > 0 || steps.length > 0;
                          const dishKey = `${i}-${j}`;
                          const isExpanded = expandedPrepDishes.has(dishKey);
                          return (
                            <View key={j}>
                              <TouchableOpacity
                                style={s.prepDishRow}
                                onPress={() => hasDetail && togglePrepDish(dishKey)}
                                activeOpacity={hasDetail ? 0.7 : 1}
                              >
                                <Text style={s.prepCardDish}>· {dishName}</Text>
                                {hasDetail && (
                                  <Text style={s.expandChevron}>{isExpanded ? '▲' : '▾'}</Text>
                                )}
                              </TouchableOpacity>
                              {isExpanded && (
                                <View style={s.expandBody}>
                                  {ings.length > 0 && (
                                    <>
                                      <Text style={s.expandLabel}>Ingredients</Text>
                                      {ings.map((ing, k) => (
                                        <Text key={k} style={s.expandIngLine}>· {ing.item} — {ing.amount}</Text>
                                      ))}
                                    </>
                                  )}
                                  {steps.length > 0 && (
                                    <>
                                      <Text style={[s.expandLabel, { marginTop: 10 }]}>Steps</Text>
                                      {steps.map((step, k) => (
                                        <View key={k} style={s.expandStepRow}>
                                          <View style={s.expandStepNum}>
                                            <Text style={s.expandStepNumText}>{k + 1}</Text>
                                          </View>
                                          <Text style={s.expandStepText}>{step}</Text>
                                        </View>
                                      ))}
                                    </>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </>
                )}

                {mealPlan.days.map((day) => {
                  const renderMealRow = (meal: MealPlanMeal, emoji: string, mealType: string, showDivider: boolean) => {
                    const key = `${day.day}-${mealType}`;
                    const hasDetail = (meal.ingredients?.length ?? 0) > 0 || (meal.steps?.length ?? 0) > 0;
                    const isOpen = expandedMeals.has(key);
                    return (
                      <View key={mealType}>
                        {showDivider && <View style={s.mealDivider} />}
                        <TouchableOpacity
                          style={s.mealRow}
                          onPress={() => hasDetail && toggleMeal(key)}
                          activeOpacity={hasDetail ? 0.7 : 1}
                        >
                          <Text style={s.mealEmoji}>{emoji}</Text>
                          <View style={s.mealInfo}>
                            <Text style={s.mealName}>{meal.name}</Text>
                            <Text style={s.mealDesc} numberOfLines={isOpen ? undefined : 2}>{meal.description}</Text>
                          </View>
                          {hasDetail && <Text style={s.expandChevron}>{isOpen ? '▲' : '▾'}</Text>}
                        </TouchableOpacity>
                        {isOpen && (
                          <View style={s.expandBody}>
                            {(meal.ingredients?.length ?? 0) > 0 && (
                              <>
                                <Text style={s.expandLabel}>Ingredients</Text>
                                {meal.ingredients!.map((ing, k) => (
                                  <Text key={k} style={s.expandIngLine}>· {ing.item} — {ing.amount}</Text>
                                ))}
                              </>
                            )}
                            {(meal.steps?.length ?? 0) > 0 && (
                              <>
                                <Text style={[s.expandLabel, { marginTop: 10 }]}>Steps</Text>
                                {meal.steps!.map((step, k) => (
                                  <View key={k} style={s.expandStepRow}>
                                    <View style={s.expandStepNum}>
                                      <Text style={s.expandStepNumText}>{k + 1}</Text>
                                    </View>
                                    <Text style={s.expandStepText}>{step}</Text>
                                  </View>
                                ))}
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  };
                  return (
                    <View key={day.day} style={s.dayCard}>
                      <Text style={s.dayName}>{day.day}</Text>
                      {renderMealRow(day.breakfast, '🌅', 'breakfast', false)}
                      {renderMealRow(day.lunch, '☀️', 'lunch', true)}
                      {renderMealRow(day.dinner, '🌙', 'dinner', true)}
                    </View>
                  );
                })}

                <View style={s.groceryHeader}>
                  <Text style={s.planSectionTitle}>Grocery List</Text>
                  <TouchableOpacity style={s.shareBtn} onPress={handleShareGroceryList} activeOpacity={0.8}>
                    <Text style={s.shareBtnText}>🔔 Add to Reminders</Text>
                  </TouchableOpacity>
                </View>

                {mealPlan.groceryList
                  .filter((i) => !i.inPantry || addedFromPantrySet.has(i.item))
                  .map((item, idx) => {
                    const inPantry = addedToPantrySet.has(item.item);
                    return (
                      <View key={idx} style={s.groceryRow}>
                        {addedFromPantrySet.has(item.item) && (
                          <View style={s.fromPantryTag}>
                            <Text style={s.fromPantryTagText}>pantry</Text>
                          </View>
                        )}
                        <View style={s.groceryItemInfo}>
                          <Text style={s.groceryItemName}>{item.item}</Text>
                          <Text style={s.groceryItemAmount}>{item.amount}</Text>
                        </View>
                        {item.estimatedCost != null && (
                          <Text style={s.groceryItemCost}>~${item.estimatedCost.toFixed(2)}</Text>
                        )}
                        <TouchableOpacity
                          style={[s.addPantryBtn, inPantry && s.addPantryBtnDone]}
                          onPress={() => !inPantry && handleAddToPantry(item)}
                          activeOpacity={inPantry ? 1 : 0.75}
                        >
                          <Text style={[s.addPantryBtnText, inPantry && s.addPantryBtnTextDone]}>
                            {inPantry ? '✓' : '+ Pantry'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                {mealPlan.groceryList.filter((i) => i.inPantry && !addedFromPantrySet.has(i.item)).length > 0 && (
                  <>
                    <Text style={s.planSubtitle}>Already in your pantry — needed this week</Text>
                    {mealPlan.groceryList
                      .filter((i) => i.inPantry && !addedFromPantrySet.has(i.item))
                      .map((item, idx) => {
                        const alreadyAdded = addedFromPantrySet.has(item.item);
                        return (
                          <View key={idx} style={[s.groceryRow, s.groceryRowHave]}>
                            <Text style={s.groceryCheck}>✓</Text>
                            <View style={s.groceryItemInfo}>
                              <Text style={[s.groceryItemName, s.groceryItemNameHave]}>{item.item}</Text>
                              <Text style={s.groceryItemAmount}>Need: {item.amount}</Text>
                            </View>
                            <TouchableOpacity
                              style={s.addListBtn}
                              onPress={() => !alreadyAdded && handleAddFromPantryToGrocery(item.item)}
                              activeOpacity={alreadyAdded ? 1 : 0.75}
                            >
                              <Text style={s.addListBtnText}>{alreadyAdded ? '✓' : '+ List'}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                  </>
                )}

                {mealPlan.totalEstimatedCost != null && (
                  <View style={s.groceryTotal}>
                    <Text style={s.groceryTotalLabel}>Estimated total</Text>
                    <Text style={s.groceryTotalAmount}>~${mealPlan.totalEstimatedCost.toFixed(2)}</Text>
                  </View>
                )}

                {mealPlan.notes ? (
                  <View style={s.planNotesCard}>
                    <Text style={s.planNotesText}>{mealPlan.notes}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[s.savePlanBtn, planSaving && s.generateBtnDisabled]}
                  onPress={handleSaveMealPlan}
                  disabled={planSaving}
                  activeOpacity={0.85}
                >
                  {planSaving ? (
                    <ActivityIndicator size="small" color={theme.bg} />
                  ) : (
                    <Text style={s.savePlanBtnText}>Save this plan</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Prompt modal */}
      <AppModal visible={showPrompt} animationType="slide" transparent onRequestClose={() => setShowPrompt(false)}>
        <View style={modalSheet.backdrop}>
          <Pressable style={modalSheet.backdropTap} onPress={() => setShowPrompt(false)} />
          <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={modalSheet.title}>What are you in the mood for? 🍽️</Text>

              <View style={s.scopeToggle}>
                <TouchableOpacity
                  style={[s.scopeBtn, !allowExtra && s.scopeBtnActive]}
                  onPress={() => setAllowExtra(false)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.scopeBtnText, !allowExtra && s.scopeBtnTextActive]}>Pantry only</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.scopeBtn, allowExtra && s.scopeBtnActive]}
                  onPress={() => setAllowExtra(true)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.scopeBtnText, allowExtra && s.scopeBtnTextActive]}>Allow extras + list</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={s.surpriseBtn}
                onPress={() => handleGenerate(undefined)}
              >
                <Text style={s.surpriseBtnText}>🎲 Surprise me!</Text>
              </TouchableOpacity>

              <Text style={s.promptSub}>or</Text>

              <TextInput
                style={modalSheet.input}
                value={promptText}
                onChangeText={setPromptText}
                placeholder="Tell Claude what you're craving."
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

              <TouchableOpacity style={modalSheet.cancelBtn} onPress={() => setShowPrompt(false)}>
                <Text style={modalSheet.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      {/* AI recipe detail modal */}
      <AppModal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={s.modalBackdrop}>
            <Pressable style={modalSheet.backdropTap} onPress={() => setSelected(null)} />
            <View style={[s.detailSheet, { paddingBottom: insets.bottom + 24 }]}>
              <ScrollView key={selected.name} bounces={false} keyboardShouldPersistTaps="handled">
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

                {selected.groceryList && selected.groceryList.length > 0 && (
                  <>
                    <Text style={[s.detailSection, { marginTop: 24 }]}>To Buy</Text>
                    {selected.groceryList.map((item) => (
                      <View key={item.name} style={s.ingRow2}>
                        <Text style={s.ingCheck}>🛒</Text>
                        <View style={s.ingInfo}>
                          <Text style={s.ingName}>{item.name}</Text>
                          <Text style={s.ingAmt}>{item.amount}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

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
      </AppModal>

      <MealPlanModal
        visible={showMealPlanPrompt}
        onClose={() => setShowMealPlanPrompt(false)}
        onGenerate={handleGenerateMealPlan}
      />

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

  boxIconBtn: { padding: 4 },

  segmentWrap: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16 },
  segBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  segBtnActive: { borderBottomWidth: 2, borderBottomColor: theme.textDark },
  segBtnText: { fontSize: 15, fontWeight: '600', color: theme.textFaint },
  segBtnTextActive: { color: theme.textDark },

  headerSub: { fontSize: 13, color: theme.textFaint, marginTop: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  scrollContentCentered: { flex: 1, justifyContent: 'center' },


  promptSub: { fontSize: 15, fontWeight: '600', color: theme.textFaint, marginVertical: 14, lineHeight: 20, textAlign: 'center' },
  surpriseBtn: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 16,
    padding: 16, alignItems: 'center', marginBottom: 8,
  },
  surpriseBtnText: { fontSize: 16, fontWeight: '700', color: theme.textDark },

  generateBtn: {
    backgroundColor: theme.heroRecipes, borderRadius: 16, padding: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generateBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  errorCard: { paddingVertical: 12, marginBottom: 16 },
  errorText: { color: theme.negative, fontSize: 14 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textDark, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.textFaint, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  goToPantryBtn: {
    backgroundColor: theme.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12,
  },
  goToPantryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  card: {
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
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
  metaBuy: { fontSize: 12, color: theme.warning, fontWeight: '700' },

  scopeToggle: {
    flexDirection: 'row', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  scopeBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: theme.bg,
  },
  scopeBtnActive: { backgroundColor: theme.heroRecipes },
  scopeBtnText: { fontSize: 14, fontWeight: '700', color: theme.textFaint },
  scopeBtnTextActive: { color: '#FFFFFF' },
  metaDot: { color: theme.border },
  progressTrack: { height: 5, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3 },
  ingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ingChipText: { fontSize: 11, color: theme.textFaint, fontWeight: '600' },

  savedCard: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
    flexDirection: 'row', alignItems: 'center',
  },
  savedCardInner: { flex: 1 },
  savedCardTitle: { fontSize: 17, fontWeight: '800', color: theme.textDark, marginBottom: 4 },
  savedCardMeta: { fontSize: 13, color: theme.textFaint },
  savedCardArrow: { fontSize: 17, color: theme.textFaint, marginLeft: 8 },

  modalBackdrop: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 24, maxHeight: '92%',
  },
  detailCatChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  detailCatText: { fontSize: 12, fontWeight: '800' },
  detailTitle: { fontSize: 26, fontWeight: '900', color: theme.textDark, marginBottom: 6 },
  detailDesc: { fontSize: 14, color: theme.textFaint, marginBottom: 12, lineHeight: 20 },
  detailMeta: { flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  detailMetaText: { fontSize: 13, color: theme.textFaint, fontWeight: '500' },
  haveCard: {
    paddingVertical: 12, marginBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
  },
  haveText: { fontSize: 14, color: theme.primary, fontWeight: '700', lineHeight: 20 },
  detailSection: {
    fontSize: 12, fontWeight: '800', color: theme.textFaint, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  ingRow2: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.bg,
  },
  ingRow2Have: {},
  ingCheck: { fontSize: 16, width: 20, textAlign: 'center', color: theme.textFaint },
  ingCheckHave: { color: theme.primary, fontWeight: '800' },
  ingInfo: { flex: 1 },
  ingName: { fontSize: 15, color: theme.textFaint, textTransform: 'capitalize' },
  ingNameHave: { color: theme.textDark, fontWeight: '700' },
  ingAmt: { fontSize: 12, color: theme.border, marginTop: 1 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border,
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
    paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
  },
  alreadySavedText: { color: theme.primary, fontSize: 14, fontWeight: '700' },

  closeBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10,
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  // Meal plan segment
  dayCard: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
    borderLeftWidth: 2, borderLeftColor: theme.primary, paddingLeft: 12,
  },
  dayName: {
    fontSize: 12, fontWeight: '800', color: theme.primary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  mealRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mealEmoji: { fontSize: 15, marginTop: 1, width: 20, textAlign: 'center' },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '700', color: theme.textDark },
  mealDesc: { fontSize: 12, color: theme.textFaint, marginTop: 2, lineHeight: 16 },
  mealDivider: { height: 1, backgroundColor: theme.border, marginVertical: 10, marginLeft: 30 },

  planSectionTitle: {
    fontSize: 13, fontWeight: '800', color: theme.textFaint,
    letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 8, marginBottom: 10,
  },
  planSubtitle: {
    fontSize: 11, fontWeight: '700', color: theme.textFaint,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8,
  },

  groceryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 6,
  },
  groceryRowHave: { opacity: 0.55 },
  groceryCheck: { fontSize: 13, color: theme.accent, marginRight: 10, fontWeight: '800' },
  groceryItemInfo: { flex: 1 },
  groceryItemName: { fontSize: 14, fontWeight: '700', color: theme.textDark },
  groceryItemNameHave: { color: theme.textFaint },
  groceryItemAmount: { fontSize: 12, color: theme.textFaint, marginTop: 1 },
  groceryItemCost: { fontSize: 14, fontWeight: '800', color: theme.textDark },

  groceryTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.primaryLight, borderRadius: 14, padding: 16, marginTop: 6,
  },
  groceryTotalLabel: { fontSize: 13, fontWeight: '700', color: theme.primary },
  groceryTotalAmount: { fontSize: 22, fontWeight: '900', color: theme.primary },

  planNotesCard: {
    backgroundColor: theme.bgTint, borderRadius: 14, padding: 14, marginTop: 8,
  },
  planNotesText: { fontSize: 13, color: theme.textFaint, lineHeight: 20, fontStyle: 'italic' },

  prepCard: {
    backgroundColor: theme.primaryLight, borderRadius: 16, padding: 16, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: theme.primary,
  },
  prepCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  prepCardDay: { fontSize: 14, fontWeight: '800', color: theme.primary },
  prepCardTime: { fontSize: 12, fontWeight: '600', color: theme.primary },
  prepCardDish: { fontSize: 14, color: theme.textDark, fontWeight: '600', marginBottom: 4 },

  savePlanBtn: {
    backgroundColor: theme.heroRecipes, borderRadius: 16, padding: 16,
    alignItems: 'center', marginTop: 16, marginBottom: 8,
  },
  savePlanBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  savedPlansSection: { marginBottom: 16 },
  savedPlanRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: theme.primary,
  },
  savedPlanInfo: { flex: 1 },
  savedPlanTitle: { fontSize: 15, fontWeight: '700', color: theme.textDark },
  savedPlanMeta: { fontSize: 12, color: theme.textFaint, marginTop: 2 },
  savedPlanDelete: { fontSize: 14, color: theme.textFaint, fontWeight: '700', padding: 4 },

  // Expandable prep dish rows
  prepDishRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 2,
  },
  expandChevron: { fontSize: 11, color: theme.primary, fontWeight: '700', marginLeft: 8 },
  expandBody: {
    backgroundColor: 'rgba(138,122,170,0.07)', borderRadius: 12,
    padding: 12, marginTop: 8, marginBottom: 4,
  },
  expandLabel: {
    fontSize: 10, fontWeight: '800', color: theme.textFaint,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  expandIngLine: { fontSize: 13, color: theme.textDark, marginBottom: 3, lineHeight: 18 },
  expandStepRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  expandStepNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  expandStepNumText: { fontSize: 10, fontWeight: '800', color: theme.primary },
  expandStepText: { flex: 1, fontSize: 13, color: theme.textDark, lineHeight: 19 },

  // Grocery list header row
  groceryHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 10,
  },
  shareBtn: {
    backgroundColor: theme.accentLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  shareBtnText: { fontSize: 12, fontWeight: '800', color: theme.textDark },

  // "From pantry" tag on grocery rows
  fromPantryTag: {
    backgroundColor: theme.primaryLight, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2, marginRight: 8, alignSelf: 'center',
  },
  fromPantryTagText: { fontSize: 10, fontWeight: '700', color: theme.primary },

  // Add to pantry / add to list inline buttons
  addPantryBtn: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8,
  },
  addPantryBtnDone: { borderColor: theme.accent, backgroundColor: theme.accentLight },
  addPantryBtnText: { fontSize: 11, fontWeight: '700', color: theme.textFaint },
  addPantryBtnTextDone: { color: theme.textDark },
  addListBtn: {
    borderWidth: 1.5, borderColor: theme.primary, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8,
  },
  addListBtnText: { fontSize: 11, fontWeight: '700', color: theme.primary },
});
