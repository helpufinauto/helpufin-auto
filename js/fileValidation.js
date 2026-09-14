/* =========================================
SITE-WIDE FILE VALIDATION (PHASE 1)
=========================================
Shared, minimal validation helpers used by
EVERY file-upload area in the application:

  - profile avatar     (profile-images)
  - vehicle images     (vehicle-images)
  - trade-in images    (tradein-images)
  - message attachments(message-files)

Rules:
  1. ZIP files are NEVER allowed anywhere —
     rejected by extension, by declared MIME
     type, AND by actual content (magic bytes),
     so a ZIP renamed to "image.jpg" is still
     rejected before any Supabase upload.
  2. Image-only areas accept ONLY real
     JPG/JPEG, PNG and WEBP files, verified by
     content signature — not just the filename.
  3. Document areas (message attachments)
     keep their existing open format support
     but still explicitly reject ZIP.
========================================= */

/* ---------- ZIP DETECTION ---------- */

const ZIP_EXTENSIONS = [
  "zip",
  "zipx",
  "rar",
  "7z",
  "gz",
  "tar",
  "bz2"
];

export function getExtension(name){

  return String(name || "")
  .split(".")
  .pop()
  .toLowerCase();

}

export function hasArchiveExtension(name){

  return ZIP_EXTENSIONS.includes(
    getExtension(name)
  );

}

/* Read the first bytes of a file and check
   for the ZIP local/central header signatures
   ("PK\x03\x04", "PK\x05\x06", "PK\x07\x08"). */

export async function hasZipContent(file){

  try{

    const blob = file.slice(0, 4);

    const buffer = await blob.arrayBuffer();

    const bytes = new Uint8Array(buffer);

    if(bytes.length < 4){
      return false;
    }

    const isPk =
      bytes[0] === 0x50 &&
      bytes[1] === 0x4B;

    const isZipSignature =
      (bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08);

    return isPk && isZipSignature;

  }catch(error){

    /* If content cannot be read, fail closed. */

    console.error(
      "[fileValidation] Content read failed",
      error
    );

    return true;

  }

}

/* ---------- IMAGE CONTENT SNIFFING ---------- */

/* Verify the actual bytes match a supported
   image format. Returns the detected type:
   "jpeg" | "png" | "webp" | null. */

export async function detectImageContentType(file){

  try{

    const buffer =
    await file.slice(0, 12).arrayBuffer();

    const bytes = new Uint8Array(buffer);

    /* JPEG — FF D8 FF */

    if(
      bytes.length >= 3 &&
      bytes[0] === 0xFF &&
      bytes[1] === 0xD8 &&
      bytes[2] === 0xFF
    ){
      return "jpeg";
    }

    /* PNG — 89 50 4E 47 0D 0A 1A 0A */

    if(
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4E &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0D &&
      bytes[5] === 0x0A &&
      bytes[6] === 0x1A &&
      bytes[7] === 0x0A
    ){
      return "png";
    }

    /* GIF — "GIF8" (GIF87a or GIF89a) */

    if(
      bytes.length >= 4 &&
      bytes[0] === 0x47 && // G
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x38    // 8
    ){
      return "gif";
    }

    /* BMP — "BM" */

    if(
      bytes.length >= 2 &&
      bytes[0] === 0x42 && // B
      bytes[1] === 0x4D    // M
    ){
      return "bmp";
    }

    /* TIFF — "II*\0" (little-endian) or "MM\0*" (big-endian) */

    if(
      bytes.length >= 4 &&
      (
        (bytes[0] === 0x49 && // I
         bytes[1] === 0x49 && // I
         bytes[2] === 0x2A && // *
         bytes[3] === 0x00)   // \0
        ||
        (bytes[0] === 0x4D && // M
         bytes[1] === 0x4D && // M
         bytes[2] === 0x00 && // \0
         bytes[3] === 0x2A)   // *
      )
    ){
      return "tiff";
    }

    /* WEBP — "RIFF" + 4 bytes + "WEBP" */

    if(
      bytes.length >= 12 &&
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8]  === 0x57 && // W
      bytes[9]  === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50    // P
    ){
      return "webp";
    }

    /* AVIF — ISO Base Media File Format with "ftyp" box
       containing "avif" or "avis" brand. The ftyp box
       starts at offset 4: bytes[4..7] === "ftyp" and
       bytes[8..11] is the major brand. */

    if(
      bytes.length >= 12 &&
      bytes[4] === 0x66 && // f
      bytes[5] === 0x74 && // t
      bytes[6] === 0x79 && // y
      bytes[7] === 0x70 && // p
      (
        (bytes[8] === 0x61 &&  bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) // avif
        ||
        (bytes[8] === 0x61 &&  bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x73) // avis
      )
    ){
      return "avif";
    }

    return null;

  }catch(error){

    console.error(
      "[fileValidation] Image sniff failed",
      error
    );

    return null;

  }

}

