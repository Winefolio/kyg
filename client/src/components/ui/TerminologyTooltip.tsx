import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import type { GlossaryTerm } from '@shared/schema';

interface TerminologyTooltipProps {
  term: GlossaryTerm;
  children: React.ReactNode;
}

export function TerminologyTooltip({ term, children }: TerminologyTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted decoration-purple-400/60 decoration-2 cursor-help hover:decoration-purple-500/80 transition-all duration-200 text-purple-600 dark:text-purple-400 font-medium">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-sm p-0 bg-gradient-to-br from-white via-purple-50 to-purple-100 dark:from-gray-900 dark:via-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-700 shadow-2xl"
          sideOffset={8}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="p-4"
          >
            <div className="space-y-3">
              {/* Term Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-purple-900 dark:text-purple-100 capitalize">
                  {term.term}
                </h4>
                {term.category && (
                  <span className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                    {term.category}
                  </span>
                )}
              </div>

              {/* Definition */}
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                {term.definition}
              </p>

              {/* Variations */}
              {term.variations && term.variations.length > 0 && (
                <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                    Also known as:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {term.variations.map((variation, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs rounded-md font-medium"
                      >
                        {variation}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decorative gradient accent */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-b-md" />
          </motion.div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}