/* =========================================================
ON-DEMAND CDN LIBRARY LOADER
=========================================================
jsPDF / SheetJS are only needed when a user explicitly
exports a PDF or Excel file. Previously they were <script>
tags in index.html, so ~1.2 MB of library JS was downloaded
and parsed on EVERY page. They are now fetched the first
time a feature actually needs them (result is cached, so
repeat exports are instant). html2canvas was verified unused
and removed entirely.
========================================================= */

const loadedScripts = {};

export function ensureScript(src){

  if(loadedScripts[src]){
    return loadedScripts[src];
  }

  loadedScripts[src] = new Promise((resolve, reject) => {

    const el = document.createElement("script");

    el.src = src;
    el.async = true;

    el.onload = () => resolve();
    el.onerror = () => {

      delete loadedScripts[src];

      reject(
        new Error(`Failed to load ${src}`)
      );

    };

    document.head.appendChild(el);

  });

  return loadedScripts[src];

}
