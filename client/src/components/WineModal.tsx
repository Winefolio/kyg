import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, Save, Plus, Trash2, Wine, GripVertical, 
  Settings, BarChart3, Target, Grape
} from 'lucide-react';

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
}

interface SlideOrderItem {
  id: string;
  position: number;
  type: string;
  sectionType: string;
  title: string;
  description: string;
}

interface SlideTemplate {
  id: string;
  name: string;
  type: string;
  sectionType: string;
  payloadTemplate: any;
  isPublic: boolean;
}

interface WineModalProps {
  mode: 'create' | 'edit' | 'view';
  wine: any | null;
  packageId: string;
  onClose: () => void;
  onSave: (data: WineForm) => void;
}

const wineTypes = [
  { value: 'red', label: 'Red Wine' },
  { value: 'white', label: 'White Wine' },
  { value: 'rose', label: 'Rosé' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'dessert', label: 'Dessert Wine' },
  { value: 'fortified', label: 'Fortified Wine' }
];

const commonGrapes = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah/Shiraz', 'Grenache',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio/Pinot Gris', 'Gewürztraminer'
];

const wineCharacteristics = [
  { name: 'Acidity', category: 'structure', scaleType: 'numeric', min: 1, max: 10 },
  { name: 'Tannins', category: 'structure', scaleType: 'numeric', min: 1, max: 10 },
  { name: 'Body', category: 'structure', scaleType: 'descriptive', options: ['Light', 'Medium', 'Full'] },
  { name: 'Sweetness', category: 'structure', scaleType: 'descriptive', options: ['Bone Dry', 'Dry', 'Off-Dry', 'Medium Sweet', 'Sweet'] },
  { name: 'Fruit Intensity', category: 'flavor', scaleType: 'numeric', min: 1, max: 10 },
  { name: 'Oak Influence', category: 'flavor', scaleType: 'numeric', min: 1, max: 10 },
  { name: 'Mineral Notes', category: 'flavor', scaleType: 'boolean' },
  { name: 'Spice Notes', category: 'flavor', scaleType: 'boolean' }
];

const slideTemplatePresets = [
  {
    name: 'Visual Assessment',
    type: 'question',
    sectionType: 'intro',
    payloadTemplate: {
      question: 'What do you observe about this wine\'s appearance?',
      type: 'multiple_choice',
      options: ['Clear', 'Hazy', 'Brilliant', 'Cloudy'],
      allowMultiple: true
    }
  },
  {
    name: 'Aroma Intensity',
    type: 'question',
    sectionType: 'deep_dive',
    payloadTemplate: {
      question: 'Rate the intensity of the wine\'s aroma',
      type: 'slider',
      min: 1,
      max: 10,
      step: 1
    }
  },
  {
    name: 'Tasting Notes',
    type: 'question',
    sectionType: 'deep_dive',
    payloadTemplate: {
      question: 'Describe the flavors you taste',
      type: 'text_input',
      placeholder: 'e.g., dark fruit, vanilla, spice...'
    }
  }
];

