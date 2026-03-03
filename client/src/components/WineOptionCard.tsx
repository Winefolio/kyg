import { motion } from "framer-motion";
import { Wine, DollarSign, MessageCircle, Store, Tag, ArrowRightLeft } from "lucide-react";
import type { WineOption } from "@shared/schema";

interface WineOptionCardProps {
  option: WineOption;
  onSelect?: () => void;
  isSelected?: boolean;
}

const levelStyles = {
  budget: {
    gradient: "from-green-500 to-emerald-600",
    badge: "bg-green-500/20 text-green-400",
    label: "Budget",
    sublabel: "Under $25"
  },
  splurge: {
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-500/20 text-amber-400",
    label: "Splurge",
    sublabel: "Worth it"
  }
};

export function WineOptionCard({ option, onSelect, isSelected }: WineOptionCardProps) {
  const style = levelStyles[option.level];

  return (
    <motion.div
      className={`
        relative bg-white/5 backdrop-blur-md rounded-xl p-4 border cursor-pointer
        ${isSelected ? 'border-purple-500 bg-white/10' : 'border-white/10 hover:bg-white/10'}
        transition-all duration-200
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
    >
      {/* Level badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.badge}`}>
          <DollarSign className="w-3 h-3" />
          {style.label}
        </div>
        {option.level === 'budget' && (
          <span className="text-xs text-green-400/70">{style.sublabel}</span>
        )}
      </div>

      {/* Description */}
      <h3 className="text-white font-medium text-lg mb-2">{option.description}</h3>

      {/* Price range — only shown for budget */}
      {option.priceRange && (
        <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
          <span className="font-mono">
            ${option.priceRange.min} - ${option.priceRange.max}
          </span>
        </div>
      )}

      {/* Label tips */}
      {option.labelTips && (
        <div className="bg-white/5 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-white/50 mb-1">Look for on the label:</p>
              <p className="text-sm text-white/90">{option.labelTips}</p>
            </div>
          </div>
        </div>
      )}

      {/* What to ask for */}
      <div className="bg-white/5 rounded-lg p-3 mb-3">
        <div className="flex items-start gap-2">
          <MessageCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white/50 mb-1">Ask for:</p>
            <p className="text-sm text-white/90">{option.askFor}</p>
          </div>
        </div>
      </div>

      {/* Substitutes */}
      {option.substitutes && option.substitutes.length > 0 && (
        <div className="flex items-start gap-2 mb-3">
          <ArrowRightLeft className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white/50 mb-1">Also works:</p>
            <p className="text-sm text-white/70">
              {option.substitutes.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Example producers */}
      {option.exampleProducers && option.exampleProducers.length > 0 && (
        <div className="flex items-start gap-2">
          <Store className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white/50 mb-1">Examples:</p>
            <p className="text-sm text-white/70">
              {option.exampleProducers.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Why this wine */}
      {option.whyThisWine && (
        <p className="text-xs text-white/50 mt-3 italic">
          {option.whyThisWine}
        </p>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
        >
          <Wine className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
}

interface WineOptionsListProps {
  options: WineOption[];
  selectedLevel?: 'budget' | 'splurge';
  onSelectOption?: (level: 'budget' | 'splurge') => void;
}

export function WineOptionsList({ options, selectedLevel, onSelectOption }: WineOptionsListProps) {
  if (!options || options.length === 0) {
    return null;
  }

  // Sort: budget first, splurge second
  const sorted = [...options].sort((a, b) => (a.level === 'budget' ? -1 : 1));

  return (
    <div className="space-y-3">
      <h3 className="text-white font-medium flex items-center gap-2">
        <Wine className="w-5 h-5 text-purple-400" />
        Wine Options
      </h3>
      <p className="text-white/60 text-sm">
        Pick whichever fits your mood — same lesson either way.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((option) => (
          <WineOptionCard
            key={option.level}
            option={option}
            isSelected={selectedLevel === option.level}
            onSelect={() => onSelectOption?.(option.level)}
          />
        ))}
      </div>
    </div>
  );
}
