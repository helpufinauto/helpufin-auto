/* Check alpha channel + dominant usage of key images. */
const sharp = require("sharp");

const files = process.argv.slice(2);

(async () => {
  for (const f of files) {
    const img = sharp(f);
    const meta = await img.metadata();
    const stats = await img.stats();
    const alpha = meta.hasAlpha;
    // If alpha exists, is it actually used? Sample alpha channel extremes.
    let alphaUsed = false;
    if (alpha) {
      const a = stats.channels[meta.channels - 1];
      alphaUsed = a.min < 250;
    }
    console.log(
      f,
      "|", meta.format,
      "|", meta.width + "x" + meta.height,
      "| hasAlpha:", alpha,
      "| alphaUsed:", alphaUsed,
      "| alphaMin:", alpha ? stats.channels[meta.channels - 1].min : "-"
    );
  }
})();
