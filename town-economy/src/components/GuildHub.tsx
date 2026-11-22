import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, TextInput, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { normalizeGuildCode } from "../guild/guildName";
import { useGuild } from "../guild/GuildContext";
import { GUILD_CODE_LENGTH, GUILD_NAME_MAX } from "../guild/types";
import { Text } from "./AppText";
import { ConfettiBurst } from "./ConfettiBurst";
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
export function GuildHub({ sounds }: { sounds?: ReturnType<typeof useSoundEffects> }) {
  const {
    hubOpen,
    closeHub,
    status,
    guild,
    error,
    busy,
    create,
    join,
    clearError,
    refresh,
    celebrate,
    setFx,
  } = useGuild();
  const { t } = useEconomyContext();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<TabId>("overview");
  const scrollRef = useRef<ScrollView>(null);

  // the guild actions play their sounds through the game's own sound effects
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  useEffect(() => {
    setFx((kind) => {
      const s = soundsRef.current;
      if (!s) return;
      if (kind === "success") s.playSuccess();
      else if (kind === "buy") s.playBuy();
      else s.playTap();
    });
    return () => setFx(null);
  }, [setFx]);

  // an error shows for a few seconds, or until it is tapped
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 6000);
    return () => clearTimeout(id);
  }, [error, clearError]);

  // leaving a guild clears what was typed for the last one
  useEffect(() => {
    if (status === "in") {
      setName("");
      setCode("");
    }
  }, [status]);

  const openTab = (id: TabId) => {
    setTab(id);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    void refresh(); // the other members may have done something since
  };

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
                onPress={() => openTab(x.id)}
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

        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error && (
            <Pressable style={styles.errorBox} onPress={clearError} accessibilityRole="alert">
              <Text style={styles.errorText}>{t(`guild.error.${error}`)}</Text>
            </Pressable>
          )}

          {status === "loading" && <Text style={styles.hint}>{t("guild.loading")}</Text>}

          {(status === "none" || status === "unavailable") && (
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
                  returnKeyType="done"
                  onSubmitEditing={() => name.trim().length >= 3 && !busy && void create(name)}
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
                  returnKeyType="go"
                  onSubmitEditing={() => code.length === GUILD_CODE_LENGTH && !busy && void join(code)}
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
        <ConfettiBurst trigger={celebrate.n} big={celebrate.big} />
      </SafeAreaView>
    </Modal>
  );
}
