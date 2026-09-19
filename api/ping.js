export const config = { runtime: 'edge' };
export default function handler() {
  return new Response(null, { status: 204, headers: {
    'Cache-Control': 'no-store, no-transform',
    'X-Pulse-Region': process.env.VERCEL_REGION || '',
  }});
}
