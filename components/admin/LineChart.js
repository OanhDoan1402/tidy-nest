// Simple two-line chart (current period solid, previous period dashed). Server-rendered SVG.
export default function LineChart({ cur, prev, labels, format = (v) => String(Math.round(v)), height = 200, curLabel, prevLabel }) {
  const W = 700, H = height, top = 10, bottom = H - 6;
  const max = Math.max(1, ...cur, ...prev);
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const nice = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((v) => v >= max * 1.08) || 10 * mag;
  const y = (v) => bottom - (v / nice) * (bottom - top);
  const x = (i) => (cur.length === 1 ? 0 : (i / (cur.length - 1)) * W);
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ v: nice * t, top: y(nice * t) }));
  const step = labels.length <= 7 ? 1 : labels.length <= 12 ? 3 : 7;
  const last = labels.length - 1;
  const xl = labels.map((l, i) => ({ l, i })).filter(({ i }) => i === last || (i % step === 0 && last - i >= step / 2));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div aria-hidden="true" style={{ position: 'relative', width: 52, height: H, fontSize: 12, color: 'var(--muted)' }} className="num">
          {ticks.map((t) => (
            <span key={t.v} style={{ position: 'absolute', right: 0, top: t.top, transform: 'translateY(-50%)' }}>{format(t.v)}</span>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ position: 'relative', height: H }} role="img"
            aria-label={`${curLabel}: ${format(cur.reduce((a, b) => a + b, 0))} total. ${prevLabel}: ${format(prev.reduce((a, b) => a + b, 0))}.`}>
            {ticks.map((t) => (
              <div key={t.v} style={{ position: 'absolute', left: 0, right: 0, top: t.top, borderTop: '1px solid var(--line-2)' }} />
            ))}
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
              <path d={`${path(cur)} L${W} ${bottom} L0 ${bottom} Z`} fill="#1E6B57" opacity="0.08" />
              <path d={path(prev)} fill="none" stroke="#8B9792" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
              <path d={path(cur)} fill="none" stroke="#1E6B57" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div aria-hidden="true" style={{ position: 'relative', height: 18, fontSize: 12, color: 'var(--muted)' }}>
            {xl.map(({ l, i }) => (
              <span key={i} style={{ position: 'absolute', left: `${(x(i) / W) * 100}%`, transform: i === 0 ? 'none' : i === labels.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)', whiteSpace: 'nowrap' }}>{l}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-2)', justifyContent: 'flex-end' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: '#1E6B57' }} />{curLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, borderTop: '2px dashed #8B9792' }} />{prevLabel}</span>
      </div>
    </div>
  );
}
