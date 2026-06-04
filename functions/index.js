const functions = require('firebase-functions');
const { default: Anthropic } = require('@anthropic-ai/sdk');

exports.scanReceipt = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { imageBase64, mediaType, existingCategories } = req.body;
  if (!imageBase64) { res.status(400).json({ error: 'imageBase64 required' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API key not configured' }); return; }

  const categoriesStr = existingCategories?.length
    ? `Existing categories: ${existingCategories.join(', ')}.`
    : 'No categories exist yet — create new ones as needed.';

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are cataloguing a grocery receipt.\n\n${categoriesStr}\n\nExtract the following from the receipt:\n1. "store": the store name as printed (e.g. "Whole Foods", "Trader Joe's"). Return null if not visible.\n2. "date": the receipt date in YYYY-MM-DD format. Return null if not visible.\n3. "items": every food/grocery line item. For each item return:\n   - "name": the display name as printed on the receipt\n   - "price": price as a decimal string\n   - "category": a short normalised food name used for grouping (1–3 words, lowercase). Use an existing category if it clearly fits. Otherwise create a clean new one (e.g. "Kirkland Organic Firm Tofu 14oz" → "tofu", "2% Reduced Fat Milk 1 Gal" → "milk", "Nature Valley Oats & Honey Bar" → "granola bars").\n\nReturn ONLY raw JSON, no markdown, no explanation:\n{"store":"...","date":"...","items":[{"name":"...","price":"...","category":"..."}]}\nOmit totals, subtotals, taxes, discounts, and non-food lines.`,
          },
        ],
      }],
    });

    const raw = message.content[0].text.trim();
    const clean = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    let parsed = {};
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const store = typeof parsed.store === 'string' ? parsed.store : null;
    const date = typeof parsed.date === 'string' ? parsed.date : null;
    res.json({ items, store, date });
  } catch (e) {
    console.error('scanReceipt error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

exports.generateMealPlan = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { pantryItems, priceData, servings, dietaryRestrictions, weeklyBudget, notes } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API key not configured' }); return; }

  const sv = Math.max(1, parseInt(servings, 10) || 2);

  const pantryLine = pantryItems?.length
    ? `Pantry items the user already has: ${pantryItems.join(', ')}.`
    : 'The pantry is empty — suggest a full shopping list.';

  const dietLine = dietaryRestrictions ? `Dietary restrictions: ${dietaryRestrictions}.` : '';
  const budgetLine = weeklyBudget ? `Weekly grocery budget: $${weeklyBudget}. Keep the grocery list within this budget.` : '';
  const notesLine = notes ? `Additional preferences: ${notes}.` : '';

  const priceLine = priceData?.length
    ? `Real price data the user has tracked (use for cost estimates):\n${priceData.map((p) => `  ${p.name}: $${p.price.toFixed(2)} for ${p.size}${p.unit}`).join('\n')}`
    : '';

  const prompt = `Create a 7-day weekly meal plan for ${sv} serving${sv !== 1 ? 's' : ''} per meal.

${pantryLine}
${dietLine}
${budgetLine}
${priceLine}
${notesLine}

Guidelines:
- Maximise use of pantry items across the week to reduce grocery spend
- Vary cuisines and flavours — no cuisine twice in a row for dinner
- Breakfasts: quick and practical (under 20 min)
- Lunches: can be leftovers or simple assembly meals
- Dinners: satisfying complete meals
- Grocery list should only include items NOT in the pantry; mark inPantry: true only if the item clearly matches something in the pantry list
- Estimate grocery costs using the provided price data where possible, or typical US grocery prices otherwise
${weeklyBudget ? `- Total grocery cost should stay under $${weeklyBudget}` : ''}

Return ONLY this JSON (no markdown, no extra text):
{
  "days": [
    {
      "day": "Monday",
      "breakfast": { "name": "Oatmeal with Berries", "description": "Quick and filling to start the day." },
      "lunch": { "name": "Leftovers", "description": "Last night's dinner reheated." },
      "dinner": { "name": "Garlic Butter Chicken", "description": "Juicy chicken with roasted vegetables." }
    }
  ],
  "groceryList": [
    { "item": "chicken breast", "amount": "2 lbs", "estimatedCost": 8.00, "inPantry": false }
  ],
  "totalEstimatedCost": 75.00,
  "notes": "Optional tip about the plan."
}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 5000,
      system: 'You are a helpful meal planning assistant. You respond only with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: 'No JSON in response' }); return; }

    res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    console.error('generateMealPlan error:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

exports.generateRecipes = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { pantryItems, userPrompt } = req.body;
  if (!pantryItems?.length) { res.status(400).json({ error: 'pantryItems required' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('key length:', apiKey?.length);
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  try {
  const client = new Anthropic({ apiKey });

  const moodLine = userPrompt
    ? `The user is in the mood for: "${userPrompt}". Lean into this preference while still using their pantry.`
    : `Surprise them — be creative and pick interesting, unexpected combinations!`;

  const prompt = `I have these items in my pantry: ${pantryItems.join(', ')}.

${moodLine}

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

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    system: 'You are a cheerful, knowledgeable cooking assistant. You respond only with valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) { res.status(500).json({ error: 'No JSON in response' }); return; }

  res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    console.error('Function error:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});
