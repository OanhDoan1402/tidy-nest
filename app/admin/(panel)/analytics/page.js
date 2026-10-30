import Link from 'next/link';
import { loadPeriod, rangeInfo, summarize, delta, RANGES } from '@/lib/analytics';
import LineChart from '@/components/admin/LineChart';
import { money, int } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Bars({ title, unit, rows, fmt, empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="section-title" style={{ fontSize: 15 }}>{title}</h2>
        <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>{unit}</span>
      </div>
      {rows.length === 0 && <span className="muted">{empty}</span>}
      <div className="bars">
        {rows.map((r) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {r.extra && <img src={r.extra} alt="" className="thumb" style={{ width: 34, height: 34 }} />}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }} className="num">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <strong>{fmt(r.value)}</strong>
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function Analytics({ searchParams }) {
  const range = RANGES[searchParams?.range] ? searchParams.range : '7d';
  const r = rangeInfo(range);
  const s = summarize(r, await loadPeriod(r));
  const t = s.totals;
  const kpis = [
    ['Total sales', money(t.sales), delta(t.sales, t.psales)],
    ['Orders', int(t.orders), delta(t.orders, t.porders)],
    ['Online store sessions', int(t.sessions), delta(t.sessions, t.psessions)],
    ['Conversion rate', t.cr.toFixed(2) + '%', delta(t.cr, t.pcr)],
    ['Average order value', money(t.aov), delta(t.aov, t.paov)],
  ];
  const f = s.funnel;
  const pct = (n) => (f.sessions ? ((n / f.sessions) * 100).toFixed(1) + '%' : '0%');
  const funnel = [['Sessions', f.sessions], ['Added to cart', f.cart], ['Reached checkout', f.checkout], ['Purchased', f.purchased]];
  const b = s.breakdown;

  return (
    <>
      <div className="page-head">
        <h1>Analytics</h1>
        <span className="muted">{r.curLabel} · compared with {r.prevLabel}</span>
        <nav className="tabs right" aria-label="Date range">
          {Object.entries(RANGES).map(([k, l]) => (
            <Link key={k} href={`/admin/analytics?range=${k}`} className={'tab' + (k === range ? ' tab-on' : '')}>{l}</Link>
          ))}
        </nav>
      </div>

      <div className="kpis">
        {kpis.map(([label, value, d]) => (
          <div key={label} className="card kpi">
            <span className="label">{label}</span>
            <span className="value">{value}</span>
            <span className={d.cls} style={{ fontSize: 12, fontWeight: 600 }}>{d.txt}</span>
          </div>
        ))}
      </div>

      <div className="row">
        <section className="card" style={{ flex: '2 1 520px', minWidth: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="section-title">Total sales over time</h2>
          <LineChart cur={s.series.sales} prev={s.series.psales} labels={r.labels} curLabel={r.curLabel} prevLabel={r.prevLabel}
            format={(v) => (v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : '$' + Math.round(v))} />
        </section>
        <section className="card" style={{ flex: '1 1 280px', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="section-title">Conversion funnel</h2>
          {funnel.map(([label, n]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }} className="num"><span>{label}</span><span><strong>{pct(n)}</strong> <span className="muted">· {int(n)}</span></span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: f.sessions ? `${(n / f.sessions) * 100}%` : '0%' }} /></div>
            </div>
          ))}
        </section>
      </div>

      <div className="row">
        <section className="card" style={{ flex: '1 1 300px', minWidth: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="section-title">Sessions over time</h2>
          <LineChart cur={s.series.sess} prev={s.series.psess} labels={r.labels} curLabel={r.curLabel} prevLabel={r.prevLabel} height={130} />
        </section>
        <section className="card num" style={{ flex: '1 1 300px', padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 className="section-title" style={{ marginBottom: 8 }}>Total sales breakdown</h2>
          {[['Gross sales', money(b.gross)], ['Shipping charges', money(b.shipping)], ['Returns & cancellations', '−' + money(b.returns)], ['Total sales', money(b.total)]].map(([l, v], i, arr) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line-2)' : 'none', fontWeight: i === arr.length - 1 ? 700 : 400 }}>
              <span>{l}</span><span>{v}</span>
            </div>
          ))}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        <Bars title="Top products by units sold" unit="Units" rows={s.topProducts} fmt={int} />
        <Bars title="Sales by collection" unit="Sales" rows={s.byCollection} fmt={money} />
        <Bars title="Sessions by traffic source" unit="Sessions" rows={s.bySource} fmt={int} />
        <Bars title="Sessions by device" unit="Sessions" rows={s.byDevice} fmt={int} />
        <Bars title="Top landing pages" unit="Sessions" rows={s.landing} fmt={int} />
      </div>
    </>
  );
}
