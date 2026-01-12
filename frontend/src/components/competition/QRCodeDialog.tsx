import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Download, Copy, QrCode } from "lucide-react";
import { useState, useRef } from "react";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  description?: string;
}

export function QRCodeDialog({
  open,
  onOpenChange,
  url,
  title,
  description,
}: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    const canvas = qrRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-code-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-fairway font-display">
            <QrCode className="h-5 w-5 text-turf" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-charcoal/70">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* QR Code Display - centered and prominent */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="bg-scorecard p-4 rounded-xl border border-soft-grey shadow-sm">
            <QRCodeCanvas
              ref={qrRef}
              value={url}
              size={256}
              level="M"
              includeMargin={true}
              bgColor="#F8F9FA"
              fgColor="#1B4332"
            />
          </div>

          {/* Action Buttons - small and subtle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-turf hover:text-fairway hover:bg-turf/10"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-turf hover:text-fairway hover:bg-turf/10"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
