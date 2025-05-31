import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Users, Wine, Plus, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function SommelierDashboard() {
  const [newSessionName, setNewSessionName] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("WINE01");
  const [customCode, setCustomCode] = useState("");
  const [packageName, setPackageName] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const { toast } = useToast();

  // Generate random wine codes
  const generateRandomCode = () => {
    const wineWords = ['VINE', 'GRAPE', 'CORK', 'VINO', 'CELLAR', 'BARREL', 'TANNIN'];
    const randomWord = wineWords[Math.floor(Math.random() * wineWords.length)];
    const randomNum = Math.floor(Math.random() * 999) + 1;
    return `${randomWord}${randomNum.toString().padStart(3, '0')}`;
  };

  const generateShortCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return result;
  };

  // Fetch available wine packages
  const { data: packages = [] } = useQuery({
    queryKey: ['/api/packages'],
    enabled: false // We'll create packages dynamically
  });

  // Fetch active sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['/api/sessions'],
    enabled: false // We'll implement this when needed
  });

  // Create custom wine package
  const createPackageMutation = useMutation({
    mutationFn: async ({ code, name, description }: { code: string; name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/packages', { code, name, description });
      return response.json();
    },
    onSuccess: (newPackage) => {
      toast({
        title: "Wine Package Created!",
        description: `Package "${newPackage.code}" is ready for tastings`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setCustomCode("");
      setPackageName("");
      setPackageDescription("");
      setIsCreatingCustom(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create new tasting session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      // First get the package using apiRequest for consistency
      const packageResponse = await apiRequest('GET', `/api/packages/${selectedPackage}`, null);
      const winePackage = await packageResponse.json();
      
      // Create session using apiRequest
      const sessionResponse = await apiRequest('POST', '/api/sessions', {
        packageId: winePackage.id,
        name: newSessionName
      });
      return sessionResponse.json();
    },
    onSuccess: (session) => {
      toast({
        title: "Session Created!",
        description: `Your tasting session "${newSessionName}" is ready.`
      });
      setNewSessionName("");
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const generateQRData = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?code=${code}`;
  };

  const copyQRLink = (code: string) => {
    navigator.clipboard.writeText(generateQRData(code));
    toast({
      title: "Link Copied!",
      description: "Share this link with your guests"
    });
  };

  const downloadQR = (code: string, sessionName: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(generateQRData(code))}`;
    
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${sessionName.replace(/\s+/g, '-')}-qr-code.png`;
    link.click();
    
    toast({
      title: "QR Code Downloaded!",
      description: "Print and display for your guests"
    });
  };

  const viewQR = (code: string, sessionName: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(generateQRData(code))}`;
    window.open(qrUrl, '_blank');
    
    toast({
      title: "QR Code Opened!",
      description: "QR code opened in new tab"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Sommelier Dashboard
          </h1>
          <p className="text-purple-200">
            Create and manage your wine tasting experiences
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Create Custom Wine Package */}
          <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wine size={20} />
                Create Wine Package
              </CardTitle>
              <CardDescription className="text-purple-200">
                Design your custom wine tasting experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="packageName" className="text-white">
                  Package Name
                </Label>
                <Input
                  id="packageName"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., Italian Reds Collection"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div>
                <Label htmlFor="customCode" className="text-white">
                  Package Code
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="customCode"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ITALY01"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    maxLength={10}
                  />
                  <Button
                    onClick={() => setCustomCode(generateRandomCode())}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    🎲 Random
                  </Button>
                  <Button
                    onClick={() => setCustomCode(generateShortCode())}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Short
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="packageDescription" className="text-white">
                  Description
                </Label>
                <Input
                  id="packageDescription"
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="Describe your wine selection..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <Button
                onClick={() => createPackageMutation.mutate({ 
                  code: customCode, 
                  name: packageName, 
                  description: packageDescription 
                })}
                disabled={!customCode.trim() || !packageName.trim() || createPackageMutation.isPending}
                className="w-full bg-gradient-button text-white font-semibold"
              >
                {createPackageMutation.isPending ? "Creating..." : "Create Package & QR Code"}
              </Button>
            </CardContent>
          </Card>

          {/* Create New Session */}
          <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus size={20} />
                Create Tasting Session
              </CardTitle>
              <CardDescription className="text-purple-200">
                Start a session with existing wine packages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sessionName" className="text-white">
                  Session Name
                </Label>
                <Input
                  id="sessionName"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g., Evening Bordeaux Tasting"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              
              <div>
                <Label htmlFor="winePackage" className="text-white">
                  Wine Collection
                </Label>
                <select
                  id="winePackage"
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
                >
                  <option value="WINE01">Bordeaux Discovery Collection</option>
                  {/* Add created packages dynamically here */}
                </select>
              </div>

              <Button
                onClick={() => createSessionMutation.mutate()}
                disabled={!newSessionName.trim() || createSessionMutation.isPending}
                className="w-full bg-gradient-button text-white font-semibold"
              >
                {createSessionMutation.isPending ? "Creating..." : "Create Session"}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Start Guide */}
          <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wine size={20} />
                How to Host a Tasting
              </CardTitle>
              <CardDescription className="text-purple-200">
                Your step-by-step guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-semibold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-white font-medium">Create Your Session</p>
                    <p className="text-purple-200 text-sm">Give it a memorable name and select your wine collection</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-semibold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-white font-medium">Generate QR Code</p>
                    <p className="text-purple-200 text-sm">Download and print the QR code for easy guest access</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-semibold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-white font-medium">Host Your Tasting</p>
                    <p className="text-purple-200 text-sm">Guests scan to join and follow along with the guided experience</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Session for Testing */}
        <div className="mt-8 max-w-4xl mx-auto">
          <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode size={20} />
                Demo Session Available
              </CardTitle>
              <CardDescription className="text-purple-200">
                Test the platform with our ready-made Bordeaux tasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => copyQRLink('WINE01')}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Copy size={16} className="mr-2" />
                  Copy Demo Link
                </Button>
                
                <Button
                  onClick={() => viewQR('WINE01', 'Bordeaux Demo')}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <QrCode size={16} className="mr-2" />
                  View QR Code
                </Button>
                
                <Button
                  onClick={() => downloadQR('WINE01', 'Bordeaux Demo')}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download size={16} className="mr-2" />
                  Download QR Code
                </Button>
                
                <Link href="/join?code=WINE01">
                  <Button className="bg-gradient-button text-white">
                    <Users size={16} className="mr-2" />
                    Join as Guest
                  </Button>
                </Link>
              </div>
              
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p className="text-purple-200 text-sm">
                  <strong>Demo Code:</strong> WINE01 | 
                  <strong className="ml-2">Experience:</strong> 8 interactive wine tasting questions covering aroma, taste, body, and overall rating
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}