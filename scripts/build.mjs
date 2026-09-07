import { mkdir, copyFile, rm } from 'node:fs/promises';
import { build as bundle } from 'esbuild';

// Explicit public files: keep source files and private configuration out of dist.
const files = [
  'index.html', 'Marriage_kamisse_202609060644.mp4',
  'assets/experience.css', 'assets/experience.js', 'assets/envelope-finish.js', 'assets/video-recovery.js',
  'assets/envelope.glb', 'assets/paper_texture.jpg', 'assets/envelope_full.png',
  'assets/berber_pattern_bg.optimized.jpg', 'assets/berber_pattern_bg.jpeg',
  'assets/invitation-finale.jpeg', 'assets/video_poster.png',
  'assets/invitation-reference.png', 'assets/maison-selim-mark-fallback.png',
];
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await Promise.all(files.map(file => copyFile(file, `dist/${file}`)));
await bundle({
  entryPoints: ['assets/speed-insights.js'],
  outfile: 'dist/assets/speed-insights.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
});
console.log(`Built ${files.length} public files, including the 3D model, film, and Speed Insights.`);

