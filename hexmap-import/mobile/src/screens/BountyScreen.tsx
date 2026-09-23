// Port of web BountyBoard — Open5e creature bounty table + static rules.
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors } from "../theme";

interface BountyRow {
  key: string;
  name: string;
  size: string;
  bounty: string;
  copperValue: number;
}

const SIZE_ORDER = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

interface V2Creature {
  key: string;
  name: string;
  size: { key: string; name: string };
  type: { key: string; name: string };
  experience_points: number;
}

let bountyCache: BountyRow[] | null = null;

function formatBounty(xp: number): { label: string; copper: number } {
  const copper = Math.max(1, Math.round((xp / 10) * 100));
  if (copper >= 100) return { label: `${Math.round(copper / 100)} gp`, copper };
  if (copper >= 10) {
    const sp = Math.round(copper / 10);
    return { label: sp >= 10 ? "1 gp" : `${sp} sp`, copper };
  }
  return { label: `${copper} cp`, copper };
}

async function fetchBounties(): Promise<BountyRow[]> {
  if (bountyCache) return bountyCache;
  const rows: BountyRow[] = [];
  const seen = new Set<string>();
  let url: string | null =
    "https://api.open5e.com/v2/creatures/?format=json&limit=100" +
    "&document__key=srd-2024&fields=key,name,size,type,experience_points";
  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as {
      next: string | null;
      results: V2Creature[];
    };
    for (const c of data.results) {
      if (c.type?.key === "undead" || c.type?.key === "humanoid") continue;
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      const { label, copper } = formatBounty(c.experience_points ?? 0);
      rows.push({
        key: c.key,
        name: c.name,
        size: c.size?.name ?? "",
        bounty: label,
        copperValue: copper,
      });
    }
    url = data.next;
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  bountyCache = rows;
  return rows;
}

type SortKey = "name" | "size" | "bounty";

interface BountyScreenProps {
  onBack: () => void;
}

export function BountyScreen({ onBack }: BountyScreenProps) {
  const [rows, setRows] = useState<BountyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bounty");
  const [asc, setAsc] = useState(true);

  useEffect(() => {
    fetchBounties()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q))
      : [...rows];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "size")
        cmp = SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size);
      else cmp = a.copperValue - b.copperValue;
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return asc ? cmp : -cmp;
    });
    return list;
  }, [rows, search, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  function sortHeader(label: string, key: SortKey, flex: number) {
    const active = sortKey === key;
    return (
      <Pressable onPress={() => toggleSort(key)} style={{ flex }}>
        <Text style={[styles.th, active && styles.thActive]}>
          {label}
          {active ? (asc ? " ▲" : " ▼") : ""}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Bounty Board" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.paragraph}>
          The Guild pays bounties on dangerous creatures. Bring proof of the
          kill to the assessor to collect. Bounty is paid per creature slain.
        </Text>

        <Text style={styles.sectionTitle}>Proof Requirements</Text>
        <View style={styles.proofTable}>
          {[
            ["Tiny / Small", "Full body"],
            ["Medium", "Head, or equivalent remains"],
            ["Large+", "Head; assessor may accept partial proof"],
          ].map(([size, proof]) => (
            <View key={size} style={styles.proofRow}>
              <Text style={styles.proofSize}>{size}</Text>
              <Text style={styles.proofText}>{proof}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Undead</Text>
        <Text style={styles.paragraph}>
          Undead carry no bounty — destroying them is its own reward, and the
          Guild does not traffic in necrotic remains. If you clear an
          infestation: 1) report the location, 2) describe what you destroyed,
          3) the Guild will assess a stipend based on the threat.
        </Text>

        <Text style={styles.sectionTitle}>Rules</Text>
        <Text style={styles.paragraph}>
          No double-dipping — each kill pays once. Fraudulent claims mean a
          permanent ban from the bounty program. Unknown creatures: bring the
          head and the assessor will price it.
        </Text>

        <Text style={styles.sectionTitle}>Current Bounties</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search creatures..."
          placeholderTextColor={colors.textFaint}
          style={styles.search}
        />
        <Text style={styles.countLine}>
          {filtered.length} of {rows.length} creatures
        </Text>

        <View style={styles.tableHeader}>
          {sortHeader("Creature", "name", 3)}
          {sortHeader("Size", "size", 2)}
          {sortHeader("Bounty", "bounty", 1.5)}
        </View>

        {loading ? (
          <Text style={styles.loading}>Consulting the ledger...</Text>
        ) : (
          filtered.map((r) => (
            <View key={r.key} style={styles.tr}>
              <Text style={[styles.td, { flex: 3 }]}>{r.name}</Text>
              <Text style={[styles.tdMuted, { flex: 2 }]}>{r.size}</Text>
              <Text style={[styles.tdGold, { flex: 1.5 }]}>{r.bounty}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  paragraph: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6,
  },
  proofTable: { marginBottom: 12, gap: 4 },
  proofRow: { flexDirection: "row", gap: 8 },
  proofSize: { width: 100, color: colors.gold, fontSize: 13, fontWeight: "600" },
  proofText: { flex: 1, color: colors.textMuted, fontSize: 13 },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  countLine: { color: colors.textFaint, fontSize: 11, marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: { color: "#c084fc", fontSize: 12, fontWeight: "700" },
  thActive: { color: colors.text },
  tr: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    alignItems: "center",
  },
  td: { color: colors.text, fontSize: 13 },
  tdMuted: { color: colors.textMuted, fontSize: 13 },
  tdGold: { color: colors.gold, fontSize: 13, fontWeight: "600" },
  loading: { color: colors.textFaint, fontSize: 13, marginTop: 16 },
});
