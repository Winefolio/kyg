import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WineModal } from "@/components/WineModal";
import { SlideEditor } from "@/components/SlideEditor";
import { QRCodeModal } from "@/components/QRCodeModal";
import { WINE_TEMPLATES, getWineImage, getGrapeVarietals, getWineTypes, getWineRegions } from "@/lib/wineTemplates";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Wine, 
  Users, 
  BarChart3,
  Settings,
  Copy,
  Eye,
  PlayCircle,
  PauseCircle,
  ArrowLeft,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Volume2,
  MessageSquare,
  Star,
  Clock,
  Download,
  QrCode,
  Link,
  Send,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Move,
  GripVertical,
  TrendingUp,
  Activity
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Package {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  wines: PackageWine[];
}

interface PackageWine {
  id: string;
  packageId: string;
  wineName: string;
  wineDescription: string;
  wineImageUrl: string;
  position: number;
  slides: Slide[];
}

interface WineForm {
  wineName: string;
  wineDescription: string;
  wineImageUrl: string;
  position: number;
  wineType: string;
  vintage: number | null;
  region: string;
  producer: string;
  grapeVarietals: string[];
  alcoholContent: string;
  expectedCharacteristics: Record<string, any>;
}

interface SlideOrderItem {
  id: string;
  position: number;
  type: string;
  sectionType: string;
  title: string;
  description: string;
}

interface SlideTemplate {
  id: string;
  name: string;
  type: string;
  sectionType: string;
  payloadTemplate: any;
  isPublic: boolean;
}

interface Slide {
  id: string;
  packageWineId: string;
  position: number;
  type: 'interlude' | 'question' | 'video_message' | 'audio_message' | 'media';
  sectionType: 'intro' | 'deep_dive' | 'ending';
  title: string;
  description: string;
  payloadJson: any;
}

interface Session {
  id: string;
  packageCode: string;
  code: string;
  participantCount: number;
  status: string;
  createdAt: string;
}

type TabType = 'packages' | 'sessions' | 'analytics';
type PackageModalMode = 'create' | 'edit' | 'view';
type WineModalMode = 'create' | 'edit' | 'view';

