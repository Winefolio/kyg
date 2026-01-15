import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, Upload, Clock } from 'lucide-react';
import type { Slide } from '@shared/schema';

interface InterludeFormData {
  title: string;
  description: string;
  wine_name: string;
  wine_image_url: string;
  duration: number;
  showContinueButton: boolean;
  backgroundImage: string;
}

export function InterludeConfigForm({ 
  slide, 
  onSave 
}: { 
  slide: Slide; 
  onSave: (updatedPayload: any) => void;
}) {
  const isPackageIntro = (slide.payloadJson as any)?.is_package_intro === true;
  const isWineIntro = (slide.payloadJson as any)?.is_wine_intro === true;
  
  const { control, handleSubmit, watch } = useForm<InterludeFormData>({
    defaultValues: {
      title: (slide.payloadJson as any)?.title || '',
      description: (slide.payloadJson as any)?.description || '',
      wine_name: (slide.payloadJson as any)?.wine_name || '',
      wine_image_url: (slide.payloadJson as any)?.wine_image_url || (slide.payloadJson as any)?.wine_image || (slide.payloadJson as any)?.package_image || (slide.payloadJson as any)?.background_image || '',
      duration: (slide.payloadJson as any)?.duration || 30,
      showContinueButton: (slide.payloadJson as any)?.showContinueButton ?? true,
      backgroundImage: (slide.payloadJson as any)?.backgroundImage || (slide.payloadJson as any)?.package_image || (slide.payloadJson as any)?.background_image || '',
    },
  });

  const watchedImageUrl = watch('wine_image_url');

  // Special handling for package intro slides
  if (isPackageIntro) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Package Introduction Configuration
            </CardTitle>
            <p className="text-sm text-purple-200/70">This slide welcomes participants to your wine package</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-white">Package Welcome Title</Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="title" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Welcome to [Package Name]"
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Package Description</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea 
                      id="description" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white resize-none"
                      rows={3}
                      placeholder="Describe the wine tasting experience participants will enjoy..."
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="wine_image_url" className="text-white flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Package Image URL
                </Label>
                <Controller
                  name="wine_image_url"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="wine_image_url" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="https://example.com/package-image.jpg"
                    />
                  )}
                />
                {watchedImageUrl && (
                  <div className="mt-2">
                    <img 
                      src={watchedImageUrl} 
                      alt="Package preview" 
                      className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <Button 
                type="button" 
                onClick={handleSubmit((data) => {
                  // Update package intro slide with proper field mapping
                  const currentPayload = slide.payloadJson as any || {};
                  onSave({
                    ...currentPayload,
                    title: data.title,
                    description: data.description,
                    package_image: data.wine_image_url,
                    background_image: data.wine_image_url,
                    wine_image_url: data.wine_image_url
                  });
                })}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Update Package Introduction
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            {isWineIntro ? 'Wine Introduction Configuration' : 'Interlude Slide Configuration'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title" className="text-white">Slide Title</Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="title" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter slide title..."
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="wine_name" className="text-white">Wine Name</Label>
                <Controller
                  name="wine_name"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="wine_name" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Wine name for this slide..."
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea 
                      id="description" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white resize-none"
                      rows={3}
                      placeholder="Describe what participants will experience..."
                    />
                  )}
                />
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div className="space-y-4">
              <h4 className="text-white font-medium">Media & Visuals</h4>
              
              <div>
                <Label htmlFor="wine_image_url" className="text-white flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Wine Image URL
                </Label>
                <Controller
                  name="wine_image_url"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="wine_image_url" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="https://example.com/wine-image.jpg"
                    />
                  )}
                />
                {watchedImageUrl && (
                  <div className="mt-2">
                    <img 
                      src={watchedImageUrl} 
                      alt="Wine preview" 
                      className="w-20 h-24 object-cover rounded border border-gray-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="backgroundImage" className="text-white">Background Image URL (Optional)</Label>
                <Controller
                  name="backgroundImage"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="backgroundImage" 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Background image URL..."
                    />
                  )}
                />
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div className="space-y-4">
              <h4 className="text-white font-medium">Timing & Behavior</h4>
              
              <div>
                <Label htmlFor="duration" className="text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration (seconds)
                </Label>
                <Controller
                  name="duration"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="duration" 
                      {...field} 
                      type="number"
                      min="5"
                      max="300"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  )}
                />
                <p className="text-xs text-gray-400 mt-1">
                  How long this slide should be displayed (5-300 seconds)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showContinueButton" className="text-white">
                    Show Continue Button
                  </Label>
                  <p className="text-xs text-gray-400">
                    Allow participants to advance manually
                  </p>
                </div>
                <Controller
                  name="showContinueButton"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="showContinueButton"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Update Slide
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}