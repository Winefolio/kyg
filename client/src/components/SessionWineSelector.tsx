import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernCard } from "@/components/ui/modern-card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { apiRequest } from "@/lib/queryClient";
import { Wine, GripVertical, Eye, EyeOff, Check, X, Sparkles, MapPin, Calendar, Grape } from "lucide-react";
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
    <div className="space-y-8">
      <Card className="bg-gradient-card backdrop-blur-xl border border-white/20 shadow-2xl">
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-4">
              <motion.div 
                className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex-shrink-0"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Wine className="w-6 h-6 text-purple-400" />
              </motion.div>
              <div className="space-y-2">
                <CardTitle className="text-white text-2xl font-semibold tracking-tight">Selection</CardTitle>
                <CardDescription className="text-purple-200 text-base leading-relaxed">
                  Customize your tasting journey
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <Badge 
                variant="secondary" 
                className={`
                  px-5 py-2.5 text-base font-semibold transition-all duration-300 border
                  ${selectedCount === 0 
                    ? 'bg-red-500/20 text-red-300 border-red-400/30' 
                    : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-100 border-purple-400/30'
                  }
                `}
              >
                <span className="text-xl font-bold">{selectedCount}</span>
                <span className="mx-2 text-purple-300/50">/</span>
                <span className="text-base">{totalCount} wines</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

      <CardContent className="space-y-6 pt-0">
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

        {/* Wine List - Compact Layout */}
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
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className={`
                      relative bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4 
                      transition-all duration-300 hover:bg-white/10 hover:border-white/30
                      ${item.isIncluded 
                        ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-400/30' 
                        : 'opacity-60 grayscale'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {/* Drag Handle */}
                      <div className="flex-shrink-0">
                        <GripVertical className="w-4 h-4 text-white/40" />
                      </div>

                      {/* Wine Image - Enhanced with proper loading */}
                      <div className="relative w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
                        {item.wine.wineImageUrl && item.wine.wineImageUrl.trim() !== '' ? (
                          <img
                            src={item.wine.wineImageUrl}
                            alt={`${item.wine.wineName} wine bottle`}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            onError={(e) => {
                              // Fallback to default wine icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`
                          w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center
                          ${item.wine.wineImageUrl && item.wine.wineImageUrl.trim() !== '' ? 'hidden' : ''}
                        `}>
                          <Wine className="w-6 h-6 text-white/40" />
                        </div>
                      </div>

                      {/* Wine Content - Enhanced with better spacing */}
                      <div className="flex-1 min-w-0 px-4">
                        <div className="flex items-center justify-between h-full">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="space-y-1">
                              <h4 className="text-white font-semibold text-lg leading-tight truncate">
                                {item.wine.position > 0 ? `Wine ${item.wine.position}: ` : ''}{item.wine.wineName}
                              </h4>
                              {item.wine.producer && (
                                <p className="text-purple-200 text-sm leading-tight truncate">
                                  {item.wine.producer}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.wine.wineType && (
                                <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20 text-xs px-2 py-1">
                                  {item.wine.wineType}
                                </Badge>
                              )}
                              {item.wine.vintage && (
                                <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20 text-xs px-2 py-1">
                                  {item.wine.vintage}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Position Badge & Controls - Better aligned */}
                          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-200
                              ${item.isIncluded 
                                ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white scale-100' 
                                : 'bg-white/20 text-white/60 scale-90'
                              }
                            `}>
                              {index + 1}
                            </div>
                            
                            <Switch
                              checked={item.isIncluded}
                              onCheckedChange={() => handleToggleWine(item.wine.id)}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-pink-500 scale-110"
                            />
                          </div>
                        </div>
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

    {/* Session Flow Preview */}
    {selectedCount > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-card backdrop-blur-xl border border-white/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-white text-lg">Session Flow Preview</CardTitle>
              </div>
              <p className="text-purple-200 text-sm">
                Estimated duration: ~{selectedCount * 15} minutes
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {wineSelections
                .filter(item => item.isIncluded)
                .map((item, index, arr) => (
                  <React.Fragment key={item.wine.id}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex-shrink-0"
                    >
                      <div className="relative group">
                        <div className="w-20 h-24 rounded-lg overflow-hidden shadow-lg ring-2 ring-purple-400/30 bg-gradient-to-br from-purple-600/30 to-pink-600/30">
                          {item.wine.wineImageUrl && item.wine.wineImageUrl.trim() !== '' ? (
                            <img
                              src={item.wine.wineImageUrl}
                              alt={`${item.wine.wineName} wine bottle`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`
                            w-full h-full flex items-center justify-center absolute inset-0
                            ${item.wine.wineImageUrl && item.wine.wineImageUrl.trim() !== '' ? 'hidden' : ''}
                          `}>
                            <Wine className="w-8 h-8 text-white/40" />
                          </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                          {index + 1}
                        </div>
                      </div>
                      <p className="text-white/80 text-xs text-center mt-2 line-clamp-1 max-w-[80px]" title={item.wine.wineName}>
                        {item.wine.position > 0 ? `W${item.wine.position}: ` : ''}{item.wine.wineName}
                      </p>
                    </motion.div>
                    {index < arr.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: index * 0.1 + 0.05 }}
                        className="flex-shrink-0"
                      >
                        <div className="w-8 h-0.5 bg-gradient-to-r from-purple-400/40 to-pink-400/40" />
                      </motion.div>
                    )}
                  </React.Fragment>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )}
    </div>
  );
}