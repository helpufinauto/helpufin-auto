/*
=========================================================
HELPUFIN AUTO — SPA DEVELOPMENT SERVER
=========================================================
Proper History API fallback for client-side routing.

Every non-file request is served index.html so the
client router can restore the correct page on refresh,
deep links, bookmarks, and shared URLs.

Query parameters and hash fragments are preserved
automatically by the browser — we never redirect.
=========================================================
*/

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/* =========================================
   HTTP COMPRESSION (Phase 10)
   =========================================
   Text-based assets are served brotli- or gzip-compressed
   when the client advertises support (brotli preferred).
   Compressed representations are cached in memory keyed by
   file path + encoding, so each asset is compressed once
   per server lifetime — no per-request compression cost.
   Images and fonts are never compressed (already compressed
   formats), and responses under MIN_COMPRESS_SIZE bytes are
   sent as-is. ETags remain content-derived (raw bytes) and
   are identical across encodings; `Vary: Accept-Encoding`
   ensures caches never mix variants. 304 handling happens
   before compression, so 304s are never encoded. */

const COMPRESSIBLE_EXTENSIONS = new Set([
  ".html", ".js", ".mjs", ".css", ".json",
  ".svg", ".xml", ".txt"
]);

const MIN_COMPRESS_SIZE = 1024;

const BROTLI_QUALITY = 5;   // fast one-time cost, good ratio
const GZIP_LEVEL = 6;

/* path + encoding -> compressed Buffer (FIFO-capped) */
const compressedCache = new Map();
const MAX_COMPRESSED_ENTRIES = 500;

function parseAcceptEncoding(header) {

  if (!header) return [];

  return header
    .split(",")
    .map((part) => {

      const trimmed = part.trim().toLowerCase();
      const enc = trimmed.split(";")[0].trim();
      const qMatch = trimmed.match(/;q=([\d.]+)/);
      const q = qMatch ? parseFloat(qMatch[1]) : 1;

      return { enc, q };

    })
    .filter((e) => e.q > 0 && (e.enc === "br" || e.enc === "gzip"))
    .sort((a, b) => b.q - a.q);

}

function getCompressed(filePath, data, enc) {

  const key = filePath + "\u0000" + enc;

  if (compressedCache.has(key)) {
    return compressedCache.get(key);
  }

  const compressed =
    enc === "br"
      ? zlib.brotliCompressSync(data, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY
          }
        })
      : zlib.gzipSync(data, { level: GZIP_LEVEL });

  /* Simple FIFO eviction so the cache can never grow unbounded. */
  if (compressedCache.size >= MAX_COMPRESSED_ENTRIES) {
    const oldest = compressedCache.keys().next().value;
    compressedCache.delete(oldest);
  }

  compressedCache.set(key, compressed);

  return compressed;

}


/* True when the path ends in a known static-asset extension.
   Used to keep the SPA fallback from intercepting asset URLs. */
function hasKnownAssetExtension(p) {

  const ext = path.extname(p).toLowerCase();

  return (
    ext !== "" &&
    Object.prototype.hasOwnProperty.call(MIME_TYPES, ext)
  );

}

function sendFile(req, res, filePath, statusCode = 200) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send404(res);
      return;
    }

    /* =========================================
       CONDITIONAL REQUEST SUPPORT (ETag / 304)
       =========================================
       Weak ETag derived from content — identical bytes
       always produce the identical tag, so edits
       automatically bust the cache (no stale-asset risk).
       Repeating visits to CSS/JS/images pay nothing
       instead of re-downloading megabytes. */
    const etag =
      'W/"' +
      crypto.createHash("md5").update(data).digest("hex") +
      '"';

    const ifNoneMatch = req.headers["if-none-match"];

    if (
      ifNoneMatch &&
      ifNoneMatch.split(",").some((tag) => tag.trim() === etag)
    ) {
      res.writeHead(304, { ETag: etag });
      res.end();
      return;
    }

    /* =========================================
       ENCODING NEGOTIATION (Phase 10)
       ========================================= */
    const ext = path.extname(filePath).toLowerCase();
    const compressible =
      COMPRESSIBLE_EXTENSIONS.has(ext) &&
      data.length >= MIN_COMPRESS_SIZE;

    const accepted = compressible
      ? parseAcceptEncoding(req.headers["accept-encoding"])
      : [];

    let body = data;
    let contentEncoding = null;

    if (accepted.length) {
      contentEncoding = accepted[0].enc;
      body = getCompressed(filePath, data, contentEncoding);
    }

    const headers = {
      "Content-Type": getMimeType(filePath),
      "Cache-Control": getCacheControl(filePath),
      ETag: etag
    };

    /* Always declare variance for compressible types so shared
       caches never serve an encoded variant to a client that
       cannot decode it. */
    if (compressible) {
      headers["Vary"] = "Accept-Encoding";
    }

    if (contentEncoding) {
      headers["Content-Encoding"] = contentEncoding;
    }

    res.writeHead(statusCode, headers);

    res.end(body);
  });
}

