import { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

// =====================================================
// SAMPLE DATA
// =====================================================

const flowData = [
  { week: 'Nov 3', dealer: -45, assetMgr: 82, leveraged: 125 },
  { week: 'Nov 10', dealer: -52, assetMgr: 95, leveraged: 138 },
  { week: 'Nov 17', dealer: -38, assetMgr: 88, leveraged: 142 },
  { week: 'Nov 24', dealer: -62, assetMgr: 105, leveraged: 155 },
  { week: 'Dec 1', dealer: -48, assetMgr: 112, leveraged: 148 },
  { week: 'Dec 8', dealer: -55, assetMgr: 98, leveraged: 162 },
  { week: 'Dec 15', dealer: -42, assetMgr: 125, leveraged: 175 },
  { week: 'Dec 22', dealer: -58, assetMgr: 132, leveraged: 168 },
];

const assets = [
  { id: 1, name: 'EUR/USD', category: 'G10 FX', net: 156200, delta4w: 45200, pct: 82, signal: 'Bullish', trend: 65 },
  { id: 2, name: 'GBP/USD', category: 'G10 FX', net: -33200, delta4w: -28900, pct: 24, signal: 'Bearish', trend: -42 },
  { id: 3, name: 'USD/JPY', category: 'G10 FX', net: 114500, delta4w: 34500, pct: 88, signal: 'Bullish', trend: 78 },
  { id: 4, name: 'AUD/USD', category: 'G10 FX', net: -60300, delta4w: 18200, pct: 18, signal: 'Neutral', trend: 12 },
  { id: 5, name: 'XAU/USD', category: 'Metals', net: 233500, delta4w: 67800, pct: 92, signal: 'Strong Buy', trend: 85 },
  { id: 6, name: 'CL', category: 'Energy', net: 272300, delta4w: -56400, pct: 45, signal: 'Bearish', trend: -35 },
  { id: 7, name: 'ES', category: 'Index', net: 425800, delta4w: 89400, pct: 78, signal: 'Bullish', trend: 58 },
  { id: 8, name: 'ZN', category: 'Rates', net: -285400, delta4w: -52600, pct: 12, signal: 'Bearish', trend: -72 },
];

const macroData = {
  regime: 'Risk On', confidence: 78, dxy: 102.45, dxyChange: -0.32,
  vix: 14.25, vixPct: 22, us10y: 4.28, curve2s10s: -18,
  riskAppetite: 68, liquidity: 72,
};

const analyticsData = [
  { label: 'Bullish Breakout', winRate: 62, meanReturn: 1.8, samples: 245, edge: 'Strong' },
  { label: 'Bearish Reversal', winRate: 58, meanReturn: 1.2, samples: 189, edge: 'Moderate' },
  { label: 'Trend Continuation', winRate: 55, meanReturn: 0.9, samples: 312, edge: 'Moderate' },
  { label: 'Mean Reversion', winRate: 51, meanReturn: 0.6, samples: 156, edge: 'Weak' },
  { label: 'Momentum Fade', winRate: 48, meanReturn: -0.2, samples: 98, edge: 'Weak' },
];

const reportsData = [
  { date: 'Dec 22, 2024', title: 'Weekly Market Review', summary: 'Risk appetite remains elevated with strong institutional buying in equities and gold. DXY weakness continues to support EM and commodities. VIX term structure in steep contango suggesting low near-term vol expectations.' },
  { date: 'Dec 15, 2024', title: 'Positioning Update', summary: 'Leveraged funds increased long exposure in EUR/USD and Gold. Commercial hedgers remain net short across energy complex. Treasury positioning continues to build on the short side.' },
  { date: 'Dec 8, 2024', title: 'Macro Regime Shift', summary: 'Transition from neutral to risk-on regime detected. VIX term structure in steep contango suggesting low near-term vol expectations. Dollar weakness accelerating.' },
];

// =====================================================
// MAIN APP
// =====================================================

export default function App() {
  const [activeTab, setActiveTab] = useState('flows');
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);

  const tabs = [
    { id: 'flows', label: 'Positioning Flows' },
    { id: 'regime', label: 'Macro Regime' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e4e4e7' }}>
      {/* HEADER */}
      <header style={{
        height: 52, background: '#0c0d12', borderBottom: '1px solid #1e1f26',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg, #22c55e, #3b82f6)' }} />
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: 0.5 }}>FLOW TERMINAL</span>
          </div>
          <div style={{ width: 1, height: 24, background: '#1e1f26' }} />
          <nav style={{ display: 'flex', gap: 4 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none',
                borderRadius: 6, cursor: 'pointer',
                background: activeTab === tab.id ? '#1e1f26' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#71717a',
              }}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, color: '#71717a' }}>Live</span>
          </div>
          <span style={{ fontSize: 11, color: '#52525b', fontFamily: 'monospace' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>

      <main style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
        {activeTab === 'flows' && <FlowsPage selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} />}
        {activeTab === 'regime' && <RegimePage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'reports' && <ReportsPage />}
      </main>
    </div>
  );
}

