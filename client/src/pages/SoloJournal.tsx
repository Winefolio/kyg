import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/solo/BottomNav";
import {
  Wine,
  Search,
  Filter,
  Calendar,
  Star,
  ChevronRight,
  Loader2,
  X,
  MapPin,
  Grape
} from "lucide-react";
import type { Tasting, User as UserType } from "@shared/schema";

type WineTypeFilter = 'all' | 'red' | 'white' | 'rosé' | 'sparkling' | 'other';
type SortOption = 'recent' | 'rating' | 'name';

export default function SoloJournal() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WineTypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Get auth state
  const { data: authData, isLoading: authLoading } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me', null);
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false
  });

  // Get user's tastings - fetch more for full journal
  const { data: tastingsData, isLoading: tastingsLoading } = useQuery<{
    tastings: Tasting[];
    total: number;
  }>({
    queryKey: ['/api/solo/tastings', { limit: 50 }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/solo/tastings?limit=50', null);
      return response.json();
    },
    enabled: !!authData?.user
  });

  // Redirect to login if not authenticated
  if (!authLoading && !authData?.user) {
    setLocation('/solo/login');
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const allTastings = tastingsData?.tastings || [];

  // Filter tastings
  const filteredTastings = allTastings.filter((tasting) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = tasting.wineName.toLowerCase().includes(query);
      const matchesRegion = tasting.wineRegion?.toLowerCase().includes(query);
      const matchesGrape = tasting.grapeVariety?.toLowerCase().includes(query);
      if (!matchesName && !matchesRegion && !matchesGrape) {
        return false;
      }
    }

    // Type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'other') {
        const mainTypes = ['red', 'white', 'rosé', 'sparkling'];
        if (tasting.wineType && mainTypes.includes(tasting.wineType)) {
          return false;
        }
      } else if (tasting.wineType !== typeFilter) {
        return false;
      }
    }

    return true;
  });

  // Sort tastings
  const sortedTastings = [...filteredTastings].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        const ratingA = (a.responses as any)?.overall?.rating || 0;
        const ratingB = (b.responses as any)?.overall?.rating || 0;
        return ratingB - ratingA;
      case 'name':
        return a.wineName.localeCompare(b.wineName);
      case 'recent':
      default:
        return new Date(b.tastedAt).getTime() - new Date(a.tastedAt).getTime();
    }
  });

  const wineTypes: { id: WineTypeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'red', label: 'Red' },
    { id: 'white', label: 'White' },
    { id: 'rosé', label: 'Rosé' },
    { id: 'sparkling', label: 'Sparkling' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wine className="w-6 h-6 text-purple-400" />
              <span className="text-white font-semibold">Wine Journal</span>
            </div>
            <span className="text-white/50 text-sm">{allTastings.length} wines</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wines, regions, grapes..."
            className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-10 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter/Sort Row */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              showFilters || typeFilter !== 'all'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-white/10 text-white/70 border border-white/20'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            {typeFilter !== 'all' && (
              <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded">1</span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50"
          >
            <option value="recent">Most Recent</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-white/50 text-xs mb-2">Wine Type</p>
              <div className="flex flex-wrap gap-2">
                {wineTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setTypeFilter(type.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      typeFilter === type.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Results Count */}
        {(searchQuery || typeFilter !== 'all') && (
          <p className="text-white/50 text-sm mb-3">
            {sortedTastings.length} result{sortedTastings.length !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        )}

        {/* Tastings List */}
        {tastingsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : sortedTastings.length > 0 ? (
          <div className="space-y-3">
            {sortedTastings.map((tasting, index) => (
              <motion.button
                key={tasting.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setLocation(`/solo/tasting/${tasting.id}`)}
                className="w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 flex items-start justify-between hover:bg-white/15 transition-colors text-left"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    tasting.wineType === 'red' ? 'bg-red-500/20' :
                    tasting.wineType === 'white' ? 'bg-yellow-500/20' :
                    tasting.wineType === 'rosé' ? 'bg-pink-500/20' :
                    tasting.wineType === 'sparkling' ? 'bg-blue-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <Wine className={`w-6 h-6 ${
                      tasting.wineType === 'red' ? 'text-red-400' :
                      tasting.wineType === 'white' ? 'text-yellow-400' :
                      tasting.wineType === 'rosé' ? 'text-pink-400' :
                      tasting.wineType === 'sparkling' ? 'text-blue-400' :
                      'text-purple-400'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate">{tasting.wineName}</h3>
                    {tasting.wineRegion && (
                      <div className="flex items-center gap-1.5 text-white/50 text-sm mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{tasting.wineRegion}</span>
                      </div>
                    )}
                    {tasting.grapeVariety && (
                      <div className="flex items-center gap-1.5 text-white/50 text-sm mt-0.5">
                        <Grape className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{tasting.grapeVariety}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {tasting.wineType && (
                        <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-xs capitalize">
                          {tasting.wineType}
                        </span>
                      )}
                      {tasting.wineVintage && (
                        <span className="text-white/40 text-xs">{tasting.wineVintage}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <div className="text-right">
                    {(tasting.responses as any)?.overall?.rating && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm">{(tasting.responses as any).overall.rating}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(tasting.tastedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
              </motion.button>
            ))}
          </div>
        ) : allTastings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
              <Wine className="w-10 h-10 text-purple-400/50" />
            </div>
            <h3 className="text-white font-semibold mb-2">No Tastings Yet</h3>
            <p className="text-white/50 text-sm mb-6">Start building your wine journal</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-white/80 font-medium mb-2">No Results</h3>
            <p className="text-white/50 text-sm">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className="mt-4 text-purple-400 text-sm hover:text-purple-300"
            >
              Clear all filters
            </button>
          </div>
        )}
      </main>

      <BottomNav activeTab="journal" userEmail={authData?.user?.email} />
    </div>
  );
}
