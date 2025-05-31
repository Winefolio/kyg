import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Wine, Calendar, Star } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  tastingSessions: TastingHistory[];
}

interface TastingHistory {
  id: string;
  packageName: string;
  packageCode: string;
  completedAt: Date;
  progress: number;
  answers: Record<string, any>;
  rating?: number;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserUpdate: (user: UserProfile) => void;
}

export function UserProfileModal({ isOpen, onClose, currentUser, onUserUpdate }: UserProfileModalProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(!currentUser);

  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email);
      setDisplayName(currentUser.displayName);
      setIsCreatingProfile(false);
    }
  }, [currentUser]);

  const handleSaveProfile = () => {
    const user: UserProfile = {
      id: currentUser?.id || crypto.randomUUID(),
      email,
      displayName,
      tastingSessions: currentUser?.tastingSessions || []
    };
    
    // Save to localStorage for persistence
    localStorage.setItem('wine_user_profile', JSON.stringify(user));
    onUserUpdate(user);
    onClose();
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!currentUser) return;
    
    const updatedSessions = currentUser.tastingSessions.filter(s => s.id !== sessionId);
    const updatedUser = { ...currentUser, tastingSessions: updatedSessions };
    
    localStorage.setItem('wine_user_profile', JSON.stringify(updatedUser));
    onUserUpdate(updatedUser);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-card border-white/20 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={20} />
            {isCreatingProfile ? "Create Your Profile" : "Your Wine Journey"}
          </DialogTitle>
          <DialogDescription className="text-purple-200">
            {isCreatingProfile 
              ? "Set up your profile to track your wine tasting experiences"
              : "View and manage your wine tasting history"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Form */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label htmlFor="displayName" className="text-white">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={!email.trim() || !displayName.trim()}
                className="w-full bg-gradient-button text-white"
              >
                {isCreatingProfile ? "Create Profile" : "Update Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* Tasting History */}
          {currentUser && currentUser.tastingSessions.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Wine size={20} />
                  Your Tasting History
                </CardTitle>
                <CardDescription className="text-purple-200">
                  {currentUser.tastingSessions.length} completed sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentUser.tastingSessions
                    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                    .map((session) => (
                      <div
                        key={session.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="text-white font-medium">{session.packageName}</h4>
                            <p className="text-purple-200 text-sm flex items-center gap-2">
                              <Calendar size={14} />
                              {new Date(session.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-white/20 text-white">
                              {session.packageCode}
                            </Badge>
                            {session.rating && (
                              <div className="flex items-center gap-1">
                                <Star size={14} className="text-yellow-400 fill-current" />
                                <span className="text-white text-sm">{session.rating}/10</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <div className="w-full bg-white/20 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                                style={{ width: `${session.progress}%` }}
                              />
                            </div>
                            <p className="text-white/60 text-xs mt-1">{session.progress}% completed</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              onClick={() => {
                                // Navigate back to this session
                                window.location.href = `/join?code=${session.packageCode}`;
                              }}
                            >
                              Revisit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30"
                              onClick={() => handleDeleteSession(session.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          )}

          {/* No History Message */}
          {currentUser && currentUser.tastingSessions.length === 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="text-center py-8">
                <Wine size={48} className="mx-auto text-white/40 mb-4" />
                <p className="text-white/60 mb-2">No tasting sessions yet</p>
                <p className="text-purple-200 text-sm">
                  Start your first wine tasting experience to build your journey
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}