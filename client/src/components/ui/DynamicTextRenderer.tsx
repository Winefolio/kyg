import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlossary } from '@/contexts/GlossaryContext';
import { useHaptics } from '@/hooks/useHaptics';
import type { GlossaryTerm } from '@shared/schema';

interface DynamicTextRendererProps {
  text: string;
  className?: string;
  enableHighlighting?: boolean;
}

export function DynamicTextRenderer({ text, className, enableHighlighting = true }: DynamicTextRendererProps) {
  const { terms, isLoading } = useGlossary();
  const { triggerHaptic } = useHaptics();
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const renderedContent = useMemo(() => {
    if (isLoading || !text || terms.length === 0 || !enableHighlighting) {
      return <span className={className}>{text}</span>;
    }

    // Build a comprehensive list of all terms and their variations
    const allTerms: Array<{ term: string; data: GlossaryTerm }> = [];
    
    terms.forEach(termData => {
      // Add the main term
      allTerms.push({ term: termData.term, data: termData });
      
      // Add variations if they exist
      if (termData.variations) {
        termData.variations.forEach(variation => {
          allTerms.push({ term: variation, data: termData });
        });
      }
    });

    // Sort by length (longest first) to avoid partial matches
    allTerms.sort((a, b) => b.term.length - a.term.length);

    // Create a regex pattern for all terms (case-insensitive, word boundaries)
    const termPatterns = allTerms.map(({ term }) => 
      // Escape special regex characters and ensure word boundaries
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    if (termPatterns.length === 0) {
      return <span className={className}>{text}</span>;
    }

    // Create the regex with word boundaries to avoid partial matches
    const regex = new RegExp(`\\b(${termPatterns.join('|')})\\b`, 'gi');
    
    // Split text by matches
    const parts = text.split(regex);
    const matches = text.match(regex) || [];

    const result: React.ReactNode[] = [];
    const processedTerms = new Set<string>(); // Track terms already highlighted in this text block
    let matchIndex = 0;

    parts.forEach((part, index) => {
      if (index % 2 === 0) {
        // This is regular text
        if (part) {
          result.push(part);
        }
      } else {
        // This is a matched term
        const matchedTerm = matches[matchIndex];
        if (matchedTerm) {
          // Find the corresponding term data
          const termData = allTerms.find(({ term }) => 
            term.toLowerCase() === matchedTerm.toLowerCase()
          );

          if (termData) {
            // Create a unique key for this term (normalize to base term)
            const termKey = termData.data.term.toLowerCase().replace(/\s+/g, '_');
            
            // Only highlight if this term hasn't been processed yet in this text block
            if (!processedTerms.has(termKey)) {
              processedTerms.add(termKey);
              result.push(
                <button
                  key={`${termKey}-${matchIndex}`}
                  onClick={(e) => {
                    triggerHaptic('selection');
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPopupPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10
                    });
                    setSelectedTerm(termData.data);
                  }}
                  className="underline decoration-dotted decoration-purple-400/60 decoration-1 font-medium text-purple-300 hover:text-purple-200 hover:decoration-purple-300 transition-colors cursor-pointer bg-transparent border-none p-0 m-0"
                >
                  {matchedTerm}
                </button>
              );
            } else {
              // Term already highlighted once, render as plain text
              result.push(matchedTerm);
            }
          } else {
            result.push(matchedTerm);
          }
        }
        matchIndex++;
      }
    });

    return <span className={className}>{result}</span>;
  }, [text, terms, isLoading, className, enableHighlighting]);

  return (
    <div className="relative">
      {renderedContent}
      
      {/* Definition Popup */}
      <AnimatePresence>
        {selectedTerm && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setSelectedTerm(null)}
            />
            
            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{
                position: 'fixed',
                left: popupPosition.x,
                top: popupPosition.y,
                transform: 'translateX(-50%) translateY(-100%)',
                zIndex: 50
              }}
              className="bg-gray-900/95 backdrop-blur-xl rounded-lg border border-purple-500/30 shadow-2xl p-4 max-w-xs"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-purple-300 font-semibold text-sm">
                  {selectedTerm.term}
                </h4>
                <button
                  onClick={() => setSelectedTerm(null)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  ×
                </button>
              </div>
              
              <p className="text-gray-200 text-xs leading-relaxed mb-2">
                {selectedTerm.definition}
              </p>
              
              {selectedTerm.category && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-purple-600/20 rounded-full text-purple-300 text-xs">
                    {selectedTerm.category}
                  </span>
                </div>
              )}
              
              {/* Arrow pointer */}
              <div 
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
                style={{ 
                  width: 0, 
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(17, 24, 39, 0.95)'
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to extract relevant glossary terms from text
export function extractRelevantTerms(text: string, allTerms: GlossaryTerm[]): GlossaryTerm[] {
  if (!text || allTerms.length === 0) return [];

  const relevantTerms: GlossaryTerm[] = [];
  const processedTerms = new Set<string>();

  allTerms.forEach(termData => {
    const mainTerm = termData.term.toLowerCase();
    const variations = termData.variations?.map(v => v.toLowerCase()) || [];
    const allVariations = [mainTerm, ...variations];

    // Check if any variation appears in the text
    const termKey = mainTerm.replace(/\s+/g, '_');
    if (!processedTerms.has(termKey)) {
      const isRelevant = allVariations.some(term => {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        return regex.test(text);
      });

      if (isRelevant) {
        relevantTerms.push(termData);
        processedTerms.add(termKey);
      }
    }
  });

  return relevantTerms.sort((a, b) => a.term.localeCompare(b.term));
}