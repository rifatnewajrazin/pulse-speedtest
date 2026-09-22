// Pulse speed-test endpoints on Cloudflare's edge (nearest PoP, e.g. Dhaka).
// Only Pulse's own pages may use these endpoints from a browser (stops other sites hot-linking the bandwidth).
const ORIGINS = [/^https:\/\/speed\.rifatnewajrazin\.com$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const corsFor = origin => ({
  'Access-Control-Allow-Origin': ORIGINS.some(r => r.test(origin || '')) ? origin : 'https://speed.rifatnewajrazin.com',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400', // cache the upload preflight instead of repeating it
  'Access-Control-Expose-Headers': 'X-Pulse-Region, X-Pulse-Country',
  'Timing-Allow-Origin': '*',
  'Cache-Control': 'no-store, no-transform',
});
const MAX = 25 * 1000 * 1000; // larger responses ran out of Worker CPU time and were cut off mid-stream
let BLOCK = null; // random data, created lazily (Workers disallow random values at global scope)
function getBlock() {
  if (!BLOCK) { BLOCK = new Uint8Array(1 << 20); for (let o = 0; o < BLOCK.length; o += 65536) crypto.getRandomValues(BLOCK.subarray(o, o + 65536)); }
  return BLOCK;
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const h = { ...corsFor(req.headers.get('Origin')),'X-Pulse-Region': req.cf?.colo || '', 'X-Pulse-Country': req.cf?.country || '' };
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
      // arrayBuffer() collects the body natively; a JS read loop per chunk burned through the free plan's
      // ~10 ms CPU limit on multi-MB uploads and failed with error 1102.
      const n = req.body ? (await req.arrayBuffer()).byteLength : 0;
      return Response.json({ received: n }, { headers: h });
    }

    return new Response('Pulse speed-test edge', { status: 200, headers: h });
  },
};
