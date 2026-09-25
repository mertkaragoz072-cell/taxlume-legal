import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { t } from "../i18n/t";
import { Language } from "../i18n/t";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  language: Language;
  onDismiss: () => void;
}

export function CaravanTutorialModal({ visible, language, onDismiss }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Caravan Guide Character - Prominent Position */}
        <View style={styles.characterBanner}>
          <Image
            source={require("../../assets/caravan-merchant-guide.png")}
            style={styles.characterImageLarge}
            resizeMode="contain"
          />
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>
              {t(language, "caravanTutorial.guideTitle")}
            </Text>
            <Text style={styles.characterTagline}>🐪 Kervan Ustası</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

          {/* Welcome Message */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              {t(language, "caravanTutorial.welcome")}
            </Text>
          </View>

          {/* Tutorial Steps */}
          <View style={styles.stepsContainer}>
            {/* Step 1: What is a Caravan */}
            <View style={styles.step}>
              <Text style={styles.stepIcon}>1️⃣</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {t(language, "caravanTutorial.step1Title")}
                </Text>
                <Text style={styles.stepText}>
                  {t(language, "caravanTutorial.step1Text")}
                </Text>
              </View>
            </View>

            {/* Step 2: Where to Trade */}
            <View style={styles.step}>
              <Text style={styles.stepIcon}>2️⃣</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {t(language, "caravanTutorial.step2Title")}
                </Text>
                <Text style={styles.stepText}>
                  {t(language, "caravanTutorial.step2Text")}
                </Text>
              </View>
            </View>

            {/* Step 3: Export vs Import */}
            <View style={styles.step}>
              <Text style={styles.stepIcon}>3️⃣</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {t(language, "caravanTutorial.step3Title")}
                </Text>
                <Text style={styles.stepText}>
                  {t(language, "caravanTutorial.step3Text")}
                </Text>
              </View>
            </View>

            {/* Step 4: Travel Time */}
            <View style={styles.step}>
              <Text style={styles.stepIcon}>4️⃣</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {t(language, "caravanTutorial.step4Title")}
                </Text>
                <Text style={styles.stepText}>
                  {t(language, "caravanTutorial.step4Text")}
                </Text>
              </View>
            </View>

            {/* Step 5: The Reward */}
            <View style={styles.step}>
              <Text style={styles.stepIcon}>5️⃣</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {t(language, "caravanTutorial.step5Title")}
                </Text>
                <Text style={styles.stepText}>
                  {t(language, "caravanTutorial.step5Text")}
                </Text>
              </View>
            </View>
          </View>

          {/* Closing Message */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              {t(language, "caravanTutorial.closing")}
            </Text>
          </View>
        </ScrollView>

        {/* Close Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <Text style={styles.closeButtonText}>
              {t(language, "common.close")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f0e8",
  },
  characterBanner: {
    backgroundColor: "linear-gradient(135deg, #d4a574 0%, #c89050 100%)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#8b6a3f",
  },
  characterImageLarge: {
    width: 100,
    height: 130,
    marginRight: 12,
  },
  characterInfo: {
    flex: 1,
    justifyContent: "center",
  },
  characterName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 4,
  },
  characterTagline: {
    fontSize: 14,
    color: "#4a3728",
    fontWeight: "500",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBox: {
    backgroundColor: "rgba(227, 179, 86, 0.15)",
    borderLeftWidth: 4,
    borderLeftColor: "#e3b356",
    padding: 12,
    marginVertical: 16,
    borderRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: "#2c1810",
    lineHeight: 24,
  },
  stepsContainer: {
    marginVertical: 20,
  },
  step: {
    flexDirection: "row",
    marginBottom: 18,
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#d4a574",
  },
  stepIcon: {
    fontSize: 36,
    marginRight: 14,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 8,
  },
  stepText: {
    fontSize: 15,
    color: "#3a2818",
    lineHeight: 22,
    fontWeight: "500",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e0d5c8",
    padding: 16,
    backgroundColor: "#f5f0e8",
  },
  closeButton: {
    backgroundColor: "#e3b356",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#2c1810",
    fontSize: 16,
    fontWeight: "600",
  },
});
