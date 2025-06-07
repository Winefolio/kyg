import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { Wine, GripVertical, Eye, EyeOff, Check, X, Sparkles } from "lucide-react";
import type { PackageWine, SessionWineSelection } from "@shared/schema";

interface SessionWineSelectorProps {
  sessionId: string;
  packageId: string;
  onSelectionChange?: (selectedWines: number) => void;
}

interface WineSelectionItem {
  wine: PackageWine;
  position: number;
  isIncluded: boolean;
}

export function SessionWineSelector({ sessionId, packageId, onSelectionChange }: SessionWineSelectorProps) {
  const [wineSelections, setWineSelections] = useState<WineSelectionItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  // Get all wines in the package
  const { data: packageWines = [], isLoading: winesLoading } = useQuery<PackageWine[]>({
    queryKey: [`/api/packages/${packageId}/wines`],
    enabled: !!packageId
  });

  // Get current session wine selections
  const { data: sessionSelections = [], isLoading: selectionsLoading } = useQuery<(SessionWineSelection & { wine: PackageWine })[]>({
    queryKey: [`/api/sessions/${sessionId}/wine-selections`],
    enabled: !!sessionId
  });

  // Initialize wine selections when data loads
  useEffect(() => {
    console.log('SessionWineSelector Debug:', {
      packageWinesLength: packageWines.length,
      sessionSelectionsLength: sessionSelections.length,
      packageId,
      sessionId,
      winesLoading,
      selectionsLoading
    });

    if (packageWines.length > 0) {
      if (sessionSelections.length > 0) {
        // Use existing session selections
        const selections = sessionSelections.map(selection => ({
          wine: selection.wine,
          position: selection.position,
          isIncluded: selection.isIncluded
        }));
        setWineSelections(selections.sort((a, b) => a.position - b.position));
        console.log('Using existing session selections:', selections);
      } else {
        // Initialize with all wines included in original order
        const initialSelections = packageWines
          .sort((a, b) => a.position - b.position)
          .map((wine, index) => ({
            wine,
            position: index + 1,
            isIncluded: true
          }));
        setWineSelections(initialSelections);
        console.log('Created initial selections:', initialSelections);
      }
    }
  }, [packageWines, sessionSelections, packageId, sessionId, winesLoading, selectionsLoading]);

  // Update parent component when selection changes
  useEffect(() => {
    const selectedCount = wineSelections.filter(item => item.isIncluded).length;
    onSelectionChange?.(selectedCount);
  }, [wineSelections, onSelectionChange]);

  // Save wine selections mutation
  const saveSelectionsMutation = useMutation({
    mutationFn: async (selections: WineSelectionItem[]) => {
      const payload = {
        selections: selections.map(item => ({
          packageWineId: item.wine.id,
          position: item.position,
          isIncluded: item.isIncluded
        }))
      };
      
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/wine-selections`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}/wine-selections`] });
      setHasChanges(false);
    }
  });

  const handleToggleWine = (wineId: string) => {
    setWineSelections(prev => 
      prev.map(item => 
        item.wine.id === wineId 
          ? { ...item, isIncluded: !item.isIncluded }
          : item
      )
    );
    setHasChanges(true);
  };

  const handleReorder = (newOrder: WineSelectionItem[]) => {
    const reorderedSelections = newOrder.map((item, index) => ({
      ...item,
      position: index + 1
    }));
    setWineSelections(reorderedSelections);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSelectionsMutation.mutate(wineSelections);
  };

  const handleReset = () => {
    if (sessionSelections.length > 0) {
      const selections = sessionSelections.map(selection => ({
        wine: selection.wine,
        position: selection.position,
        isIncluded: selection.isIncluded
      }));
      setWineSelections(selections.sort((a, b) => a.position - b.position));
    } else {
      const initialSelections = packageWines
        .sort((a, b) => a.position - b.position)
        .map((wine, index) => ({
          wine,
          position: index + 1,
          isIncluded: true
        }));
      setWineSelections(initialSelections);
    }
    setHasChanges(false);
  };

  if (winesLoading || selectionsLoading) {
    return (
      <Card className="bg-gradient-card backdrop-blur-xl border border-white/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedCount = wineSelections.filter(item => item.isIncluded).length;
  const totalCount = wineSelections.length;

  return (
    <Card className="bg-gradient-card backdrop-blur-xl border border-white/20 shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Wine className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Wine Selection</CardTitle>
              <CardDescription className="text-purple-200">
                Choose and arrange wines for your session
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 border-purple-400/30">
            {selectedCount} of {totalCount} selected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Customize Your Session</p>
              <p className="text-blue-200/80">
                Toggle wines on/off and drag to reorder. Only selected wines will appear in your tasting session.
              </p>
            </div>
          </div>
        </div>

        {/* Wine List */}
        <Reorder.Group 
          axis="y" 
          values={wineSelections} 
          onReorder={handleReorder}
          className="space-y-3"
        >
          <AnimatePresence>
            {wineSelections.map((item, index) => (
              <Reorder.Item
                key={item.wine.id}
                value={item}
                className="cursor-grab active:cursor-grabbing"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200
                    ${item.isIncluded 
                      ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-purple-400/40 shadow-lg' 
                      : 'bg-white/5 border-white/20 opacity-60'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    {/* Drag Handle */}
                    <div className="text-white/40 hover:text-white/60 transition-colors">
                      <GripVertical size={20} />
                    </div>

                    {/* Position Badge */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${item.isIncluded 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-white/20 text-white/60'
                      }
                    `}>
                      {index + 1}
                    </div>

                    {/* Wine Image */}
                    {item.wine.wineImageUrl && (
                      <div className="w-12 h-16 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                        <img
                          src={item.wine.wineImageUrl}
                          alt={item.wine.wineName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Wine Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">
                        {item.wine.wineName}
                      </h4>
                      <p className="text-white/60 text-sm truncate">
                        {item.wine.wineType} • {item.wine.vintage} • {item.wine.region}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center space-x-2">
                      {item.isIncluded ? (
                        <Eye className="w-4 h-4 text-green-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-white/40" />
                      )}
                      <Switch
                        checked={item.isIncluded}
                        onCheckedChange={() => handleToggleWine(item.wine.id)}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Actions */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 border-t border-white/10"
          >
            <div className="flex justify-between items-center">
              <p className="text-white/60 text-sm">
                You have unsaved changes
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="border-white/20 text-white/80 hover:bg-white/10"
                  disabled={saveSelectionsMutation.isPending}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-gradient-button text-white"
                  disabled={saveSelectionsMutation.isPending || selectedCount === 0}
                >
                  {saveSelectionsMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Save Selection
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {selectedCount === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-400/20 rounded-xl p-4 text-center"
          >
            <p className="text-red-200 text-sm">
              You must select at least one wine for your session.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}