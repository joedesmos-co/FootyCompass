/**
 * Cloudflare Pages middleware — return HTTP 404 for unknown app routes.
 * Static assets, sitemap, robots.txt, and ads.txt pass through unchanged.
 *
 * Requires public/data/indexable-paths.json (npm run write:indexable-paths).
 */

import indexable from '../public/data/indexable-paths.json';

const INDEXABLE = new Set(indexable.paths ?? []);

const STATIC_EXACT = new Set([
  '/robots.txt',
  '/ads.txt',
  '/sitemap.xml',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/og.png',
  '/404.html',
]);

const STATIC_PREFIXES = ['/assets/', '/brand/', '/images/', '/data/', '/dev-data/'];

function normalizePathname(pathname) {
  const raw = String(pathname ?? '').trim();
  if (!raw || raw === '/') return '/';
  return raw.replace(/\/+$/, '') || '/';
}

function isPassthrough(pathname) {
  if (STATIC_EXACT.has(pathname)) return true;
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (/\.[a-z0-9]{2,8}$/i.test(pathname) && !pathname.endsWith('.html')) return true;
  return false;
}

async function notFoundResponse(context, url) {
  const assetResponse = await context.env.ASSETS.fetch(new URL('/index.html', url));
  const headers = new Headers(assetResponse.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-cache');
  headers.set('X-FootyCompass-Route', 'not-found');
  return new Response(assetResponse.body, { status: 404, headers });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = normalizePathname(url.pathname);

  if (isPassthrough(pathname)) {
    return context.next();
  }

  if (pathname.startsWith('/dev/')) {
    return notFoundResponse(context, url);
  }

  if (INDEXABLE.has(pathname)) {
    return context.next();
  }

  return notFoundResponse(context, url);
}
