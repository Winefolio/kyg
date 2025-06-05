import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GlossaryTerm } from '@shared/schema';

interface TerminologyTooltipProps {
  term: GlossaryTerm;
  children: React.ReactNode;
  className?: string;
}

export function TerminologyTooltip({ term, children, className }: TerminologyTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className={cn(
          "underline decoration-dotted decoration-purple-400/60 decoration-2 cursor-help hover:decoration-purple-500/80 transition-all duration-200 text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700 dark:hover:text-purple-300",
          className
        )}>
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        sideOffset={8}
        className="max-w-sm w-80 p-0 bg-gradient-to-br from-gray-900 via-purple-950 to-black border border-purple-500/30 shadow-2xl rounded-2xl overflow-hidden"
        asChild
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="relative p-5">
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-purple-900/20 pointer-events-none" />
            
            <div className="relative space-y-4">
              {/* Term Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xl text-purple-300 capitalize tracking-wide">
                  {term.term}
                </h4>
                {term.category && (
                  <Badge 
                    variant="secondary" 
                    className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-xs font-medium px-2 py-1"
                  >
                    {term.category}
                  </Badge>
                )}
              </div>

              {/* Definition */}
              <p className="text-sm leading-relaxed text-white/90 font-medium">
                {term.definition}
              </p>

              {/* Variations */}
              {term.variations && term.variations.length > 0 && (
                <div className="pt-3 border-t border-purple-400/20">
                  <p className="text-xs text-purple-300 font-medium mb-2">
                    Also known as:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {term.variations.map((variation, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded-lg font-medium border border-purple-400/20"
                      >
                        {variation}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decorative gradient accent */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600" />
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}