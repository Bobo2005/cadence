const sharp = require('../frontend/node_modules/sharp');
const fs = require('fs');
const path = require('path');

// 1. Sleek App Icon / Avatar (512x512)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512" fill="none">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#2EE6A8" flood-opacity="0.8" />
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <!-- Sleek rounded dark badge background -->
  <rect width="64" height="64" rx="15" fill="url(#bgGrad)" />
  <rect width="64" height="64" rx="15" stroke="#1E293B" stroke-width="1.5" />

  <!-- Heart Silhouette -->
  <path
    d="M32 53.5C32 53.5 12 41 12 24.5C12 16.5 18 11 25.5 11C29.2 11 31.5 13.2 32 14.2C32.5 13.2 34.8 11 38.5 11C46 11 52 16.5 52 24.5C52 41 32 53.5 32 53.5Z"
    stroke="#2EE6A8"
    stroke-width="3.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- Integrated ECG Pulse Wave -->
  <path
    d="M14 32 H 24 L 27 27 L 30 40 L 34 20 L 38 38 L 41 32 H 50"
    stroke="#2EE6A8"
    stroke-width="3.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glow)"
  />
</svg>`;

// 4. White Background Icon (512x512)
const svgWhite = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512" fill="none">
  <defs>
    <filter id="glowLight" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#22A06B" flood-opacity="0.35" />
    </filter>
  </defs>
  <!-- Clean white background canvas -->
  <rect width="64" height="64" fill="#FFFFFF" />

  <!-- Heart Silhouette Outline -->
  <path
    d="M32 53.5C32 53.5 12 41 12 24.5C12 16.5 18 11 25.5 11C29.2 11 31.5 13.2 32 14.2C32.5 13.2 34.8 11 38.5 11C46 11 52 16.5 52 24.5C52 41 32 53.5 32 53.5Z"
    stroke="#22A06B"
    stroke-width="3.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- Integrated ECG Pulse Wave -->
  <path
    d="M14 32 H 24 L 27 27 L 30 40 L 34 20 L 38 38 L 41 32 H 50"
    stroke="#22A06B"
    stroke-width="3.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glowLight)"
  />
</svg>`;

// 5. White Rounded Badge Icon (512x512)
const svgWhiteBadge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512" fill="none">
  <defs>
    <filter id="glowLightBadge" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#22A06B" flood-opacity="0.35" />
    </filter>
  </defs>
  <!-- Rounded Light Badge -->
  <rect width="64" height="64" rx="16" fill="#FFFFFF" />
  <rect width="64" height="64" rx="16" stroke="#E2E8F0" stroke-width="1.5" />

  <!-- Heart Silhouette Outline -->
  <path
    d="M32 53.5C32 53.5 12 41 12 24.5C12 16.5 18 11 25.5 11C29.2 11 31.5 13.2 32 14.2C32.5 13.2 34.8 11 38.5 11C46 11 52 16.5 52 24.5C52 41 32 53.5 32 53.5Z"
    stroke="#22A06B"
    stroke-width="3.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- Integrated ECG Pulse Wave -->
  <path
    d="M14 32 H 24 L 27 27 L 30 40 L 34 20 L 38 38 L 41 32 H 50"
    stroke="#22A06B"
    stroke-width="3.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glowLightBadge)"
  />
</svg>`;

// 6. White Background Horizontal Banner (1200x400)
const svgWhiteBanner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="1200" height="400" fill="none">
  <defs>
    <filter id="glowBanner" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#22A06B" flood-opacity="0.4" />
    </filter>
  </defs>
  <rect width="600" height="200" fill="#FFFFFF" />
  <rect width="600" height="200" stroke="#E2E8F0" stroke-width="2" />

  <g transform="translate(60, 42) scale(1.8)">
    <path
      d="M32 53.5C32 53.5 12 41 12 24.5C12 16.5 18 11 25.5 11C29.2 11 31.5 13.2 32 14.2C32.5 13.2 34.8 11 38.5 11C46 11 52 16.5 52 24.5C52 41 32 53.5 32 53.5Z"
      stroke="#22A06B"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M14 32 H 24 L 27 27 L 30 40 L 34 20 L 38 38 L 41 32 H 50"
      stroke="#22A06B"
      stroke-width="3.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      filter="url(#glowBanner)"
    />
  </g>

  <text x="210" y="112" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="54" letter-spacing="5" fill="#0F172A">CADENCE</text>
  <text x="213" y="142" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="15" letter-spacing="4" fill="#22A06B">PROTOCOL</text>
</svg>`;