// =====================================================
// FLOWS PAGE
// =====================================================

function FlowsPage({ selectedAsset, setSelectedAsset }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Positioning Flow Analysis</h1>
          <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>12-week delta by trader type • CFTC TFF Report</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <LegendDot color="#f87171" label="Dealers" />
          <LegendDot color="#2dd4bf" label="Asset Managers" />
          <LegendDot color="#fbbf24" label="Leveraged Funds" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Asset Selector */}
        <Panel title="Assets">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {assets.map(a => (
              <button key={a.id} onClick={() => setSelectedAsset(a)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', background: selectedAsset.id === a.id ? '#1e1f26' : 'transparent',
                border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                borderLeft: selectedAsset.id === a.id ? '3px solid #22c55e' : '3px solid transparent',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: selectedAsset.id === a.id ? '#fff' : '#a1a1aa' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>{a.category}</div>
                </div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500, color: a.delta4w >= 0 ? '#22c55e' : '#ef4444' }}>
                  {a.delta4w >= 0 ? '+' : ''}{(a.delta4w / 1000).toFixed(1)}k
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title={`${selectedAsset.name} — 12 Week Flow`} subtitle={`${selectedAsset.category} • ${selectedAsset.signal}`}>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flowData} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1f26" vertical={false} />
                  <XAxis dataKey="week" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}k`} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
                  <ReferenceLine y={0} stroke="#27272a" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="dealer" name="Dealers" stroke="#f87171" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="assetMgr" name="Asset Mgrs" stroke="#2dd4bf" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="leveraged" name="Leveraged" stroke="#fbbf24" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Aggregate Flows" subtitle="All assets combined">
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <defs>
                    <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/><stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1f26" vertical={false} />
                  <XAxis dataKey="week" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}k`} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
                  <ReferenceLine y={0} stroke="#27272a" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="dealer" stroke="#f87171" fill="url(#gd)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="assetMgr" stroke="#2dd4bf" fill="url(#ga)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="leveraged" stroke="#fbbf24" fill="url(#gl)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      {/* Table */}
      <Panel title="Cross-Asset Flow Matrix" subtitle="Net positioning and 4-week delta">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1f26' }}>
              {['Asset', 'Category', 'Net Position', '4W Delta', 'Percentile', 'Trend', 'Signal'].map((h, i) => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#52525b', textAlign: i < 2 ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #1e1f26' }}>
                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 500 }}>{a.name}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: '#52525b' }}>{a.category}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color: a.net >= 0 ? '#22c55e' : '#ef4444' }}>{fmtNum(a.net)}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color: a.delta4w >= 0 ? '#22c55e' : '#ef4444' }}>{fmtDelta(a.delta4w)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}><PctBar value={a.pct} /></td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color: a.trend >= 0 ? '#22c55e' : '#ef4444' }}>{a.trend > 0 ? '+' : ''}{a.trend}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}><Badge label={a.signal} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// =====================================================
// REGIME PAGE
// =====================================================

function RegimePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Macro Regime</h1>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>Current market regime and indicators</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <NumCard label="Primary Regime" value={macroData.regime} color="#22c55e" />
        <NumCard label="Confidence" value={`${macroData.confidence}%`} color={macroData.confidence > 60 ? '#22c55e' : '#f59e0b'} />
        <NumCard label="Risk Appetite" value={String(macroData.riskAppetite)} color={macroData.riskAppetite > 50 ? '#22c55e' : '#ef4444'} />
        <NumCard label="Liquidity Score" value={String(macroData.liquidity)} color={macroData.liquidity > 50 ? '#22c55e' : '#ef4444'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Panel title="Dollar Index (DXY)">
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace' }}>{macroData.dxy}</div>
          <div style={{ fontSize: 14, color: macroData.dxyChange >= 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
            {macroData.dxyChange >= 0 ? '↑' : '↓'} {Math.abs(macroData.dxyChange)}% weekly
          </div>
        </Panel>
        <Panel title="VIX">
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace' }}>{macroData.vix}</div>
          <div style={{ fontSize: 14, color: '#71717a', marginTop: 4 }}>{macroData.vixPct}th percentile (52w)</div>
        </Panel>
        <Panel title="10Y Treasury">
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace' }}>{macroData.us10y}%</div>
          <div style={{ fontSize: 14, color: '#71717a', marginTop: 4 }}>2s10s: {macroData.curve2s10s}bp</div>
        </Panel>
      </div>

      <Panel title="Regime Indicators">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <GaugeBar label="Risk Appetite" value={macroData.riskAppetite} />
          <GaugeBar label="Liquidity Score" value={macroData.liquidity} />
          <GaugeBar label="Regime Confidence" value={macroData.confidence} />
          <GaugeBar label="VIX Percentile" value={macroData.vixPct} />
        </div>
      </Panel>
    </div>
  );
}

// =====================================================
// ANALYTICS PAGE
// =====================================================

function AnalyticsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Trading Analytics</h1>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>Edge analysis and Monte Carlo results</p>
      </div>

      <Panel title="Win Rate by Strategy" subtitle="Historical performance">
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1f26" horizontal={false} />
              <XAxis type="number" stroke="#52525b" fontSize={11} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="label" stroke="#52525b" fontSize={12} width={95} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
              <Bar dataKey="winRate" name="Win Rate" radius={[0, 4, 4, 0]}>
                {analyticsData.map((e, i) => (
                  <Cell key={i} fill={e.winRate >= 55 ? '#22c55e' : e.winRate >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Edge Quality Summary">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1f26' }}>
              {['Strategy', 'Win Rate', 'Mean Return', 'Samples', 'Edge'].map((h, i) => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#52525b', textAlign: i === 0 ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analyticsData.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e1f26' }}>
                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 500 }}>{m.label}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color: m.winRate >= 50 ? '#22c55e' : '#ef4444' }}>{m.winRate}%</td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color: m.meanReturn >= 0 ? '#22c55e' : '#ef4444' }}>{m.meanReturn >= 0 ? '+' : ''}{m.meanReturn}%</td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color: '#52525b' }}>{m.samples}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}><EdgeBadge edge={m.edge} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// =====================================================
// REPORTS PAGE
// =====================================================

function ReportsPage() {
  const [sel, setSel] = useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Weekly Reports</h1>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>Market commentary and analysis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        <Panel title="Reports">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {reportsData.map((r, i) => (
              <button key={i} onClick={() => setSel(i)} style={{
                padding: 14, background: sel === i ? '#1e1f26' : 'transparent', border: 'none',
                borderRadius: 8, borderLeft: sel === i ? '3px solid #22c55e' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: sel === i ? '#fff' : '#a1a1aa' }}>{r.title}</div>
                <div style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>{r.date}</div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={reportsData[sel].title} subtitle={reportsData[sel].date}>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: '#d4d4d8' }}>{reportsData[sel].summary}</div>
          <div style={{ marginTop: 24, padding: 16, background: '#0c0d12', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 8 }}>KEY TAKEAWAYS</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#a1a1aa' }}>
              <li style={{ marginBottom: 8 }}>Institutional positioning remains constructive</li>
              <li style={{ marginBottom: 8 }}>Watch for regime shift signals in VIX structure</li>
              <li>DXY weakness supportive for risk assets</li>
            </ul>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// =====================================================
// UI COMPONENTS
// =====================================================

function Panel({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0c0d12', border: '1px solid #1e1f26', borderRadius: 12, overflow: 'hidden' }}>
      {title && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1f26' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#52525b', marginTop: 2 }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function NumCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0c0d12', border: '1px solid #1e1f26', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 12, color: '#52525b', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 16, height: 3, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 12, color: '#71717a' }}>{label}</span>
    </div>
  );
}

function PctBar({ value }: { value: number }) {
  const color = value > 80 || value < 20 ? '#ef4444' : value > 70 || value < 30 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
      <div style={{ width: 50, height: 6, background: '#1e1f26', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: '#71717a', width: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function GaugeBar({ label, value }: { label: string; value: number }) {
  const color = value >= 60 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>{label}</span>
        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 8, background: '#1e1f26', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  const color = label.includes('Bull') || label.includes('Buy') ? '#22c55e' : label.includes('Bear') || label.includes('Sell') ? '#ef4444' : '#71717a';
  return <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 4, background: `${color}20`, color }}>{label}</span>;
}

function EdgeBadge({ edge }: { edge: string }) {
  const color = edge === 'Strong' ? '#22c55e' : edge === 'Moderate' ? '#f59e0b' : '#ef4444';
  return <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 4, background: `${color}20`, color }}>{edge}</span>;
}

function fmtNum(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

function fmtDelta(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmtNum(n)}`;
}
