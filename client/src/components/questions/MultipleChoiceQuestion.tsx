import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ModernButton } from "@/components/ui/modern-button";
import { ModernCard } from "@/components/ui/modern-card";
import { DynamicTextRenderer, extractRelevantTerms } from "@/components/ui/DynamicTextRenderer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, MessageSquare, Info, BookOpen } from "lucide-react";
import { modernCardVariants, staggeredReveal, springTransition } from "@/lib/modern-animations";
import { useHaptics } from "@/hooks/useHaptics";
import { useGlossary } from "@/contexts/GlossaryContext";

interface Option {
  id: string;
  text: string;
  description?: string;
}

interface MultipleChoiceQuestionProps {
  question: {
    title: string;
    description: string;
    category: string;
    options: Option[];
    allow_multiple: boolean;
    allow_notes: boolean;
  };
  value: {
    selected: string[];
    notes?: string;
  };
  onChange: (value: { selected: string[]; notes?: string }) => void;
}

export function MultipleChoiceQuestion({ question, value, onChange }: MultipleChoiceQuestionProps) {
  const { triggerHaptic } = useHaptics();
  const { terms } = useGlossary();
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  // Extract all relevant glossary terms from the current slide content
  const relevantTerms = useMemo(() => {
    const allText = [
      question.title,
      question.description,
      ...question.options.map(opt => `${opt.text} ${opt.description || ''}`)
    ].join(' ');
    
    return extractRelevantTerms(allText, terms);
  }, [question, terms]);

  const handleOptionChange = (optionId: string, checked: boolean) => {
    triggerHaptic('selection');
    
    let newSelected = [...value.selected];
    
    if (question.allow_multiple) {
      if (checked) {
        newSelected.push(optionId);
      } else {
        newSelected = newSelected.filter(id => id !== optionId);
      }
    } else {
      newSelected = checked ? [optionId] : [];
    }
    
    onChange({ ...value, selected: newSelected });
  };

  const handleNotesChange = (notes: string) => {
    onChange({ ...value, notes });
  };

  const toggleNotes = () => {
    triggerHaptic('selection');
    setNotesExpanded(!notesExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl h-full flex flex-col justify-center"
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2 py-1 bg-purple-600/30 rounded-full text-purple-200 text-xs sm:text-sm font-medium">
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

      <div className="space-y-2 mb-4">
        {question.options.map((option, index) => {
          const isSelected = value.selected.includes(option.id);
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ 
                scale: 1.02, 
                x: 5,
                transition: { duration: 0.2 }
              }}
              whileTap={{ 
                scale: 0.98,
                transition: { duration: 0.1 }
              }}
            >
              <Label
                htmlFor={option.id}
                className={`
                  flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 group
                  transform-gpu
                  ${isSelected 
                    ? 'bg-purple-500/20 border border-purple-400/50 shadow-lg shadow-purple-500/20' 
                    : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20'
                  }
                `}
              >
                <motion.div
                  animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Checkbox
                    id={option.id}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleOptionChange(option.id, checked as boolean)}
                    className="mr-3 border-white/40 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                  />
                </motion.div>
                <div className="flex-1">
                  <motion.div 
                    className={`text-sm sm:text-base font-medium transition-colors duration-300 ${
                      isSelected ? 'text-purple-100' : 'text-white group-hover:text-purple-200'
                    }`}
                    animate={isSelected ? { x: 2 } : { x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {option.text}
                  </motion.div>
                  {option.description && (
                    <motion.div 
                      className="text-white/60 text-xs sm:text-sm mt-1 leading-relaxed"
                      animate={isSelected ? { opacity: 0.9 } : { opacity: 0.6 }}
                    >
                      {option.description}
                    </motion.div>
                  )}
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="w-2 h-2 bg-purple-400 rounded-full ml-2"
                  />
                )}
              </Label>
            </motion.div>
          );
        })}
      </div>

      {question.allow_notes && (
        <div>
          <ModernButton
            variant="ghost"
            onClick={toggleNotes}
            className="w-full flex items-center justify-between p-2 text-white/80 hover:text-white hover:bg-white/5 text-xs sm:text-sm"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare size={14} />
              <span>Add Notes</span>
              {value.notes && value.notes.trim() && (
                <span className="text-purple-300 text-xs">(Added)</span>
              )}
            </div>
            {notesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </ModernButton>
          
          <AnimatePresence>
            {notesExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <Textarea
                    placeholder="Describe any other aromas you notice..."
                    value={value.notes || ""}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-purple-400 focus:ring-purple-400/20 resize-none text-sm"
                    rows={2}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Integrated Info Panel */}
      {relevantTerms.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <Collapsible open={isInfoPanelOpen} onOpenChange={setIsInfoPanelOpen}>
            <CollapsibleTrigger asChild>
              <ModernButton 
                variant="ghost" 
                onClick={() => {
                  triggerHaptic('selection');
                  setIsInfoPanelOpen(!isInfoPanelOpen);
                }}
                className="w-full flex items-center justify-center gap-2 text-purple-300 hover:text-white hover:bg-white/5 text-sm transition-all duration-200"
              >
                <Info size={16} />
                <span>{isInfoPanelOpen ? 'Hide Terms' : `Show Terms (${relevantTerms.length})`}</span>
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
                    <div className="mt-3 p-4 bg-black/20 rounded-xl border border-white/10 backdrop-blur-sm">
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
