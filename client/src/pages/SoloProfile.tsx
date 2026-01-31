import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { User as UserType } from "@shared/schema";

/**
 * Sprint 4.1: SoloProfile now redirects to the Unified Dashboard
 *
 * The unified dashboard at /dashboard/:email shows both solo and group
 * tasting data in one place, replacing the need for a separate SoloProfile.
 */
export default function SoloProfile() {
  const [, setLocation] = useLocation();

  // Check authentication status
  const { data: authData, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me', null);
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false
  });

  // Redirect based on auth status
  useEffect(() => {
    if (!isLoading) {
      if (authData?.user?.email) {
        // Redirect to unified dashboard with user's email
        setLocation(`/dashboard/${encodeURIComponent(authData.user.email)}`);
      } else {
        // Not authenticated, redirect to login
        setLocation('/solo/login');
      }
    }
  }, [isLoading, authData, setLocation]);

  // Show loading spinner while checking auth and redirecting
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
