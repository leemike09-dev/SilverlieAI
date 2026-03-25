const sharp = require('sharp');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');

// 메인 앱 아이콘 SVG (1024x1024)
const iconSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="1024" height="1024" fill="#1B4332"/>
  <!-- 그라데이션 원 -->
  <circle cx="512" cy="512" r="480" fill="#2D6A4F"/>
  <circle cx="512" cy="512" r="440" fill="#40916C" opacity="0.5"/>
  <!-- 하트 모양 -->
  <path d="M512 690
    C490 668 310 520 310 400
    C310 330 370 280 430 300
    C465 312 490 345 512 375
    C534 345 559 312 594 300
    C654 280 714 330 714 400
    C714 520 534 668 512 690Z"
    fill="white"/>
  <!-- 심전도 라인 (하트 위에) -->
  <polyline
    points="340,420 390,420 415,370 440,470 465,390 490,430 520,390 545,450 570,420 620,420 650,420"
    stroke="#2D6A4F" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- 상단 잎 장식 -->
  <path d="M512 290 C512 290 480 240 500 210 C520 180 560 200 550 230 C540 255 512 290 512 290Z"
    fill="#B7E4C7" opacity="0.9"/>
</svg>`;

// 스플래시 아이콘 SVG (하얀 배경 없이 로고만)
const splashSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 하트 -->
  <path d="M256 380
    C240 362 100 275 100 185
    C100 130 145 95 185 110
    C210 120 235 148 256 172
    C277 148 302 120 327 110
    C367 95 412 130 412 185
    C412 275 272 362 256 380Z"
    fill="white"/>
  <!-- 심전도 -->
  <polyline
    points="140,200 175,200 192,165 210,235 228,180 246,210 265,180 282,220 300,200 335,200 360,200"
    stroke="#2D6A4F" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- 잎 장식 -->
  <path d="M256 120 C256 120 235 88 248 68 C261 48 288 60 280 85 C273 105 256 120 256 120Z"
    fill="#B7E4C7" opacity="0.95"/>
</svg>`;

// Android 포그라운드 (투명 배경, 중앙 72% 안에 디자인)
const androidFgSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Safe zone: 중앙 664x664 영역 -->
  <path d="M512 720
    C490 698 290 560 290 420
    C290 340 355 285 420 308
    C458 322 485 360 512 395
    C539 360 566 322 604 308
    C669 285 734 340 734 420
    C734 560 534 698 512 720Z"
    fill="white"/>
  <polyline
    points="330,440 385,440 413,385 440,498 468,408 494,448 524,400 552,468 580,440 636,440 670,440"
    stroke="#2D6A4F" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M512 295 C512 295 478 238 494 205 C510 172 554 190 544 222 C534 250 512 295 512 295Z"
    fill="#B7E4C7" opacity="0.95"/>
</svg>`;

// Android 배경 (단색)
const androidBgSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#2D6A4F"/>
</svg>`;

// Favicon
const faviconSVG = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#2D6A4F"/>
  <path d="M24 38 C23 37 8 27 8 18 C8 13 12 10 16 11.5 C19 12.5 22 15.5 24 18 C26 15.5 29 12.5 32 11.5 C36 10 40 13 40 18 C40 27 25 37 24 38Z"
    fill="white"/>
</svg>`;

async function generate() {
  console.log('🎨 아이콘 생성 중...');

  await sharp(Buffer.from(iconSVG)).png().toFile(path.join(ASSETS, 'icon.png'));
  console.log('✅ icon.png (1024x1024)');

  await sharp(Buffer.from(splashSVG)).resize(512, 512).png().toFile(path.join(ASSETS, 'splash-icon.png'));
  console.log('✅ splash-icon.png');

  await sharp(Buffer.from(androidFgSVG)).png().toFile(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✅ android-icon-foreground.png');

  await sharp(Buffer.from(androidBgSVG)).png().toFile(path.join(ASSETS, 'android-icon-background.png'));
  console.log('✅ android-icon-background.png');

  await sharp(Buffer.from(androidBgSVG)).png().toFile(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✅ android-icon-monochrome.png');

  await sharp(Buffer.from(faviconSVG)).resize(48, 48).png().toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✅ favicon.png');

  console.log('\n🎉 모든 아이콘 생성 완료!');
}

generate().catch(console.error);
