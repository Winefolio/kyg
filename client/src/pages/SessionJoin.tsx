import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useHaptics } from "@/hooks/useHaptics";
import { useUserProfile } from "@/hooks/useUserProfile";
import { apiRequest } from "@/lib/queryClient";
import { Wine, Users, User, Clock, Loader2 } from "lucide-react";
import type { Package, Participant, Session } from "@shared/schema";

const joinFormSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  isHost: z.boolean().default(false)
});

type JoinFormData = z.infer<typeof joinFormSchema>;

export default function SessionJoin() {
  const { packageCode } = useParams();
  const [, setLocation] = useLocation();
  const [isJoining, setIsJoining] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Get URL parameters for both QR code and sessionId flows
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('sessionId');
  const packageCodeFromUrl = urlParams.get('code') || packageCode;
  const { triggerHaptic } = useHaptics();
  const { user, updateUser, addTastingSession, isAuthenticated } = useUserProfile();
  const queryClient = useQueryClient();

  const form = useForm<JoinFormData>({
    resolver: zodResolver(joinFormSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
      isHost: false
    }
  });

  // Get existing session details if joining via sessionId
  const { data: existingSession, isLoading: sessionLoading } = useQuery<Session & {packageCode?: string}>({
    queryKey: [`/api/sessions/${sessionIdFromUrl}`],
    enabled: !!sessionIdFromUrl
  });

  // Get package details - use packageCode from session or URL
  const effectivePackageCode = existingSession?.packageCode || packageCodeFromUrl;
  const { data: packageData, isLoading: packageLoading } = useQuery<Package>({
    queryKey: [`/api/packages/${effectivePackageCode}`],
    enabled: !!effectivePackageCode
  });

  // Get package slides to determine wine count and total slides
  const { data: slidesData, isLoading: slidesLoading } = useQuery<{
    package: Package;
    slides: any[];
    totalCount: number;
    wines: any[];
  }>({
    queryKey: [`/api/packages/${effectivePackageCode}/slides`],
    enabled: !!effectivePackageCode
  });

  // Get participants count when joining existing session
  const { data: participants, isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: [`/api/sessions/${sessionIdFromUrl}/participants`],
    enabled: !!sessionIdFromUrl,
    refetchInterval: 5000 // Refresh every 5 seconds to get updated count
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (packageCode: string) => {
      const response = await apiRequest('POST', '/api/sessions', { packageCode });
      return response.json();
    }
  });

  // Join session mutation
  const joinSessionMutation = useMutation({
    mutationFn: async ({ sessionId, participant }: { sessionId: string; participant: any }) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/participants`, participant);
      return response.json();
    }
  });

  const onSubmit = async (data: JoinFormData) => {
    setIsJoining(true);
    triggerHaptic('selection');

    try {
      if (sessionIdFromUrl) {
        // Enhanced logging for debugging
        console.log('[CLIENT_JOIN] Attempting to join session with:', {
          sessionIdFromUrl,
          sessionIdType: typeof sessionIdFromUrl,
          sessionIdLength: sessionIdFromUrl?.length,
          isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdFromUrl),
          isShortCode: sessionIdFromUrl?.length === 6 && /^[A-Z0-9]{6}$/.test(sessionIdFromUrl),
          existingSession: existingSession
        });
        
        // Joining an existing session via sessionId
        if (!existingSession) {
          throw new Error('Session not found');
        }

        // Add participant to existing session
        const participantData = {
          ...data,
          isHost: false // Participants joining via link are not hosts
        };
        
        console.log('[CLIENT_JOIN] Sending participant data:', participantData);
        
        const participant = await joinSessionMutation.mutateAsync({
          sessionId: sessionIdFromUrl,
          participant: participantData
        });

        triggerHaptic('success');
        
        // Navigate to tasting session
        setLocation(`/tasting/${sessionIdFromUrl}/${participant.id}`);
        
      } else {
        // Creating a new session (original flow for hosts or package code entry)
        if (!packageCodeFromUrl) {
          throw new Error('Package code is required');
        }

        // Create new session
        const session = await createSessionMutation.mutateAsync(packageCodeFromUrl);
        
        // Join as participant (usually host in this flow)
        const participant = await joinSessionMutation.mutateAsync({
          sessionId: session.id,
          participant: data
        });

        triggerHaptic('success');
        
        // Navigate to appropriate screen
        if (data.isHost) {
          setLocation(`/host/${session.id}/${participant.id}`);
        } else {
          setLocation(`/tasting/${session.id}/${participant.id}`);
        }
      }
    } catch (error) {
      console.error('Error joining session:', error);
      triggerHaptic('error');
      
      // Display user-friendly error messages based on the error
      let errorMessage = 'Failed to join session. Please try again.';
      
      if (error instanceof Error) {
        // Parse error message from API response
        if (error.message.includes('500:')) {
          try {
            const errorData = JSON.parse(error.message.substring(error.message.indexOf('{'), error.message.lastIndexOf('}') + 1));
            errorMessage = errorData.message || errorMessage;
            
            // Log additional error details for debugging
            console.error('Error details:', {
              errorCode: errorData.errorCode,
              timestamp: errorData.timestamp,
              fullError: error.message
            });
          } catch (parseError) {
            // If parsing fails, use a generic message
            console.error('Failed to parse error response:', parseError);
          }
        } else if (error.message.includes('404:')) {
          errorMessage = 'Session not found. Please check the session code and try again.';
        } else if (error.message.includes('400:')) {
          errorMessage = 'Invalid session or participant data. Please check your information and try again.';
        } else if (error.message.includes('409:')) {
          errorMessage = 'You may have already joined this session. Please refresh and try again.';
        }
      }
      
      // Show error to user (you might want to add a toast notification here)
      alert(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  // Check if we're trying to join a session that doesn't exist
  useEffect(() => {
    if (sessionIdFromUrl && !sessionLoading && !existingSession) {
      // Session not found - redirect back to gateway with error
      setTimeout(() => {
        triggerHaptic('error');
        setLocation('/');
      }, 2000);
    }
  }, [sessionIdFromUrl, sessionLoading, existingSession, triggerHaptic, setLocation]);

  if (packageLoading || sessionLoading || slidesLoading) {
    return <LoadingOverlay isVisible={true} message="Loading session details..." />;
  }

  // Show error state if session not found
  if (sessionIdFromUrl && !existingSession) {
    return (
      <div className="min-h-screen bg-gradient-primary p-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 backdrop-blur-xl rounded-3xl p-8 border border-red-500/30 shadow-2xl max-w-md w-full text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Session Not Found</h2>
          <p className="text-white/80 mb-6">
            The session code "{sessionIdFromUrl}" does not exist or has expired.
          </p>
          <p className="text-white/60 text-sm">
            Redirecting you back to the homepage...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-6">
      <div className="max-w-md mx-auto space-y-8">
        {/* Session Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <Wine className="text-2xl text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {packageData?.name || "Wine Tasting Package"}
            </h2>
            <p className="text-white/70">
              {packageData?.description || "Explore exceptional wines"}
            </p>
          </div>

          {/* Session Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white h-8 flex items-center justify-center">
                {slidesLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  slidesData?.wines ? slidesData.wines.filter(w => w.position > 0).length : 0
                )}
              </div>
              <div className="text-white/60 text-sm flex items-center justify-center gap-1">
                <Wine className="w-3 h-3" />
                Wines
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white h-8 flex items-center justify-center">
                {slidesLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  slidesData?.totalCount ? Math.round(slidesData.totalCount * 1) : 0
                )}
              </div>
              <div className="text-white/60 text-sm flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Minutes
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white h-8 flex items-center justify-center">
                {participantsLoading && sessionIdFromUrl ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  sessionIdFromUrl && participants ? participants.length : 0
                )}
              </div>
              <div className="text-white/60 text-sm flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                Participants
              </div>
            </div>
          </div>
        </motion.div>

        {/* Participant Registration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
        >
          <h3 className="text-xl font-semibold text-white mb-6">
            {sessionIdFromUrl ? "Join the Tasting" : "Start New Tasting Session"}
          </h3>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Your Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your name"
                        className="bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Email (Required)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@example.com"
                        className="bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Host Mode Toggle - Only show when NOT joining via sessionId */}
              {!sessionIdFromUrl && (
                <FormField
                  control={form.control}
                  name="isHost"
                  render={({ field }) => (
                    <FormItem className="pt-4">
                      <div className="flex items-center space-x-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              triggerHaptic('selection');
                              field.onChange(checked);
                            }}
                            className="data-[state=checked]:bg-gradient-button"
                          />
                        </FormControl>
                        <FormLabel className="text-white font-medium cursor-pointer">
                          I'm hosting this session
                        </FormLabel>
                        {field.value && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <Badge variant="secondary" className="bg-purple-600/30 text-purple-200">
                              Host Mode
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                      <p className="text-white/60 text-sm mt-2">
                        Hosts can control the session pace and see participant responses
                      </p>
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                disabled={isJoining}
                className="w-full py-4 px-6 bg-gradient-button rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 mt-6"
              >
                <Users className="mr-2" size={16} />
                {sessionIdFromUrl ? "Join Session" : "Start Tasting Session"}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>

      <LoadingOverlay isVisible={isJoining} message="Joining session..." />
    </div>
  );
}
