import { motion } from "framer-motion";
import { Wine, DollarSign, MessageCircle, Store, Tag, ArrowRightLeft } from "lucide-react";
import type { WineOption } from "@shared/schema";

interface WineOptionCardProps {
  option: WineOption;
  onSelect?: () => void;
  isSelected?: boolean;
}

const tierColors: Record<string, string> = {
  budget: "text-green-400",
  entry: "text-green-400",
  mid: "text-blue-400",
  splurge: "text-amber-400",
  premium: "text-amber-400",
};

const tierLabels: Record<string, string> = {
  budget: "Entry Level",
  entry: "Entry Level",
  mid: "Mid Range",
  splurge: "Worth the Splurge",
  premium: "Premium",
};

export function WineOptionCard({ option, onSelect, isSelected }: WineOptionCardProps) {
  return (
    <motion.div
      className={`
        relative bg-white/5 backdrop-blur-md rounded-xl p-4 border cursor-pointer
        ${isSelected ? 'border-purple-500 bg-white/10' : 'border-white/10 hover:bg-white/10'}
        transition-all duration-200
      `}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
    >
      {/* Title + price */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-white font-medium text-base">{option.description}</h3>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shrink-0"
          >
            <Wine className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </div>

      {option.priceRange && (
        <p className="text-sm text-white/50 font-mono mb-3">
          ${option.priceRange.min} – ${option.priceRange.max}
        </p>
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

      {/* Substitutes */}
      {option.substitutes && option.substitutes.length > 0 && (
        <div className="flex items-start gap-2 mb-3">
          <ArrowRightLeft className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white/50 mb-1">Also works:</p>
            <p className="text-sm text-white/70">{option.substitutes.join(", ")}</p>
          </div>
        </div>
      )}

      {/* Example producers */}
      {option.exampleProducers && option.exampleProducers.length > 0 && (
        <div className="flex items-start gap-2">
          <Store className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white/50 mb-1">Look for:</p>
            <p className="text-sm text-white/70">{option.exampleProducers.join(", ")}</p>
          </div>
        </div>
      )}

      {/* Why this wine */}
      {option.whyThisWine && (
        <p className="text-xs text-white/50 mt-3 italic">{option.whyThisWine}</p>
      )}
    </motion.div>
  );
}

interface WineOptionsListProps {
  options: WineOption[];
  selectedIndex?: number;
  onSelectOption?: (index: number) => void;
}

export function WineOptionsList({ options, selectedIndex, onSelectOption }: WineOptionsListProps) {
  if (!options || options.length === 0) {
    return null;
  }

  // Group options by level, preserving original index for selection tracking
  const indexed = options.map((option, index) => ({ option, index }));
  const groups: { level: string; entries: typeof indexed }[] = [];
  const seen = new Set<string>();
  for (const entry of indexed) {
    if (!seen.has(entry.option.level)) {
      seen.add(entry.option.level);
      groups.push({ level: entry.option.level, entries: indexed.filter(e => e.option.level === entry.option.level) });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-medium flex items-center gap-2">
          <Wine className="w-5 h-5 text-purple-400" />
          Wine Options
        </h3>
        <p className="text-white/60 text-sm mt-1">
          Pick whichever works for you — any option will work for this chapter.
        </p>
      </div>

      {groups.map(({ level, entries }) => {
        const color = tierColors[level] || "text-purple-400";
        const label = tierLabels[level] || level.charAt(0).toUpperCase() + level.slice(1);
        return (
          <div key={level} className="space-y-2">
            <h4 className={`text-sm font-medium flex items-center gap-1.5 ${color}`}>
              <DollarSign className="w-3.5 h-3.5" />
              {label}
            </h4>
            <div className="space-y-3">
              {entries.map(({ option, index }) => (
                <WineOptionCard
                  key={`${level}-${index}`}
                  option={option}
                  isSelected={selectedIndex === index}
                  onSelect={() => onSelectOption?.(index)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
