import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Share2,
  Copy,
  Check,
  Download,
  Printer,
  Smartphone,
  Trophy,
  Camera,
  FileText,
  Flame,
  ArrowLeft,
} from 'lucide-react';
import { useDemerits } from '../context/DemeritsContext';

type TargetPath = '/' | '/submit' | '/docket';

export const SharePage: React.FC = () => {
  const { demerits } = useDemerits();
  const [selectedPath, setSelectedPath] = useState<TargetPath>('/');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://copperdemerits.com';
  const fullShareUrl = `${baseUrl}${selectedPath === '/' ? '' : selectedPath}`;

  const approvedSlips = demerits.filter((d) => d.status === 'approved' && Boolean(d.image_url));
  const totalDemeritPoints = approvedSlips.reduce((sum, s) => sum + s.demerit_count, 0);

  // Check Web Share API support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  // Generate QR Code data URL
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(fullShareUrl, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#121212',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });

    return () => {
      isMounted = false;
    };
  }, [fullShareUrl]);

  // Handle native Web Share
  const handleNativeShare = async () => {
    const title = 'Copper Demerits — Ring of Honor';
    const text = 'Check out the live backbar demerit standings, top infractions, and drop slips at Copper Athletic Club!';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: fullShareUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Handle Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback prompt
      window.prompt('Copy this link:', fullShareUrl);
    }
  };

  // Handle Download QR PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const pathSlug = selectedPath === '/' ? 'home' : selectedPath.replace('/', '');
    a.download = `copper-demerits-${pathSlug}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle Print Backbar Tent Sign
  const handlePrintSign = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 pt-4 sm:pt-6 pb-16 space-y-6">
      {/* Top Breadcrumb Header - Hidden in Print */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-athletic font-bold uppercase tracking-wider text-[#A3968A] hover:text-[#DFC15E] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Scoreboard</span>
        </Link>
        <span className="font-mono-docket text-[11px] text-[#DFC15E] uppercase tracking-widest">
          ⚡ 1-TAP BACKBAR SHARING
        </span>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: QR Code Display Card (Printable Section) */}
        <div className="md:col-span-7 space-y-4">
          <div
            id="printable-qr-sign"
            className="relative overflow-hidden rounded-3xl border-2 border-[#DFC15E] bg-[#171310] p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(223,193,94,0.2)] print:border-4 print:border-black print:bg-white print:text-black print:p-8 print:shadow-none"
          >
            {/* Header Brand Badge */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <img
                src="/brand/CopperLogo_Web.png"
                alt="Copper Athletic Club"
                className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(184,115,51,0.5)] print:filter print:grayscale"
              />
              <div className="text-left border-l-2 border-[#B87333]/50 pl-3 print:border-black">
                <h1 className="font-athletic text-lg sm:text-2xl font-black uppercase tracking-wider text-[#F5F2EB] leading-none print:text-black">
                  RING OF <span className="text-[#DFC15E] print:text-black">DEMERITS</span>
                </h1>
                <p className="font-mono-docket text-[11px] text-[#DFC15E] tracking-widest uppercase mt-0.5 print:text-black">
                  Official Backbar Docket &amp; Scoreboard
                </p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="relative mx-auto my-4 inline-block rounded-2xl bg-white p-4 shadow-[0_0_35px_rgba(223,193,94,0.35)] print:p-2 print:shadow-none">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Copper Demerits QR Code"
                  className="h-56 w-56 sm:h-64 sm:w-64 object-contain rounded-lg"
                />
              ) : (
                <div className="flex h-56 w-56 sm:h-64 sm:w-64 items-center justify-center text-xs text-neutral-500 font-mono-docket">
                  Generating QR Code...
                </div>
              )}
            </div>

            {/* Callout Prompt */}
            <div className="space-y-1.5 mt-2">
              <span className="inline-block rounded-full bg-[#DFC15E] px-3 py-1 font-athletic text-xs font-black uppercase tracking-wider text-[#121212] print:border print:border-black print:bg-white print:text-black">
                Scan With Phone Camera
              </span>
              <p className="font-mono-docket text-xs text-[#E8B888] print:text-black font-semibold">
                Instant Access · No App Store Needed · 1-Tap Home Screen Install
              </p>
              <div className="pt-2">
                <code className="rounded-lg bg-black/60 px-3 py-1 font-mono-docket text-xs text-[#DFC15E] border border-[#B87333]/30 print:bg-transparent print:border-none print:text-black print:text-sm print:font-bold">
                  {fullShareUrl}
                </code>
              </div>
            </div>

            {/* Current Backbar Stats Footer inside card */}
            <div className="mt-5 pt-4 border-t border-[#B87333]/30 flex items-center justify-center gap-4 text-[11px] font-mono-docket text-[#B5A99D] print:border-black print:text-black">
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-[#DFC15E]" />
                <strong className="text-white print:text-black">{totalDemeritPoints}</strong> Total Demerit Pts
              </span>
              <span>•</span>
              <span>
                <strong className="text-white print:text-black">{approvedSlips.length}</strong> Official Slips Logged
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Sharing Controls & Actions (Hidden in Print) */}
        <div className="md:col-span-5 space-y-4 print:hidden">
          {/* Target Destination Selector */}
          <div className="rounded-2xl border border-[#B87333]/40 bg-[#151210] p-4 space-y-3">
            <h2 className="font-athletic text-xs font-bold uppercase tracking-wider text-[#DFC15E]">
              1. Choose Where QR Code Points
            </h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedPath('/')}
                className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  selectedPath === '/'
                    ? 'border-[#DFC15E] bg-[#DFC15E]/15 text-[#F5F2EB]'
                    : 'border-white/5 bg-white/5 text-[#A3968A] hover:bg-white/10 hover:text-[#F5F2EB]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className={`h-4 w-4 ${selectedPath === '/' ? 'text-[#DFC15E]' : ''}`} />
                  <div>
                    <span className="block font-athletic text-xs font-bold uppercase">
                      Live Scoreboard &amp; Standings
                    </span>
                    <span className="text-[10px] font-mono-docket text-[#A3968A]">copperdemerits.com/</span>
                  </div>
                </div>
                {selectedPath === '/' && <Check className="h-4 w-4 text-[#DFC15E]" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPath('/submit')}
                className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  selectedPath === '/submit'
                    ? 'border-[#DFC15E] bg-[#DFC15E]/15 text-[#F5F2EB]'
                    : 'border-white/5 bg-white/5 text-[#A3968A] hover:bg-white/10 hover:text-[#F5F2EB]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Camera className={`h-4 w-4 ${selectedPath === '/submit' ? 'text-[#DFC15E]' : ''}`} />
                  <div>
                    <span className="block font-athletic text-xs font-bold uppercase">
                      Drop A Demerit Slip (Camera)
                    </span>
                    <span className="text-[10px] font-mono-docket text-[#A3968A]">copperdemerits.com/submit</span>
                  </div>
                </div>
                {selectedPath === '/submit' && <Check className="h-4 w-4 text-[#DFC15E]" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPath('/docket')}
                className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  selectedPath === '/docket'
                    ? 'border-[#DFC15E] bg-[#DFC15E]/15 text-[#F5F2EB]'
                    : 'border-white/5 bg-white/5 text-[#A3968A] hover:bg-white/10 hover:text-[#F5F2EB]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className={`h-4 w-4 ${selectedPath === '/docket' ? 'text-[#DFC15E]' : ''}`} />
                  <div>
                    <span className="block font-athletic text-xs font-bold uppercase">
                      The Docket (Wall of Slips)
                    </span>
                    <span className="text-[10px] font-mono-docket text-[#A3968A]">copperdemerits.com/docket</span>
                  </div>
                </div>
                {selectedPath === '/docket' && <Check className="h-4 w-4 text-[#DFC15E]" />}
              </button>
            </div>
          </div>

          {/* Quick 1-Tap Share Actions */}
          <div className="rounded-2xl border border-[#B87333]/40 bg-[#151210] p-4 space-y-3">
            <h2 className="font-athletic text-xs font-bold uppercase tracking-wider text-[#DFC15E]">
              2. Share With Patrons &amp; Friends
            </h2>

            <div className="space-y-2.5">
              {/* Native Mobile Share Button */}
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DFC15E] via-[#E8B888] to-[#B87333] px-4 py-3 font-athletic text-xs font-black uppercase tracking-wider text-[#121212] shadow-[0_0_20px_rgba(223,193,94,0.35)] hover:brightness-110 active:scale-98 transition cursor-pointer"
                >
                  <Share2 className="h-4 w-4 stroke-[2.5]" />
                  <span>{shareSuccess ? 'Shared!' : 'Share via Text / Message'}</span>
                </button>
              )}

              {/* Copy Direct Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#B87333]/60 bg-[#B87333]/20 px-4 py-2.5 font-athletic text-xs font-bold uppercase tracking-wider text-[#E8B888] hover:bg-[#B87333] hover:text-[#121212] transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied To Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Link ({selectedPath === '/' ? 'Home' : selectedPath})</span>
                  </>
                )}
              </button>

              {/* Download PNG for signs / flyers */}
              <button
                type="button"
                onClick={handleDownloadQr}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-athletic text-xs font-semibold uppercase tracking-wider text-[#D6C7B8] hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Save QR Image (.PNG)</span>
              </button>

              {/* Print Physical Placard / Table Tent */}
              <button
                type="button"
                onClick={handlePrintSign}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-athletic text-xs font-semibold uppercase tracking-wider text-[#D6C7B8] hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Tabletop Placard / Backbar Card</span>
              </button>
            </div>
          </div>

          {/* Tips for Bar Staff & Regulars */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-athletic font-bold uppercase text-[#DFC15E]">
              <Smartphone className="h-3.5 w-3.5" />
              <span>How To Use At The Bar</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[#A3968A] text-[11px] font-mono-docket leading-relaxed">
              <li>Open any smartphone camera and aim at the QR code.</li>
              <li>Tap the pop-up link to open the live Ring of Honor.</li>
              <li>Tap <strong className="text-white">Install App</strong> to add the 1-tap app to your home screen!</li>
              <li>Bar staff can print this page for backbar taps or tent cards.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
