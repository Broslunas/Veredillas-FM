/// <reference path="../.astro/types.d.ts" />

interface Window {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}
