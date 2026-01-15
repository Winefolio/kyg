import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, ChevronDown, Wine, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CopyConfirmationModal } from "./CopyConfirmationModal";
import type { PackageWine } from "@shared/schema";

interface WineSlideCopyButtonProps {
  sourceWine: PackageWine & { slideCount?: number };
  availableWines: (PackageWine & { slideCount?: number })[];
  onCopyComplete: (targetWineId: string, count: number) => void;
}

export function WineSlideCopyButton({ 
  sourceWine, 
  availableWines, 
  onCopyComplete 
}: WineSlideCopyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedTargetWine, setSelectedTargetWine] = useState<PackageWine & { slideCount?: number } | null>(null);
  const { toast } = useToast();

  const sourceSlideCount = sourceWine.slideCount || 0;
  
  // Filter out source wine and wines without proper data
  const targetWines = availableWines.filter(wine => 
    wine.id !== sourceWine.id && wine.wineName && wine.position
  );

  const handleWineSelect = (targetWine: PackageWine & { slideCount?: number }) => {
    setSelectedTargetWine(targetWine);
    setShowConfirmation(true);
  };

  const handleConfirmCopy = async (replaceExisting: boolean) => {
    if (!selectedTargetWine) return;

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', `/api/wines/${sourceWine.id}/duplicate-slides`, {
        targetWineId: selectedTargetWine.id,
        replaceExisting
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Slides Copied Successfully",
          description: `${data.duplicatedCount} slides copied to ${selectedTargetWine.wineName}`,
        });
        
        onCopyComplete(selectedTargetWine.id, data.duplicatedCount);
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

  // Don't show button if no slides to copy or no target wines available
  if (sourceSlideCount === 0 || targetWines.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 transition-all duration-200"
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
            Copy Slides
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-64 bg-gray-900/95 backdrop-blur-xl border-white/20"
        >
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center space-x-2 text-sm text-white/80">
              <Wine className="w-4 h-4" />
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

      <AnimatePresence>
        {showConfirmation && selectedTargetWine && (
          <CopyConfirmationModal
            sourceWine={sourceWine}
            targetWine={selectedTargetWine}
            sourceSlideCount={sourceSlideCount}
            targetSlideCount={selectedTargetWine.slideCount || 0}
            onConfirm={handleConfirmCopy}
            onCancel={() => {
              setShowConfirmation(false);
              setSelectedTargetWine(null);
            }}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
    </>
  );
}