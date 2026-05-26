import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const STUDENT_GROUPS = [
  'Odd 9:30 Pre IELTS',
  'Odd 14:30 Pre IELTS',
  'Odd 16:30 Pre IELTS',
  'Odd 18:30 Pre IELTS',
  'Even 9:30 Graduation',
  'Even 14:30 Pre IELTS',
  'Even 16:30 Graduation',
  'Even 18:30 Graduation'
] as const;

export type StudentGroup = typeof STUDENT_GROUPS[number];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateOverallBand(
  ta: number | string,
  cc: number | string,
  lr: number | string,
  gra: number | string
): number {
  const parsedTa = typeof ta === 'number' ? ta : parseFloat(ta) || 0;
  const parsedCc = typeof cc === 'number' ? cc : parseFloat(cc) || 0;
  const parsedLr = typeof lr === 'number' ? lr : parseFloat(lr) || 0;
  const parsedGra = typeof gra === 'number' ? gra : parseFloat(gra) || 0;
  
  const average = (parsedTa + parsedCc + parsedLr + parsedGra) / 4;
  
  // IELTS Rounding rules
  return Math.round(average * 2) / 2;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// IELTS Band Score Color Utilities
export function getBandBadgeStyle(score: number | string | null | undefined): string {
  if (score === undefined || score === null || score === '') {
    return 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)] border-[var(--color-border)] font-sans font-bold';
  }
  const numScore = typeof score === 'number' ? score : parseFloat(score);
  if (isNaN(numScore)) {
    return 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)] border-[var(--color-border)] font-sans font-bold';
  }
  if (numScore <= 5.0) return 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30 font-sans font-bold';
  if (numScore <= 6.0) return 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30 font-sans font-bold';
  if (numScore <= 7.0) return 'bg-[#84CC16]/15 text-[#84CC16] border-[#84CC16]/30 font-sans font-bold';
  if (numScore <= 8.5) return 'bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30 font-sans font-bold';
  return 'bg-white/5 rainbow-score-text border-white/10 font-sans font-bold';
}

export function getBandTextColor(score: number | string | null | undefined): string {
  if (score === undefined || score === null || score === '') {
    return 'text-[var(--color-text-tertiary)] font-sans font-bold';
  }
  const numScore = typeof score === 'number' ? score : parseFloat(score);
  if (isNaN(numScore)) {
    return 'text-[var(--color-text-tertiary)] font-sans font-bold';
  }
  if (numScore <= 5.0) return 'text-[#EF4444] font-sans font-bold';
  if (numScore <= 6.0) return 'text-[#F97316] font-sans font-bold';
  if (numScore <= 7.0) return 'text-[#84CC16] font-sans font-bold';
  if (numScore <= 8.5) return 'text-[#A855F7] font-sans font-bold';
  return 'rainbow-score-text font-sans font-bold';
}