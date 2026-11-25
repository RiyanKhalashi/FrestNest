// Line-art graphics from the prototype
export function Sprout({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="#24452f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 28V15" />
      <path d="M16 17c-1-5-5-8-10-8 0 5 4 8 10 8z" fill="#e3ecd8" />
      <path d="M16 14c1-4.5 4.5-7.5 9.5-7.5 0 4.5-3.5 7.5-9.5 7.5z" fill="#f1e2b4" stroke="#b98a1e" />
      <path d="M9 28h14" />
    </svg>
  );
}

export function FieldScene() {
  return (
    <svg viewBox="0 0 560 150" aria-hidden="true" style={{ width: "100%", height: "auto", display: "block" }}>
      <path d="M0 120 C120 92 220 100 330 110 S500 96 560 104 V150 H0Z" fill="#e3ecd8" />
      <path d="M0 132 C140 116 260 124 380 130 S520 122 560 126 V150 H0Z" fill="#d3e1c4" />
      <g stroke="#24452f" strokeWidth="1.3" strokeLinecap="round" fill="none">
        {[60, 92, 124, 156, 188].map((x) => (<g key={x}><path d={`M${x} 128v-16`} /><path d={`M${x} 118c-6-2-9-6-9-11 5 0 9 3 9 8`} fill="#e3ecd8" /><path d={`M${x} 115c5-2 8-6 8-10-5 0-8 3-8 7`} fill="#e3ecd8" /></g>))}
        <g stroke="#b98a1e">{[420, 436, 452].map((x) => (<g key={x}><path d={`M${x} 130V96`} /><path d={`M${x} 100l-5-5M${x} 106l-5-5M${x} 112l-5-5M${x} 100l5-5M${x} 106l5-5M${x} 112l5-5`} /></g>))}</g>
      </g>
      <circle cx="500" cy="42" r="16" fill="#f1e2b4" />
    </svg>
  );
}
