// Pulse speed-test endpoints on Cloudflare's edge (nearest PoP, e.g. Dhaka).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'X-Pulse-Region, X-Pulse-Country',
  'Timing-Allow-Origin': '*',
  'Cache-Control': 'no-store, no-transform',
};
const MAX = 100 * 1024 * 1024;
let BLOCK = null; // random data, created lazily (Workers disallow random values at global scope)
function getBlock() {
  if (!BLOCK) { BLOCK = new Uint8Array(1 << 20); for (let o = 0; o < BLOCK.length; o += 65536) crypto.getRandomValues(BLOCK.subarray(o, o + 65536)); }
  return BLOCK;
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const h = { ...CORS, 'X-Pulse-Region': req.cf?.colo || '', 'X-Pulse-Country': req.cf?.country || '' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    if (url.pathname === '/ping') return new Response(null, { status: 204, headers: h });

    if (url.pathname === '/ip') {
      return Response.json({ ip: req.headers.get('cf-connecting-ip') || '', colo: req.cf?.colo, city: req.cf?.city, country: req.cf?.country, asn: req.cf?.asn, httpVersion: req.cf?.httpProtocol }, { headers: h });
    }

    if (url.pathname === '/down') {
      let left = Math.min(parseInt(url.searchParams.get('bytes')) || 25e6, MAX);
      const BLK = getBlock();
      const body = new ReadableStream({
        pull(ctrl) {
          if (left <= 0) return ctrl.close();
          const n = Math.min(left, BLK.length); left -= n;
          ctrl.enqueue(n === BLK.length ? BLK.slice() : BLK.slice(0, n));
        },
      });
      return new Response(body, { headers: { ...h, 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'identity' } });
    }

    if (url.pathname === '/up') {
      let n = 0;
      if (req.body) { const r = req.body.getReader(); for (;;) { const { done, value } = await r.read(); if (done) break; n += value.length; } }
      return Response.json({ received: n }, { headers: h });
    }

    return new Response('Pulse speed-test edge', { status: 200, headers: h });
  },
};
