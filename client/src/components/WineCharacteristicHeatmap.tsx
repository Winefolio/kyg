import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WineCharacteristicHeatmapProps {
  wines: Array<{
    id: string;
    wineName: string;
    expectedCharacteristics: Record<string, any>;
    wineType: string;
  }>;
  className?: string;
}

export function WineCharacteristicHeatmap({ wines, className = "" }: WineCharacteristicHeatmapProps) {
  // Fetch wine characteristics from API
  const { data: wineCharacteristics, isLoading } = useQuery<any[]>({
    queryKey: ["/api/wine-characteristics"],
    enabled: true,
  });

  const heatmapData = useMemo(() => {
    if (!wineCharacteristics || !wines.length) return null;

    // Group characteristics by category
    const categorizedCharacteristics = wineCharacteristics.reduce((acc, char) => {
      if (!acc[char.category]) {
        acc[char.category] = [];
      }
      acc[char.category].push(char);
      return acc;
    }, {} as Record<string, any[]>);

    return { categorizedCharacteristics, characteristics: wineCharacteristics };
  }, [wineCharacteristics, wines]);

  const getCharacteristicValue = (wine: any, characteristic: any) => {
    const value = wine.expectedCharacteristics?.[characteristic.name];
    if (value === undefined || value === null) return null;

    if (characteristic.scaleType === 'numeric') {
      const min = characteristic.scaleLabels?.min || 1;
      const max = characteristic.scaleLabels?.max || 10;
      return Math.min(Math.max(value, min), max);
    }
    
    if (characteristic.scaleType === 'boolean') {
      return value ? 1 : 0;
    }
    
    if (characteristic.scaleType === 'descriptive') {
      const options = characteristic.scaleLabels?.options || [];
      const index = options.indexOf(value);
      return index >= 0 ? (index + 1) / options.length : null;
    }
    
    return null;
  };

  const getIntensityColor = (value: number | null, maxValue: number = 10) => {
    if (value === null) return 'bg-gray-600/30';
    
    const intensity = value / maxValue;
    if (intensity <= 0.2) return 'bg-blue-500/30';
    if (intensity <= 0.4) return 'bg-green-500/40';
    if (intensity <= 0.6) return 'bg-yellow-500/50';
    if (intensity <= 0.8) return 'bg-orange-500/60';
    return 'bg-red-500/70';
  };

  const getDisplayValue = (wine: any, characteristic: any) => {
    const value = wine.expectedCharacteristics?.[characteristic.name];
    if (value === undefined || value === null) return '—';

    if (characteristic.scaleType === 'numeric') {
      return value.toString();
    }
    
    if (characteristic.scaleType === 'boolean') {
      return value ? '✓' : '✗';
    }
    
    if (characteristic.scaleType === 'descriptive') {
      return value;
    }
    
    return '—';
  };

  const getWineTypeColor = (wineType: string) => {
    switch (wineType?.toLowerCase()) {
      case 'red': return 'bg-red-600';
      case 'white': return 'bg-yellow-300';
      case 'rosé': case 'rose': return 'bg-pink-400';
      case 'sparkling': return 'bg-blue-300';
      case 'dessert': return 'bg-purple-400';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card className={`bg-white/5 border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white">Wine Characteristics Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70 text-center py-8">Loading characteristics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!heatmapData || !wines.length) {
    return (
      <Card className={`bg-white/5 border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white">Wine Characteristics Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70 text-center py-8">No wine data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`bg-white/5 border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Wine Characteristics Heatmap
            <Badge variant="outline" className="text-white/70 border-white/20">
              {wines.length} wines
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(heatmapData.categorizedCharacteristics).map(([category, characteristics]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-white font-medium text-sm uppercase tracking-wide border-b border-white/10 pb-2">
                  {category}
                </h3>
                
                <div className="overflow-x-auto">
                  <div className="min-w-fit">
                    {/* Header row with characteristic names */}
                    <div className="flex mb-2">
                      <div className="w-40 flex-shrink-0"></div>
                      {characteristics.map((char) => (
                        <div key={char.id} className="w-20 flex-shrink-0 px-1">
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="text-white/70 text-xs truncate transform -rotate-45 origin-left h-8 w-16">
                                {char.name}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">{char.name}</div>
                                {char.description && <div className="text-gray-300">{char.description}</div>}
                                <div className="text-gray-400 text-xs mt-1">
                                  Type: {char.scaleType}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>

                    {/* Data rows */}
                    {wines.map((wine) => (
                      <div key={wine.id} className="flex items-center mb-1">
                        <div className="w-40 flex-shrink-0 pr-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getWineTypeColor(wine.wineType)}`}></div>
                            <span className="text-white text-sm truncate">{wine.wineName}</span>
                          </div>
                        </div>
                        
                        {characteristics.map((char) => {
                          const rawValue = getCharacteristicValue(wine, char);
                          const maxValue = char.scaleType === 'numeric' ? (char.scaleLabels?.max || 10) : 1;
                          const displayValue = getDisplayValue(wine, char);
                          
                          return (
                            <div key={char.id} className="w-20 flex-shrink-0 px-1">
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className={`
                                    h-8 w-full rounded flex items-center justify-center text-xs font-medium
                                    ${getIntensityColor(rawValue, maxValue)}
                                    ${rawValue !== null ? 'text-white' : 'text-white/50'}
                                    hover:scale-105 transition-transform cursor-pointer
                                    border border-white/10
                                  `}>
                                    {displayValue}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm">
                                    <div className="font-medium">{wine.wineName}</div>
                                    <div className="text-gray-300">{char.name}: {displayValue}</div>
                                    {char.scaleType === 'numeric' && rawValue !== null && (
                                      <div className="text-gray-400 text-xs">
                                        Scale: {char.scaleLabels?.min || 1} - {char.scaleLabels?.max || 10}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-white/70">Intensity:</span>
                <div className="flex space-x-1">
                  <div className="w-4 h-4 bg-blue-500/30 rounded"></div>
                  <div className="w-4 h-4 bg-green-500/40 rounded"></div>
                  <div className="w-4 h-4 bg-yellow-500/50 rounded"></div>
                  <div className="w-4 h-4 bg-orange-500/60 rounded"></div>
                  <div className="w-4 h-4 bg-red-500/70 rounded"></div>
                </div>
                <span className="text-white/50">Low → High</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-white/70">Wine Types:</span>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-white/50 text-xs">Red</span>
                  <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
                  <span className="text-white/50 text-xs">White</span>
                  <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                  <span className="text-white/50 text-xs">Rosé</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}