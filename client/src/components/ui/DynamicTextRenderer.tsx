import React, { useMemo } from 'react';
import { useGlossary } from '@/contexts/GlossaryContext';
import { TerminologyTooltip } from './TerminologyTooltip';
import type { GlossaryTerm } from '@shared/schema';

interface DynamicTextRendererProps {
  text: string;
  className?: string;
}

export function DynamicTextRenderer({ text, className }: DynamicTextRendererProps) {
  const { terms, isLoading } = useGlossary();

  const renderedContent = useMemo(() => {
    if (isLoading || !text || terms.length === 0) {
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
                <TerminologyTooltip key={`${termKey}-${matchIndex}`} term={termData.data}>
                  {matchedTerm}
                </TerminologyTooltip>
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
  }, [text, terms, isLoading, className]);

  return <>{renderedContent}</>;
}