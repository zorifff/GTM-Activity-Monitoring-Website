import { useEffect, useImperativeHandle, useRef } from 'react';

// Site key publik (gtm-monitor-frontend/.env). Kosong = captcha tidak ditampilkan (backend juga tanpa secret key).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

// Script Turnstile dimuat sekali untuk seluruh aplikasi
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Script Turnstile gagal dimuat'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Widget Cloudflare Turnstile. onToken(token) saat lolos, onToken(null) saat kedaluwarsa/gagal.
// ref.reset() meminta token baru — wajib setelah percobaan login gagal karena token hanya berlaku sekali.
export default function TurnstileWidget({ action, onToken, onError, ref }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const callbacksRef = useRef({ onToken, onError });
  callbacksRef.current = { onToken, onError };

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.reset(widgetIdRef.current);
      callbacksRef.current.onToken(null);
    }
  }), []);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: 'light',
          size: 'flexible',
          language: 'id',
          callback: (token) => callbacksRef.current.onToken(token),
          'expired-callback': () => callbacksRef.current.onToken(null),
          'timeout-callback': () => callbacksRef.current.onToken(null),
          'error-callback': () => {
            callbacksRef.current.onToken(null);
            callbacksRef.current.onError?.();
          }
        });
      })
      .catch(() => callbacksRef.current.onError?.());

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [action]);

  // Tinggi widget Turnstile 65px: ruang dipesan agar form tidak bergeser saat widget muncul
  return <div ref={containerRef} className="cf-turnstile" style={{ width: '100%', minHeight: '65px' }} />;
}
