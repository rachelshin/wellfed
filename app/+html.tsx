import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// HTML shell for web builds. With the Metro bundler, Expo IGNORES
// web/index.html entirely — this file is the only way to customize the
// served HTML (global CSS, PWA meta tags, manifest, service worker, splash).

const css = `
  /* Prevent iOS PWA zoom on input focus; remove browser focus ring */
  input, textarea, select {
    font-size: 16px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    outline: none !important;
    outline-width: 0 !important;
    box-shadow: none !important;
    -webkit-appearance: none;
  }
  input:focus, textarea:focus, select:focus,
  input:focus-visible, textarea:focus-visible, select:focus-visible {
    outline: none !important;
    outline-width: 0 !important;
    box-shadow: none !important;
  }
  /* RNW buttons/touchables are focusable divs — kill the focus ring on EVERY
     element (box-shadow deliberately untouched so card/FAB shadows survive) */
  *:focus, *:focus-visible {
    outline: none !important;
  }
  /* -webkit-appearance:none strips date-input text rendering on iOS;
     textfield keeps the picker working while letting our border/bg styles apply */
  input[type="date"] {
    -webkit-appearance: textfield;
  }
  /* iOS highlights the focused day/month/year segment inside date inputs with
     a system-blue pill. Not an outline — only styleable via these WebKit
     pseudo-elements. Recolor it to the app's plum. */
  input[type="date"]::-webkit-datetime-edit-day-field:focus,
  input[type="date"]::-webkit-datetime-edit-month-field:focus,
  input[type="date"]::-webkit-datetime-edit-year-field:focus {
    background-color: #e8dff2;
    color: #2B2040;
    outline: none;
  }

  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    /* Match splash background so there's no flash before the splash div renders */
    background-color: #faf7f2;
    overflow: hidden;
  }

  #root {
    height: 100%;
    overflow: hidden;
  }

  /* Solid background covers white page before React mounts and renders its own splash */
  #splash {
    position: fixed;
    inset: 0;
    background: #faf7f2;
    z-index: 9998;
  }

  /* Remove tap highlight on mobile */
  * {
    -webkit-tap-highlight-color: transparent;
  }
`;

const swRegistration = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      });
    });
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Well Fed" />
        <meta name="theme-color" content="#8a7aaa" />

        <title>Well Fed</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: 'window.__splashStart = Date.now();' }} />
      </head>
      <body>
        <div id="splash" />
        {children}
        <script dangerouslySetInnerHTML={{ __html: swRegistration }} />
      </body>
    </html>
  );
}
