export interface Recipe {
  id: string;
  name: string;
  category: string;
  time: string;
  servings: number;
  ingredients: string[]; // lowercase keywords to match against tracked items
}

export const RECIPES: Recipe[] = [
  {
    id: '1', name: 'Spaghetti Bolognese', category: 'Italian', time: '45 min', servings: 4,
    ingredients: ['ground beef', 'pasta', 'spaghetti', 'tomato', 'onion', 'garlic', 'olive oil', 'parmesan'],
  },
  {
    id: '2', name: 'Chicken Stir Fry', category: 'Asian', time: '20 min', servings: 2,
    ingredients: ['chicken', 'broccoli', 'bell pepper', 'soy sauce', 'garlic', 'ginger', 'rice', 'sesame oil'],
  },
  {
    id: '3', name: 'Avocado Toast', category: 'Breakfast', time: '10 min', servings: 1,
    ingredients: ['avocado', 'bread', 'lemon', 'egg'],
  },
  {
    id: '4', name: 'Tacos', category: 'Mexican', time: '25 min', servings: 4,
    ingredients: ['ground beef', 'tortilla', 'lettuce', 'tomato', 'cheese', 'sour cream', 'salsa', 'onion', 'lime'],
  },
  {
    id: '5', name: 'Caesar Salad', category: 'American', time: '15 min', servings: 2,
    ingredients: ['romaine', 'lettuce', 'parmesan', 'crouton', 'chicken', 'lemon', 'garlic'],
  },
  {
    id: '6', name: 'Fried Rice', category: 'Asian', time: '15 min', servings: 2,
    ingredients: ['rice', 'egg', 'soy sauce', 'garlic', 'onion', 'peas', 'carrot', 'sesame oil'],
  },
  {
    id: '7', name: 'Banana Pancakes', category: 'Breakfast', time: '20 min', servings: 2,
    ingredients: ['banana', 'egg', 'flour', 'milk', 'butter', 'baking powder', 'maple syrup'],
  },
  {
    id: '8', name: 'Grilled Cheese', category: 'American', time: '10 min', servings: 1,
    ingredients: ['bread', 'cheese', 'butter', 'tomato'],
  },
  {
    id: '9', name: 'Lemon Salmon', category: 'Seafood', time: '20 min', servings: 2,
    ingredients: ['salmon', 'lemon', 'garlic', 'butter', 'dill', 'olive oil', 'asparagus'],
  },
  {
    id: '10', name: 'Black Bean Soup', category: 'Vegetarian', time: '35 min', servings: 4,
    ingredients: ['black bean', 'onion', 'garlic', 'cumin', 'broth', 'lime', 'cilantro', 'tomato'],
  },
  {
    id: '11', name: 'Overnight Oats', category: 'Breakfast', time: '5 min', servings: 1,
    ingredients: ['oats', 'milk', 'yogurt', 'chia', 'honey', 'banana', 'blueberry'],
  },
  {
    id: '12', name: 'Shakshuka', category: 'Mediterranean', time: '25 min', servings: 2,
    ingredients: ['egg', 'tomato', 'bell pepper', 'onion', 'garlic', 'cumin', 'paprika', 'feta'],
  },
  {
    id: '13', name: 'Quesadillas', category: 'Mexican', time: '15 min', servings: 2,
    ingredients: ['tortilla', 'cheese', 'chicken', 'bell pepper', 'onion', 'sour cream', 'salsa'],
  },
  {
    id: '14', name: 'Greek Salad', category: 'Mediterranean', time: '10 min', servings: 2,
    ingredients: ['cucumber', 'tomato', 'olive', 'feta', 'red onion', 'bell pepper', 'olive oil', 'oregano'],
  },
  {
    id: '15', name: 'Tomato Soup', category: 'Comfort', time: '30 min', servings: 4,
    ingredients: ['tomato', 'onion', 'garlic', 'cream', 'butter', 'basil', 'bread'],
  },
  {
    id: '16', name: 'Pasta Carbonara', category: 'Italian', time: '25 min', servings: 2,
    ingredients: ['pasta', 'spaghetti', 'bacon', 'egg', 'parmesan', 'garlic', 'black pepper'],
  },
  {
    id: '17', name: 'Veggie Omelette', category: 'Breakfast', time: '10 min', servings: 1,
    ingredients: ['egg', 'bell pepper', 'onion', 'mushroom', 'spinach', 'cheese', 'butter'],
  },
  {
    id: '18', name: 'Chicken Curry', category: 'Indian', time: '40 min', servings: 4,
    ingredients: ['chicken', 'onion', 'garlic', 'ginger', 'tomato', 'coconut milk', 'curry', 'rice', 'cilantro'],
  },
  {
    id: '19', name: 'BLT Sandwich', category: 'American', time: '10 min', servings: 1,
    ingredients: ['bacon', 'lettuce', 'tomato', 'bread', 'mayo'],
  },
  {
    id: '20', name: 'Smoothie Bowl', category: 'Breakfast', time: '10 min', servings: 1,
    ingredients: ['banana', 'berry', 'blueberry', 'strawberry', 'yogurt', 'granola', 'honey', 'milk'],
  },
  {
    id: '21', name: 'Tuna Salad Sandwich', category: 'American', time: '10 min', servings: 2,
    ingredients: ['tuna', 'mayo', 'celery', 'onion', 'lemon', 'mustard', 'bread', 'lettuce'],
  },
  {
    id: '22', name: 'Veggie Pasta', category: 'Italian', time: '25 min', servings: 2,
    ingredients: ['pasta', 'zucchini', 'cherry tomato', 'garlic', 'olive oil', 'parmesan', 'basil'],
  },
  {
    id: '23', name: 'Nachos', category: 'Mexican', time: '15 min', servings: 4,
    ingredients: ['tortilla chip', 'nacho', 'cheese', 'jalapeño', 'tomato', 'sour cream', 'black bean', 'guacamole'],
  },
  {
    id: '24', name: 'Egg Fried Rice', category: 'Asian', time: '15 min', servings: 2,
    ingredients: ['rice', 'egg', 'soy sauce', 'green onion', 'garlic', 'sesame oil', 'carrot', 'peas'],
  },
  {
    id: '25', name: 'Caprese Salad', category: 'Italian', time: '10 min', servings: 2,
    ingredients: ['mozzarella', 'tomato', 'basil', 'olive oil', 'balsamic'],
  },
];

export interface RecipeMatch extends Recipe {
  matchCount: number;
  matchedIngredients: string[];
}

export function getRecipeMatches(trackedItems: string[]): RecipeMatch[] {
  const normalizedItems = trackedItems.map((i) => i.toLowerCase());

  return RECIPES.map((recipe) => {
    const matchedIngredients = recipe.ingredients.filter((ingredient) =>
      normalizedItems.some(
        (item) => item.includes(ingredient) || ingredient.includes(item)
      )
    );

    return { ...recipe, matchCount: matchedIngredients.length, matchedIngredients };
  }).sort((a, b) => b.matchCount - a.matchCount);
}
