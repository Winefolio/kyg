import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Wine, AlertTriangle, ArrowRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PackageWine } from "@shared/schema";

interface CopyConfirmationModalProps {
  sourceWine: PackageWine & { slideCount?: number };
  targetWine: PackageWine & { slideCount?: number };
  sourceSlideCount: number;
  targetSlideCount: number;
  onConfirm: (replaceExisting: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CopyConfirmationModal({
  sourceWine,
  targetWine,
  sourceSlideCount,
  targetSlideCount,
  onConfirm,
  onCancel,
  isLoading = false
}: CopyConfirmationModalProps) {
  const [copyMode, setCopyMode] = useState<'append' | 'replace'>('append');

  const handleConfirm = () => {
    onConfirm(copyMode === 'replace');
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-gray-900/95 backdrop-blur-xl border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Copy className="w-5 h-5 text-purple-400" />
            <span>Copy Slides</span>
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Copy slides from one wine to another within your package
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source and Target Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center space-x-3">
                <Wine className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium text-sm">From: Wine {sourceWine.position}</div>
                  <div className="text-xs text-white/60">{sourceWine.wineName}</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                {sourceSlideCount} slides
              </Badge>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-white/40" />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center space-x-3">
                <Wine className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-medium text-sm">To: Wine {targetWine.position}</div>
                  <div className="text-xs text-white/60">{targetWine.wineName}</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                {targetSlideCount} slides
              </Badge>
            </div>
          </div>

          {/* Copy Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">Copy Mode</Label>
            <RadioGroup value={copyMode} onValueChange={(value) => setCopyMode(value as 'append' | 'replace')}>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                  <RadioGroupItem value="append" id="append" className="border-white/30" />
                  <Label htmlFor="append" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Plus className="w-4 h-4 text-emerald-400" />
                          <span className="font-medium">Add to existing slides</span>
                        </div>
                        <div className="text-xs text-white/60 mt-1">
                          Append {sourceSlideCount} slides after existing {targetSlideCount} slides
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-300">
                        {targetSlideCount + sourceSlideCount} total
                      </Badge>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                  <RadioGroupItem value="replace" id="replace" className="border-white/30" />
                  <Label htmlFor="replace" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4 text-orange-400" />
                          <span className="font-medium">Replace existing slides</span>
                        </div>
                        <div className="text-xs text-white/60 mt-1">
                          Remove {targetSlideCount} existing slides and replace with {sourceSlideCount} new slides
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs border-orange-400/30 text-orange-300">
                        {sourceSlideCount} total
                      </Badge>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Warning for Replace Mode */}
          {copyMode === 'replace' && targetSlideCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-300 font-medium">Warning</span>
              </div>
              <p className="text-xs text-orange-200/80 mt-1">
                This will permanently delete {targetSlideCount} existing slides from {targetWine.wineName}. This action cannot be undone.
              </p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 mr-2"
                >
                  <Copy className="w-4 h-4" />
                </motion.div>
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Copying...' : 'Copy Slides'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}