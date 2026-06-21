/**
 * Shared Wikimedia Commons fetch helpers for club/league/flag assets.
 */

export const USER_AGENT = 'FootyCompass/1.0 (visual-asset-ingest; https://footycompass.com)';

export const REQUEST_TIMEOUT_MS = 12_000;
export const MAX_RETRIES = 2;
export const API_DELAY_MS = 650;

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtml(s) {
  return String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function stripHtml(s) {
  return decodeHtml(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function wikiFetch(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if ([429, 503, 408].includes(res.status) && attempt < MAX_RETRIES) {
        await sleep(1200 * (attempt + 1));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('Wikimedia fetch failed');
}

function parseCommonsPage(page) {
  const info = page.imageinfo?.[0];
  if (!info?.url) return null;
  if (info.mime && !info.mime.startsWith('image/')) return null;

  const ext = info.extmetadata ?? {};
  const licenseShort = stripHtml(ext.LicenseShortName?.value ?? '');
  const artist = stripHtml(ext.Artist?.value ?? ext.Credit?.value ?? '');
  const description = stripHtml(ext.ImageDescription?.value ?? '');
  const title = page.title ?? '';

  return {
    commonsFile: title.replace(/^File:/, ''),
    pageTitle: title,
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    thumbUrl: info.thumburl ?? info.url,
    originalUrl: info.url,
    width: info.width ?? info.thumbwidth ?? 0,
    height: info.height ?? info.thumbheight ?? 0,
    mime: info.mime,
    licenseShort,
    artist: artist || 'Wikimedia Commons contributor',
    description,
  };
}

export async function fetchCommonsFile(commonsFile) {
  const title = commonsFile.startsWith('File:') ? commonsFile : `File:${commonsFile}`;
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '640',
    format: 'json',
    origin: '*',
  });

  const res = await wikiFetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) return { error: `http_${res.status}` };

  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;

  return parseCommonsPage(page);
}

export async function searchCommonsFiles(searchTerm, limitResults = 8) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: String(limitResults),
    gsrsearch: searchTerm,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '640',
    format: 'json',
    origin: '*',
  });

  const res = await wikiFetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) return { error: `http_${res.status}`, results: [] };

  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const results = Object.values(pages).map(parseCommonsPage).filter(Boolean);
  return { results };
}

export async function downloadBinary(url, destPath, writeFile) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFile(destPath, buf);
}

export function extFromMime(mime, fallback = 'svg') {
  const map = {
    'image/svg+xml': 'svg',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  return map[mime] ?? fallback;
}
