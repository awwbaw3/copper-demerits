import React, { useState } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Images,
  Sparkles,
} from 'lucide-react';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip, SlipReactions } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import { normalizeSlipDemeritItems } from '../lib/defaultData';
import {
  MichiganTeamEmblem,
  getMichiganTeamMetaForType,
} from '../components/MichiganSportsGraphics';

const JOVIAL_REACTION_BUTTONS: Array<{
  key: keyof SlipReactions;
  emoji: string;
  label: string;
}> = [
  { key: 'buy_round', emoji: '🍺', label: "Buy 'Em A Round" },
  { key: 'tough_call', emoji: '🦁', label: 'Tough Call Ref!' },
  { key: 'two_mins', emoji: '🐙', label: '2 Mins in the Box' },
  { key: 'instant_classic', emoji: '😂', label: 'Instant Classic' },
];

export const DocketPage: React.FC = () => {
  const { demerits, uploadedSourceFiles, reactToSlip } = useDemerits();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const approvedSlips = demerits.filter((d) => d.status === 'approved' && Boolean(d.image_url));

  const filteredSlips = approvedSlips.filter((slip) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      slip.patronDisplayName.toLowerCase().includes(q) ||
      slip.raw_student.toLowerCase().includes(q) ||
      slip.issuerDisplayName.toLowerCase().includes(q) ||
      slip.raw_signature.toLowerCase().includes(q) ||
      slip.location_area.toLowerCase().includes(q) ||
      slip.infractions.some((inf) => inf.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-4 sm:pt-6 pb-14 space-y-7">
      {/* 1. VISUAL HERO BANNER WITH OFFICIAL COPPER AC TAP HANDLES */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-[#B87333]/50 bg-[#121212] p-5 sm:p-8 shadow-2xl">
        <div className="absolute inset-0">
          <img
            src="/brand/CAC_Taps_web.jpg"
            alt="Copper Athletic Club Tap Handles"
            className="h-full w-full object-cover object-center opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/80 to-[#121212]/60" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFC15E]/50 bg-[#B87333]/20 px-3 py-0.5 text-[11px] font-mono-docket font-bold uppercase tracking-wider text-[#DFC15E]">
              <Sparkles className="h-3.5 w-3.5" />
              OFFICIAL EVIDENCE LOCKER • {approvedSlips.length} SLIPS • ALL SIGNED BY SARAH
            </span>
            <h1 className="mt-2 font-display-tall text-4xl sm:text-5xl font-black uppercase tracking-wider text-[#F5F2EB] leading-none">
              WALL OF <span className="text-[#B87333]">SLIPS</span>
            </h1>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E8F82]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Rick, Burtis, David Lee..."
              className="w-full rounded-2xl border border-[#B87333]/40 bg-black/70 pl-10 pr-4 py-2.5 text-sm text-[#F5F2EB] placeholder-[#8E8074] focus:border-[#B87333] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 2. GRAPHICAL SLIP CARDS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSlips.map((slip) => {
          const items = normalizeSlipDemeritItems(slip);
          const primaryMeta = getMichiganTeamMetaForType(
            items[0]?.type || '',
            items[0]?.description || ''
          );
          const reactions: SlipReactions = slip.reactions || {
            buy_round: 0,
            tough_call: 0,
            two_mins: 0,
            instant_classic: 0,
          };

          return (
            <div
              key={slip.id}
              onClick={() => setSelectedSlip(slip)}
              className={`group cursor-pointer overflow-hidden rounded-3xl border-2 bg-gradient-to-b from-[#1B1613] to-[#121212] ${primaryMeta.borderGlow} transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Large Interactive Slip Photo Header */}
              <div className="relative h-64 w-full overflow-hidden bg-black">
                <img
                  src={slip.image_url || '/slips/20261017_211324.jpg'}
                  alt={`Slip for ${slip.raw_student}`}
                  className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                    slip.is_blurred ? 'blur-md scale-105' : ''
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/40" />

                {slip.is_blurred && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <span className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-amber-400 bg-black/85 px-4 py-2 font-athletic text-lg font-black uppercase tracking-wider text-amber-300 shadow-lg">
                      <EyeOff className="h-4 w-4" />
                      <span>🦓 Referee Blurred — Friendly Vibes Only</span>
                    </span>
                  </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="rounded-xl bg-black/80 border border-white/15 px-3 py-1 font-mono-docket text-xs font-bold text-[#DFC15E]">
                    {slip.incident_date} · {slip.incident_time?.slice(0, 5) || 'OCT 17'} · {slip.location_area}
                  </span>
                  <span className="rounded-2xl bg-[#C86D51] px-3.5 py-1 font-display-tall text-3xl font-black text-[#121212] shadow-lg">
                    +{slip.demerit_count} PTS
                  </span>
                </div>

                {/* Bottom Patron + Team Badge */}
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
                      CITED PATRON
                    </span>
                    <h2 className="font-display-tall text-4xl font-black uppercase text-white leading-none">
                      {slip.patronDisplayName}
                    </h2>
                  </div>
                  <MichiganTeamEmblem iconType={primaryMeta.iconType} size="md" />
                </div>
              </div>

              {/* Itemized Team Penalty Pills */}
              <div className="p-5 space-y-3">
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const meta = getMichiganTeamMetaForType(item.type, item.description);
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between gap-3 rounded-2xl border bg-gradient-to-r ${meta.bgGradient} ${meta.borderGlow} px-3.5 py-2.5`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MichiganTeamEmblem iconType={meta.iconType} size="sm" />
                          <div className="min-w-0">
                            <span className="block font-athletic text-xs font-bold uppercase tracking-wider text-[#DFC15E]">
                              {meta.teamName}
                            </span>
                            <span className="block font-handwriting text-xl text-[#F5F2EB] leading-tight">
                              “{item.description}”
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-xl bg-black/60 border border-white/15 px-2.5 py-1 font-display-tall text-2xl font-black text-[#E8B888]">
                          +{item.points}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Preset Jovial Bar Reactions (No Free-Text Comments) */}
                <div
                  className="pt-2 flex flex-wrap items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {JOVIAL_REACTION_BUTTONS.map((btn) => {
                    const count = reactions[btn.key] || 0;
                    return (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => reactToSlip(slip.id, btn.key)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/50 px-2.5 py-1 font-mono-docket text-[11px] text-[#E8B888] transition hover:border-[#DFC15E] hover:bg-[#B87333]/20 cursor-pointer"
                      >
                        <span>{btn.emoji}</span>
                        <span>{btn.label}</span>
                        {count > 0 && (
                          <span className="ml-0.5 rounded-full bg-[#DFC15E]/20 px-1.5 py-0.2 font-bold text-[#DFC15E]">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Signature + Inspect Button */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="font-mono-docket text-[#A3968A]">
                    SIGNED: <span className="font-handwriting text-lg text-[#DFC15E] ml-1">{slip.raw_signature}</span>{' '}
                    <span className="text-[#E8B888]">({slip.issuerDisplayName})</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-[#B87333]/20 border border-[#B87333]/50 px-3 py-1 font-athletic uppercase tracking-wider text-[#E8B888] group-hover:bg-[#B87333] group-hover:text-[#121212] transition">
                    <Eye className="h-3.5 w-3.5" />
                    Zoom Slip
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. COMPACT UPLOADED CAMERA FILES STRIP (3 SOURCE PHOTOS -> 4 UNIQUE SLIPS) */}
      <section className="rounded-3xl border border-[#B87333]/35 bg-[#151210] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Images className="h-5 w-5 text-[#B87333]" />
          <h3 className="font-display-tall text-2xl uppercase tracking-wider text-[#F5F2EB]">
            3 CAMERA UPLOADS <span className="text-[#B87333]">→ 4 UNIQUE SLIPS</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {uploadedSourceFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => setPreviewPhotoUrl(file.imageUrl)}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#1C1714] p-3 hover:border-[#B87333] transition"
            >
              <div className="relative h-40 w-full overflow-hidden rounded-xl bg-black">
                <img
                  src={file.imageUrl}
                  alt={file.filename}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 right-2 rounded-lg bg-black/80 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#E8B888]">
                  {file.slipCountInImage} SLIP{file.slipCountInImage > 1 ? 'S' : ''}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="font-mono-docket text-xs font-bold text-[#F5F2EB] truncate">
                  {file.filename}
                </span>
                <span className="font-mono-docket text-[10px] text-[#DFC15E]">
                  {file.capturedAt.split(' ')[1]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full Source Photo Lightbox */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        >
          <img
            src={previewPhotoUrl}
            alt="Full Slip Upload"
            className="max-h-[90vh] max-w-full rounded-2xl border-2 border-[#B87333] object-contain"
          />
        </div>
      )}

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
