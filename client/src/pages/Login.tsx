import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect URL from query params
  const redirectTo = new URLSearchParams(search).get("redirect");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if user exists by trying to fetch their dashboard data
      const response = await fetch(`/api/dashboard/${encodeURIComponent(email.trim())}?login=true`);

      if (response.ok) {
        // Authenticate with server to establish session
        const authResult = await login(email.trim());
        if (!authResult.success) {
          throw new Error(authResult.error || "Authentication failed");
        }

        // Redirect to original page or unified home
        const destination = redirectTo || '/home';
        setLocation(destination);
        toast({
          title: "Welcome Back!",
          description: redirectTo ? "Continuing where you left off..." : "Redirecting to your dashboard...",
        });
      } else if (response.status === 404) {
        // User doesn't exist - authenticate to create account
        const authResult = await login(email.trim());
        if (!authResult.success) {
          throw new Error(authResult.error || "Authentication failed");
        }

        // If they came from a journey, redirect back there
        if (redirectTo?.startsWith('/journeys')) {
          setLocation(redirectTo);
          toast({
            title: "Welcome!",
            description: "You can start exploring wine journeys.",
          });
        } else {
          toast({
            title: "No Tasting History",
            description: "You can start with solo tastings or learning journeys to build your profile.",
          });
          setLocation('/home');
        }
      } else {
        throw new Error("Failed to check account");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="text-white/70 hover:text-white hover:bg-white/10 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Login Card */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20">
          <CardHeader className="text-center">
            <img
              src="/logo-cata.svg"
              alt="Cata"
              className="w-14 h-14 mx-auto mb-4"
            />
            <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
            <CardDescription className="text-purple-200">
              Enter your email to access your wine tasting dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Checking..." : "Access Dashboard"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-purple-200">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  onClick={() => setLocation('/')}
                  className="text-purple-300 hover:text-purple-200 p-0 h-auto"
                >
                  Join a tasting session
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 