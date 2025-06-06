import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Button, Card, Input, Textarea, Label, Select, SelectContent, 
  SelectItem, SelectTrigger, SelectValue, Switch, Badge 
} from '@/components/ui';
import { 
  Plus, Edit3, Trash2, GripVertical, Play, Pause, Upload,
  Video, Music, MessageSquare, BarChart3, Image, Clock,
  Save, X, Eye, Settings, Palette, Target
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Slide {
  id: string;
  packageWineId: string;
  position: number;
  type: 'interlude' | 'question' | 'video_message' | 'audio_message' | 'media';
  sectionType: 'intro' | 'deep_dive' | 'ending';
  title: string;
  description: string;
  payloadJson: any;
}

interface SlideTemplate {
  id: string;
  name: string;
  type: string;
  sectionType: string;
  payloadTemplate: any;
  isPublic: boolean;
}

interface SlideEditorProps {
  packageWineId: string;
  wineName: string;
  onClose: () => void;
}

const SLIDE_TEMPLATES = {
  question: [
    {
      name: "Multiple Choice Question",
      type: "question",
      sectionType: "deep_dive",
      payloadTemplate: {
        questionType: "multiple_choice",
        question: "What aromas do you detect?",
        description: "Select all the aromas you can identify",
        options: [
          { id: "1", text: "Dark fruits", description: "Blackberry, plum" },
          { id: "2", text: "Vanilla and oak", description: "From barrel aging" },
          { id: "3", text: "Spices", description: "Pepper, clove" },
          { id: "4", text: "Floral notes", description: "Violet, rose petals" }
        ],
        allowMultiple: true,
        timeLimit: 30,
        points: 10
      }
    },
    {
      name: "Scale Rating",
      type: "question",
      sectionType: "deep_dive",
      payloadTemplate: {
        questionType: "scale",
        question: "Rate the aroma intensity",
        description: "How strong are the aromas?",
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ["Very Light", "Very Intense"],
        timeLimit: 20,
        points: 10
      }
    },
    {
      name: "Open Text Response",
      type: "question",
      sectionType: "deep_dive",
      payloadTemplate: {
        questionType: "text",
        question: "Describe your tasting notes",
        description: "Share your detailed impressions",
        maxLength: 500,
        timeLimit: 60,
        points: 15
      }
    }
  ],
  interlude: [
    {
      name: "Welcome Slide",
      type: "interlude",
      sectionType: "intro",
      payloadTemplate: {
        title: "Welcome to Wine Tasting",
        description: "Get ready to explore this exceptional wine",
        backgroundImage: "",
        duration: 5,
        showContinueButton: true
      }
    },
    {
      name: "Transition Slide",
      type: "interlude",
      sectionType: "deep_dive",
      payloadTemplate: {
        title: "Now let's taste...",
        description: "Take a moment to swirl and smell",
        backgroundImage: "",
        duration: 3,
        showContinueButton: true
      }
    }
  ],
  video_message: [
    {
      name: "Sommelier Video",
      type: "video_message",
      sectionType: "ending",
      payloadTemplate: {
        title: "Expert Insights",
        description: "Sommelier's professional tasting notes",
        videoUrl: "",
        posterUrl: "",
        autoplay: false,
        showControls: true
      }
    }
  ]
};

export function SlideEditor({ packageWineId, wineName, onClose }: SlideEditorProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);
  const [editMode, setEditMode] = useState<'list' | 'edit' | 'preview'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch slides for this wine
  const { data: slidesData, isLoading } = useQuery<Slide[]>({
    queryKey: ['/api/slides', packageWineId],
    enabled: !!packageWineId
  });

  useEffect(() => {
    if (slidesData) {
      setSlides(slidesData.sort((a, b) => a.position - b.position));
    }
  }, [slidesData]);

  // Create slide mutation
  const createSlideMutation = useMutation({
    mutationFn: async (slideData: any) => {
      const response = await fetch('/api/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slideData)
      });
      if (!response.ok) throw new Error('Failed to create slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slides', packageWineId] });
      toast({ title: "Slide created successfully" });
    }
  });

  // Update slide mutation
  const updateSlideMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`/api/slides/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slides', packageWineId] });
      toast({ title: "Slide updated successfully" });
      setEditMode('list');
    }
  });

  // Delete slide mutation
  const deleteSlideMutation = useMutation({
    mutationFn: async (slideId: string) => {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete slide');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slides', packageWineId] });
      toast({ title: "Slide deleted successfully" });
    }
  });

  const handleReorderSlides = (newOrder: Slide[]) => {
    const reorderedSlides = newOrder.map((slide, index) => ({
      ...slide,
      position: index + 1
    }));
    setSlides(reorderedSlides);

    // Update positions in backend
    reorderedSlides.forEach(slide => {
      updateSlideMutation.mutate({
        id: slide.id,
        data: { position: slide.position }
      });
    });
  };

  const addSlideFromTemplate = (templateType: string, template: any) => {
    const newSlide = {
      packageWineId,
      position: slides.length + 1,
      type: template.type,
      sectionType: template.sectionType,
      title: template.payloadTemplate.title || template.payloadTemplate.question || 'New Slide',
      description: template.payloadTemplate.description || '',
      payloadJson: template.payloadTemplate
    };

    createSlideMutation.mutate(newSlide);
  };

  const getSlideIcon = (type: string) => {
    switch (type) {
      case 'question': return BarChart3;
      case 'video_message': return Video;
      case 'audio_message': return Music;
      case 'interlude': return MessageSquare;
      case 'media': return Image;
      default: return MessageSquare;
    }
  };

  const getSectionBadgeColor = (sectionType: string) => {
    switch (sectionType) {
      case 'intro': return 'bg-blue-500/20 text-blue-200 border-blue-400/30';
      case 'deep_dive': return 'bg-purple-500/20 text-purple-200 border-purple-400/30';
      case 'ending': return 'bg-green-500/20 text-green-200 border-green-400/30';
      default: return 'bg-gray-500/20 text-gray-200 border-gray-400/30';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-3xl p-8">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white">Loading slide editor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-3xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-2xl">Slide Editor</h2>
            <p className="text-white/70 text-lg">{wineName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
              <Button
                variant={editMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditMode('list')}
                className={editMode === 'list' ? 'bg-white text-purple-900' : 'text-white hover:bg-white/10'}
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant={editMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditMode('preview')}
                className={editMode === 'preview' ? 'bg-white text-purple-900' : 'text-white hover:bg-white/10'}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10 p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {editMode === 'list' && (
            <>
              {/* Slide List */}
              <div className="w-2/3 p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold text-xl">Slides ({slides.length})</h3>
                  <div className="flex items-center space-x-3">
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Add slide template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="interlude">Interlude</SelectItem>
                        <SelectItem value="video_message">Video Message</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <Button
                        onClick={() => {
                          const templates = SLIDE_TEMPLATES[selectedTemplate as keyof typeof SLIDE_TEMPLATES];
                          if (templates && templates.length > 0) {
                            addSlideFromTemplate(selectedTemplate, templates[0]);
                            setSelectedTemplate('');
                          }
                        }}
                        className="bg-white text-purple-900 hover:bg-white/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Slide
                      </Button>
                    )}
                  </div>
                </div>

                <Reorder.Group
                  axis="y"
                  values={slides}
                  onReorder={handleReorderSlides}
                  className="space-y-4"
                >
                  {slides.map((slide, index) => {
                    const Icon = getSlideIcon(slide.type);
                    return (
                      <Reorder.Item
                        key={slide.id}
                        value={slide}
                        className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            <GripVertical className="w-5 h-5 text-white/40 cursor-grab" />
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {slide.position}
                            </div>
                            <Icon className="w-5 h-5 text-white/60" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-white font-medium">{slide.title}</h4>
                              <Badge 
                                variant="outline" 
                                className={getSectionBadgeColor(slide.sectionType)}
                              >
                                {slide.sectionType}
                              </Badge>
                              <Badge variant="outline" className="bg-gray-500/20 text-gray-200 border-gray-400/30">
                                {slide.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            {slide.description && (
                              <p className="text-white/60 text-sm">{slide.description}</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSlide(slide);
                                setEditMode('edit');
                              }}
                              className="text-white hover:bg-white/10"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSlideMutation.mutate(slide.id)}
                              className="text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                {slides.length === 0 && (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 mx-auto text-white/40 mb-6" />
                    <h4 className="text-white font-medium mb-2">No slides yet</h4>
                    <p className="text-white/60 mb-6">Start by adding your first slide using the templates above</p>
                  </div>
                )}
              </div>

              {/* Template Library */}
              <div className="w-1/3 border-l border-white/10 p-8 overflow-y-auto">
                <h3 className="text-white font-bold text-xl mb-6">Template Library</h3>
                
                {Object.entries(SLIDE_TEMPLATES).map(([category, templates]) => (
                  <div key={category} className="mb-8">
                    <h4 className="text-white font-medium mb-4 capitalize">{category.replace('_', ' ')} Templates</h4>
                    <div className="space-y-3">
                      {templates.map((template, index) => (
                        <Card 
                          key={index}
                          className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={() => addSlideFromTemplate(category, template)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-white font-medium text-sm">{template.name}</h5>
                            <Plus className="w-4 h-4 text-white/60" />
                          </div>
                          <p className="text-white/60 text-xs">
                            {template.payloadTemplate.description || template.payloadTemplate.question || 'Click to add this template'}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {editMode === 'edit' && selectedSlide && (
            <SlideEditForm
              slide={selectedSlide}
              onSave={(data) => {
                updateSlideMutation.mutate({
                  id: selectedSlide.id,
                  data
                });
              }}
              onCancel={() => setEditMode('list')}
            />
          )}

          {editMode === 'preview' && (
            <SlidePreview slides={slides} onClose={() => setEditMode('list')} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Slide Edit Form Component
function SlideEditForm({ slide, onSave, onCancel }: {
  slide: Slide;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: slide.title,
    description: slide.description,
    payloadJson: slide.payloadJson
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="w-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-xl">Edit Slide</h3>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSave}
              className="bg-white text-purple-900 hover:bg-white/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Info */}
          <div className="space-y-6">
            <div>
              <Label className="text-white text-lg font-medium">Slide Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-lg mt-2"
                placeholder="Enter slide title"
              />
            </div>

            <div>
              <Label className="text-white text-lg font-medium">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px] text-lg mt-2"
                placeholder="Enter slide description"
              />
            </div>
          </div>

          {/* Type-specific Settings */}
          <div className="space-y-6">
            {slide.type === 'question' && (
              <QuestionSlideEditor
                payload={formData.payloadJson}
                onChange={(payload) => setFormData(prev => ({ ...prev, payloadJson: payload }))}
              />
            )}

            {slide.type === 'video_message' && (
              <VideoSlideEditor
                payload={formData.payloadJson}
                onChange={(payload) => setFormData(prev => ({ ...prev, payloadJson: payload }))}
              />
            )}

            {slide.type === 'interlude' && (
              <InterludeSlideEditor
                payload={formData.payloadJson}
                onChange={(payload) => setFormData(prev => ({ ...prev, payloadJson: payload }))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Slide Editor
function QuestionSlideEditor({ payload, onChange }: { payload: any; onChange: (payload: any) => void }) {
  const updatePayload = (updates: any) => {
    onChange({ ...payload, ...updates });
  };

  return (
    <div className="space-y-6">
      <h4 className="text-white font-medium text-lg">Question Settings</h4>
      
      <div>
        <Label className="text-white">Question Text</Label>
        <Input
          value={payload.question || ''}
          onChange={(e) => updatePayload({ question: e.target.value })}
          className="bg-white/10 border-white/20 text-white mt-2"
          placeholder="Enter your question"
        />
      </div>

      <div>
        <Label className="text-white">Question Type</Label>
        <Select
          value={payload.questionType || 'multiple_choice'}
          onValueChange={(value) => updatePayload({ questionType: value })}
        >
          <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="scale">Scale Rating</SelectItem>
            <SelectItem value="text">Open Text</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {payload.questionType === 'multiple_choice' && (
        <div>
          <Label className="text-white">Answer Options</Label>
          <div className="space-y-3 mt-2">
            {(payload.options || []).map((option: any, index: number) => (
              <div key={index} className="flex items-center space-x-3">
                <Input
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...(payload.options || [])];
                    newOptions[index] = { ...option, text: e.target.value };
                    updatePayload({ options: newOptions });
                  }}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newOptions = (payload.options || []).filter((_: any, i: number) => i !== index);
                    updatePayload({ options: newOptions });
                  }}
                  className="text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newOptions = [...(payload.options || []), { id: Date.now().toString(), text: '', description: '' }];
                updatePayload({ options: newOptions });
              }}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {payload.questionType === 'scale' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Min Value</Label>
            <Input
              type="number"
              value={payload.scaleMin || 1}
              onChange={(e) => updatePayload({ scaleMin: parseInt(e.target.value) })}
              className="bg-white/10 border-white/20 text-white mt-2"
            />
          </div>
          <div>
            <Label className="text-white">Max Value</Label>
            <Input
              type="number"
              value={payload.scaleMax || 10}
              onChange={(e) => updatePayload({ scaleMax: parseInt(e.target.value) })}
              className="bg-white/10 border-white/20 text-white mt-2"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Time Limit (seconds)</Label>
          <Input
            type="number"
            value={payload.timeLimit || 30}
            onChange={(e) => updatePayload({ timeLimit: parseInt(e.target.value) })}
            className="bg-white/10 border-white/20 text-white mt-2"
          />
        </div>
        <div>
          <Label className="text-white">Points</Label>
          <Input
            type="number"
            value={payload.points || 10}
            onChange={(e) => updatePayload({ points: parseInt(e.target.value) })}
            className="bg-white/10 border-white/20 text-white mt-2"
          />
        </div>
      </div>
    </div>
  );
}

// Video Slide Editor
function VideoSlideEditor({ payload, onChange }: { payload: any; onChange: (payload: any) => void }) {
  const updatePayload = (updates: any) => {
    onChange({ ...payload, ...updates });
  };

  return (
    <div className="space-y-6">
      <h4 className="text-white font-medium text-lg">Video Settings</h4>
      
      <div>
        <Label className="text-white">Video URL</Label>
        <div className="flex items-center space-x-3 mt-2">
          <Input
            value={payload.videoUrl || ''}
            onChange={(e) => updatePayload({ videoUrl: e.target.value })}
            className="bg-white/10 border-white/20 text-white flex-1"
            placeholder="Enter video URL"
          />
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-white">Poster Image URL</Label>
        <Input
          value={payload.posterUrl || ''}
          onChange={(e) => updatePayload({ posterUrl: e.target.value })}
          className="bg-white/10 border-white/20 text-white mt-2"
          placeholder="Enter poster image URL"
        />
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <Switch
            checked={payload.autoplay || false}
            onCheckedChange={(checked) => updatePayload({ autoplay: checked })}
          />
          <Label className="text-white">Autoplay</Label>
        </div>
        <div className="flex items-center space-x-3">
          <Switch
            checked={payload.showControls !== false}
            onCheckedChange={(checked) => updatePayload({ showControls: checked })}
          />
          <Label className="text-white">Show Controls</Label>
        </div>
      </div>
    </div>
  );
}

// Interlude Slide Editor
function InterludeSlideEditor({ payload, onChange }: { payload: any; onChange: (payload: any) => void }) {
  const updatePayload = (updates: any) => {
    onChange({ ...payload, ...updates });
  };

  return (
    <div className="space-y-6">
      <h4 className="text-white font-medium text-lg">Interlude Settings</h4>
      
      <div>
        <Label className="text-white">Background Image URL</Label>
        <Input
          value={payload.backgroundImage || ''}
          onChange={(e) => updatePayload({ backgroundImage: e.target.value })}
          className="bg-white/10 border-white/20 text-white mt-2"
          placeholder="Enter background image URL"
        />
      </div>

      <div>
        <Label className="text-white">Duration (seconds)</Label>
        <Input
          type="number"
          value={payload.duration || 5}
          onChange={(e) => updatePayload({ duration: parseInt(e.target.value) })}
          className="bg-white/10 border-white/20 text-white mt-2"
        />
      </div>

      <div className="flex items-center space-x-3">
        <Switch
          checked={payload.showContinueButton !== false}
          onCheckedChange={(checked) => updatePayload({ showContinueButton: checked })}
        />
        <Label className="text-white">Show Continue Button</Label>
      </div>
    </div>
  );
}

// Slide Preview Component
function SlidePreview({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const currentSlide = slides[currentSlideIndex];

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  if (!currentSlide) {
    return (
      <div className="w-full p-8 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-white font-bold text-xl mb-4">No slides to preview</h3>
          <Button onClick={onClose} className="bg-white text-purple-900">
            Back to Editor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="text-white hover:bg-white/10"
          >
            ←
          </Button>
          <span className="text-white">
            {currentSlideIndex + 1} of {slides.length}
          </span>
          <Button
            variant="ghost"
            onClick={nextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="text-white hover:bg-white/10"
          >
            →
          </Button>
        </div>
        <Button onClick={onClose} variant="outline" className="border-white/20 text-white hover:bg-white/10">
          Back to Editor
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 rounded-2xl p-8 border border-white/10"
          >
            <h3 className="text-white font-bold text-2xl mb-4">{currentSlide.title}</h3>
            {currentSlide.description && (
              <p className="text-white/70 text-lg mb-6">{currentSlide.description}</p>
            )}

            {/* Render slide content based on type */}
            {currentSlide.type === 'question' && (
              <div className="space-y-6">
                {currentSlide.payloadJson.questionType === 'multiple_choice' && (
                  <div className="space-y-3">
                    {(currentSlide.payloadJson.options || []).map((option: any, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full text-left justify-start border-white/20 text-white hover:bg-white/10 p-4 h-auto"
                      >
                        {option.text}
                      </Button>
                    ))}
                  </div>
                )}

                {currentSlide.payloadJson.questionType === 'scale' && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-white/60">
                      <span>{currentSlide.payloadJson.scaleLabels?.[0] || 'Min'}</span>
                      <span>{currentSlide.payloadJson.scaleLabels?.[1] || 'Max'}</span>
                    </div>
                    <div className="flex space-x-2">
                      {Array.from({ length: (currentSlide.payloadJson.scaleMax || 10) - (currentSlide.payloadJson.scaleMin || 1) + 1 }, (_, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                          {(currentSlide.payloadJson.scaleMin || 1) + i}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSlide.type === 'video_message' && (
              <div className="bg-black/20 rounded-lg p-8 text-center">
                <Video className="w-16 h-16 mx-auto text-white/40 mb-4" />
                <p className="text-white/60">Video Player Preview</p>
                {currentSlide.payloadJson.videoUrl && (
                  <p className="text-white/40 text-sm mt-2">{currentSlide.payloadJson.videoUrl}</p>
                )}
              </div>
            )}

            {currentSlide.type === 'interlude' && (
              <div className="text-center py-8">
                {currentSlide.payloadJson.backgroundImage && (
                  <div className="bg-black/20 rounded-lg p-8 mb-6">
                    <Image className="w-16 h-16 mx-auto text-white/40 mb-4" />
                    <p className="text-white/60">Background Image Preview</p>
                  </div>
                )}
                <Button className="bg-white text-purple-900 hover:bg-white/90">
                  Continue
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}