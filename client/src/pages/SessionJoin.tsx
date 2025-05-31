import { useState } from "react";
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
import { useHaptics } from "@/hooks/useHaptics";
import { apiRequest } from "@/lib/queryClient";
import { Wine, Users } from "lucide-react";
import type { Package, Participant } from "@shared/schema";

const joinFormSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  isHost: z.boolean().default(false)
});

type JoinFormData = z.infer<typeof joinFormSchema>;

export default function SessionJoin() {
  const { packageCode } = useParams();
  const [, setLocation] = useLocation();
  const [isJoining, setIsJoining] = useState(false);
  
  // Get URL parameters for QR code flow
  const urlParams = new URLSearchParams(window.location.search);
  const sessionParam = urlParams.get('session');
  const codeParam = urlParams.get('code') || packageCode;
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  const form = useForm<JoinFormData>({
    resolver: zodResolver(joinFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      isHost: false
    }
  });

  // Get package details
  const { data: packageData, isLoading: packageLoading } = useQuery<Package>({
    queryKey: [`/api/packages/${packageCode}`],
    enabled: !!packageCode
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
    if (!packageCode) return;
    
    setIsJoining(true);
    triggerHaptic('selection');

    try {
      // Create session
      const session = await createSessionMutation.mutateAsync(packageCode);
      
      // Join as participant
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
    } catch (error) {
      triggerHaptic('error');
    } finally {
      setIsJoining(false);
    }
  };

  if (packageLoading) {
    return <LoadingOverlay isVisible={true} message="Loading package details..." />;
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
              <div className="text-2xl font-bold text-white">6</div>
              <div className="text-white/60 text-sm">Wines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">45</div>
              <div className="text-white/60 text-sm">Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-white/60 text-sm">Participants</div>
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
          <h3 className="text-xl font-semibold text-white mb-6">Join the Tasting</h3>
          
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
                    <FormLabel className="text-white/80">Email (Optional)</FormLabel>
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

              {/* Host Mode Toggle */}
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

              <Button
                type="submit"
                disabled={isJoining}
                className="w-full py-4 px-6 bg-gradient-button rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 mt-6"
              >
                <Users className="mr-2" size={16} />
                Join Tasting Session
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>

      <LoadingOverlay isVisible={isJoining} message="Joining session..." />
    </div>
  );
}
