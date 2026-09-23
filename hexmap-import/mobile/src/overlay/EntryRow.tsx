// Port of web InitiativeTracker.tsx InitiativeRow — same fog-of-war and
// damage/heal semantics (absolute HP write, clamped to [0, maxHp]) — plus a
// GM-only expandable detail view (one row at a time, toggled by CombatPanel):
// heal/damage controls, SRD attack options, and vuln/resist/immunities.
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { formatCr, hpStatus } from "../data/hpStatus";
import { removeInitiativeEntry, updateInitiativeHp } from "../data/initiative";
import { getCreatureDetails } from "../data/open5e";
import { useStore } from "../store";
import { colors } from "../theme";
import type { CreatureDetails, InitiativeEntry } from "../types";
import { focusableProps } from "./focusable";

interface EntryRowProps {
  entry: InitiativeEntry;
  position: number;
  expanded: boolean;
  onToggle: () => void;
}

export function EntryRow({ entry, position, expanded, onToggle }: EntryRowProps) {
  const playerName = useStore((s) => s.playerName);
  const adminPin = useStore((s) => s.adminPin);
  const isAdmin = adminPin != null;
  const [hpDelta, setHpDelta] = useState("");
  const [details, setDetails] = useState<CreatureDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const hasHp = entry.hp != null && entry.maxHp != null;
  const status = hasHp ? hpStatus(entry.hp!, entry.maxHp!) : null;
  const dead = hasHp && entry.hp! <= 0;
  const isOwnRow =
    !entry.isCreature && playerName != null && entry.name === playerName;
  const showActualHp = isAdmin || isOwnRow;

  // SRD details are GM information — only fetched (and shown) for admins.
  // GM-entered details (custom creatures) win over the Open5e lookup.
  useEffect(() => {
    if (!expanded || !isAdmin || !entry.isCreature) return;
    if (entry.details) {
      setDetails(entry.details);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    getCreatureDetails(entry.name)
      .then((d) => {
        if (!cancelled) setDetails(d);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, isAdmin, entry.isCreature, entry.name, entry.details]);

  async function applyHpChange(sign: 1 | -1) {
    const delta = parseInt(hpDelta, 10);
    if (isNaN(delta) || !hasHp || !adminPin) return;
    const newHp =
      sign === -1
        ? Math.max(0, entry.hp! - delta)
        : Math.min(entry.maxHp!, entry.hp! + delta);
    try {
      await updateInitiativeHp(adminPin, entry.id, newHp);
      setHpDelta("");
    } catch (err) {
      Alert.alert("Admin write rejected", String((err as Error).message));
    }
  }

  function remove() {
    if (!adminPin) return;
    removeInitiativeEntry(adminPin, entry.id).catch((err) =>
      Alert.alert("Admin write rejected", String((err as Error).message))
    );
  }

  const borderColor = dead
    ? colors.textFaint
    : entry.isCreature
    ? colors.orange
    : colors.green;

  const defenseLines: [string, string][] = details
    ? ([
        ["Vulnerable", details.vulnerabilities],
        ["Resistant", details.resistances],
        ["Immune", details.immunities],
        ["Cond. immune", details.conditionImmunities],
      ] as [string, string][]).filter(([, v]) => v !== "")
    : [];

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: entry.isCreature ? colors.card : colors.cardPlayer,
          borderLeftColor: borderColor,
          opacity: dead ? 0.5 : 1,
        },
      ]}
    >
      <Pressable onPress={isAdmin ? onToggle : undefined} style={styles.mainLine}>
        <Text style={styles.position}>{position}</Text>
        <Text style={styles.initiative}>{entry.initiative}</Text>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.name}
            {!entry.isCreature && <Text style={styles.playerTag}>  PLAYER</Text>}
          </Text>
          {isAdmin && (entry.isCreature ? (
            <Text style={styles.statLine}>
              CR {formatCr(entry.cr ?? 0)} · AC {entry.ac ?? "?"}
            </Text>
          ) : entry.ac != null ? (
            <Text style={styles.statLine}>AC {entry.ac}</Text>
          ) : null)}
        </View>
        {hasHp && (
          <Text style={[styles.hp, { color: status!.color }]}>
            {showActualHp ? `${entry.hp}/${entry.maxHp} HP` : status!.label}
          </Text>
        )}
        {isAdmin && (
          <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
        )}
      </Pressable>

      {isAdmin && expanded && (
        <View style={styles.expanded}>
          {hasHp && !dead && (
            <View style={styles.hpControls}>
              <TextInput
                value={hpDelta}
                onChangeText={setHpDelta}
                placeholder="Amount"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                style={styles.hpInput}
                {...focusableProps}
              />
              <Pressable
                onPress={() => applyHpChange(-1)}
                disabled={hpDelta === ""}
                style={[styles.hpButton, { backgroundColor: colors.red }]}
              >
                <Text style={styles.hpButtonTextLight}>Damage</Text>
              </Pressable>
              <Pressable
                onPress={() => applyHpChange(1)}
                disabled={hpDelta === ""}
                style={[styles.hpButton, { backgroundColor: colors.green }]}
              >
                <Text style={styles.hpButtonTextDark}>Heal</Text>
              </Pressable>
            </View>
          )}

          {entry.isCreature && loadingDetails && (
            <ActivityIndicator size="small" color={colors.textMuted} />
          )}

          {entry.isCreature && !loadingDetails && details && (
            <View style={styles.details}>
              {details.attacks.length > 0 && (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailHeading}>ATTACKS</Text>
                  {details.attacks.map((a) => (
                    <Text key={a.name} style={styles.attackLine}>
                      <Text style={styles.attackName}>{a.name}</Text>
                      {a.toHit != null && (
                        <Text style={styles.attackToHit}>
                          {"  "}{a.toHit >= 0 ? `+${a.toHit}` : a.toHit} to hit
                        </Text>
                      )}
                      {a.damage && (
                        <Text style={styles.attackDamage}>
                          {"  "}{a.damage}
                        </Text>
                      )}
                    </Text>
                  ))}
                </View>
              )}
              {defenseLines.length > 0 && (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailHeading}>DEFENSES</Text>
                  {defenseLines.map(([label, value]) => (
                    <Text key={label} style={styles.defenseLine}>
                      <Text style={styles.defenseLabel}>{label}: </Text>
                      {value}
                    </Text>
                  ))}
                </View>
              )}
              {details.attacks.length === 0 && defenseLines.length === 0 && (
                <Text style={styles.noData}>No attack/defense data.</Text>
              )}
            </View>
          )}

          {entry.isCreature && !loadingDetails && details === null && (
            <Text style={styles.noData}>No SRD data (custom creature).</Text>
          )}

          <Pressable onPress={remove} style={styles.removeButton}>
            <Text style={styles.removeButtonText}>Remove from tracker</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 6,
    borderLeftWidth: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  mainLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  position: {
    width: 20,
    textAlign: "center",
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: "700",
  },
  initiative: {
    width: 32,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: colors.gold,
  },
  nameBlock: { flex: 1 },
  name: { color: colors.text, fontWeight: "600", fontSize: 14 },
  playerTag: { color: colors.green, fontSize: 9, fontWeight: "700" },
  statLine: { color: colors.textMuted, fontSize: 11 },
  hp: { fontSize: 12, fontWeight: "600" },
  chevron: { color: colors.textFaint, fontSize: 12, paddingHorizontal: 2 },
  expanded: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  hpControls: { flexDirection: "row", gap: 6, alignItems: "center" },
  hpInput: {
    width: 70,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: colors.text,
    fontSize: 12,
  },
  hpButton: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  hpButtonTextLight: { color: "#fff", fontSize: 11, fontWeight: "600" },
  hpButtonTextDark: { color: "#000", fontSize: 11, fontWeight: "600" },
  details: { gap: 8 },
  detailBlock: { gap: 2 },
  detailHeading: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  attackLine: { fontSize: 12, color: colors.text },
  attackName: { fontWeight: "700", color: colors.text },
  attackToHit: { color: colors.gold, fontWeight: "600" },
  attackDamage: { color: colors.red, fontWeight: "600" },
  defenseLine: { fontSize: 12, color: colors.text },
  defenseLabel: { color: colors.textMuted, fontWeight: "600" },
  noData: { color: colors.textFaint, fontSize: 12 },
  removeButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.redDark,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  removeButtonText: { color: colors.red, fontSize: 11, fontWeight: "600" },
});
