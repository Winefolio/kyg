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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WineModal } from "@/components/WineModal";
import { SlideEditor } from "@/components/SlideEditor";
import { QRCodeModal } from "@/components/QRCodeModal";
import {
  WINE_TEMPLATES,
  getWineImage,
  getGrapeVarietals,
  getWineTypes,
  getWineRegions,
} from "@/lib/wineTemplates";
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
  Activity,
  MoreVertical,
  Monitor,
  ChevronUp,
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
  packageId?: string;
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
  type: "interlude" | "question" | "video_message" | "audio_message" | "media";
  sectionType: "intro" | "deep_dive" | "ending";
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

type TabType = "packages" | "sessions" | "analytics";
type PackageModalMode = "create" | "edit" | "view";
type WineModalMode = "create" | "edit" | "view";

export default function SommelierDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("packages");
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] =
    useState<PackageModalMode>("view");
  const [wineModalOpen, setWineModalOpen] = useState(false);
  const [wineModalMode, setWineModalMode] = useState<WineModalMode>("create");
  const [selectedWine, setSelectedWine] = useState<PackageWine | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionForQR, setSelectedSessionForQR] =
    useState<Session | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
    new Set(),
  );
  const [slideEditorOpen, setSlideEditorOpen] = useState(false);
  const [selectedWineForSlides, setSelectedWineForSlides] =
    useState<PackageWine | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch packages
  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
    enabled: true,
  });

  // Fetch sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    enabled: activeTab === "sessions",
  });

  // Create package mutation
  const createPackageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/packages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setPackageModalOpen(false);
      toast({
        title: "Package created successfully",
        description: "Your wine package has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error creating package",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update package mutation
  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/packages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setPackageModalOpen(false);
      toast({
        title: "Package updated successfully",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error updating package",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete package mutation
  const deletePackageMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Package deleted successfully",
        description: "The wine package has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error deleting package",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create wine mutation
  const createWineMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("Mutation function called with:", data);
      return apiRequest("POST", "/api/package-wines", data);
    },
    onSuccess: (result) => {
      console.log("Wine creation successful:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setWineModalOpen(false);
      toast({
        title: "Wine added successfully",
        description: "The wine has been added to your package.",
      });
    },
    onError: (error) => {
      console.error("Wine creation error:", error);
      toast({
        title: "Error adding wine",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update wine mutation
  const updateWineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WineForm }) =>
      apiRequest("PATCH", `/api/package-wines/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setWineModalOpen(false);
      toast({
        title: "Wine updated successfully",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error updating wine",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete wine mutation
  const deleteWineMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/package-wines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Wine removed successfully",
        description: "The wine has been removed from your package.",
      });
    },
    onError: () => {
      toast({
        title: "Error removing wine",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (packageCode: string) =>
      apiRequest("POST", "/api/sessions", { packageCode }),
    onSuccess: (session: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setSelectedSessionForQR(session as Session);
      setShowQRModal(true);
      toast({
        title: "Session created successfully",
        description: "Your tasting session is ready for participants.",
      });
    },
    onError: () => {
      toast({
        title: "Error creating session",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openPackageModal = (mode: PackageModalMode, pkg?: Package) => {
    setPackageModalMode(mode);
    setSelectedPackage(pkg || null);
    setPackageModalOpen(true);
  };

  const openWineModal = (mode: WineModalMode, wine?: PackageWine) => {
    console.log("Opening wine modal:", { mode, wine, selectedPackage });
    setWineModalMode(mode);
    setSelectedWine(wine || null);
    setWineModalOpen(true);
  };

  const openSlideEditor = (wine: PackageWine) => {
    setSelectedWineForSlides(wine);
    setSlideEditorOpen(true);
  };

  const togglePackageExpansion = (packageId: string) => {
    setExpandedPackages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(packageId)) {
        newSet.delete(packageId);
      } else {
        newSet.add(packageId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-black">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-2">
                <Wine className="w-6 h-6 text-white flex items-center" />
                <h1 className="text-white font-bold text-xl flex items-center">
                  Sommelier Dashboard
                </h1>
              </div>
            </div>

            <Button
              onClick={() => openPackageModal("create")}
              className="bg-white text-purple-900 hover:bg-white/90 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Package
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <TabsList className="bg-white/10 backdrop-blur-xl border-white/20">
            <TabsTrigger
              value="packages"
              className="data-[state=active]:bg-white data-[state=active]:text-purple-900"
            >
              <Wine className="w-4 h-4 mr-2" />
              Packages
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-white data-[state=active]:text-purple-900"
            >
              <Users className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-white data-[state=active]:text-purple-900"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Packages Tab */}
          <TabsContent value="packages" className="mt-6">
            {packagesLoading ? (
              <div className="flex justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                />
              </div>
            ) : (
              <div className="space-y-6">
                {packages?.length ? (
                  <div className="space-y-4">
                    {packages.map((pkg, index) => (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-gradient-card backdrop-blur-xl border-white/20 overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-white font-semibold text-lg">
                                    {pkg.name}
                                  </h3>
                                  <Badge
                                    className={`${
                                      pkg.isActive
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-gray-500/20 text-gray-400"
                                    }`}
                                  >
                                    {pkg.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigator.clipboard.writeText(pkg.code)
                                    }
                                    className="p-1 h-auto text-white/60 hover:text-white hover:bg-white/10"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>

                                <p className="text-white/70 text-sm mb-4">
                                  {pkg.description}
                                </p>

                                <div className="flex items-center space-x-4 text-sm text-white/60">
                                  <div className="flex items-center space-x-1">
                                    <Wine className="w-4 h-4" />
                                    <span>{pkg.wines?.length || 0} wines</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {new Date(
                                        pkg.createdAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePackageExpansion(pkg.id)}
                                className="text-white/60 hover:text-white hover:bg-white/10"
                              >
                                {expandedPackages.has(pkg.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  createSessionMutation.mutate(pkg.code)
                                }
                                className="text-white hover:bg-white/10"
                                disabled={createSessionMutation.isPending}
                              >
                                <QrCode className="w-4 h-4 mr-2" />
                                Create Session
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setLocation(`/editor/${pkg.code}`)
                                }
                                className="text-purple-300 hover:bg-purple-500/20 border border-purple-400/30"
                              >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit Package
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/10"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-black/90 border-white/20">
                                  <DropdownMenuItem 
                                    onClick={() => openPackageModal("view", pkg)}
                                    className="text-white hover:bg-white/10 cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openPackageModal("edit", pkg)}
                                    className="text-white hover:bg-white/10 cursor-pointer"
                                  >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Settings
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => deletePackageMutation.mutate(pkg.id)}
                                    className="text-red-300 hover:bg-red-500/20 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Package
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                                    <h4 className="text-white font-medium">
                                      Wines in Package
                                    </h4>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPackage(pkg);
                                        openWineModal("create");
                                      }}
                                      className="bg-white/10 text-white hover:bg-white/20"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add Wine
                                    </Button>
                                  </div>

                                  {pkg.wines && pkg.wines.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {pkg.wines.map((wine) => (
                                        <motion.div
                                          key={wine.id}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="bg-white/5 rounded-lg p-4 border border-white/10"
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <h5 className="text-white font-medium mb-1">
                                                {wine.wineName}
                                              </h5>
                                              <p className="text-white/60 text-sm mb-2">
                                                {wine.wineDescription}
                                              </p>
                                              <div className="flex items-center space-x-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    openSlideEditor(wine)
                                                  }
                                                  className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/20 text-xs"
                                                >
                                                  <Edit3 className="w-3 h-3 mr-1" />
                                                  Edit Slides ({wine.slides?.length || 0})
                                                </Button>
                                              </div>
                                            </div>

                                            <div className="flex space-x-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  openWineModal("edit", wine)
                                                }
                                                className="text-white/60 hover:text-white hover:bg-white/10"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  deleteWineMutation.mutate(
                                                    wine.id,
                                                  )
                                                }
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
                                      <p className="text-sm">
                                        No wines added yet
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedPackage(pkg);
                                          openWineModal("create");
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
                    <h3 className="text-white font-semibold text-lg mb-2">
                      No Wine Packages
                    </h3>
                    <p className="text-white/70 mb-6">
                      Create your first wine package to get started.
                    </p>
                    <Button
                      onClick={() => openPackageModal("create")}
                      className="bg-white text-purple-900 hover:bg-white/90"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Package
                    </Button>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-6">
            <div className="space-y-6">
              {sessionsLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
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
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <QrCode className="w-5 h-5 text-purple-400" />
                            <span className="text-white font-semibold">
                              {session.code}
                            </span>
                          </div>
                          <Badge
                            className={`${
                              session.status === "active"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {session.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm text-white/70 mb-4">
                          <div className="flex items-center justify-between">
                            <span>Package:</span>
                            <span className="text-white">
                              {session.packageCode}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Participants:</span>
                            <span className="text-white">
                              {session.participantCount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Created:</span>
                            <span className="text-white">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSessionForQR(session);
                              setShowQRModal(true);
                            }}
                            className="flex-1 text-white hover:bg-white/10"
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            QR Code
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/session/${session.id}/monitor`)}
                            className="flex-1 text-purple-300 hover:bg-purple-500/20"
                          >
                            <Monitor className="w-4 h-4 mr-2" />
                            Monitor
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-12 text-center">
                  <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">
                    No Active Sessions
                  </h3>
                  <p className="text-white/70 mb-6">
                    Create a session from your wine packages to get started.
                  </p>
                  <Button
                    onClick={() => setActiveTab("packages")}
                    className="bg-white text-purple-900 hover:bg-white/90"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Create Session
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              {packagesLoading || sessionsLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                  />
                </div>
              ) : (
                <>
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                      <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">
                        {packages?.length || 0}
                      </div>
                      <div className="text-white/70 text-sm">
                        Total Packages
                      </div>
                      <div className="text-green-400 text-xs mt-1">
                        {packages?.filter(p => p.isActive).length || 0} active
                      </div>
                    </Card>

                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                      <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">
                        {sessions?.length || 0}
                      </div>
                      <div className="text-white/70 text-sm">
                        Total Sessions
                      </div>
                      <div className="text-green-400 text-xs mt-1">
                        {sessions?.filter(s => s.status === 'active').length || 0} active
                      </div>
                    </Card>

                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                      <Activity className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">
                        {sessions?.reduce((total, s) => total + s.participantCount, 0) || 0}
                      </div>
                      <div className="text-white/70 text-sm">
                        Total Participants
                      </div>
                    </Card>

                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                      <BarChart3 className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">
                        {sessions && sessions.length > 0
                          ? Math.round(
                              (sessions.reduce((total, s) => total + s.participantCount, 0) /
                                sessions.length) *
                                10,
                            ) / 10
                          : 0}
                      </div>
                      <div className="text-white/70 text-sm">
                        Avg Participants
                      </div>
                    </Card>

                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                      <Wine className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">
                        {packages?.reduce((total, p) => total + (p.wines?.length || 0), 0) || 0}
                      </div>
                      <div className="text-white/70 text-sm">
                        Total Wines
                      </div>
                    </Card>
                  </div>

                  {/* Package Performance */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                      <h3 className="text-white font-semibold text-lg mb-4">
                        Package Performance
                      </h3>
                      <div className="space-y-4">
                        {packages?.slice(0, 5).map((pkg, index) => (
                          <motion.div
                            key={pkg.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white/5 rounded-lg p-4 border border-white/10"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
                                <h4 className="text-white font-medium">
                                  {pkg.name}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-white/20 text-white/70"
                                >
                                  {pkg.wines?.length || 0} wines
                                </Badge>
                              </div>
                              <div className="text-white/60 text-sm">
                                {sessions?.filter(s => s.packageCode === pkg.code).length || 0} sessions
                              </div>
                            </div>
                          </motion.div>
                        )) || []}
                      </div>
                    </Card>

                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                      <h3 className="text-white font-semibold text-lg mb-4">
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        {sessions?.slice(0, 5).map((session, index) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white/5 rounded-lg p-3 border border-white/10"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white font-medium text-sm">
                                  Session {session.code}
                                </div>
                                <div className="text-white/60 text-xs">
                                  {session.participantCount} participants
                                </div>
                              </div>
                              <Badge 
                                className={`text-xs ${
                                  session.status === 'active' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                {session.status}
                              </Badge>
                            </div>
                          </motion.div>
                        )) || []}
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Slide Editor Modal */}
      {slideEditorOpen && selectedWineForSlides && (
        <SlideEditor
          packageWineId={selectedWineForSlides.id}
          wineName={selectedWineForSlides.wineName}
          onClose={() => setSlideEditorOpen(false)}
        />
      )}

      {/* Package Modal */}
      {packageModalOpen && (
        <PackageModal
          mode={packageModalMode}
          package={selectedPackage}
          onClose={() => setPackageModalOpen(false)}
          onSave={(data) => {
            if (packageModalMode === "create") {
              createPackageMutation.mutate(data);
            } else if (packageModalMode === "edit" && selectedPackage) {
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
            console.log("Wine save triggered:", { data, mode: wineModalMode, packageId: selectedPackage.id });
            if (wineModalMode === "create") {
              const wineData = {
                ...data,
                packageId: selectedPackage.id,
              };
              console.log("Creating wine with data:", wineData);
              createWineMutation.mutate(wineData);
            } else if (wineModalMode === "edit" && selectedWine) {
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

function PackageModal({
  mode,
  package: pkg,
  onClose,
  onSave,
}: PackageModalProps) {
  const [formData, setFormData] = useState({
    name: pkg?.name || "",
    description: pkg?.description || "",
    isActive: pkg?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-lg p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">
            {mode === "create"
              ? "Create Package"
              : mode === "edit"
                ? "Edit Package"
                : "Package Details"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-white/80">Package Name</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="bg-white/10 border-white/20 text-white"
              placeholder="Enter package name"
              disabled={mode === "view"}
              required
            />
          </div>

          <div>
            <Label className="text-white/80">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="bg-white/10 border-white/20 text-white"
              placeholder="Enter package description"
              disabled={mode === "view"}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
              disabled={mode === "view"}
            />
            <Label className="text-white/80">Active Package</Label>
          </div>

          {mode !== "view" && (
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-white text-purple-900 hover:bg-white/90"
              >
                {mode === "create" ? "Create" : "Save Changes"}
              </Button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}