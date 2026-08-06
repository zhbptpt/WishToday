export type FlavorRadar = {
  sweetness: number;
  bitterness: number;
  acidity: number;
  aroma: number;
  body: number;
  alcohol: number;
};

export type IngredientCategory =
  | "baseSpirit"
  | "liqueur"
  | "syrup"
  | "carbonated"
  | "juice"
  | "dairy"
  | "seasoning"
  | "freshFruit"
  | "herb"
  | "garnish";

export const ingredientCategories: IngredientCategory[] = [
  "baseSpirit",
  "liqueur",
  "syrup",
  "carbonated",
  "juice",
  "dairy",
  "seasoning",
  "freshFruit",
  "herb",
  "garnish",
];

export const ingredientCategoryLabels: Record<IngredientCategory, string> = {
  baseSpirit: "基酒",
  liqueur: "利口酒",
  syrup: "糖浆",
  carbonated: "气泡饮",
  juice: "果汁",
  dairy: "奶制品",
  seasoning: "调味",
  freshFruit: "鲜果",
  herb: "香草",
  garnish: "装饰",
};

export type CocktailIngredient = {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  amount: string;
  unit: string;
  stepOrder: number;
};

export type Cocktail = {
  id: string;
  nameZh: string;
  nameEn: string;
  imageUrl: string;
  recommendationText: string;
  backgroundStory: string;
  baseSpirit: string;
  glassType: string;
  alcoholLevel: string;
  difficulty: string;
  flavorTags: string[];
  flavorRadar: FlavorRadar;
  ingredients: CocktailIngredient[];
  steps: string[];
  bartenderNotes: string[];
};

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  description?: string;
  alcoholLevel?: string;
};

export type DiyDraft = {
  sourceCocktailId: string;
  sourceCocktailName: string;
  name: string;
  nameEn?: string;
  baseSpirit: string;
  ingredients: CocktailIngredient[];
  flavorTags: string[];
  notes: string;
  isDirty: boolean;
};

export type SavedRecipe = {
  id: string;
  sourceCocktailId: string;
  sourceCocktailName: string;
  name: string;
  nameEn?: string;
  baseSpirit: string;
  ingredients: CocktailIngredient[];
  flavorTags: string[];
  notes: string;
  createdAt: string;
};

export type UserSession = {
  isAuthenticated: boolean;
  userId?: string;
  nickname?: string;
};
