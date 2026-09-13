'use client';

import { useEffect, useState } from 'react';

const ZOOM_DURATION_MS = 1400;
const FADE_DURATION_MS = 400;

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) return;
    sessionStorage.setItem('splashShown', '1');

    setVisible(true);
    const fadeTimer = setTimeout(() => setFadingOut(true), ZOOM_DURATION_MS);
    const removeTimer = setTimeout(() => setVisible(false), ZOOM_DURATION_MS + FADE_DURATION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f9fafb]"
      style={{
        animation: fadingOut ? `splash-fade-out ${FADE_DURATION_MS}ms ease-out forwards` : undefined,
      }}
    >
      <img
        src="/splash-logo.jpg"
        alt="NFL Predictions"
        className="w-64 max-w-[70vw] h-auto"
        style={{
          animation: `splash-zoom ${ZOOM_DURATION_MS}ms ease-out forwards`,
        }}
      />
    </div>
  );
}
