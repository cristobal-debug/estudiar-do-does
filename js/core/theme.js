// Theme: 'system' follows the OS; 'light' / 'dark' are stamped on <html> so CSS tokens switch.
import { S } from './store.js';

export function applyTheme() {
  const root = document.documentElement;
  if (S.theme === 'light' || S.theme === 'dark') root.dataset.theme = S.theme;
  else delete root.dataset.theme;
  const dark = S.theme === 'dark' || (S.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#12161f' : '#f6f4ef');
}
