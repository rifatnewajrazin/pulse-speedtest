export const config = { runtime: 'edge' };
// Counts uploaded bytes at the nearest edge node (Vercel body cap ~4 MB per request).
export default async function handler(req) {
  let n = 0;
  if (req.body) { const r = req.body.getReader(); for (;;) { const { done, value } = await r.read(); if (done) break; n += value.length; } }
  return new Response(JSON.stringify({ received: n }), { headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'X-Pulse-Region': process.env.VERCEL_REGION || '',
  }});
}
