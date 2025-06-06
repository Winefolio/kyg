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
  Download
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

export default function SommelierDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('packages');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState<PackageModalMode>('view');
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
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

  const copyPackageCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Package code copied to clipboard" });
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex space-x-1 mb-8 bg-white/10 rounded-2xl p-1"
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
              className={`flex-1 ${
                activeTab === tab.id 
                  ? 'bg-white text-purple-900' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pkg, index) => (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 hover:border-white/30 transition-all duration-300">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-white font-semibold text-lg">{pkg.name}</h3>
                                <Badge 
                                  variant={pkg.isActive ? "default" : "secondary"}
                                  className={pkg.isActive ? "bg-green-500/20 text-green-200" : "bg-gray-500/20 text-gray-200"}
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
                              
                              <p className="text-white/70 text-sm mb-4 line-clamp-2">{pkg.description}</p>
                              
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
                              onClick={() => openPackageModal('view', pkg)}
                              className="flex-1 text-white hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPackageModal('edit', pkg)}
                              className="flex-1 text-white hover:bg-white/10"
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
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
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-white hover:bg-white/10"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                          </Button>
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
                <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">Analytics Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">{packages?.length || 0}</div>
                      <div className="text-white/70 text-sm">Total Packages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">{sessions?.length || 0}</div>
                      <div className="text-white/70 text-sm">Active Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {sessions?.reduce((acc, s) => acc + s.participantCount, 0) || 0}
                      </div>
                      <div className="text-white/70 text-sm">Total Participants</div>
                    </div>
                  </div>
                </Card>
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

function PackageModal({ mode, package: pkg, onClose, onSave }: PackageModalProps) {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    code: pkg?.code || '',
    description: pkg?.description || '',
    isActive: pkg?.isActive ?? true
  });

  const handleSave = () => {
    onSave(formData);
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
        className="bg-gradient-card backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-xl">
            {mode === 'create' ? 'Create Package' : mode === 'edit' ? 'Edit Package' : 'Package Details'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-white">Package Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-white/10 border-white/20 text-white"
              placeholder="Enter package name"
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label className="text-white">Package Code</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              className="bg-white/10 border-white/20 text-white font-mono"
              placeholder="WINE01"
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label className="text-white">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-white/10 border-white/20 text-white"
              placeholder="Describe this wine package"
              disabled={isReadOnly}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              disabled={isReadOnly}
            />
            <Label className="text-white">Active Package</Label>
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
        </div>
      </motion.div>
    </motion.div>
  );
}