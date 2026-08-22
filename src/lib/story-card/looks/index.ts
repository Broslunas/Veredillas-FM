import { classic } from './classic';
import { midnight } from './midnight';
import { sunset } from './sunset';
import { minimalist } from './minimalist';
import type { Look } from '../types';

export const ALL_LOOKS: Look[] = [classic, midnight, sunset, minimalist];

export const LOOKS_BY_ID: Record<string, Look> = {
  classic,
  midnight,
  sunset,
  minimalist,
};

export function getLook(id: string): Look {
  return LOOKS_BY_ID[id] || classic;
}
