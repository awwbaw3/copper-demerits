import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DemeritsProvider } from './context/DemeritsContext';
import { Navbar } from './components/Navbar';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { DocketPage } from './pages/DocketPage';
import { SubmitSlipPage } from './pages/SubmitSlipPage';
import { AdminPage } from './pages/AdminPage';

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
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <footer className="mt-12 border-t border-[#B87333]/25 bg-[#0E0C0B] py-7 px-4">
            <div className="mx-auto max-w-6xl space-y-4">
              <div className="rounded-2xl border border-[#B87333]/30 bg-[#151210] px-4 py-3 text-center">
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
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono-docket text-[#8E8074] text-center sm:text-left">
                <div>
                  <span className="font-bold text-[#B87333]">COPPER DEMERITS FAN CLUB</span> ·
                  MARSHALL, MI · RING OF HONOR
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                  <a
                    href="https://copperac.com"
                    target="_blank"
                    rel="noopener"
                    className="font-bold text-[#E8B888] hover:text-[#DFC15E] transition underline decoration-[#B87333]/50"
                  >
                    Official Menus, Tap List &amp; Hours: Copper Athletic Club (copperac.com) — Marshall, MI ↗
                  </a>
                  <span>·</span>
                  <span>Cloudflare D1 + R2 + AI Referee · PWA v1.6.4</span>
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
