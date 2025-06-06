// Wine template system with intelligent image selection
export interface WineTemplate {
  id: string;
  name: string;
  wineType: string;
  grapeVarietals: string[];
  region: string;
  producer: string;
  vintage?: number;
  alcoholContent: string;
  description: string;
  imageUrl: string;
  expectedCharacteristics: {
    color: string;
    nose: string[];
    palate: string[];
    finish: string;
    servingTemp: string;
  };
}

// Wine image database with auto-selection logic
export const WINE_IMAGES = {
  // Red wine types
  'Cabernet Sauvignon': 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=600&fit=crop',
  'Merlot': 'https://images.unsplash.com/photo-1574982817-a0138501b8e7?w=400&h=600&fit=crop',
  'Pinot Noir': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop',
  'Syrah': 'https://images.unsplash.com/photo-1596142332133-327bcdda6a21?w=400&h=600&fit=crop',
  'Sangiovese': 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=600&fit=crop',
  'Tempranillo': 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=600&fit=crop',
  'Zinfandel': 'https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?w=400&h=600&fit=crop',
  
  // White wine types
  'Chardonnay': 'https://images.unsplash.com/photo-1560148803-6d4900e44b41?w=400&h=600&fit=crop',
  'Sauvignon Blanc': 'https://images.unsplash.com/photo-1598726667395-09c615817a8e?w=400&h=600&fit=crop',
  'Riesling': 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=600&fit=crop',
  'Pinot Grigio': 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=400&h=600&fit=crop',
  'Gewürztraminer': 'https://images.unsplash.com/photo-1574982817-a0138501b8e7?w=400&h=600&fit=crop',
  'Chenin Blanc': 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=600&fit=crop',
  
  // Rosé and Sparkling
  'Rosé': 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400&h=600&fit=crop',
  'Champagne': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=600&fit=crop',
  'Prosecco': 'https://images.unsplash.com/photo-1560148803-6d4900e44b41?w=400&h=600&fit=crop',
  'Cava': 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=600&fit=crop',
  
  // Default fallbacks
  'Red Wine': 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=600&fit=crop',
  'White Wine': 'https://images.unsplash.com/photo-1560148803-6d4900e44b41?w=400&h=600&fit=crop',
  'Sparkling Wine': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=600&fit=crop',
  'Default': 'https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?w=400&h=600&fit=crop'
};

// Auto-select wine image based on grape varietal or wine type
export function getWineImage(grapeVarietals: string[], wineType: string): string {
  // First, try to match by primary grape varietal
  if (grapeVarietals.length > 0) {
    const primaryGrape = grapeVarietals[0];
    if (WINE_IMAGES[primaryGrape as keyof typeof WINE_IMAGES]) {
      return WINE_IMAGES[primaryGrape as keyof typeof WINE_IMAGES];
    }
  }
  
  // Second, try to match by wine type
  if (WINE_IMAGES[wineType as keyof typeof WINE_IMAGES]) {
    return WINE_IMAGES[wineType as keyof typeof WINE_IMAGES];
  }
  
  // Third, try to match by general wine color
  const lowerWineType = wineType.toLowerCase();
  if (lowerWineType.includes('red')) {
    return WINE_IMAGES['Red Wine'];
  } else if (lowerWineType.includes('white')) {
    return WINE_IMAGES['White Wine'];
  } else if (lowerWineType.includes('sparkling') || lowerWineType.includes('champagne')) {
    return WINE_IMAGES['Sparkling Wine'];
  } else if (lowerWineType.includes('rosé') || lowerWineType.includes('rose')) {
    return WINE_IMAGES['Rosé'];
  }
  
  // Default fallback
  return WINE_IMAGES['Default'];
}

