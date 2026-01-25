import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  User,
  Wine,
  Calendar,
  LogOut,
  Loader2,
  Star
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function SoloProfile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get user data
  const { data: authData, isLoading: authLoading } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me', null);
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false
  });

  // Get preferences
  const { data: preferencesData } = useQuery<{
    preferences: Record<string, number | null>;
    tastingCount: number;
    summary: string;
  }>({
    queryKey: ['/api/solo/preferences'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/solo/preferences', null);
      return response.json();
    },
    enabled: !!authData?.user
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation('/solo');
    }
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!authData?.user) {
    setLocation('/solo');
    return null;
  }

  const user = authData.user;

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation('/solo')}
              className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white">Profile</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 space-y-6">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.email}</h2>
              <div className="flex items-center gap-1 text-white/60 text-sm mt-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Your Stats</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Wine className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {preferencesData?.tastingCount || 0}
                </div>
                <div className="text-sm text-white/60">Tastings</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preferences Card */}
        {preferencesData && preferencesData.tastingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Your Taste Profile</h3>
            <p className="text-white/80 mb-4">{preferencesData.summary}</p>

            {/* Preference bars */}
            <div className="space-y-4">
              {preferencesData.preferences.sweetness !== null && (
                <PreferenceBar
                  label="Sweetness"
                  value={preferencesData.preferences.sweetness}
                  leftLabel="Dry"
                  rightLabel="Sweet"
                />
              )}
              {preferencesData.preferences.acidity !== null && (
                <PreferenceBar
                  label="Acidity"
                  value={preferencesData.preferences.acidity}
                  leftLabel="Soft"
                  rightLabel="Crisp"
                />
              )}
              {preferencesData.preferences.tannins !== null && (
                <PreferenceBar
                  label="Tannins"
                  value={preferencesData.preferences.tannins}
                  leftLabel="Silky"
                  rightLabel="Grippy"
                />
              )}
              {preferencesData.preferences.body !== null && (
                <PreferenceBar
                  label="Body"
                  value={preferencesData.preferences.body}
                  leftLabel="Light"
                  rightLabel="Full"
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Sign Out
          </Button>
        </motion.div>
      </main>
    </div>
  );
}

function PreferenceBar({
  label,
  value,
  leftLabel,
  rightLabel
}: {
  label: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const percentage = ((value - 1) / 4) * 100; // Scale from 1-5 to 0-100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">{value.toFixed(1)}/5</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
        />
      </div>
      <div className="flex justify-between text-xs text-white/40">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
