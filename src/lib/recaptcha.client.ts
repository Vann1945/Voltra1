let recaptchaPromise: Promise<void> | null = null;

function isRecaptchaReady(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).grecaptcha?.render === 'function';
}

export function loadRecaptcha(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (isRecaptchaReady()) return Promise.resolve();
  if (recaptchaPromise) return recaptchaPromise;

  recaptchaPromise = new Promise<void>((resolve, reject) => {
    const waitUntilReady = () => {
      if (!(window as any).grecaptcha) {
        reject(new Error('reCAPTCHA script loaded but grecaptcha is unavailable.'));
        return;
      }
      (window as any).grecaptcha.ready(() => resolve());
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://www.google.com/recaptcha/api.js"]'
    );
    if (existing) {
      if ((window as any).grecaptcha) {
        waitUntilReady();
      } else {
        existing.addEventListener('load', waitUntilReady, { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    script.onload = waitUntilReady;
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
    document.head.appendChild(script);
  });

  recaptchaPromise.catch(() => {
    recaptchaPromise = null;
  });

  return recaptchaPromise;
}
