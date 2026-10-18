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
          <footer className="mt-12 border-t border-[#B87333]/20 bg-[#0E0C0B] py-6 px-4">
            <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono-docket text-[#8E8074] text-center sm:text-left">
              <div>
                <span className="font-bold text-[#B87333]">COPPER ATHLETIC CLUB</span> · MARSHALL,
                MI · RING OF HONOR
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://copperac.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#E8B888] transition"
                >
                  copperac.com ↗
                </a>
                <span>·</span>
                <span>PWA v1.3.0</span>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </DemeritsProvider>
  );
};

export default App;
