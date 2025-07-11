import { Eye, Wind, Palette, Droplets, Zap, Clock, Star, Type, CheckCircle, Sparkles, Wine } from 'lucide-react';

export const SLIDE_TEMPLATES = [
  {
    id: 'welcome-slide',
    name: 'Welcome to Tasting',
    type: 'interlude',
    sectionType: 'intro',
    icon: Sparkles,
    description: 'Introduction slide for the wine',
    payloadTemplate: {
      title: "Welcome to {Wine Name}",
      description: "Get ready to explore this exceptional wine. We'll guide you through its unique characteristics and flavors.",
      duration: 5000,
      backgroundImage: '',
      animation: 'fade'
    }
  },
  {
    id: 'visual-assessment',
    name: 'Visual Assessment',
    type: 'question',
    sectionType: 'intro',
    icon: Eye,
    description: "Evaluate the wine's appearance.",
    payloadTemplate: {
      question_type: 'multiple_choice',
      title: "How would you describe the wine's clarity and appearance?",
      question: "How would you describe the wine's clarity and appearance?",
      description: "Look at the wine against a white background and assess its visual clarity.",
      options: [
        { id: '1', text: 'Clear', value: 'clear', description: 'Transparent with no visible particles' },
        { id: '2', text: 'Hazy', value: 'hazy', description: 'Slightly cloudy with some particles' },
        { id: '3', text: 'Brilliant', value: 'brilliant', description: 'Crystal clear and sparkling' },
        { id: '4', text: 'Cloudy', value: 'cloudy', description: 'Noticeably murky or opaque' }
      ],
      allowMultiple: false,
      allow_multiple: false,
      timeLimit: 30,
      points: 10
    }
  },
  {
    id: 'aroma-intensity',
    name: 'Aroma Intensity',
    type: 'question',
    sectionType: 'deep_dive',
    icon: Wind,
    description: "Rate the wine's aroma intensity.",
    payloadTemplate: {
      question_type: 'scale',
      title: "How intense are the wine's aromas?",
      question: "How intense are the wine's aromas?",
      description: "Swirl the glass and take a deep smell. Rate from subtle to powerful.",
      scale_min: 1,
      scale_max: 10,
      scaleMin: 1,
      scaleMax: 10,
      scale_labels: ['Subtle', 'Powerful'],
      scaleLabels: ['Subtle', 'Powerful'],
      timeLimit: 45,
      points: 15
    }
  },
  {
    id: 'tasting-notes',
    name: 'Tasting Notes',
    type: 'question',
    sectionType: 'deep_dive',
    icon: Palette,
    description: 'Describe the primary flavors.',
    payloadTemplate: {
      question_type: 'text',
      title: "What primary flavors do you taste in this wine?",
      question: "What primary flavors do you taste in this wine?",
      description: "Take a sip and describe the dominant flavors you experience. Be specific about fruit, spice, oak, or other notes.",
      placeholder: 'e.g., dark fruit, vanilla, spice, leather, earth...',
      maxLength: 500,
      timeLimit: 60,
      points: 20
    }
  },
  {
    id: 'body-assessment',
    name: 'Body Assessment',
    type: 'question',
    sectionType: 'deep_dive',
    icon: Droplets,
    description: 'Determine the weight of the wine on your palate.',
    payloadTemplate: {
      question_type: 'multiple_choice',
      title: "How would you describe the body or weight of this wine?",
      question: "How would you describe the body or weight of this wine?",
      description: "Think about how the wine feels in your mouth - like the difference between skim milk (light) and cream (full).",
      options: [
        { id: '1', text: 'Light', value: 'light', description: 'Like water or skim milk - delicate and less weighty' },
        { id: '2', text: 'Medium', value: 'medium', description: 'Like whole milk - balanced weight and texture' },
        { id: '3', text: 'Full', value: 'full', description: 'Like cream - rich, heavy, and substantial on the palate' }
      ],
      allowMultiple: false,
      allow_multiple: false,
      timeLimit: 30,
      points: 15
    }
  },
  {
    id: 'tannin-level',
    name: 'Tannin Level',
    type: 'question',
    sectionType: 'deep_dive',
    icon: Zap,
    description: "Rate the wine's tannin level.",
    payloadTemplate: {
      question_type: 'scale',
      title: "How would you rate the tannin level in this wine?",
      question: "How would you rate the tannin level in this wine?",
      description: "Tannins create a drying, grippy sensation on your gums and tongue. Think of the difference between black tea (high tannins) and herbal tea (low tannins).",
      scale_min: 1,
      scale_max: 10,
      scaleMin: 1,
      scaleMax: 10,
      scale_labels: ['Soft', 'Grippy'],
      scaleLabels: ['Soft', 'Grippy'],
      timeLimit: 40,
      points: 15
    }
  },
  {
    id: 'acidity-level',
    name: 'Acidity Level',
    type: 'question',
    sectionType: 'deep_dive',
    icon: Zap,
    description: "Rate the wine's acidity.",
    payloadTemplate: {
      question_type: 'scale',
      title: "How would you rate the acidity level of this wine?",
      question: "How would you rate the acidity level of this wine?",
      description: "Acidity makes your mouth water and creates a bright, crisp sensation. Think lemon juice (high acidity) vs. milk (low acidity).",
      scale_min: 1,
      scale_max: 10,
      scaleMin: 1,
      scaleMax: 10,
      scale_labels: ['Low', 'High'],
      scaleLabels: ['Low', 'High'],
      timeLimit: 35,
      points: 15
    }
  },
  {
    id: 'finish-length',
    name: 'Finish Length',
    type: 'question',
    sectionType: 'ending',
    icon: Clock,
    description: 'How long do the flavors linger?',
    payloadTemplate: {
      question_type: 'multiple_choice',
      title: "How long do the wine's flavors linger after swallowing?",
      question: "How long do the wine's flavors linger after swallowing?",
      description: "The finish is how long you can taste the wine after it's gone. Count the seconds of flavor persistence.",
      options: [
        { id: '1', text: 'Short', value: 'short', description: 'Flavors disappear within 5-10 seconds' },
        { id: '2', text: 'Medium', value: 'medium', description: 'Flavors linger for 10-30 seconds' },
        { id: '3', text: 'Long', value: 'long', description: 'Flavors persist for 30+ seconds' }
      ],
      allowMultiple: false,
      allow_multiple: false,
      timeLimit: 45,
      points: 15
    }
  },
  {
    id: 'overall-impression',
    name: 'Overall Impression',
    type: 'question',
    sectionType: 'ending',
    icon: Star,
    description: 'Give your final rating for this wine.',
    payloadTemplate: {
      question_type: 'scale',
      title: "What is your overall impression of this wine?",
      question: "What is your overall impression of this wine?",
      description: "Consider all aspects - aroma, taste, balance, complexity, and personal enjoyment. Rate your overall experience.",
      scale_min: 1,
      scale_max: 10,
      scaleMin: 1,
      scaleMax: 10,
      scale_labels: ['Poor', 'Excellent'],
      scaleLabels: ['Poor', 'Excellent'],
      timeLimit: 30,
      points: 25
    }
  },
  {
    id: 'wine-transition',
    name: 'Wine Transition',
    type: 'transition',
    sectionType: 'intro',
    icon: Sparkles,
    description: 'Smooth transition between wines',
    payloadTemplate: {
      title: "Moving to our next selection",
      description: "Prepare your palate for the next wine experience",
      duration: 2500,
      showContinueButton: false,
      animation_type: 'wine_glass_fill',
      backgroundImage: ''
    }
  },
  {
    id: 'section-transition',
    name: 'Section Transition',
    type: 'transition',
    sectionType: 'deep_dive',
    icon: CheckCircle,
    description: 'Transition between tasting sections',
    payloadTemplate: {
      title: "Let's dive deeper",
      description: "Now we'll explore the wine's complexity",
      duration: 2000,
      showContinueButton: false,
      animation_type: 'fade',
      backgroundImage: ''
    }
  },
  {
    id: 'quick-transition',
    name: 'Quick Transition',
    type: 'transition',
    sectionType: 'ending',
    icon: Zap,
    description: 'Brief transition for flow',
    payloadTemplate: {
      title: "Almost there",
      description: "",
      duration: 1500,
      showContinueButton: false,
      animation_type: 'slide',
      backgroundImage: ''
    }
  },
  {
    id: 'wine-intro-quick',
    name: 'Quick Wine Introduction',
    type: 'transition',
    sectionType: 'intro',
    icon: Wine,
    description: 'Fast 1-2 second wine intro',
    payloadTemplate: {
      title: "Next: {Wine Name}",
      description: "Get ready for your next tasting",
      duration: 1200,
      showContinueButton: false,
      animation_type: 'wine_glass_fill',
      backgroundImage: ''
    }
  },
  {
    id: 'manual-transition',
    name: 'Manual Continue',
    type: 'transition',
    sectionType: 'intro',
    icon: Clock,
    description: 'Transition with manual advance',
    payloadTemplate: {
      title: "Take a moment",
      description: "When you're ready, continue to the next experience",
      duration: 5000,
      showContinueButton: true,
      animation_type: 'wine_glass_fill',
      backgroundImage: ''
    }
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
  },
  {
    name: 'Natural Orange Wine',
    type: 'orange',
    grapeVarietals: ['Pinot Grigio'],
    region: 'Friuli, Italy',
    characteristics: {
      'Body': 'Medium',
      'Tannins': 6,
      'Acidity': 7,
      'Fruit Intensity': 6,
      'Oak Influence': 2
    },
    description: 'Skin-contact white wine with amber hue and complex texture',
    imageUrl: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400'
  }
];

export function getWineImage(wineType: string): string {
  const images = {
    red: 'https://images.unsplash.com/photo-1574505208894-83b2be2ee276?w=400',
    white: 'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=400',
    rose: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400',
    sparkling: 'https://images.unsplash.com/photo-1549418885-0da47c3b70fd?w=400',
    dessert: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400',
    fortified: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400',
    orange: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400'
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
    { value: 'fortified', label: 'Fortified Wine' },
    { value: 'orange', label: 'Orange Wine' }
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