export default function SommelierDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('packages');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState<PackageModalMode>('view');
  const [wineModalOpen, setWineModalOpen] = useState(false);
  const [wineModalMode, setWineModalMode] = useState<WineModalMode>('create');
  const [selectedWine, setSelectedWine] = useState<PackageWine | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState<Session | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [slideEditorOpen, setSlideEditorOpen] = useState(false);
  const [selectedWineForSlides, setSelectedWineForSlides] = useState<PackageWine | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch packages
  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ['/api/packages'],
    enabled: true
  });

  // Fetch sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
    enabled: activeTab === 'sessions'
  });

  // Fetch analytics
  const { data: analytics = {
    overview: {
      totalPackages: 0,
      totalSessions: 0,
      activeParticipants: 0,
      completionRate: 0,
      averageRating: 0,
      totalResponses: 0
    },
    packageUsage: [],
    recentActivity: []
  }, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/analytics/overview'],
    enabled: activeTab === 'analytics',
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Create package mutation
  const createPackageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create package');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setPackageModalOpen(false);
      toast({ title: "Package created successfully" });
    }
  });

  // Update package mutation
  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update package');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setPackageModalOpen(false);
      toast({ title: "Package updated successfully" });
    }
  });

  // Delete package mutation
  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete package');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({ title: "Package deleted successfully" });
    }
  });

  const openPackageModal = (mode: PackageModalMode, pkg?: Package) => {
    setPackageModalMode(mode);
    setSelectedPackage(pkg || null);
    setPackageModalOpen(true);
  };

  // Wine management mutations
  const createWineMutation = useMutation({
    mutationFn: async (data: WineForm & { packageId: string }) => {
      const response = await fetch('/api/package-wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create wine');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setWineModalOpen(false);
      toast({ title: "Wine added successfully" });
    }
  });

  const updateWineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: WineForm }) => {
      const response = await fetch(`/api/package-wines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update wine');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setWineModalOpen(false);
      toast({ title: "Wine updated successfully" });
    }
  });

  const deleteWineMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/package-wines/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete wine');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({ title: "Wine deleted successfully" });
    }
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (packageCode: string) => {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageCode })
      });
      if (!response.ok) throw new Error('Failed to create session');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({ title: "Session created successfully" });
      // Show QR code modal with new session
      setSelectedSessionForQR(data.session);
      setShowQRModal(true);
    }
  });

  const copyPackageCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Package code copied to clipboard" });
  };

  const copySessionLink = (sessionCode: string) => {
    const link = `${window.location.origin}/session/${sessionCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Session link copied to clipboard" });
  };

  const togglePackageExpansion = (packageId: string) => {
    const newExpanded = new Set(expandedPackages);
    if (newExpanded.has(packageId)) {
      newExpanded.delete(packageId);
    } else {
      newExpanded.add(packageId);
    }
    setExpandedPackages(newExpanded);
  };

  const openWineModal = (mode: WineModalMode, wine?: PackageWine) => {
    setWineModalMode(mode);
    setSelectedWine(wine || null);
    setWineModalOpen(true);
  };

  const openSlideEditor = (wine: PackageWine) => {
    setSelectedWineForSlides(wine);
    setSlideEditorOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 bg-gradient-primary/95 backdrop-blur-xl border-b border-white/10 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation('/')}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              
              <div className="flex items-center space-x-2">
                <Wine className="w-6 h-6 text-white" />
                <h1 className="text-white font-bold text-xl">Sommelier Dashboard</h1>
              </div>
            </div>
            
            <Button
              onClick={() => openPackageModal('create')}
              className="bg-white text-purple-900 hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Package
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex space-x-2 mb-12 bg-white/10 rounded-2xl p-2"
        >
          {[
            { id: 'packages', label: 'Wine Packages', icon: Wine },
            { id: 'sessions', label: 'Active Sessions', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 py-4 px-6 text-lg font-medium rounded-xl transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-white text-purple-900 shadow-lg' 
                  : 'text-white hover:bg-white/10 hover:scale-105'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-3" />
              {tab.label}
            </Button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Packages Tab */}
            {activeTab === 'packages' && (
              <div className="space-y-6">
                {packagesLoading ? (
                  <div className="flex justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                    />
                  </div>
                ) : packages?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {packages.map((pkg, index) => (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-gradient-card backdrop-blur-xl border-white/20 hover:border-white/30 hover:shadow-2xl transition-all duration-300 h-full">
                          {/* Package Header */}
                          <div className="p-8 border-b border-white/10">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePackageExpansion(pkg.id)}
                                    className="p-2 h-auto text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                                  >
                                    {expandedPackages.has(pkg.id) ? 
                                      <ChevronDown className="w-5 h-5" /> : 
                                      <ChevronRight className="w-5 h-5" />
                                    }
                                  </Button>
                                  <h3 className="text-white font-bold text-xl">{pkg.name}</h3>
                                  <Badge 
                                    variant={pkg.isActive ? "default" : "secondary"}
                                    className={pkg.isActive ? "bg-green-500/20 text-green-200 px-3 py-1" : "bg-gray-500/20 text-gray-200 px-3 py-1"}
                                  >
                                    {pkg.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center space-x-2 mb-3">
                                  <code className="bg-white/10 text-purple-200 px-2 py-1 rounded text-sm font-mono">
                                    {pkg.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyPackageCode(pkg.code)}
                                    className="p-1 h-auto text-white/60 hover:text-white hover:bg-white/10"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                <p className="text-white/70 text-sm mb-4">{pkg.description}</p>
                                
                                <div className="flex items-center space-x-4 text-sm text-white/60">
                                  <div className="flex items-center space-x-1">
                                    <Wine className="w-4 h-4" />
                                    <span>{pkg.wines?.length || 0} wines</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{new Date(pkg.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => createSessionMutation.mutate(pkg.code)}
                                className="text-white hover:bg-white/10"
                                disabled={createSessionMutation.isPending}
                              >
                                <QrCode className="w-4 h-4 mr-2" />
                                Create Session
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPackageModal('view', pkg)}
                                className="text-white hover:bg-white/10"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/editor/${pkg.code}`)}
                                className="text-purple-300 hover:bg-purple-500/20 border border-purple-400/30"
                              >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit Package
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPackageModal('edit', pkg)}
                                className="text-white hover:bg-white/10"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePackageMutation.mutate(pkg.id)}
                                className="text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Expandable Wine Management Section */}
                          <AnimatePresence>
                            {expandedPackages.has(pkg.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-white font-medium">Wines in Package</h4>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPackage(pkg);
                                        openWineModal('create');
                                      }}
                                      className="bg-white/10 text-white hover:bg-white/20"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add Wine
                                    </Button>
                                  </div>

                                  {pkg.wines && pkg.wines.length > 0 ? (
                                    <div className="space-y-3">
                                      {pkg.wines.map((wine, wineIndex) => (
                                        <motion.div
                                          key={wine.id}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: wineIndex * 0.1 }}
                                          className="bg-white/5 rounded-lg p-4 border border-white/10"
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center space-x-2 mb-2">
                                                <GripVertical className="w-4 h-4 text-white/40" />
                                                <h5 className="text-white font-medium">{wine.wineName}</h5>
                                                <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                                                  Position {wine.position}
                                                </Badge>
                                              </div>
                                              {wine.wineDescription && (
                                                <p className="text-white/60 text-sm mb-2">{wine.wineDescription}</p>
                                              )}
                                              <div className="flex items-center space-x-4 text-xs text-white/50">
                                                <span>{wine.slides?.length || 0} slides</span>
                                                {wine.wineImageUrl && (
                                                  <span className="flex items-center space-x-1">
                                                    <ImageIcon className="w-3 h-3" />
                                                    <span>Image attached</span>
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            
                                            <div className="flex space-x-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openWineModal('edit', wine)}
                                                className="text-white/60 hover:text-white hover:bg-white/10"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteWineMutation.mutate(wine.id)}
                                                className="text-red-300/60 hover:text-red-300 hover:bg-red-500/10"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-white/50">
                                      <Wine className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No wines added yet</p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedPackage(pkg);
                                          openWineModal('create');
                                        }}
                                        className="mt-2 text-white/70 hover:text-white hover:bg-white/10"
                                      >
                                        Add your first wine
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-12 text-center">
                    <Wine className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">No Wine Packages</h3>
                    <p className="text-white/70 mb-6">Create your first wine package to get started.</p>
                    <Button onClick={() => openPackageModal('create')} className="bg-white text-purple-900 hover:bg-white/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Package
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                {sessionsLoading ? (
                  <div className="flex justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                    />
                  </div>
                ) : sessions?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-white font-semibold text-lg">Session {session.code}</h3>
                              <p className="text-white/70 text-sm">Package: {session.packageCode}</p>
                            </div>
                            <Badge 
                              variant={session.status === 'active' ? "default" : "secondary"}
                              className={session.status === 'active' ? "bg-green-500/20 text-green-200" : "bg-gray-500/20 text-gray-200"}
                            >
                              {session.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-white/60 mb-4">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{session.participantCount} participants</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(session.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSessionForQR({
                                  ...session,
                                  packageName: packages?.find((p: any) => p.id === session.packageId)?.name || 'Wine Package',
                                  packageCode: packages?.find((p: any) => p.id === session.packageId)?.code || session.packageId,
                                  maxParticipants: session.maxParticipants || 50
                                });
                                setShowQRModal(true);
                              }}
                              className="flex-1 text-purple-400 hover:bg-purple-500/20"
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              QR Code
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const sessionUrl = `${window.location.origin}/join/${session.id}`;
                                navigator.clipboard.writeText(sessionUrl);
                              }}
                              className="text-white/70 hover:bg-white/10"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-12 text-center">
                    <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">No Active Sessions</h3>
                    <p className="text-white/70">Active tasting sessions will appear here.</p>
                  </Card>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {analyticsLoading ? (
                  <div className="flex justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                    />
                  </div>
                ) : analytics ? (
                  <>
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                        <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{analytics.overview.totalPackages}</div>
                        <div className="text-white/70 text-sm">Total Packages</div>
                        <div className="text-green-400 text-xs mt-1">
                          {analytics.overview.activePackages} active
                        </div>
                      </Card>
                      
                      <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                        <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{analytics.overview.totalSessions}</div>
                        <div className="text-white/70 text-sm">Total Sessions</div>
                        <div className="text-green-400 text-xs mt-1">
                          {analytics.overview.activeSessions} active
                        </div>
                      </Card>
                      
                      <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                        <Activity className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{analytics.overview.totalParticipants}</div>
                        <div className="text-white/70 text-sm">Total Participants</div>
                      </Card>
                      
                      <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                        <BarChart3 className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">
                          {analytics.overview.totalSessions > 0 ? 
                            Math.round(analytics.overview.totalParticipants / analytics.overview.totalSessions * 10) / 10 : 0
                          }
                        </div>
                        <div className="text-white/70 text-sm">Avg Participants</div>
                      </Card>
                      
                      <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                        <Wine className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">
                          {analytics.overview.activePackages > 0 ? 
                            Math.round((analytics.overview.activeSessions / analytics.overview.activePackages) * 10) / 10 : 0
                          }
                        </div>
                        <div className="text-white/70 text-sm">Sessions per Package</div>
                      </Card>
                    </div>

                    {/* Package Usage Analytics */}
                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                      <h3 className="text-white font-semibold text-lg mb-4">Package Performance</h3>
                      <div className="space-y-4">
                        {analytics.packageUsage.map((pkg: any, index: number) => (
                          <motion.div
                            key={pkg.packageId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white/5 rounded-lg p-4 border border-white/10"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
                                <h4 className="text-white font-medium">{pkg.packageName}</h4>
                                <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                                  {pkg.packageCode}
                                </Badge>
                                {pkg.isActive && (
                                  <Badge className="bg-green-500/20 text-green-200 text-xs">Active</Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  {pkg.participantsCount} participants
                                </div>
                                <div className="text-white/60 text-sm">
                                  {pkg.sessionsCount} sessions
                                </div>
                              </div>
                            </div>
                            
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (pkg.participantsCount / Math.max(...analytics.packageUsage.map((p: any) => p.participantsCount), 1)) * 100)}%`
                                }}
                              ></div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                      <h3 className="text-white font-semibold text-lg mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {analytics.recentActivity.map((activity: any, index: number) => (
                          <motion.div
                            key={activity.sessionId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                activity.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                              }`}></div>
                              <span className="text-white">Session started for {activity.packageCode}</span>
                            </div>
                            <div className="text-white/60 text-sm">
                              {new Date(activity.createdAt).toLocaleString()}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                  </>
                ) : (
                  <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-12 text-center">
                    <BarChart3 className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">No Analytics Data</h3>
                    <p className="text-white/70">Analytics data will appear here once you have active packages and sessions.</p>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Package Modal */}
      {packageModalOpen && (
        <PackageModal
          mode={packageModalMode}
          package={selectedPackage}
          onClose={() => setPackageModalOpen(false)}
          onSave={(data) => {
            if (packageModalMode === 'create') {
              createPackageMutation.mutate(data);
            } else if (packageModalMode === 'edit' && selectedPackage) {
              updatePackageMutation.mutate({ id: selectedPackage.id, data });
            }
          }}
        />
      )}

      {/* Wine Modal */}
      {wineModalOpen && selectedPackage && (
        <WineModal
          mode={wineModalMode}
          wine={selectedWine}
          packageId={selectedPackage.id}
          onClose={() => setWineModalOpen(false)}
          onSave={(data) => {
            if (wineModalMode === 'create') {
              createWineMutation.mutate({ ...data, packageId: selectedPackage.id });
            } else if (wineModalMode === 'edit' && selectedWine) {
              updateWineMutation.mutate({ id: selectedWine.id, data });
            }
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedSessionForQR && (
        <QRCodeModal
          session={selectedSessionForQR}
          onClose={() => setShowQRModal(false)}
          onCopyLink={(sessionCode) => copySessionLink(sessionCode)}
        />
      )}
    </div>
  );
}

// Package Modal Component
interface PackageModalProps {
  mode: PackageModalMode;
  package: Package | null;
  onClose: () => void;
  onSave: (data: any) => void;
}



// Wine template helper functions
const handleQuickWineCreate = (templateId: string) => {
  const template = WINE_TEMPLATES.find(t => t.id === templateId);
  if (template && selectedPackage) {
    const wineData = {
      wineName: template.name,
      wineDescription: template.description,
      wineImageUrl: template.imageUrl,
      wineType: template.wineType,
      vintage: template.vintage,
      region: template.region,
      producer: template.producer,
      grapeVarietals: template.grapeVarietals,
      alcoholContent: template.alcoholContent,
      expectedCharacteristics: template.expectedCharacteristics
    };
    
    createWineMutation.mutate({ ...wineData, packageId: selectedPackage.id });
  }
};

// Session QR code handling
function SessionQRCodeModal({ session, onClose, onCopyLink }: {
  session: Session;
  onClose: () => void;
  onCopyLink: (sessionCode: string) => void;
}) {
  const sessionUrl = `${window.location.origin}/session/${session.code}`;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-3xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-xl">Session Created</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center space-y-6">
          {/* QR Code Placeholder */}
          <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 flex items-center justify-center">
            <div className="text-center">
              <QrCode className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">QR Code for</p>
              <p className="font-mono text-sm">{session.code}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-white/70 text-sm">Session Code</Label>
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <code className="text-white font-mono text-lg">{session.code}</code>
              </div>
            </div>

            <div>
              <Label className="text-white/70 text-sm">Direct Link</Label>
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <p className="text-white/80 text-sm break-all">{sessionUrl}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={() => onCopyLink(session.code)}
              className="flex-1 bg-white text-purple-900 hover:bg-white/90"
            >
              <Link className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <Send className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PackageModal({ mode, package: pkg, onClose, onSave }: PackageModalProps) {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    code: pkg?.code || '',
    description: pkg?.description || '',
    isActive: pkg?.isActive ?? true
  });
  const [activeTab, setActiveTab] = useState<'details' | 'wines'>('details');
  const [packageWines, setPackageWines] = useState<PackageWine[]>([]);
  const [wineModalOpen, setWineModalOpen] = useState(false);
  const [wineModalMode, setWineModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedWine, setSelectedWine] = useState<PackageWine | null>(null);

  const queryClient = useQueryClient();

  // Fetch wines for this package if it exists
  const { data: wines } = useQuery({
    queryKey: ['/api/packages', pkg?.id, 'wines'],
    enabled: !!pkg?.id && activeTab === 'wines'
  });

  useEffect(() => {
    if (wines) {
      setPackageWines(Array.isArray(wines) ? wines : wines.wines || []);
    }
  }, [wines]);

  const createWineMutation = useMutation({
    mutationFn: (wineData: any) => fetch(`/api/packages/${pkg?.id}/wines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wineData)
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', pkg?.id, 'wines'] });
      setWineModalOpen(false);
    }
  });

  const updateWineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => fetch(`/api/packages/${pkg?.id}/wines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', pkg?.id, 'wines'] });
      setWineModalOpen(false);
    }
  });

  const deleteWineMutation = useMutation({
    mutationFn: (wineId: string) => fetch(`/api/packages/${pkg?.id}/wines/${wineId}`, {
      method: 'DELETE'
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', pkg?.id, 'wines'] });
    }
  });

  const handleSave = () => {
    onSave(formData);
  };

  const openWineModal = (mode: 'create' | 'edit' | 'view', wine?: PackageWine) => {
    setWineModalMode(mode);
    setSelectedWine(wine || null);
    setWineModalOpen(true);
  };

  const isReadOnly = mode === 'view';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-3xl p-8 w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-white font-bold text-2xl">
            {mode === 'create' ? 'Create Package' : mode === 'edit' ? 'Edit Package' : 'Package Details'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10 p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 rounded-lg p-1 mb-6">
            <TabsTrigger value="details" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white py-3">
              <Settings className="w-4 h-4 mr-2" />
              Package Details
            </TabsTrigger>
            <TabsTrigger value="wines" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white py-3" disabled={!pkg?.id}>
              <Wine className="w-4 h-4 mr-2" />
              Wines ({packageWines.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-8 flex-1 overflow-y-auto pr-2">
            <div className="space-y-3">
              <Label className="text-white text-lg font-medium">Package Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-lg"
                placeholder="Enter package name"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-white text-lg font-medium">Package Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="bg-white/10 border-white/20 text-white font-mono placeholder:text-white/50 h-12 text-lg"
                placeholder="WINE01"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-white text-lg font-medium">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[120px] text-lg"
                placeholder="Describe this wine package"
                disabled={isReadOnly}
              />
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                disabled={isReadOnly}
              />
              <Label className="text-white text-lg font-medium">Active Package</Label>
            </div>

          {!isReadOnly && (
            <div className="flex space-x-3">
              <Button
                onClick={handleSave}
                className="flex-1 bg-white text-purple-900 hover:bg-white/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Create Package' : 'Save Changes'}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          )}
          </TabsContent>

          <TabsContent value="wines" className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium text-lg">Package Wines</h3>
                {!isReadOnly && (
                  <Button
                    onClick={() => openWineModal('create')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Wine
                  </Button>
                )}
              </div>

              {packageWines.length === 0 ? (
                <div className="text-center py-12">
                  <Wine className="w-16 h-16 mx-auto text-white/40 mb-6" />
                  <h4 className="text-white font-medium mb-2">No wines added yet</h4>
                  <p className="text-white/60 mb-6">Start building your wine collection for this package</p>
                  {!isReadOnly && (
                    <Button
                      onClick={() => openWineModal('create')}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Add Your First Wine
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {packageWines.map((wine, index) => (
                    <Card key={wine.id} className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                            {wine.position}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-lg mb-1">{wine.wineName}</h4>
                            {wine.wineDescription && (
                              <p className="text-white/70 text-sm mb-2 leading-relaxed">
                                {wine.wineDescription}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="bg-purple-500/20 border-purple-400/30 text-purple-200">
                                Position {wine.position}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-500/20 border-blue-400/30 text-blue-200">
                                Wine #{wine.position}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {!isReadOnly && (
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              onClick={() => {
                                const pkg = packages?.find(p => p.id === wine.packageId);
                                if (pkg) setLocation(`/video-editor/${pkg.code}`);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-purple-400 hover:bg-purple-500/10"
                              title="Video Editor Style"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => openWineModal('edit', wine)}
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/10"
                              title="Edit Wine"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => deleteWineMutation.mutate(wine.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:bg-red-500/10"
                              title="Delete Wine"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Wine Modal for this package */}
        {wineModalOpen && pkg?.id && (
          <WineModal
            mode={wineModalMode}
            wine={selectedWine}
            packageId={pkg.id}
            onClose={() => setWineModalOpen(false)}
            onSave={(data) => {
              if (wineModalMode === 'create') {
                createWineMutation.mutate(data);
              } else if (wineModalMode === 'edit' && selectedWine) {
                updateWineMutation.mutate({ id: selectedWine.id, data });
              }
            }}
          />
        )}

        {/* QR Code Modal */}
        {showQRModal && selectedSessionForQR && (
          <QRCodeModal
            session={selectedSessionForQR}
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
          />
        )}

      </motion.div>
    </motion.div>
  );
}