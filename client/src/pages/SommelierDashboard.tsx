// client/pages/SommelierDashboard.tsx

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { QRCodeModal } from "@/components/QRCodeModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit3, Trash2, Wine, Users, BarChart3, Settings, Copy, Eye, QrCode, MoreVertical, Clock } from "lucide-react";

// --- Type Definitions ---
interface Package {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  wines: any[];
}

interface Session {
  id: string;
  packageCode: string;
  code: string;
  participantCount: number;
  status: string;
  createdAt: string;
}

type PackageModalMode = "create" | "edit" | "view";

export default function SommelierDashboard() {
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState<PackageModalMode>("view");
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState<Session | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- Data Fetching ---
  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  // --- Mutations ---
  const createPackageMutation = useMutation({
    mutationFn: (data: { name: string; description: string; }) => apiRequest("POST", "/api/packages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setPackageModalOpen(false);
      toast({ title: "Package created successfully", description: "Your new wine package is ready to be configured." });
    },
    onError: (error: any) => {
      toast({ title: "Error creating package", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/packages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setPackageModalOpen(false);
      toast({ title: "Package updated successfully" });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "Package deleted successfully" });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (packageCode: string) => apiRequest("POST", "/api/sessions", { packageCode, createHost: false }),
    onSuccess: (session: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setSelectedSessionForQR(session.session as Session);
      setShowQRModal(true);
      toast({ title: "Session created successfully" });
    },
  });

  // --- Event Handlers ---
  const openPackageModal = (mode: PackageModalMode, pkg?: Package) => {
    setPackageModalMode(mode);
    setSelectedPackage(pkg || null);
    setPackageModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Packages</h1>
          <Button onClick={() => openPackageModal("create")} className="bg-white text-purple-900 hover:bg-white/90">
            <Plus className="w-4 h-4 mr-2" /> New Package
          </Button>
        </div>

        {packagesLoading ? (
          <div className="text-center text-white/70">Loading packages...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages?.map((pkg, index) => (
              <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="bg-gradient-card backdrop-blur-xl border-white/20 h-full flex flex-col justify-between">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-white font-semibold text-lg">{pkg.name}</h3>
                      <Badge className={pkg.isActive ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"}>
                        {pkg.isActive ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-white/60 text-sm mb-4 min-h-[40px]">{pkg.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-white/50">
                      <div className="flex items-center space-x-1"><Wine size={14} /><span>{pkg.wines?.length || 0} Wines</span></div>
                      <div className="flex items-center space-x-1"><Clock size={14} /><span>{new Date(pkg.createdAt).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => createSessionMutation.mutate(pkg.code)} className="text-white/80 hover:bg-white/10 hover:text-white">
                      <QrCode className="w-4 h-4 mr-2" /> Create Session
                    </Button>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:bg-white/10" onClick={() => setLocation(`/editor/${pkg.code}`)}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                          <DropdownMenuItem onSelect={() => openPackageModal("edit", pkg)} className="hover:bg-gray-700"><Settings className="w-4 h-4 mr-2" />Settings</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => deletePackageMutation.mutate(pkg.id)} className="text-red-400 hover:bg-red-500/20 focus:text-white focus:bg-red-500/30"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {packageModalOpen && (
        <PackageModal
          mode={packageModalMode}
          packageData={selectedPackage}
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

      {showQRModal && selectedSessionForQR && (
        <QRCodeModal session={selectedSessionForQR} isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
      )}
    </div>
  );
}

// Separate PackageModal Component for Clarity
interface PackageModalProps {
  mode: PackageModalMode;
  packageData: Package | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

function PackageModal({ mode, packageData, onClose, onSave }: PackageModalProps) {
  const [formData, setFormData] = useState({
    name: packageData?.name || "",
    description: packageData?.description || "",
    isActive: packageData?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return; // Basic validation
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-card border border-white/20 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{mode === 'create' ? 'Create New Package' : 'Edit Package'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-white/80">Package Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/10 border-white/20 text-white" placeholder="e.g., 'A Tour of Tuscany'" required />
          </div>
          <div>
            <Label className="text-white/80">Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-white/10 border-white/20 text-white" placeholder="A short description for your tasting experience" rows={3} />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
            <Label htmlFor="isActive" className="text-white/80">Set as Active</Label>
          </div>
          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 text-white hover:bg-white/10">Cancel</Button>
            <Button type="submit" className="flex-1 bg-white text-purple-900 hover:bg-white/90">Save</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}