// 3. Full Brand Banner with Wordmark (1200x400)
const svgHorizontal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="1200" height="400" fill="none">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#2EE6A8" flood-opacity="0.8" />
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <rect width="600" height="200" rx="20" fill="url(#bgGrad)" />
  <rect width="600" height="200" rx="20" stroke="#1E293B" stroke-width="2" />

  <g transform="translate(60, 42) scale(1.8)">
    <path
      d="M32 53.5C32 53.5 12 41 12 24.5C12 16.5 18 11 25.5 11C29.2 11 31.5 13.2 32 14.2C32.5 13.2 34.8 11 38.5 11C46 11 52 16.5 52 24.5C52 41 32 53.5 32 53.5Z"
      stroke="#2EE6A8"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M14 32 H 24 L 27 27 L 30 40 L 34 20 L 38 38 L 41 32 H 50"
      stroke="#2EE6A8"
      stroke-width="3.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      filter="url(#glow)"
    />
  </g>

  <text x="210" y="112" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="54" letter-spacing="5" fill="#FFFFFF">CADENCE</text>
  <text x="213" y="142" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="15" letter-spacing="4" fill="#2EE6A8">PROTOCOL</text>
</svg>`;

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const docsDir = path.join(rootDir, 'docs');
  const publicDir = path.join(rootDir, 'frontend', 'public');

  console.log('Rendering Cadence logo PNGs...');

  // Save primary badge icon (512x512)
  await sharp(Buffer.from(svgIcon)).png().toFile(path.join(rootDir, 'cadence-logo.png'));
  await sharp(Buffer.from(svgIcon)).png().toFile(path.join(docsDir, 'cadence-logo.png'));
  await sharp(Buffer.from(svgIcon)).png().toFile(path.join(publicDir, 'cadence-logo.png'));

  // Save transparent icon (512x512)
  await sharp(Buffer.from(svgWhite)).png().toFile(path.join(rootDir, 'cadence-logo-white.png'));
  await sharp(Buffer.from(svgWhite)).png().toFile(path.join(docsDir, 'cadence-logo-white.png'));
  await sharp(Buffer.from(svgWhite)).png().toFile(path.join(publicDir, 'cadence-logo-white.png'));

  // Save white rounded badge (512x512)
  await sharp(Buffer.from(svgWhiteBadge)).png().toFile(path.join(rootDir, 'cadence-logo-white-badge.png'));
  await sharp(Buffer.from(svgWhiteBadge)).png().toFile(path.join(docsDir, 'cadence-logo-white-badge.png'));
  await sharp(Buffer.from(svgWhiteBadge)).png().toFile(path.join(publicDir, 'cadence-logo-white-badge.png'));

  // Save white banner (1200x400)
  await sharp(Buffer.from(svgWhiteBanner)).png().toFile(path.join(rootDir, 'cadence-logo-white-banner.png'));
  await sharp(Buffer.from(svgWhiteBanner)).png().toFile(path.join(docsDir, 'cadence-logo-white-banner.png'));
  await sharp(Buffer.from(svgWhiteBanner)).png().toFile(path.join(publicDir, 'cadence-logo-white-banner.png'));

  // Save horizontal banner (1200x400)
  await sharp(Buffer.from(svgHorizontal)).png().toFile(path.join(rootDir, 'cadence-logo-banner.png'));
  await sharp(Buffer.from(svgHorizontal)).png().toFile(path.join(docsDir, 'cadence-logo-banner.png'));
  await sharp(Buffer.from(svgHorizontal)).png().toFile(path.join(publicDir, 'cadence-logo-banner.png'));

  console.log('Successfully generated all PNG logos:');
  console.log(' - ' + path.join(rootDir, 'cadence-logo.png'));
  console.log(' - ' + path.join(rootDir, 'cadence-logo-transparent.png'));
  console.log(' - ' + path.join(rootDir, 'cadence-logo-banner.png'));
}

main().catch(err => {
  console.error('Error generating logos:', err);
  process.exit(1);
});
