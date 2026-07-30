import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compõe classes condicionais sem conflito (`clsx` + `tailwind-merge`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
