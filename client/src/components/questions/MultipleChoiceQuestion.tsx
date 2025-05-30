import { useState } from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 bg-purple-600/30 rounded-full text-purple-200 text-sm font-medium">
            {question.category}
          </span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">{question.title}</h3>
        <p className="text-white/70">{question.description}</p>
      </div>

      <div className="space-y-3 mb-6">
        {question.options.map((option) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Label
              htmlFor={option.id}
              className="flex items-center p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all duration-300 group"
            >
              <Checkbox
                id={option.id}
                checked={value.selected.includes(option.id)}
                onCheckedChange={(checked) => handleOptionChange(option.id, checked as boolean)}
                className="mr-4 border-white/40 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
              />
              <div className="flex-1">
                <div className="text-white font-medium group-hover:text-purple-200 transition-colors duration-300">
                  {option.text}
                </div>
                {option.description && (
                  <div className="text-white/60 text-sm">{option.description}</div>
                )}
              </div>
            </Label>
          </motion.div>
        ))}
      </div>

      {question.allow_notes && (
        <div>
          <Label className="block text-white/80 text-sm font-medium mb-2">
            Additional Notes (Optional)
          </Label>
          <Textarea
            placeholder="Describe any other aromas you notice..."
            value={value.notes || ""}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
            rows={3}
          />
        </div>
      )}
    </motion.div>
  );
}
