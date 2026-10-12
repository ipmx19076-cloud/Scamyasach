// Builds the whole game into one self-contained HTML file: standalone/dist/scam-ya-sach.html
// Usage: npm run build:standalone
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "standalone", "dist");
mkdirSync(dist, { recursive: true });

// 1. JavaScript
const js = await build({
  entryPoints: [join(root, "standalone", "main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// 2. CSS (Tailwind scans the components for class names)
const cssOut = join(dist, "app.css");
execFileSync(join(root, "node_modules", ".bin", "tailwindcss"), ["-i", join(root, "app", "globals.css"), "-o", cssOut, "--minify"], {
  cwd: root,
  stdio: "inherit",
});
const css = readFileSync(cssOut, "utf8");

// 3. Fonts: Latin and Latin Extended (which has ₹) as embedded woff2
const fonts = [
  ["baloo-2", [700, 800]],
  ["hind", [400, 500, 600, 700]],
];
let fontCss = "";
for (const [pkg, weights] of fonts) {
  for (const w of weights) {
    for (const subset of ["latin", "latin-ext"]) {
      const dir = join(root, "node_modules", "@fontsource", pkg);
      let face = readFileSync(join(dir, `${subset}-${w}.css`), "utf8");
      face = face.replace(/src:[^;]+;/, (src) => {
        const file = src.match(/url\(\.\/(files\/[^)]+\.woff2)\)/)[1];
        const b64 = readFileSync(join(dir, file)).toString("base64");
        return `src:url(data:font/woff2;base64,${b64}) format('woff2');`;
      });
      fontCss += face.replace(/\/\*.*?\*\//g, "").replace(/\s+/g, " ");
    }
  }
}

// 4. Theme boot script (same as the Next.js layout)
const prefs = readFileSync(join(root, "lib", "prefs.ts"), "utf8");
const boot = prefs.match(/THEME_BOOT_SCRIPT = `([^`]+)`/)[1];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scam Ya Sach?</title>
<meta name="description" content="A quick phone game: swipe left on scams, right on genuine messages.">
<script>${boot}</script>
<style>${fontCss}</style>
<style>${css}</style>
</head>
<body>
<main id="root"></main>
<script>${script}</script>
</body>
</html>
`;
const outFile = join(dist, "scam-ya-sach.html");
writeFileSync(outFile, html);
console.log(`Wrote ${outFile} (${(html.length / 1024).toFixed(0)} KB)`);

// Same page as a fragment for hosts that add their own <html>/<head>/<body> skeleton.
const fragment = `<title>Scam Ya Sach?</title>
<script>${boot}</script>
<style>${fontCss}</style>
<style>${css}</style>
<main id="root"></main>
<script>${script}</script>
`;
writeFileSync(join(dist, "scam-ya-sach.fragment.html"), fragment);
