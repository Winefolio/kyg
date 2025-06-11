import { useState } from "react";
import { Copy, ChevronDown, Wine, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PackageWine } from "@shared/schema";

interface SimpleCopyButtonProps {
  sourceWine: PackageWine & { slideCount?: number };
  availableWines: (PackageWine & { slideCount?: number })[];
  onCopyComplete: (targetWineId: string, count: number) => void;
}

export function SimpleCopyButton({ 
  sourceWine, 
  availableWines, 
  onCopyComplete 
}: SimpleCopyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedTargetWine, setSelectedTargetWine] = useState<PackageWine & { slideCount?: number } | null>(null);
  const [copyMode, setCopyMode] = useState<'append' | 'replace'>('append');
  const { toast } = useToast();

  const sourceSlideCount = sourceWine.slideCount || 0;
  const targetWines = availableWines.filter(wine => 
    wine.id !== sourceWine.id && wine.wineName && wine.position
  );

  const handleWineSelect = (targetWine: PackageWine & { slideCount?: number }) => {
    setSelectedTargetWine(targetWine);
    setShowConfirmation(true);
  };

  const handleConfirmCopy = async () => {
    if (!selectedTargetWine) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/wines/${sourceWine.id}/duplicate-slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWineId: selectedTargetWine.id,
          replaceExisting: copyMode === 'replace'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Slides Copied Successfully",
          description: `${result.duplicatedCount} slides copied to ${selectedTargetWine.wineName}`,
        });
        
        onCopyComplete(selectedTargetWine.id, result.duplicatedCount);
      } else {
        throw new Error(result.error || 'Failed to copy slides');
      }
    } catch (error) {
      console.error('Error copying slides:', error);
      toast({
        title: "Copy Failed",
        description: error instanceof Error ? error.message : "Failed to copy slides",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
      setSelectedTargetWine(null);
    }
  };

  if (sourceSlideCount === 0 || targetWines.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="h-8 px-2 hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
            title="Copy slides to another wine"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            Copy
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-64 bg-gray-900/95 backdrop-blur-xl border-white/20"
        >
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center space-x-2 text-sm text-white/80">
              <Copy className="w-4 h-4" />
              <span>Copy {sourceSlideCount} slides to:</span>
            </div>
          </div>
          
          {targetWines.map((wine) => (
            <DropdownMenuItem
              key={wine.id}
              onClick={() => handleWineSelect(wine)}
              className="p-3 hover:bg-white/10 cursor-pointer text-white"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    Wine {wine.position}: {wine.wineName}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {wine.slideCount || 0} existing slides
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-white/10 text-white/80"
                  >
                    {wine.slideCount || 0}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-white/60" />
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          {targetWines.length === 0 && (
            <div className="p-3 text-center text-white/60 text-sm">
              <AlertTriangle className="w-4 h-4 mx-auto mb-2" />
              No other wines available
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={() => setShowConfirmation(false)}>
        <DialogContent className="sm:max-w-md bg-gray-900/95 backdrop-blur-xl border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Copy className="w-5 h-5 text-purple-400" />
              <span>Copy Slides</span>
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Copy slides from {sourceWine.wineName} to {selectedTargetWine?.wineName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Source and Target Display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wine className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="font-medium text-sm">From: {sourceWine.wineName}</div>
                    <div className="text-xs text-white/60">{sourceSlideCount} slides</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wine className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-medium text-sm">To: {selectedTargetWine?.wineName}</div>
                    <div className="text-xs text-white/60">{selectedTargetWine?.slideCount || 0} existing slides</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy Mode Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">Copy Mode</Label>
              <RadioGroup value={copyMode} onValueChange={(value) => setCopyMode(value as 'append' | 'replace')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="append" id="append" />
                  <Label htmlFor="append" className="text-sm">Add to existing slides</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="text-sm">Replace existing slides</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Warning for Replace Mode */}
            {copyMode === 'replace' && (selectedTargetWine?.slideCount || 0) > 0 && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-300 font-medium">Warning</span>
                </div>
                <p className="text-xs text-orange-200/80 mt-1">
                  This will permanently delete {selectedTargetWine?.slideCount} existing slides. This action cannot be undone.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={isLoading}
                className="border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCopy}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                {isLoading ? 'Copying...' : 'Copy Slides'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}