import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DemeritsProvider } from './context/DemeritsContext';
import { Navbar } from './components/Navbar';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { DocketPage } from './pages/DocketPage';
import { SubmitSlipPage } from './pages/SubmitSlipPage';
import { AdminPage } from './pages/AdminPage';
import { SharePage } from './pages/SharePage';
import { AboutPage } from './pages/AboutPage';

export const App: React.FC = () => {
  return (
    <DemeritsProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#121212] text-[#F5F2EB] pb-20 md:pb-0">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LeaderboardPage />} />
              <Route path="/docket" element={<DocketPage />} />
              <Route path="/submit" element={<SubmitSlipPage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <footer className="mt-12 border-t border-[#B87333]/25 bg-[#0E0C0B] py-7 px-4">
            <div className="mx-auto max-w-6xl space-y-4">
              <div className="rounded-2xl border border-[#B87333]/30 bg-[#151210] px-4 py-3 text-center space-y-1.5">
                <p className="font-mono-docket text-[11px] sm:text-xs text-[#D6C7B8]">
                  🍺 <strong className="text-[#DFC15E]">UNOFFICIAL FAN SITE DISCLAIMER:</strong>{' '}
                  Copper Demerits (<code className="text-[#E8B888]">copperdemerits.com</code>) is an
                  unofficial, patron-run fan site created strictly for friendly, jovial fun and
                  good-natured bar banter. It is{' '}
                  <strong className="text-white">
                    not owned by, operated by, or officially affiliated with Copper Athletic Club
                  </strong>
                  . Be kind, tip your bartenders, and keep it friendly!
                </p>
                <p className="font-mono-docket text-[10px] sm:text-[11px] text-[#A6998C]">
                  For any website questions, concerns, or complaints, please contact the site administrator at{' '}
                  <a
                    href="mailto:info@drit.ninja?subject=Copper%20Demerits%20Website%20Inquiry"
                    className="text-[#DFC15E] hover:underline font-semibold"
                  >
                    info@drit.ninja
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono-docket text-[#8E8074] text-center sm:text-left">
                <div>
                  <span className="font-bold text-[#B87333]">COPPER DEMERITS FAN CLUB</span> ·
                  MARSHALL, MI · RING OF HONOR
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                  <Link
                    to="/about"
                    className="font-bold text-[#DFC15E] hover:text-[#E8B888] transition underline decoration-[#DFC15E]/50 min-h-[44px] inline-flex items-center touch-manipulation active:scale-95"
                    title="View user-oriented changelog, PWA feature guide, and bar rules"
                  >
                    ℹ️ About &amp; What&rsquo;s New
                  </Link>
                  <span>·</span>
                  <a
                    href="/share"
                    className="font-bold text-[#DFC15E] hover:text-[#E8B888] transition underline decoration-[#DFC15E]/50 min-h-[44px] inline-flex items-center touch-manipulation active:scale-95"
                  >
                    📱 Share App &amp; Backbar QR Code
                  </a>
                  <span>·</span>
                  <a
                    href="https://copperac.com"
                    target="_blank"
                    rel="noopener"
                    className="font-bold text-[#E8B888] hover:text-[#DFC15E] transition underline decoration-[#B87333]/50 min-h-[44px] inline-flex items-center touch-manipulation"
                  >
                    Copper Athletic Club (copperac.com) ↗
                  </a>
                  <span>·</span>
                  <a
                    href="https://drit.ninja"
                    target="_blank"
                    rel="noopener"
                    className="text-[#9E8F82] hover:text-[#DFC15E] transition underline decoration-[#9E8F82]/30 min-h-[44px] inline-flex items-center touch-manipulation"
                  >
                    DR IT - The IT Ninjas
                  </a>
                  <span>·</span>
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-1 rounded border border-[#DFC15E]/30 bg-[#DFC15E]/10 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#DFC15E] hover:bg-[#DFC15E]/20 transition"
                    title="Current App Version"
                  >
                    <span>v1.6.22</span>
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </DemeritsProvider>
  );
};

export default App;
