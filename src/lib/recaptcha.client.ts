let recaptchaPromise: Promise<void> | null = null;

export function loadRecaptcha(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).grecaptcha) return Promise.resolve();
  if (recaptchaPromise) return recaptchaPromise;

  recaptchaPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.google.com/recaptcha/api.js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
    document.head.appendChild(script);
  });

  return recaptchaPromise;
}
