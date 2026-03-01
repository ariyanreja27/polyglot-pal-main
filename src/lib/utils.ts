import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for intelligent Tailwind CSS class merging.
 * Overcomes conflicts when composing standard classes with conditional logic using `clsx`
 * and resolves colliding specificities via `tailwind-merge`.
 * 
 * @function cn
 * @param {...ClassValue[]} inputs - Dynamic stream of class names or conditional objects.
 * @returns {string} Highly optimized, unified string of classes suitable for React `className`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
