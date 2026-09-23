import { useState } from 'react'
import { DCCalculator } from '../components/DCCalculator'

interface Section {
  id: string
  title: string
  body: React.ReactNode
}

const SECTIONS: Section[] = [
  {
    id: 'overview',
    title: 'Overview',
    body: (
      <>
        <p>
          Hexcraft RPG is a point-buy RPG with a unified d20 resolution.
          One player runs the world (the <em>GM</em>); everyone else plays a
          single character. The GM describes situations and adjudicates rolls;
          players describe what their characters do and roll when the GM asks
          for a check.
        </p>
        <p className="mt-2">
          There are no levels — every improvement is a BP (Build Point)
          purchase. The same currency buys attributes, skills, HP, EP, magic
          training, and even movement speed. As the campaign progresses, the
          GM hands out <em>bonus BP</em> for milestones or surviving sessions,
          and players spend them on whatever they want to grow next.
        </p>
      </>
    ),
  },
  {
    id: 'starting',
    title: 'Starting a character',
    body: (
      <>
        <p>
          Pick a <strong>power tier</strong> together as a table. The tier sets
          everyone&apos;s base BP budget, from{' '}
          <em>Peasants</em>&nbsp;(150&nbsp;BP) up through{' '}
          <em>World Savior</em>&nbsp;(2000&nbsp;BP). A first campaign typically
          starts at <em>New&nbsp;Adventurers</em>&nbsp;(400&nbsp;BP) or{' '}
          <em>Guild&nbsp;Regulars</em>&nbsp;(550&nbsp;BP). Players spend the
          budget across:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>5 attributes (Power, Agility, Intelligence, Sense, Influence)</li>
          <li>HP (2 BP per 3 HP) and EP (2 BP per 1 EP)</li>
          <li>Movement speed (default 20 ft, ±5 ft per step)</li>
          <li>Skills, weapon proficiencies, and the three saves (Dodge, Grit, Resolve)</li>
          <li>Magic schools and mediums, if magical</li>
        </ul>
        <p className="mt-2">
          <strong>Tethers</strong> and <strong>flaws</strong> refund BP up front
          in exchange for narrative hooks and mechanical drawbacks. A character
          with a few well-chosen flaws can punch significantly above their
          tier — at the cost of those flaws actually mattering at the table.
        </p>
        <Example label="Example">
          <p>
            Mira is a <em>New Adventurers</em> ranger (400 BP). She takes{' '}
            <em>Hunted by the Black Sigil</em> (Major tether, +15&nbsp;BP) and{' '}
            <em>Trust no priest</em> (Flaw, +15&nbsp;BP), giving her 430&nbsp;BP
            to spend. She buys Agility&nbsp;+3 (68&nbsp;BP),
            Power&nbsp;+1 (13&nbsp;BP), Sense&nbsp;+2 (34&nbsp;BP),
            18&nbsp;HP (12&nbsp;BP), 10&nbsp;EP (20&nbsp;BP), and the rest
            into skills, weapons, and a saved spell.
          </p>
        </Example>
      </>
    ),
  },
  {
    id: 'the-roll',
    title: 'Making a roll',
    body: (
      <>
        <p>
          Almost every check is the same shape:
        </p>
        <blockquote className="my-2 border-l-2 border-amber-500 pl-3 text-zinc-200 font-mono text-sm">
          d20 + relevant attribute + relevant skill vs DC
        </blockquote>
        <p>
          The GM picks the attribute and skill (or save) that fits the action.
          DC is set by the GM, or by an opposing roll when one creature pushes
          against another.
        </p>
        <p className="mt-2">
          Standard DCs:{' '}
          <strong className="text-amber-300">Easy</strong>{' '}
          <span className="font-mono">12</span>,{' '}
          <strong className="text-amber-300">Medium</strong>{' '}
          <span className="font-mono">20</span>,{' '}
          <strong className="text-amber-300">Hard</strong>{' '}
          <span className="font-mono">30</span>,{' '}
          <strong className="text-amber-300">Near-impossible</strong>{' '}
          <span className="font-mono">40</span>.
        </p>
        <p className="mt-2">
          Then adjust by the <strong>correlation</strong> between the task and
          whichever skill the player invokes — pick one:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>
            <strong>Negative</strong> — DC&nbsp;
            <span className="font-mono">+ 10</span>. The invoked skill actively
            misleads — its training points the wrong direction.
          </li>
          <li>
            <strong>None</strong> — DC unchanged. They attempt the task
            without leaning on any skill.
          </li>
          <li>
            <strong>Relevant</strong> — DC&nbsp;
            <span className="font-mono">× 0.90</span>. A broad skill that
            touches the domain.
          </li>
          <li>
            <strong>Adjacent</strong> — DC&nbsp;
            <span className="font-mono">× 0.75</span>. A skill in the same
            neighborhood as the task.
          </li>
          <li>
            <strong>Exact</strong> — DC&nbsp;
            <span className="font-mono">× 0.60</span>. The skill is precisely
            tuned to what they&apos;re doing.
          </li>
        </ul>
        <p className="mt-2 text-zinc-400 text-sm">
          Round multipliers down to the nearest whole number. The{' '}
          <strong className="text-amber-300">DC Calculator</strong> at the top
          of this page does the arithmetic.
        </p>
        <Example label="Worked example">
          <p>
            A player wants to build a sniper rifle — a Hard task,
            DC&nbsp;<span className="font-mono">30</span>. The final DC depends
            on which skill they invoke:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>Cooking</strong> — Negative. DC&nbsp;30&nbsp;+&nbsp;10 ={' '}
              <span className="font-mono">40</span>.
            </li>
            <li>
              <strong>No skill</strong> — None. DC stays at{' '}
              <span className="font-mono">30</span>.
            </li>
            <li>
              <strong>Firearms knowledge</strong> — Relevant, −10%. DC{' '}
              <span className="font-mono">27</span>.
            </li>
            <li>
              <strong>Firearms manufacturing</strong> — Adjacent, −25%. DC{' '}
              <span className="font-mono">22</span>.
            </li>
            <li>
              <strong>Long-range rifle manufacturing</strong> — Exact, −40%. DC{' '}
              <span className="font-mono">18</span>.
            </li>
          </ul>
        </Example>
        <p className="mt-4">
          <strong>Natural 20</strong> adds{' '}
          <span className="font-mono">+10</span> to the total. <strong>Natural 1</strong>{' '}
          subtracts <span className="font-mono">10</span>. Neither is an
          automatic result — they shift the total, and the DC still decides
          whether the action lands.
        </p>
        <p className="mt-2">
          <strong>Critical success:</strong> the final total beats the DC by{' '}
          <span className="font-mono">10</span> or more, in combat or out. The
          action lands exceptionally — narrate accordingly, or treat it as a
          critical hit on an attack roll.
        </p>
        <p className="mt-2">
          <strong>Critical failure:</strong> the final total is less than{' '}
          <span className="font-mono">25%</span> of the DC. The action goes
          badly wrong — a weapon slips, a spell backfires, the lockpick snaps
          off in the lock.
        </p>
      </>
    ),
  },
  {
    id: 'saves',
    title: 'Saving throws',
    body: (
      <>
        <p>
          There are exactly three saves:
        </p>
        <ul className="mt-2 space-y-1">
          <li>
            <strong className="text-amber-300">Dodge</strong> — leaping out of
            the way, avoiding traps, weaving through gunfire. Pairs naturally
            with Agility.
          </li>
          <li>
            <strong className="text-amber-300">Grit</strong> — shaking off
            poison, withstanding a knockdown, gritting your teeth through fear
            of pain. Pairs naturally with Power.
          </li>
          <li>
            <strong className="text-amber-300">Resolve</strong> — resisting
            charm, mental intrusion, illusions, fear. Pairs naturally with
            Influence or Sense.
          </li>
        </ul>
        <p className="mt-2">
          When something threatens a character with an effect they could
          plausibly fight off, the GM names the save and the DC. The player
          rolls <span className="font-mono">d20 + the save&apos;s skill level</span>{' '}
          (optionally adding an attribute if it fits the fiction).
        </p>
        <Example label="Example">
          <p>
            A spider mage casts a charm spell at Mira (school 3, medium 3 →
            Resolve DC <span className="font-mono">16</span>). Mira has Resolve
            skill level 2. She rolls d20 + 2, gets a 17. She resists.
          </p>
        </Example>
      </>
    ),
  },
  {
    id: 'attacks',
    title: 'Attacks & evasion',
    body: (
      <>
        <p>
          Attackers roll <span className="font-mono">d20 + weapon skill +
          attribute</span>{' '}
          versus the defender&apos;s <strong>Evasion</strong>{' '}
          (<span className="font-mono">10 + Agility + Dodge − armor worn</span>).
          A hit lets the attacker roll damage.
        </p>
        <p className="mt-2">
          The weapon&apos;s damage and types come from the inventory entry
          (e.g. a shortsword: 1d6 Physical). The GM may add or change damage
          types for the situation — torches deal Fire, a thunder-rune mace
          could deal Physical and Sonic.
        </p>
        <Example label="Example">
          <p>
            A bandit with Melee-1H&nbsp;skill +3 and Power +2 swings a sword
            at Mira (Evasion 14). The bandit rolls{' '}
            <span className="font-mono">d20 + 5</span>, gets a 13&nbsp;+5 =
            18 — a hit. Damage is 1d6+2 Physical.
          </p>
        </Example>
      </>
    ),
  },
  {
    id: 'damage',
    title: 'Taking damage & armor',
    body: (
      <>
        <p>
          Damage is always typed. When a character takes damage:
        </p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>
            Find each piece of equipped armor whose{' '}
            <em>reduction types</em> include the incoming damage type.
          </li>
          <li>
            Roll each matching armor&apos;s reduction die (1d4 / 1d6 / 1d8) and
            sum the results. Players are expected to roll physical dice; the
            sheet has a <strong>Take damage</strong> panel where they type in
            the total reduction they rolled.
          </li>
          <li>
            Subtract the reduction from the incoming damage. The remainder is
            applied to current HP.
          </li>
          <li>
            For each matching armor, if the <em>incoming</em> damage was
            greater than that armor&apos;s damage threshold, the armor loses{' '}
            <span className="font-mono">floor(damage / threshold)</span>{' '}
            durability. Armor that reaches 0 durability breaks and is
            auto-unequipped.
          </li>
        </ol>
        <Example label="Example">
          <p>
            Mira is wearing a hardened leather coat (1d6 Physical, threshold
            10, durability 12). A bandit hits her for 23 Physical. She rolls
            1d6, gets 4. Net damage: 23 − 4 = 19 to HP. Because 23 &gt; 10,
            the coat loses floor(23 / 10) = 2 durability (now 10).
          </p>
        </Example>
        <p className="mt-2 text-zinc-400 text-sm">
          Damage types not covered by any equipped armor pass through
          completely — design encounters knowing that a fully steel-clad
          fighter is still vulnerable to fire, cold, and psychic effects.
        </p>
      </>
    ),
  },
  {
    id: 'magic',
    title: 'Spellcasting',
    body: (
      <>
        <p>
          A spell needs a <strong>school</strong> (what it does — Destroy,
          Create, Restore, etc.) and a <strong>medium</strong> (what it acts
          on — Elemental, Cognition, Space, etc.). Both must be trained.
        </p>
        <p className="mt-2">
          The caster builds the spell on the fly: pick range, AOE, duration,
          buffs/debuffs, challenge, damage dice, and casting time. Each
          contributes EP to the total cost.
        </p>
        <p className="mt-2">
          Once the spell is built, the caster marks how it&apos;s resolved:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>
            <strong>Roll to hit</strong> — the caster rolls{' '}
            <span className="font-mono">d20 + school + medium</span> vs the
            target&apos;s Evasion.
          </li>
          <li>
            <strong>Dodge / Grit / Resolve save</strong> — the target rolls
            against a DC of{' '}
            <span className="font-mono">10 + school + medium</span>.
          </li>
        </ul>
        <p className="mt-2">
          Casters can <strong>amp</strong> a spell on the fly: every extra 5
          EP spent at cast time raises the hit bonus <em>or</em> the save DC
          by 1. Useful for clutch shots.
        </p>
        <p className="mt-2">
          Casters can also <strong>save</strong> (prepare) a number of spells
          per school equal to their school level. Saved spells cost 25% less
          to cast — they&apos;re tuned and ready in the caster&apos;s head.
        </p>
        <Example label="Example">
          <p>
            Devon (Destroy 3, Elemental 3) prepares <em>Cinder Lance</em> — a
            single-target, 120 ft fireball doing 4d6, resolved as a hit roll.
            Base cost 30 EP; saved cost 23 EP. His hit bonus on this spell is
            <span className="font-mono"> +6</span>. He could pay 28 EP to push
            it to +7 if he really needs the hit.
          </p>
        </Example>
      </>
    ),
  },
  {
    id: 'progression',
    title: 'Awarding BP and progression',
    body: (
      <>
        <p>
          The GM hands out <strong>bonus BP</strong> at meaningful moments:
          surviving a session, completing a quest beat, learning a new truth.
          A typical pace is <strong>5–25&nbsp;BP per session</strong> —
          enough that characters scale visibly over a campaign, but not so
          much that a single session is a power spike. Even 25&nbsp;BP in one
          night won&apos;t fundamentally change what a character can do; it
          buys a small skill bump or a single attribute step.
        </p>
        <p className="mt-2">
          Players open the Builder, navigate to the <em>BP Management</em>{' '}
          step, and click <strong>+ Add</strong> with the awarded amount. The
          screen tracks <em>remaining BP</em> (unspent), not cumulative total
          — the same number they see on the BP bar at the top of the page.
          They can then spend that BP throughout the build to raise stats and
          buy new toys.
        </p>
        <p className="mt-2">
          Power tier stays locked after creation. To grow a character, hand
          out BP — never raise the tier mid-campaign.
        </p>
      </>
    ),
  },
  {
    id: 'tethers',
    title: 'Tethers, flaws, and obligations',
    body: (
      <>
        <p>
          <strong>Tethers</strong> are the relationships and duties that pull
          a character through the world: a sworn oath, a child to protect, a
          rival cult that wants them dead. They&apos;re worth +5 / +15 / +40
          BP depending on weight (Minor, Major, Binding). Each tether also
          carries an <em>obligation weight</em> equal to its tier — the
          character must have at least the GM-set threshold of weight, so
          they can&apos;t take a single Minor tether and call it a day.
        </p>
        <p className="mt-2">
          <strong>Flaws</strong> are personal failings: physical, mental, or
          social. They refund +5 / +15 / +40 BP (Quirk / Flaw / Vice). Unlike
          tethers, they have no obligation weight — but the GM should still
          push back on a character who took <em>Vicious Drunk</em> at
          creation and never actually drinks.
        </p>
        <p className="mt-2">
          When a tether or flaw forces a real cost on the player — they lose
          time, money, allies, or HP because of it — that&apos;s the contract
          working. Use them. Reference them. If they never bite, the BP
          refund was unearned.
        </p>
      </>
    ),
  },
  {
    id: 'gm-tips',
    title: 'GM tips',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Call for the right save.</strong> Cognitive trap? Resolve.
            Wall of flame collapsing on the party? Dodge. Marathon climb up an
            icy cliff? Grit. Lean into the three-save structure rather than
            inventing new mechanics.
          </li>
          <li>
            <strong>Embrace asymmetric damage types.</strong> Mortals tend to
            armor up against Physical and Fire. Build the occasional foe that
            deals Psychic, Acid, or Force — let the leather-and-steel hero
            squirm.
          </li>
          <li>
            <strong>Track armor durability.</strong> When armor breaks
            mid-combat, the stakes spike. The sheet does the math for you;
            just enforce that the player notices when their plate snaps.
          </li>
          <li>
            <strong>Reward smart spell building.</strong> A caster who pays an
            extra 5 EP for +1 DC is reading their odds. Engage with it: tell
            them the save was at +0, they&apos;re glad they amped.
          </li>
          <li>
            <strong>Pace BP awards steadily.</strong> 5–25&nbsp;BP per session
            is the norm. A quest beat or a hard-won fight might justify the
            high end; a quiet downtime session sits at the low end. The point
            is that no single session feels like a level-up — a new skill
            rank or attribute step is earned across multiple sessions, not
            banked in one.
          </li>
        </ul>
      </>
    ),
  },
]

