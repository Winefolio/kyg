import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Wine, Users, BarChart3 } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";

type TabKey = "solo" | "group" | "dashboard";

interface Tab {
  key: TabKey;
  label: string;
  icon: typeof Wine;
  path: string;
}

const TAB_CONFIG: Tab[] = [
  { key: "solo", label: "Solo", icon: Wine, path: "/home" },
  { key: "group", label: "Group", icon: Users, path: "/home/group" },
  { key: "dashboard", label: "Dashboard", icon: BarChart3, path: "/home/dashboard" },
];

interface BottomNavProps {
  activeTab: TabKey;
}

export function BottomNav({ activeTab }: BottomNavProps) {
  const [, setLocation] = useLocation();
  const { triggerHaptic } = useHaptics();

  const handleTabPress = (tab: Tab) => {
    if (tab.key !== activeTab) {
      triggerHaptic("selection");
      setLocation(tab.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {TAB_CONFIG.map((tab) => (
            <TabButton
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              onPress={() => handleTabPress(tab)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ tab, isActive, onPress }: TabButtonProps) {
  const Icon = tab.icon;

  return (
    <button
      onClick={onPress}
      className={`flex flex-col items-center py-3 px-6 min-w-[80px] min-h-[56px] transition-colors relative ${
        isActive ? "text-purple-400" : "text-white/50 hover:text-white/70"
      }`}
    >
      <motion.div
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Icon className={`w-6 h-6 ${isActive ? "fill-purple-400/20" : ""}`} />
      </motion.div>
      <span className="text-[11px] mt-1 font-medium">{tab.label}</span>
      {isActive && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute -bottom-0 w-12 h-0.5 bg-purple-400 rounded-full"
        />
      )}
    </button>
  );
}

export default BottomNav;
