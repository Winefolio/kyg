import { AnimatePresence, motion } from "framer-motion";
import { InterludeConfigForm } from "./InterludeConfigForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, HelpCircle, Clapperboard, Video, Music, Image } from "lucide-react";
import type { Slide } from "@shared/schema";

function QuestionConfigForm({ slide, onSave }: { slide: Slide; onSave: (updatedPayload: any) => void }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-500" />
          Question Slide Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm mb-2">Question configuration coming soon!</p>
          <p className="text-xs">This will include question types, options, timing, and scoring.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoConfigForm({ slide, onSave }: { slide: Slide; onSave: (updatedPayload: any) => void }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-red-500" />
          Video Message Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm mb-2">Video configuration coming soon!</p>
          <p className="text-xs">This will include video upload, playback controls, and captions.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AudioConfigForm({ slide, onSave }: { slide: Slide; onSave: (updatedPayload: any) => void }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-green-500" />
          Audio Message Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm mb-2">Audio configuration coming soon!</p>
          <p className="text-xs">This will include audio upload, playback controls, and transcripts.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MediaConfigForm({ slide, onSave }: { slide: Slide; onSave: (updatedPayload: any) => void }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Image className="w-5 h-5 text-purple-500" />
          Media Slide Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm mb-2">Media configuration coming soon!</p>
          <p className="text-xs">This will include image upload, galleries, and annotations.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SlideConfigPanel({ 
  activeSlide, 
  onSlideUpdate 
}: { 
  activeSlide: Slide | undefined;
  onSlideUpdate: (slideId: string, updatedPayload: any) => void;
}) {
  const getSlideTypeInfo = (type: string) => {
    switch (type) {
      case 'interlude':
        return { icon: Clapperboard, color: 'text-purple-500', name: 'Interlude' };
      case 'question':
        return { icon: HelpCircle, color: 'text-blue-500', name: 'Question' };
      case 'video_message':
        return { icon: Video, color: 'text-red-500', name: 'Video Message' };
      case 'audio_message':
        return { icon: Music, color: 'text-green-500', name: 'Audio Message' };
      case 'media':
        return { icon: Image, color: 'text-purple-500', name: 'Media' };
      default:
        return { icon: Settings, color: 'text-gray-500', name: 'Unknown' };
    }
  };

  return (
    <div className="h-full bg-gray-900/50 overflow-y-auto">
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg text-white">Configuration Panel</h2>
        </div>
        {activeSlide && (
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
              Slide #{activeSlide.position}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {activeSlide.section_type || 'general'}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide?.id || 'empty'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {!activeSlide && (
              <div className="text-center text-gray-400 mt-20">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">No Slide Selected</h3>
                <p className="text-sm">Select a slide from the left panel to configure its properties.</p>
              </div>
            )}

            {activeSlide && (
              <div className="space-y-4">
                {/* Slide Info Header */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const { icon: Icon, color, name } = getSlideTypeInfo(activeSlide.type);
                        return (
                          <>
                            <Icon className={`w-6 h-6 ${color}`} />
                            <div>
                              <h3 className="font-medium text-white">{name} Slide</h3>
                              <p className="text-xs text-gray-400">
                                Configure the properties for this slide
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Forms */}
                {activeSlide.type === 'interlude' && (
                  <InterludeConfigForm 
                    slide={activeSlide} 
                    onSave={(payload) => onSlideUpdate(activeSlide.id, payload)} 
                  />
                )}

                {activeSlide.type === 'question' && (
                  <QuestionConfigForm 
                    slide={activeSlide} 
                    onSave={(payload) => onSlideUpdate(activeSlide.id, payload)} 
                  />
                )}

                {activeSlide.type === 'video_message' && (
                  <VideoConfigForm 
                    slide={activeSlide} 
                    onSave={(payload) => onSlideUpdate(activeSlide.id, payload)} 
                  />
                )}

                {activeSlide.type === 'audio_message' && (
                  <AudioConfigForm 
                    slide={activeSlide} 
                    onSave={(payload) => onSlideUpdate(activeSlide.id, payload)} 
                  />
                )}

                {activeSlide.type === 'media' && (
                  <MediaConfigForm 
                    slide={activeSlide} 
                    onSave={(payload) => onSlideUpdate(activeSlide.id, payload)} 
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}