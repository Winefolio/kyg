export const SLIDE_TEMPLATES = [
  {
    id: 'visual-assessment',
    name: 'Visual Assessment',
    type: 'question',
    sectionType: 'intro',
    payloadTemplate: {
      question: 'What do you observe about this wine\'s appearance?',
      type: 'multiple_choice',
      options: ['Clear', 'Hazy', 'Brilliant', 'Cloudy'],
      allowMultiple: true
    },
    isPublic: true
  },
  {
    id: 'aroma-intensity',
    name: 'Aroma Intensity',
    type: 'question',
    sectionType: 'deep_dive',
    payloadTemplate: {
      question: 'Rate the intensity of the wine\'s aroma',
      type: 'slider',
      min: 1,
      max: 10,
      step: 1
    },
    isPublic: true
  },
  {
    id: 'tasting-notes',
    name: 'Tasting Notes',
    type: 'question',
    sectionType: 'deep_dive',
    payloadTemplate: {
      question: 'Describe the flavors you taste',
      type: 'text_input',
      placeholder: 'e.g., dark fruit, vanilla, spice...'
    },
    isPublic: true
  },
  {
    id: 'body-assessment',
    name: 'Body Assessment',
    type: 'question',
    sectionType: 'deep_dive',
    payloadTemplate: {
      question: 'How would you describe the body of this wine?',
      type: 'multiple_choice',
      options: ['Light', 'Medium', 'Full'],
      allowMultiple: false
    },
    isPublic: true
  },
  {
    id: 'tannin-level',
    name: 'Tannin Level',
    type: 'question',
    sectionType: 'deep_dive',
    payloadTemplate: {
      question: 'Rate the tannin level',
      type: 'slider',
      min: 1,
      max: 10,
      step: 1
    },
    isPublic: true
  },
  {
    id: 'acidity-level',
    name: 'Acidity Level',
    type: 'question',
    sectionType: 'deep_dive',
    payloadTemplate: {
      question: 'Rate the acidity level',
      type: 'slider',
      min: 1,
      max: 10,
      step: 1
    },
    isPublic: true
  },
  {
    id: 'finish-length',
    name: 'Finish Length',
    type: 'question',
    sectionType: 'ending',
    payloadTemplate: {
      question: 'How would you describe the finish?',
      type: 'multiple_choice',
      options: ['Short', 'Medium', 'Long', 'Very Long'],
      allowMultiple: false
    },
    isPublic: true
  },
  {
    id: 'overall-impression',
    name: 'Overall Impression',
    type: 'question',
    sectionType: 'ending',
    payloadTemplate: {
      question: 'Rate your overall impression of this wine',
      type: 'slider',
      min: 1,
      max: 10,
      step: 1
    },
    isPublic: true
  }
];

export const WINE_TEMPLATES = [
  {
    name: 'Bordeaux Red Blend',
    type: 'red',
    grapeVarietals: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'],
    region: 'Bordeaux, France',
    characteristics: {
      'Body': 'Full',
      'Tannins': 8,
      'Acidity': 7,
      'Fruit Intensity': 8,
      'Oak Influence': 7
    },
    description: 'A classic Bordeaux blend with structured tannins and complex fruit flavors',
    imageUrl: 'https://images.unsplash.com/photo-1574505208894-83b2be2ee276?w=400'
  },
  {
    name: 'Burgundy Pinot Noir',
    type: 'red',
    grapeVarietals: ['Pinot Noir'],
    region: 'Burgundy, France',
    characteristics: {
      'Body': 'Medium',
      'Tannins': 5,
      'Acidity': 8,
      'Fruit Intensity': 7,
      'Oak Influence': 6
    },
    description: 'Elegant Pinot Noir with bright acidity and earthy undertones',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400'
  },
  {
    name: 'Chablis Chardonnay',
    type: 'white',
    grapeVarietals: ['Chardonnay'],
    region: 'Chablis, France',
    characteristics: {
      'Body': 'Medium',
      'Acidity': 9,
      'Mineral Notes': true,
      'Oak Influence': 2,
      'Fruit Intensity': 6
    },
    description: 'Crisp, mineral-driven Chardonnay with citrus and green apple notes',
    imageUrl: 'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=400'
  },
  {
    name: 'Champagne Blend',
    type: 'sparkling',
    grapeVarietals: ['Chardonnay', 'Pinot Noir', 'Pinot Meunier'],
    region: 'Champagne, France',
    characteristics: {
      'Body': 'Light',
      'Acidity': 9,
      'Fruit Intensity': 7,
      'Mineral Notes': true
    },
    description: 'Traditional Champagne method sparkling wine with fine bubbles',
    imageUrl: 'https://images.unsplash.com/photo-1549418885-0da47c3b70fd?w=400'
  },
  {
    name: 'Napa Valley Cabernet',
    type: 'red',
    grapeVarietals: ['Cabernet Sauvignon'],
    region: 'Napa Valley, California',
    characteristics: {
      'Body': 'Full',
      'Tannins': 9,
      'Acidity': 6,
      'Fruit Intensity': 9,
      'Oak Influence': 8
    },
    description: 'Bold Napa Cabernet with rich fruit and robust tannins',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'
  }
];

export function getWineImage(wineType: string): string {
  const images = {
    red: 'https://images.unsplash.com/photo-1574505208894-83b2be2ee276?w=400',
    white: 'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=400',
    rose: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400',
    sparkling: 'https://images.unsplash.com/photo-1549418885-0da47c3b70fd?w=400',
    dessert: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400',
    fortified: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400'
  };
  return images[wineType as keyof typeof images] || images.red;
}

export function getGrapeVarietals(): string[] {
  return [
    'Cabernet Sauvignon',
    'Merlot',
    'Pinot Noir',
    'Syrah/Shiraz',
    'Grenache',
    'Sangiovese',
    'Tempranillo',
    'Nebbiolo',
    'Chardonnay',
    'Sauvignon Blanc',
    'Riesling',
    'Pinot Grigio/Pinot Gris',
    'Gewürztraminer',
    'Viognier',
    'Chenin Blanc',
    'Sémillon'
  ];
}

export function getWineTypes() {
  return [
    { value: 'red', label: 'Red Wine' },
    { value: 'white', label: 'White Wine' },
    { value: 'rose', label: 'Rosé' },
    { value: 'sparkling', label: 'Sparkling' },
    { value: 'dessert', label: 'Dessert Wine' },
    { value: 'fortified', label: 'Fortified Wine' }
  ];
}

export function getWineRegions(): string[] {
  return [
    'Bordeaux, France',
    'Burgundy, France',
    'Champagne, France',
    'Loire Valley, France',
    'Rhône Valley, France',
    'Alsace, France',
    'Tuscany, Italy',
    'Piedmont, Italy',
    'Veneto, Italy',
    'Sicily, Italy',
    'Rioja, Spain',
    'Ribera del Duero, Spain',
    'Priorat, Spain',
    'Douro, Portugal',
    'Napa Valley, California',
    'Sonoma County, California',
    'Paso Robles, California',
    'Oregon',
    'Washington State',
    'New York',
    'Barossa Valley, Australia',
    'Hunter Valley, Australia',
    'Margaret River, Australia',
    'Marlborough, New Zealand',
    'Central Otago, New Zealand',
    'Stellenbosch, South Africa',
    'Mendoza, Argentina',
    'Maipo Valley, Chile',
    'Mosel, Germany',
    'Rheingau, Germany'
  ];
}