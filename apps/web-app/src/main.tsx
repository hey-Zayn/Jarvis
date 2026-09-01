import './styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, StyledEngineProvider, ThemeProvider } from '@mui/material';
import App from './App';
import { appTheme } from './theme';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={appTheme}>
        <CssBaseline enableColorScheme />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </StrictMode>
);
