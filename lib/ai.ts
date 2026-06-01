import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@ai_recipes_cache';
const CACHE_PANTRY_KEY = '@ai_recipes_pantry_hash';

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

function hashItems(items: string[]): string {
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

export async function generateRecipes(
  pantryItems: string[]
): Promise<AIRecipe[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY not set');

  const prompt = `I have these items in my pantry: ${pantryItems.join(', ')}.

Suggest 5 delicious recipes I can make, prioritising ones where I have more ingredients. Be creative and encouraging!

Return ONLY this JSON (no other text, no markdown fences):
{
  "recipes": [
    {
      "name": "Recipe Name",
      "category": "Cuisine type",
      "time": "30 min",
      "servings": 4,
      "description": "One warm, encouraging sentence about why this dish is great.",
      "ingredients": [
        { "name": "ingredient name", "amount": "1 cup", "have": true }
      ],
      "steps": [
        "Step 1 description.",
        "Step 2 description."
      ]
    }
  ]
}

Mark "have": true only for ingredients clearly matching my pantry list. Write friendly, practical steps.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      system: 'You are a cheerful, knowledgeable cooking assistant. You respond only with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  const parsed = JSON.parse(jsonMatch[0]);
  const recipes: AIRecipe[] = parsed.recipes;

  // Cache results
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recipes));
  await AsyncStorage.setItem(CACHE_PANTRY_KEY, hashItems(pantryItems));

  return recipes;
}

export { hashItems };
