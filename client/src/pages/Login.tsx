import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Wine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      // Check if user exists by trying to fetch their Supabase data
      const response = await fetch(`/api/supabase-test/user/${encodeURIComponent(email.trim())}`);
      
      if (response.ok) {
        // User exists, redirect to dashboard
        setLocation(`/dashboard/${encodeURIComponent(email.trim())}`);
        toast({
          title: "Welcome Back!",
          description: "Redirecting to your dashboard...",
        });
      } else if (response.status === 404) {
        // User doesn't exist
        toast({
          title: "No Account Found",
          description: "We couldn't find any tasting data for this email. Please join a tasting session first.",
          variant: "destructive",
        });
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
            <div className="mx-auto mb-4 p-3 bg-purple-500/20 rounded-full w-fit">
              <Wine className="w-8 h-8 text-purple-300" />
            </div>
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