import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Sparkles,
  Monitor
} from 'lucide-react';

export interface QRCodeGeneratorProps {
  labId: string;
  station: string;
  labName?: string;
  size?: number;
  className?: string;
  showDetails?: boolean;
  showPrintButton?: boolean;
  showDownloadButton?: boolean;
  showCopyLinkButton?: boolean;
  compact?: boolean;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  labId,
  station,
  labName = 'ICT Laboratory',
  size = 200,
  className = '',
  showDetails = true,
  showPrintButton = true,
  showDownloadButton = true,
  showCopyLinkButton = true,
  compact = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Generate URL that will open the app and trigger check-in modal for this station
  const checkInUrl = useMemoUrl(labId, station);

  useEffect(() => {
    let isSubscribed = true;
    setIsGenerating(true);

    QRCode.toDataURL(checkInUrl, {
      width: size * 2, // High resolution for sharp printing & crisp display
      margin: 2,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H', // High error tolerance for desk stickers
    })
      .then((url) => {
        if (isSubscribed) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        if (isSubscribed) {
          setIsGenerating(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [checkInUrl, size]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = checkInUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QRCode_${labName.replace(/\s+/g, '_')}_${station}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    // Open a dedicated clean print window formatted like a physical workstation sticker
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Badge - ${station} (${labName})</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              background-color: #ffffff;
              color: #18181b;
            }
            .badge-card {
              width: 320px;
              border: 2px solid #18181b;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              box-sizing: border-box;
            }
            .header-tag {
              display: inline-block;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #71717a;
              margin-bottom: 4px;
            }
            .lab-name {
              font-size: 15px;
              font-weight: 700;
              color: #09090b;
              margin: 0 0 4px 0;
            }
            .station-id {
              display: inline-block;
              font-size: 26px;
              font-weight: 800;
              font-family: monospace;
              background: #f4f4f5;
              border: 1px solid #e4e4e7;
              padding: 4px 16px;
              border-radius: 8px;
              margin: 8px 0 16px 0;
            }
            .qr-wrapper {
              margin: 12px auto;
              width: 200px;
              height: 200px;
            }
            .qr-wrapper img {
              width: 100%;
              height: 100%;
              display: block;
            }
            .instructions {
              font-size: 12px;
              font-weight: 600;
              color: #27272a;
              margin: 12px 0 4px 0;
            }
            .sub-instructions {
              font-size: 10px;
              color: #71717a;
              margin: 0 0 12px 0;
            }
            .footer-line {
              border-top: 1px dashed #d4d4d8;
              padding-top: 8px;
              font-size: 9px;
              font-family: monospace;
              color: #a1a1aa;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="badge-card">
            <span class="header-tag">MMA ICT TrackLab</span>
            <div class="lab-name">${escapeHtml(labName)}</div>
            <div class="station-id">${escapeHtml(station)}</div>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="QR Code for ${escapeHtml(station)}" />
            </div>
            <div class="instructions">Scan to Check In</div>
            <div class="sub-instructions">Point camera at QR code to open workstation session</div>
            <div class="footer-line">Station Desk Pass · Real-Time Tracking</div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (compact) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Code for ${station}`}
            className="rounded-lg border border-zinc-200 bg-white p-1.5 shadow-2xs"
            style={{ width: size, height: size }}
          />
        ) : (
          <div 
            className="flex items-center justify-center bg-zinc-100 rounded-lg border border-zinc-200 animate-pulse"
            style={{ width: size, height: size }}
          >
            <QrCode className="w-8 h-8 text-zinc-300" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Station Pass Card */}
      <div 
        ref={printContainerRef}
        className="w-full max-w-xs bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col items-center relative group"
      >
        {/* Header Tag */}
        <div className="flex items-center gap-1.5 mb-1 text-zinc-400 text-[10px] uppercase font-semibold tracking-wider">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Workstation Instant Pass</span>
        </div>

        <h4 className="text-xs font-bold text-zinc-900 truncate max-w-[220px]">
          {labName}
        </h4>

        {/* Station Number Badge */}
        <div className="mt-2 mb-3 px-3 py-1 bg-zinc-900 text-white rounded-lg font-mono font-extrabold text-sm tracking-widest shadow-2xs">
          {station}
        </div>

        {/* Scannable QR Code Image */}
        <div className="relative p-2 bg-white rounded-xl border border-zinc-200 shadow-inner my-1 flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${station} (${labName})`}
              className="rounded-lg object-contain transition-transform group-hover:scale-102"
              style={{ width: size, height: size }}
            />
          ) : (
            <div 
              className="flex items-center justify-center bg-zinc-50 rounded-lg"
              style={{ width: size, height: size }}
            >
              <QrCode className="w-10 h-10 text-zinc-300 animate-pulse" />
            </div>
          )}
        </div>

        {/* Instructions */}
        {showDetails && (
          <div className="mt-3 text-center">
            <p className="text-xs font-semibold text-zinc-800 flex items-center justify-center gap-1">
              <span>Scan to Check In</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Open your phone camera to instantly start a session on this PC.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full max-w-xs">
        {showPrintButton && (
          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrDataUrl || isGenerating}
            className="flex-1 min-w-[90px] py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Print printable desk sticker badge"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Badge</span>
          </button>
        )}

        {showDownloadButton && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl || isGenerating}
            className="flex-1 min-w-[90px] py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Download PNG image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save PNG</span>
          </button>
        )}

        {showCopyLinkButton && (
          <button
            type="button"
            onClick={handleCopyLink}
            className="py-1.5 px-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Copy direct check-in link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Link</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Helper to construct the check-in URL safely
function useMemoUrl(labId: string, station: string) {
  return React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams();
    params.set('labId', labId);
    params.set('station', station);
    return `${base}?${params.toString()}`;
  }, [labId, station]);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
