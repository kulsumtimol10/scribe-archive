import type { ReactElement } from 'react';
import type { CodexTail } from '../../lib/codex';

/** The end of a tail, side on, drawn in the current text colour. */
const TIPS: Record<CodexTail, ReactElement> = {
  morningstartail: (
    <>
      <path d="M2 16 C12 16 20 14 29 12" />
      <circle cx="35" cy="12" r="4.5" fill="currentColor" />
      <path d="M35 4.5V2 M35 19.5V22 M42.5 12H45 M40.3 6.7l1.8-1.8 M40.3 17.3l1.8 1.8 M29.7 6.7l-1.8-1.8 M29.7 17.3l-1.8 1.8" />
    </>
  ),
  clubtail: (
    <>
      <path d="M2 16 C12 16 20 14 28 12" />
      <ellipse cx="36" cy="12" rx="8" ry="5.5" fill="currentColor" />
    </>
  ),
  daggertail: (
    <>
      <path d="M2 16 C12 16 20 14 30 12" />
      <path d="M30 9 L43 12 L30 15 Z" fill="currentColor" />
    </>
  ),
  swordtail: (
    <>
      <path d="M2 16 C10 16 16 14 22 12.5" />
      <path d="M22 10 L46 12 L22 14 Z" fill="currentColor" />
    </>
  ),
  scorpiontail: (
    <>
      <path d="M2 19 C14 19 22 17 27 10 C30 5 35 3 39 5" />
      <circle cx="39.5" cy="5.5" r="2.4" fill="currentColor" />
      <path d="M41 6 L45 12 L39 8.5 Z" fill="currentColor" />
    </>
  ),
  feathertail: (
    <>
      <path d="M2 16 C12 16 20 14 28 12" />
      <path d="M28 12 C34 4 40 3 44 4 C40 7 35 10 28 12 Z M28 12 C35 10 41 11 45 13 C40 15 34 14 28 12 Z M28 12 C34 15 39 19 42 22 C37 21 32 17 28 12 Z" fill="currentColor" fillOpacity="0.85" />
    </>
  ),
};

export function TailIcon({ tail, size = 48 }: { tail: CodexTail | null; size?: number }) {
  return (
    <svg
      width={size}
      height={size / 2}
      viewBox="0 0 48 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tail ? TIPS[tail] : <path d="M2 16 C14 16 24 14 40 11" />}
    </svg>
  );
}
