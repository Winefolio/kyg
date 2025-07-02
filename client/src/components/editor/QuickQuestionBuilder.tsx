import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  BarChart3, 
  PenTool, 
  CheckCircle2, 
  Image,
  Grid3X3,
  Plus,
  Sparkles,
  Eye,
  Settings,
  ChevronRight,
  Lightbulb,
  Video,
  Mic
} from 'lucide-react';
import type { QuestionFormat, GenericQuestion, MultipleChoiceConfig, ScaleConfig, TextConfig, BooleanConfig, VideoMessageConfig, AudioMessageConfig } from '@shared/schema';
import { MultipleChoiceQuestion } from '@/components/questions/MultipleChoiceQuestion';
import { ScaleQuestion } from '@/components/questions/ScaleQuestion';
import { MediaUpload } from '@/components/ui/media-upload';
import { VideoPlayer } from '@/components/ui/video-player';
import { AudioPlayer } from '@/components/ui/audio-player';
import { getTemplatesForContext } from '@/lib/questionTemplates';

interface QuickQuestionBuilderProps {
  open: boolean;
  onClose: () => void;
  onSave: (question: GenericQuestion) => void;
  wineContext?: {
    wineName: string;
    wineType: string;
  };
  sectionType?: 'intro' | 'deep_dive' | 'ending';
}

interface QuestionTypeCard {
  format: QuestionFormat;
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
}

const questionTypes: QuestionTypeCard[] = [
  {
    format: 'multiple_choice',
    icon: <FileText className="w-8 h-8" />,
    title: 'Multiple Choice',
    description: 'Single or multi-select options',
    available: true
  },
  {
    format: 'scale',
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Scale Rating',
    description: 'Numeric or slider scale',
    available: true
  },
  {
    format: 'text',
    icon: <PenTool className="w-8 h-8" />,
    title: 'Text Input',
    description: 'Open-ended response',
    available: true
  },
  {
    format: 'boolean',
    icon: <CheckCircle2 className="w-8 h-8" />,
    title: 'Yes/No',
    description: 'Binary choice question',
    available: true
  },
  {
    format: 'video_message',
    icon: <Video className="w-8 h-8" />,
    title: 'Video Message',
    description: 'Personal video from sommelier',
    available: true
  },
  {
    format: 'audio_message',
    icon: <Mic className="w-8 h-8" />,
    title: 'Audio Message',
    description: 'Voice note from sommelier',
    available: true
  },
  {
    format: 'ranking',
    icon: <Grid3X3 className="w-8 h-8" />,
    title: 'Ranking',
    description: 'Order items by preference',
    available: false
  },
  {
    format: 'matrix',
    icon: <Image className="w-8 h-8" />,
    title: 'Matrix',
    description: 'Grid of related questions',
    available: false
  },
  {
    format: 'image_selection' as any,
    icon: <Image className="w-8 h-8" />,
    title: 'Image Selection',
    description: 'Choose from visual options',
    available: false
  },
  {
    format: 'drawing' as any,
    icon: <PenTool className="w-8 h-8" />,
    title: 'Drawing Canvas',
    description: 'Draw or annotate images',
    available: false
  }
];

