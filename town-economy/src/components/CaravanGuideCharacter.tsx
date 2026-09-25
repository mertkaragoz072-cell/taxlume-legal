import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface Props {
  size?: number;
}

/** Kervan rehberi karakteri - kemerli bir tüccar
 * Karavanlara rehberlik eden deneyimli bir ticari tüccar */
export function CaravanGuideCharacter({ size = 120 }: Props) {
  const scaleFactor = size / 120;

  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 120 156">
      <Defs>
        <LinearGradient id="cgSkin" x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor="#e8b896" />
          <Stop offset="1" stopColor="#d4955f" />
        </LinearGradient>
        <LinearGradient id="cgRobe" x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor="#6b4c9a" />
          <Stop offset="1" stopColor="#4a2f5a" />
        </LinearGradient>
        <LinearGradient id="cgTurban" x1="0" y1="0" x2="1" y2="0.3">
          <Stop offset="0" stopColor="#d4a574" />
          <Stop offset="1" stopColor="#b8884f" />
        </LinearGradient>
      </Defs>

      {/* Başlık - Sarığı (Turban) */}
      <G>
        {/* Turban */}
        <Ellipse cx="60" cy="25" rx="45" ry="20" fill="url(#cgTurban)" />
        <Path d="M25 28 Q30 18 60 12 Q90 18 95 28" fill="#9a7a4f" />
        {/* Turban detaylı sarılı */}
        <Path d="M30 25 Q40 20 60 18 Q80 20 90 25" stroke="#8a6a3f" strokeWidth="1.5" fill="none" />
      </G>

      {/* Yüz */}
      <G>
        {/* Başı */}
        <Circle cx="60" cy="48" r="22" fill="url(#cgSkin)" />

        {/* Sakal */}
        <Path d="M42 60 Q42 70 60 72 Q78 70 78 60" fill="#8b5a2b" opacity="0.6" />

        {/* Gözler */}
        <Circle cx="52" cy="45" r="2.5" fill="#1a0f0a" />
        <Circle cx="68" cy="45" r="2.5" fill="#1a0f0a" />

        {/* Kaşlar */}
        <Path d="M50 42 Q52 40 54 42" stroke="#4a2f2a" strokeWidth="1.2" fill="none" />
        <Path d="M66 42 Q68 40 70 42" stroke="#4a2f2a" strokeWidth="1.2" fill="none" />

        {/* Gülüş */}
        <Path d="M55 55 Q60 60 65 55" stroke="#1a0f0a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </G>

      {/* Vücut - Ticari Giyim */}
      <G>
        {/* Uzun elbise (Gandura) */}
        <Path d="M38 72 L35 140 Q35 145 40 145 L80 145 Q85 145 85 140 L82 72 Z" fill="url(#cgRobe)" />

        {/* Elbise detaylı deseni */}
        <Path d="M45 85 L45 120" stroke="#8b6a3f" strokeWidth="0.8" opacity="0.5" />
        <Path d="M75 85 L75 120" stroke="#8b6a3f" strokeWidth="0.8" opacity="0.5" />

        {/* Geniş kemer (Şal) */}
        <Rect x="36" y="95" width="48" height="12" fill="#d4a574" />
        <Rect x="38" y="96" width="44" height="4" fill="#c4914f" />
        <Rect x="38" y="104" width="44" height="2" fill="#c4914f" />

        {/* Kemer tokası - emas */}
        <Circle cx="60" cy="101" r="5" fill="#ffd700" />
        <Circle cx="60" cy="101" r="3" fill="#ffed4e" />
      </G>

      {/* Kollar */}
      <G>
        {/* Sol kol */}
        <Path d="M38 78 L25 110" stroke="url(#cgSkin)" strokeWidth="8" strokeLinecap="round" />
        {/* Sağ kol */}
        <Path d="M82 78 L95 110" stroke="url(#cgSkin)" strokeWidth="8" strokeLinecap="round" />

        {/* El */}
        <Circle cx="25" cy="110" r="6" fill="url(#cgSkin)" />
        <Circle cx="95" cy="110" r="6" fill="url(#cgSkin)" />
      </G>

      {/* Ayaklar */}
      <G>
        {/* Sol bacak */}
        <Path d="M48 145 L48 155" stroke="#2a1a0a" strokeWidth="5" strokeLinecap="round" />
        <Rect x="46" y="155" width="4" height="3" fill="#4a3a2a" />

        {/* Sağ bacak */}
        <Path d="M72 145 L72 155" stroke="#2a1a0a" strokeWidth="5" strokeLinecap="round" />
        <Rect x="70" y="155" width="4" height="3" fill="#4a3a2a" />
      </G>

      {/* Kumaş kesesi - karavanda taşıyacak */}
      <G>
        {/* Omuzda açılı çanta */}
        <Path d="M82 80 L95 95 L92 110 L80 105 Z" fill="#8b4513" />
        <Path d="M85 85 L93 100" stroke="#6b3410" strokeWidth="0.8" opacity="0.6" />
        <Circle cx="88" cy="92" r="2" fill="#d4a574" />
      </G>
    </Svg>
  );
}
