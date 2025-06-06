import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Clapperboard, HelpCircle, MessageSquare, Video, Music } from 'lucide-react';
import type { Slide, PackageWine } from '@shared/schema';

function SortableSlideItem({ slide, isActive, onClick }: { 
  slide: Slide; 
  isActive: boolean; 
  onClick: () => void; 
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const slideTypeIcons: { [key: string]: React.ReactNode } = {
    interlude: <Clapperboard className="h-4 w-4" />,
    question: <HelpCircle className="h-4 w-4" />,
    video_message: <Video className="h-4 w-4" />,
    audio_message: <Music className="h-4 w-4" />,
    media: <MessageSquare className="h-4 w-4" />,
  };

  const getSlideTitle = (slide: Slide) => {
    const payload = slide.payloadJson as any;
    if (payload?.title) return payload.title;
    if (payload?.question) return payload.question;
    return slide.title || slide.type;
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onClick}>
      <Card className={`mb-2 cursor-pointer transition-all duration-200 ${
        isActive 
          ? 'border-purple-500 bg-purple-500/10 shadow-lg' 
          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 hover:border-gray-600'
      }`}>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-gray-400 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="text-gray-400">
              {slideTypeIcons[slide.type] || <HelpCircle className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-white">
                {getSlideTitle(slide)}
              </div>
              <div className="text-xs text-gray-400 capitalize">
                {slide.type.replace('_', ' ')} • {slide.section_type || 'general'}
              </div>
            </div>
          </div>
          <div className="text-xs text-purple-400 font-medium">
            #{slide.position}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SortableWineSection({ 
  wine, 
  slides, 
  activeSlideId, 
  onSlideClick 
}: { 
  wine: PackageWine; 
  slides: Slide[]; 
  activeSlideId: string | null;
  onSlideClick: (id: string) => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-700">
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {wine.position}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-purple-300">{wine.wineName}</h3>
          <p className="text-xs text-gray-400">{slides.length} slides</p>
        </div>
      </div>
      <div className="space-y-1">
        {slides.map(slide => (
          <SortableSlideItem
            key={slide.id}
            slide={slide}
            isActive={slide.id === activeSlideId}
            onClick={() => onSlideClick(slide.id)}
          />
        ))}
      </div>
    </div>
  );
}