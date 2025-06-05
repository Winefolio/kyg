import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModernSlider } from "@/components/ui/modern-slider";
import { Label } from "@/components/ui/label";
import { ModernButton } from "@/components/ui/modern-button";
import { DynamicTextRenderer, extractRelevantTerms } from "@/components/ui/DynamicTextRenderer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Info, BookOpen, TrendingUp } from "lucide-react";
import { modernCardVariants, springTransition } from "@/lib/modern-animations";
import { useHaptics } from "@/hooks/useHaptics";
import { useGlossary } from "@/contexts/GlossaryContext";

interface ScaleQuestionProps {
  question: {
    title: string;
    description: string;
    category: string;
    scale_min: number;
    scale_max: number;
    scale_labels: [string, string];
  };
  value: number;
  onChange: (value: number) => void;
}

export function ScaleQuestion({ question, value, onChange }: ScaleQuestionProps) {
  const { triggerHaptic } = useHaptics();
  const { terms } = useGlossary();
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  // Extract all relevant glossary terms from the current slide content
  const relevantTerms = useMemo(() => {
    const allText = [
      question.title,
      question.description,
      ...question.scale_labels
    ].join(' ');
    
    return extractRelevantTerms(allText, terms);
  }, [question, terms]);

  // Generate receptive feedback based on slider value
  const feedbackText = useMemo(() => {
    const range = question.scale_max - question.scale_min;
    const position = (value - question.scale_min) / range;
    
    if (position < 0.3) {
      return `You're experiencing the "${question.scale_labels[0]}" end of the spectrum. This suggests more subtle or restrained characteristics.`;
    } else if (position > 0.7) {
      return `You're experiencing the "${question.scale_labels[1]}" end of the spectrum. This indicates more pronounced and intense characteristics.`;
    } else {
      return `You're in the middle range, experiencing a balanced blend between "${question.scale_labels[0]}" and "${question.scale_labels[1]}".`;
    }
  }, [value, question]);

  // Calculate which scale label should be highlighted
  const highlightedLabelIndex = useMemo(() => {
    const range = question.scale_max - question.scale_min;
    const position = (value - question.scale_min) / range;
    return position < 0.5 ? 0 : 1;
  }, [value, question]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl h-full flex flex-col justify-center"
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2 py-1 bg-blue-600/30 rounded-full text-blue-200 text-xs sm:text-sm font-medium">
            {question.category}
          </span>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          <DynamicTextRenderer text={question.title} />
        </h3>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed">
          <DynamicTextRenderer text={question.description} />
        </p>
      </div>

      <div className="space-y-4">
        <ModernSlider
          value={value}
          min={question.scale_min}
          max={question.scale_max}
          step={1}
          labels={question.scale_labels as [string, string]}
          labelClassNames={[
            highlightedLabelIndex === 0 
              ? 'text-purple-300 font-semibold' 
              : 'text-white/70',
            highlightedLabelIndex === 1 
              ? 'text-purple-300 font-semibold' 
              : 'text-white/70'
          ] as [string, string]}
          onChange={onChange}
        />
        
        {/* Scale indicators - clickable dash marks */}
        <div className="flex justify-between">
          {Array.from({ length: question.scale_max - question.scale_min + 1 }, (_, i) => {
            const indicatorValue = i + question.scale_min;
            const isActive = indicatorValue <= value;
            const isCurrentValue = indicatorValue === value;
            return (
              <motion.div
                key={i}
                className={`w-2 h-6 sm:h-8 rounded-full cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? isCurrentValue
                      ? 'bg-purple-400 shadow-lg shadow-purple-500/50' 
                      : 'bg-purple-500' 
                    : 'bg-white/20 hover:bg-white/30 hover:scale-110'
                }`}
                onClick={() => {
                  triggerHaptic('selection');
                  onChange(indicatorValue);
                }}
                animate={
                  isCurrentValue 
                    ? { scaleY: 1.1, scaleX: 1.1 }
                    : { scaleY: 1, scaleX: 1 }
                }
                whileHover={{ scaleY: 1.1, scaleX: 1.1 }}
                whileTap={{ scaleY: 0.9, scaleX: 0.9 }}
                title={`Set value to ${indicatorValue}`}
              />
            );
          })}
        </div>
      </div>

      {/* Integrated Info Panel */}
      {(relevantTerms.length > 0 || feedbackText) && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <Collapsible open={isInfoPanelOpen} onOpenChange={setIsInfoPanelOpen}>
            <CollapsibleTrigger asChild>
              <ModernButton 
                variant="ghost" 
                onClick={() => {
                  triggerHaptic('selection');
                  setIsInfoPanelOpen(!isInfoPanelOpen);
                }}
                className="w-full flex items-center justify-center gap-2 text-blue-300 hover:text-white hover:bg-white/5 text-sm transition-all duration-200"
              >
                <Info size={16} />
                <span>
                  {isInfoPanelOpen 
                    ? 'Hide Info' 
                    : `Show Info${relevantTerms.length > 0 ? ` & Terms (${relevantTerms.length})` : ''}`
                  }
                </span>
                {isInfoPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </ModernButton>
            </CollapsibleTrigger>
            <CollapsibleContent asChild>
              <AnimatePresence>
                {isInfoPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-4 bg-black/20 rounded-xl border border-white/10 backdrop-blur-sm space-y-4">
                      
                      {/* Receptive Slider Feedback */}
                      {feedbackText && (
                        <div className="border border-blue-400/30 rounded-lg p-3 bg-blue-500/10">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={16} className="text-blue-400" />
                            <h4 className="text-sm font-semibold text-blue-300">Your Rating</h4>
                          </div>
                          <p className="text-sm text-white/90 leading-relaxed">
                            {feedbackText}
                          </p>
                        </div>
                      )}

                      {/* Glossary Terms */}
                      {relevantTerms.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={16} className="text-purple-400" />
                            <h4 className="text-sm font-semibold text-purple-300">Wine Terms</h4>
                          </div>
                          <div className="space-y-3">
                            {relevantTerms.map((term, index) => (
                              <motion.div
                                key={term.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.2 }}
                                className="border-l-2 border-purple-400/40 pl-3"
                              >
                                <h5 className="text-sm font-medium text-purple-200 capitalize mb-1">
                                  {term.term}
                                </h5>
                                <p className="text-xs text-white/80 leading-relaxed">
                                  {term.definition}
                                </p>
                                {term.variations && term.variations.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {term.variations.map((variation, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 bg-purple-500/20 text-purple-200 text-xs rounded-md border border-purple-400/20"
                                      >
                                        {variation}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </motion.div>
  );
}