/* ---------- IMAGE VALIDATION ---------- */

/* Full strict validation for image-only
   uploads. Returns { ok:true } or
   { ok:false, error:"human readable reason" }.

   Options:
     maxSize      — byte limit (default 5MB)
     allowedTypes — declared MIME whitelist
                    (default JPG/PNG/WEBP)
============================================= */

const IMAGE_EXTENSIONS_BY_MIME = {
  "image/jpeg": ["jpg", "jpeg", "jfif"],
  "image/jpg":  ["jpg", "jpeg", "jfif"],
  "image/png":  ["png"],
  "image/webp": ["webp"],
  "image/gif":  ["gif"],
  "image/avif": ["avif"],
  "image/bmp":  ["bmp"],
  "image/tiff": ["tif", "tiff"]
};

export async function validateImageFile(
  file,
  options = {}
){

  const maxSize =
  options.maxSize ?? 5 * 1024 * 1024;

  const allowedTypes =
  options.allowedTypes ?? [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/bmp",
    "image/tiff"
  ];

  if(!file){

    return {
      ok:false,
      error:"No file selected."
    };

  }

  /* 1 — ZIP / archive: rejected unconditionally,
     regardless of what the picker allowed. */

  if(hasArchiveExtension(file.name)){

    return {
      ok:false,
      error:
      `${file.name}: ZIP and archive files are not allowed.`
    };

  }

  if(await hasZipContent(file)){

    return {
      ok:false,
      error:
      `${file.name}: this file is actually a ZIP/archive and cannot be uploaded, even if it was renamed.`
    };

  }

  /* 2 — declared MIME type must be an accepted image. */

  if(!allowedTypes.includes(file.type)){

    return {
      ok:false,
      error:
      `${file.name}: only image files (JPG, PNG, WEBP, GIF, AVIF, BMP, TIFF) are allowed.`
    };

  }

  /* 3 — content must genuinely be an image AND
     match the declared type (catches documents/
     executables/renamed ZIPs whose browser-reported
     MIME is image/jpeg, and JPEG bytes named .png). */

  const detected =
  await detectImageContentType(file);

  if(!detected){

    return {
      ok:false,
      error:
      `${file.name}: the file content is not a real image.`
    };

  }

  const declaredFamily =
  file.type === "image/webp"
    ? "webp"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/gif"
        ? "gif"
        : file.type === "image/bmp"
          ? "bmp"
          : file.type === "image/tiff"
            ? "tiff"
            : file.type === "image/avif"
              ? "avif"
              : "jpeg";

  if(detected !== declaredFamily){

    return {
      ok:false,
      error:
      `${file.name}: the file content does not match its declared image type.`
    };

  }

  /* 5 — size limit. */

  if(file.size > maxSize){

    return {
      ok:false,
      error:
      `${file.name}: image must be smaller than ${Math.round(maxSize / (1024 * 1024))}MB.`
    };

  }

  return { ok:true };

}

/* ---------- ZIP-ONLY GUARD ---------- */

/* For upload areas that legitimately accept
   documents (e.g. message attachments): keep
   their existing supported formats but always
   explicitly reject ZIP/archive files — by
   extension, MIME type, AND content. */

