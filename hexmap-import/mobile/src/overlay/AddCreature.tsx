// Port of web InitiativeTracker.tsx admin add-creature form: Open5e SRD
// search or custom entry, with count>1 producing numbered copies.
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { formatCr } from "../data/hpStatus";
import { addInitiativeEntry } from "../data/initiative";
import { searchCreatures } from "../data/open5e";
import { colors } from "../theme";
import type { AttackInfo, CreatureDetails, CreatureSearchResult } from "../types";
import { focusableProps } from "./focusable";

interface AttackDraft {
  name: string;
  toHit: string;
  damage: string;
}

export function AddCreature() {
  const [manualMode, setManualMode] = useState(false);
  const [creatureName, setCreatureName] = useState("");
  const [creatureInit, setCreatureInit] = useState("");
  const [creatureHp, setCreatureHp] = useState("");
  const [creatureAc, setCreatureAc] = useState("");
  const [creatureCr, setCreatureCr] = useState("");
  const [creatureCount, setCreatureCount] = useState("1");
  const [addingCreature, setAddingCreature] = useState(false);

  // Optional custom-creature details (attacks + defenses)
  const [showDetails, setShowDetails] = useState(false);
  const [attackDrafts, setAttackDrafts] = useState<AttackDraft[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState("");
  const [resistances, setResistances] = useState("");
  const [immunities, setImmunities] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CreatureSearchResult[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [selectedCreature, setSelectedCreature] =
    useState<CreatureSearchResult | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (manualMode || selectedCreature || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const results = await searchCreatures(q);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, manualMode, selectedCreature]);

  async function handleAddCreature() {
    const init = parseInt(creatureInit, 10);
    if (isNaN(init)) return;
    const count = Math.max(1, parseInt(creatureCount, 10) || 1);

    let name: string;
    let stats: { hp?: number; ac?: number; cr?: number } | undefined;

    if (selectedCreature) {
      name = selectedCreature.name;
      stats = {
        hp: selectedCreature.hitPoints,
        ac: selectedCreature.armorClass,
        cr: selectedCreature.challengeRating,
      };
    } else {
      name = creatureName.trim();
      if (!name) return;
      const hp = creatureHp.trim() === "" ? undefined : parseInt(creatureHp, 10);
      const ac = creatureAc.trim() === "" ? undefined : parseInt(creatureAc, 10);
      const cr = creatureCr.trim() === "" ? undefined : parseFloat(creatureCr);
      stats =
        hp !== undefined || ac !== undefined || cr !== undefined
          ? { hp, ac, cr }
          : undefined;
    }

    // GM-entered details for custom creatures (SRD creatures are looked up
    // live from Open5e instead).
    let details: CreatureDetails | null = null;
    if (manualMode) {
      const attacks: AttackInfo[] = attackDrafts
        .filter((a) => a.name.trim() !== "")
        .map((a) => ({
          name: a.name.trim(),
          toHit: a.toHit.trim() === "" ? null : parseInt(a.toHit, 10),
          damage: a.damage.trim() === "" ? null : a.damage.trim(),
          desc: "",
        }));
      if (
        attacks.length > 0 ||
        vulnerabilities.trim() !== "" ||
        resistances.trim() !== "" ||
        immunities.trim() !== ""
      ) {
        details = {
          attacks,
          vulnerabilities: vulnerabilities.trim(),
          resistances: resistances.trim(),
          immunities: immunities.trim(),
          conditionImmunities: "",
        };
      }
    }

    setAddingCreature(true);
    try {
      await Promise.all(
        Array.from({ length: count }, (_, i) => {
          const label = count > 1 ? `${name} ${i + 1}` : name;
          return addInitiativeEntry(label, init, true, stats, details);
        })
      );
      setCreatureName("");
      setCreatureInit("");
      setCreatureHp("");
      setCreatureAc("");
      setCreatureCr("");
      setCreatureCount("1");
      setSelectedCreature(null);
      setSearchQuery("");
      setSearchResults([]);
      setShowDetails(false);
      setAttackDrafts([]);
      setVulnerabilities("");
      setResistances("");
      setImmunities("");
    } catch (err) {
      Alert.alert("Add failed", String((err as Error).message));
    } finally {
      setAddingCreature(false);
    }
  }

  const addDisabled =
    addingCreature ||
    creatureInit.trim() === "" ||
    (manualMode && !creatureName.trim());

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>ADMIN: ADD CREATURE</Text>
        <Pressable
          onPress={() => {
            setManualMode((m) => !m);
            setSelectedCreature(null);
            setSearchQuery("");
            setSearchResults([]);
          }}
          style={styles.modeToggle}
        >
          <Text style={styles.modeToggleText}>
            {manualMode ? "Search SRD" : "Custom creature"}
          </Text>
        </Pressable>
      </View>

      {!manualMode && !selectedCreature && (
        <View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search SRD creatures (e.g. mastiff)"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            {...focusableProps}
          />
          {searching && <Text style={styles.hint}>searching...</Text>}
          {searchResults.length > 0 && (
            <ScrollView style={styles.results} nestedScrollEnabled>
              {searchResults.map((c) => (
                <Pressable
                  key={c.index}
                  onPress={() => {
                    setSelectedCreature(c);
                    setSearchResults([]);
                  }}
                  style={styles.resultRow}
                >
                  <Text style={styles.resultName}>{c.name}</Text>
                  <Text style={styles.resultStats}>
                    CR {formatCr(c.challengeRating)} · {c.hitPoints} HP · AC{" "}
                    {c.armorClass}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {!searching &&
            searchQuery.trim().length >= 2 &&
            searchResults.length === 0 && (
              <Text style={styles.hint}>
                No SRD matches. Try "Custom creature" for homebrew.
              </Text>
            )}
        </View>
      )}

      {!manualMode && selectedCreature && (
        <View style={styles.selected}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultName}>{selectedCreature.name}</Text>
            <Text style={styles.resultStats}>
              CR {formatCr(selectedCreature.challengeRating)} ·{" "}
              {selectedCreature.hitPoints} HP · AC {selectedCreature.armorClass}
            </Text>
          </View>
          <Pressable onPress={() => setSelectedCreature(null)} hitSlop={8}>
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        </View>
      )}

      {manualMode && (
        <View style={styles.manualGrid}>
          <TextInput
            value={creatureName}
            onChangeText={setCreatureName}
            placeholder="Name"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { flex: 2 }]}
            {...focusableProps}
          />
          <TextInput
            value={creatureHp}
            onChangeText={setCreatureHp}
            placeholder="HP"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1 }]}
            {...focusableProps}
          />
          <TextInput
            value={creatureAc}
            onChangeText={setCreatureAc}
            placeholder="AC"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1 }]}
            {...focusableProps}
          />
          <TextInput
            value={creatureCr}
            onChangeText={setCreatureCr}
            placeholder="CR"
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1 }]}
            {...focusableProps}
          />
        </View>
      )}

      {manualMode && (
        <View style={styles.detailsSection}>
          <Pressable onPress={() => setShowDetails((v) => !v)}>
            <Text style={styles.detailsToggle}>
              {showDetails ? "▾" : "▸"} Attacks & defenses (optional)
            </Text>
          </Pressable>

          {showDetails && (
            <View style={styles.detailsBody}>
              {attackDrafts.map((a, i) => (
                <View key={i} style={styles.attackRow}>
                  <TextInput
                    value={a.name}
                    onChangeText={(t) =>
                      setAttackDrafts((d) =>
                        d.map((x, j) => (j === i ? { ...x, name: t } : x))
                      )
                    }
                    placeholder="Attack name"
                    placeholderTextColor={colors.textFaint}
                    style={[styles.input, { flex: 2 }]}
                    {...focusableProps}
                  />
                  <TextInput
                    value={a.toHit}
                    onChangeText={(t) =>
                      setAttackDrafts((d) =>
                        d.map((x, j) => (j === i ? { ...x, toHit: t } : x))
                      )
                    }
                    placeholder="+hit"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                    style={[styles.input, { flex: 1 }]}
                    {...focusableProps}
                  />
                  <TextInput
                    value={a.damage}
                    onChangeText={(t) =>
                      setAttackDrafts((d) =>
                        d.map((x, j) => (j === i ? { ...x, damage: t } : x))
                      )
                    }
                    placeholder="1d6+2 fire"
                    placeholderTextColor={colors.textFaint}
                    style={[styles.input, { flex: 2 }]}
                    {...focusableProps}
                  />
                  <Pressable
                    onPress={() =>
                      setAttackDrafts((d) => d.filter((_, j) => j !== i))
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() =>
                  setAttackDrafts((d) => [
                    ...d,
                    { name: "", toHit: "", damage: "" },
                  ])
                }
                style={styles.addAttackButton}
              >
                <Text style={styles.addAttackText}>＋ Add attack</Text>
              </Pressable>

              <TextInput
                value={vulnerabilities}
                onChangeText={setVulnerabilities}
                placeholder="Vulnerabilities (e.g. fire, radiant)"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                {...focusableProps}
              />
              <TextInput
                value={resistances}
                onChangeText={setResistances}
                placeholder="Resistances"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                {...focusableProps}
              />
              <TextInput
                value={immunities}
                onChangeText={setImmunities}
                placeholder="Immunities"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                {...focusableProps}
              />
            </View>
          )}
        </View>
      )}

      {(selectedCreature || manualMode) && (
        <View style={styles.addRow}>
          <TextInput
            value={creatureInit}
            onChangeText={setCreatureInit}
            placeholder="Initiative"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1 }]}
            {...focusableProps}
          />
          <TextInput
            value={creatureCount}
            onChangeText={setCreatureCount}
            placeholder="Count"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1 }]}
            {...focusableProps}
          />
          <Pressable
            onPress={handleAddCreature}
            disabled={addDisabled}
            style={[
              styles.addButton,
              { backgroundColor: addDisabled ? colors.indigoDark : colors.indigo },
            ]}
          >
            <Text style={styles.addButtonText}>
              {addingCreature ? "Adding..." : "Add"}
            </Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.hint}>
        Count &gt; 1 adds numbered copies ("Mastiff 1", "Mastiff 2").
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  modeToggle: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  modeToggleText: { color: colors.textMuted, fontSize: 11 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    color: colors.text,
    fontSize: 13,
  },
  hint: { color: colors.textFaint, fontSize: 11, marginTop: 6 },
  results: {
    marginTop: 4,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    maxHeight: 180,
  },
  resultRow: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  resultName: { color: colors.text, fontWeight: "600", fontSize: 13 },
  resultStats: { color: colors.textMuted, fontSize: 11 },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.indigoDark,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  remove: { color: colors.textMuted, fontSize: 13, paddingHorizontal: 4 },
  manualGrid: { flexDirection: "row", gap: 6, marginBottom: 8 },
  detailsSection: { marginBottom: 8 },
  detailsToggle: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  detailsBody: { gap: 6, marginTop: 6 },
  attackRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  addAttackButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  addAttackText: { color: colors.purple, fontSize: 11, fontWeight: "600" },
  addRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  addButton: {
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
