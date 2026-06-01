const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/https');
const { default: Anthropic } = require('@anthropic-ai/sdk');

setGlobalOptions({ maxInstances: 10 });

exports.generateRecipes = onRequest(async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('API key present:', !!apiKey, 'length:', apiKey?.length, 'first10:', apiKey?.substring(0, 10));
  const client = new Anthropic({ apiKey });
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const { pantryItems } = req.body;
  if (!pantryItems?.length) { res.status(400).json({ error: 'pantryItems required' }); return; }

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
});
