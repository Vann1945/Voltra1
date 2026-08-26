import handler from '@/api-handlers/channels';
import { adaptVercelHandler } from '@/lib/vercelAdapter';

const wrapped = adaptVercelHandler(handler);
export const GET = wrapped;
export const POST = wrapped;
export const PATCH = wrapped;
export const DELETE = wrapped;
