import type { FireworkType } from '../lib/types'

const DESCRIPTIONS: Record<FireworkType, string> = {
  fountain: 'Ground effect spraying a steady shower of sparks upward.',
  willow: 'A burst with long golden trails that droop like willow branches.',
  chrysanthemum: 'A dense spherical burst of star points in every direction.',
  brocade: 'A giant crown of thick, glittering gold streamers.',
  candles: 'Roman candle — a tube firing a series of single colored shots.',
  batteries: 'A cake of many tubes firing rapid sequenced shots.',
  parachutes: 'A shell that deploys glowing parachutes drifting slowly down.',
  fish: 'A swarm of squiggly embers that swim away like fish.',
  other: 'Something else entirely — describe your dream firework!',
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

  willow: (
    <g>
      <circle cx="100" cy="42" r="3" fill={white} />
      <g stroke={gold} strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M100 42 Q100 70 100 100" />
        <path d="M100 42 Q78 52 68 92" />
        <path d="M100 42 Q122 52 132 92" />
        <path d="M100 42 Q58 50 42 78" />
        <path d="M100 42 Q142 50 158 78" />
        <path d="M100 42 Q86 60 82 98" />
        <path d="M100 42 Q114 60 118 98" />
      </g>
      <g fill={gold} opacity="0.9">
        <circle cx="100" cy="102" r="1.8" />
        <circle cx="68" cy="94" r="1.8" />
        <circle cx="132" cy="94" r="1.8" />
        <circle cx="42" cy="80" r="1.8" />
        <circle cx="158" cy="80" r="1.8" />
      </g>
    </g>
  ),

  chrysanthemum: (
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

  brocade: (
    <g>
      <circle cx="100" cy="46" r="3.5" fill={white} />
      <g stroke={gold} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95">
        <path d="M100 46 Q100 78 100 104" />
        <path d="M100 46 Q72 60 60 100" />
        <path d="M100 46 Q128 60 140 100" />
        <path d="M100 46 Q48 54 30 86" />
        <path d="M100 46 Q152 54 170 86" />
      </g>
      <g fill={white}>
        <circle cx="100" cy="80" r="1.5" />
        <circle cx="74" cy="70" r="1.5" />
        <circle cx="126" cy="70" r="1.5" />
        <circle cx="52" cy="62" r="1.5" />
        <circle cx="148" cy="62" r="1.5" />
        <circle cx="100" cy="106" r="2" />
        <circle cx="60" cy="102" r="2" />
        <circle cx="140" cy="102" r="2" />
        <circle cx="30" cy="88" r="2" />
        <circle cx="170" cy="88" r="2" />
      </g>
    </g>
  ),

  candles: (
    <g>
      <rect x="94" y="86" width="12" height="30" rx="2" fill="#7a4fd0" />
      <rect x="94" y="86" width="12" height="6" rx="2" fill={violet} />
      <g stroke="#4a4d7a" strokeWidth="1.5" strokeDasharray="2 5" fill="none">
        <path d="M100 84 L100 24" />
      </g>
      <circle cx="100" cy="22" r="5" fill={red} />
      <circle cx="100" cy="44" r="4" fill={teal} opacity="0.8" />
      <circle cx="100" cy="64" r="3" fill={gold} opacity="0.6" />
      <g stroke={red} strokeWidth="1.5" strokeLinecap="round">
        <line x1="93" y1="15" x2="96" y2="19" />
        <line x1="107" y1="15" x2="104" y2="19" />
        <line x1="93" y1="29" x2="96" y2="25" />
        <line x1="107" y1="29" x2="104" y2="25" />
      </g>
    </g>
  ),

  batteries: (
    <g>
      {[62, 78, 94, 110, 126].map((x, i) => (
        <rect key={i} x={x} y={96 - (i % 2) * 4} width="12" height={22 + (i % 2) * 4} rx="2" fill={i % 2 ? '#2e5fb8' : '#3d74d6'} />
      ))}
      <g stroke="#4a4d7a" strokeWidth="1.2" strokeDasharray="2 4" fill="none">
        <path d="M68 94 Q64 60 56 40" />
        <path d="M84 92 Q84 58 88 36" />
        <path d="M100 94 Q102 56 108 30" />
        <path d="M116 92 Q120 60 130 42" />
        <path d="M132 94 Q140 66 152 50" />
      </g>
      <circle cx="55" cy="36" r="4" fill={red} />
      <circle cx="89" cy="32" r="4" fill={gold} />
      <circle cx="109" cy="26" r="4" fill={teal} />
      <circle cx="131" cy="38" r="4" fill={violet} />
      <circle cx="153" cy="46" r="4" fill={orange} />
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

  fish: (
    <g strokeLinecap="round" fill="none">
      {[
        { d: 'M60 40 q8 -6 16 0 q8 6 16 0', c: teal },
        { d: 'M110 34 q8 6 16 0 q8 -6 16 0', c: gold },
        { d: 'M48 72 q8 -6 16 0 q8 6 16 0', c: violet },
        { d: 'M104 66 q8 -6 16 0 q8 6 16 0', c: red },
        { d: 'M70 96 q8 6 16 0 q8 -6 16 0', c: orange },
        { d: 'M124 94 q8 -6 16 0 q8 6 16 0', c: teal },
      ].map((f, i) => (
        <g key={i}>
          <path d={f.d} stroke={f.c} strokeWidth="2.5" />
          <circle cx={Number(f.d.split(' ')[0].slice(1)) + 34} cy={Number(f.d.split(' ')[1])} r="2.5" fill={f.c} stroke="none" />
        </g>
      ))}
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
}
