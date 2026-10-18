import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { uploadSlipImage, SLIPS_BUCKET } from '../lib/supabase';
import { PhysicalSlipCard } from '../components/PhysicalSlipCard';
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Video,
  X,
} from 'lucide-react';

export const SubmitSlipPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    members,
    aliases,
    resolveStaffSignature,
    resolvePatronName,
    submitDemeritSlip,
  } = useDemerits();

  const [rawStudent, setRawStudent] = useState('Rick');
  const [rawSignature, setRawSignature] = useState('The Boss - AKA Sarah');
  const [demeritCount, setDemeritCount] = useState<number>(1);
  const [incidentDate, setIncidentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [incidentTime, setIncidentTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [locationArea, setLocationArea] = useState('Copper Athletic Club');
  const [infractions, setInfractions] = useState<string[]>(['']);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Live Camera Capture Stream
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedStaff = resolveStaffSignature(rawSignature);
  const resolvedPatron = resolvePatronName(rawStudent);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadStatusMsg('Uploading slip photo to `slips` bucket...');
    try {
      const result = await uploadSlipImage(file);
      setImageUrl(result.url);
      setUploadStatusMsg(
        result.storageMode === 'supabase'
          ? `Uploaded to Supabase Storage bucket "${SLIPS_BUCKET}"`
          : `Slip photo captured & ready for Ring of Honor`
      );
    } catch {
      setUploadStatusMsg('Failed to process slip photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const startLiveCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      // Fallback to native file input with capture="environment"
      cameraInputRef.current?.click();
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureFrameFromVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        stopLiveCamera();
        setUploadingPhoto(true);
        const file = new File([blob], `slip-camera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        const res = await uploadSlipImage(file);
        setImageUrl(res.url);
        setUploadStatusMsg(
          res.storageMode === 'supabase'
            ? `Camera capture uploaded to Supabase bucket "${SLIPS_BUCKET}"`
            : `Camera frame captured for Ring of Honor`
        );
        setUploadingPhoto(false);
      },
      'image/jpeg',
      0.85
    );
  };

  const updateInfraction = (index: number, value: string) => {
    setInfractions((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addInfractionRow = () => {
    setInfractions((prev) => [...prev, '']);
  };

  const removeInfractionRow = (index: number) => {
    if (infractions.length <= 1) {
      setInfractions(['']);
      return;
    }
    setInfractions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedInfractions = infractions.map((i) => i.trim()).filter(Boolean);
    if (cleanedInfractions.length === 0) {
      cleanedInfractions.push('General bar foul cited by staff');
    }

    setSubmitting(true);
    try {
      await submitDemeritSlip({
        raw_student: rawStudent,
        raw_signature: rawSignature,
        demerit_count: demeritCount,
        incident_date: incidentDate,
        incident_time: incidentTime || null,
        location_area: locationArea,
        infractions: cleanedInfractions,
        image_url: imageUrl,
        createPatronIfNew: true,
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        navigate('/docket');
      }, 1400);
    } finally {
      setSubmitting(false);
    }
  };

  const activePreviewInfractions = infractions.map((i) => i.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#B87333]/30 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-xs font-mono-docket uppercase tracking-widest text-[#E8B888]">
          <Camera className="h-3.5 w-3.5 text-[#B87333]" />
          <span>RING OF HONOR · SELF-REPORT STATION</span>
        </div>
        <h1 className="mt-2 font-athletic text-4xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
          LOG YOUR <span className="text-[#B87333]">DEMERIT SLIP</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[#B5A99D]">
          Handed a physical slip across the rail at Copper Athletic Club? Snap a photo for the{' '}
          <code className="text-[#E08A4E] font-mono-docket">slips</code> archive, enter the
          bartender&rsquo;s signature exactly as written, and claim your spot on the Ring of Honor.
        </p>
      </div>

      {submittedSuccess && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/50 bg-emerald-950/60 p-5 text-emerald-200 shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-athletic text-xl uppercase font-bold">
                Slip Logged to the Ring of Honor!
              </h3>
              <p className="text-xs font-mono-docket">
                Normalized Issuer: {resolvedStaff.member?.display_name || rawSignature} · Redirecting
                to The Docket...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Submission Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Step 1: Slip Photo Upload / Camera Capture (`slips` bucket) */}
          <div className="rounded-2xl border border-[#B87333]/30 bg-[#1A1715] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
                  STEP 1 · PHOTO EVIDENCE (`slips` BUCKET)
                </span>
                <h2 className="font-athletic text-2xl font-bold uppercase text-[#F5F2EB]">
                  CAPTURE OR UPLOAD PHYSICAL SLIP
                </h2>
              </div>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(null);
                    setUploadStatusMsg(null);
                  }}
                  className="text-xs font-mono-docket text-rose-400 hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Hidden Native File & Camera Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {cameraActive ? (
              <div className="space-y-3 rounded-xl border border-[#B87333] bg-black p-3">
                <div className="relative overflow-hidden rounded-lg">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="mx-auto max-h-80 w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={captureFrameFromVideo}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 font-athletic text-sm font-bold uppercase text-[#121212]"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Snap Slip Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2.5 text-xs font-mono-docket text-[#D6C7B8]"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : imageUrl ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-xl border border-[#B87333]/50 bg-black p-2">
                  <img
                    src={imageUrl}
                    alt="Uploaded physical slip preview"
                    className="mx-auto max-h-64 w-auto rounded object-contain"
                  />
                </div>
                {uploadStatusMsg && (
                  <p className="flex items-center gap-1.5 font-mono-docket text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{uploadStatusMsg}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={startLiveCamera}
                  disabled={uploadingPhoto}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#B87333]/50 bg-[#121212] p-6 text-center transition hover:border-[#B87333] hover:bg-[#B87333]/10"
                >
                  <Video className="h-7 w-7 text-[#B87333]" />
                  <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                    Take Camera Photo
                  </span>
                  <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                    Use phone or webcam camera
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-[#121212] p-6 text-center transition hover:border-[#B87333] hover:bg-white/5"
                >
                  <Upload className="h-7 w-7 text-[#C86D51]" />
                  <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                    Upload Slip Image
                  </span>
                  <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                    JPG, PNG, WEBP → `slips` bucket
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Patron & Signature Normalization */}
          <div className="rounded-2xl border border-white/10 bg-[#1A1715] p-6 space-y-5">
            <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
              STEP 2 · RECIPIENT &amp; STAFF SIGNATURE NORMALIZATION
            </span>

            {/* Student / Patron Name */}
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                STUDENT / PATRON NAME (AS WRITTEN ON SLIP) *
              </label>
              <input
                type="text"
                required
                value={rawStudent}
                onChange={(e) => setRawStudent(e.target.value)}
                placeholder="e.g. Rick, Burtis, or Anonymous Patron"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="font-mono-docket text-[10px] uppercase text-[#9E8F82]">
                  Quick Roster:
                </span>
                {members
                  .filter((m) => m.is_patron)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRawStudent(m.display_name)}
                      className={`rounded-md border px-2 py-0.5 font-mono-docket text-[11px] transition ${
                        rawStudent.trim().toLowerCase() === m.display_name.toLowerCase()
                          ? 'border-[#B87333] bg-[#B87333]/20 text-[#E8B888] font-bold'
                          : 'border-white/10 bg-[#121212] text-[#B5A99D] hover:border-white/30'
                      }`}
                    >
                      {m.display_name}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setRawStudent('Anonymous Patron')}
                  className="rounded-md border border-white/10 bg-[#121212] px-2 py-0.5 font-mono-docket text-[11px] text-[#B5A99D] hover:border-white/30"
                >
                  Anonymous Patron
                </button>
              </div>
            </div>

            {/* Staff Signature */}
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                STAFF SIGNATURE (RAW SCRIBBLE ON SLIP) *
              </label>
              <input
                type="text"
                required
                value={rawSignature}
                onChange={(e) => setRawSignature(e.target.value)}
                placeholder='e.g. "The Boss - AKA Sarah", "The Douche", "Burtis"'
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              />

              {/* Live Alias Normalization Indicator */}
              <div className="mt-2.5 rounded-xl border border-[#B87333]/30 bg-[#121212] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#B87333]" />
                    <span className="font-mono-docket text-xs text-[#D6C7B8]">
                      Signature Alias Resolver:
                    </span>
                  </div>
                  {resolvedStaff.member ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 font-mono-docket text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Maps to {resolvedStaff.member.display_name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 font-mono-docket text-[11px] text-amber-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Unmapped Alias (Can be linked in /admin)
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {aliases.slice(0, 6).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setRawSignature(a.alias)}
                      className="rounded border border-white/10 bg-[#1A1715] px-2 py-0.5 font-mono-docket text-[10px] text-[#B5A99D] hover:border-[#B87333] hover:text-white"
                    >
                      &ldquo;{a.alias}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Demerit Count, Date, Time, Location, and Infractions */}
          <div className="rounded-2xl border border-white/10 bg-[#1A1715] p-6 space-y-5">
            <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
              STEP 3 · CITATION DETAILS &amp; ITEMIZED INFRACTIONS
            </span>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  DEMERIT COUNT *
                </label>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {[1, 2, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setDemeritCount(cnt)}
                      className={`flex-1 rounded-xl border py-2 font-display-tall text-2xl font-bold transition ${
                        demeritCount === cnt
                          ? 'border-[#B87333] bg-[#B87333] text-[#121212]'
                          : 'border-white/15 bg-[#121212] text-[#F5F2EB] hover:border-[#B87333]/50'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={demeritCount}
                    onChange={(e) => setDemeritCount(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Custom demerit count"
                    className="w-16 rounded-xl border border-white/15 bg-[#121212] px-2.5 py-2 text-center font-mono-docket text-sm font-bold text-[#F5F2EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  INCIDENT DATE *
                </label>
                <input
                  type="date"
                  required
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 font-mono-docket text-xs text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  INCIDENT TIME
                </label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 font-mono-docket text-xs text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                LOCATION / AREA
              </label>
              <input
                type="text"
                value={locationArea}
                onChange={(e) => setLocationArea(e.target.value)}
                placeholder="Copper Athletic Club"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              />
            </div>

            {/* Itemized Infractions Dynamic List */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  ITEMIZED INFRACTIONS WRITTEN ON SLIP *
                </label>
                <button
                  type="button"
                  onClick={addInfractionRow}
                  className="inline-flex items-center gap-1 font-mono-docket text-xs font-bold text-[#E08A4E] hover:text-[#B87333]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="mt-2 space-y-2.5">
                {infractions.map((inf, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono-docket text-xs font-bold text-[#B87333] w-6">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={inf}
                      onChange={(e) => updateInfraction(idx, e.target.value)}
                      placeholder={
                        idx === 0
                          ? 'e.g. Too many seat moves, Whistling at bartender...'
                          : 'Additional infraction...'
                      }
                      className="flex-1 rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                    />
                    {infractions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInfractionRow(idx)}
                        aria-label="Remove infraction line"
                        className="rounded-lg border border-white/10 p-2 text-[#9E8F82] hover:border-rose-500/40 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-6 py-4 font-athletic text-xl font-bold uppercase tracking-wider text-[#121212] shadow-[0_0_30px_rgba(184,115,51,0.4)] transition hover:brightness-110 disabled:opacity-50"
          >
            <span>{submitting ? 'Logging to Ring of Honor...' : 'Enshrine Slip in Ring of Honor'}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        {/* Right Column: Live Physical Slip Replica Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-28 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono-docket text-xs font-bold uppercase tracking-wider text-[#B87333]">
                LIVE DOCKET SLIP PREVIEW
              </span>
              <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                Updates as you type
              </span>
            </div>

            <PhysicalSlipCard
              slip={{
                id: 'PREVIEW-ROH',
                raw_student: rawStudent || 'Anonymous Patron',
                patronDisplayName: resolvedPatron
                  ? resolvedPatron.display_name
                  : rawStudent || 'Anonymous Patron',
                raw_signature: rawSignature || 'Staff',
                issuerDisplayName: resolvedStaff.member
                  ? resolvedStaff.member.display_name
                  : rawSignature || 'Unverified Staff',
                demerit_count: demeritCount,
                incident_date: incidentDate,
                incident_time: incidentTime,
                location_area: locationArea || 'Copper Athletic Club',
                infractions:
                  activePreviewInfractions.length > 0
                    ? activePreviewInfractions
                    : ['Awaiting infraction entry...'],
                matchedAlias: resolvedStaff.matchedAlias,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
