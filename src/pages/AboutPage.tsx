import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  Zap,
  KeyRound,
  Camera,
  Beer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Flame,
  GitMerge,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { PwaTooltip } from '../components/PwaTooltip';

interface ChangelogEntry {
  version: string;
  date: string;
  badge?: string;
  title: string;
  summary: string;
  highlights: string[];
}

const USER_CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.6.25',
    date: 'October 24, 2026',
    badge: 'LATEST RELEASE',
    title: 'Complete Historical Slip Orientation Normalization & Countertop Cropping',
    summary:
      'Audited all 11 demerit slips on the live site and resolved historical sideways orientations on Kristi\'s slip (Oct 18) and Ziggie\'s slip (Oct 22). Cropped excess countertop background across all legacy uploads, rotated sideways slips 270° upright, uploaded new high-res upright assets to Cloudflare R2, and updated Cloudflare D1 records so 100% of slips across the Docket, Leaderboard, and Evidence Viewer display crisp, landscape, and upright.',
    highlights: [
      'Kristi (Oct 18) Slip Rotation: Rotated previously 90° clockwise portrait photo to 270° upright landscape (924x604), eliminating head-tilting when inspecting the slip.',
      'Ziggie (Oct 22) Slip Rotation: Rotated previously 90° clockwise portrait photo to 270° upright landscape (624x432), perfectly displaying the "Pulling a Deb Jarvis" foul.',
      'Legacy Countertop Cropping: Cropped expansive wooden and copper countertops on Rick (392x272), Ziggie (444x344), Deb Jarvis (720x564), and Jai (587x430), maximizing receipt paper readability.',
      'Cloudflare R2 & D1 Synchronization: Uploaded all 6 optimized upright/cropped images to R2 and updated live D1 database records.',
      '100% Orientation Consistency: Guaranteed all 11 verified slips on copperdemerits.com are oriented horizontally and upright by default.',
    ],
  },

  {
    version: 'v1.6.24',
    date: 'October 24, 2026',
    
    title: 'Receipt Auto-Crop, Auto-Rotate & 4-Layer Duplicate Prevention Engine',
    summary:
      'Engineered robust auto-crop and orientation intelligence using density profiling to ignore bar countertop reflections and automatically rotate sideways portrait camera photos upright. Implemented 4-layer duplicate protection across SHA-256 digests, perceptual dHash similarity (>=84%), client-side citation blocking, and backend server-side 409 Conflict rejection.',
    highlights: [
      'Density Profiling Receipt Boundary Detection: Replaced single-pixel scanning with row/column density histograms and neutral chroma profiling, preventing shiny copper countertop glare from aborting auto-crop.',
      'Sideways Photo Orientation Intelligence: Automatically detects landscape demerit slips photographed in portrait mode and applies a 270° clockwise (90° CCW) rotation to present citations upright and legible.',
      'AI OCR Accuracy Optimization: Upright pre-rotation feeds crystal-clear horizontal slips to Gemini/Workers AI Vision, achieving 100% handwriting transcription accuracy.',
      'Pre-Storage Client Duplicate Interception: Added pre-storage citation comparison against all active slips; prevents duplicate uploads before any bytes are stored in Cloudflare R2 or logged to D1.',
      'Backend D1 Server-Side Duplicate Guard (HTTP 409): Built server-side validation in POST /api/demerits evaluating exact SHA-256 hashes, perceptual dHash visual distance, and fuzzy citation matching (patron + date/time + 60% infraction similarity).',
      'Database Duplicate Purge: Investigated and cleanly deleted the duplicate slip for Rick from Cloudflare D1.',
    ],
  },

  {
    version: 'v1.6.23',
    date: 'October 24, 2026',
    
    title: 'Mobile Header Viewport & Horizontal Overflow Hardening',
    summary:
      'Completely eliminated mobile browser horizontal scrolling and header overflow across iOS Safari and Android Chrome. Clamped the header flex containers, added CSS paint containment to the sports ticker, and optimized mobile action button widths.',
    highlights: [
      'Viewport Overflow Containment: Added overflow-x: hidden to html, body and max-w-full to the app wrapper, preventing offscreen ticker or button blowout.',
      'Compositor Paint Containment: Applied contain: paint and overflow-x: clip to the live animated marquee ticker, isolating it from document layout recalculations.',
      'Compact Mobile Header Layout: Truncated brand titles safely on narrow displays, streamlined the Share QR header button to a compact icon button on mobile, and shortened "Sign In / Claim" to "Sign In" on small screens.',
      'Safe Area Inset Harmony: Preserved Apple notch and home indicator touch boundaries while fitting cleanly into 320px–390px mobile viewports.',
    ],
  },
  {
    version: 'v1.6.22',
    date: 'October 24, 2026',
    title: 'Word-Targeted Slip Blur & Dynamic Symbol Masking',
    summary:
      'Introduced word-targeted referee blur patches and dynamic symbol masking ("F***ering the bartender") across public scoreboards, tickers, and citation cards. Document integrity is 100% preserved with pristine underlying scans in R2, and claimed patrons logged into their locker can reveal unblurred slips with 1 tap.',
    highlights: [
      'Word-Targeted Frosted Glass Blur: Overlays a sleek frosted-glass patch with a [🦓 REF BLUR] tag specifically over sensitive words on slip photos while leaving student names, dates, and other infractions completely visible.',
      'Document Integrity Preservation: High-resolution physical receipt scans in R2 remain completely untouched; blur patches are rendered as responsive CSS overlays.',
      'Dynamic Symbol Masking: Quotes are masked with symbols (e.g. "F***ering the bartender") on public scoreboards, docket cards, and top tickers to maintain PG-13 sports bar friendliness.',
      'Signed-In Patron Reveal Privilege: Claimed patrons logged in with their 4-digit PIN see a 1-tap [👁️ Reveal Slip] toggle in the evidence viewer to inspect unblurred handwriting.',
      'Admin Ref Booth Override: Official Referees retain 1-tap authority in /admin to permanently unblur or re-blur any citation for the public site.',
    ],
  },
  {
    version: 'v1.6.21',
    date: 'October 24, 2026',
    title: 'Automatic Slip Paper Cropping & Upright Orientation Rotation',
    summary:
      'All physical demerit slips uploaded from mobile cameras or bar counters are now automatically cropped to remove dark table margins and automatically rotated 90° clockwise/counter-clockwise so every slip displays upright and centered. Also added 1-tap manual rotation controls and updated AI vision orientation prompts.',
    highlights: [
      'Smart Paper Border Detection: Scans edge contrast against dark copper, slate, and mahogany tables to crop precisely around the paper slip.',
      'Auto Upright Rotation: Detects landscape or sideways slips and rotates them upright before uploading and OCR scanning.',
      '1-Tap Slip Preview Rotation: Dedicated [Rotate 90°] and [Rotate -90°] buttons on the submit screen to adjust orientation before final submission.',
      'In-Place Viewer Rotation: Interactive rotation button directly inside the slip modal viewer for any historical citation.',
      'Corrected Ziggie Citation: Diagnosed and corrected Ziggie’s sideways slip from OCR misread "Flying chair" to authentic "Fingering the bartender" and uploaded the upright cropped slip photo.',
    ],
  },
  {
    version: 'v1.6.20',
    date: 'October 24, 2026',
    title: 'Demerit Correction Auth Gating & PWA Help Hub',
    summary:
      'Fine-tuned demerit editing permissions so you can only correct your own citations after claiming your locker and entering your PIN, while Referees maintain full oversight in the Ref Booth. Added this comprehensive About & PWA Guide page with interactive feature tooltips.',
    highlights: [
      'Self-Service Demerit Gating: You can only correct minor mistakes on citations where you are the cited patron. Locked to your claimed locker profile.',
      'Ref Booth Referee Oversight: Official referees retain full authority to reassign students, adjust points, and approve/dismiss slips.',
      'Comprehensive About & Help Hub: Dedicated user guide, PWA installation steps, and authentic bar lore.',
      'Discreet PWA Feature Tooltips: Contextual tips across the app highlighting instant offline caching, quick camera slip drops, and 4-digit PIN security.',
      'Classy Version Indicator: Subtle docket-styled version badge that respects the dark copper sports lounge aesthetic.',
    ],
  },
  {
    version: 'v1.6.19',
    date: 'October 23, 2026',
    badge: 'PROFILE MERGER',
    title: 'Profile Merging & Rule-Abiding Slip Mistake Corrections',
    summary:
      'Gave patrons the power to absorb duplicate nicknames into their main locker, fixed handwriting OCR collisions (Deb Jarvis vs. Deb Taco), and unified David Lee into Ziggie.',
    highlights: [
      'David Lee & Ziggie Unification: Re-linked all citations under Ziggie’s claimed profile (+4 total verified demerits) and registered staff aliases for both names.',
      'Deb Jarvis Citation Correction: Resolved the AI OCR misread of handwriting on slip 0d181001-765f-4314-ba70-e4a8e7cc0495 back to "Pulling a Deb Jarvis".',
      'Self-Service Profile Merging: Absorb unclaimed nicknames or merge accounts directly inside My Locker with PIN authentication.',
      'Slip Mistake Correction Modal: Interactive editor to fix minor student typos, times, and infractions with side-by-side slip photo evidence.',
      'Sports Bar Slang & Gesture Disambiguation: Updated AI vision and referee moderation so playful bar gestures (flipping off the bartender, pulling a Deb Jarvis, lingering) are properly cataloged as party fouls without false-positive NSFW flags.',
    ],
  },
  {
    version: 'v1.6.18',
    date: 'October 22, 2026',
    badge: 'SECURITY & GATING',
    title: 'Referee Booth Gating & Clean Navigation',
    summary:
      'Separated official referee management from the public fan experience so patrons enjoy a clean, fast 4-button navigation bar while Referees have secure access to the review queue.',
    highlights: [
      'Ref Booth Navigation Gating: Desktop header and mobile bottom nav only display "Ref Booth" to logged-in staff and administrators.',
      'Private Review Ticker: Pending review alerts are strictly confined to authenticated staff members.',
      'Escape Route on Lock Screen: Added an instant "Return to Scoreboard" button for easy exit if someone hits /admin by accident.',
      'Balanced Mobile Nav: Automatically switches between 4 and 5 columns depending on role so touch targets are always spacious.',
    ],
  },
  {
    version: 'v1.6.17',
    date: 'October 21, 2026',
    badge: 'MOBILE ACCESSIBILITY',
    title: 'Mobile Accessibility & Tap Target Overhaul',
    summary:
      'Engineered the app to meet Apple Human Interface Guidelines and WCAG AA/AAA standards for effortless, one-handed mobile browsing at the bar.',
    highlights: [
      'Apple HIG 44px+ Minimum Touch Targets: Enlarged all buttons, select menus, and modal actions so you never miss a button tap.',
      'iOS Safari Auto-Zoom Fix: Enforced >= 16px text on all inputs to stop iOS Safari from zooming unexpectedly during typing.',
      'Eliminated 300ms Tap Delay: Applied global touch-action manipulation for snappy, instantaneous tactile feedback.',
      'Tactile Button Depression: Added active:scale-95 feedback across all cards and navigation pills.',
      'High-Contrast Warm Brass Text: Elevated contrast across all timestamps and labels for dim-lighting bar visibility.',
    ],
  },
  {
    version: 'v1.6.16',
    date: 'October 20, 2026',
    badge: 'VIRAL SHARING',
    title: 'Instant Backbar QR Modal & Poster Sharing',
    summary:
      'Created a prominent 1-tap QR button in the header so bartenders and patrons can display the high-res backbar QR code in 1 second for instant scanning across the bar.',
    highlights: [
      'Prominent Header QR Button: Golden QR trigger on both desktop and mobile headers.',
      'Instant Full-Screen QR Modal: High-resolution QR code with 1-tap link copying and native Web Share integration.',
      'Backbar Poster Print Mode: High-contrast printable 8.5x11 format for hanging next to the taps.',
    ],
  },
  {
    version: 'v1.6.10 – v1.6.15',
    date: 'October 19, 2026',
    badge: 'NOTIFICATIONS',
    title: 'Friday Night Happy Hour Docket & Notifications',
    summary:
      'Automated cron-scheduled Friday 5:00 PM EST happy hour summaries delivering podium standings and weekly demerit highlights via carrier SMS and email.',
    highlights: [
      'Friday 5 PM Happy Hour Digest: Scheduled summary of demerit crowns, runner-ups, and top offenses.',
      'Carrier SMS Gateway: Pure plain-text short messages sent directly to AT&T, Verizon, and T-Mobile phones without third-party spam fees.',
      'Granular Channel Preferences: Toggle alerts for leader dethroning, new citations against your name, or referee overrides.',
    ],
  },
  {
    version: 'v1.6.6 – v1.6.9',
    date: 'October 19, 2026',
    badge: 'AI VISION',
    title: 'Zero-Touch AI Vision Slip Scanning & Referee Auto-Blur',
    summary:
      'Integrated Cloudflare Workers AI with Llama Vision to auto-read handwriting on thermal paper receipts while shielding the community with an auto-blur safety net.',
    highlights: [
      'Zero-Touch Vision OCR: Automatically transcribes handwritten student names, timestamps, infraction descriptions, and signatures.',
      'Adaptive Smartphone Compression: Compresses smartphone camera photos to < 82 KB in milliseconds in the browser before edge upload.',
      'AI Referee Whistle & Blur Queue: Automatically blurs sensitive or questionable handwriting for manual referee review.',
    ],
  },
  {
    version: 'v1.5.0',
    date: 'October 18, 2026',
    badge: 'EDGE ARCHITECTURE',
    title: 'Cloudflare D1 Database, R2 Vault & 4-Digit Locker PINs',
    summary:
      'Migrated backend to ultra-low latency Cloudflare D1 SQL database and R2 cloud storage bucket on api.copperdemerits.com, introducing claimed patron lockers.',
    highlights: [
      '4-Digit Bar PIN Security: Protect your locker and stats with a quick 4-digit PIN that never gets forgotten.',
      'Global Edge Performance: Sub-50ms API responses served from the Cloudflare edge network.',
      'Cloudflare R2 Slip Storage: Secure, permanent preservation of original handwritten slip photos.',
    ],
  },
  {
    version: 'v1.4.0',
    date: 'October 18, 2026',
    badge: 'MICHIGAN SPORTS',
    title: 'Authentic Copper AC Aesthetics & Michigan Sports Badges',
    summary:
      'Infused the site with authentic Copper Athletic Club interior photography, speakeasy stag branding, and Detroit Pro / Michigan sports team badges.',
    highlights: [
      'Detroit & Michigan Sports Badges: Pick your team — Detroit Lions, Detroit Red Wings, Bad Boys Pistons, Detroit Tigers, Michigan Wolverines, or MSU Spartans.',
      'Copper Moscow Mule Mug Meters: Visual point meters measuring demerit severity.',
      'Authentic Venue Photography: High-res background photography of Copper Athletic Club’s brick walls, taproom, and sports memorabilia.',
    ],
  },
  {
    version: 'v1.3.1',
    date: 'October 17, 2026',
    badge: 'CATEGORIES',
    title: 'Itemized Demerit Breakdown & Category Leaderboards',
    summary:
      'Upgraded the leaderboard engine to itemize infractions into discrete foul categories: Party Fouls, Insubordination, Drink Crimes, Bar Etiquette, and Attendance.',
    highlights: [
      'Itemized Demerit Points: Multi-foul slips calculate total demerits with per-item point breakdowns.',
      'Category Filter Pills: View leaders for specific categories like "Drink Crimes" or "Insubordination".',
      'Time Period Selectors: Filter standings by All-Time, This Month, This Week, or Specific Sessions.',
    ],
  },
  {
    version: 'v1.1.0 – v1.2.0',
    date: 'October 17, 2026',
    badge: 'PWA & DEDUP',
    title: 'Progressive Web App Launch & 3-Layer Deduplication',
    summary:
      'Added mobile PWA capabilities with service workers and an advanced perceptual dHash deduplication system preventing double-counted slips.',
    highlights: [
      'Progressive Web App (PWA): Install on iOS Safari and Android Chrome with offline capability.',
      '3-Layer Deduplication: SHA-256 + Perceptual 64-bit dHash + Citation Timestamp matching.',
      'Authentic Historical Slips: Permanent preservation of original founding slips.',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'October 17, 2026',
    badge: 'GENESIS',
    title: 'The Original Ring of Honor Scoreboard',
    summary:
      'The inaugural digital release converting Copper Athletic Club’s paper receipt demerit tradition into a live interactive scoreboard for Marshall, MI sports fans.',
    highlights: [
      'Digital Podium & Standings: Real-time calculation of Gold, Silver, and Bronze podium holders.',
      'Handwritten Slip Wall: Public docket showcasing original physical slips.',
      'Community Demerit Reactions: Jovial one-tap bar reactions (Buy a Round, 2 Minutes in the Box, Tough Call, Instant Classic).',
    ],
  },
];

