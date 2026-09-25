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
import { CaravanGuideCharacter } from "./CaravanGuideCharacter";

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
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Caravan Guide Character */}
          <View style={styles.characterSection}>
            <CaravanGuideCharacter size={100} />
            <Text style={styles.characterName}>
              {t(language, "caravanTutorial.guideTitle")}
            </Text>
          </View>

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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  characterSection: {
    alignItems: "center",
    marginVertical: 24,
  },
  characterName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2c1810",
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
    marginBottom: 16,
    alignItems: "flex-start",
  },
  stepIcon: {
    fontSize: 32,
    marginRight: 12,
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c1810",
    marginBottom: 6,
  },
  stepText: {
    fontSize: 14,
    color: "#4a3728",
    lineHeight: 20,
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
