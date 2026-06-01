import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@ai_recipes_cache';
const CACHE_PANTRY_KEY = '@ai_recipes_pantry_hash';

// Firebase Function URL — replace 'us-central1' with your region if different
const FUNCTION_URL =
  'https://us-central1-well-fed-66136.cloudfunctions.net/generateRecipes';

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

export async function generateRecipes(pantryItems: string[]): Promise<AIRecipe[]> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pantryItems }),
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
