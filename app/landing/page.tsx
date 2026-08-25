'use client';

import { LandingPage } from '@/components/LandingPage';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function LandingRoute() {
  const { addons } = useAppShell();
  const navigate = useAppNavigate(addons);
  return <LandingPage onNavigate={navigate} />;
}