export async function rejectZipFile(file){

  if(!file){
    return {
      ok:false,
      error:"No file selected."
    };
  }

  if(hasArchiveExtension(file.name)){

    return {
      ok:false,
      error:
      `${file.name}: ZIP and archive files are not allowed.`
    };

  }

  const archiveMimes = [
    "application/zip",
    "application/x-zip-compressed",
    "application/x-zip",
    "multipart/x-zip",
    "application/x-rar-compressed",
    "application/vnd.rar",
    "application/x-7z-compressed",
    "application/gzip",
    "application/x-gzip",
    "application/x-tar",
    "application/x-bzip2"
  ];

  if(file.type && archiveMimes.includes(file.type)){

    return {
      ok:false,
      error:
      `${file.name}: ZIP and archive files are not allowed.`
    };

  }

  if(await hasZipContent(file)){

    return {
      ok:false,
      error:
      `${file.name}: this file is actually a ZIP/archive and cannot be uploaded, even if it was renamed.`
    };

  }

  return { ok:true };

}

/* ---------- CLIENT-SIDE IMAGE OPTIMIZATION (PERFORMANCE) ----------
   Runs in the browser BEFORE a vehicle image is uploaded to Supabase
   Storage. Phone cameras routinely produce 3-6MB photos; storing and
   re-serving those originals on every marketplace page is the single
   biggest avoidable cost in image delivery.

   Behaviour (fail-safe — returns null to keep the ORIGINAL file
   whenever optimization is not possible or not beneficial):
     1. Only real raster images are processed (gif/svg skipped).
     2. Files already <= minSkipBytes are uploaded untouched.
     3. Oversized images are downscaled so the LONGEST edge is at
        most maxDim (1600px — larger than any card/lightbox need).
     4. Re-encoded as WebP q0.82 (excellent quality/size); JPEG
        q0.82 as automatic fallback when WebP encoding is missing.
     5. PNG sources are only re-encoded to WebP (which preserves
        transparency) — never to JPEG, so alpha is never destroyed.
     6. If the optimized result is not smaller than the original,
        the original is kept.

   The upload pipeline simply uses the returned File (same bucket,
   same upload call, same public URL pattern). */

export async function optimizeVehicleImage(file, options = {}){

  const maxDim = options.maxDim || 1600;
  const quality = options.quality || 0.82;
  const minSkipBytes = options.minSkipBytes || 300 * 1024;

  try{

    if(!file || !file.type || !file.type.startsWith("image/")){
      return null;
    }

    if(file.type === "image/gif" || file.type === "image/svg+xml"){
      return null;
    }

    if(file.size <= minSkipBytes){
      return null;
    }

    if(typeof createImageBitmap !== "function" || typeof document === "undefined"){
      return null;
    }

    const bitmap = await createImageBitmap(file);

    if(!bitmap || !bitmap.width || !bitmap.height){
      return null;
    }

    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");

    if(!ctx){
      return null;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);

    if(bitmap.close){
      bitmap.close();
    }

    /* Prefer WebP (keeps PNG transparency too); fall back to JPEG. */
    let type = "image/webp";
    let ext = "webp";
    let dataUrl = canvas.toDataURL(type, quality);

    if(!dataUrl.startsWith("data:image/webp")){
      type = "image/jpeg";
      ext = "jpg";
      dataUrl = canvas.toDataURL(type, quality);
    }

    if(!dataUrl.startsWith("data:image/")){
      return null;
    }

    /* Never destroy PNG transparency via JPEG. */
    if(type === "image/jpeg" && file.type === "image/png"){
      return null;
    }

    const binary = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(binary.length);

    for(let i = 0; i < binary.length; i++){
      bytes[i] = binary.charCodeAt(i);
    }

    /* If we did not actually make it smaller, keep the original. */
    if(bytes.length >= file.size){
      return null;
    }

    const baseName =
    file.name.replace(/\.[^.]+$/, "");

    return new File(
      [bytes],
      `${baseName}_opt.${ext}`,
      { type }
    );

  }catch(error){

    console.warn(
      "[fileValidation] Image optimization skipped:",
      error
    );

    return null;

  }

}