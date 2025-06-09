import type { GenericQuestion } from '@shared/schema';

interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'appearance' | 'aroma' | 'taste' | 'structure' | 'overall' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  question: GenericQuestion;
}

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // === APPEARANCE QUESTIONS ===
  {
    id: 'color-intensity',
    name: 'Color Intensity',
    description: 'Rate the depth and intensity of the wine\'s color',
    category: 'appearance',
    difficulty: 'beginner',
    question: {
      format: 'scale',
      config: {
        title: 'How would you rate the color intensity?',
        description: 'Look at the wine against a white background',
        scaleMin: 1,
        scaleMax: 5,
        scaleLabels: ['Pale', 'Deep'],
        showNumbers: true,
        visualStyle: 'slider'
      },
      metadata: {
        category: 'appearance',
        difficulty: 'beginner',
        estimatedTime: 15,
        tags: ['visual', 'color', 'intensity']
      }
    }
  },
  {
    id: 'clarity-assessment',
    name: 'Clarity Assessment',
    description: 'Evaluate how clear or cloudy the wine appears',
    category: 'appearance',
    difficulty: 'beginner',
    question: {
      format: 'multiple_choice',
      config: {
        title: 'How clear is the wine?',
        description: 'Hold the glass up to the light',
        options: [
          { id: '1', text: 'Crystal Clear', value: 'crystal-clear' },
          { id: '2', text: 'Clear', value: 'clear' },
          { id: '3', text: 'Slightly Hazy', value: 'slightly-hazy' },
          { id: '4', text: 'Cloudy', value: 'cloudy' }
        ],
        allowMultiple: false,
        allowOther: false
      },
      metadata: {
        category: 'appearance',
        difficulty: 'beginner',
        estimatedTime: 10,
        tags: ['visual', 'clarity', 'transparency']
      }
    }
  },

  // === AROMA QUESTIONS ===
  {
    id: 'first-nose-impression',
    name: 'First Nose Impression',
    description: 'Initial aromatic impression without swirling',
    category: 'aroma',
    difficulty: 'beginner',
    question: {
      format: 'scale',
      config: {
        title: 'Rate your first nose impression',
        description: 'Before swirling, what\'s your immediate reaction?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Closed/Muted', 'Expressive/Intense'],
        showNumbers: true,
        visualStyle: 'slider'
      },
      metadata: {
        category: 'aroma',
        difficulty: 'beginner',
        estimatedTime: 20,
        tags: ['aroma', 'first-impression', 'intensity']
      }
    }
  },
  {
    id: 'primary-aromas',
    name: 'Primary Aromas',
    description: 'Identify the main fruit and floral characteristics',
    category: 'aroma',
    difficulty: 'intermediate',
    question: {
      format: 'multiple_choice',
      config: {
        title: 'What primary aromas do you detect?',
        description: 'Select all that apply - these come from the grape itself',
        options: [
          { id: '1', text: 'Citrus (lemon, lime, grapefruit)', value: 'citrus' },
          { id: '2', text: 'Stone Fruit (peach, apricot, plum)', value: 'stone-fruit' },
          { id: '3', text: 'Red Berries (strawberry, raspberry)', value: 'red-berries' },
          { id: '4', text: 'Black Fruit (blackberry, black cherry)', value: 'black-fruit' },
          { id: '5', text: 'Tropical (pineapple, mango, passion fruit)', value: 'tropical' },
          { id: '6', text: 'Floral (rose, violet, honeysuckle)', value: 'floral' },
          { id: '7', text: 'Herbal (mint, eucalyptus, bell pepper)', value: 'herbal' }
        ],
        allowMultiple: true,
        allowOther: true,
        otherLabel: 'Other aroma'
      },
      metadata: {
        category: 'aroma',
        difficulty: 'intermediate',
        estimatedTime: 30,
        tags: ['aroma', 'fruit', 'floral', 'primary'],
        glossaryTerms: ['primary aromas', 'terpenes']
      }
    }
  },

  // === TASTE QUESTIONS ===
  {
    id: 'first-taste-impression',
    name: 'First Taste Impression',
    description: 'Overall rating of your initial taste experience',
    category: 'taste',
    difficulty: 'beginner',
    question: {
      format: 'scale',
      config: {
        title: 'Rate your first taste impression',
        description: 'Take a small sip and let it coat your palate',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Unpleasant', 'Exceptional'],
        showNumbers: true,
        visualStyle: 'slider'
      },
      metadata: {
        category: 'taste',
        difficulty: 'beginner',
        estimatedTime: 20,
        tags: ['taste', 'first-impression', 'overall']
      }
    }
  },
  {
    id: 'sweetness-level',
    name: 'Sweetness Level',
    description: 'Assess the perceived sweetness in the wine',
    category: 'taste',
    difficulty: 'beginner',
    question: {
      format: 'multiple_choice',
      config: {
        title: 'How sweet is this wine?',
        description: 'Focus on the tip of your tongue',
        options: [
          { id: '1', text: 'Bone Dry', value: 'bone-dry' },
          { id: '2', text: 'Dry', value: 'dry' },
          { id: '3', text: 'Off-Dry', value: 'off-dry' },
          { id: '4', text: 'Medium Sweet', value: 'medium-sweet' },
          { id: '5', text: 'Sweet', value: 'sweet' },
          { id: '6', text: 'Very Sweet', value: 'very-sweet' }
        ],
        allowMultiple: false,
        allowOther: false
      },
      metadata: {
        category: 'taste',
        difficulty: 'beginner',
        estimatedTime: 15,
        tags: ['taste', 'sweetness', 'residual-sugar'],
        glossaryTerms: ['residual sugar', 'dry wine']
      }
    }
  },
  {
    id: 'acidity-assessment',
    name: 'Acidity Assessment',
    description: 'Evaluate the wine\'s acidity level',
    category: 'taste',
    difficulty: 'intermediate',
    question: {
      format: 'scale',
      config: {
        title: 'How would you rate the acidity?',
        description: 'Notice the mouth-watering sensation',
        scaleMin: 1,
        scaleMax: 5,
        scaleLabels: ['Low/Flabby', 'High/Tart'],
        showNumbers: true,
        visualStyle: 'slider'
      },
      metadata: {
        category: 'taste',
        difficulty: 'intermediate',
        estimatedTime: 20,
        tags: ['taste', 'acidity', 'structure'],
        glossaryTerms: ['acidity', 'tartaric acid']
      }
    }
  },

  // === STRUCTURE QUESTIONS ===
  {
    id: 'body-weight',
    name: 'Body Weight',
    description: 'Assess the overall weight and texture of the wine',
    category: 'structure',
    difficulty: 'beginner',
    question: {
      format: 'multiple_choice',
      config: {
        title: 'How would you describe the body?',
        description: 'Think about how the wine feels in your mouth',
        options: [
          { id: '1', text: 'Light Body', value: 'light' },
          { id: '2', text: 'Medium(-) Body', value: 'medium-minus' },
          { id: '3', text: 'Medium Body', value: 'medium' },
          { id: '4', text: 'Medium(+) Body', value: 'medium-plus' },
          { id: '5', text: 'Full Body', value: 'full' }
        ],
        allowMultiple: false,
        allowOther: false
      },
      metadata: {
        category: 'structure',
        difficulty: 'beginner',
        estimatedTime: 20,
        tags: ['structure', 'body', 'mouthfeel'],
        glossaryTerms: ['body', 'mouthfeel']
      }
    }
  },
  {
    id: 'tannin-assessment',
    name: 'Tannin Assessment',
    description: 'Evaluate tannin level and quality (for red wines)',
    category: 'structure',
    difficulty: 'intermediate',
    question: {
      format: 'multiple_choice',
      config: {
        title: 'How would you describe the tannins?',
        description: 'Focus on the drying sensation in your mouth',
        options: [
          { id: '1', text: 'Low - Barely perceptible', value: 'low' },
          { id: '2', text: 'Medium(-) - Soft and smooth', value: 'medium-minus' },
          { id: '3', text: 'Medium - Well-integrated', value: 'medium' },
          { id: '4', text: 'Medium(+) - Firm and structured', value: 'medium-plus' },
          { id: '5', text: 'High - Gripping and astringent', value: 'high' }
        ],
        allowMultiple: false,
        allowOther: false
      },
      metadata: {
        category: 'structure',
        difficulty: 'intermediate',
        estimatedTime: 25,
        tags: ['structure', 'tannins', 'astringency'],
        glossaryTerms: ['tannins', 'astringency']
      }
    }
  },

  // === OVERALL QUESTIONS ===
  {
    id: 'overall-quality',
    name: 'Overall Quality',
    description: 'Your assessment of the wine\'s overall quality',
    category: 'overall',
    difficulty: 'advanced',
    question: {
      format: 'scale',
      config: {
        title: 'Rate the overall quality of this wine',
        description: 'Consider balance, complexity, length, and typicity',
        scaleMin: 1,
        scaleMax: 5,
        scaleLabels: ['Poor', 'Outstanding'],
        showNumbers: true,
        visualStyle: 'slider'
      },
      metadata: {
        category: 'overall',
        difficulty: 'advanced',
        estimatedTime: 30,
        tags: ['overall', 'quality', 'assessment'],
        glossaryTerms: ['balance', 'complexity', 'length']
      }
    }
  },
  {
    id: 'recommendation',
    name: 'Recommendation',
    description: 'Would you recommend this wine to others?',
    category: 'overall',
    difficulty: 'beginner',
    question: {
      format: 'boolean',
      config: {
        title: 'Would you recommend this wine?',
        description: 'Based on your tasting experience',
        trueLabel: 'Yes, I\'d recommend it',
        falseLabel: 'No, not for me',
        visualStyle: 'buttons'
      },
      metadata: {
        category: 'overall',
        difficulty: 'beginner',
        estimatedTime: 10,
        tags: ['overall', 'recommendation', 'preference']
      }
    }
  },
  {
    id: 'tasting-notes',
    name: 'Tasting Notes',
    description: 'Open-ended description of your tasting experience',
    category: 'overall',
    difficulty: 'intermediate',
    question: {
      format: 'text',
      config: {
        title: 'Describe your tasting experience',
        description: 'Share your thoughts about this wine in your own words',
        placeholder: 'This wine shows...',
        inputType: 'textarea',
        rows: 4,
        maxLength: 500
      },
      metadata: {
        category: 'overall',
        difficulty: 'intermediate',
        estimatedTime: 60,
        tags: ['overall', 'notes', 'description', 'personal']
      }
    }
  },

  // === MEDIA MESSAGE TEMPLATES ===
  {
    id: 'sommelier-welcome-video',
    name: 'Sommelier Welcome Video',
    description: 'Personal video greeting from the sommelier',
    category: 'general',
    difficulty: 'beginner',
    question: {
      format: 'video_message',
      config: {
        title: 'Welcome to Our Wine Tasting',
        description: 'A personal greeting from your sommelier',
        videoUrl: '',
        autoplay: false,
        controls: true
      },
      metadata: {
        category: 'general',
        difficulty: 'beginner',
        estimatedTime: 120,
        tags: ['welcome', 'introduction', 'sommelier', 'video']
      }
    }
  },
  {
    id: 'wine-introduction-video',
    name: 'Wine Introduction Video',
    description: 'Video introduction about the specific wine',
    category: 'general',
    difficulty: 'intermediate',
    question: {
      format: 'video_message',
      config: {
        title: 'About This Wine',
        description: 'Learn about the wine you\'re about to taste',
        videoUrl: '',
        autoplay: false,
        controls: true
      },
      metadata: {
        category: 'general',
        difficulty: 'intermediate',
        estimatedTime: 180,
        tags: ['wine', 'introduction', 'background', 'video']
      }
    }
  },
  {
    id: 'tasting-technique-video',
    name: 'Tasting Technique Video',
    description: 'Video demonstrating proper wine tasting techniques',
    category: 'general',
    difficulty: 'beginner',
    question: {
      format: 'video_message',
      config: {
        title: 'Wine Tasting Techniques',
        description: 'Learn how to properly taste and evaluate wine',
        videoUrl: '',
        autoplay: false,
        controls: true
      },
      metadata: {
        category: 'general',
        difficulty: 'beginner',
        estimatedTime: 240,
        tags: ['technique', 'education', 'tasting', 'video']
      }
    }
  },
  {
    id: 'sommelier-audio-note',
    name: 'Sommelier Audio Note',
    description: 'Personal audio message from the sommelier',
    category: 'general',
    difficulty: 'beginner',
    question: {
      format: 'audio_message',
      config: {
        title: 'A Message from Your Sommelier',
        description: 'Listen to personal insights about this wine',
        audioUrl: '',
        autoplay: false
      },
      metadata: {
        category: 'general',
        difficulty: 'beginner',
        estimatedTime: 90,
        tags: ['audio', 'sommelier', 'insight', 'personal']
      }
    }
  },
  {
    id: 'wine-story-audio',
    name: 'Wine Story Audio',
    description: 'Audio story about the wine\'s origin and production',
    category: 'general',
    difficulty: 'intermediate',
    question: {
      format: 'audio_message',
      config: {
        title: 'The Story Behind This Wine',
        description: 'Discover the vineyard, winemaker, and production story',
        audioUrl: '',
        autoplay: false
      },
      metadata: {
        category: 'general',
        difficulty: 'intermediate',
        estimatedTime: 150,
        tags: ['story', 'vineyard', 'production', 'audio']
      }
    }
  },
  {
    id: 'tasting-encouragement-audio',
    name: 'Tasting Encouragement',
    description: 'Encouraging audio message for first-time tasters',
    category: 'general',
    difficulty: 'beginner',
    question: {
      format: 'audio_message',
      config: {
        title: 'You\'re Doing Great!',
        description: 'Encouragement and guidance for new wine tasters',
        audioUrl: '',
        autoplay: false
      },
      metadata: {
        category: 'general',
        difficulty: 'beginner',
        estimatedTime: 60,
        tags: ['encouragement', 'guidance', 'beginner', 'audio']
      }
    }
  }
];

