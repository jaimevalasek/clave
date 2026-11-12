import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/fonts.css';
import './ui/tokens.css';
import './ui/motion.css';
import { App } from './App';
import { DEFAULT_APPEARANCE, applyAppearance } from './features/appearance/applyAppearance';

// The palette is never in a stylesheet: the default theme is on :root before
// the first paint, and the stored appearance replaces it during boot.
applyAppearance(DEFAULT_APPEARANCE);

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado no index.html.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
