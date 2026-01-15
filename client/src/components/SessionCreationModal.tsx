import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Wine, 
  Users, 
  User, 
  Mail, 
  Play, 
  Settings,
  Calendar,
  Clock,
  Check,
  ArrowRight
} from 'lucide-react';

interface SessionCreationModalProps {
  packageCode: string;
  packageName: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: any) => void;
}

export function SessionCreationModal({ 
  packageCode, 
  packageName, 
  isOpen, 
  onClose, 
  onSessionCreated 
}: SessionCreationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [createHost, setCreateHost] = useState(true);
  const [hostName, setHostName] = useState('');
  const [hostDisplayName, setHostDisplayName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [startImmediately, setStartImmediately] = useState(false);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await apiRequest('POST', '/api/sessions', sessionData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      // The API returns { session, hostParticipantId }, so we need to extract the session
      const session = data.session || data;
      onSessionCreated(session);
      toast({
        title: 'Session Created Successfully!',
        description: `Your wine tasting session "${sessionName || packageName}" is ready for participants.`,
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error Creating Session',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSessionName('');
    setSessionDescription('');
    setCreateHost(true);
    setHostName('');
    setHostDisplayName('');
    setHostEmail('');
    setStartImmediately(false);
    setCurrentStep(1);
  };

  const handleCreateSession = () => {
    const sessionData = {
      packageCode,
      name: sessionName || packageName,
      description: sessionDescription,
      createHost,
      hostName: createHost ? hostName : undefined,
      hostDisplayName: createHost ? hostDisplayName : undefined,
      hostEmail: createHost ? hostEmail : undefined,
      startImmediately,
    };

    createSessionMutation.mutate(sessionData);
  };

  const canProceedToStep2 = sessionName.trim() !== '' || packageName;
  const canProceedToStep3 = !createHost || (hostName.trim() !== '' && hostDisplayName.trim() !== '');
  const canCreateSession = canProceedToStep3;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step
                ? 'bg-gradient-button text-white'
                : 'bg-white/10 text-white/50'
            }`}
          >
            {currentStep > step ? <Check size={16} /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 mx-2 ${
                currentStep > step ? 'bg-gradient-button' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Wine className="w-12 h-12 text-purple-300 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-white mb-2">Session Details</h3>
        <p className="text-purple-200 text-sm">
          Configure your wine tasting session for "{packageName}"
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="sessionName" className="text-white mb-2 block">
            Session Name
          </Label>
          <Input
            id="sessionName"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder={`${packageName} Tasting Session`}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
          <p className="text-white/60 text-xs mt-1">
            Leave empty to use the package name
          </p>
        </div>

        <div>
          <Label htmlFor="sessionDescription" className="text-white mb-2 block">
            Description (Optional)
          </Label>
          <Textarea
            id="sessionDescription"
            value={sessionDescription}
            onChange={(e) => setSessionDescription(e.target.value)}
            placeholder="Add any special notes or instructions for this tasting session..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 text-purple-300 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-white mb-2">Host Configuration</h3>
        <p className="text-purple-200 text-sm">
          Set up the host account for managing this session
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div>
            <Label className="text-white font-medium">Create Host Account</Label>
            <p className="text-white/60 text-sm">
              Allow host to manage the session and view analytics
            </p>
          </div>
          <Switch
            checked={createHost}
            onCheckedChange={setCreateHost}
          />
        </div>

        {createHost && (
          <div className="space-y-4 p-4 rounded-lg bg-white/5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hostName" className="text-white mb-2 block">
                  Host Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="hostName"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="John Smith"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label htmlFor="hostDisplayName" className="text-white mb-2 block">
                  Display Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="hostDisplayName"
                  value={hostDisplayName}
                  onChange={(e) => setHostDisplayName(e.target.value)}
                  placeholder="John"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="hostEmail" className="text-white mb-2 block">
                Email (Optional)
              </Label>
              <Input
                id="hostEmail"
                type="email"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                placeholder="john@example.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Settings className="w-12 h-12 text-purple-300 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-white mb-2">Session Settings</h3>
        <p className="text-purple-200 text-sm">
          Final configuration before creating your session
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div>
            <Label className="text-white font-medium">Start Session Immediately</Label>
            <p className="text-white/60 text-sm">
              Begin the tasting session as soon as it's created
            </p>
          </div>
          <Switch
            checked={startImmediately}
            onCheckedChange={setStartImmediately}
          />
        </div>

        <Separator className="bg-white/20" />

        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Session Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Package:</span>
              <span className="text-white">{packageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Session Name:</span>
              <span className="text-white">{sessionName || packageName}</span>
            </div>
            {createHost && (
              <>
                <div className="flex justify-between">
                  <span className="text-white/70">Host:</span>
                  <span className="text-white">{hostDisplayName}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-white/70">Status:</span>
              <span className="text-white">
                {startImmediately ? 'Active' : 'Waiting'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-primary border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">
            Create New Session
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {renderStepIndicator()}

          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          <div className="flex justify-between pt-6 mt-6 border-t border-white/20">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? onClose : prevStep}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>

            <div className="flex gap-3">
              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !canProceedToStep2) ||
                    (currentStep === 2 && !canProceedToStep3)
                  }
                  className="bg-gradient-button text-white"
                >
                  Next Step
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateSession}
                  disabled={!canCreateSession || createSessionMutation.isPending}
                  className="bg-gradient-button text-white"
                >
                  {createSessionMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play size={16} className="mr-2" />
                      Create Session
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
