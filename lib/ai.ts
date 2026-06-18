import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthHeaders } from './firebase';

const CACHE_KEY = '@ai_recipes_cache';
const CACHE_PANTRY_KEY = '@ai_recipes_pantry_hash';
const MEAL_PLAN_CACHE_KEY = '@ai_meal_plan_cache';

const FUNCTION_URL =
  'https://us-central1-well-fed-66136.cloudfunctions.net/generateRecipes';
const MEAL_PLAN_FUNCTION_URL =
  'https://us-central1-well-fed-66136.cloudfunctions.net/generateMealPlan';
const SHELF_LIFE_FUNCTION_URL =
  'https://us-central1-well-fed-66136.cloudfunctions.net/shelfLife';

export interface MealPlanMeal {
  name: string;
  description: string;
  ingredients?: { item: string; amount: string }[];
  steps?: string[];
}

export interface MealPlanDay {
  day: string;
  breakfast: MealPlanMeal;
  lunch: MealPlanMeal;
  dinner: MealPlanMeal;
}

export interface GroceryListItem {
  item: string;
  amount: string;
  estimatedCost: number | null;
  inPantry: boolean;
}

export interface PrepDish {
  name: string;
  ingredients?: { item: string; amount: string }[];
  steps?: string[];
}

export interface PrepSession {
  day: string;
  dishes: (PrepDish | string)[];
  estimatedTime: string;
}

export interface MealPlan {
  prepSessions?: PrepSession[];
  days: MealPlanDay[];
  groceryList: GroceryListItem[];
  totalEstimatedCost: number | null;
  notes?: string;
}

export interface MealPlanOptions {
  people: number;
  dietaryRestrictions: string;
  weeklyBudget: number | null;
  notes: string;
}

export interface AIRecipeIngredient {
  name: string;
  amount: string;
  have: boolean;
}

export interface AIRecipe {
  name: string;
  category: string;
  time: string;
  servings: number;
  description: string;
  ingredients: AIRecipeIngredient[];
  steps: string[];
  groceryList?: { name: string; amount: string }[];
}

export function hashItems(items: string[]): string {
  return items.slice().sort().join(',');
}

// Returns a map of itemName → estimated shelf life in days.
// itemNames should already be lowercase (the itemName field on PantryItem).
export async function estimateShelfLife(itemNames: string[]): Promise<Record<string, number>> {
  const res = await fetch(SHELF_LIFE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ items: itemNames }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  return res.json();
}

let _memAiRecipes: AIRecipe[] | null = null;
let _memAiPantryHash: string | null = null;
let _memMealPlan: MealPlan | null = null;

export function getAiRecipesSync(): { recipes: AIRecipe[]; hash: string } | null {
  if (_memAiRecipes === null || _memAiPantryHash === null) return null;
  return { recipes: _memAiRecipes, hash: _memAiPantryHash };
}
export function getMealPlanSync(): MealPlan | null { return _memMealPlan; }

export async function loadCachedRecipes(): Promise<AIRecipe[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);
    const result = json ? JSON.parse(json) : null;
    if (result) _memAiRecipes = result;
    return result;
  } catch {
    return null;
  }
}

export async function getCachedPantryHash(): Promise<string> {
  const hash = (await AsyncStorage.getItem(CACHE_PANTRY_KEY)) ?? '';
  _memAiPantryHash = hash;
  return hash;
}

export async function loadCachedMealPlan(): Promise<MealPlan | null> {
  try {
    const json = await AsyncStorage.getItem(MEAL_PLAN_CACHE_KEY);
    const result = json ? JSON.parse(json) : null;
    if (result) _memMealPlan = result;
    return result;
  } catch {
    return null;
  }
}

export async function generateMealPlan(
  pantryItems: string[],
  priceData: Array<{ name: string; price: number; size: number; unit: string }>,
  options: MealPlanOptions,
): Promise<MealPlan> {
  const response = await fetch(MEAL_PLAN_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ pantryItems, priceData, ...options }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }

  const plan: MealPlan = await response.json();
  _memMealPlan = plan;
  await AsyncStorage.setItem(MEAL_PLAN_CACHE_KEY, JSON.stringify(plan));
  return plan;
}

export async function generateRecipes(pantryItems: string[], userPrompt?: string, allowExtra?: boolean): Promise<AIRecipe[]> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ pantryItems, userPrompt: userPrompt || undefined, allowExtra: !!allowExtra }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }

  const parsed = await response.json();
  const recipes: AIRecipe[] = parsed.recipes;

  _memAiRecipes = recipes;
  _memAiPantryHash = hashItems(pantryItems);
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recipes));
  await AsyncStorage.setItem(CACHE_PANTRY_KEY, _memAiPantryHash);

  return recipes;
}
