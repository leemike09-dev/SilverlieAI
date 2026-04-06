import React from 'react';
import { View, Platform, Text } from 'react-native';

const SVG_MARKUP = `
<svg viewBox="0 0 120 155" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="drFace" cx="42%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#6ac4ff"/>
      <stop offset="100%" stop-color="#1a5aaa"/>
    </radialGradient>
    <linearGradient id="drCoat" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8faff"/>
      <stop offset="100%" stop-color="#d8eaff"/>
    </linearGradient>
    <radialGradient id="drShine" cx="40%" cy="35%" r="55%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>

  <!-- shadow -->
  <ellipse cx="60" cy="151" rx="30" ry="5" fill="#000" opacity="0.18"/>

  <!-- BODY: white coat capsule -->
  <rect x="25" y="100" width="70" height="42" rx="21" fill="url(#drCoat)"/>
  <line x1="60" y1="100" x2="60" y2="142" stroke="#c0d4f0" stroke-width="1.5"/>
  <path d="M60 100 L51 88 L42 95" fill="none" stroke="#b8cce8" stroke-width="2"/>
  <path d="M60 100 L69 88 L78 95" fill="none" stroke="#b8cce8" stroke-width="2"/>

  <!-- BIG stethoscope (signature) -->
  <path d="M35 106 Q24 117 28 128 Q32 138 43 134 Q52 130 50 119" stroke="#1a4a9a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <circle cx="50" cy="119" r="7.5" fill="#1a4a9a"/>
  <circle cx="50" cy="119" r="4.5" fill="#4a8ad8"/>
  <circle cx="50" cy="119" r="2" fill="#7ab8f8"/>
  <circle cx="35" cy="105" r="4" fill="#1a4a9a"/>
  <circle cx="41" cy="101" r="4" fill="#1a4a9a"/>

  <!-- red cross badge -->
  <circle cx="83" cy="111" r="10" fill="white" stroke="#f0e0e0" stroke-width="1"/>
  <rect x="81" y="107" width="5" height="12" rx="2.5" fill="#e74c3c"/>
  <rect x="78" y="110" width="11" height="5" rx="2.5" fill="#e74c3c"/>

  <!-- Dr.Silver text -->
  <text x="60" y="133" font-size="8.5" font-weight="800" fill="#2a5a9a" text-anchor="middle" opacity="0.65" font-family="sans-serif">Dr. Silver</text>

  <!-- HEAD (large, chibi) -->
  <circle cx="60" cy="52" r="42" fill="url(#drFace)"/>
  <!-- head shine overlay -->
  <circle cx="60" cy="52" r="42" fill="url(#drShine)"/>

  <!-- doctor cap -->
  <rect x="24" y="20" width="72" height="18" rx="9" fill="#1a3a7a"/>
  <rect x="35" y="7"  width="50" height="20" rx="7" fill="#1a3a7a"/>
  <!-- cap shine -->
  <ellipse cx="48" cy="13" rx="14" ry="5" fill="white" opacity="0.14" transform="rotate(-8,48,13)"/>
  <!-- gold band -->
  <rect x="24" y="31" width="72" height="7" rx="3.5" fill="#ffd700"/>
  <rect x="24" y="31" width="72" height="3" rx="1.5" fill="#ffea80" opacity="0.5"/>

  <!-- GOLD GLASSES -->
  <rect x="34" y="48" width="19" height="14" rx="7" fill="none" stroke="#ffd700" stroke-width="2.8"/>
  <rect x="67" y="48" width="19" height="14" rx="7" fill="none" stroke="#ffd700" stroke-width="2.8"/>
  <line x1="53" y1="55" x2="67" y2="55" stroke="#ffd700" stroke-width="2.2"/>
  <line x1="17" y1="55" x2="34" y2="55" stroke="#ffd700" stroke-width="2.2"/>
  <line x1="86" y1="55" x2="103" y2="55" stroke="#ffd700" stroke-width="2.2"/>

  <!-- eyes (behind glasses, big + sparkling) -->
  <ellipse cx="43" cy="55" rx="8" ry="9" fill="white"/>
  <ellipse cx="77" cy="55" rx="8" ry="9" fill="white"/>
  <circle cx="43" cy="56" r="5.5" fill="#1a2060"/>
  <circle cx="77" cy="56" r="5.5" fill="#1a2060"/>
  <circle cx="43" cy="56" r="2.8" fill="#3a80e8"/>
  <circle cx="77" cy="56" r="2.8" fill="#3a80e8"/>
  <circle cx="45" cy="53" r="2"   fill="white"/>
  <circle cx="79" cy="53" r="2"   fill="white"/>
  <circle cx="41" cy="58" r="0.9" fill="white" opacity="0.7"/>
  <circle cx="75" cy="58" r="0.9" fill="white" opacity="0.7"/>

  <!-- nose (tiny) -->
  <ellipse cx="60" cy="65" rx="3" ry="2" fill="#1a4a9a" opacity="0.3"/>

  <!-- WARM SMILE -->
  <path d="M46 72 Q60 87 74 72" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- slight teeth -->
  <path d="M50 76 Q60 85 70 76" fill="white" opacity="0.32"/>

  <!-- ROSY CHEEKS -->
  <ellipse cx="26" cy="64" rx="11" ry="8" fill="#ffbbcc" opacity="0.45"/>
  <ellipse cx="94" cy="64" rx="11" ry="8" fill="#ffbbcc" opacity="0.45"/>

  <!-- SHORT ARMS (coat sleeves) -->
  <ellipse cx="13" cy="111" rx="10" ry="17" fill="url(#drCoat)" transform="rotate(-18,13,111)"/>
  <ellipse cx="107" cy="111" rx="10" ry="17" fill="url(#drCoat)" transform="rotate(18,107,111)"/>
  <!-- blue hands -->
  <circle cx="6"   cy="98" r="8" fill="#4aabee"/>
  <circle cx="114" cy="98" r="8" fill="#4aabee"/>

  <!-- TINY FEET -->
  <ellipse cx="45" cy="143" rx="13" ry="7" fill="#1a3a7a"/>
  <ellipse cx="75" cy="143" rx="13" ry="7" fill="#1a3a7a"/>
</svg>
`;

interface Props {
  size?: number;
  style?: any;
}

export default function DrSilverCharacter({ size = 160, style }: Props) {
  const height = size * (155 / 120);

  if (Platform.OS === 'web') {
    return (
      <View style={[{ width: size, height }, style]}>
        {/* @ts-ignore */}
        <div
          style={{ width: '100%', height: '100%' }}
          dangerouslySetInnerHTML={{ __html: SVG_MARKUP }}
        />
      </View>
    );
  }

  // Native fallback (EAS 빌드 시 react-native-svg 추가 예정)
  return (
    <View style={[{ width: size, height, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: size * 0.55 }}>👨‍⚕️</Text>
    </View>
  );
}
