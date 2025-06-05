import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";

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
  const [notesExpanded, setNotesExpanded] = useState(false);

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
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{question.title}</h3>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed">{question.description}</p>
      </div>

      <div className="space-y-2 mb-4">
        {question.options.map((option) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Label
              htmlFor={option.id}
              className="flex items-center p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all duration-300 group"
            >
              <Checkbox
                id={option.id}
                checked={value.selected.includes(option.id)}
                onCheckedChange={(checked) => handleOptionChange(option.id, checked as boolean)}
                className="mr-3 border-white/40 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
              />
              <div className="flex-1">
                <div className="text-white text-sm sm:text-base font-medium group-hover:text-purple-200 transition-colors duration-300">
                  {option.text}
                </div>
                {option.description && (
                  <div className="text-white/60 text-xs sm:text-sm mt-1 leading-relaxed">{option.description}</div>
                )}
              </div>
            </Label>
          </motion.div>
        ))}
      </div>

      {question.allow_notes && (
        <div>
          <Button
            type="button"
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
          </Button>
          
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
    </motion.div>
  );
}
