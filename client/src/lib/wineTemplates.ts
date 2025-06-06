import { HelpCircle, Clapperboard, Video, Music, BarChart3, MessageSquare, Image, Type, CheckCircle } from "lucide-react";

export const SLIDE_TEMPLATES = [
  {
    type: 'question',
    name: 'Multiple Choice',
    icon: HelpCircle,
    description: 'Ask participants to choose from multiple options with descriptions and tooltips.',
    defaultPayload: {
      title: 'What is your initial impression of this wine?',
      description: 'Take a moment to smell and observe the wine before selecting your answer.',
      question_type: 'multiple_choice',
      options: [
        { 
          text: 'Fresh and vibrant', 
          description: 'The wine feels lively with bright acidity and fresh fruit notes',
          tooltip: 'Wines with high acidity often taste fresh and vibrant, like citrus or green apple',
          value: 'fresh_vibrant' 
        },
        { 
          text: 'Rich and full-bodied', 
          description: 'The wine has weight and depth with complex flavors',
          tooltip: 'Full-bodied wines have more alcohol, tannins, and concentrated flavors',
          value: 'rich_full' 
        },
        { 
          text: 'Delicate and subtle', 
          description: 'The wine is gentle with nuanced, understated characteristics',
          tooltip: 'Delicate wines often have lower alcohol and lighter flavors that require attention to appreciate',
          value: 'delicate_subtle' 
        }
      ]
    }
  },
  {
    type: 'question',
    name: 'Scale Rating',
    icon: BarChart3,
    description: 'Rate intensity, preference, or agreement on a sliding scale.',
    defaultPayload: {
      title: 'How intense is the aroma?',
      description: 'Move the slider to rate the intensity of the wine\'s aroma from subtle to powerful.',
      question_type: 'scale',
      scale_min: 1,
      scale_max: 10,
      scale_min_label: 'Very Subtle',
      scale_max_label: 'Very Intense'
    }
  },
  {
    type: 'question',
    name: 'Yes/No',
    icon: CheckCircle,
    description: 'Simple binary choice question.',
    defaultPayload: {
      title: 'Can you detect oak aging in this wine?',
      description: 'Oak aging often adds vanilla, spice, or toasty flavors to wine.',
      question_type: 'boolean'
    }
  },
  {
    type: 'question',
    name: 'Text Response',
    icon: Type,
    description: 'Free-form text input for detailed responses.',
    defaultPayload: {
      title: 'Describe the flavors you taste',
      description: 'Use your own words to describe what you experience when tasting this wine.',
      question_type: 'text'
    }
  },
  {
    type: 'interlude',
    name: 'Interlude',
    icon: Clapperboard,
    description: 'Transition slide with information or instructions.',
    defaultPayload: {
      title: 'Take a moment to cleanse your palate',
      description: 'Use the provided water and neutral crackers to prepare for the next wine.',
      background_color: '#1a1a1a',
      auto_advance_seconds: null
    }
  },
  {
    type: 'video_message',
    name: 'Video Message',
    icon: Video,
    description: 'Personal video message from the sommelier.',
    defaultPayload: {
      title: 'A message from your sommelier',
      description: 'Learn about the story behind this wine directly from the expert.',
      video_url: '',
      duration_seconds: 60
    }
  },
  {
    type: 'audio_message',
    name: 'Audio Message',
    icon: Music,
    description: 'Audio-only message or wine education.',
    defaultPayload: {
      title: 'Listen: The vineyard\'s story',
      description: 'Hear about the unique terroir and winemaking process.',
      audio_url: '',
      duration_seconds: 45
    }
  },
  {
    type: 'media',
    name: 'Image/Media',
    icon: Image,
    description: 'Display images, photos, or other visual content.',
    defaultPayload: {
      title: 'The vineyard where this wine was made',
      description: 'This beautiful vineyard in [Region] produces exceptional wines.',
      media_url: '',
      media_type: 'image'
    }
  }
];