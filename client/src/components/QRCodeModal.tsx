import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, ExternalLink, QrCode, Users, Calendar, Clock, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface QRCodeModalProps {
  session: {
    id: string;
    packageId: string;
    packageCode: string;
    packageName: string;
    short_code: string;
    status: string;
    participantCount: number;
    startedAt: string;
    completedAt: string | null;
    updatedAt: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ session, isOpen, onClose }: QRCodeModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expandedParticipants, setExpandedParticipants] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Generate the session join URL
  const baseUrl = window.location.origin;
  const sessionCode = session.short_code || session.packageCode;
  const sessionUrl = `${baseUrl}/join?sessionId=${sessionCode}`;
  const joinUrl = sessionUrl;

  // Fetch participants when expanded
  const toggleParticipants = async () => {
    if (expandedParticipants) {
      setExpandedParticipants(false);
    } else {
      setExpandedParticipants(true);
      if (participants.length === 0) {
        setLoadingParticipants(true);
        try {
          const response = await apiRequest('GET', `/api/sessions/${session.id}/participants`, null);
          const participantData = await response.json();
          setParticipants(participantData);
        } catch (error) {
          console.error('Failed to fetch participants:', error);
          toast({
            title: "Error fetching participants",
            description: "Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingParticipants(false);
        }
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const openInNewWindow = () => {
    const newWindow = window.open('', '_blank', 'width=400,height=600');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - Session ${session.id.slice(0, 8)}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: system-ui, -apple-system, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .qr-container {
                background: white;
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                margin-bottom: 30px;
              }
              .session-info {
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                padding: 20px;
                border-radius: 15px;
                border: 1px solid rgba(255,255,255,0.2);
                max-width: 300px;
              }
              h1 { margin: 0 0 10px 0; font-size: 24px; }
              h2 { margin: 0 0 20px 0; font-size: 18px; opacity: 0.9; }
              .session-id { 
                font-family: monospace; 
                font-size: 16px; 
                letter-spacing: 2px;
                background: rgba(0,0,0,0.2);
                padding: 10px;
                border-radius: 8px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <h1>Wine Tasting Session</h1>
            <h2>Wine Package</h2>
            <div class="qr-container">
              <div id="qr-code"></div>
            </div>
            <div class="session-info">
              <div class="session-id">SESSION: ${sessionCode}</div>
              <p>Package: ${session.packageName || session.packageCode}</p>
              <p>Scan QR code or visit:<br><strong>${joinUrl}</strong></p>
            </div>
            <script src="https://unpkg.com/qrcode-generator@1.4.4/qrcode.js"></script>
            <script>
              const qr = qrcode(0, 'M');
              qr.addData('${joinUrl}');
              qr.make();
              document.getElementById('qr-code').innerHTML = qr.createImgTag(6, 8);
            </script>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] bg-gray-900 border-gray-700 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Session QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">{/* Add scrolling container */}
          {/* Session Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Session Code</span>
                <Badge variant="outline" className="font-mono text-xs border-gray-600 text-gray-300">
                  {sessionCode}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Package</span>
                <span className="text-white text-sm font-medium">
                  {session.packageName || session.packageCode}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Status</span>
                <Badge 
                  variant={session.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {session.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Participants</span>
                <button
                  onClick={toggleParticipants}
                  className="text-white hover:text-purple-300 transition-all duration-200 flex items-center gap-1 px-2 py-1 rounded-md bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50"
                >
                  <span>{session.participantCount}</span>
                  <ChevronUp 
                    className={`w-3 h-3 transition-transform duration-200 ${
                      expandedParticipants ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Expandable Participants List */}
          {expandedParticipants && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participants
                </h4>
                <div className="space-y-2 max-h-20 overflow-y-auto">
                  {loadingParticipants ? (
                    <div className="text-gray-400 text-xs p-2 text-center">Loading participants...</div>
                  ) : participants.length > 0 ? (
                    // Sort participants - host first, then others
                    [...participants]
                      .sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0))
                      .map((participant) => (
                        <div 
                          key={participant.id} 
                          className={`flex justify-between items-center text-xs p-2 rounded-md ${
                            participant.isHost 
                              ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/40' 
                              : 'bg-gray-700/50 hover:bg-gray-600/50'
                          } transition-colors`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-white/90 font-medium">{participant.displayName}</span>
                            {participant.isHost && (
                              <span className="px-1.5 py-0.5 bg-purple-500/40 text-purple-300 text-xs rounded-full font-medium">
                                HOST
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400">{participant.email}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-gray-400 text-xs p-2 text-center">No participants yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg flex justify-center">
            <QRCodeSVG
              value={joinUrl}
              size={160}
              level="M"
              includeMargin={true}
            />
          </div>

          {/* Session Code */}
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">Session Code</Label>
            <div className="flex gap-2">
              <Input
                value={sessionCode}
                readOnly
                className="bg-gray-800 border-gray-600 text-gray-300 font-mono text-lg font-bold text-center"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(sessionCode)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="text-center text-gray-400 text-xs space-y-1">
            <p>Participants can scan the QR code or enter the session code at:</p>
            <p className="font-mono text-purple-400">{baseUrl}/join</p>
            <p className="text-gray-500">Or use direct link:</p>
            <button
              onClick={() => copyToClipboard(joinUrl)}
              className="font-mono text-purple-400 hover:text-purple-300 underline cursor-pointer break-all"
            >
              {joinUrl}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={openInNewWindow}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>
            
            <Button
              onClick={() => copyToClipboard(sessionCode)}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Code
            </Button>
            
            <Button
              onClick={() => copyToClipboard(joinUrl)}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}