// client/src/components/editor/PackageIntroCard.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface PackageIntroCardProps {
  packageName: string;
  description: string;
  wineCount: number;
}

export function PackageIntroCard({ packageName, description, wineCount }: PackageIntroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-400/30 shrink-0">
              <Package className="h-5 w-5 text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white truncate">{packageName}</h2>
                <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-400/30 shrink-0 self-start">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Package Introduction
                </Badge>
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-3 break-words">
                {description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full shrink-0"></span>
                  <span>{wineCount} wine{wineCount !== 1 ? 's' : ''} in this tasting</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full shrink-0"></span>
                  <span>Package overview</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Visual indicator that this is not editable */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-white/50">
              <span className="flex items-center space-x-2">
                <Package className="h-3 w-3 shrink-0" />
                <span className="break-words">This is your package introduction - edit package details in settings</span>
              </span>
              <Badge variant="outline" className="border-white/20 text-white/60 shrink-0 self-start">
                Read-only
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}