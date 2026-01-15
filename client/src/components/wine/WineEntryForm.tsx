import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wine, ArrowRight, X } from "lucide-react";

interface WineInfo {
  wineName: string;
  wineRegion?: string;
  wineVintage?: number;
  grapeVariety?: string;
  wineType?: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified' | 'orange';
  photoUrl?: string;
}

interface WineEntryFormProps {
  onSubmit: (wine: WineInfo) => void;
  onCancel: () => void;
  initialData?: Partial<WineInfo>;
}

const WINE_TYPES = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rosé', label: 'Rosé' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'orange', label: 'Orange' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'fortified', label: 'Fortified' }
];

const COMMON_REGIONS = [
  'Bordeaux, France',
  'Burgundy, France',
  'Champagne, France',
  'Rhône Valley, France',
  'Napa Valley, California',
  'Sonoma, California',
  'Willamette Valley, Oregon',
  'Tuscany, Italy',
  'Piedmont, Italy',
  'Rioja, Spain',
  'Ribera del Duero, Spain',
  'Barossa Valley, Australia',
  'Marlborough, New Zealand',
  'Mendoza, Argentina',
  'Stellenbosch, South Africa'
];

const COMMON_GRAPES = [
  'Cabernet Sauvignon',
  'Merlot',
  'Pinot Noir',
  'Syrah/Shiraz',
  'Zinfandel',
  'Malbec',
  'Sangiovese',
  'Tempranillo',
  'Chardonnay',
  'Sauvignon Blanc',
  'Riesling',
  'Pinot Grigio',
  'Gewürztraminer',
  'Viognier',
  'Blend'
];

export default function WineEntryForm({ onSubmit, onCancel, initialData }: WineEntryFormProps) {
  const [wineName, setWineName] = useState(initialData?.wineName || '');
  const [wineRegion, setWineRegion] = useState(initialData?.wineRegion || '');
  const [wineVintage, setWineVintage] = useState<string>(
    initialData?.wineVintage?.toString() || ''
  );
  const [grapeVariety, setGrapeVariety] = useState(initialData?.grapeVariety || '');
  const [wineType, setWineType] = useState<string>(initialData?.wineType || '');

  const currentYear = new Date().getFullYear();
  const vintageYears = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!wineName.trim()) {
      return;
    }

    onSubmit({
      wineName: wineName.trim(),
      wineRegion: wineRegion.trim() || undefined,
      wineVintage: wineVintage ? parseInt(wineVintage) : undefined,
      grapeVariety: grapeVariety.trim() || undefined,
      wineType: wineType as WineInfo['wineType'] || undefined
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Wine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">New Tasting</h2>
                <p className="text-white/60 text-sm">Enter wine details</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Wine Name (Required) */}
            <div className="space-y-2">
              <Label htmlFor="wineName" className="text-white/80">
                Wine Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="wineName"
                value={wineName}
                onChange={(e) => setWineName(e.target.value)}
                placeholder="e.g., Chateau Margaux 2015"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
              />
            </div>

            {/* Wine Type */}
            <div className="space-y-2">
              <Label htmlFor="wineType" className="text-white/80">
                Wine Type
              </Label>
              <Select value={wineType} onValueChange={setWineType}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WINE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label htmlFor="wineRegion" className="text-white/80">
                Region
              </Label>
              <Input
                id="wineRegion"
                value={wineRegion}
                onChange={(e) => setWineRegion(e.target.value)}
                placeholder="e.g., Bordeaux, France"
                list="regions"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
              />
              <datalist id="regions">
                {COMMON_REGIONS.map((region) => (
                  <option key={region} value={region} />
                ))}
              </datalist>
            </div>

            {/* Vintage */}
            <div className="space-y-2">
              <Label htmlFor="wineVintage" className="text-white/80">
                Vintage
              </Label>
              <Select value={wineVintage} onValueChange={setWineVintage}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="nv">Non-Vintage</SelectItem>
                  {vintageYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grape Variety */}
            <div className="space-y-2">
              <Label htmlFor="grapeVariety" className="text-white/80">
                Grape Variety
              </Label>
              <Input
                id="grapeVariety"
                value={grapeVariety}
                onChange={(e) => setGrapeVariety(e.target.value)}
                placeholder="e.g., Cabernet Sauvignon"
                list="grapes"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
              />
              <datalist id="grapes">
                {COMMON_GRAPES.map((grape) => (
                  <option key={grape} value={grape} />
                ))}
              </datalist>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={!wineName.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Tasting
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>

        {/* Helper text */}
        <p className="text-center text-white/40 text-sm mt-4">
          Only the wine name is required. Add more details for better recommendations.
        </p>
      </motion.div>
    </div>
  );
}
