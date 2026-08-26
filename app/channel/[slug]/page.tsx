'use client';

import { ChannelPage } from '@/components/ChannelPage';

export default async function PublicChannelRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChannelPage slug={slug} />;
}
