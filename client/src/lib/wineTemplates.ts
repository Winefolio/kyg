import { HelpCircle, Clapperboard, Video, Music, BarChart3 } from "lucide-react";

export const SLIDE_TEMPLATES = [
  {
    type: 'interlude',
    name: 'Interlude',
    icon: Clapperboard,
    description: 'A transition or informational slide.',
    defaultPayload: {
      title: 'New Interlude',
      description: 'A brief pause in the tasting experience.',
      duration: 30
    }
  },
  {
    type: 'question',
    name: 'Multiple Choice',
    icon: HelpCircle,
    description: 'Ask a question with several options.',
    defaultPayload: {
      title: 'New Question',
      question_type: 'multiple_choice',
      category: 'General',
      options: [{ id: '1', text: 'Option A' }],
      allow_multiple: false,
      allow_notes: true
    }
  },
  {
    type: 'question',
    name: 'Scale Rating',
    icon: BarChart3,
    description: 'Ask for a rating on a numeric scale.',
    defaultPayload: {
      title: 'New Scale Question',
      question_type: 'scale',
      category: 'Rating',
      scale_min: 1,
      scale_max: 10,
      scale_labels: ['Low', 'High']
    }
  },
  {
    type: 'video_message',
    name: 'Video Message',
    icon: Video,
    description: 'Embed a video message.',
    defaultPayload: {
      title: 'Video Message',
      description: 'A video from your sommelier.',
      video_url: ''
    }
  },
];