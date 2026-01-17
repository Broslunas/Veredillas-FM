/// <reference path="../.astro/types.d.ts" />

interface Window {
  showToast: (message: string, type?: 'default' | 'success' | 'error') => void;
}
