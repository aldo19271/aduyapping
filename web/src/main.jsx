import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { AppProvider } from './store.jsx';
import App from './App.jsx';
import './lib/theme.js';
import './styles.css';
import './doodle.css';
import { initUiSounds } from './lib/sound.js';
import { FAVICON_SRC } from '../config/brand.js';

initUiSounds();

// Ikon tab browser mengikuti config/brand.js
if (FAVICON_SRC) {
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.removeAttribute('type');
  link.href = FAVICON_SRC;
}

createRoot(document.getElementById('root')).render(
  <MotionConfig reducedMotion="never">
    <AppProvider>
      <App />
    </AppProvider>
  </MotionConfig>,
);
