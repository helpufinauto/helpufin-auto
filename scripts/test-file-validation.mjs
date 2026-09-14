import {
  validateImageFile,
  rejectZipFile
} from "../js/fileValidation.js";

const JPEG = [0xFF,0xD8,0xFF,0xE0,0,0,0,0];
const PNG  = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A];
const WEBP = [0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50];
const GIF  = [0x47,0x49,0x46,0x38,0x37,0x61];
const BMP  = [0x42,0x4D,0x12,0x34];
const TIFF = [0x49,0x49,0x2A,0x00,0x08,0x00];
const AVIF = [0,0,0,0,0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x66];
const ZIP  = [0x50,0x4B,0x03,0x04,0x14,0x00];
const PDF  = [0x25,0x50,0x44,0x46,0x2D];

function mk(bytes, name, type){
  return new File([new Uint8Array(bytes)], name, { type });
}

let pass = 0, fail = 0;
function check(label, ok, expected){
  if(ok === expected){ pass++; console.log("PASS:", label); }
  else { fail++; console.log("FAIL:", label, "got ok=", ok); }
}

let r;
r = await validateImageFile(mk(JPEG,"photo.jpg","image/jpeg"));  check("JPG accepted", r.ok, true);
r = await validateImageFile(mk(PNG,"photo.png","image/png"));    check("PNG accepted", r.ok, true);
r = await validateImageFile(mk(WEBP,"photo.webp","image/webp")); check("WEBP accepted", r.ok, true);
r = await validateImageFile(mk(JPEG,"50304192.jfif","image/jpeg")); check("JFIF (.jfif) accepted", r.ok, true);
r = await validateImageFile(mk(GIF,"photo.gif","image/gif"));    check("GIF accepted", r.ok, true);
r = await validateImageFile(mk(BMP,"photo.bmp","image/bmp"));    check("BMP accepted", r.ok, true);
r = await validateImageFile(mk(TIFF,"photo.tif","image/tiff"));  check("TIFF (.tif) accepted", r.ok, true);
r = await validateImageFile(mk(TIFF,"photo.tiff","image/tiff")); check("TIFF (.tiff) accepted", r.ok, true);
r = await validateImageFile(mk(AVIF,"photo.avif","image/avif")); check("AVIF accepted", r.ok, true);
r = await validateImageFile(mk(ZIP,"archive.zip","application/zip")); check("ZIP rejected", r.ok, false);
r = await validateImageFile(mk(ZIP,"image.jpg","image/jpeg"));  check("Renamed ZIP (image.jpg) rejected", r.ok, false);
r = await validateImageFile(mk(ZIP,"image.png","image/png"));   check("Renamed ZIP (image.png) rejected", r.ok, false);
r = await validateImageFile(mk(PDF,"doc.pdf","application/pdf")); check("PDF rejected for image upload", r.ok, false);
r = await validateImageFile(mk(JPEG,"doc.png","image/png"));    check("Content/MIME mismatch rejected", r.ok, false);
r = await validateImageFile(mk(JPEG,"big.jpg","image/jpeg"), { maxSize: 4 }); check("Oversize rejected", r.ok, false);
r = await validateImageFile(mk(JPEG,"photo.jpeg","image/jpeg")); check("JPEG (.jpeg) accepted", r.ok, true);
r = await rejectZipFile(mk(ZIP,"archive.zip","application/zip")); check("rejectZipFile: ZIP rejected", r.ok, false);
r = await rejectZipFile(mk(ZIP,"notes.pdf","application/pdf"));  check("rejectZipFile: renamed ZIP rejected", r.ok, false);
r = await rejectZipFile(mk(PDF,"doc.pdf","application/pdf"));    check("rejectZipFile: PDF allowed", r.ok, true);
r = await rejectZipFile(mk(JPEG,"img.jpg","image/jpeg"));        check("rejectZipFile: JPG allowed", r.ok, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
