import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyAccountAppearance } from './lib/applyAccountAppearance';
import { loadUserAccount } from './lib/userAccount';
import './index.css';

applyAccountAppearance(loadUserAccount().appearance);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);