export const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'guide' | 'changelog' | 'lore'>('guide');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Version Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono-docket text-xs font-bold text-[#DFC15E] hover:text-[#E8B888] transition active:scale-95 touch-manipulation min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Live Scoreboard</span>
        </Link>

        {/* Discreet Aesthetic Version Pill */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#DFC15E]/40 bg-[#1A1513] px-3 py-1.5 shadow-[0_0_15px_rgba(223,193,94,0.15)]">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono-docket text-xs font-bold text-[#DFC15E]">PWA v1.6.25</span>
          <span className="text-[10px] font-mono-docket text-[#A8988B] hidden sm:inline">
            · Marshall, MI
          </span>
        </div>
      </div>

      {/* Hero Jumbotron */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#B87333]/50 bg-gradient-to-b from-[#221B17] via-[#161210] to-[#120F0E] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#B87333]/25 px-2.5 py-1 font-mono-docket text-xs font-black uppercase tracking-wider text-[#E8B888] border border-[#B87333]/40">
              <Beer className="h-3.5 w-3.5 text-[#DFC15E]" />
              <span>THE RING OF HONOR · ABOUT &amp; USER GUIDE</span>
            </div>
            <h1 className="font-athletic text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-[#F5F2EB]">
              Copper Demerits
            </h1>
            <p className="font-sans text-sm sm:text-base leading-relaxed text-[#D6C7B8]">
              The unofficial, patron-run scoreboard capturing Marshall, Michigan’s favorite sports
              bar tradition. Scrawled on receipt paper, signed by &ldquo;The Boss Lady&rdquo;, and
              immortalized for jovial fun.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/10 bg-[#0E0C0B]/80 text-center shrink-0 w-full sm:w-auto">
            <img
              src="/brand/CopperLogo_Web.png"
              alt="Copper Athletic Club Logo"
              className="h-16 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-2"
            />
            <span className="font-mono-docket text-xs font-bold text-[#DFC15E]">
              COPPER ATHLETIC CLUB
            </span>
            <span className="font-mono-docket text-[10px] text-[#A8988B]">Marshall, MI</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-2xl border border-white/10 bg-[#161311] p-1.5 shadow-md">
        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 min-h-[44px] font-athletic text-sm font-bold uppercase tracking-wider transition active:scale-95 touch-manipulation cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-[#DFC15E] text-[#121212] font-black shadow-[0_0_15px_rgba(223,193,94,0.3)]'
              : 'text-[#D6C7B8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>PWA &amp; Mobile Guide</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('changelog')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 min-h-[44px] font-athletic text-sm font-bold uppercase tracking-wider transition active:scale-95 touch-manipulation cursor-pointer ${
            activeTab === 'changelog'
              ? 'bg-[#DFC15E] text-[#121212] font-black shadow-[0_0_15px_rgba(223,193,94,0.3)]'
              : 'text-[#D6C7B8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>What&rsquo;s New (Changelog)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lore')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 min-h-[44px] font-athletic text-sm font-bold uppercase tracking-wider transition active:scale-95 touch-manipulation cursor-pointer ${
            activeTab === 'lore'
              ? 'bg-[#DFC15E] text-[#121212] font-black shadow-[0_0_15px_rgba(223,193,94,0.3)]'
              : 'text-[#D6C7B8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="h-4 w-4 shrink-0" />
          <span>Bar Lore &amp; Rules</span>
        </button>
      </div>

      {/* TAB 1: PWA & MOBILE GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1: PWA Full Screen */}
            <div className="rounded-2xl border border-white/10 bg-[#161311] p-5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DFC15E]/15 border border-[#DFC15E]/30 text-[#DFC15E]">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                      Add to Home Screen (PWA)
                    </h3>
                    <span className="font-mono-docket text-[10px] text-[#DFC15E] uppercase">
                      NO APP STORE REQUIRED
                    </span>
                  </div>
                </div>
                <PwaTooltip
                  pwaTag="PWA FEATURE"
                  content="Installing this web app onto your home screen removes browser chrome (address bar and tabs), giving you an authentic 100% full-screen native mobile experience."
                />
              </div>
              <p className="font-sans text-xs leading-relaxed text-[#D6C7B8]">
                Install Copper Demerits directly onto your iPhone or Android home screen with zero app
                store downloads. Launches instantly in full-screen mode like a native iOS or Android
                app.
              </p>
            </div>

            {/* Feature 2: Offline-Ready Edge Cache */}
            <div className="rounded-2xl border border-white/10 bg-[#161311] p-5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                      Instant Offline-Ready Cache
                    </h3>
                    <span className="font-mono-docket text-[10px] text-emerald-400 uppercase">
                      FAST SPORTS BAR WI-FI PROOF
                    </span>
                  </div>
                </div>
                <PwaTooltip
                  pwaTag="OFFLINE READY"
                  content="Standings, roster records, and slips are saved in local storage and synced automatically with Cloudflare D1. Even in spotty sports bar basements, the leaderboard renders instantly without lag."
                />
              </div>
              <p className="font-sans text-xs leading-relaxed text-[#D6C7B8]">
                Sports bar Wi-Fi can get overloaded during big games. Copper Demerits caches the
                scoreboard in your device&rsquo;s local storage so it renders in milliseconds even
                without a cellular signal.
              </p>
            </div>

            {/* Feature 3: One-Tap Quick Camera Capture */}
            <div className="rounded-2xl border border-white/10 bg-[#161311] p-5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C86D51]/15 border border-[#C86D51]/30 text-[#C86D51]">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                      Bar Stool Slip Scanner
                    </h3>
                    <span className="font-mono-docket text-[10px] text-[#C86D51] uppercase">
                      AUTO-COMPRESSED &lt;82KB
                    </span>
                  </div>
                </div>
                <PwaTooltip
                  pwaTag="CAMERA FEATURE"
                  content="Snap a photo directly with your phone's camera. The app automatically cleans, optimizes, and compresses the image to under 82 KB right on your device before uploading to Cloudflare R2."
                />
              </div>
              <p className="font-sans text-xs leading-relaxed text-[#D6C7B8]">
                Drop a slip right from your bar stool! Tap &ldquo;Drop Slip&rdquo;, snap the paper
                receipt, and AI Vision transcribes the handwriting, student name, time, and foul
                points automatically.
              </p>
            </div>

            {/* Feature 4: 4-Digit Locker PIN Security */}
            <div className="rounded-2xl border border-white/10 bg-[#161311] p-5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DFC15E]/15 border border-[#DFC15E]/30 text-[#DFC15E]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                      4-Digit Bar Locker PIN
                    </h3>
                    <span className="font-mono-docket text-[10px] text-[#DFC15E] uppercase">
                      1-TAP AUTHENTICATION
                    </span>
                  </div>
                </div>
                <PwaTooltip
                  pwaTag="SECURITY"
                  content="No cumbersome password resets or complex links. A simple 4-digit PIN secures your profile, allows you to correct your slips, and lets you manage your notifications."
                />
              </div>
              <p className="font-sans text-xs leading-relaxed text-[#D6C7B8]">
                Claim your bar nickname and protect your record with a friendly 4-digit PIN. Keep your
                stats linked, customize your Detroit/Michigan team badge, and manage your weekly
                happy hour digests.
              </p>
            </div>

            {/* Feature 5: Self-Service Slip Mistake Corrections */}
            <div className="rounded-2xl border border-white/10 bg-[#161311] p-5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                      Self-Service Corrections
                    </h3>
                    <span className="font-mono-docket text-[10px] text-purple-300 uppercase">
                      ROLE-GATED (OWN DEMERITS ONLY)
                    </span>
                  </div>
                </div>
                <PwaTooltip
                  pwaTag="ACCURACY"
                  content="Did AI misread your handwriting (e.g. Deb Taco instead of Deb Jarvis)? Claim and log in with your PIN, click [Correct Mistake] on the slip, and fix minor typos while adhering to bar rules."
                />
              </div>
              <p className="font-sans text-xs leading-relaxed text-[#D6C7B8]">
                Notice an OCR misread or typo on your demerit? Log in with your PIN and use the
                [Correct Mistake] button. You can fix infractions on your own record while official
                Referees manage the Ref Booth.
              </p>
            </div>

            {/* Feature 6: Profile & Alias Merging */}
            <div className="rounded-2xl border border-white/10 bg-[#161311] p-5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300">
                    <GitMerge className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                      Profile &amp; Alias Merging
                    </h3>
                    <span className="font-mono-docket text-[10px] text-blue-300 uppercase">
                      UNIFY DUPLICATE NICKNAMES
                    </span>
                  </div>
                </div>
                <PwaTooltip
                  pwaTag="ROSTER"
                  content="If slips were written under different nicknames (e.g. 'David Lee' and 'Ziggie'), you can absorb the unclaimed alias into your main account so all your demerits count together."
                />
              </div>
              <p className="font-sans text-xs leading-relaxed text-[#D6C7B8]">
                Are people writing slips under different nicknames for you? Open &ldquo;My
                Locker&rdquo; to absorb duplicate unclaimed names so all your citations roll into your
                single official profile.
              </p>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="rounded-3xl border-2 border-[#DFC15E]/40 bg-[#161210] p-6 sm:p-8 space-y-5 shadow-lg">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DFC15E]/20 text-[#DFC15E] border border-[#DFC15E]/40">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-athletic text-xl font-bold uppercase tracking-tight text-[#F5F2EB]">
                  How to Install on Your Phone
                </h2>
                <p className="font-mono-docket text-xs text-[#E8B888]">
                  Two simple steps to add Copper Demerits to your Home Screen
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              {/* iPhone Safari */}
              <div className="rounded-2xl border border-white/10 bg-[#0E0C0B] p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 font-athletic font-bold text-sm uppercase text-[#DFC15E]">
                  <Share2 className="h-4 w-4 text-[#DFC15E]" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[#D6C7B8] text-xs leading-relaxed">
                  <li>
                    Open <strong className="text-white">copperdemerits.com</strong> in Safari.
                  </li>
                  <li>
                    Tap the <strong className="text-white">Share</strong> button at the bottom of
                    the screen (<Share2 className="inline h-3.5 w-3.5 mx-0.5 text-[#DFC15E]" />).
                  </li>
                  <li>
                    Scroll down and tap{' '}
                    <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong> (
                    <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-[#DFC15E]" />).
                  </li>
                  <li>
                    Tap <strong className="text-white">Add</strong> in the top-right corner.
                  </li>
                </ol>
              </div>

              {/* Android Chrome */}
              <div className="rounded-2xl border border-white/10 bg-[#0E0C0B] p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 font-athletic font-bold text-sm uppercase text-[#DFC15E]">
                  <Download className="h-4 w-4 text-[#DFC15E]" />
                  <span>Android (Chrome / Brave)</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[#D6C7B8] text-xs leading-relaxed">
                  <li>
                    Open <strong className="text-white">copperdemerits.com</strong> in Chrome.
                  </li>
                  <li>
                    Tap the three dots menu (<strong className="text-white">⋮</strong>) in the top
                    right.
                  </li>
                  <li>
                    Tap <strong className="text-white">&ldquo;Install App&rdquo;</strong> or{' '}
                    <strong className="text-white">&ldquo;Add to Home screen&rdquo;</strong>.
                  </li>
                  <li>Confirm the prompt to install the Copper Demerits icon on your app grid.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER CHANGELOG */}
      {activeTab === 'changelog' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-white/10 bg-[#161210] p-5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#DFC15E]" />
              <h2 className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                Official User Changelog &amp; Release History
              </h2>
            </div>
            <p className="font-sans text-xs text-[#D6C7B8] leading-relaxed">
              Every upgrade, tweak, and rule refinement logged chronologically from a patron’s
              perspective.
            </p>
          </div>

          <div className="space-y-4">
            {USER_CHANGELOG.map((entry) => (
              <div
                key={entry.version}
                className="rounded-2xl border border-white/10 bg-[#161311] p-5 sm:p-6 space-y-3.5 shadow-md hover:border-[#B87333]/60 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-docket text-sm font-black text-[#DFC15E]">
                      {entry.version}
                    </span>
                    <span className="rounded-lg bg-[#B87333]/20 border border-[#B87333]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                      {entry.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono-docket text-xs text-[#A8988B]">
                    <Calendar className="h-3.5 w-3.5 text-[#DFC15E]" />
                    <span>{entry.date}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-athletic text-lg font-black uppercase text-[#F5F2EB]">
                    {entry.title}
                  </h3>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-[#D6C7B8]">
                    {entry.summary}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#0E0C0B] p-3.5 space-y-2">
                  <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#DFC15E]">
                    KEY HIGHLIGHTS:
                  </span>
                  <ul className="space-y-1.5 text-xs font-sans text-[#E5DCD3]">
                    {entry.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BAR LORE & RULES */}
      {activeTab === 'lore' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Lore Section */}
          <div className="rounded-3xl border border-white/10 bg-[#161210] p-6 sm:p-8 space-y-4 shadow-lg">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DFC15E]/15 border border-[#DFC15E]/30 text-[#DFC15E]">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-athletic text-xl font-bold uppercase text-[#F5F2EB]">
                  The Legend of the Demerit Slip
                </h2>
                <p className="font-mono-docket text-xs text-[#E8B888]">
                  From Bar Napkins to the Digital Ring of Honor
                </p>
              </div>
            </div>

            <div className="font-sans text-xs sm:text-sm leading-relaxed text-[#D6C7B8] space-y-3">
              <p>
                It all started behind the bar at <strong className="text-white">Copper Athletic Club</strong> in Marshall,
                Michigan. Whenever regular patrons or staff committed egregious bar etiquette fouls —
                such as trying to order a Gin &amp; Diet Coke, changing seats three times in ten minutes,
                or failing to show up to watch the Detroit Red Wings — &ldquo;The Boss Lady&rdquo; Sarah would
                promptly issue a handwritten demerit slip.
              </p>
              <p>
                Written on thermal receipt paper or register slips, signed with authority, and taped to the
                backbar mirror, these demerits became a badge of honor. Soon, patrons started submitting
                slips on each other, creating the jovial, competitive leaderboard you see today.
              </p>
            </div>
          </div>

          {/* Iconic Fouls List */}
          <div className="rounded-2xl border border-white/10 bg-[#161311] p-5 sm:p-6 space-y-4">
            <h3 className="font-athletic text-lg font-black uppercase text-[#F5F2EB]">
              Hall of Fame Bar Fouls
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-[#0E0C0B] p-3 space-y-1">
                <span className="font-athletic font-bold uppercase text-[#DFC15E]">
                  Pulling a Deb Jarvis (+1 Demerit)
                </span>
                <p className="font-sans text-[#D6C7B8]">
                  An iconic conduct foul immortalized on slip 0d181001. Legendary behavior that earned its own
                  category.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0E0C0B] p-3 space-y-1">
                <span className="font-athletic font-bold uppercase text-[#DFC15E]">
                  Ordering Gin &amp; Diet Coke (+1 Demerit)
                </span>
                <p className="font-sans text-[#D6C7B8]">
                  The classic drink crime cited against Rick Albaugh. A beverage so foul it earned a permanent
                  citation.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0E0C0B] p-3 space-y-1">
                <span className="font-athletic font-bold uppercase text-[#DFC15E]">
                  No-Show to See Red Wings (+1 Demerit)
                </span>
                <p className="font-sans text-[#D6C7B8]">
                  Unbothered attendance foul cited against Burtis for ditching hockey night at the CAC.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0E0C0B] p-3 space-y-1">
                <span className="font-athletic font-bold uppercase text-[#DFC15E]">
                  Not Caring About First Demerit (+2 Demerits)
                </span>
                <p className="font-sans text-[#D6C7B8]">
                  Blatant insubordination and defiance. Doubled points on the spot by Sarah.
                </p>
              </div>
            </div>
          </div>

          {/* Community Code of Conduct */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-athletic font-bold text-sm uppercase">
              <ShieldCheck className="h-4 w-4" />
              <span>The Referee Code of Conduct</span>
            </div>
            <p className="font-sans text-xs text-[#D6C7B8] leading-relaxed">
              Copper Demerits is 100% about good-natured humor, community laughs, and friendly banter.
              Mean-spirited insults, profane attacks, harassment, or genuinely harmful accusations
              are strictly prohibited. All slips and corrections are monitored by the Referee whistle.
              Remember: <em>Tip your bartenders generously and keep it friendly!</em>
            </p>
          </div>
        </div>
      )}

      {/* Footer Disclaimer & Links */}
      <div className="rounded-2xl border border-[#B87333]/30 bg-[#120F0E] p-5 text-center space-y-2 text-xs font-mono-docket text-[#A8988B]">
        <p className="text-[#D6C7B8]">
          Copper Demerits is an unofficial fan project and is not owned or operated by Copper Athletic
          Club.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-sans text-[#DFC15E] pt-1">
          <a
            href="https://copperac.com"
            target="_blank"
            rel="noopener"
            className="hover:underline inline-flex items-center gap-1 font-bold"
          >
            <span>Copper Athletic Club (copperac.com)</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <span>·</span>
          <a
            href="mailto:info@drit.ninja?subject=Copper%20Demerits%20Feedback"
            className="hover:underline inline-flex items-center gap-1 text-[#E8B888]"
          >
            <span>Contact Administrator (info@drit.ninja)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