// Pre-defined wine templates for quick creation
export const WINE_TEMPLATES: WineTemplate[] = [
  {
    id: 'template-cabernet',
    name: 'Classic Cabernet Sauvignon',
    wineType: 'Red Wine',
    grapeVarietals: ['Cabernet Sauvignon'],
    region: 'Napa Valley, California',
    producer: 'Premium Winery',
    vintage: 2020,
    alcoholContent: '14.5%',
    description: 'Full-bodied red wine with rich tannins and complex fruit flavors.',
    imageUrl: WINE_IMAGES['Cabernet Sauvignon'],
    expectedCharacteristics: {
      color: 'Deep ruby red',
      nose: ['Blackcurrant', 'Cedar', 'Vanilla', 'Dark chocolate'],
      palate: ['Rich blackberry', 'Plum', 'Tobacco', 'Spice'],
      finish: 'Long and complex with lingering tannins',
      servingTemp: '16-18°C'
    }
  },
  {
    id: 'template-chardonnay',
    name: 'Elegant Chardonnay',
    wineType: 'White Wine',
    grapeVarietals: ['Chardonnay'],
    region: 'Burgundy, France',
    producer: 'Domaine Excellence',
    vintage: 2021,
    alcoholContent: '13.0%',
    description: 'Crisp white wine with mineral complexity and citrus notes.',
    imageUrl: WINE_IMAGES['Chardonnay'],
    expectedCharacteristics: {
      color: 'Pale golden yellow',
      nose: ['Green apple', 'Lemon zest', 'Mineral', 'White flowers'],
      palate: ['Crisp apple', 'Citrus', 'Honey', 'Butter'],
      finish: 'Clean and refreshing with mineral notes',
      servingTemp: '10-12°C'
    }
  },
  {
    id: 'template-pinot-noir',
    name: 'Refined Pinot Noir',
    wineType: 'Red Wine',
    grapeVarietals: ['Pinot Noir'],
    region: 'Burgundy, France',
    producer: 'Maison Rouge',
    vintage: 2019,
    alcoholContent: '13.5%',
    description: 'Light to medium-bodied red with elegant fruit and earthy notes.',
    imageUrl: WINE_IMAGES['Pinot Noir'],
    expectedCharacteristics: {
      color: 'Light to medium ruby',
      nose: ['Red cherry', 'Strawberry', 'Earth', 'Rose petals'],
      palate: ['Red fruit', 'Spice', 'Forest floor', 'Silky tannins'],
      finish: 'Medium length with lingering fruit',
      servingTemp: '14-16°C'
    }
  },
  {
    id: 'template-sauvignon-blanc',
    name: 'Vibrant Sauvignon Blanc',
    wineType: 'White Wine',
    grapeVarietals: ['Sauvignon Blanc'],
    region: 'Marlborough, New Zealand',
    producer: 'Southern Vineyards',
    vintage: 2022,
    alcoholContent: '12.5%',
    description: 'Fresh and zesty white wine with tropical fruit and herbaceous notes.',
    imageUrl: WINE_IMAGES['Sauvignon Blanc'],
    expectedCharacteristics: {
      color: 'Pale straw with green tints',
      nose: ['Passion fruit', 'Gooseberry', 'Fresh herbs', 'Lime'],
      palate: ['Tropical fruits', 'Citrus', 'Grass', 'Crisp acidity'],
      finish: 'Clean and refreshing',
      servingTemp: '8-10°C'
    }
  },
  {
    id: 'template-prosecco',
    name: 'Sparkling Prosecco',
    wineType: 'Sparkling Wine',
    grapeVarietals: ['Glera'],
    region: 'Veneto, Italy',
    producer: 'Casa Bollicine',
    vintage: 2022,
    alcoholContent: '11.0%',
    description: 'Light and refreshing sparkling wine with delicate bubbles.',
    imageUrl: WINE_IMAGES['Prosecco'],
    expectedCharacteristics: {
      color: 'Pale straw with persistent bubbles',
      nose: ['Green apple', 'Pear', 'White flowers', 'Citrus'],
      palate: ['Fresh fruit', 'Light and crisp', 'Fine bubbles'],
      finish: 'Clean and refreshing',
      servingTemp: '6-8°C'
    }
  },
  {
    id: 'template-rose',
    name: 'Provence Rosé',
    wineType: 'Rosé Wine',
    grapeVarietals: ['Grenache', 'Syrah', 'Cinsault'],
    region: 'Provence, France',
    producer: 'Château Rose',
    vintage: 2022,
    alcoholContent: '12.5%',
    description: 'Dry rosé with delicate fruit flavors and mineral finish.',
    imageUrl: WINE_IMAGES['Rosé'],
    expectedCharacteristics: {
      color: 'Pale salmon pink',
      nose: ['Red berries', 'White peach', 'Herbs', 'Mineral'],
      palate: ['Strawberry', 'Watermelon', 'Citrus', 'Dry finish'],
      finish: 'Crisp and clean',
      servingTemp: '8-10°C'
    }
  }
];

// Get template by ID
export function getWineTemplate(templateId: string): WineTemplate | undefined {
  return WINE_TEMPLATES.find(template => template.id === templateId);
}

// Get all available grape varietals for dropdown
export function getGrapeVarietals(): string[] {
  return [
    'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Sangiovese', 'Tempranillo', 'Zinfandel',
    'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio', 'Gewürztraminer', 'Chenin Blanc',
    'Grenache', 'Cinsault', 'Glera', 'Nebbiolo', 'Barbera', 'Carmenère', 'Malbec'
  ];
}

// Get wine types for dropdown
export function getWineTypes(): string[] {
  return ['Red Wine', 'White Wine', 'Rosé Wine', 'Sparkling Wine', 'Dessert Wine', 'Fortified Wine'];
}

// Get regions for dropdown
export function getWineRegions(): string[] {
  return [
    'Napa Valley, California', 'Sonoma County, California', 'Paso Robles, California',
    'Bordeaux, France', 'Burgundy, France', 'Champagne, France', 'Loire Valley, France', 'Provence, France',
    'Tuscany, Italy', 'Piedmont, Italy', 'Veneto, Italy', 'Sicily, Italy',
    'Rioja, Spain', 'Ribera del Duero, Spain', 'Priorat, Spain',
    'Mosel, Germany', 'Rheingau, Germany', 'Pfalz, Germany',
    'Marlborough, New Zealand', 'Central Otago, New Zealand',
    'Barossa Valley, Australia', 'Margaret River, Australia', 'Hunter Valley, Australia',
    'Mendoza, Argentina', 'Colchagua Valley, Chile', 'Stellenbosch, South Africa'
  ];
}