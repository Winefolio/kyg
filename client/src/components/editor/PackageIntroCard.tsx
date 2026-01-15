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
      <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-600/20 rounded-lg border border-purple-400/30">
              <Package className="h-6 w-6 text-purple-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-xl font-bold text-white">{packageName}</h2>
                <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-400/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Package Introduction
                </Badge>
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-3">
                {description}
              </p>
              <div className="flex items-center space-x-4 text-xs text-white/60">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span>{wineCount} wine{wineCount !== 1 ? 's' : ''} in this tasting</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span>Package overview</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Visual indicator that this is not editable */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center space-x-2">
              <Package className="h-3 w-3" />
              <span>This is your package introduction - edit package details in settings</span>
            </span>
            <Badge variant="outline" className="border-white/20 text-white/60">
              Read-only
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}