import type { FireworkType } from '../lib/types'

const DESCRIPTIONS: Record<FireworkType, string> = {
  mortars: 'Aerial shells that burst high into big spheres of stars and trails.',
  comets: 'Bright heads streaking skyward with long sparkling tails.',
  parachutes: 'A shell that deploys glowing parachutes drifting slowly down.',
  fountain: 'Ground effect spraying a steady shower of sparks upward.',
  other: 'Something else — tell us what you have in mind!',
  buyers_choice: "Leave it to the buyer — they'll pick something great for the show.",
}

export function FireworkPreview({ type }: { type: FireworkType }) {
  return (
    <div className="firework-preview">
      <svg viewBox="0 0 200 130" role="img" aria-label={`${type} firework illustration`}>
        <rect width="200" height="130" rx="10" fill="#0a0b16" />
        {/* faint stars */}
        <circle cx="20" cy="18" r="1" fill="#3d4066" />
        <circle cx="176" cy="26" r="1" fill="#3d4066" />
        <circle cx="150" cy="10" r="1" fill="#3d4066" />
        <circle cx="38" cy="106" r="1" fill="#3d4066" />
        <circle cx="182" cy="102" r="1" fill="#3d4066" />
        {ART[type]}
      </svg>
      <p className="muted">{DESCRIPTIONS[type]}</p>
    </div>
  )
}

const gold = '#ffd76e'
const orange = '#ff9d47'
const red = '#ff5d73'
const teal = '#5de3d8'
const violet = '#c084fc'
const white = '#fff6e0'

const ART: Record<FireworkType, React.ReactNode> = {
  mortars: (
    <g>
      <circle cx="100" cy="60" r="3" fill={white} />
      <g stroke={red} strokeWidth="2" fill="none" strokeLinecap="round">
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * Math.PI * 2) / 16
          const x2 = 100 + Math.cos(a) * 42
          const y2 = 60 + Math.sin(a) * 42
          return <line key={i} x1={100} y1={60} x2={x2} y2={y2} />
        })}
      </g>
      <g fill={violet}>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * Math.PI * 2) / 16
          const x = 100 + Math.cos(a) * 48
          const y = 60 + Math.sin(a) * 48
          return <circle key={i} cx={x} cy={y} r="2.4" />
        })}
      </g>
    </g>
  ),

  comets: (
    <g>
      <g stroke={gold} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M48 108 Q88 74 132 36" />
      </g>
      <g stroke={orange} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7">
        <path d="M56 112 Q92 82 128 48" />
        <path d="M44 100 Q84 66 124 30" />
      </g>
      <circle cx="136" cy="32" r="6" fill={white} />
      <circle cx="136" cy="32" r="10" fill={gold} opacity="0.35" />
      <g fill={gold}>
        <circle cx="70" cy="92" r="1.6" />
        <circle cx="90" cy="76" r="1.6" />
        <circle cx="108" cy="60" r="1.6" />
        <circle cx="84" cy="94" r="1.3" />
        <circle cx="102" cy="78" r="1.3" />
      </g>
    </g>
  ),

  parachutes: (
    <g>
      {[
        { x: 66, y: 44, c: red },
        { x: 104, y: 30, c: teal },
        { x: 140, y: 50, c: gold },
      ].map((p, i) => (
        <g key={i}>
          <path d={`M${p.x - 14} ${p.y} Q${p.x} ${p.y - 16} ${p.x + 14} ${p.y}`} fill="none" stroke={p.c} strokeWidth="2" />
          <path d={`M${p.x - 14} ${p.y} Q${p.x} ${p.y + 4} ${p.x + 14} ${p.y}`} fill="none" stroke={p.c} strokeWidth="1.2" opacity="0.6" />
          <line x1={p.x - 12} y1={p.y + 1} x2={p.x} y2={p.y + 20} stroke="#4a4d7a" strokeWidth="1" />
          <line x1={p.x + 12} y1={p.y + 1} x2={p.x} y2={p.y + 20} stroke="#4a4d7a" strokeWidth="1" />
          <circle cx={p.x} cy={p.y + 22} r="3" fill={white} />
        </g>
      ))}
    </g>
  ),

  fountain: (
    <g>
      <polygon points="92,110 108,110 104,88 96,88" fill="#8a5a2b" />
      <g stroke={gold} strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M100 88 Q100 48 100 38" />
        <path d="M100 88 Q88 52 74 44" />
        <path d="M100 88 Q112 52 126 44" />
        <path d="M100 88 Q80 60 60 58" />
        <path d="M100 88 Q120 60 140 58" />
      </g>
      <g fill={orange}>
        <circle cx="100" cy="34" r="2.5" />
        <circle cx="72" cy="41" r="2" />
        <circle cx="128" cy="41" r="2" />
        <circle cx="57" cy="57" r="2" />
        <circle cx="143" cy="57" r="2" />
        <circle cx="88" cy="48" r="1.5" />
        <circle cx="112" cy="48" r="1.5" />
      </g>
    </g>
  ),

  other: (
    <g>
      <text x="100" y="82" textAnchor="middle" fontSize="56" fontWeight="bold" fill={violet}>
        ?
      </text>
      <g stroke={gold} strokeWidth="2" strokeLinecap="round">
        <line x1="56" y1="34" x2="56" y2="46" />
        <line x1="50" y1="40" x2="62" y2="40" />
        <line x1="148" y1="28" x2="148" y2="40" />
        <line x1="142" y1="34" x2="154" y2="34" />
        <line x1="152" y1="86" x2="152" y2="94" />
        <line x1="148" y1="90" x2="156" y2="90" />
      </g>
    </g>
  ),

  buyers_choice: (
    <g>
      {/* a trio of different mini fireworks — the buyer picks */}
      <g stroke={gold} strokeWidth="1.6" strokeLinecap="round" fill="none">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI * 2) / 8
          return <line key={i} x1={58} y1={44} x2={58 + Math.cos(a) * 16} y2={44 + Math.sin(a) * 16} />
        })}
      </g>
      <circle cx="58" cy="44" r="2" fill={white} />
      <g stroke={teal} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M142 38 Q142 54 142 66" />
        <path d="M142 38 Q130 48 126 62" />
        <path d="M142 38 Q154 48 158 62" />
      </g>
      <circle cx="142" cy="38" r="2" fill={white} />
      <polygon points="96,104 110,104 106,88 100,88" fill="#8a5a2b" />
      <g stroke={red} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M103 88 Q103 70 103 62" />
        <path d="M103 88 Q94 72 88 66" />
        <path d="M103 88 Q112 72 118 66" />
      </g>
      <text x="100" y="30" textAnchor="middle" fontSize="13" fill={violet} fontWeight="600">
        buyer picks!
      </text>
    </g>
  ),
}
