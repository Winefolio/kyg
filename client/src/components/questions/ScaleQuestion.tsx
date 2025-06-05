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

  // Calculate dynamic label styling based on slider position
  const progressPercent = (value - question.scale_min) / (question.scale_max - question.scale_min);
  
  // Fade out the left label as we move right, and vice versa
  const leftLabelOpacity = Math.max(0.4, 1 - progressPercent * 1.5);
  const rightLabelOpacity = Math.max(0.4, progressPercent * 1.5);
  
  // Make the label scale up when the slider is at its extreme end
  const leftLabelScale = value === question.scale_min ? 1.1 : 1;
  const rightLabelScale = value === question.scale_max ? 1.1 : 1;

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
          {relevantTerms.length > 0 && (
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={() => {
                triggerHaptic('selection');
                setIsInfoPanelOpen(!isInfoPanelOpen);
              }}
              className="text-blue-300 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-200"
            >
              <Info size={16} />
            </ModernButton>
          )}
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          <DynamicTextRenderer text={question.title} />
        </h3>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed">
          <DynamicTextRenderer text={question.description} />
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <ModernSlider
            value={value}
            min={question.scale_min}
            max={question.scale_max}
            step={1}
            labels={question.scale_labels as [string, string]}
            onChange={onChange}
          />
          
          {/* Dynamic Visual Label Feedback */}
          <div className="flex justify-between text-sm mt-2">
            <motion.span
              className="font-medium text-white"
              animate={{ 
                opacity: leftLabelOpacity, 
                scale: leftLabelScale,
                color: value === question.scale_min ? "#c084fc" : "#ffffff"
              }}
              transition={{ duration: 0.2 }}
            >
              {question.scale_labels[0]}
            </motion.span>
            <motion.span
              className="font-medium text-white"
              animate={{ 
                opacity: rightLabelOpacity, 
                scale: rightLabelScale,
                color: value === question.scale_max ? "#c084fc" : "#ffffff"
              }}
              transition={{ duration: 0.2 }}
            >
              {question.scale_labels[1]}
            </motion.span>
          </div>
        </div>
        
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
      {relevantTerms.length > 0 && (
        <Collapsible open={isInfoPanelOpen} onOpenChange={setIsInfoPanelOpen}>
          <CollapsibleContent asChild>
            <AnimatePresence>
              {isInfoPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/40 rounded-xl border border-blue-500/30 backdrop-blur-sm shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen size={16} className="text-blue-300" />
                      <h4 className="text-sm font-semibold text-blue-200">Wine Terms</h4>
                    </div>
                    <div className="space-y-3">
                      {relevantTerms.map((term, index) => (
                        <motion.div
                          key={term.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          className="border-l-2 border-blue-400/50 pl-3 py-1"
                        >
                          <h5 className="text-sm font-medium text-blue-100 capitalize mb-1">
                            {term.term}
                          </h5>
                          <p className="text-xs text-white/90 leading-relaxed">
                            {term.definition}
                          </p>
                          {term.variations && term.variations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {term.variations.map((variation, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-xs rounded-md border border-blue-400/30"
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
                </motion.div>
              )}
            </AnimatePresence>
          </CollapsibleContent>
        </Collapsible>
      )}
    </motion.div>
  );
}