// Helper functions for template suggestions
export function getTemplatesByCategory(category: string): QuestionTemplate[] {
  return QUESTION_TEMPLATES.filter(template => template.category === category);
}

export function getTemplatesByDifficulty(difficulty: string): QuestionTemplate[] {
  return QUESTION_TEMPLATES.filter(template => template.difficulty === difficulty);
}

export function getTemplatesForContext(
  wineType: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | string,
  sectionType: 'intro' | 'deep_dive' | 'ending',
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): QuestionTemplate[] {
  let suggestions: QuestionTemplate[] = [];

  switch (sectionType) {
    case 'intro':
      suggestions = QUESTION_TEMPLATES.filter(t => 
        t.category === 'appearance' || 
        (t.category === 'aroma' && t.id === 'first-nose-impression') ||
        (t.category === 'taste' && t.id === 'first-taste-impression')
      );
      break;
      
    case 'deep_dive':
      suggestions = QUESTION_TEMPLATES.filter(t => 
        t.category === 'aroma' || 
        t.category === 'taste' || 
        t.category === 'structure'
      );
      
      // Filter out tannin questions for white wines
      if (wineType === 'white' || wineType === 'rosé') {
        suggestions = suggestions.filter(t => t.id !== 'tannin-assessment');
      }
      break;
      
    case 'ending':
      suggestions = QUESTION_TEMPLATES.filter(t => t.category === 'overall');
      break;
  }

  // Filter by difficulty if not beginner
  if (difficulty !== 'beginner') {
    suggestions = suggestions.filter(t => 
      t.difficulty === difficulty || t.difficulty === 'beginner'
    );
  } else {
    // For beginners, prioritize beginner and intermediate questions
    suggestions = suggestions.filter(t => 
      t.difficulty === 'beginner' || t.difficulty === 'intermediate'
    );
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

export function searchTemplates(query: string): QuestionTemplate[] {
  const lowerQuery = query.toLowerCase();
  return QUESTION_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.question.config.title.toLowerCase().includes(lowerQuery) ||
    template.question.metadata?.tags?.some(tag => tag.includes(lowerQuery))
  );
}