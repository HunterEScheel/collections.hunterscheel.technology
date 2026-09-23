import { useState, useCallback, useEffect } from "react";
import { HexGrid } from "./components/HexGrid";
import { SidePanel } from "./components/SidePanel";
import { AdminToolbar } from "./components/AdminToolbar";
import { AdminPinModal } from "./components/AdminPinModal";
import { PlayerNameModal } from "./components/PlayerNameModal";
import { QuestEditor } from "./components/QuestEditor";
import { PayoutModal } from "./components/PayoutModal";
import { FoundItemsModal } from "./components/FoundItemsModal";
import { Legend } from "./components/Legend";
import { BountyBoard } from "./components/BountyBoard";
import { DatePickerModal } from "./components/DatePickerModal";
import { About } from "./components/About";
import { Characters } from "./components/Characters";
import { World } from "./components/World";
import { Shop } from "./components/Shop";
import { ActiveQuests } from "./components/ActiveQuests";
import { InitiativeTracker } from "./components/InitiativeTracker";
import { CharacterModal } from "./components/CharacterModal";
import { MyItems } from "./components/MyItems";
import {
  useHexData,
  useQuests,
  useInitiative,
  useQuestFindings,
  useCharacters,
  setHexTerrain,
  setHexChallengeTier,
  setHexLandmark,
  createQuest,
  updateQuest,
  deleteQuest,
  joinQuest,
  leaveQuest,
  setQuestActive,
  payOutQuest,
  setQuestFoundItems,
  addInitiativeEntry,
  clearInitiativeTracker,
} from "./hooks/useFirebase";
import { useAdminMode } from "./hooks/useAdminMode";
import { useIsMobile } from "./hooks/useIsMobile";
import type { GeneratedEncounter } from "./data/bestiary";
import type {
  ChallengeTier,
  FoundItem,
  Landmark,
  Quest,
  TerrainType,
} from "./types";
import "./index.css";

type TopPage = "guild" | "about";
type GuildSub =
  | "map"
  | "active-quests"
  | "bounties"
  | "shop"
  | "initiative"
  | "my-items";
type AboutSub = "system" | "world" | "characters";

// URL <-> nav-state routing. We use plain query params so no server-side
// rewrites are needed on Vercel (no path-based routes to configure):
//   ?about=system|world|characters   → About page + sub
//   ?tab=map|active-quests|...        → Guild page + sub  (default: map)
const GUILD_SUBS: readonly GuildSub[] = [
  "map",
  "active-quests",
  "bounties",
  "shop",
  "initiative",
  "my-items",
];
const ABOUT_SUBS: readonly AboutSub[] = ["system", "world", "characters"];

interface NavState {
  topPage: TopPage;
  guildSub: GuildSub;
  aboutSub: AboutSub;
}

function navFromUrl(): NavState {
  if (typeof window === "undefined") {
    return { topPage: "guild", guildSub: "map", aboutSub: "system" };
  }
  const params = new URLSearchParams(window.location.search);
  const about = params.get("about");
  if (about && (ABOUT_SUBS as readonly string[]).includes(about)) {
    return {
      topPage: "about",
      guildSub: "map",
      aboutSub: about as AboutSub,
    };
  }
  const tab = params.get("tab");
  if (tab && (GUILD_SUBS as readonly string[]).includes(tab)) {
    return {
      topPage: "guild",
      guildSub: tab as GuildSub,
      aboutSub: "system",
    };
  }
  return { topPage: "guild", guildSub: "map", aboutSub: "system" };
}

function urlFromNav(nav: NavState): string {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  params.delete("tab");
  params.delete("about");
  if (nav.topPage === "about") {
    params.set("about", nav.aboutSub);
  } else {
    // Only add ?tab= for non-default subs so the "home" URL stays clean.
    if (nav.guildSub !== "map") params.set("tab", nav.guildSub);
  }
  const q = params.toString();
  return q ? `${window.location.pathname}?${q}` : window.location.pathname;
}

