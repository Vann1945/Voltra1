'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResetPasswordPage } from '@/components/ResetPasswordPage';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

function ResetPasswordInner() {
  const { addons } = useAppShell();
  const navigate = useAppNavigate(addons);
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const uid = searchParams.get('uid') || '';

  return (
    <ResetPasswordPage
      token={token}
      uid={uid}
      onNavigate={() => navigate('home')}
    />
  );
}

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
