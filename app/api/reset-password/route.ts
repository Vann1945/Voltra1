import handler from '@/api-handlers/reset-password';
import { adaptVercelHandler } from '@/lib/vercelAdapter';

const wrapped = adaptVercelHandler(handler);

export const GET = wrapped;
export const POST = wrapped;
export const PUT = wrapped;
export const PATCH = wrapped;
export const DELETE = wrapped;
