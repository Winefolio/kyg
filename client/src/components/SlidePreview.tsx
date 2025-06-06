import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, Volume2, Info } from 'lucide-react';
import { WineTastingTooltip } from '@/components/WineTastingTooltip';
import type { Slide } from "@shared/schema";

interface SlidePreviewProps {
  slide: Slide;
  mode: 'desktop' | 'mobile';
}

export function SlidePreview({ slide, mode }: SlidePreviewProps) {
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [scaleValue, setScaleValue] = useState<number[]>([5]);
  const [textAnswer, setTextAnswer] = useState('');
  const [booleanAnswer, setBooleanAnswer] = useState<boolean | null>(null);

  const payload = slide.payloadJson as any;

  const containerClass = mode === 'mobile' 
    ? 'max-w-sm mx-auto' 
    : 'max-w-2xl mx-auto';

  if (slide.type === 'question') {
    return (
      <div className={`${containerClass} p-6`}>
        <Card className="bg-gradient-card border-white/20 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{payload.title}</h2>
            {payload.description && (
              <p className="text-white/70 text-sm">{payload.description}</p>
            )}
          </div>

          {payload.question_type === 'multiple_choice' && (
            <div className="space-y-3">
              <RadioGroup 
                value={currentAnswer} 
                onValueChange={setCurrentAnswer}
                className="space-y-3"
              >
                {(payload.options || []).map((option: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <RadioGroupItem value={option.value} id={`option-${index}`} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={`option-${index}`} className="text-white font-medium cursor-pointer">
                        {option.text}
                        {option.tooltip && (
                          <WineTastingTooltip term={option.text}>
                            <Info className="inline ml-1 h-3 w-3 text-purple-300" />
                          </WineTastingTooltip>
                        )}
                      </Label>
                      {option.description && (
                        <p className="text-white/60 text-sm mt-1">{option.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
              
              {/* Interactive Continue Button */}
              <div className="flex justify-center mt-6">
                <Button 
                  disabled={!currentAnswer}
                  className={`px-6 py-2 rounded-full transition-all ${
                    currentAnswer 
                      ? 'bg-white text-purple-900 hover:bg-white/90' 
                      : 'bg-white/20 text-white/50 cursor-not-allowed'
                  }`}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {payload.question_type === 'scale' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300 mb-2">
                  {scaleValue[0]}
                </div>
                <div className="flex justify-between text-sm text-white/60 mb-4">
                  <span>{payload.scale_min_label || payload.scale_min}</span>
                  <span>{payload.scale_max_label || payload.scale_max}</span>
                </div>
              </div>
              <Slider
                value={scaleValue}
                onValueChange={setScaleValue}
                max={payload.scale_max || 10}
                min={payload.scale_min || 1}
                step={1}
                className="w-full"
              />
              
              {/* Interactive Continue Button for Scale */}
              <div className="flex justify-center mt-6">
                <Button 
                  className="px-6 py-2 rounded-full bg-white text-purple-900 hover:bg-white/90 transition-all"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {payload.question_type === 'text' && (
            <div className="space-y-4">
              <Textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="bg-white/10 border-white/20 text-white"
                rows={4}
              />
            </div>
          )}

          {payload.question_type === 'boolean' && (
            <div className="flex justify-center space-x-6">
              <Button
                variant={booleanAnswer === true ? 'default' : 'outline'}
                onClick={() => setBooleanAnswer(true)}
                className="px-8"
              >
                Yes
              </Button>
              <Button
                variant={booleanAnswer === false ? 'default' : 'outline'}
                onClick={() => setBooleanAnswer(false)}
                className="px-8"
              >
                No
              </Button>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button className="px-8">
              Continue
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (slide.type === 'interlude') {
    return (
      <div className={`${containerClass} p-6`}>
        <Card 
          className="border-white/20 p-12 text-center"
          style={{ backgroundColor: payload.background_color || '#1a1a1a' }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">{payload.title}</h2>
          {payload.description && (
            <p className="text-white/70 text-lg mb-6">{payload.description}</p>
          )}
          {payload.auto_advance_seconds && (
            <Badge variant="secondary" className="mt-4">
              Auto-advance in {payload.auto_advance_seconds}s
            </Badge>
          )}
        </Card>
      </div>
    );
  }

  if (slide.type === 'video_message') {
    const [isPlaying, setIsPlaying] = useState(false);
    
    return (
      <div className={`${containerClass} p-6`}>
        <Card className="bg-gradient-card border-white/20 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{payload.title}</h2>
            {payload.description && (
              <p className="text-white/70 text-sm">{payload.description}</p>
            )}
          </div>

          <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center mb-4 relative">
            {payload.video_url ? (
              <video 
                src={payload.video_url}
                className="w-full h-full object-cover rounded-lg"
                controls
              />
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white" />
                  )}
                </div>
                <p className="text-white/60">Video placeholder</p>
              </div>
            )}
          </div>

          {payload.duration_seconds && (
            <div className="flex items-center justify-center space-x-2 text-white/60 text-sm">
              <Volume2 className="w-4 h-4" />
              <span>Duration: {payload.duration_seconds}s</span>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (slide.type === 'audio_message') {
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    
    return (
      <div className={`${containerClass} p-6`}>
        <Card className="bg-gradient-card border-white/20 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{payload.title}</h2>
            {payload.description && (
              <p className="text-white/70 text-sm">{payload.description}</p>
            )}
          </div>

          <div className="flex items-center justify-center space-x-4 p-8">
            <Button
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={() => setIsAudioPlaying(!isAudioPlaying)}
            >
              {isAudioPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </Button>
            <div className="flex-1 max-w-xs">
              <div className="h-2 bg-white/20 rounded-full">
                <div className="h-2 bg-purple-500 rounded-full w-1/3"></div>
              </div>
              <div className="flex justify-between text-xs text-white/60 mt-1">
                <span>0:00</span>
                <span>{payload.duration_seconds ? `0:${payload.duration_seconds.toString().padStart(2, '0')}` : '0:30'}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (slide.type === 'media') {
    return (
      <div className={`${containerClass} p-6`}>
        <Card className="bg-gradient-card border-white/20 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{payload.title}</h2>
            {payload.description && (
              <p className="text-white/70 text-sm">{payload.description}</p>
            )}
          </div>

          <div className="aspect-video bg-black/20 rounded-lg flex items-center justify-center border border-white/10">
            {payload.media_url ? (
              payload.media_type === 'image' ? (
                <img 
                  src={payload.media_url} 
                  alt={payload.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <video 
                  src={payload.media_url}
                  className="w-full h-full object-cover rounded-lg"
                  controls
                />
              )
            ) : (
              <div className="text-center text-white/60">
                <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  📷
                </div>
                <p>Media placeholder</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${containerClass} p-6`}>
      <Card className="bg-gradient-card border-white/20 p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">{payload.title}</h2>
        {payload.description && (
          <p className="text-white/70 text-sm">{payload.description}</p>
        )}
        <Badge variant="secondary" className="mt-4">
          {String(slide.type).replace('_', ' ')}
        </Badge>
      </Card>
    </div>
  );
}