export function RunningTheGame() {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(SECTIONS.map((s) => s.id)),
  )
  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allOpen = open.size === SECTIONS.length
  const toggleAll = () =>
    setOpen(allOpen ? new Set() : new Set(SECTIONS.map((s) => s.id)))

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">
            Running the game
          </h2>
          <p className="text-sm text-zinc-500">
            A short guide to GMing this system, with examples. Skim it at the
            table — every section stands on its own.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <DCCalculator />

      <nav className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={() =>
                  setOpen((cur) => new Set(cur).add(s.id))
                }
                className="text-amber-300 hover:text-amber-200"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {SECTIONS.map((s) => {
        const isOpen = open.has(s.id)
        return (
          <section
            key={s.id}
            id={s.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 scroll-mt-20"
          >
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              <h3 className="text-base font-medium text-zinc-100">
                {s.title}
              </h3>
              <span className="text-zinc-500 text-xs font-mono">
                {isOpen ? '▾' : '▸'}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-zinc-300 leading-relaxed">
                {s.body}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function Example({
  label = 'Example',
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-2 rounded border border-amber-700/40 bg-amber-900/10 px-3 py-2 text-sm text-amber-100">
      <span className="text-[10px] uppercase tracking-wider text-amber-300/70 mr-2">
        {label}
      </span>
      {children}
    </div>
  )
}
