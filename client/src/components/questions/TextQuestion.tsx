import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DynamicTextRenderer } from '@/components/ui/DynamicTextRenderer';
import { extractRelevantTerms } from '@/lib/glossary-utils';
import { TooltipInfoPanel } from '@/components/ui/TooltipInfoPanel';
import { Progress } from '@/components/ui/progress';
import { useGlossarySafe } from '@/contexts/GlossaryContext';
import { useHaptics } from '@/hooks/useHaptics';
import { Info, BookOpen } from 'lucide-react';
import { ModernButton } from '@/components/ui/modern-button';

interface TextQuestionProps {
  question: {
    title: string;
    description?: string;
    placeholder?: string;
    maxLength?: number;
    minLength?: number;
    rows?: number;
    category?: string;
  };
  value: string;
  onChange: (value: string) => void;
}

export function TextQuestion({ question, value = '', onChange }: TextQuestionProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const glossaryContext = useGlossarySafe();
  const terms = glossaryContext?.terms || [];
  const { triggerHaptic } = useHaptics();
  
  // Extract all relevant glossary terms from the current slide content
  const relevantTerms = useMemo(() => {
    const allText = [question.title, question.description || ''].join(' ');
    return extractRelevantTerms(allText, terms);
  }, [question, terms]);
  
  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    // Respect maxLength if provided
    if (question.maxLength && newValue.length > question.maxLength) {
      return;
    }
    setLocalValue(newValue);
    onChange(newValue);
  };

  const characterCount = localValue.length;
  const maxLength = question.maxLength || 500;
  const progress = (characterCount / maxLength) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
        <div className="space-y-4">
          {/* Category Badge and Info Button */}
          <div className="flex items-center justify-between mb-2">
            {question.category && (
              <span className="px-3 py-1 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full">
                {question.category}
              </span>
            )}
            {relevantTerms.length > 0 && (
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  triggerHaptic('selection');
                  setIsInfoPanelOpen(!isInfoPanelOpen);
                }}
                className="text-purple-300 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-200"
              >
                <Info size={16} />
              </ModernButton>
            )}
          </div>

          {/* Question Title */}
          <h3 className="text-xl md:text-2xl font-semibold text-white">
            <DynamicTextRenderer text={question.title} />
          </h3>

          {/* Question Description */}
          {question.description && (
            <p className="text-white/70 text-sm md:text-base">
              <DynamicTextRenderer text={question.description} />
            </p>
          )}

          {/* Inline Tooltip Info Panel */}
          <TooltipInfoPanel
            relevantTerms={relevantTerms}
            isOpen={isInfoPanelOpen}
            onOpenChange={setIsInfoPanelOpen}
            themeColor="purple"
          />

          {/* Text Input Area */}
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={question.placeholder || "Type your answer here..."}
                rows={question.rows || 4}
                className={`
                  w-full bg-white/10 border-white/20 text-white 
                  placeholder:text-white/40 resize-none
                  transition-all duration-200
                  ${isFocused ? 'border-purple-400/50 bg-white/15' : ''}
                `}
              />
              
              {/* Focus indicator */}
              {isFocused && (
                <motion.div
                  layoutId="focus-indicator"
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 rounded-lg border-2 border-purple-400/30" />
                  <div className="absolute inset-0 rounded-lg bg-purple-400/5" />
                </motion.div>
              )}
            </div>

            {/* Character Count & Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/50">
                  {question.minLength && characterCount < question.minLength && (
                    <span className="text-yellow-400">
                      Minimum {question.minLength} characters required
                    </span>
                  )}
                </span>
                <span className={`
                  transition-colors duration-200
                  ${characterCount > maxLength * 0.9 ? 'text-yellow-400' : 'text-white/50'}
                  ${characterCount >= maxLength ? 'text-red-400' : ''}
                `}>
                  {characterCount}/{maxLength}
                </span>
              </div>
              
              {/* Visual progress bar */}
              <Progress 
                value={progress} 
                className="h-1 bg-white/10"
              />
            </div>

            {/* Helper text */}
            {localValue.length === 0 && (
              <p className="text-white/40 text-xs mt-2">
                Share your thoughts and observations about this wine
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}