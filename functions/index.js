const functions = require('firebase-functions');
const { default: Anthropic } = require('@anthropic-ai/sdk');

exports.scanReceipt = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { imageBase64, mediaType } = req.body;
  if (!imageBase64) { res.status(400).json({ error: 'imageBase64 required' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API key not configured' }); return; }

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
            text: 'Extract every grocery/food line item and its price from this receipt. Return ONLY a raw JSON array — no markdown, no code fences, no explanation. Each element: {"name": string, "price": string}. Omit totals, subtotals, taxes, discounts, and store/header lines.',
          },
        ],
      }],
    });

    const raw = message.content[0].text.trim();
    const clean = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    let items = [];
    try {
      items = JSON.parse(clean);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) items = JSON.parse(match[0]);
    }
    res.json({ items });
  } catch (e) {
    console.error('scanReceipt error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

exports.generateRecipes = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { pantryItems } = req.body;
  if (!pantryItems?.length) { res.status(400).json({ error: 'pantryItems required' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('key length:', apiKey?.length);
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  try {
  const client = new Anthropic({ apiKey });

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