function App() {
  const initialNav = navFromUrl();
  const [topPage, setTopPage] = useState<TopPage>(initialNav.topPage);
  const [guildSub, setGuildSub] = useState<GuildSub>(initialNav.guildSub);
  const [aboutSub, setAboutSub] = useState<AboutSub>(initialNav.aboutSub);

  // Sync nav state → URL. Only pushes a new history entry when the URL
  // actually needs to change (skips no-op syncs, including the one that
  // fires right after popstate updates state to match the new URL).
  useEffect(() => {
    const nextUrl = urlFromNav({ topPage, guildSub, aboutSub });
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl === nextUrl) return;
    window.history.pushState(null, "", nextUrl);
  }, [topPage, guildSub, aboutSub]);

  // Sync URL → nav state when the user hits back/forward.
  useEffect(() => {
    const onPop = () => {
      const nav = navFromUrl();
      setTopPage(nav.topPage);
      setGuildSub(nav.guildSub);
      setAboutSub(nav.aboutSub);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const hexes = useHexData();
  const quests = useQuests();
  const initiativeEntries = useInitiative();
  const questFindings = useQuestFindings();
  const characters = useCharacters();
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const isMobile = useIsMobile();
  const [sidePanelOpen, setSidePanelOpen] = useState(!isMobile);

  // Selection
  const [selectedHex, setSelectedHex] = useState<{
    col: number;
    row: number;
  } | null>(null);

  // Admin
  const { isAdmin, adminPin, showPinModal, promptPin, verifyPin, closePinModal, logout } =
    useAdminMode();
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType | null>(
    null
  );
  const [selectedTier, setSelectedTier] = useState<ChallengeTier | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<
    Landmark | null | "clear"
  >(null);

  // Player
  const [playerName, setPlayerName] = useState<string | null>(() =>
    localStorage.getItem("hexmap_player_name")
  );
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingJoinQuestId, setPendingJoinQuestId] = useState<string | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDateQuestId, setPendingDateQuestId] = useState<string | null>(
    null
  );

  // Quest editor
  const [questEditor, setQuestEditor] = useState<{
    isOpen: boolean;
    quest?: Quest;
    hexCol: number;
    hexRow: number;
  }>({ isOpen: false, hexCol: 0, hexRow: 0 });

  // Quest payout
  const [payoutQuest, setPayoutQuest] = useState<Quest | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);

  // Quest found-items editor. Track by id so the modal reflects the live
  // quest (party changes, realtime updates) rather than a stale snapshot.
  const [foundItemsQuestId, setFoundItemsQuestId] = useState<string | null>(
    null
  );
  const [foundItemsBusy, setFoundItemsBusy] = useState(false);

  const handleHexSelect = useCallback(
    (col: number, row: number) => {
      if (isAdmin && adminPin && selectedTerrain) {
        setHexTerrain(adminPin, col, row, selectedTerrain).catch((err) => {
          console.error("setHexTerrain failed:", err);
          alert(`Admin write rejected: ${err.message}`);
        });
        return;
      }
      if (isAdmin && adminPin && selectedTier != null) {
        setHexChallengeTier(adminPin, col, row, selectedTier).catch((err) => {
          console.error("setHexChallengeTier failed:", err);
          alert(`Admin write rejected: ${err.message}`);
        });
        return;
      }
      if (isAdmin && adminPin && selectedLandmark != null) {
        const value = selectedLandmark === "clear" ? null : selectedLandmark;
        setHexLandmark(adminPin, col, row, value).catch((err) => {
          console.error("setHexLandmark failed:", err);
          alert(`Admin write rejected: ${err.message}`);
        });
        return;
      }
      setSelectedHex((prev) =>
        prev?.col === col && prev?.row === row ? null : { col, row }
      );
      // Selecting a hex auto-opens the (possibly collapsed) info panel.
      setSidePanelOpen(true);
    },
    [isAdmin, adminPin, selectedTerrain, selectedTier, selectedLandmark]
  );

  const handleJoinQuest = useCallback(
    async (questId: string) => {
      if (!playerName) {
        setPendingJoinQuestId(questId);
        setShowNameModal(true);
        return;
      }
      const quest = quests.find((q) => q.id === questId);
      if (quest && quest.players.length === 0) {
        setPendingDateQuestId(questId);
        setShowDatePicker(true);
        return;
      }
      joinQuest(questId, playerName);
    },
    [playerName, quests]
  );

  const handleDateConfirm = useCallback(
    async (date: string) => {
      setShowDatePicker(false);
      if (!playerName || !pendingDateQuestId) return;

      await joinQuest(pendingDateQuestId, playerName, date);
      setPendingDateQuestId(null);
    },
    [playerName, pendingDateQuestId, quests]
  );

  const handleNameConfirm = useCallback(
    (name: string) => {
      localStorage.setItem("hexmap_player_name", name);
      setPlayerName(name);
      setShowNameModal(false);
      if (pendingJoinQuestId) {
        const quest = quests.find((q) => q.id === pendingJoinQuestId);
        if (quest && quest.players.length === 0) {
          setPendingDateQuestId(pendingJoinQuestId);
          setShowDatePicker(true);
        } else {
          joinQuest(pendingJoinQuestId, name);
        }
        setPendingJoinQuestId(null);
      }
    },
    [pendingJoinQuestId, quests]
  );

  const handleLeaveQuest = useCallback(
    (questId: string) => {
      if (playerName) {
        leaveQuest(questId, playerName);
      }
    },
    [playerName]
  );

  const handleSetQuestActive = useCallback(
    (questId: string) => {
      if (!playerName) return;
      setQuestActive(questId, playerName).catch((err) => {
        console.error("setQuestActive failed:", err);
        alert(err instanceof Error ? err.message : "Failed to set active");
      });
    },
    [playerName]
  );

  const handleAddQuest = useCallback(() => {
    if (!selectedHex) return;
    setQuestEditor({
      isOpen: true,
      hexCol: selectedHex.col,
      hexRow: selectedHex.row,
    });
  }, [selectedHex]);

  const handleEditQuest = useCallback((quest: Quest) => {
    setQuestEditor({
      isOpen: true,
      quest,
      hexCol: quest.hexCol,
      hexRow: quest.hexRow,
    });
  }, []);

  const handleDeleteQuest = useCallback(
    (questId: string) => {
      if (!adminPin) return;
      deleteQuest(adminPin, questId).catch((err) => {
        console.error("deleteQuest failed:", err);
        alert(`Admin write rejected: ${err.message}`);
      });
    },
    [adminPin]
  );

  const handleQuestSave = useCallback(
    (questData: Omit<Quest, "id">) => {
      if (!adminPin) return;
      const op = questEditor.quest
        ? updateQuest(adminPin, questEditor.quest.id, questData)
        : createQuest(adminPin, questData);
      op.catch((err) => {
        console.error("quest save failed:", err);
        alert(`Admin write rejected: ${err.message}`);
      });
      setQuestEditor({ isOpen: false, hexCol: 0, hexRow: 0 });
    },
    [adminPin, questEditor.quest]
  );

  const handleOpenPayout = useCallback((quest: Quest) => {
    setPayoutQuest(quest);
  }, []);

  const handlePayoutConfirm = useCallback(
    async (multiplier: number, beastBonus: number) => {
      if (!adminPin || !payoutQuest) return;
      setPayoutBusy(true);
      try {
        const res = await payOutQuest(
          adminPin,
          payoutQuest.id,
          multiplier,
          beastBonus
        );
        const lines = res.paid
          .map((p) => `${p.player}: +${p.amount.toLocaleString()} gp`)
          .join("\n");
        const skippedMsg = res.skipped.length
          ? `\n\nSkipped (no character): ${res.skipped
              .map((s) => s.player)
              .join(", ")}`
          : "";
        alert(
          `Paid out ${res.total.toLocaleString()} gp.\n\n${lines}${skippedMsg}`
        );
        setPayoutQuest(null);
      } catch (err) {
        console.error("payOutQuest failed:", err);
        alert(
          `Payout failed: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setPayoutBusy(false);
      }
    },
    [adminPin, payoutQuest]
  );

  const handleOpenFoundItems = useCallback((quest: Quest) => {
    setFoundItemsQuestId(quest.id);
  }, []);

  const handleFoundItemsSave = useCallback(
    async (items: FoundItem[]) => {
      if (!adminPin || !foundItemsQuestId) return;
      setFoundItemsBusy(true);
      try {
        await setQuestFoundItems(adminPin, foundItemsQuestId, items);
        setFoundItemsQuestId(null);
      } catch (err) {
        console.error("setQuestFoundItems failed:", err);
        alert(
          `Save failed: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setFoundItemsBusy(false);
      }
    },
    [adminPin, foundItemsQuestId]
  );

  const handleRunEncounter = useCallback(async (encounter: GeneratedEncounter) => {
    if (!adminPin) return;
    try {
      await clearInitiativeTracker(adminPin);
      const entries: { name: string; initiative: number; isCreature: boolean; stats: { hp: number; ac: number; cr: number } }[] = [];
      for (const group of encounter.groups) {
        for (let i = 0; i < group.count; i++) {
          const roll = 1 + Math.floor(Math.random() * 20);
          const label = group.count > 1
            ? `${group.creature.name} ${i + 1}`
            : group.creature.name;
          entries.push({
            name: label,
            initiative: roll,
            isCreature: true,
            stats: {
              hp: group.creature.hitPoints,
              ac: group.creature.armorClass,
              cr: group.creature.challengeRating,
            },
          });
        }
      }
      await Promise.all(
        entries.map((e) => addInitiativeEntry(e.name, e.initiative, e.isCreature, e.stats))
      );
    } catch (err) {
      console.error("Failed to run encounter:", err);
    }
    setGuildSub("initiative");
  }, [adminPin]);

  const selectedHexData = selectedHex
    ? hexes.get(`${selectedHex.col}_${selectedHex.row}`)
    : undefined;

  const foundItemsQuest = foundItemsQuestId
    ? quests.find((q) => q.id === foundItemsQuestId) ?? null
    : null;

  const questBadge = quests.filter(
    (q) =>
      q.status === "in_progress" &&
      (!playerName || !q.players.includes(playerName))
  ).length;

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#0f0f1a",
        overflow: "hidden",
      }}
    >
      {/* Top Navigation */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "#12121f",
          borderBottom: "1px solid #2e2e4a",
          padding: "0 16px",
          height: 42,
          flexShrink: 0,
        }}
      >
        <NavTab
          label="Guild"
          active={topPage === "guild"}
          onClick={() => setTopPage("guild")}
          badge={topPage !== "guild" ? questBadge : undefined}
        />
        <NavTab
          label="About"
          active={topPage === "about"}
          onClick={() => setTopPage("about")}
        />
        <a
          href="https://discord.gg/eXsvTXTFT4"
          target="_blank"
          rel="noopener noreferrer"
          title="Join our Discord"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#9ca3af",
            textDecoration: "none",
            fontFamily: "'Cinzel', serif",
            fontSize: 14,
            letterSpacing: "0.5px",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #2e2e4a",
            background: "#1e1e36",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
            <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.369a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          Discord
        </a>
        <a
          href={`${import.meta.env.BASE_URL}hexmap-companion.apk`}
          download
          title="Download the Android combat-tracker app"
          style={{
            marginLeft: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#9ca3af",
            textDecoration: "none",
            fontFamily: "'Cinzel', serif",
            fontSize: 14,
            letterSpacing: "0.5px",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #2e2e4a",
            background: "#1e1e36",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 16 }}>📱</span>
          Android App
        </a>
      </nav>

      {/* Sub Navigation */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "#0f0f1a",
          borderBottom: "1px solid #1e1e36",
          padding: "0 16px",
          height: 36,
          flexShrink: 0,
        }}
      >
        {topPage === "guild" ? (
          <>
            <SubTab label="Map" active={guildSub === "map"} onClick={() => setGuildSub("map")} />
            <SubTab
              label="Active Quests"
              active={guildSub === "active-quests"}
              onClick={() => setGuildSub("active-quests")}
              badge={questBadge}
            />
            <SubTab label="Bounty Board" active={guildSub === "bounties"} onClick={() => setGuildSub("bounties")} />
            <SubTab label="Shop" active={guildSub === "shop"} onClick={() => setGuildSub("shop")} />
            <SubTab label="Initiative" active={guildSub === "initiative"} onClick={() => setGuildSub("initiative")} />
            <SubTab label="My Items" active={guildSub === "my-items"} onClick={() => setGuildSub("my-items")} />
          </>
        ) : (
          <>
            <SubTab label="The System" active={aboutSub === "system"} onClick={() => setAboutSub("system")} />
            <SubTab label="The World" active={aboutSub === "world"} onClick={() => setAboutSub("world")} />
            <SubTab label="Character Creation" active={aboutSub === "characters"} onClick={() => setAboutSub("characters")} />
          </>
        )}
      </nav>

      {isAdmin && topPage === "guild" && guildSub === "map" && (
        <AdminToolbar
          selectedTerrain={selectedTerrain}
          onSelectTerrain={setSelectedTerrain}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          selectedLandmark={selectedLandmark}
          onSelectLandmark={setSelectedLandmark}
          onLogout={logout}
        />
      )}

      {/* Page Content */}
      {topPage === "guild" && guildSub === "map" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            minHeight: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              flex: "1 1 0",
              position: "relative",
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <HexGrid
              hexes={hexes}
              quests={quests}
              selectedHex={selectedHex}
              onHexSelect={handleHexSelect}
              isErasing={isAdmin && selectedTerrain === "unknown"}
            />
            <Legend isMobile={isMobile} sidePanelOpen={sidePanelOpen} />

            {/* Reopen tab when the side panel is collapsed */}
            {!sidePanelOpen && (
              <button
                onClick={() => setSidePanelOpen(true)}
                title="Show info panel"
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 0,
                  transform: "translateY(-50%)",
                  width: 28,
                  height: 64,
                  borderRadius: "8px 0 0 8px",
                  background: "#1e1e36",
                  border: "1px solid #2e2e4a",
                  borderRight: "none",
                  color: "#9ca3af",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 90,
                }}
              >
                &#9664;
              </button>
            )}
          </div>

          <SidePanel
            selectedHex={selectedHex}
            hexData={selectedHexData}
            quests={quests}
            playerName={playerName}
            isAdmin={isAdmin}
            adminPin={adminPin}
            onJoinQuest={handleJoinQuest}
            onLeaveQuest={handleLeaveQuest}
            onSetQuestActive={handleSetQuestActive}
            onEditQuest={handleEditQuest}
            onDeleteQuest={handleDeleteQuest}
            onAddQuest={handleAddQuest}
            onRunEncounter={isAdmin ? handleRunEncounter : undefined}
            isMobile={isMobile}
            isOpen={sidePanelOpen}
            onClose={() => setSidePanelOpen(false)}
          />
        </div>
      ) : topPage === "guild" && guildSub === "active-quests" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <ActiveQuests
            quests={quests}
            hexes={hexes}
            findings={questFindings}
            playerName={playerName}
            isAdmin={isAdmin}
            adminPin={adminPin}
            onJoinQuest={handleJoinQuest}
            onLeaveQuest={handleLeaveQuest}
            onEditQuest={handleEditQuest}
            onDeleteQuest={handleDeleteQuest}
            onSetQuestActive={handleSetQuestActive}
            onPayOutQuest={handleOpenPayout}
            onManageFoundItems={handleOpenFoundItems}
            onSetPlayerName={() => setShowNameModal(true)}
          />
        </div>
      ) : topPage === "guild" && guildSub === "bounties" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <BountyBoard />
        </div>
      ) : topPage === "guild" && guildSub === "shop" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Shop isAdmin={isAdmin} adminPin={adminPin} playerName={playerName} />
        </div>
      ) : topPage === "guild" && guildSub === "initiative" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <InitiativeTracker
            entries={initiativeEntries}
            playerName={playerName}
            isAdmin={isAdmin}
            adminPin={adminPin}
            characters={characters}
          />
        </div>
      ) : topPage === "guild" && guildSub === "my-items" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <MyItems
            playerName={playerName}
            character={playerName ? characters.get(playerName) : undefined}
            quests={quests}
            onSetPlayerName={() => setShowNameModal(true)}
            onOpenCharacter={() => {
              if (!playerName) {
                setShowNameModal(true);
                return;
              }
              setShowCharacterModal(true);
            }}
          />
        </div>
      ) : topPage === "about" && aboutSub === "system" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <About />
        </div>
      ) : topPage === "about" && aboutSub === "world" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <World />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Characters />
        </div>
      )}

      {/* Global admin lock — visible on every page until logged in */}
      {!isAdmin && (
        <button
          onClick={promptPin}
          title="Admin Login"
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            width: 44,
            height: 44,
            borderRadius: 8,
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            color: "#6b7280",
            fontSize: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          &#128274;
        </button>
      )}

      {/* Global character editor — visible on every page */}
      <button
        onClick={() => {
          if (!playerName) {
            setShowNameModal(true);
            return;
          }
          setShowCharacterModal(true);
        }}
        title={
          playerName
            ? `Edit character (${playerName})`
            : "Set player name first"
        }
        style={{
          position: "fixed",
          bottom: 16,
          left: isAdmin ? 16 : 68,
          width: 44,
          height: 44,
          borderRadius: 8,
          background: "#1e1e36",
          border: "1px solid #2e2e4a",
          color: "#9ca3af",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        &#128100;
      </button>

      {/* Modals */}
      {showPinModal && (
        <AdminPinModal onVerify={verifyPin} onClose={closePinModal} />
      )}

      {showNameModal && (
        <PlayerNameModal
          onConfirm={handleNameConfirm}
          onCancel={() => {
            setShowNameModal(false);
            setPendingJoinQuestId(null);
          }}
        />
      )}

      {showDatePicker && (
        <DatePickerModal
          onConfirm={handleDateConfirm}
          onCancel={() => {
            setShowDatePicker(false);
            setPendingDateQuestId(null);
          }}
        />
      )}

      {showCharacterModal && playerName && (
        <CharacterModal
          currentName={playerName}
          character={characters.get(playerName)}
          onClose={() => setShowCharacterModal(false)}
          onSaved={(newName) => {
            localStorage.setItem("hexmap_player_name", newName);
            setPlayerName(newName);
          }}
        />
      )}

      {questEditor.isOpen && (
        <QuestEditor
          quest={questEditor.quest}
          hexCol={questEditor.hexCol}
          hexRow={questEditor.hexRow}
          onSave={handleQuestSave}
          onCancel={() =>
            setQuestEditor({ isOpen: false, hexCol: 0, hexRow: 0 })
          }
        />
      )}

      {payoutQuest && (
        <PayoutModal
          quest={payoutQuest}
          charactersWithGold={new Set(characters.keys())}
          onConfirm={handlePayoutConfirm}
          onCancel={() => setPayoutQuest(null)}
          busy={payoutBusy}
        />
      )}

      {foundItemsQuest && (
        <FoundItemsModal
          quest={foundItemsQuest}
          onSave={handleFoundItemsSave}
          onCancel={() => setFoundItemsQuestId(null)}
          busy={foundItemsBusy}
        />
      )}
    </div>
  );
}

function NavTab({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid #4ade80" : "2px solid transparent",
        color: active ? "#e8e8f0" : "#6b7280",
        padding: "10px 24px",
        fontSize: 15,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: "'Cinzel', serif",
        letterSpacing: "0.5px",
        position: "relative",
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            background: "#ef4444",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            borderRadius: "50%",
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function SubTab({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid #c084fc" : "2px solid transparent",
        color: active ? "#e8e8f0" : "#6b7280",
        padding: "7px 16px",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        letterSpacing: "0.3px",
        position: "relative",
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: "#ef4444",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            borderRadius: "50%",
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default App;
