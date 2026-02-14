import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Wine } from "lucide-react";
import { SommelierChatSheet } from "./SommelierChatSheet";
import { useHaptics } from "@/hooks/useHaptics";

// Routes where the FAB should be hidden (active experiences)
const HIDDEN_ROUTE_PATTERNS = [
  /^\/tasting\/[^/]+\/[^/]+$/, // /tasting/:sessionId/:participantId
  /^\/tasting\/new$/,
  /^\/solo\/new$/,
  /^\/completion\//,
  /^\/host\//,
];

// Routes where the FAB should be shown
const SHOWN_ROUTE_PATTERNS = [
  /^\/home/,
  /^\/journeys/,
  /^\/sommelier$/,
  /^\/editor\//,
  /^\/dashboard\//,
];

export function SommelierFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { triggerHaptic } = useHaptics();

  // Determine visibility
  const isHidden = HIDDEN_ROUTE_PATTERNS.some((p) => p.test(location));
  const isShown = SHOWN_ROUTE_PATTERNS.some((p) => p.test(location));

  if (isHidden || !isShown) return null;

  // If chat sheet is open, hide FAB
  if (isOpen) {
    return <SommelierChatSheet open={isOpen} onOpenChange={setIsOpen} />;
  }

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          onClick={() => {
            triggerHaptic("selection");
            setIsOpen(true);
          }}
          className="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-900/40 flex items-center justify-center active:shadow-md"
          aria-label="Open sommelier chat"
        >
          <Wine className="w-6 h-6 text-white" />
        </motion.button>
      </AnimatePresence>

      <SommelierChatSheet open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
