import { useLocation } from "wouter";
import { Home, Plus, BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";

type TabId = 'home' | 'taste' | 'journal' | 'profile';

interface BottomNavProps {
  activeTab: TabId;
  onTasteClick?: () => void;
  userEmail?: string; // Sprint 4.1: Direct link to unified dashboard
}

const getTabPath = (id: TabId, userEmail?: string): string => {
  if (id === 'profile' && userEmail) {
    return `/dashboard/${encodeURIComponent(userEmail)}`;
  }
  const paths: Record<TabId, string> = {
    home: '/solo',
    taste: '/solo/taste',
    journal: '/solo/journal',
    profile: '/solo/profile', // Fallback - redirects to dashboard
  };
  return paths[id];
};

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'taste', label: 'Taste', icon: Plus },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function BottomNav({ activeTab, onTasteClick, userEmail }: BottomNavProps) {
  const [, setLocation] = useLocation();

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.id === 'taste' && onTasteClick) {
      onTasteClick();
    } else {
      setLocation(getTabPath(tab.id, userEmail));
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xl border-t border-white/10 px-4 py-2 pb-safe z-50">
      <div className="container mx-auto flex justify-around items-center max-w-lg">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isTaste = tab.id === 'taste';
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center min-w-[64px] min-h-[44px] ${
                isTaste ? '' : 'py-2'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {isTaste ? (
                // Special floating button for Taste
                <>
                  <div className="w-14 h-14 -mt-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs mt-1 text-white/80">{tab.label}</span>
                </>
              ) : (
                // Regular tab
                <>
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-purple-400' : 'text-white/50'
                    }`}
                  />
                  <span
                    className={`text-xs mt-1 transition-colors ${
                      isActive ? 'text-purple-400' : 'text-white/50'
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
