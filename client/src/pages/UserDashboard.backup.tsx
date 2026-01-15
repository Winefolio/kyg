import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Wine, BarChart3, Clock, Star, MapPin, Filter, 
  ArrowLeft, Search, Calendar, Trophy, TrendingUp,
  Heart, Eye, Share2, Download, MoreHorizontal,
  Globe, Users, Mic, Map
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
  const [activeTab, setActiveTab] = useState<'taste-profile' | 'wine-collection' | 'tastings'>('taste-profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery<UserDashboardData>({
    queryKey: [`/api/dashboard/${email}`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Fetch Supabase data as fallback
  const { data: supabaseData, isLoading: supabaseLoading } = useQuery<any>({
    queryKey: [`/api/supabase-test/user/${email}`],
    enabled: !!email && (dashboardError?.message?.includes('404') || !dashboardData?.user),
  });

  // Use Supabase data if regular dashboard returns no data or 404
  const finalDashboardData = (dashboardData?.user && !dashboardError) ? dashboardData : supabaseData;

  // Fetch wine scores
  const { data: wineScores, isLoading: scoresLoading, error: scoresError } = useQuery<{ scores: WineScore[] }>({
    queryKey: [`/api/dashboard/${email}/scores`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Fetch Supabase wine scores as fallback
  const { data: supabaseWineScores, isLoading: supabaseScoresLoading } = useQuery<{ scores: WineScore[] }>({
    queryKey: [`/api/supabase-test/user/${email}/scores`],
    enabled: !!email && (scoresError?.message?.includes('404') || !wineScores?.scores?.length),
  });

  // Use Supabase wine scores if regular scores returns no data or 404
  const finalWineScores = (wineScores?.scores?.length && !scoresError) ? wineScores : supabaseWineScores;

  // Fetch tasting history
  const { data: tastingHistory, isLoading: historyLoading, error: historyError } = useQuery<{ history: TastingHistory[], total: number }>({
    queryKey: [`/api/dashboard/${email}/history`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Fetch Supabase tasting history as fallback
  const { data: supabaseTastingHistory, isLoading: supabaseHistoryLoading } = useQuery<{ history: TastingHistory[], total: number }>({
    queryKey: [`/api/supabase-test/user/${email}/history`],
    enabled: !!email && (historyError?.message?.includes('404') || !tastingHistory?.history?.length),
  });

  // Use Supabase tasting history if regular history returns no data or 404
  const finalTastingHistory = (tastingHistory?.history?.length && !historyError) ? tastingHistory : supabaseTastingHistory;

  // Fetch taste profile
  const { data: tasteProfile, isLoading: profileLoading, error: profileError } = useQuery<TasteProfile>({
    queryKey: [`/api/dashboard/${email}/taste-profile`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Fetch Supabase taste profile as fallback
  const { data: supabaseTasteProfile, isLoading: supabaseProfileLoading } = useQuery<TasteProfile>({
    queryKey: [`/api/supabase-test/user/${email}/taste-profile`],
    enabled: !!email && (profileError?.message?.includes('404') || !tasteProfile),
  });

  // Use Supabase taste profile if regular profile returns no data or 404
  const finalTasteProfile = (tasteProfile && !profileError) ? tasteProfile : supabaseTasteProfile;

  // Fetch sommelier tips
  const { data: sommelierTips, isLoading: tipsLoading, error: tipsError } = useQuery<SommelierTips>({
    queryKey: [`/api/dashboard/${email}/sommelier-tips`],
    enabled: !!email,
    retry: false, // Don't retry 404 errors
  });

  // Fetch Supabase sommelier tips as fallback
  const { data: supabaseSommelierTips, isLoading: supabaseTipsLoading } = useQuery<SommelierTips>({
    queryKey: [`/api/supabase-test/user/${email}/sommelier-tips`],
    enabled: !!email && (tipsError?.message?.includes('404') || !sommelierTips),
  });

  // Use Supabase sommelier tips if regular tips returns no data or 404
  const finalSommelierTips = (sommelierTips && !tipsError) ? sommelierTips : supabaseSommelierTips;

  if (dashboardLoading || supabaseLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white">Loading your dashboard...</div>
      </div>
    );
  }

  if (!finalDashboardData) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">No Data Found</h1>
          <p className="mb-6">We couldn't find any tasting data for this email address.</p>
          <Button onClick={() => setLocation('/')} variant="outline" className="text-white border-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const filteredWines = finalWineScores?.scores.filter(wine => 
    wine.wineName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredHistory = finalTastingHistory?.history.filter(session =>
    session.packageName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || session.status === filterType)
  ) || [];

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
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">KnowYourGrape</h1>
              <p className="text-purple-200">Premium Wine Experience</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src="" />
              <AvatarFallback className="bg-white/20 text-white">
                {finalDashboardData.user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur-xl border-white/20">
            <TabsTrigger value="taste-profile" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Taste Profile
            </TabsTrigger>
            <TabsTrigger value="wine-collection" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Wine className="w-4 h-4 mr-2" />
              Wine Collection
            </TabsTrigger>
            <TabsTrigger value="tastings" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              Tastings
            </TabsTrigger>
          </TabsList>

          {/* Taste Profile Tab */}
          <TabsContent value="taste-profile" className="space-y-6">
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
                      <span className="text-purple-200">{finalDashboardData.topPreferences?.topRegion?.count || 0} wines</span>
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
                      <span className="text-purple-200">{finalDashboardData.topPreferences?.topGrape?.count || 0} wines</span>
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

            {/* Sommelier Conversation Starters */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Mic className="w-5 h-5" />
                  <span>What to Say to the Sommelier at the Restaurant</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Your Preference Profile</h4>
                  <div className="space-y-2 text-purple-200">
                    <p>{finalSommelierTips?.preferenceProfile}</p>
                    {finalSommelierTips?.redDescription && <p>{finalSommelierTips.redDescription}</p>}
                    {finalSommelierTips?.whiteDescription && <p>{finalSommelierTips.whiteDescription}</p>}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Questions to Ask</h4>
                  <ul className="space-y-2 text-purple-200">
                    {finalSommelierTips?.questions.map((question, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-white mt-1">•</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wine Collection Tab */}
          <TabsContent value="wine-collection" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                <Input
                  placeholder="Search by names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300"
                />
              </div>
              <select className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md">
                <option value="all">All Years</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
              <select className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md">
                <option value="all">All Regions</option>
                <option value="Bordeaux">Bordeaux</option>
                <option value="Burgundy">Burgundy</option>
                <option value="Napa Valley">Napa Valley</option>
              </select>
              <select className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md">
                <option value="all">All Varieties</option>
                <option value="Cabernet Sauvignon">Cabernet Sauvignon</option>
                <option value="Chardonnay">Chardonnay</option>
                <option value="Pinot Noir">Pinot Noir</option>
              </select>
              <div className="flex items-center space-x-2">
                <Label className="text-white text-sm">Min Rating:</Label>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  step="0.1" 
                  defaultValue="1"
                  className="w-20"
                />
              </div>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Clear All Filters
              </Button>
            </div>

            {/* Collection Header */}
            <div className="flex items-center justify-between">
              <p className="text-white">Showing {filteredWines.length} wines</p>
              <div className="flex items-center space-x-4">
                <select className="px-3 py-1 bg-white/10 border border-white/20 text-white rounded text-sm">
                  <option value="rating">Sort by Rating</option>
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
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
          </TabsContent>

          {/* Tastings Tab */}
          <TabsContent value="tastings" className="space-y-6">
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
                        {finalTastingHistory?.history.reduce((sum, h) => sum + h.winesTasted, 0) || 0}
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
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
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
                        <AvatarImage src={session.sommelier.avatar} />
                        <AvatarFallback className="bg-white/20 text-white">
                          {session.sommelier.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">{session.packageName}</h3>
                            <p className="text-sm text-purple-200 mb-1">Led by {session.sommelier.name}, {session.sommelier.title}</p>
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-1 text-purple-200">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(session.startedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-purple-200">
                            <Clock className="w-4 h-4" />
                            <span>{session.duration} min</span>
                          </div>
                          <div className="flex items-center space-x-1 text-purple-200">
                            <MapPin className="w-4 h-4" />
                            <span>{session.location}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-purple-200">
                            <Users className="w-4 h-4" />
                            <span>{session.activeParticipants} people</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-purple-200">Wines Tasted: {session.winesTasted}</span>
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
                          <div className="text-purple-200 text-sm">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 