export function QuickQuestionBuilder({ 
  open, 
  onClose, 
  onSave, 
  wineContext, 
  sectionType 
}: QuickQuestionBuilderProps) {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [selectedFormat, setSelectedFormat] = useState<QuestionFormat | null>(null);
  const [tempQuestionId] = useState(() => `temp-question-${Date.now()}`);
  const [questionData, setQuestionData] = useState<GenericQuestion>({
    format: 'multiple_choice',
    config: {
      title: '',
      description: ''
    },
    metadata: {
      category: 'general',
      difficulty: 'intermediate',
      tags: []
    }
  });

  // Multiple choice specific state
  const [mcOptions, setMcOptions] = useState<Array<{ id: string; text: string }>>([
    { id: '1', text: '' },
    { id: '2', text: '' },
    { id: '3', text: '' },
    { id: '4', text: '' }
  ]);

  // Reset all state when modal opens
  useEffect(() => {
    if (open) {
      // Reset to initial state
      setStep('type');
      setSelectedFormat(null);
      setQuestionData({
        format: 'multiple_choice',
        config: {
          title: '',
          description: ''
        },
        metadata: {
          category: 'general',
          difficulty: 'intermediate',
          tags: []
        }
      });
      setMcOptions([
        { id: '1', text: '' },
        { id: '2', text: '' },
        { id: '3', text: '' },
        { id: '4', text: '' }
      ]);
    }
  }, [open]);

  const handleSelectType = (format: QuestionFormat) => {
    setSelectedFormat(format);
    setQuestionData(prev => ({
      ...prev,
      format,
      config: getDefaultConfig(format)
    }));
    setStep('config');
  };

  const getDefaultConfig = (format: QuestionFormat) => {
    switch (format) {
      case 'multiple_choice':
        return {
          title: '',
          description: '',
          options: [],
          allowMultiple: false,
          allowOther: false
        } as MultipleChoiceConfig;
      case 'scale':
        return {
          title: '',
          description: '',
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: ['Low', 'High'] as [string, string],
          showNumbers: true,
          visualStyle: 'slider'
        } as ScaleConfig;
      case 'text':
        return {
          title: '',
          description: '',
          placeholder: 'Enter your response...',
          inputType: 'textarea',
          rows: 3
        } as TextConfig;
      case 'boolean':
        return {
          title: '',
          description: '',
          trueLabel: 'Yes',
          falseLabel: 'No',
          visualStyle: 'buttons'
        } as BooleanConfig;
      case 'video_message':
        return {
          title: '',
          description: '',
          video_url: '',
          autoplay: false,
          controls: true
        } as VideoMessageConfig;
      case 'audio_message':
        return {
          title: '',
          description: '',
          audio_url: '',
          autoplay: false
        } as AudioMessageConfig;
      default:
        return { title: '', description: '' };
    }
  };

  const updateConfig = (field: string, value: any) => {
    setQuestionData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }));
  };

  const renderTypeSelector = () => (
    <ScrollArea className="h-[400px] pr-4">
      <div className="grid grid-cols-2 gap-4 p-6">
        {questionTypes.map((type) => (
        <Card
          key={type.format}
          className={`p-6 cursor-pointer transition-all ${
            type.available 
              ? 'hover:border-purple-400 hover:shadow-lg bg-white' 
              : 'opacity-50 cursor-not-allowed bg-white'
          }`}
          onClick={() => type.available && handleSelectType(type.format)}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="text-purple-400">{type.icon}</div>
            <h3 className="font-semibold text-gray-900">{type.title}</h3>
            <p className="text-sm text-gray-600">{type.description}</p>
            {!type.available && (
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            )}
          </div>
        </Card>
      ))}
      </div>
    </ScrollArea>
  );

  const renderMultipleChoiceConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Question Title</Label>
        <Input
          id="title"
          value={questionData.config.title}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="What primary flavors do you detect?"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={questionData.config.description || ''}
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder="Additional context or instructions..."
          rows={2}
        />
      </div>

      <div>
        <Label>Answer Options</Label>
        <div className="space-y-2 mt-2">
          {mcOptions.map((option, index) => (
            <Input
              key={option.id}
              value={option.text}
              onChange={(e) => {
                const newOptions = [...mcOptions];
                newOptions[index].text = e.target.value;
                setMcOptions(newOptions);
              }}
              placeholder={`Option ${index + 1}`}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMcOptions([...mcOptions, { id: String(mcOptions.length + 1), text: '' }])}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Option
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-multiple">Allow multiple selections</Label>
          <Switch
            id="allow-multiple"
            checked={(questionData.config as MultipleChoiceConfig).allowMultiple}
            onCheckedChange={(checked) => updateConfig('allowMultiple', checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-other">Include "Other" option</Label>
          <Switch
            id="allow-other"
            checked={(questionData.config as MultipleChoiceConfig).allowOther || false}
            onCheckedChange={(checked) => updateConfig('allowOther', checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderScaleConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Question Title</Label>
        <Input
          id="title"
          value={questionData.config.title}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="How would you rate the tannins?"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={questionData.config.description || ''}
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder="Additional context or instructions..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="scale-min">Minimum Value</Label>
          <Input
            id="scale-min"
            type="number"
            value={(questionData.config as ScaleConfig).scaleMin}
            onChange={(e) => updateConfig('scaleMin', parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="scale-max">Maximum Value</Label>
          <Input
            id="scale-max"
            type="number"
            value={(questionData.config as ScaleConfig).scaleMax}
            onChange={(e) => updateConfig('scaleMax', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label-min">Min Label</Label>
          <Input
            id="label-min"
            value={(questionData.config as ScaleConfig).scaleLabels[0]}
            onChange={(e) => {
              const labels = [...(questionData.config as ScaleConfig).scaleLabels] as [string, string];
              labels[0] = e.target.value;
              updateConfig('scaleLabels', labels);
            }}
          />
        </div>
        <div>
          <Label htmlFor="label-max">Max Label</Label>
          <Input
            id="label-max"
            value={(questionData.config as ScaleConfig).scaleLabels[1]}
            onChange={(e) => {
              const labels = [...(questionData.config as ScaleConfig).scaleLabels] as [string, string];
              labels[1] = e.target.value;
              updateConfig('scaleLabels', labels);
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderConfig = () => {
    switch (selectedFormat) {
      case 'multiple_choice':
        return renderMultipleChoiceConfig();
      case 'scale':
        return renderScaleConfig();
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Question Title</Label>
              <Input
                id="title"
                value={questionData.config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Describe the wine's aroma profile"
              />
            </div>
            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={(questionData.config as TextConfig).placeholder}
                onChange={(e) => updateConfig('placeholder', e.target.value)}
              />
            </div>
          </div>
        );
      case 'boolean':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Question Title</Label>
              <Input
                id="title"
                value={questionData.config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Would you recommend this wine?"
              />
            </div>
          </div>
        );
      case 'video_message':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Message Title</Label>
              <Input
                id="title"
                value={questionData.config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Welcome to this wine tasting"
              />
            </div>

            <div>
              <Label htmlFor="description">Message Description (optional)</Label>
              <Textarea
                id="description"
                value={questionData.config.description || ''}
                onChange={(e) => updateConfig('description', e.target.value)}
                placeholder="Additional context about this video message..."
                rows={2}
              />
            </div>

            <MediaUpload
              value={(questionData.config as VideoMessageConfig).video_url || ''}
              onChange={(url) => updateConfig('video_url', url)}
              accept="video"
              label="Video File"
              placeholder="No video selected"
              entityId={tempQuestionId}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoplay">Auto-play video</Label>
                <Switch
                  id="autoplay"
                  checked={(questionData.config as VideoMessageConfig).autoplay || false}
                  onCheckedChange={(checked) => updateConfig('autoplay', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="controls">Show video controls</Label>
                <Switch
                  id="controls"
                  checked={(questionData.config as VideoMessageConfig).controls !== false}
                  onCheckedChange={(checked) => updateConfig('controls', checked)}
                />
              </div>
            </div>
          </div>
        );
      case 'audio_message':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Message Title</Label>
              <Input
                id="title"
                value={questionData.config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Welcome message from the sommelier"
              />
            </div>

            <div>
              <Label htmlFor="description">Message Description (optional)</Label>
              <Textarea
                id="description"
                value={questionData.config.description || ''}
                onChange={(e) => updateConfig('description', e.target.value)}
                placeholder="Additional context about this audio message..."
                rows={2}
              />
            </div>

            <MediaUpload
              value={(questionData.config as AudioMessageConfig).audio_url || ''}
              onChange={(url) => updateConfig('audio_url', url)}
              accept="audio"
              label="Audio File"
              placeholder="No audio selected"
              entityId={tempQuestionId}
            />

            <div className="flex items-center justify-between">
              <Label htmlFor="autoplay">Auto-play audio</Label>
              <Switch
                id="autoplay"
                checked={(questionData.config as AudioMessageConfig).autoplay || false}
                onCheckedChange={(checked) => updateConfig('autoplay', checked)}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderPreview = () => {
    if (!questionData.config.title) {
      return (
        <div className="text-center text-gray-500 p-8">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Enter a question title to see preview</p>
        </div>
      );
    }

    // Prepare config for question components
    const previewConfig = { ...questionData.config };
    
    if (selectedFormat === 'multiple_choice') {
      previewConfig.options = mcOptions
        .filter(opt => opt.text)
        .map(opt => ({
          id: opt.id,
          text: opt.text,
          value: opt.text
        }));
    }

    switch (selectedFormat) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={{
              title: previewConfig.title,
              description: previewConfig.description || '',
              category: 'Preview',
              options: previewConfig.options || [],
              allow_multiple: (previewConfig as MultipleChoiceConfig).allowMultiple,
              allow_notes: false
            }}
            value={{ selected: [], notes: '' }}
            onChange={() => {}}
          />
        );
      case 'scale':
        return (
          <ScaleQuestion
            question={{
              title: previewConfig.title,
              description: previewConfig.description || '',
              category: 'Preview',
              scale_min: (previewConfig as ScaleConfig).scaleMin,
              scale_max: (previewConfig as ScaleConfig).scaleMax,
              scale_labels: (previewConfig as ScaleConfig).scaleLabels
            }}
            value={(previewConfig as ScaleConfig).scaleMin}
            onChange={() => {}}
          />
        );
      case 'video_message':
        return (
          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">{previewConfig.title}</h3>
            {previewConfig.description && (
              <p className="text-white/70 text-sm mb-4">{previewConfig.description}</p>
            )}
            {(previewConfig as VideoMessageConfig).video_url ? (
              <VideoPlayer
                src={(previewConfig as VideoMessageConfig).video_url}
                title={previewConfig.title}
                description={previewConfig.description}
                autoplay={(previewConfig as VideoMessageConfig).autoplay}
                controls={(previewConfig as VideoMessageConfig).controls}
                className="w-full max-w-md mx-auto"
              />
            ) : (
              <div className="bg-white/5 rounded-lg p-8 text-center border border-white/10">
                <Video className="w-12 h-12 text-white/40 mx-auto mb-2" />
                <p className="text-white/60">Upload a video to see preview</p>
              </div>
            )}
          </div>
        );
      case 'audio_message':
        return (
          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">{previewConfig.title}</h3>
            {previewConfig.description && (
              <p className="text-white/70 text-sm mb-4">{previewConfig.description}</p>
            )}
            {(previewConfig as AudioMessageConfig).audio_url ? (
              <AudioPlayer
                src={(previewConfig as AudioMessageConfig).audio_url}
                title={previewConfig.title}
                description={previewConfig.description}
                autoplay={(previewConfig as AudioMessageConfig).autoplay}
                className="w-full max-w-md mx-auto"
              />
            ) : (
              <div className="bg-white/5 rounded-lg p-8 text-center border border-white/10">
                <Mic className="w-12 h-12 text-white/40 mx-auto mb-2" />
                <p className="text-white/60">Upload an audio file to see preview</p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">{previewConfig.title}</h3>
            {previewConfig.description && (
              <p className="text-white/70 text-sm">{previewConfig.description}</p>
            )}
          </div>
        );
    }
  };

  const handleSave = () => {
    // Prepare final config
    const finalConfig = { ...questionData.config };
    
    if (selectedFormat === 'multiple_choice') {
      finalConfig.options = mcOptions
        .filter(opt => opt.text)
        .map(opt => ({
          id: opt.id,
          text: opt.text,
          value: opt.text
        }));
    }

    onSave({
      ...questionData,
      config: finalConfig
    });
  };

  const getSuggestions = () => {
    if (!wineContext || !sectionType) return [];
    
    const templates = getTemplatesForContext(
      wineContext.wineType,
      sectionType,
      'beginner'
    );
    
    // Filter by selected format if one is chosen
    const filteredTemplates = selectedFormat 
      ? templates.filter(t => t.question.format === selectedFormat)
      : templates;
    
    return filteredTemplates.map(template => ({
      id: template.id,
      title: template.question.config.title,
      description: template.description,
      template: template.question
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Create New Question
          </DialogTitle>
          <DialogDescription>
            Choose a question type and configure it for your wine tasting experience.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'type' ? (
            <motion.div
              key="type-selector"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h3 className="text-lg font-semibold mb-4">Step 1: Choose Question Type</h3>
              {renderTypeSelector()}
            </motion.div>
          ) : (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h3 className="text-lg font-semibold mb-4">Step 2: Configure Your Question</h3>
              
              <Tabs defaultValue="config" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="config">
                    <Settings className="w-4 h-4 mr-2" />
                    Configuration
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="w-4 h-4 mr-2" />
                    Live Preview
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="config" className="mt-4">
                  <ScrollArea className="h-[400px] pr-4">
                    {renderConfig()}
                    
                    {getSuggestions().length > 0 && (
                      <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">Suggested Templates</span>
                        </div>
                        <div className="space-y-2">
                          {getSuggestions().map((suggestion, index) => (
                            <Button
                              key={suggestion.id}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left"
                              onClick={() => {
                                // Apply the entire template
                                setQuestionData(suggestion.template);
                                if (suggestion.template.format === 'multiple_choice' && suggestion.template.config.options) {
                                  setMcOptions(suggestion.template.config.options.map((opt: any, idx: number) => ({
                                    id: String(idx + 1),
                                    text: opt.text || opt.value
                                  })));
                                }
                              }}
                            >
                              <ChevronRight className="w-4 h-4 mr-2" />
                              {suggestion.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="bg-gradient-primary p-6 rounded-lg">
                      {renderPreview()}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {step === 'config' && (
            <Button variant="outline" onClick={() => setStep('type')}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {step === 'config' && (
            <Button 
              onClick={handleSave}
              disabled={!questionData.config.title}
            >
              Save Question
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}