/* =========================================
   CACHE POLICY
   =========================================
   All policies are content-validated by the ETag above,
   so nothing can ever go stale:
   • HTML          → no-cache (always revalidated; router/page code changes)
   • CSS/JS/JSON   → 1 hour in-browser, then revalidated via ETag (304)
   • images/fonts  → 1 week in-browser, then revalidated via ETag (304)
   No dynamic/API/Supabase responses are ever touched — they
   never pass through sendFile. */
function getCacheControl(filePath) {

  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".css" || ext === ".js" || ext === ".mjs" || ext === ".json") {
    return "public, max-age=3600, must-revalidate";
  }

  if (
    [
      ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif",
      ".ico", ".woff", ".woff2", ".ttf", ".otf"
    ].includes(ext)
  ) {
    return "public, max-age=604800, stale-while-revalidate=86400";
  }

  return "no-cache";

}

function send404(res) {
  res.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end("404 Not Found");
}

function sendIndex(req, res) {
  sendFile(req, res, path.join(ROOT, "index.html"));
}

const server = http.createServer((req, res) => {
  // Reject literal dot-segment paths (e.g. "/../x") outright.
  // Browsers canonicalise these away before sending, so normal
  // navigation is never affected — this only hardens raw clients.
  const rawPath = (req.url || "").split("?")[0];

  if (/(?:^|\/)\.\.(?:\/|$)/.test(rawPath)) {
    send404(res);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // Decode the pathname (handles spaces, unicode, etc.)
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (e) {
    pathname = url.pathname;
  }

  // Normalize: strip trailing slash except root
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.replace(/\/+$/, "");
  }

  // Root → index.html
  if (pathname === "/" || pathname === "") {
    sendIndex(req, res);
    return;
  }

  // Resolve the requested path safely inside ROOT
  const filePath = path.normalize(path.join(ROOT, pathname));

  // Prevent path traversal outside the project root.
  // Compare against ROOT + separator so sibling directories that
  // merely share a name prefix (e.g. "...marketplace-backup")
  // can never be reached.
  const rootWithSep =
    ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

  if (filePath !== ROOT && !filePath.startsWith(rootWithSep)) {
    send404(res);
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      // Real file exists → serve it directly
      sendFile(req, res, filePath);
      return;
    }

    if (!err && stats.isDirectory()) {
      // Directory → try index.html inside it, else SPA fallback
      const dirIndex = path.join(filePath, "index.html");
      fs.stat(dirIndex, (dirErr, dirStats) => {
        if (!dirErr && dirStats.isFile()) {
          sendFile(req, res, dirIndex);
        } else {
          sendIndex(req, res);
        }
      });
      return;
    }

    // =========================================
    // STATIC ASSET GUARD
    // =========================================
    // Requests for known asset types (.js/.css/.png/...) that do
    // NOT exist must fail with a real 404 — they are never
    // client-side routes, and masking them with index.html would
    // feed HTML to <script>/<link> tags and break the page.
    // =========================================
    if (hasKnownAssetExtension(pathname)) {
      send404(res);
      return;
    }

    // =========================================
    // SPA HISTORY API FALLBACK
    // =========================================
    // No file/directory exists at this path.
    // This is a client-side route → serve index.html.
    // The client router restores the correct page.
    // Query params & hashes are preserved by the browser.
    // =========================================
    sendIndex(req, res);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Helpufin Auto SPA server running:`);
  console.log(`  ➜  http://localhost:${PORT}\n`);
  console.log(`  SPA history fallback enabled — all routes serve index.html\n`);
});