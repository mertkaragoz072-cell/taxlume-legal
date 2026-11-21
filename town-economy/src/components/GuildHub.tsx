import React, { useEffect, useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, TextInput, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { normalizeGuildCode } from "../guild/guildName";
import { useGuild } from "../guild/GuildContext";
import { GUILD_CODE_LENGTH, GUILD_NAME_MAX } from "../guild/types";
import { Text } from "./AppText";
import { GoalFrame, GoalRibbon } from "./GoalPanels";
import { HallTab } from "./guild/HallTab";
import { MarketTab } from "./guild/MarketTab";
import { MembersTab } from "./guild/MembersTab";
import { OverviewTab } from "./guild/OverviewTab";
import { styles } from "./guild/guildStyles";
import { BigButton } from "./ModalKit";
import { SheetHeader } from "./SheetHeader";

type TabId = "overview" | "market" | "members" | "hall";
const TABS: { id: TabId; icon: string }[] = [
  { id: "overview", icon: "🏰" },
  { id: "market", icon: "🛒" },
  { id: "members", icon: "👥" },
  { id: "hall", icon: "🏛️" },
];

/** The guild screen. Not in a guild yet: start one or join with a code. In
 * one: four tabs (overview, market, members, hall), everything read from the
 * guild backend (see src/guild). No free text exists except the guild's own name. */
export function GuildHub() {
  const { hubOpen, closeHub, status, guild, error, busy, create, join, clearError } = useGuild();
  const { t } = useEconomyContext();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!hubOpen) {
      setTab("overview");
      clearError();
    }
  }, [hubOpen, clearError]);

  return (
    <Modal visible={hubOpen} transparent animationType="fade" onRequestClose={closeHub}>
      <SafeAreaView style={styles.root}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <SheetHeader text={t("guild.title")} />
          </View>
          <Pressable
            onPress={closeHub}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={t("guild.close")}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {status === "in" && guild && (
          <View style={styles.tabBar}>
            {TABS.map((x) => (
              <Pressable
                key={x.id}
                onPress={() => setTab(x.id)}
                style={[styles.tab, tab === x.id && styles.tabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === x.id }}
              >
                <Text style={{ fontSize: 18 }}>{x.icon}</Text>
                <Text style={[styles.tabText, tab === x.id && { color: "#f6d36a" }]} numberOfLines={1}>
                  {t(`guild.tab.${x.id}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{t(`guild.error.${error}`)}</Text>
            </View>
          )}

          {status !== "in" && (
            <>
              <GoalRibbon text={t("guild.createSection")} />
              <GoalFrame>
                <Text style={styles.hint}>{t("guild.createHint")}</Text>
                <TextInput
                  value={name}
                  onChangeText={(v) => setName(v.slice(0, GUILD_NAME_MAX))}
                  placeholder={t("guild.namePlaceholder")}
                  placeholderTextColor="#6b5f4d"
                  style={styles.input}
                  maxLength={GUILD_NAME_MAX}
                />
                <BigButton
                  label={t("guild.createBtn")}
                  disabled={busy || name.trim().length < 3}
                  onPress={() => void create(name)}
                />
              </GoalFrame>

              <GoalRibbon text={t("guild.joinSection")} />
              <GoalFrame>
                <Text style={styles.hint}>{t("guild.joinHint")}</Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(normalizeGuildCode(v))}
                  placeholder={t("guild.codePlaceholder")}
                  placeholderTextColor="#6b5f4d"
                  style={[styles.input, styles.codeInput]}
                  maxLength={GUILD_CODE_LENGTH}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <BigButton
                  label={t("guild.joinBtn")}
                  disabled={busy || code.length !== GUILD_CODE_LENGTH}
                  onPress={() => void join(code)}
                />
              </GoalFrame>
            </>
          )}

          {status === "in" && guild && (
            <>
              {tab === "overview" && <OverviewTab guild={guild} />}
              {tab === "market" && <MarketTab guild={guild} />}
              {tab === "members" && <MembersTab guild={guild} />}
              {tab === "hall" && <HallTab guild={guild} />}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
