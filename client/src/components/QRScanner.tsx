// Simplified for build optimization
import { Button } from "@/components/ui/button";
import { Camera } from "@/lib/icons";
import { useHaptics } from "@/hooks/useHaptics";

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: () => void;
  className?: string;
}

export function QRScanner({ onScan, onError, className }: QRScannerProps) {
  const { triggerHaptic } = useHaptics();
  
  // Simplified manual input for production build compatibility
  const handleManualInput = () => {
    const code = prompt("Enter session code:");
    if (code && code.trim()) {
      onScan(code.trim().toUpperCase());
      triggerHaptic("success");
    }
  };

  return (
    <div className={`relative w-full max-w-sm mx-auto ${className}`}>
      <div className="flex flex-col items-center justify-center p-8 bg-gradient-card backdrop-blur-xl border border-white/20 rounded-xl">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
          <Camera className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Enter Session Code</h3>
        <p className="text-white/70 text-center mb-6 text-sm">
          Enter the 6-character session code to join
        </p>
        <Button 
          onClick={handleManualInput}
          className="w-full bg-gradient-button text-white font-semibold py-3"
        >
          Enter Code Manually
        </Button>
      </div>
    </div>
  );
}