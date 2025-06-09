import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Thermometer, Eye, Palette, Droplets, Wine, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatmapData {
  characteristic: string;
  icon: React.ComponentType<any>;
  sections: {
    intro: number;
    deep_dive: number; 
    ending: number;
  };
  overallScore: number;
  responseCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface TastingProgressHeatmapProps {
  participantId: string;
  sessionId: string;
  className?: string;
}

export function TastingProgressHeatmap({ 
  participantId, 
  sessionId, 
  className 
}: TastingProgressHeatmapProps) {
  // Fetch participant's response analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/participants', participantId, 'analytics'],
    enabled: !!participantId
  });

  // Wine tasting characteristics to track
  const characteristics: Omit<HeatmapData, 'sections' | 'overallScore' | 'responseCount' | 'trend'>[] = [
    { characteristic: 'Visual Assessment', icon: Eye },
    { characteristic: 'Aroma Intensity', icon: Palette },
    { characteristic: 'Flavor Profile', icon: Droplets },
    { characteristic: 'Body & Structure', icon: Wine },
    { characteristic: 'Finish Quality', icon: Thermometer },
    { characteristic: 'Overall Rating', icon: Star }
  ];

  // Process analytics data into heatmap format
  const processedData: HeatmapData[] = characteristics.map(char => {
    const charData = analytics?.characteristics?.[char.characteristic] || {};
    
    return {
      ...char,
      sections: {
        intro: charData.intro?.accuracy || 0,
        deep_dive: charData.deep_dive?.accuracy || 0,
        ending: charData.ending?.accuracy || 0
      },
      overallScore: charData.overall?.accuracy || 0,
      responseCount: charData.overall?.responseCount || 0,
      trend: charData.trend || 'stable'
    };
  });

  // Get intensity color based on score
  const getIntensityColor = (score: number): string => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-green-400';
    if (score >= 55) return 'bg-yellow-400';
    if (score >= 40) return 'bg-orange-400';
    if (score >= 25) return 'bg-red-400';
    return 'bg-gray-300';
  };

  // Get opacity based on response count
  const getOpacity = (responseCount: number): string => {
    if (responseCount >= 5) return 'opacity-100';
    if (responseCount >= 3) return 'opacity-80';
    if (responseCount >= 1) return 'opacity-60';
    return 'opacity-30';
  };

  // Get trend indicator
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-3 h-3 text-emerald-500" />;
      case 'declining':
        return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  if (isLoading) {
    return (
      <div className={cn("bg-white/95 backdrop-blur-xl rounded-2xl p-6 border border-white/20", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white/95 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Tasting Progress Heatmap</h3>
          <p className="text-sm text-gray-600">Your learning progression across wine characteristics</p>
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span>Expert</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span>Learning</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Beginner</span>
          </div>
        </div>
      </div>

      {/* Section Headers */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        <div className="text-sm font-medium text-gray-600">Characteristic</div>
        <div className="text-sm font-medium text-gray-600 text-center">Intro</div>
        <div className="text-sm font-medium text-gray-600 text-center">Deep Dive</div>
        <div className="text-sm font-medium text-gray-600 text-center">Ending</div>
        <div className="text-sm font-medium text-gray-600 text-center">Overall</div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-2">
        {processedData.map((item, rowIndex) => (
          <motion.div
            key={item.characteristic}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rowIndex * 0.1 }}
            className="grid grid-cols-5 gap-3 items-center"
          >
            {/* Characteristic Label */}
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <item.icon className="w-4 h-4 text-gray-500" />
              <span className="truncate">{item.characteristic}</span>
            </div>

            {/* Section Scores */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={cn(
                "h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium cursor-pointer relative",
                getIntensityColor(item.sections.intro),
                getOpacity(item.responseCount)
              )}
              title={`Intro: ${item.sections.intro}% accuracy`}
            >
              {item.sections.intro > 0 ? `${item.sections.intro}%` : '—'}
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              className={cn(
                "h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium cursor-pointer",
                getIntensityColor(item.sections.deep_dive),
                getOpacity(item.responseCount)
              )}
              title={`Deep Dive: ${item.sections.deep_dive}% accuracy`}
            >
              {item.sections.deep_dive > 0 ? `${item.sections.deep_dive}%` : '—'}
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              className={cn(
                "h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium cursor-pointer",
                getIntensityColor(item.sections.ending),
                getOpacity(item.responseCount)
              )}
              title={`Ending: ${item.sections.ending}% accuracy`}
            >
              {item.sections.ending > 0 ? `${item.sections.ending}%` : '—'}
            </motion.div>

            {/* Overall Score with Trend */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={cn(
                "h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold cursor-pointer relative border-2 border-white/30",
                getIntensityColor(item.overallScore),
                getOpacity(item.responseCount)
              )}
              title={`Overall: ${item.overallScore}% accuracy (${item.responseCount} responses)`}
            >
              <span>{item.overallScore > 0 ? `${item.overallScore}%` : '—'}</span>
              <div className="absolute -top-1 -right-1">
                {getTrendIcon(item.trend)}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Statistics Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {Math.round(processedData.reduce((sum, item) => sum + item.overallScore, 0) / processedData.length) || 0}%
            </div>
            <div className="text-xs text-gray-600">Average Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {processedData.reduce((sum, item) => sum + item.responseCount, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Responses</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {processedData.filter(item => item.trend === 'improving').length}
            </div>
            <div className="text-xs text-gray-600">Improving Areas</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}