export function WineModal({ mode, wine, packageId, onClose, onSave }: WineModalProps) {
  const [wineForm, setWineForm] = useState<WineForm>({
    wineName: wine?.wineName || '',
    wineDescription: wine?.wineDescription || '',
    wineImageUrl: wine?.wineImageUrl || '',
    position: wine?.position || 1,
    wineType: wine?.wineType || '',
    vintage: wine?.vintage || null,
    region: wine?.region || '',
    producer: wine?.producer || '',
    grapeVarietals: wine?.grapeVarietals || [],
    alcoholContent: wine?.alcoholContent || '',
    expectedCharacteristics: wine?.expectedCharacteristics || {}
  });

  const [slideOrder, setSlideOrder] = useState<SlideOrderItem[]>([]);
  const [availableTemplates] = useState<SlideTemplate[]>(slideTemplatePresets);
  const [activeTab, setActiveTab] = useState<'details' | 'slides' | 'characteristics'>('details');
  const [newGrape, setNewGrape] = useState('');

  const isReadOnly = mode === 'view';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...wineForm,
      packageId
    });
    onClose();
  };

  const addGrapeVarietal = (grape: string) => {
    if (grape && !wineForm.grapeVarietals.includes(grape)) {
      setWineForm(prev => ({
        ...prev,
        grapeVarietals: [...prev.grapeVarietals, grape]
      }));
      setNewGrape('');
    }
  };

  const removeGrapeVarietal = (grape: string) => {
    setWineForm(prev => ({
      ...prev,
      grapeVarietals: prev.grapeVarietals.filter(g => g !== grape)
    }));
  };

  const addCharacteristic = (characteristic: any, value: any) => {
    setWineForm(prev => ({
      ...prev,
      expectedCharacteristics: {
        ...prev.expectedCharacteristics,
        [characteristic.name]: value
      }
    }));
  };

  const removeCharacteristic = (name: string) => {
    const { [name]: removed, ...rest } = wineForm.expectedCharacteristics;
    setWineForm(prev => ({
      ...prev,
      expectedCharacteristics: rest
    }));
  };

  const addSlideFromTemplate = (template: SlideTemplate) => {
    const newSlide: SlideOrderItem = {
      id: `slide_${Date.now()}`,
      position: slideOrder.length + 1,
      type: template.type,
      sectionType: template.sectionType,
      title: template.name,
      description: template.payloadTemplate.question || template.name
    };
    setSlideOrder(prev => [...prev, newSlide]);
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
        className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Wine className="w-6 h-6 text-purple-400" />
            <h2 className="text-white font-semibold text-xl">
              {mode === 'create' ? 'Add Wine' : mode === 'edit' ? 'Edit Wine' : 'Wine Details'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-3 bg-white/10 rounded-lg">
            <TabsTrigger value="details" className="text-white">
              <Settings className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="characteristics" className="text-white">
              <Target className="w-4 h-4 mr-2" />
              Characteristics
            </TabsTrigger>
            <TabsTrigger value="slides" className="text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Question Order
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white">Wine Name</Label>
                <Input
                  value={wineForm.wineName}
                  onChange={(e) => setWineForm(prev => ({ ...prev, wineName: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Enter wine name"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label className="text-white">Wine Type</Label>
                <Select
                  value={wineForm.wineType}
                  onValueChange={(value) => setWineForm(prev => ({ ...prev, wineType: value }))}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select wine type" />
                  </SelectTrigger>
                  <SelectContent>
                    {wineTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Vintage</Label>
                <Input
                  type="number"
                  value={wineForm.vintage || ''}
                  onChange={(e) => setWineForm(prev => ({ ...prev, vintage: e.target.value ? parseInt(e.target.value) : null }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="2020"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label className="text-white">Alcohol Content</Label>
                <Input
                  value={wineForm.alcoholContent}
                  onChange={(e) => setWineForm(prev => ({ ...prev, alcoholContent: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="13.5%"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label className="text-white">Producer</Label>
                <Input
                  value={wineForm.producer}
                  onChange={(e) => setWineForm(prev => ({ ...prev, producer: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Vineyard name"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label className="text-white">Region</Label>
                <Input
                  value={wineForm.region}
                  onChange={(e) => setWineForm(prev => ({ ...prev, region: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Napa Valley, California"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={wineForm.wineDescription}
                onChange={(e) => setWineForm(prev => ({ ...prev, wineDescription: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
                placeholder="Describe the wine..."
                disabled={isReadOnly}
              />
            </div>

            <div>
              <Label className="text-white">Image URL</Label>
              <Input
                value={wineForm.wineImageUrl}
                onChange={(e) => setWineForm(prev => ({ ...prev, wineImageUrl: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
                placeholder="https://example.com/wine-image.jpg"
                disabled={isReadOnly}
              />
            </div>

            {/* Grape Varietals */}
            <div>
              <Label className="text-white">Grape Varietals</Label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {wineForm.grapeVarietals.map((grape, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-purple-500/20 border-purple-400/30 text-purple-200"
                    >
                      <Grape className="w-3 h-3 mr-1" />
                      {grape}
                      {!isReadOnly && (
                        <button
                          onClick={() => removeGrapeVarietal(grape)}
                          className="ml-2 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                
                {!isReadOnly && (
                  <div className="flex space-x-2">
                    <Select onValueChange={addGrapeVarietal}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select grape varietal" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonGrapes
                          .filter(grape => !wineForm.grapeVarietals.includes(grape))
                          .map(grape => (
                            <SelectItem key={grape} value={grape}>
                              {grape}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex space-x-2">
                      <Input
                        value={newGrape}
                        onChange={(e) => setNewGrape(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Custom grape"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addGrapeVarietal(newGrape);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => addGrapeVarietal(newGrape)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="characteristics" className="space-y-6 mt-6">
            <div className="mb-4">
              <h3 className="text-white font-semibold mb-2">Expected Wine Characteristics</h3>
              <p className="text-white/70 text-sm">
                Set expected values for wine characteristics to track user accuracy in tastings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wineCharacteristics.map(characteristic => (
                <Card key={characteristic.name} className="bg-white/5 border-white/10 p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white font-medium">{characteristic.name}</Label>
                      <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                        {characteristic.category}
                      </Badge>
                    </div>

                    {characteristic.scaleType === 'numeric' && (
                      <div>
                        <Input
                          type="number"
                          min={characteristic.min}
                          max={characteristic.max}
                          value={wineForm.expectedCharacteristics[characteristic.name] || ''}
                          onChange={(e) => addCharacteristic(characteristic, parseInt(e.target.value))}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder={`${characteristic.min}-${characteristic.max}`}
                          disabled={isReadOnly}
                        />
                      </div>
                    )}

                    {characteristic.scaleType === 'descriptive' && (
                      <Select
                        value={wineForm.expectedCharacteristics[characteristic.name] || ''}
                        onValueChange={(value) => addCharacteristic(characteristic, value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          {characteristic.options?.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {characteristic.scaleType === 'boolean' && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={wineForm.expectedCharacteristics[characteristic.name] || false}
                          onCheckedChange={(checked) => addCharacteristic(characteristic, checked)}
                          disabled={isReadOnly}
                        />
                        <Label className="text-white/70">Present</Label>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="slides" className="space-y-6 mt-6">
            <div className="mb-4">
              <h3 className="text-white font-semibold mb-2">Question Order</h3>
              <p className="text-white/70 text-sm">
                Customize the order and type of questions for this wine tasting.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Templates */}
              <div>
                <Label className="text-white font-medium mb-3 block">Available Question Templates</Label>
                <div className="space-y-2">
                  {availableTemplates.map(template => (
                    <Card key={template.id} className="bg-white/5 border-white/10 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium text-sm">{template.name}</h4>
                          <p className="text-white/60 text-xs">{template.sectionType}</p>
                        </div>
                        {!isReadOnly && (
                          <Button
                            size="sm"
                            onClick={() => addSlideFromTemplate(template)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Current Slide Order */}
              <div>
                <Label className="text-white font-medium mb-3 block">Question Order</Label>
                <div className="space-y-2">
                  {slideOrder.map((slide, index) => (
                    <Card key={slide.id} className="bg-white/5 border-white/10 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <GripVertical className="w-4 h-4 text-white/40 cursor-grab" />
                          <div>
                            <h4 className="text-white font-medium text-sm">{slide.title}</h4>
                            <p className="text-white/60 text-xs">
                              {slide.sectionType} • Position {slide.position}
                            </p>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSlideOrder(prev => prev.filter(s => s.id !== slide.id))}
                            className="text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                  
                  {slideOrder.length === 0 && (
                    <div className="text-center py-8 text-white/50">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No questions added yet</p>
                      <p className="text-xs">Add templates from the left to customize the tasting experience</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {!isReadOnly && (
          <div className="flex space-x-3 mt-8 pt-6 border-t border-white/20">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-white text-purple-900 hover:bg-white/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Add Wine' : 'Save Changes'}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}