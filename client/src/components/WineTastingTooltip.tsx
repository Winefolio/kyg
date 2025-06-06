import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WineTastingTooltipProps {
  term: string;
  children: React.ReactNode;
  className?: string;
}

// Wine tasting terminology definitions
const WINE_TERMS: Record<string, { definition: string; examples?: string[] }> = {
  "stone fruit": {
    definition: "Flavors reminiscent of fruits with pits, such as peaches, apricots, plums, and cherries.",
    examples: ["Peach", "Apricot", "Plum", "Cherry"]
  },
  "tannins": {
    definition: "Natural compounds that create a dry, astringent sensation in your mouth, especially on your gums and tongue.",
    examples: ["Grippy texture", "Drying sensation", "Puckering feeling"]
  },
  "finish": {
    definition: "How long the wine's flavors linger in your mouth after swallowing.",
    examples: ["Short (few seconds)", "Medium (30+ seconds)", "Long (minute+)"]
  },
  "body": {
    definition: "The weight and fullness of the wine in your mouth, from light to full-bodied.",
    examples: ["Light as water", "Medium like milk", "Full like cream"]
  },
  "aroma": {
    definition: "The scents you smell when you sniff the wine, before tasting.",
    examples: ["Fruity", "Floral", "Earthy", "Spicy"]
  },
  "bouquet": {
    definition: "Complex aromas that develop as wine ages, different from primary fruit aromas.",
    examples: ["Vanilla from oak", "Leather", "Tobacco", "Herbs"]
  },
  "terroir": {
    definition: "The environmental factors (soil, climate, topography) that influence wine character.",
    examples: ["Mineral notes", "Regional characteristics", "Vineyard expression"]
  },
  "oak": {
    definition: "Flavors from barrel aging that add vanilla, spice, and toasty notes to wine.",
    examples: ["Vanilla", "Coconut", "Spice", "Toast"]
  },
  "acidity": {
    definition: "The tartness or sharpness that makes your mouth water, providing wine's backbone.",
    examples: ["Crisp", "Bright", "Tart", "Zippy"]
  },
  "minerality": {
    definition: "Subtle flavors reminiscent of stones, chalk, or wet rocks.",
    examples: ["Chalk", "Flint", "Wet stones", "Salinity"]
  },
  "vintage": {
    definition: "The year the grapes were harvested, affecting wine character due to weather conditions.",
    examples: ["2018 vintage", "Harvest year", "Growing season"]
  },
  "varietal": {
    definition: "The grape variety used to make the wine, each with distinctive characteristics.",
    examples: ["Cabernet Sauvignon", "Chardonnay", "Pinot Noir", "Riesling"]
  }
};

export function WineTastingTooltip({ term, children, className = "" }: WineTastingTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const termKey = term.toLowerCase();
  const termData = WINE_TERMS[termKey];
  
  if (!termData) {
    return <span className={className}>{children}</span>;
  }
  
  return (
    <div className="relative inline-block">
      <span 
        className={`${className} cursor-help border-b border-dotted border-purple-300/50 hover:border-purple-300 transition-colors inline-flex items-center gap-1`}
        onClick={() => setIsOpen(true)}
      >
        {children}
        <HelpCircle className="w-3 h-3 text-purple-300/70 hover:text-purple-300" />
      </span>
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Modal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl z-50 md:hidden max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-white capitalize">{term}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-white/90 text-sm leading-relaxed mb-4">
                {termData.definition}
              </p>
              
              {termData.examples && (
                <div>
                  <h4 className="text-white/80 font-medium text-sm mb-2">Examples:</h4>
                  <div className="flex flex-wrap gap-2">
                    {termData.examples.map((example, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/10 rounded-lg text-white/80 text-xs"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Desktop Tooltip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-2xl z-40 hidden md:block"
            >
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-purple-900 rotate-45 border-r border-b border-white/20" />
              </div>
              
              <h3 className="font-bold text-white text-sm mb-2 capitalize">{term}</h3>
              <p className="text-white/90 text-xs leading-relaxed mb-3">
                {termData.definition}
              </p>
              
              {termData.examples && (
                <div>
                  <h4 className="text-white/80 font-medium text-xs mb-2">Examples:</h4>
                  <div className="flex flex-wrap gap-1">
                    {termData.examples.map((example, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/10 rounded text-white/80 text-xs"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 text-white/60 hover:text-white h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component for common wine terms in questions
export function WineTermText({ children, className = "" }: { children: string; className?: string }) {
  const text = children;
  const terms = Object.keys(WINE_TERMS);
  
  // Find terms in the text and wrap them with tooltips
  let processedText: React.ReactNode[] = [];
  let remainingText = text;
  let key = 0;
  
  while (remainingText.length > 0) {
    let foundTerm = null;
    let foundIndex = -1;
    
    // Find the earliest occurring term
    for (const term of terms) {
      const index = remainingText.toLowerCase().indexOf(term);
      if (index !== -1 && (foundIndex === -1 || index < foundIndex)) {
        foundTerm = term;
        foundIndex = index;
      }
    }
    
    if (foundTerm && foundIndex !== -1) {
      // Add text before the term
      if (foundIndex > 0) {
        processedText.push(remainingText.substring(0, foundIndex));
      }
      
      // Add the term with tooltip
      const termEnd = foundIndex + foundTerm.length;
      const termText = remainingText.substring(foundIndex, termEnd);
      processedText.push(
        <WineTastingTooltip key={key++} term={foundTerm} className={className}>
          {termText}
        </WineTastingTooltip>
      );
      
      // Continue with remaining text
      remainingText = remainingText.substring(termEnd);
    } else {
      // No more terms found, add remaining text
      processedText.push(remainingText);
      break;
    }
  }
  
  return <>{processedText}</>;
}