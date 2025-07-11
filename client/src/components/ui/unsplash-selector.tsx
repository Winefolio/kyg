import React, { useState, useEffect } from 'react';
import { Search, Download, Heart, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { unsplash, type UnsplashPhoto, wineSearchSuggestions } from '@/lib/unsplash';

interface UnsplashSelectorProps {
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function UnsplashSelector({ onSelect, onClose, isOpen }: UnsplashSelectorProps) {
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [searchQuery, setSearchQuery] = useState('wine');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null);

  // Load initial wine photos
  useEffect(() => {
    if (isOpen) {
      loadWinePhotos();
    }
  }, [isOpen]);

  const loadWinePhotos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const winePhotos = await unsplash.getWinePhotos();
      setPhotos(winePhotos);
    } catch (err) {
      setError('Failed to load wine photos. Showing demo photos instead.');
      console.error('Unsplash error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadWinePhotos();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const searchResult = await unsplash.searchPhotos(query, 1, 20);
      setPhotos(searchResult.results);
    } catch (err) {
      setError('Failed to search photos. Please try again.');
      console.error('Unsplash search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handlePhotoSelect = async (photo: UnsplashPhoto) => {
    setSelectedPhoto(photo);
    
    // Trigger download as required by Unsplash API terms
    try {
      await unsplash.triggerDownload(photo.id);
    } catch (err) {
      console.warn('Failed to trigger download:', err);
    }
    
    // Use the regular size for package covers (better quality than small, smaller than full)
    onSelect(photo.urls.regular);
    onClose();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Select Cover Image</h2>
              <p className="text-slate-400 mt-1">Choose from beautiful wine and food photos</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search for wine, vineyard, food..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </form>

          {/* Search Suggestions */}
          <div className="mb-6">
            <p className="text-slate-400 text-sm mb-2">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {wineSearchSuggestions.slice(0, 8).map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="secondary"
                  className="cursor-pointer hover:bg-purple-600 hover:text-white bg-slate-700 text-slate-300"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-300 p-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Loading beautiful photos...</div>
            </div>
          )}

          {/* Photos Grid */}
          {!isLoading && photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden"
                  onClick={() => handlePhotoSelect(photo)}
                >
                  <img
                    src={photo.urls.small}
                    alt={photo.alt_description || photo.description || 'Wine photo'}
                    className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Photo Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between text-white text-xs">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{photo.user.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>{photo.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && photos.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">No photos found for "{searchQuery}"</p>
              <Button
                variant="outline"
                onClick={() => handleSuggestionClick('wine')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Try searching for "wine"
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-700">
            <p className="text-slate-500 text-xs text-center">
              Photos provided by{' '}
              <a
                href="https://unsplash.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white underline"
              >
                Unsplash
              </a>
              {' • '}
              <span className="text-slate-600">
                Demo photos included - no API key required
              </span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}