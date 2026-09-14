/* =========================================================
   TAILWIND BUILD CONFIG (Phase 6)
   Replaces the runtime cdn.tailwindcss.com JIT script with
   a one-time prebuilt stylesheet (css/tailwind.css).

   Theme mirrors the previous inline index.html config:
   colors: primary #3B82F6, accent #E48A2F, dark #1E2A38,
           light #F4F6F8, white #FFFFFF; font-display Manrope.
   ========================================================= */

/** @type {import('tailwindcss').Config} */
module.exports = {

  content: [
    "./index.html",
    "./pages/**/*.js",
    "./components/**/*.js",
    "./js/**/*.js"
  ],

  theme: {

    extend: {

      colors: {
        primary: "#3B82F6",   // HUFA dashboard blue
        accent:  "#E48A2F",   // orange
        dark:    "#1E2A38",
        light:   "#F4F6F8",
        white:   "#FFFFFF"
      },

      fontFamily: {
        display: ["Manrope"]
      }

    }

  }

};
