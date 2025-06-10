import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, ExternalLink, QrCode, Users, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  // Generate the session join URL
  const baseUrl = window.location.origin;
  const sessionUrl = `${baseUrl}/join`;
  const sessionCode = session.short_code || session.packageCode;

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
              <p>Scan QR code or visit:<br><strong>${sessionUrl}</strong></p>
            </div>
            <script src="https://unpkg.com/qrcode-generator@1.4.4/qrcode.js"></script>
            <script>
              const qr = qrcode(0, 'M');
              qr.addData('${sessionUrl}');
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
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Session QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                <span className="text-gray-400 text-sm">Session ID</span>
                <Badge variant="outline" className="font-mono text-xs border-gray-600 text-gray-300">
                  {session.id.slice(0, 8).toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Package</span>
                <span className="text-white text-sm font-medium">
                  {session.packageCode || 'Wine Package'}
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
                <span className="text-white text-sm">
                  {session.participantCount} / 50
                </span>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <div className="bg-white p-6 rounded-lg flex justify-center">
            <QRCodeSVG
              value={sessionCode}
              size={200}
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
          <div className="text-center text-gray-400 text-sm">
            <p>Participants can scan the QR code or enter the session code at:</p>
            <p className="font-mono text-purple-400 mt-1">{baseUrl}/join</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={openInNewWindow}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Window
            </Button>
            
            <Button
              onClick={() => copyToClipboard(session.id.slice(0, 8).toUpperCase())}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-xs">
              Participants can join by scanning the QR code or entering session code: 
              <span className="font-mono font-bold text-white ml-1">
                {session.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}