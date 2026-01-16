/**
 * Journey Admin Page
 * Sprint 5: CRUD interface for managing journeys and chapters
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft, Plus, Edit, Trash2, ChevronDown, ChevronRight,
  Book, GraduationCap, Save, X
} from 'lucide-react';
import type { Journey, Chapter } from '@shared/schema';

type JourneyWithChapters = Journey & { chapters?: Chapter[] };

interface JourneyFormData {
  title: string;
  description: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  wineType: 'red' | 'white' | 'sparkling' | 'mixed';
  coverImageUrl?: string;
  estimatedDuration?: string;
  isPublished: boolean;
}

interface ChapterFormData {
  title: string;
  description: string;
  chapterNumber: number;
  wineRequirements: {
    anyWine?: boolean;
    description?: string;
    criteria?: Array<{
      field: string;
      operator: 'in' | 'contains' | 'equals';
      value: string | string[];
    }>;
  };
  learningObjectives?: string[];
  shoppingTips?: string;
  askFor?: string;
}

export default function JourneyAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [expandedJourneys, setExpandedJourneys] = useState<Set<number>>(new Set());
  const [editingJourney, setEditingJourney] = useState<number | null>(null);
  const [editingChapter, setEditingChapter] = useState<{ journeyId: number; chapterId: number | null } | null>(null);
  const [journeyForm, setJourneyForm] = useState<JourneyFormData>({
    title: '',
    description: '',
    difficultyLevel: 'beginner',
    wineType: 'red',
    isPublished: false
  });
  const [chapterForm, setChapterForm] = useState<ChapterFormData>({
    title: '',
    description: '',
    chapterNumber: 1,
    wineRequirements: { anyWine: true },
    learningObjectives: [],
    shoppingTips: '',
    askFor: ''
  });

  // Fetch all journeys
  const { data: journeysData, isLoading } = useQuery<{ journeys: JourneyWithChapters[] }>({
    queryKey: ['/api/admin/journeys'],
  });

  // Mutations
  const createJourneyMutation = useMutation({
    mutationFn: async (data: JourneyFormData) => {
      const res = await apiRequest('POST', '/api/admin/journeys', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/journeys'] });
      toast({ title: 'Journey created successfully' });
      resetJourneyForm();
    },
    onError: () => toast({ title: 'Failed to create journey', variant: 'destructive' })
  });

  const updateJourneyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<JourneyFormData> }) => {
      const res = await apiRequest('PUT', `/api/admin/journeys/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/journeys'] });
      toast({ title: 'Journey updated successfully' });
      setEditingJourney(null);
    },
    onError: () => toast({ title: 'Failed to update journey', variant: 'destructive' })
  });

  const deleteJourneyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/journeys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/journeys'] });
      toast({ title: 'Journey deleted successfully' });
    },
    onError: () => toast({ title: 'Failed to delete journey', variant: 'destructive' })
  });

  const createChapterMutation = useMutation({
    mutationFn: async ({ journeyId, data }: { journeyId: number; data: ChapterFormData }) => {
      const res = await apiRequest('POST', `/api/admin/journeys/${journeyId}/chapters`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/journeys'] });
      toast({ title: 'Chapter created successfully' });
      setEditingChapter(null);
      resetChapterForm();
    },
    onError: () => toast({ title: 'Failed to create chapter', variant: 'destructive' })
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ChapterFormData> }) => {
      const res = await apiRequest('PUT', `/api/admin/chapters/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/journeys'] });
      toast({ title: 'Chapter updated successfully' });
      setEditingChapter(null);
    },
    onError: () => toast({ title: 'Failed to update chapter', variant: 'destructive' })
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/chapters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/journeys'] });
      toast({ title: 'Chapter deleted successfully' });
    },
    onError: () => toast({ title: 'Failed to delete chapter', variant: 'destructive' })
  });

  // Helpers
  const resetJourneyForm = () => {
    setJourneyForm({
      title: '',
      description: '',
      difficultyLevel: 'beginner',
      wineType: 'red',
      isPublished: false
    });
    setEditingJourney(null);
  };

  const resetChapterForm = () => {
    setChapterForm({
      title: '',
      description: '',
      chapterNumber: 1,
      wineRequirements: { anyWine: true },
      learningObjectives: [],
      shoppingTips: '',
      askFor: ''
    });
  };

  const toggleJourneyExpanded = (journeyId: number) => {
    const newExpanded = new Set(expandedJourneys);
    if (newExpanded.has(journeyId)) {
      newExpanded.delete(journeyId);
    } else {
      newExpanded.add(journeyId);
    }
    setExpandedJourneys(newExpanded);
  };

  const startEditJourney = (journey: Journey) => {
    setJourneyForm({
      title: journey.title,
      description: journey.description || '',
      difficultyLevel: journey.difficultyLevel as JourneyFormData['difficultyLevel'],
      wineType: (journey.wineType || 'red') as JourneyFormData['wineType'],
      coverImageUrl: journey.coverImageUrl || undefined,
      estimatedDuration: journey.estimatedDuration || undefined,
      isPublished: journey.isPublished
    });
    setEditingJourney(journey.id);
  };

  const startEditChapter = (journeyId: number, chapter?: Chapter) => {
    if (chapter) {
      setChapterForm({
        title: chapter.title,
        description: chapter.description || '',
        chapterNumber: chapter.chapterNumber,
        wineRequirements: (chapter.wineRequirements as ChapterFormData['wineRequirements']) || { anyWine: true },
        learningObjectives: (chapter.learningObjectives as string[]) || [],
        shoppingTips: chapter.shoppingTips || '',
        askFor: chapter.askFor || ''
      });
      setEditingChapter({ journeyId, chapterId: chapter.id });
    } else {
      // Find the next chapter number
      const journey = journeysData?.journeys.find(j => j.id === journeyId);
      const nextNumber = (journey?.chapters?.length || 0) + 1;
      resetChapterForm();
      setChapterForm(prev => ({ ...prev, chapterNumber: nextNumber }));
      setEditingChapter({ journeyId, chapterId: null });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
      </div>
    );
  }

  const journeys = journeysData?.journeys || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-black">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sommelier">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Book className="w-5 h-5" />
              Journey Management
            </h1>
          </div>
          <Badge variant="outline" className="border-white/30 text-white/70">{journeys.length} journeys</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Create New Journey Form */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Plus className="w-5 h-5" />
              {editingJourney ? 'Edit Journey' : 'Create New Journey'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingJourney) {
                  updateJourneyMutation.mutate({ id: editingJourney, data: journeyForm });
                } else {
                  createJourneyMutation.mutate(journeyForm);
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white/80">Title</Label>
                <Input
                  id="title"
                  value={journeyForm.title}
                  onChange={(e) => setJourneyForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., French Red Wines"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficultyLevel" className="text-white/80">Difficulty</Label>
                <Select
                  value={journeyForm.difficultyLevel}
                  onValueChange={(v) => setJourneyForm(prev => ({ ...prev, difficultyLevel: v as JourneyFormData['difficultyLevel'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wineType" className="text-white/80">Wine Type</Label>
                <Select
                  value={journeyForm.wineType}
                  onValueChange={(v) => setJourneyForm(prev => ({ ...prev, wineType: v as JourneyFormData['wineType'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="sparkling">Sparkling</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-white/80">Estimated Duration</Label>
                <Input
                  id="duration"
                  value={journeyForm.estimatedDuration || ''}
                  onChange={(e) => setJourneyForm(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                  placeholder="e.g., 4-6 weeks"
                />
              </div>

              <div className="col-span-full space-y-2">
                <Label htmlFor="description" className="text-white/80">Description</Label>
                <Textarea
                  id="description"
                  value={journeyForm.description}
                  onChange={(e) => setJourneyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what users will learn..."
                  rows={3}
                />
              </div>

              <div className="col-span-full flex items-center gap-2">
                <Switch
                  id="published"
                  checked={journeyForm.isPublished}
                  onCheckedChange={(checked) => setJourneyForm(prev => ({ ...prev, isPublished: checked }))}
                />
                <Label htmlFor="published" className="text-white/80">Published (visible to users)</Label>
              </div>

              <div className="col-span-full flex gap-2">
                <Button
                  type="submit"
                  disabled={createJourneyMutation.isPending || updateJourneyMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingJourney ? 'Update Journey' : 'Create Journey'}
                </Button>
                {editingJourney && (
                  <Button type="button" variant="outline" onClick={resetJourneyForm}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Journeys List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Existing Journeys</h2>

          {journeys.length === 0 ? (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="py-8 text-center text-white/50">
                No journeys yet. Create your first journey above!
              </CardContent>
            </Card>
          ) : (
            journeys.map((journey) => (
              <Card key={journey.id} className="overflow-hidden bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => toggleJourneyExpanded(journey.id)}
                    >
                      {expandedJourneys.has(journey.id) ? (
                        <ChevronDown className="w-5 h-5 text-white/70" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-white/70" />
                      )}
                      <div>
                        <CardTitle className="text-lg text-white">{journey.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={journey.isPublished ? 'default' : 'secondary'}>
                            {journey.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="outline" className="border-white/30 text-white/70">{journey.difficultyLevel}</Badge>
                          <Badge variant="outline" className="border-white/30 text-white/70">{journey.wineType || 'mixed'}</Badge>
                          <span className="text-sm text-white/50">
                            {journey.totalChapters} chapters
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditJourney(journey)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this journey and all its chapters?')) {
                            deleteJourneyMutation.mutate(journey.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedJourneys.has(journey.id) && (
                  <CardContent className="pt-0">
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium flex items-center gap-2 text-white">
                          <GraduationCap className="w-4 h-4" />
                          Chapters
                        </h3>
                        <Button
                          size="sm"
                          onClick={() => startEditChapter(journey.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Chapter
                        </Button>
                      </div>

                      {/* Chapter Editor Form */}
                      {editingChapter?.journeyId === journey.id && (
                        <Card className="mb-4 bg-purple-900/20 border-purple-500/20">
                          <CardContent className="pt-4">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (editingChapter.chapterId) {
                                  updateChapterMutation.mutate({
                                    id: editingChapter.chapterId,
                                    data: chapterForm
                                  });
                                } else {
                                  createChapterMutation.mutate({
                                    journeyId: journey.id,
                                    data: chapterForm
                                  });
                                }
                              }}
                              className="space-y-4"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-white/80">Chapter Title</Label>
                                  <Input
                                    value={chapterForm.title}
                                    onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g., Introduction to Burgundy"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-white/80">Chapter Number</Label>
                                  <Input
                                    type="number"
                                    value={chapterForm.chapterNumber}
                                    onChange={(e) => setChapterForm(prev => ({ ...prev, chapterNumber: parseInt(e.target.value) }))}
                                    min={1}
                                    required
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-white/80">Description</Label>
                                <Textarea
                                  value={chapterForm.description}
                                  onChange={(e) => setChapterForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="What will the user learn in this chapter?"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={chapterForm.wineRequirements.anyWine || false}
                                    onCheckedChange={(checked) => setChapterForm(prev => ({
                                      ...prev,
                                      wineRequirements: { ...prev.wineRequirements, anyWine: checked }
                                    }))}
                                  />
                                  <Label className="text-white/80">Accept any wine (no validation)</Label>
                                </div>
                              </div>

                              {!chapterForm.wineRequirements.anyWine && (
                                <div className="space-y-2">
                                  <Label className="text-white/80">Wine Requirements Description</Label>
                                  <Input
                                    value={chapterForm.wineRequirements.description || ''}
                                    onChange={(e) => setChapterForm(prev => ({
                                      ...prev,
                                      wineRequirements: { ...prev.wineRequirements, description: e.target.value }
                                    }))}
                                    placeholder="e.g., A red Burgundy (Pinot Noir from Burgundy)"
                                  />
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label className="text-white/80">Shopping Tips</Label>
                                <Textarea
                                  value={chapterForm.shoppingTips || ''}
                                  onChange={(e) => setChapterForm(prev => ({ ...prev, shoppingTips: e.target.value }))}
                                  placeholder="Tips for finding this wine at a store..."
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-white/80">Ask For (what to tell staff)</Label>
                                <Input
                                  value={chapterForm.askFor || ''}
                                  onChange={(e) => setChapterForm(prev => ({ ...prev, askFor: e.target.value }))}
                                  placeholder="e.g., 'A village-level Burgundy under $40'"
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  disabled={createChapterMutation.isPending || updateChapterMutation.isPending}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  {editingChapter.chapterId ? 'Update Chapter' : 'Create Chapter'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingChapter(null);
                                    resetChapterForm();
                                  }}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      )}

                      {/* Chapters List */}
                      {journey.chapters && journey.chapters.length > 0 ? (
                        <div className="space-y-2">
                          {journey.chapters
                            .sort((a, b) => a.chapterNumber - b.chapterNumber)
                            .map((chapter) => (
                              <div
                                key={chapter.id}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                              >
                                <div>
                                  <div className="font-medium text-white">
                                    Chapter {chapter.chapterNumber}: {chapter.title}
                                  </div>
                                  {chapter.description && (
                                    <p className="text-sm text-white/50 line-clamp-1">
                                      {chapter.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditChapter(journey.id, chapter)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this chapter?')) {
                                        deleteChapterMutation.mutate(chapter.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-white/50 text-center py-4">
                          No chapters yet. Add your first chapter!
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
