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

  const { pantryItems, priceData, people, dietaryRestrictions, weeklyBudget, notes } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API key not configured' }); return; }

  const numPeople = Math.max(1, parseInt(people, 10) || 2);

  const pantryLine = pantryItems?.length
    ? `Pantry items the user already has: ${pantryItems.join(', ')}.`
    : 'The pantry is empty — suggest a full shopping list.';

  const dietLine = dietaryRestrictions ? `Dietary restrictions: ${dietaryRestrictions}.` : '';
  const budgetLine = weeklyBudget ? `Weekly grocery budget: $${weeklyBudget}. Keep the grocery list within this budget.` : '';
  const notesLine = notes ? `Additional preferences: ${notes}.` : '';

  const priceLine = priceData?.length
    ? `Real price data the user has tracked (use for cost estimates):\n${priceData.map((p) => `  ${p.name}: $${p.price.toFixed(2)} for ${p.size}${p.unit}`).join('\n')}`
    : '';

  const prompt = `Create a 7-day meal prep plan for ${numPeople} ${numPeople === 1 ? 'person' : 'people'}.

${pantryLine}
${dietLine}
${budgetLine}
${priceLine}
${notesLine}

This is a MEAL PREP plan — the goal is minimal daily cooking. Batch cook on one or two days so the rest of the week practically runs itself:
- Designate Sunday as the main prep day: cook 3–4 dishes in large batches.
- Add a Wednesday refresh session if useful for mid-week variety.
- Breakfasts: simple, repeating, no cooking required (overnight oats, yogurt + fruit, toast). Use the same 2–3 options across the week.
- Lunches: leftovers from batch-cooked dinners. Always name them "Leftover [dish name]".
- Dinners on non-prep days: reheat batch-cooked dishes or assemble in under 15 min. No from-scratch cooking.
- Aim for only 4–6 unique recipes for the entire week.
- Scale grocery quantities for ${numPeople * 2}–${numPeople * 3} servings per dish so leftovers cover multiple meals.
- Maximise use of pantry items to reduce grocery spend.
- Grocery list: include ALL ingredients needed for the week. Mark inPantry: true for items that clearly match the pantry list (no need to buy), and inPantry: false for items that must be purchased.
- Estimate costs from the provided price data where possible, otherwise use typical US grocery prices.
${weeklyBudget ? `- Total grocery cost must stay under $${weeklyBudget}.` : ''}

Return ONLY this JSON (no markdown, no extra text):
{
  "prepSessions": [
    {
      "day": "Sunday",
      "estimatedTime": "2 hours",
      "dishes": [
        {
          "name": "Teriyaki Chicken",
          "ingredients": [{"item": "chicken breast", "amount": "3 lbs"}, {"item": "soy sauce", "amount": "1/4 cup"}, {"item": "honey", "amount": "2 tbsp"}],
          "steps": ["Cut chicken into 1-inch cubes.", "Whisk together soy sauce, honey, and garlic.", "Cook chicken in batches over medium-high heat, 4–5 min per side.", "Pour sauce over chicken, toss to coat, and cook 2 more min.", "Cool and divide into airtight containers."]
        },
        {
          "name": "Batch Brown Rice",
          "ingredients": [{"item": "brown rice", "amount": "3 cups"}, {"item": "water", "amount": "6 cups"}],
          "steps": ["Rinse rice under cold water.", "Combine rice and water in a large pot.", "Bring to a boil, then reduce heat and cover.", "Simmer 45 min until water is absorbed.", "Fluff with fork and portion into containers."]
        }
      ]
    }
  ],
  "days": [
    {
      "day": "Monday",
      "breakfast": {
        "name": "Overnight Oats",
        "description": "Prep the night before — grab and go.",
        "ingredients": [{"item": "rolled oats", "amount": "1/2 cup"}, {"item": "milk", "amount": "1/2 cup"}, {"item": "honey", "amount": "1 tsp"}],
        "steps": ["Combine oats and milk in a jar or bowl.", "Stir in honey.", "Cover and refrigerate overnight.", "Grab cold in the morning. Add fresh fruit if desired."]
      },
      "lunch": {
        "name": "Leftover Teriyaki Chicken",
        "description": "Reheated from Sunday's batch cook.",
        "ingredients": [{"item": "teriyaki chicken (batch)", "amount": "1 portion"}, {"item": "brown rice (batch)", "amount": "1/2 cup"}],
        "steps": ["Scoop rice and chicken into a bowl.", "Microwave on high for 1–2 min until hot.", "Stir and serve."]
      },
      "dinner": {
        "name": "Teriyaki Chicken Bowl",
        "description": "Brown rice topped with teriyaki chicken and roasted veg.",
        "ingredients": [{"item": "teriyaki chicken (batch)", "amount": "1 portion"}, {"item": "brown rice (batch)", "amount": "3/4 cup"}, {"item": "roasted vegetables (batch)", "amount": "1/2 cup"}],
        "steps": ["Reheat rice in microwave 1–2 min.", "Reheat chicken 1–2 min.", "Arrange over rice, top with veg and sesame seeds."]
      }
    }
  ],
  "groceryList": [
    { "item": "chicken breast", "amount": "3 lbs", "estimatedCost": 12.00, "inPantry": false },
    { "item": "soy sauce", "amount": "1/4 cup", "estimatedCost": null, "inPantry": true }
  ],
  "totalEstimatedCost": 75.00,
  "notes": "Optional tip about the plan."
}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 7000,
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
