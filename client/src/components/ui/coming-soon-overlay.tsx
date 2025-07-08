import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  message?: string;
  compact?: boolean;
}

export function ComingSoonOverlay({ children, message = "This feature is coming soon!", compact = false }: ComingSoonOverlayProps) {
  return (
    <div className="relative">
      {children}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center z-10"
      >
        <div className="text-center px-4">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 backdrop-blur-xl border border-purple-400/30">
              <Clock className="text-purple-400" size={20} />
            </div>
            <Badge variant="secondary" className="text-xs px-3 py-1.5 bg-purple-500/20 text-purple-200 border-purple-400/30">
              Coming Soon
            </Badge>
          </div>
          {!compact && (
            <p className="text-white/90 text-sm max-w-xs mx-auto">
              {message}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}