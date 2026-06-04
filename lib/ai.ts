import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@ai_recipes_cache';
const CACHE_PANTRY_KEY = '@ai_recipes_pantry_hash';
const MEAL_PLAN_CACHE_KEY = '@ai_meal_plan_cache';

const FUNCTION_URL =
  'https://us-central1-well-fed-66136.cloudfunctions.net/generateRecipes';
const MEAL_PLAN_FUNCTION_URL =
  'https://us-central1-well-fed-66136.cloudfunctions.net/generateMealPlan';

export interface MealPlanMeal {
  name: string;
  description: string;
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

export interface PrepSession {
  day: string;
  dishes: string[];
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
}

export function hashItems(items: string[]): string {
  return items.slice().sort().join(',');
}

export async function loadCachedRecipes(): Promise<AIRecipe[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function getCachedPantryHash(): Promise<string> {
  return (await AsyncStorage.getItem(CACHE_PANTRY_KEY)) ?? '';
}

export async function loadCachedMealPlan(): Promise<MealPlan | null> {
  try {
    const json = await AsyncStorage.getItem(MEAL_PLAN_CACHE_KEY);
    return json ? JSON.parse(json) : null;
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pantryItems, priceData, ...options }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }

  const plan: MealPlan = await response.json();
  await AsyncStorage.setItem(MEAL_PLAN_CACHE_KEY, JSON.stringify(plan));
  return plan;
}

export async function generateRecipes(pantryItems: string[], userPrompt?: string): Promise<AIRecipe[]> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pantryItems, userPrompt: userPrompt || undefined }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }

  const parsed = await response.json();
  const recipes: AIRecipe[] = parsed.recipes;

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recipes));
  await AsyncStorage.setItem(CACHE_PANTRY_KEY, hashItems(pantryItems));

  return recipes;
}
