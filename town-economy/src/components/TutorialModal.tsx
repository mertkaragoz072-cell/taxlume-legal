import React, { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { ScalePressable } from "./ScalePressable";

interface Slide {
  icon: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "🏘️",
    title: "Taxlume Kasabasına Hoş Geldin",
    body: "Bu kasabanın yöneticisi sensin. Ekonomiyi büyüt, halkı memnun tut ve enflasyonu kontrolden çıkarma — hiperenflasyon kasabayı çökertir.",
  },
  {
    icon: "📈",
    title: "Piyasa",
    body: "Ekmek, süt, odun, demir ve kumaş al-sat. Fiyatlar arz-talebe göre değişir: çok alırsan fiyat yükselir, satarsan düşer. Büyük alımlar piyasayı daha çok etkiler.",
  },
  {
    icon: "🔥",
    title: "Enflasyon (TPI)",
    body: "Üstteki Fiyat Endeksi kasabanın genel enflasyonunu gösterir. Çok yükselirse hiperenflasyon patlar ve oyun biter — göstergeyi göz altında tut.",
  },
  {
    icon: "🚚",
    title: "Ticaret",
    body: "Komşu kasabalara kervan gönder. Bir ürünü ucuz olan yerden alıp pahalı olan yere satarak kâr et — ama kervan yolculuğu zaman alır.",
  },
  {
    icon: "🏛️",
    title: "Vergi ve Yönetim",
    body: "Köylülerden vergi al ama dikkat: çok vergi halkı sinirlendirir, üretimi düşürür ve enflasyonu hızlandırır. Kazandığın parayla kasabanı geliştir.",
  },
  {
    icon: "🏆",
    title: "Başarımlar ve Günlük Seri",
    body: "İlerledikçe başarımlar kazan, her gün uğrayarak günlük bonusunu ve serini büyüt. Şimdi kasabanı yönetmeye başla!",
  },
];

interface Props {
  visible: boolean;
  onFinish: () => void;
}

export function TutorialModal({ visible, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  if (!visible) return null;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      setIndex(0);
      onFinish();
    } else {
      setIndex(index + 1);
    }
  };

  const skip = () => {
    setIndex(0);
    onFinish();
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.icon}>{slide.icon}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <ScalePressable onPress={next} style={styles.nextBtn} scaleTo={0.96}>
            <Text style={styles.nextBtnText}>{isLast ? "Başla!" : "İleri"}</Text>
          </ScalePressable>

          {!isLast && (
            <ScalePressable onPress={skip} style={styles.skipBtn} scaleTo={0.96}>
              <Text style={styles.skipBtnText}>Atla</Text>
            </ScalePressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#2a2016",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
  },
  icon: { fontSize: 44, marginBottom: 10 },
  title: { color: "#f0e3c8", fontSize: 18, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  body: { color: "#a0917a", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 18 },
  dots: { flexDirection: "row", gap: 6, marginBottom: 18 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4a4032",
    marginRight: 6,
  },
  dotActive: { backgroundColor: "#e8c777", width: 18 },
  nextBtn: {
    width: "100%",
    backgroundColor: "#e8c777",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  nextBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
  skipBtn: { marginTop: 10, paddingVertical: 6 },
  skipBtnText: { color: "#a0917a", fontSize: 12, fontWeight: "600" },
});
