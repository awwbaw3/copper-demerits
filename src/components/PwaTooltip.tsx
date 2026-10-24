import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Zap } from 'lucide-react';

interface PwaTooltipProps {
  content: React.ReactNode;
  pwaTag?: string;
  children?: React.ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

export const PwaTooltip: React.FC<PwaTooltipProps> = ({
  content,
  pwaTag = 'PWA FEATURE',
  children,
  side = 'top',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when tapping outside on mobile
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children ? (
        <div
          onClick={toggle}
          className="cursor-pointer inline-flex items-center"
          role="button"
          tabIndex={0}
          aria-label="Toggle feature tooltip"
        >
          {children}
        </div>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-label="Feature info"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-[#DFC15E]/40 bg-[#DFC15E]/10 text-[#DFC15E] hover:bg-[#DFC15E]/25 hover:text-[#F5F2EB] active:scale-95 transition cursor-pointer"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 w-64 sm:w-72 rounded-2xl border-2 border-[#DFC15E]/60 bg-[#1A1513] p-3 text-xs text-[#F5F2EB] shadow-[0_15px_40px_rgba(0,0,0,0.9)] animate-fadeIn ${
            side === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : 'top-full left-1/2 -translate-x-1/2 mt-2'
          }`}
        >
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rotate-45 border-[#DFC15E]/60 bg-[#1A1513] ${
              side === 'top'
                ? 'top-full -mt-1.5 border-b-2 border-r-2 border-t-0 border-l-0'
                : 'bottom-full -mb-1.5 border-t-2 border-l-2 border-b-0 border-r-0'
            }`}
          />

          <div className="flex items-center gap-1.5 pb-1 border-b border-white/10 mb-1.5">
            <Zap className="h-3 w-3 text-[#DFC15E] shrink-0" />
            <span className="font-mono-docket text-[10px] font-black uppercase tracking-wider text-[#DFC15E]">
              {pwaTag}
            </span>
          </div>

          <div className="font-sans text-[11px] leading-relaxed text-[#D6C7B8]">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export const PwaHelpIcon: React.FC<{
  content: React.ReactNode;
  tag?: string;
  className?: string;
}> = ({ content, tag = 'MOBILE PWA TIP', className = '' }) => {
  return (
    <PwaTooltip content={content} pwaTag={tag} className={className}>
      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-[#B87333]/40 bg-[#B87333]/15 text-[#E8B888] hover:text-[#DFC15E] hover:border-[#DFC15E] text-[10px] font-mono font-bold transition">
        ?
      </span>
    </PwaTooltip>
  );
};
