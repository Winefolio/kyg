// client/src/components/WineModal.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Save, Plus, Trash2, Wine, Settings, BarChart3, Target, Grape, Edit3 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

// FORM INTERFACE
interface WineForm {
  wineName: string;
  wineDescription: string;
  wineImageUrl: string;
  position: number;
  wineType: string;
  vintage: number | null;
  region: string;
  producer: string;
  grapeVarietals: string[];
  alcoholContent: string;
  expectedCharacteristics: Record<string, any>;
  discussionQuestions: string[];
}

// PROPS INTERFACE
interface WineModalProps {
  mode: 'create' | 'edit' | 'view';
  wine: any | null;
  packageId: string;
  onClose: () => void;
  onSave: (data: Partial<WineForm>) => void;
}

// CONSTANTS
const wineTypes = [
  { value: 'red', label: 'Red Wine' },
  { value: 'white', label: 'White Wine' },
  { value: 'rose', label: 'Rosé' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'dessert', label: 'Dessert Wine' },
  { value: 'fortified', label: 'Fortified Wine' },
  { value: 'orange', label: 'Orange Wine' }
];

const commonGrapes = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah/Shiraz', 'Grenache',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio/Pinot Gris', 'Gewürztraminer'
];

export function WineModal({ mode, wine, packageId, onClose, onSave }: WineModalProps) {
  // Fetch wine characteristics from API
  const { data: wineCharacteristics, isLoading: characteristicsLoading } = useQuery<any[]>({
    queryKey: ["/api/wine-characteristics"],
    enabled: true,
  });
  const [wineForm, setWineForm] = useState<WineForm>({
    wineName: wine?.wineName || '',
    wineDescription: wine?.wineDescription || '',
    wineImageUrl: wine?.wineImageUrl || '',
    position: wine?.position || 1,
    wineType: wine?.wineType || 'red',
    vintage: wine?.vintage || new Date().getFullYear() - 2,
    region: wine?.region || '',
    producer: wine?.producer || '',
    grapeVarietals: wine?.grapeVarietals || [],
    alcoholContent: wine?.alcoholContent || '13.5%',
    expectedCharacteristics: wine?.expectedCharacteristics || {},
    discussionQuestions: wine?.discussionQuestions || []
  });

  const [activeTab, setActiveTab] = useState<'details' | 'characteristics' | 'discussion'>('details');
  const [newGrape, setNewGrape] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const isReadOnly = mode === 'view';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave: Partial<WineForm> & { packageId?: string } = {
      ...wineForm,
      vintage: wineForm.vintage ? Number(wineForm.vintage) : null,
    };
    if (mode === 'create') {
      dataToSave.packageId = packageId;
    }
    onSave(dataToSave);
  };

  const handleGrapeVarietalChange = (newVarietals: string[]) => {
    setWineForm(prev => ({ ...prev, grapeVarietals: newVarietals }));
  };

  const addGrapeVarietal = (grape: string) => {
    if (grape && !wineForm.grapeVarietals.includes(grape)) {
      handleGrapeVarietalChange([...wineForm.grapeVarietals, grape]);
      setNewGrape('');
    }
  };

  const removeGrapeVarietal = (grapeToRemove: string) => {
    handleGrapeVarietalChange(wineForm.grapeVarietals.filter(g => g !== grapeToRemove));
  };

  const handleCharacteristicChange = (name: string, value: any) => {
    setWineForm(prev => ({
      ...prev,
      expectedCharacteristics: {
        ...prev.expectedCharacteristics,
        [name]: value
      }
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-3xl p-4 sm:p-6 w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-2 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Wine className="w-6 h-6 text-purple-400" />
            <h2 className="text-white font-semibold text-xl">
              {mode === 'create' ? 'Add Wine' : 'Edit Wine'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-3 bg-white/10 rounded-lg">
              <TabsTrigger value="details" className="text-white data-[state=active]:bg-white/20">
                <Settings className="w-4 h-4 mr-2" /> Details
              </TabsTrigger>
              <TabsTrigger value="characteristics" className="text-white data-[state=active]:bg-white/20">
                <Target className="w-4 h-4 mr-2" /> Characteristics
              </TabsTrigger>
              <TabsTrigger value="discussion" className="text-white data-[state=active]:bg-white/20">
                <BarChart3 className="w-4 h-4 mr-2" /> Discussion
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label className="text-white">Wine Name</Label>
                  <Input value={wineForm.wineName} onChange={(e) => setWineForm(prev => ({ ...prev, wineName: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="Enter wine name" disabled={isReadOnly} />
                </div>
                <div>
                  <Label className="text-white">Wine Type</Label>
                  <Select value={wineForm.wineType} onValueChange={(value) => setWineForm(prev => ({ ...prev, wineType: value }))} disabled={isReadOnly}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select wine type" /></SelectTrigger>
                    <SelectContent>{wineTypes.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white">Vintage</Label>
                  <Input type="number" value={wineForm.vintage || ''} onChange={(e) => setWineForm(prev => ({ ...prev, vintage: e.target.value ? parseInt(e.target.value) : null }))} className="bg-white/10 border-white/20 text-white" placeholder="e.g., 2020" disabled={isReadOnly} />
                </div>
                <div>
                  <Label className="text-white">Alcohol Content</Label>
                  <Input value={wineForm.alcoholContent} onChange={(e) => setWineForm(prev => ({ ...prev, alcoholContent: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="e.g., 13.5%" disabled={isReadOnly} />
                </div>
                <div>
                  <Label className="text-white">Producer</Label>
                  <Input value={wineForm.producer} onChange={(e) => setWineForm(prev => ({ ...prev, producer: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="Vineyard name" disabled={isReadOnly} />
                </div>
                <div>
                  <Label className="text-white">Region</Label>
                  <Input value={wineForm.region} onChange={(e) => setWineForm(prev => ({ ...prev, region: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="e.g., Napa Valley, California" disabled={isReadOnly} />
                </div>
              </div>
              <div>
                <Label className="text-white">Description</Label>
                <Textarea value={wineForm.wineDescription} onChange={(e) => setWineForm(prev => ({ ...prev, wineDescription: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="Describe the wine..." disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label className="text-white flex items-center space-x-2">
                  <span>Wine Bottle Image</span>
                  <span className="text-white/50 text-xs font-normal">(will be shown in wine transitions)</span>
                </Label>
                <ImageUpload
                  label=""
                  value={wineForm.wineImageUrl}
                  onChange={(imageUrl) => setWineForm(prev => ({ ...prev, wineImageUrl: imageUrl }))}
                  disabled={isReadOnly}
                  placeholder="Upload a photo of the wine bottle or label"
                />
                <p className="text-white/40 text-xs">This image will appear when transitioning between wines during the tasting session.</p>
              </div>
              <div>
                <Label className="text-white">Grape Varietals</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex flex-wrap gap-2">{wineForm.grapeVarietals.map((grape, index) => <Badge key={index} variant="outline" className="bg-purple-500/20 border-purple-400/30 text-purple-200"><Grape className="w-3 h-3 mr-1" />{grape}<button onClick={() => removeGrapeVarietal(grape)} className="ml-2 hover:text-red-400"><X className="w-3 h-3" /></button></Badge>)}</div>
                  <div className="flex space-x-2">
                    <Select onValueChange={addGrapeVarietal}><SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select common grape" /></SelectTrigger><SelectContent>{commonGrapes.filter(g => !wineForm.grapeVarietals.includes(g)).map(grape => <SelectItem key={grape} value={grape}>{grape}</SelectItem>)}</SelectContent></Select>
                    <Input value={newGrape} onChange={(e) => setNewGrape(e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="Or type custom grape" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGrapeVarietal(newGrape); } }} />
                    <Button type="button" onClick={() => addGrapeVarietal(newGrape)} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="characteristics" className="space-y-6 mt-6">
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Expected Wine Characteristics</h3>
                <p className="text-white/70 text-sm">Set the "expert" answers for this wine. Taster responses will be compared against these values.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characteristicsLoading ? (
                  <p className="text-white/70">Loading...</p>
                ) : (
                  wineCharacteristics?.map((char: any) => (
                    <Card key={char.name} className="bg-white/5 border-white/10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-white font-medium">{char.name}</Label>
                        <Badge variant="outline" className="text-xs border-white/20 text-white/70">{char.category}</Badge>
                      </div>
                      <div className="space-y-3">
                        {char.scaleType === 'numeric' && (
                          <Input 
                            type="number" 
                            min={char.scaleLabels?.min || 1} 
                            max={char.scaleLabels?.max || 10} 
                            value={wineForm.expectedCharacteristics[char.name] || ''} 
                            onChange={(e) => handleCharacteristicChange(char.name, parseInt(e.target.value))} 
                            className="bg-white/10 border-white/20 text-white" 
                            placeholder={`${char.scaleLabels?.min || 1} - ${char.scaleLabels?.max || 10}`} 
                            disabled={isReadOnly} 
                          />
                        )}
                        {char.scaleType === 'descriptive' && (
                          <Select 
                            value={wineForm.expectedCharacteristics[char.name] || ''} 
                            onValueChange={(value) => handleCharacteristicChange(char.name, value)} 
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              {char.scaleLabels?.options?.map((option: string) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {char.scaleType === 'boolean' && (
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={wineForm.expectedCharacteristics[char.name] || false} 
                              onCheckedChange={(checked) => handleCharacteristicChange(char.name, checked)} 
                              disabled={isReadOnly} 
                            />
                            <Label className="text-white/70">Present</Label>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="discussion" className="space-y-6 mt-6">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold mb-2">Discussion Questions</h3>
                  {!isReadOnly && !isAddingQuestion && wineForm.discussionQuestions.length !== 0 && (
                    <Button
                      onClick={() => setIsAddingQuestion(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Button>
                  )}
                </div>
                <p className="text-white/70 text-sm">Add discussion questions for this wine tasting session.</p>
              </div>

              <div className="space-y-4">
                {/* Add New Question Box */}
                {!isReadOnly && isAddingQuestion && (
                  <Card className="bg-white/5 border-white/10 p-4">
                    <div className="flex items-start gap-3">
                      <Textarea
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Type your discussion question here..."
                        className="flex-1 bg-white/10 border-white/20 text-white min-h-[100px]"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => {
                            if (newQuestion.trim()) {
                              setWineForm(prev => ({
                                ...prev,
                                discussionQuestions: [...prev.discussionQuestions, newQuestion.trim()]
                              }));
                              setNewQuestion('');
                              setIsAddingQuestion(false);
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          size="sm"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setNewQuestion('');
                            setIsAddingQuestion(false);
                          }}
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Existing Questions List */}
                {wineForm.discussionQuestions.map((question, index) => (
                  <Card key={index} className="bg-white/5 border-white/10 p-4">
                    {editingQuestionIndex === index ? (
                      <div className="flex items-start gap-3">
                        <Textarea
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          className="flex-1 bg-white/10 border-white/20 text-white min-h-[100px]"
                        />
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => {
                              if (newQuestion.trim()) {
                                setWineForm(prev => ({
                                  ...prev,
                                  discussionQuestions: prev.discussionQuestions.map((q, i) =>
                                    i === index ? newQuestion.trim() : q
                                  )
                                }));
                                setNewQuestion('');
                                setEditingQuestionIndex(null);
                              }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            size="sm"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setNewQuestion('');
                              setEditingQuestionIndex(null);
                            }}
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                            size="sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-white flex-1">{question}</p>
                        {!isReadOnly && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setNewQuestion(question);
                                setEditingQuestionIndex(index);
                              }}
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                              size="sm"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => {
                                setWineForm(prev => ({
                                  ...prev,
                                  discussionQuestions: prev.discussionQuestions.filter((_, i) => i !== index)
                                }));
                              }}
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}

                {/* Empty State */}
                {wineForm.discussionQuestions.length === 0 && !isAddingQuestion && (
                  <div className="text-center py-8">
                    <p className="text-white/50 mb-4">No discussion questions added yet.</p>
                    {!isReadOnly && (
                      <Button
                        onClick={() => setIsAddingQuestion(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add First Question
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {!isReadOnly && (
            <div className="flex space-x-3 mt-8 pt-6 border-t border-white/20">
              <Button onClick={handleSubmit} className="flex-1 bg-white text-purple-900 hover:bg-white/90">
                <Save className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Add Wine' : 'Save Changes'}
              </Button>
              <Button variant="ghost" onClick={onClose} className="flex-1 text-white hover:bg-white/10">Cancel</Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}