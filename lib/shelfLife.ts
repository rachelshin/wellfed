// Returns estimated shelf life in days based on item name keywords.
// Rules are checked in order — first match wins, so put more specific patterns first.
const RULES: [RegExp, number][] = [
  // ── 1-2 days ───────────────────────────────────────────────────────────
  [/\b(fish|salmon|tuna|cod|tilapia|halibut|trout|snapper|mahi|swordfish|shrimp|prawn|lobster|crab|clam|oyster|scallop|seafood|sashimi)\b/, 2],
  [/\b(ground beef|ground turkey|ground chicken|ground pork|ground lamb|ground meat|minced)\b/, 2],

  // ── 3-4 days ───────────────────────────────────────────────────────────
  [/\b(strawberr|raspberr|blackberr|blueberr|cherr|berry|berries)\b/, 3],
  [/\b(basil|cilantro|parsley|mint|dill|chive|tarragon|thyme|rosemary|sage|fresh herb)\b/, 3],
  [/\b(avocado)\b/, 4],
  [/\b(chicken|beef|pork|lamb|turkey|steak|chop|breast|thigh|drumstick|wing|brisket|rib)\b/, 4],
  [/\b(tofu|tempeh)\b/, 4],

  // ── 5-7 days ───────────────────────────────────────────────────────────
  [/\b(lettuce|spinach|arugula|salad|mixed green|baby green|kale|chard|bok choy|watercress|mesclun)\b/, 5],
  [/\b(mushroom)\b/, 5],
  [/\b(broccoli|cauliflower|asparagus|corn|pea|green bean|snap pea|snow pea)\b/, 5],
  [/\b(milk|cream|half.and.half|buttermilk|kefir|oat milk|almond milk|soy milk)\b/, 7],
  [/\b(yogurt|cottage cheese|ricotta|cream cheese|brie|camembert|feta|goat cheese|soft cheese)\b/, 7],
  [/\b(bread|baguette|roll|bun|pita|naan|tortilla|croissant|muffin)\b/, 7],
  [/\b(tomato)\b/, 7],
  [/\b(grape|cherry tomato|plum|peach|nectarine|apricot|mango|papaya|kiwi|pineapple|fig)\b/, 7],
  [/\b(cucumber|zucchini|eggplant|aubergine)\b/, 7],

  // ── 10-14 days ─────────────────────────────────────────────────────────
  [/\b(bell pepper|pepper)\b/, 10],
  [/\b(sour cream|creme fraiche|whipping cream)\b/, 14],
  [/\b(cabbage|brussels sprout|leek|green onion|scallion)\b/, 14],
  [/\b(celery|beet|radish)\b/, 14],

  // ── 3-4 weeks ──────────────────────────────────────────────────────────
  [/\b(egg)\b/, 21],
  [/\b(carrot|parsnip|turnip)\b/, 21],
  [/\b(apple|orange|lemon|lime|grapefruit|tangerine|clementine|mandarin)\b/, 21],
  [/\b(cheddar|gouda|swiss|gruyere|parmesan|romano|manchego|aged cheese|hard cheese)\b/, 30],
  [/\b(cheese)\b/, 14],
  [/\b(butter|ghee)\b/, 30],
  [/\b(potato|sweet potato|yam)\b/, 30],
  [/\b(onion|shallot)\b/, 30],

  // ── 1-3 months ─────────────────────────────────────────────────────────
  [/\b(garlic|ginger)\b/, 60],
  [/\b(butternut|acorn squash|winter squash|pumpkin)\b/, 60],
  [/\b(nut|almond|walnut|pecan|cashew|peanut|pistachio|hazelnut|macadamia)\b/, 90],
  [/\b(seed|sunflower seed|pumpkin seed|flaxseed|chia)\b/, 90],
  [/\b(ketchup|mustard|mayo|mayonnaise|relish|hot sauce|barbecue sauce|bbq sauce|salsa|hummus)\b/, 60],
  [/\b(chip|cracker|cookie|pretzel|popcorn|granola bar|snack)\b/, 60],
  [/\b(cereal|granola|oat|oatmeal)\b/, 180],

  // ── 6+ months / shelf stable ───────────────────────────────────────────
  [/\b(frozen|freeze)\b/, 180],
  [/\b(canned|can of|tinned)\b/, 730],
  [/\b(pasta|spaghetti|penne|fettuccine|linguine|rigatoni|farfalle|orzo|noodle)\b/, 730],
  [/\b(rice|quinoa|farro|barley|couscous|bulgur|grain)\b/, 365],
  [/\b(dried bean|dried lentil|lentil|chickpea|split pea|black bean|kidney bean|navy bean|cannellini)\b/, 365],
  [/\b(flour|sugar|powdered sugar|brown sugar|cornstarch|baking soda|baking powder|yeast)\b/, 365],
  [/\b(oil|olive oil|vegetable oil|canola oil|coconut oil|sesame oil|avocado oil)\b/, 365],
  [/\b(vinegar|balsamic|apple cider vinegar)\b/, 730],
  [/\b(honey|maple syrup|agave|molasses|syrup)\b/, 730],
  [/\b(jam|jelly|preserve|marmalade)\b/, 365],
  [/\b(soy sauce|fish sauce|oyster sauce|worcestershire|hoisin|tahini|miso)\b/, 365],
  [/\b(broth|stock|bouillon)\b/, 365],
  [/\b(chocolate|cocoa|coffee|tea|matcha)\b/, 365],
  [/\b(spice|paprika|cumin|oregano|cinnamon|turmeric|curry|cayenne|chili powder|garlic powder|onion powder|pepper|salt)\b/, 730],
  [/\b(sauce|paste|puree)\b/, 180],
  [/\b(protein powder|supplement)\b/, 365],
];

const DEFAULT_DAYS = 7;

export function estimatedShelfDays(itemName: string): number {
  const n = itemName.toLowerCase();
  for (const [pattern, days] of RULES) {
    if (pattern.test(n)) return days;
  }
  return DEFAULT_DAYS;
}
