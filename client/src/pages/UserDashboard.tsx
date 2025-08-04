import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { 
  Wine, BarChart3, Clock, Star, MapPin, Filter, 
  ArrowLeft, Search, Calendar, Trophy, TrendingUp,
  Heart, Eye, Share2, Download, MoreHorizontal,
  Globe, Users, Mic, Map, Menu, AlertCircle, RefreshCcw, Wifi, WifiOff
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import WineMap from "@/components/WineMap";

interface UserDashboardData {
  user: {
    email: string;
    displayName: string;
    totalSessions: number;
    completedSessions: number;
    totalResponses: number;
    uniqueWinesTasted: number;
  };
  recentSessions: Array<{
    id: string;
    packageId: string;
    status: string;
    startedAt: string;
    completedAt: string;
  }>;
  stats: {
    averageScore: number;
    favoriteWineType: string;
    totalTastings: number;
  };
  topPreferences?: {
    topRegion: { name: string; count: number; percentage: number };
    topGrape: { name: string; count: number; percentage: number };
    averageRating: { score: number; totalWines: number };
  };
}

interface WineScore {
  wineId: string;
  wineName: string;
  wineDescription: string;
  wineImageUrl: string;
  producer?: string;
  region?: string;
  vintage?: number;
  wineType?: string;
  grapeVarietals?: string[];
  alcoholContent?: string;
  scores: number[];
  averageScore: number;
  totalRatings: number;
  isFavorite: boolean;
}

interface TastingHistory {
  sessionId: string;
  packageId: string;
  packageName: string;
  status: string;
  startedAt: string;
  completedAt: string;
  activeParticipants: number;
  sommelier: {
    name: string;
    title: string;
    avatar: string;
  };
  winesTasted: number;
  userScore: number;
  groupScore: number;
  duration: number;
  location: string;
}

interface TasteProfile {
  redWineProfile: {
    stylePreference: string;
    preferredVarieties: Array<{ grape: string; averageScore: number; count: number }>;
    favoriteRegions: Array<{ region: string; count: number }>;
    commonFlavorNotes: string[];
  };
  whiteWineProfile: {
    stylePreference: string;
    preferredVarieties: Array<{ grape: string; averageScore: number; count: number }>;
    favoriteRegions: Array<{ region: string; count: number }>;
    commonFlavorNotes: string[];
  };
  overallStats: {
    totalWines: number;
    averageRating: number;
    topRegion: { name: string; count: number; percentage: number };
    topGrape: { name: string; count: number; percentage: number };
  };
}

interface SommelierTips {
  preferenceProfile: string;
  redDescription: string;
  whiteDescription: string;
  questions: string[];
  priceGuidance: string;
}

export default function UserDashboard() {
  const { email } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'collection' | 'tastings'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [wineSearchTerm, setWineSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Wine collection filters
  const [selectedVintage, setSelectedVintage] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedVariety, setSelectedVariety] = useState('all');
  const [minRating, setMinRating] = useState(1);
  const [sortBy, setSortBy] = useState('rating');

  // Error Component for consistent error display
  const ErrorCard = ({ 
    title, 
    message, 
    error, 
    onRetry, 
    actionLabel = "Try Again",
    icon: Icon = AlertCircle 
  }: { 
    title: string; 
    message: string; 
    error?: any; 
    onRetry?: () => void; 
    actionLabel?: string;
    icon?: any;
  }) => (
    <Card className="bg-red-50 border-red-200">
      <CardContent className="p-6 text-center">
        <Icon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
        <p className="text-red-600 mb-4">{message}</p>
        {error && (
          <details className="text-sm text-red-500 mb-4">
            <summary className="cursor-pointer hover:text-red-700">Technical Details</summary>
            <p className="mt-2 p-2 bg-red-100 rounded text-left">
              {error?.message || JSON.stringify(error, null, 2)}
            </p>
          </details>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="text-red-600 border-red-300 hover:bg-red-100">
            <RefreshCcw className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  // Empty State Component
  const EmptyState = ({ 
    title, 
    message, 
    action,
    icon: Icon = Wine 
  }: { 
    title: string; 
    message: string; 
    action?: { label: string; onClick: () => void };
    icon?: any;
  }) => (
    <Card className="bg-purple-50 border-purple-200">
      <CardContent className="p-8 text-center">
        <Icon className="w-16 h-16 text-purple-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-purple-800 mb-2">{title}</h3>
        <p className="text-purple-600 mb-4">{message}</p>
        {action && (
          <Button onClick={action.onClick} className="bg-purple-600 hover:bg-purple-700">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  // Network status checking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show offline message if no internet connection
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <WifiOff className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">You're Offline</h2>
            <p className="text-white/80 mb-6">
              Please check your internet connection and try again.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="text-white border-white hover:bg-white/10"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery<UserDashboardData>({
    queryKey: [`/api/dashboard/${email}`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Use dashboard data directly
  const finalDashboardData = dashboardData;

  // Fetch wine scores
  const { data: wineScores, isLoading: scoresLoading, error: scoresError, refetch: refetchScores } = useQuery<{ scores: WineScore[] }>({
    queryKey: [`/api/dashboard/${email}/scores`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Use wine scores directly
  const finalWineScores = wineScores;

  // Fetch tasting history
  const { data: tastingHistory, isLoading: historyLoading, error: historyError, refetch: refetchHistory } = useQuery<{ history: TastingHistory[], total: number }>({
    queryKey: [`/api/dashboard/${email}/history`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Use tasting history directly
  const finalTastingHistory = tastingHistory;

  // Fetch taste profile
  const { data: tasteProfile, isLoading: profileLoading, error: profileError } = useQuery<TasteProfile>({
    queryKey: [`/api/dashboard/${email}/taste-profile`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Use taste profile directly
  const finalTasteProfile = tasteProfile;

  // Fetch sommelier tips
  const { data: sommelierTips, isLoading: tipsLoading, error: tipsError, refetch: refetchTips } = useQuery<SommelierTips>({
    queryKey: [`/api/dashboard/${email}/sommelier-tips`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Use sommelier tips directly
  const finalSommelierTips = sommelierTips;

  // Comprehensive error checking
  const hasServerError = dashboardError && !dashboardError.message?.includes('404');
  const hasNetworkError = dashboardError?.message?.includes('Network') || 
                          scoresError?.message?.includes('Network') ||
                          historyError?.message?.includes('Network') ||
                          profileError?.message?.includes('Network') ||
                          tipsError?.message?.includes('Network');

  // Show loading state
  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white">
          <LoadingOverlay
              isVisible={dashboardLoading}
              message="Loading your wine dashboard..."
          />
        </div>
      </div>
    );
  }

  // Show network error
  if (hasNetworkError) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <WifiOff className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
            <p className="text-white/80 mb-6">
              Unable to connect to our servers. Please check your internet connection.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="text-white border-white hover:bg-white/10"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show server error
  if (hasServerError) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Server Error</h2>
            <p className="text-white/80 mb-4">
              We're experiencing technical difficulties. Our team has been notified.
            </p>
            <details className="text-sm text-white/60 mb-6 text-left">
              <summary className="cursor-pointer hover:text-white/80 text-center">Technical Details</summary>
              <p className="mt-2 p-3 bg-white/10 rounded">
                {dashboardError?.message || "Unknown server error"}
              </p>
            </details>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="text-white border-white hover:bg-white/10 w-full"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => setLocation('/')} 
                variant="ghost" 
                className="text-white/60 hover:text-white hover:bg-white/10 w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no data found
  if (!finalDashboardData) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Wine className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">No Tasting Data Found</h2>
            <p className="text-white/80 mb-6">
              We couldn't find any wine tasting data for <strong>{email}</strong>. 
              Have you participated in any wine tasting sessions yet?
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => setLocation('/join')} 
                className="bg-white/20 hover:bg-white/30 text-white w-full"
              >
                Join a Tasting Session
              </Button>
              <Button 
                onClick={() => setLocation('/')} 
                variant="ghost" 
                className="text-white/60 hover:text-white hover:bg-white/10 w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper functions to get unique filter values
  const getUniqueVintages = (wines: WineScore[]) => {
    const vintages = wines.map(wine => wine.vintage).filter(Boolean);
    return Array.from(new Set(vintages)).sort((a, b) => (b || 0) - (a || 0));
  };

  const getUniqueRegions = (wines: WineScore[]) => {
    const regions = wines.map(wine => wine.region).filter(Boolean);
    return Array.from(new Set(regions)).sort();
  };

  const getUniqueVarieties = (wines: WineScore[]) => {
    const varieties = wines.flatMap(wine => wine.grapeVarietals || []);
    return Array.from(new Set(varieties)).sort();
  };

  // Apply all filters and sorting
  const filteredWines = finalWineScores?.scores.filter(wine => {
    // Search term filter
    const matchesSearch = wine.wineName.toLowerCase().includes(wineSearchTerm.toLowerCase()) ||
      (wine.producer && wine.producer.toLowerCase().includes(wineSearchTerm.toLowerCase()));
    
    // Vintage filter
    const matchesVintage = selectedVintage === 'all' || wine.vintage === parseInt(selectedVintage);
    
    // Region filter
    const matchesRegion = selectedRegion === 'all' || wine.region === selectedRegion;
    
    // Variety filter
    const matchesVariety = selectedVariety === 'all' || 
      (wine.grapeVarietals && wine.grapeVarietals.includes(selectedVariety));
    
    // Rating filter - ensure we're comparing numbers
    const matchesRating = wine.averageScore >= Number(minRating);
    
    return matchesSearch && matchesVintage && matchesRegion && matchesVariety && matchesRating;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.wineName.localeCompare(b.wineName);
      case 'rating':
        return b.averageScore - a.averageScore;
      case 'vintage':
        return (b.vintage || 0) - (a.vintage || 0);
      default:
        return b.averageScore - a.averageScore;
    }
  }) || [];

  const filteredHistory = finalTastingHistory?.history.filter(session =>
    session.packageName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || session.status === filterType)
  ) || [];

  // Get unique values for dropdowns
  const availableWines = finalWineScores?.scores || [];
  const uniqueVintages = getUniqueVintages(availableWines);
  const uniqueRegions = getUniqueRegions(availableWines);
  const uniqueVarieties = getUniqueVarieties(availableWines);

  // Clear all filters function
  const clearAllFilters = () => {
    setWineSearchTerm('');
    setSelectedVintage('all');
    setSelectedRegion('all');
    setSelectedVariety('all');
    setMinRating(1);
    setSortBy('rating');
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">KnowYourGrape</h1>
              <p className="text-purple-200">Premium Wine Experience</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Hamburger menu for mobile */}
            <Button
                variant="ghost"
                className="text-white hover:bg-white/10 md:hidden"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </Button>

            {/* Inline actions for desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-white/20 text-white">
                  {finalDashboardData.user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="absolute right-4 top-16 z-50 flex flex-col bg-white/90 rounded-lg shadow-lg p-4 space-y-3 md:hidden">
                  <Button variant="ghost" className="text-purple-900 hover:bg-purple-100">
                    <Search className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" className="text-purple-900 hover:bg-purple-100">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-purple-200 text-purple-900">
                      {finalDashboardData.user.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
            )}
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur-xl border-white/20">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Taste Profile
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Wine className="w-4 h-4 mr-2" />
              Wine Collection
            </TabsTrigger>
            <TabsTrigger value="tastings" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              Tastings
            </TabsTrigger>
          </TabsList>

          {/* Taste Profile Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Network status warning */}
            {!isOnline && (
              <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4 text-orange-200">
                <div className="flex items-center">
                  <WifiOff className="w-5 h-5 mr-2" />
                  You're currently offline. Data may not be up to date.
                </div>
              </div>
            )}

            {/* Error states for overview data */}
            {(scoresError || historyError || tipsError) && (
              <ErrorCard
                title="Unable to Load Dashboard Data"
                message={
                  !isOnline 
                    ? "You're offline. Please check your internet connection and try again."
                    : "There was an error loading your dashboard data. Please try again."
                }
                onRetry={() => {
                  refetchScores();
                  refetchHistory();
                  refetchTips();
                }}
              />
            )}

            {/* Loading overlay - show loading state for all data except sommelier tips */}
            {(scoresLoading || historyLoading || dashboardLoading || profileLoading) && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-300 mx-auto mb-4"></div>
                  <p className="text-purple-200">Loading your taste profile...</p>
                </div>
              </div>
            )}

            {/* Only show content when main data is loaded */}
            {!scoresLoading && !historyLoading && !dashboardLoading && !profileLoading && !(scoresError || historyError || tipsError) && (
              <>
            {/* Stats Overview - Only visible on Taste Profile tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/20 rounded-full">
                      <Wine className="w-6 h-6 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200">Total Wines</p>
                      <p className="text-2xl font-bold text-white">{finalDashboardData.user.uniqueWinesTasted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-yellow-500/20 rounded-full">
                      <Star className="w-6 h-6 text-yellow-300" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200">Avg Rating</p>
                      <p className="text-2xl font-bold text-white">{finalDashboardData.stats.averageScore?.toFixed(1) || "0.0"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <Globe className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200">Regions</p>
                      <p className="text-2xl font-bold text-white">{finalDashboardData.user.uniqueWinesTasted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-red-500/20 rounded-full">
                      <Heart className="w-6 h-6 text-red-300" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200">Favorites</p>
                      <p className="text-2xl font-bold text-white">{Math.floor(finalDashboardData.user.uniqueWinesTasted * 0.3)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Preferences - Only visible on Taste Profile tab */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <MapPin className="w-5 h-5 text-purple-300" />
                    <div>
                      <p className="text-sm text-purple-200">Top Region</p>
                      <p className="text-lg font-semibold text-white">{finalDashboardData.topPreferences?.topRegion?.name || "None"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-200">Based on {finalDashboardData.topPreferences?.topRegion?.count || 0} wines</span>
                      <span className="text-white">{finalDashboardData.topPreferences?.topRegion?.percentage?.toFixed(0) || 0}%</span>
                    </div>
                    <Progress value={finalDashboardData.topPreferences?.topRegion?.percentage || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Wine className="w-5 h-5 text-purple-300" />
                    <div>
                      <p className="text-sm text-purple-200">Top Grape</p>
                      <p className="text-lg font-semibold text-white">{finalDashboardData.topPreferences?.topGrape?.name || "None"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-200">Based on {finalDashboardData.topPreferences?.topGrape?.count || 0} wines</span>
                      <span className="text-white">{finalDashboardData.topPreferences?.topGrape?.percentage?.toFixed(0) || 0}%</span>
                    </div>
                    <Progress value={finalDashboardData.topPreferences?.topGrape?.percentage || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Star className="w-5 h-5 text-purple-300" />
                    <div>
                      <p className="text-sm text-purple-200">Average Rating</p>
                      <p className="text-lg font-semibold text-white">{finalDashboardData.topPreferences?.averageRating?.score?.toFixed(1) || finalDashboardData.stats.averageScore?.toFixed(1) || "0.0"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-200">Based on {finalDashboardData.topPreferences?.averageRating?.totalWines || finalDashboardData.user.uniqueWinesTasted} wines</span>
                    </div>
                    <Progress value={((finalDashboardData.topPreferences?.averageRating?.score || finalDashboardData.stats.averageScore || 0) / 5) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Red Wine Profile */}
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Red Wine Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Body Preference</span>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-200">
                      {finalTasteProfile?.redWineProfile.stylePreference || "Medium-bodied"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Preferred Varieties</h4>
                    {finalTasteProfile?.redWineProfile.preferredVarieties.map((variety, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-purple-200">{variety.grape}</span>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-white">{variety.averageScore.toFixed(1)} ({variety.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Favorite Red Regions</h4>
                    {finalTasteProfile?.redWineProfile.favoriteRegions.map((region, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-purple-200">{region.region}</span>
                        <span className="text-white">{region.count} wines</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Common Flavor Notes</h4>
                    <div className="flex flex-wrap gap-2">
                      {finalTasteProfile?.redWineProfile.commonFlavorNotes.map((note, index) => (
                        <Badge key={index} variant="outline" className="text-purple-200 border-purple-300">
                          {note}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* White Wine Profile */}
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">White Wine Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Style Preference</span>
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-200">
                      {finalTasteProfile?.whiteWineProfile.stylePreference || "Rich & Full"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Preferred Varieties</h4>
                    {finalTasteProfile?.whiteWineProfile.preferredVarieties.map((variety, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-purple-200">{variety.grape}</span>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-white">{variety.averageScore.toFixed(1)} ({variety.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Favorite White Regions</h4>
                    {finalTasteProfile?.whiteWineProfile.favoriteRegions.map((region, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-purple-200">{region.region}</span>
                        <span className="text-white">{region.count} wines</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Common Flavor Notes</h4>
                    <div className="flex flex-wrap gap-2">
                      {finalTasteProfile?.whiteWineProfile.commonFlavorNotes.map((note, index) => (
                        <Badge key={index} variant="outline" className="text-yellow-200 border-yellow-300">
                          {note}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
              </>
            )}

            {/* Sommelier Conversation Starters - Always visible with independent loading */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Mic className="w-5 h-5" />
                  <span>What to Say to the Sommelier at the Restaurant</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {tipsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingOverlay
                      isVisible={true}
                      message="Loading sommelier tips..."
                    />
                  </div>
                ) : finalSommelierTips ? (
                  <>
                    <div className="space-y-4">
                      <h4 className="text-white font-medium">Your Preference Profile</h4>
                      <div className="space-y-2 text-purple-200">
                        <p>{finalSommelierTips.preferenceProfile}</p>
                        {finalSommelierTips.redDescription && <p>{finalSommelierTips.redDescription}</p>}
                        {finalSommelierTips.whiteDescription && <p>{finalSommelierTips.whiteDescription}</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-white font-medium">Questions to Ask</h4>
                      <ul className="space-y-2 text-purple-200">
                        {finalSommelierTips.questions.map((question, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-white mt-1">•</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-purple-200">
                    <p>No sommelier tips available at the moment.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wine Collection Tab */}
          <TabsContent value="collection" className="space-y-6">
            {/* Error handling for wine scores */}
            {scoresError && !finalWineScores && (
              <ErrorCard
                title="Unable to Load Wine Collection"
                message="We couldn't load your wine collection data. This might be due to a temporary server issue."
                error={scoresError}
                onRetry={() => window.location.reload()}
                actionLabel="Refresh Page"
              />
            )}

            {/* Loading state for wine scores */}
            {scoresLoading && (
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-8 text-center">
                  <LoadingOverlay
                    isVisible={true}
                    message="Loading your wine collection..."
                  />
                </CardContent>
              </Card>
            )}

            {/* Wine collection content */}
            {finalWineScores && finalWineScores.scores && finalWineScores.scores.length > 0 ? (
              <>
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                <Input
                  placeholder="Search by names..."
                  value={wineSearchTerm}
                  onChange={(e) => setWineSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300"
                />
              </div>
              <select 
                value={selectedVintage}
                onChange={(e) => setSelectedVintage(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md"
              >
                <option className="bg-black" value="all">All Years</option>
                {uniqueVintages.map(vintage => (
                  <option key={vintage} className="bg-black" value={vintage?.toString()}>
                    {vintage}
                  </option>
                ))}
              </select>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md"
              >
                <option className="bg-black" value="all">All Regions</option>
                {uniqueRegions.map(region => (
                  <option key={region} className="bg-black" value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <select 
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md"
              >
                <option className="bg-black" value="all">All Varieties</option>
                {uniqueVarieties.map(variety => (
                  <option key={variety} className="bg-black" value={variety}>
                    {variety}
                  </option>
                ))}
              </select>
              <Button 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </Button>
            </div>

            {/* Collection Header */}
            <div className="flex items-center justify-between">
              <p className="text-white">Showing {filteredWines.length} wines</p>
              <div className="flex items-center space-x-4">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1 bg-white/10 border border-white/20 text-white rounded text-sm"
                >
                  <option className="bg-black" value="rating">Sort by Rating</option>
                  <option className="bg-black" value="name">Sort by Name</option>
                  <option className="bg-black" value="vintage">Sort by Vintage</option>
                </select>
                <div className="flex border border-white/20 rounded">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="text-white"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="text-white"
                  >
                    <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                      <div className="bg-current w-1 h-1"></div>
                      <div className="bg-current w-1 h-1"></div>
                      <div className="bg-current w-1 h-1"></div>
                      <div className="bg-current w-1 h-1"></div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* Wine Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWines.map((wine) => (
                  <Card key={wine.wineId} className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-colors">
                    <CardContent className="p-6">
                      <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-white/5">
                        {wine.wineImageUrl ? (
                          <img 
                            src={wine.wineImageUrl} 
                            alt={wine.wineName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Wine className="w-12 h-12 text-purple-300" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{wine.wineName}</h3>
                      {wine.vintage && wine.region && (
                        <p className="text-sm text-purple-200 mb-2">{wine.vintage} {wine.region}</p>
                      )}
                      {wine.grapeVarietals && (
                        <p className="text-sm text-purple-200 mb-2">{wine.grapeVarietals.join(', ')}</p>
                      )}
                      <div className="flex items-center space-x-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < Math.floor(wine.averageScore) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} 
                          />
                        ))}
                        <span className="text-white ml-1">{wine.averageScore.toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-purple-200 mb-4 line-clamp-2">{wine.wineDescription}</p>
                      <div className="flex items-center justify-between">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`${wine.isFavorite ? 'text-red-400' : 'text-purple-300'} hover:bg-purple-500/20`}
                        >
                          <Heart className={`w-4 h-4 ${wine.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWines.map((wine) => (
                  <Card key={wine.wineId} className="bg-white/10 backdrop-blur-xl border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          {wine.wineImageUrl ? (
                            <img 
                              src={wine.wineImageUrl} 
                              alt={wine.wineName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Wine className="w-6 h-6 text-purple-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-1">{wine.wineName}</h3>
                          {wine.vintage && wine.region && (
                            <p className="text-sm text-purple-200 mb-1">{wine.vintage} {wine.region}</p>
                          )}
                          {wine.grapeVarietals && (
                            <p className="text-sm text-purple-200 mb-2">{wine.grapeVarietals.join(', ')}</p>
                          )}
                          <p className="text-sm text-purple-200 line-clamp-2">{wine.wineDescription}</p>
                        </div>
                        <div className="flex items-center space-x-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < Math.floor(wine.averageScore) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} 
                            />
                          ))}
                          <span className="text-white ml-1">{wine.averageScore.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className={`${wine.isFavorite ? 'text-red-400' : 'text-purple-300'} hover:bg-purple-500/20`}
                          >
                            <Heart className={`w-4 h-4 ${wine.isFavorite ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredWines.length === 0 && (
              <div className="text-center py-12">
                <Wine className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                <p className="text-purple-200">No wines found matching your search.</p>
              </div>
            )}

            {/* Wine Origins Map */}
            {filteredWines.length > 0 && (
              <WineMap wines={filteredWines} />
            )}
              </>
            ) : (
              /* Empty state for wine collection */
              !scoresLoading && (
                <EmptyState
                  title="No Wines in Your Collection"
                  message="Start tasting wines to build your personal collection and track your preferences."
                  action={{ 
                    label: "Join a Tasting Session", 
                    onClick: () => setLocation('/join') 
                  }}
                />
              )
            )}
          </TabsContent>

          {/* Tastings Tab */}
          <TabsContent value="tastings" className="space-y-6">
            {/* Error handling for tasting history */}
            {historyError && !finalTastingHistory && (
              <ErrorCard
                title="Unable to Load Tasting History"
                message="We couldn't load your tasting history. This might be due to a temporary server issue."
                error={historyError}
                onRetry={() => window.location.reload()}
                actionLabel="Refresh Page"
              />
            )}

            {/* Loading state for tasting history */}
            {historyLoading && (
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-8 text-center">
                  <LoadingOverlay
                    isVisible={true}
                    message="Loading your tasting history..."
                  />
                </CardContent>
              </Card>
            )}

            {/* Tasting history content */}
            {finalTastingHistory && finalTastingHistory.history && finalTastingHistory.history.length > 0 ? (
              <>
                {/* Tastings Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/20 rounded-full">
                      <Users className="w-6 h-6 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200">Total Tastings</p>
                      <p className="text-2xl font-bold text-white">{finalTastingHistory?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <Trophy className="w-6 h-6 text-green-300" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200">Completed</p>
                      <p className="text-2xl font-bold text-white">{finalTastingHistory?.history.filter(h => h.status === 'completed').length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <Wine className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200">Wines Tasted</p>
                      <p className="text-2xl font-bold text-white">
                        {finalDashboardData?.user?.uniqueWinesTasted|| 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                <Input
                  placeholder="Search tastings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md"
              >
                <option className="bg-black" value="all">All Status</option>
                <option className="bg-black" value="waiting">Waiting</option>
                <option className="bg-black" value="active">Active</option>
                <option className="bg-black" value="completed">Completed</option>
              </select>
            </div>

            {/* Tasting History */}
            <div className="space-y-4">
              {filteredHistory.map((session) => (
                <Card 
                  key={session.sessionId} 
                  className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/dashboard/${email}/tasting/${session.sessionId}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-white/20 text-white">
                          <Wine className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">{session.packageName}</h3>
                            <p className="text-sm text-purple-200 mb-1">Wine Tasting Experience</p>
                            <p className="text-sm text-purple-200 line-clamp-2">
                              An intimate journey through exceptional wines. Taste {session.winesTasted} carefully selected wines with expert guidance.
                            </p>
                          </div>
                          <Badge 
                            variant={session.status === 'completed' ? 'default' : 'secondary'}
                            className={session.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}
                          >
                            {session.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-1 text-purple-200">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(session.startedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-purple-200">
                            <Clock className="w-4 h-4" />
                            <span>{session.duration} min</span>
                          </div>
                          <div className="flex items-center space-x-1 text-purple-200">
                            <Users className="w-4 h-4" />
                            <span>{session.activeParticipants} people</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-center justify-between mt-4 pt-4 border-t border-white/10">
                          <div className="flex items-center space-x-4 text-sm">
                            {/*<span className="text-purple-200">Wines Tasted: {session.winesTasted}</span>*/}
                            <div className="flex items-center space-x-1">
                              <span className="text-purple-200">Your Score:</span>
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-white">{session.userScore}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-purple-200">Group Avg:</span>
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-white">{session.groupScore}</span>
                            </div>
                          </div>
                          <div className="text-purple-200 text-sm mt-2 md:mt-0">
                            Click to view details →
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredHistory.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                <p className="text-purple-200">No tasting sessions found.</p>
              </div>
            )}
              </>
            ) : (
              /* Empty state for tasting history */
              !historyLoading && (
                <EmptyState
                  title="No Tasting History"
                  message="You haven't participated in any wine tasting sessions yet. Join a session to start building your tasting history."
                  action={{ 
                    label: "Join a Tasting Session", 
                    onClick: () => setLocation('/join') 
                  }}
                />
              )
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 