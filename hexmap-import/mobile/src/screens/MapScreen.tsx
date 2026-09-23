// Port of web HexGrid + SidePanel + Legend: pannable/zoomable SVG hex map,
// tap-to-select with a bottom panel, quest pins/routes, legend.
// Player view only — no challenge tier, no admin brushes.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { G, Line, Path, Polygon, Text as SvgText } from "react-native-svg";
import { DatePickerModal } from "../components/DatePickerModal";
import { LandmarkIcon } from "../components/map/LandmarkIcon";
import { QuestCard } from "../components/QuestCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { joinQuest, leaveQuest, setQuestActive } from "../data/guild";
import { useStore } from "../store";
import { colors } from "../theme";
import type { Quest } from "../types";
import { HEX_SIZE, hexNeighbors, hexPointsString, hexToPixel } from "../utils/hexMath";
import {
  LANDMARK_LABELS,
  TERRAIN_COLORS,
  TERRAIN_LABELS,
} from "../utils/mapColors";
import { QUEST_LEVEL_COLORS, QUEST_LEVEL_LABELS } from "../utils/format";

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MapScreenProps {
  onBack: () => void;
  onSetPlayerName: () => void;
}

export function MapScreen({ onBack, onSetPlayerName }: MapScreenProps) {
  const hexes = useStore((s) => s.hexes);
  const quests = useStore((s) => s.quests);
  const playerName = useStore((s) => s.playerName);

  const [selected, setSelected] = useState<{ col: number; row: number } | null>(
    null
  );
  const [legendOpen, setLegendOpen] = useState(false);
  const [showCompletedOnHex, setShowCompletedOnHex] = useState(false);
  const [dateQuestId, setDateQuestId] = useState<string | null>(null);

  // --- Grid cells: known hexes plus all their neighbors (fog ring) ---
  const cells = useMemo(() => {
    const set = new Map<string, { col: number; row: number }>();
    for (const h of hexes.values()) {
      if (h.terrain === "unknown" && h.landmark == null) continue;
      set.set(`${h.col}_${h.row}`, { col: h.col, row: h.row });
      for (const n of hexNeighbors(h.col, h.row)) {
        set.set(`${n.col}_${n.row}`, n);
      }
    }
    if (set.size === 0) {
      for (let c = 0; c < 5; c++)
        for (let r = 0; r < 5; r++) set.set(`${c}_${r}`, { col: c, row: r });
    }
    return [...set.values()];
  }, [hexes]);

  const activeQuests = useMemo(
    () =>
      quests.filter((q) => q.status !== "completed" && q.status !== "paid_out"),
    [quests]
  );

  // --- Viewport ---
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [viewBox, setViewBox] = useState<ViewBox | null>(null);
  const viewBoxRef = useRef<ViewBox | null>(null);
  viewBoxRef.current = viewBox;
  const containerRef = useRef(containerSize);
  containerRef.current = containerSize;
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || containerSize.w === 0 || cells.length === 0)
      return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const c of cells) {
      const p = hexToPixel(c.col, c.row);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const pad = HEX_SIZE * 2;
    let x = minX - pad,
      y = minY - pad,
      w = maxX - minX + pad * 2,
      h = maxY - minY + pad * 2;
    // Expand (never crop) to the container aspect and center.
    const aspect = containerSize.w / containerSize.h;
    if (w / h < aspect) {
      const newW = h * aspect;
      x -= (newW - w) / 2;
      w = newW;
    } else {
      const newH = w / aspect;
      y -= (newH - h) / 2;
      h = newH;
    }
    initialized.current = true;
    setViewBox({ x, y, w, h });
  }, [containerSize, cells]);

  // --- Gestures: pan (1 finger), pinch (2 fingers), tap (select) ---
  const gesture = useRef({
    startVb: null as ViewBox | null,
    startTouch: { x: 0, y: 0 },
    startDist: 0,
    startMid: { x: 0, y: 0 },
    moved: false,
    pinching: false,
  });

  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const g = gesture.current;
        g.startVb = viewBoxRef.current;
        g.moved = false;
        g.pinching = false;
        const t = evt.nativeEvent.touches[0];
        g.startTouch = { x: t.pageX, y: t.pageY };
      },
      onPanResponderMove: (evt) => {
        const g = gesture.current;
        const vb0 = g.startVb;
        if (!vb0) return;
        const touches = evt.nativeEvent.touches;
        const { w: W, h: H } = containerRef.current;
        if (W === 0) return;

        if (touches.length >= 2) {
          const [a, b] = [touches[0], touches[1]];
          const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const mid = {
            x: (a.locationX + b.locationX) / 2,
            y: (a.locationY + b.locationY) / 2,
          };
          if (!g.pinching) {
            g.pinching = true;
            g.moved = true;
            g.startDist = dist;
            g.startMid = mid;
            g.startVb = viewBoxRef.current;
            return;
          }
          const vb = g.startVb!;
          const scale = g.startDist / Math.max(1, dist);
          const newW = vb.w * scale;
          const newH = vb.h * scale;
          const anchorX = vb.x + (g.startMid.x / W) * vb.w;
          const anchorY = vb.y + (g.startMid.y / H) * vb.h;
          setViewBox({
            x: anchorX - (g.startMid.x / W) * newW,
            y: anchorY - (g.startMid.y / H) * newH,
            w: newW,
            h: newH,
          });
          return;
        }

        if (g.pinching) return; // finger lifted mid-pinch: ignore leftovers
        const t = touches[0];
        if (!t) return;
        const dx = t.pageX - g.startTouch.x;
        const dy = t.pageY - g.startTouch.y;
        if (!g.moved && Math.hypot(dx, dy) < 6) return; // tap threshold
        g.moved = true;
        setViewBox({
          x: vb0.x - dx * (vb0.w / W),
          y: vb0.y - dy * (vb0.h / H),
          w: vb0.w,
          h: vb0.h,
        });
      },
      onPanResponderRelease: (evt) => {
        const g = gesture.current;
        if (g.moved || g.pinching) return;
        const vb = viewBoxRef.current;
        const { w: W, h: H } = containerRef.current;
        if (!vb || W === 0) return;
        const lx = evt.nativeEvent.locationX;
        const ly = evt.nativeEvent.locationY;
        const px = vb.x + (lx / W) * vb.w;
        const py = vb.y + (ly / H) * vb.h;
        // Nearest hex center within one hex radius = the tapped tile.
        let best: { col: number; row: number } | null = null;
        let bestDist = HEX_SIZE;
        for (const c of cellsRef.current) {
          const p = hexToPixel(c.col, c.row);
          const d = Math.hypot(p.x - px, p.y - py);
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
        if (best) {
          const cur = selectedRef.current;
          setSelected(
            cur && cur.col === best.col && cur.row === best.row ? null : best
          );
          setShowCompletedOnHex(false);
        }
      },
    })
  ).current;

  // --- Quest pins grouped by start hex ---
  const pinGroups = useMemo(() => {
    const groups = new Map<string, Quest[]>();
    for (const q of activeQuests) {
      const key = `${q.hexCol}_${q.hexRow}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    }
    return groups;
  }, [activeQuests]);

  // --- Selected hex data + quests ---
  const selectedHex = selected
    ? hexes.get(`${selected.col}_${selected.row}`) ?? {
        col: selected.col,
        row: selected.row,
        terrain: "unknown" as const,
        challengeTier: null,
        landmark: null,
        landmarkName: null,
      }
    : null;

  const hexQuests = selected
    ? quests.filter(
        (q) => q.hexCol === selected.col && q.hexRow === selected.row
      )
    : [];
  const hexQuestsVisible = showCompletedOnHex
    ? hexQuests
    : hexQuests.filter((q) => q.status !== "completed");
  const hexCompletedCount = hexQuests.filter(
    (q) => q.status === "completed"
  ).length;

  // --- Join flow (same as QuestsScreen) ---
  function handleJoin(questId: string) {
    if (!playerName) {
      onSetPlayerName();
      return;
    }
    const quest = quests.find((q) => q.id === questId);
    if (quest && quest.players.length === 0) setDateQuestId(questId);
    else
      joinQuest(questId, playerName).catch((err) =>
        Alert.alert("Join failed", String((err as Error).message))
      );
  }

  const pinSize = HEX_SIZE * 0.35;
  const pinSpacing = HEX_SIZE * 0.45;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Map" onBack={onBack} />

      <View
        style={styles.mapContainer}
        onLayout={(e) =>
          setContainerSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
        {...panResponder.panHandlers}
      >
        {viewBox && (
          <Svg
            width="100%"
            height="100%"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          >
            {/* terrain fills */}
            {cells.map((c) => {
              const h = hexes.get(`${c.col}_${c.row}`);
              const terrain = h?.terrain ?? "unknown";
              return (
                <Polygon
                  key={`${c.col}_${c.row}`}
                  points={hexPointsString(c.col, c.row)}
                  fill={TERRAIN_COLORS[terrain]}
                  stroke="#1a1a2e"
                  strokeWidth={1}
                />
              );
            })}

            {/* landmarks */}
            {[...hexes.values()]
              .filter((h) => h.landmark != null)
              .map((h) => (
                <LandmarkIcon
                  key={`lm-${h.col}_${h.row}`}
                  col={h.col}
                  row={h.row}
                  landmark={h.landmark!}
                />
              ))}

            {/* landmark names */}
            {[...hexes.values()]
              .filter((h) => h.landmarkName)
              .map((h) => {
                const p = hexToPixel(h.col, h.row);
                return (
                  <G key={`lbl-${h.col}_${h.row}`}>
                    <SvgText
                      x={p.x}
                      y={p.y + HEX_SIZE * 0.78}
                      fontSize={HEX_SIZE * 0.32}
                      textAnchor="middle"
                      fontWeight="600"
                      stroke="#0a0a0a"
                      strokeWidth={3}
                      fill="#0a0a0a"
                    >
                      {h.landmarkName}
                    </SvgText>
                    <SvgText
                      x={p.x}
                      y={p.y + HEX_SIZE * 0.78}
                      fontSize={HEX_SIZE * 0.32}
                      textAnchor="middle"
                      fontWeight="600"
                      fill="#fde68a"
                    >
                      {h.landmarkName}
                    </SvgText>
                  </G>
                );
              })}

            {/* selection outline */}
            {selected && (
              <Polygon
                points={hexPointsString(selected.col, selected.row)}
                fill="none"
                stroke="#ffffff"
                strokeWidth={3}
              />
            )}

            {/* quest routes */}
            {activeQuests
              .filter((q) => q.endHexCol != null && q.endHexRow != null)
              .map((q) => {
                const a = hexToPixel(q.hexCol, q.hexRow);
                const b = hexToPixel(q.endHexCol!, q.endHexRow!);
                return (
                  <Line
                    key={`route-${q.id}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={QUEST_LEVEL_COLORS[q.level] ?? "#4ade80"}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    opacity={0.7}
                  />
                );
              })}

            {/* quest pins */}
            {[...pinGroups.entries()].map(([key, group]) => {
              const [c, r] = key.split("_").map(Number);
              const center = hexToPixel(c, r);
              const totalWidth = (group.length - 1) * pinSpacing;
              return group.map((q, i) => {
                const px = center.x - totalWidth / 2 + i * pinSpacing;
                const color = QUEST_LEVEL_COLORS[q.level] ?? "#4ade80";
                return (
                  <G key={`pin-${q.id}`} x={px} y={center.y}>
                    <Path
                      d={`M 0 0 C ${-pinSize} ${-pinSize * 1.2}, ${-pinSize} ${-pinSize * 2}, 0 ${-pinSize * 2.5} C ${pinSize} ${-pinSize * 2}, ${pinSize} ${-pinSize * 1.2}, 0 0 Z`}
                      fill={color}
                      stroke="#000"
                      strokeWidth={0.5}
                    />
                  </G>
                );
              });
            })}
          </Svg>
        )}

        {/* Legend */}
        <View style={styles.legendWrap}>
          {legendOpen ? (
            <View style={styles.legendCard}>
              <Pressable onPress={() => setLegendOpen(false)}>
                <Text style={styles.legendClose}>Legend ✕</Text>
              </Pressable>
              <ScrollView style={{ maxHeight: 260 }}>
                <Text style={styles.legendGroup}>TERRAIN</Text>
                {(Object.keys(TERRAIN_COLORS) as (keyof typeof TERRAIN_COLORS)[]).map(
                  (t) => (
                    <View key={t} style={styles.legendRow}>
                      <View
                        style={[
                          styles.swatch,
                          { backgroundColor: TERRAIN_COLORS[t] },
                        ]}
                      />
                      <Text style={styles.legendLabel}>{TERRAIN_LABELS[t]}</Text>
                    </View>
                  )
                )}
                <Text style={styles.legendGroup}>QUEST LEVEL</Text>
                {Object.keys(QUEST_LEVEL_COLORS).map((l) => (
                  <View key={l} style={styles.legendRow}>
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: QUEST_LEVEL_COLORS[l] },
                      ]}
                    />
                    <Text style={styles.legendLabel}>
                      {QUEST_LEVEL_LABELS[l]}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <Pressable
              onPress={() => setLegendOpen(true)}
              style={styles.legendButton}
            >
              <Text style={styles.legendButtonText}>Legend</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Bottom panel for the selected hex */}
      {selectedHex && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>
              Hex ({selectedHex.col}, {selectedHex.row})
            </Text>
            <Pressable onPress={() => setSelected(null)} hitSlop={10}>
              <Text style={styles.panelClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.panelBody}>
            <View style={styles.terrainRow}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: TERRAIN_COLORS[selectedHex.terrain] },
                ]}
              />
              <Text style={styles.terrainLabel}>
                {TERRAIN_LABELS[selectedHex.terrain]}
              </Text>
            </View>
            {selectedHex.landmark && (
              <View style={styles.landmarkBlock}>
                <Text style={styles.landmarkLabel}>
                  Landmark: {LANDMARK_LABELS[selectedHex.landmark]}
                </Text>
                {selectedHex.landmarkName && (
                  <Text style={styles.landmarkName}>
                    {selectedHex.landmarkName}
                  </Text>
                )}
              </View>
            )}

            <Text style={styles.questsHeading}>
              Quests ({hexQuests.length})
            </Text>
            {hexQuestsVisible.length === 0 && (
              <Text style={styles.emptyQuests}>
                {hexQuests.length > 0
                  ? "No active quests on this hex."
                  : "No quests on this hex."}
              </Text>
            )}
            {hexQuestsVisible.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                compact
                onJoin={handleJoin}
                onLeave={(id) =>
                  playerName &&
                  leaveQuest(id, playerName).catch((err) =>
                    Alert.alert("Leave failed", String((err as Error).message))
                  )
                }
                onSetActive={(id) =>
                  playerName &&
                  setQuestActive(id, playerName).catch((err) =>
                    Alert.alert("Failed", String((err as Error).message))
                  )
                }
              />
            ))}
            {hexCompletedCount > 0 && (
              <Pressable
                onPress={() => setShowCompletedOnHex((v) => !v)}
                style={styles.toggleCompleted}
              >
                <Text style={styles.toggleCompletedText}>
                  {showCompletedOnHex ? "Hide" : "Show"} completed quests (
                  {hexCompletedCount})
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      <DatePickerModal
        visible={dateQuestId != null}
        onConfirm={(iso) => {
          if (dateQuestId && playerName) {
            joinQuest(dateQuestId, playerName, iso).catch((err) =>
              Alert.alert("Join failed", String((err as Error).message))
            );
          }
          setDateQuestId(null);
        }}
        onClose={() => setDateQuestId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapContainer: { flex: 1, backgroundColor: "#0a0a14" },
  legendWrap: { position: "absolute", bottom: 12, right: 12 },
  legendButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  legendButtonText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  legendCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    minWidth: 170,
  },
  legendClose: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  legendGroup: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  swatch: { width: 12, height: 12, borderRadius: 2 },
  legendLabel: { color: colors.text, fontSize: 12 },
  panel: {
    maxHeight: "45%",
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  panelClose: { color: colors.textMuted, fontSize: 16 },
  panelBody: { paddingHorizontal: 16 },
  terrainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  terrainLabel: { color: colors.text, fontSize: 14 },
  landmarkBlock: { marginBottom: 8 },
  landmarkLabel: { color: colors.purple, fontSize: 13 },
  landmarkName: { color: "#fde68a", fontSize: 14, fontWeight: "600" },
  questsHeading: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 6,
  },
  emptyQuests: { color: colors.textFaint, fontSize: 12, marginBottom: 12 },
  toggleCompleted: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  toggleCompletedText: { color: colors.textMuted, fontSize: 12 },
});
