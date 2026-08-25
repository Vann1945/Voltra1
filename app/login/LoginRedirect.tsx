'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const target = error ? `/?authError=${encodeURIComponent(error)}` : '/';
    router.replace(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
