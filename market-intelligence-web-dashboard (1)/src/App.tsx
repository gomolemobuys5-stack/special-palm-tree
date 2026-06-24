import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

// =====================================================
// SUPABASE
// =====================================================
const sbUrl = import.meta.env.VITE_SUPABASE_URL || '';
const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const sb = sbUrl ? createClient(sbUrl, sbKey) : null;

// =====================================================
// LOOKBACK OPTIONS
// =====================================================
const LOOKBACKS = [
  { id: '4w', label: '4W', weeks: 4 },
  { id: '12w', label: '12W', weeks: 12 },
  { id: '26w', label: '26W', weeks: 26 },
  { id: '52w', label: '52W', weeks: 52 },
];

// =====================================================
// FALLBACK DATA
// =====================================================
const sampleAssets = [
  { id: 'eurusd', name: 'EUR/USD', category: 'G10 FX', net: 156200, delta4w: 45200, pct: 82, signal: 'Bullish', trend: 65, tactical: 'Trend Follow' },
  { id: 'gbpusd', name: 'GBP/USD', category: 'G10 FX', net: -33200, delta4w: -28900, pct: 24, signal: 'Bearish', trend: -42, tactical: 'Mean Revert' },
  { id: 'usdjpy', name: 'USD/JPY', category: 'G10 FX', net: 114500, delta4w: 34500, pct: 88, signal: 'Bullish', trend: 78, tactical: 'Breakout' },
  { id: 'audusd', name: 'AUD/USD', category: 'G10 FX', net: -60300, delta4w: 18200, pct: 18, signal: 'Neutral', trend: 12, tactical: '' },
  { id: 'xauusd', name: 'XAU/USD', category: 'Metals', net: 233500, delta4w: 67800, pct: 92, signal: 'Strong Buy', trend: 85, tactical: 'Trend Follow' },
  { id: 'cl', name: 'CL', category: 'Energy', net: 272300, delta4w: -56400, pct: 45, signal: 'Bearish', trend: -35, tactical: 'Fade' },
  { id: 'es', name: 'ES', category: 'Index', net: 425800, delta4w: 89400, pct: 78, signal: 'Bullish', trend: 58, tactical: 'Trend Follow' },
  { id: 'zn', name: 'ZN', category: 'Rates', net: -285400, delta4w: -52600, pct: 12, signal: 'Bearish', trend: -72, tactical: 'Breakdown' },
];

const genSampleFlows = (weeks: number) => {
  const data = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (weeks - i) * 7);
    data.push({
      week: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dealer: Math.round(-40 + Math.sin(i * 0.5) * 20 + (Math.random() - 0.5) * 15),
      assetMgr: Math.round(80 + Math.cos(i * 0.3) * 30 + i * 2),
      leveraged: Math.round(120 + Math.sin(i * 0.4) * 25 + i * 3),
    });
  }
  return data;
};

const genSamplePrices = (weeks: number) => {
  const data = [];
  let price = 1.08;
  for (let i = 0; i < weeks * 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (weeks * 5 - i));
    const change = (Math.random() - 0.48) * 0.005;
    const o = price;
    const c = price + change;
    const h = Math.max(o, c) + Math.random() * 0.003;
    const l = Math.min(o, c) - Math.random() * 0.003;
    price = c;
    data.push({ time: d.toISOString().split('T')[0], open: o, high: h, low: l, close: c });
  }
  return data;
};

const sampleMacro = {
  regime: 'Risk On', confidence: 78, dxy: 102.45, dxyChange: -0.32,
  vix: 14.25, vixPct: 22, us10y: 4.28, curve2s10s: -18,
  riskAppetite: 68, liquidity: 72,
};

const sampleAnalytics = [
  { label: 'Bullish Breakout', winRate: 62, meanReturn: 1.8, samples: 245, edge: 'Strong' },
  { label: 'Bearish Reversal', winRate: 58, meanReturn: 1.2, samples: 189, edge: 'Moderate' },
  { label: 'Trend Continuation', winRate: 55, meanReturn: 0.9, samples: 312, edge: 'Moderate' },
  { label: 'Mean Reversion', winRate: 51, meanReturn: 0.6, samples: 156, edge: 'Weak' },
  { label: 'Momentum Fade', winRate: 48, meanReturn: -0.2, samples: 98, edge: 'Weak' },
];

const sampleReports = [
  { date: 'Dec 22, 2024', title: 'Weekly Market Review', summary: 'Risk appetite remains elevated with strong institutional buying.', regime: '', positioning: '' },
  { date: 'Dec 15, 2024', title: 'Positioning Update', summary: 'Leveraged funds increased long exposure in EUR/USD and Gold.', regime: '', positioning: '' },
];

// =====================================================
// MAIN APP
// =====================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('flows');
  const [lookback, setLookback] = useState(LOOKBACKS[1]); // default 12W
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sidePanel, setSidePanel] = useState(false);
  const [debugMsg, setDebugMsg] = useState('');

  const [assets, setAssets] = useState(sampleAssets);
  const [flowData, setFlowData] = useState(genSampleFlows(12));
  const [priceData, setPriceData] = useState(genSamplePrices(12));
  const [macroData, setMacroData] = useState(sampleMacro);
  const [analyticsData, setAnalyticsData] = useState(sampleAnalytics);
  const [reportsData, setReportsData] = useState(sampleReports);
  const [selectedAsset, setSelectedAsset] = useState(sampleAssets[0]);
  const [tffRaw, setTffRaw] = useState<any[]>([]);
  const [pricesRaw, setPricesRaw] = useState<any[]>([]);

  useEffect(() => { if (sb) loadData(); }, []);

  // Recompute charts when lookback or selectedAsset changes
  useEffect(() => {
    if (tffRaw.length) buildFlowChart(tffRaw, selectedAsset, lookback.weeks);
    if (pricesRaw.length) buildPriceChart(pricesRaw, selectedAsset, lookback.weeks);
    if (!tffRaw.length) setFlowData(genSampleFlows(lookback.weeks));
    if (!pricesRaw.length) setPriceData(genSamplePrices(lookback.weeks));
  }, [lookback, selectedAsset, tffRaw, pricesRaw]);

  function buildFlowChart(tff: any[], asset: any, weeks: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const match = tff.filter((t: any) =>
      t.market_name?.toLowerCase().includes(asset.name?.toLowerCase()?.split('/')[0] || '') &&
      t.report_date >= cutoffStr
    );
    if (!match.length) { setFlowData(genSampleFlows(weeks)); return; }

    const sorted = [...match].sort((a: any, b: any) => a.report_date.localeCompare(b.report_date));
    setFlowData(sorted.map((t: any) => ({
      week: new Date(t.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dealer: Math.round(((t.dealer_long || 0) - (t.dealer_short || 0)) / 1000),
      assetMgr: Math.round(((t.asset_mgr_long || 0) - (t.asset_mgr_short || 0)) / 1000),
      leveraged: Math.round(((t.lev_funds_long || 0) - (t.lev_funds_short || 0)) / 1000),
    })));
  }

  function buildPriceChart(prices: any[], asset: any, weeks: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const name = asset.name?.toLowerCase() || '';
    const match = prices.filter((p: any) => {
      const aid = (p.asset_id || p.yahoo_symbol || '').toLowerCase();
      return (aid.includes(name.split('/')[0]) || aid.includes(name.replace('/', ''))) && p.price_date >= cutoffStr;
    });

    if (!match.length) { setPriceData(genSamplePrices(weeks)); return; }

    const sorted = [...match].sort((a: any, b: any) => a.price_date.localeCompare(b.price_date));
    setPriceData(sorted.map((p: any) => ({
      time: p.price_date,
      open: Number(p.open_price),
      high: Number(p.high_price),
      low: Number(p.low_price),
      close: Number(p.close_price),
    })));
  }

  async function loadData() {
    setLoading(true);
    setDebugMsg('Connecting...');
    try {
      const { data: pos, error: posErr } = await sb!.from('positioning_metrics')
        .select('*').order('report_date', { ascending: false }).limit(500);
      if (posErr) { setDebugMsg(`Error: ${posErr.message}`); setLoading(false); return; }

      if (pos && pos.length > 0) {
        const latest: any = {};
        pos.forEach((p: any) => { if (!latest[p.asset_id]) latest[p.asset_id] = p; });
        const list = Object.values(latest).map((p: any) => ({
          id: p.asset_id, name: p.asset_name, category: p.asset_category,
          net: Number(p.inst_net) || 0, delta4w: Number(p.cumulative_delta_4w) || 0,
          pct: Number(p.percentile_52w) || 50, signal: p.signal_label || 'Neutral',
          trend: Number(p.trend_strength_12w) || 0, tactical: p.tactical_label || '',
        })).sort((a: any, b: any) => Math.abs(b.delta4w) - Math.abs(a.delta4w));
        setAssets(list);
        setSelectedAsset(list[0]);
      }

      const { data: tff } = await sb!.from('raw_tff_reports')
        .select('*').order('report_date', { ascending: false }).limit(1000);
      if (tff) setTffRaw(tff);

      const { data: prices } = await sb!.from('market_prices')
        .select('*').order('price_date', { ascending: false }).limit(2000);
      if (prices) setPricesRaw(prices);

      const { data: macro } = await sb!.from('macro_regime')
        .select('*').order('report_date', { ascending: false }).limit(1);
      if (macro?.[0]) {
        const m = macro[0];
        setMacroData({
          regime: m.regime_primary || 'N/A',
          confidence: Math.round((Number(m.regime_confidence) || 0) * 100),
          dxy: Number(m.dxy_level) || 0, dxyChange: Number(m.dxy_weekly_change) || 0,
          vix: Number(m.vix_level) || 0, vixPct: Number(m.vix_percentile_52w) || 0,
          us10y: Number(m.us10y_yield) || 0, curve2s10s: Number(m.yield_curve_2s10s) || 0,
          riskAppetite: Number(m.risk_appetite_score) || 0, liquidity: Number(m.liquidity_score) || 0,
        });
      }

      const { data: mc } = await sb!.from('monte_carlo_results')
        .select('*').order('calculated_at', { ascending: false }).limit(20);
      if (mc?.length) setAnalyticsData(mc.map((m: any) => ({
        label: m.tactical_label || 'N/A', winRate: Number(m.win_rate) || 0,
        meanReturn: Number(m.mean_return) || 0, samples: Number(m.sample_count) || 0, edge: m.edge_quality || 'N/A',
      })));

      const { data: rep } = await sb!.from('weekly_reports')
        .select('*').order('report_date', { ascending: false }).limit(10);
      if (rep?.length) setReportsData(rep.map((r: any) => ({
        date: new Date(r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        title: r.report_title || 'Weekly Report',
        summary: r.executive_summary || '', regime: r.regime_commentary || '', positioning: r.positioning_commentary || '',
      })));

      setConnected(true);
      setDebugMsg(`Live — ${pos?.length || 0} positioning · ${tff?.length || 0} TFF · ${prices?.length || 0} prices`);
    } catch (err: any) {
      setDebugMsg(`Error: ${err.message}`);
    } finally { setLoading(false); }
  }

  const tabs = [
    { id: 'flows', label: 'Flows' },
    { id: 'regime', label: 'Regime' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#08090d', color: '#e4e4e7' }}>
      {/* SIDE PANEL */}
      {sidePanel && (
        <div style={{ width: 360, background: '#0c0d12', borderRight: '1px solid #1e1f26', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1f26', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Project Log</span>
            <button onClick={() => setSidePanel(false)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            <ProjectLog />
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* HEADER */}
        <header style={{ height: 52, background: '#0c0d12', borderBottom: '1px solid #1e1f26', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setSidePanel(!sidePanel)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 16, padding: '4px 8px' }} title="Project Log">☰</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg, #22c55e, #3b82f6)' }} />
              <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: 0.5 }}>FLOW TERMINAL</span>
            </div>
            <div style={{ width: 1, height: 24, background: '#1e1f26' }} />
            <nav style={{ display: 'flex', gap: 2 }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: activeTab === tab.id ? '#1e1f26' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#71717a',
                }}>{tab.label}</button>
              ))}
            </nav>
            <div style={{ width: 1, height: 24, background: '#1e1f26' }} />
            {/* LOOKBACK SELECTOR */}
            <div style={{ display: 'flex', gap: 2, background: '#111118', borderRadius: 6, padding: 2 }}>
              {LOOKBACKS.map(lb => (
                <button key={lb.id} onClick={() => setLookback(lb)} style={{
                  padding: '5px 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
                  background: lookback.id === lb.id ? '#22c55e' : 'transparent',
                  color: lookback.id === lb.id ? '#000' : '#52525b',
                }}>{lb.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {loading && <span style={{ fontSize: 11, color: '#f59e0b' }}>Loading...</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#22c55e' : sb ? '#f59e0b' : '#ef4444' }} />
              <span style={{ fontSize: 11, color: '#71717a' }}>{connected ? 'Live' : sb ? 'Connecting' : 'Demo'}</span>
            </div>
          </div>
        </header>

        {/* DEBUG */}
        {debugMsg && (
          <div style={{ padding: '6px 20px', background: debugMsg.includes('Error') ? '#7f1d1d' : connected ? '#052e16' : '#422006', fontSize: 11, fontFamily: 'monospace', color: connected ? '#4ade80' : '#fbbf24' }}>
            {debugMsg}
          </div>
        )}

        {/* CONTENT */}
        <main style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {activeTab === 'flows' && <FlowsPage assets={assets} selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} flowData={flowData} priceData={priceData} lookback={lookback} />}
            {activeTab === 'regime' && <RegimePage data={macroData} />}
            {activeTab === 'analytics' && <AnalyticsPage data={analyticsData} />}
            {activeTab === 'reports' && <ReportsPage data={reportsData} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// =====================================================
// TRADINGVIEW CANDLESTICK CHART
// =====================================================
function TVChart({ data, height = 300 }: { data: any[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0c0d12' }, textColor: '#71717a', fontSize: 11 },
      grid: { vertLines: { color: '#1e1f2620' }, horzLines: { color: '#1e1f2640' } },
      width: containerRef.current.clientWidth,
      height,
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#1e1f26' },
      timeScale: { borderColor: '#1e1f26', timeVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e88', wickDownColor: '#ef444488',
    });

    const validData = data.filter(d => d.time && d.open && d.close).map(d => ({
      time: d.time, open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close),
    }));

    if (validData.length) {
      candleSeries.setData(validData);
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height]);

  return <div ref={containerRef} style={{ width: '100%' }} />;
}

// =====================================================
// FLOWS PAGE
// =====================================================
function FlowsPage({ assets, selectedAsset, setSelectedAsset, flowData, priceData, lookback }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* TITLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Positioning Flow Analysis</h1>
          <p style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>
            {selectedAsset.name} • {lookback.label} lookback • CFTC TFF Report
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Leg color="#f87171" label="Dealers" />
          <Leg color="#2dd4bf" label="Asset Mgrs" />
          <Leg color="#fbbf24" label="Leveraged" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
        {/* ASSET LIST */}
        <Panel title="Assets" compact>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {assets.map((a: any) => {
              const active = selectedAsset.id === a.id;
              return (
                <button key={a.id} onClick={() => setSelectedAsset(a)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: active ? '#1e1f26' : 'transparent',
                  border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                  borderLeft: active ? '2px solid #22c55e' : '2px solid transparent',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: active ? '#fff' : '#a1a1aa' }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: '#52525b', marginTop: 1 }}>{a.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500, color: a.delta4w >= 0 ? '#22c55e' : '#ef4444' }}>
                      {a.delta4w >= 0 ? '+' : ''}{(a.delta4w / 1000).toFixed(1)}k
                    </div>
                    <div style={{ fontSize: 10, color: '#52525b' }}>{a.pct}th pctl</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* CHARTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* PRICE CHART */}
          <Panel title={`${selectedAsset.name} — Price Action`} subtitle={`${lookback.label} lookback`}>
            <TVChart data={priceData} height={250} />
          </Panel>

          {/* FLOW LINES */}
          <Panel title={`${selectedAsset.name} — Positioning Flow`} subtitle={`Net contracts by trader type (thousands)`}>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flowData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1f2630" vertical={false} />
                  <XAxis dataKey="week" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}k`} />
                  <Tooltip content={<FlowTooltip />} />
                  <ReferenceLine y={0} stroke="#27272a" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="dealer" name="Dealers" stroke="#f87171" strokeWidth={2.5} dot={{ r: 2, fill: '#f87171' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="assetMgr" name="Asset Mgrs" stroke="#2dd4bf" strokeWidth={2.5} dot={{ r: 2, fill: '#2dd4bf' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="leveraged" name="Leveraged" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 2, fill: '#fbbf24' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* FLOW AREA (AGGREGATE) */}
          <Panel title="Aggregate Net Flows" subtitle="All assets combined">
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <defs>
                    <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={0.4}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4}/><stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1f2630" vertical={false} />
                  <XAxis dataKey="week" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}k`} />
                  <Tooltip content={<FlowTooltip />} />
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

      {/* TABLE */}
      <Panel title="Cross-Asset Flow Matrix" subtitle="All assets — latest positioning metrics">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1f26' }}>
                {['Asset', 'Category', 'Net Position', '4W Delta', 'Pctl', 'Trend 12W', 'Tactical', 'Signal'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 600, color: '#52525b', textAlign: i < 2 ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #1e1f2640', cursor: 'pointer', background: selectedAsset.id === a.id ? '#1e1f2630' : 'transparent' }} onClick={() => setSelectedAsset(a)}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500 }}>{a.name}</td>
                  <td style={{ padding: '12px 14px', fontSize: 11, color: '#52525b' }}>{a.category}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: a.net >= 0 ? '#22c55e' : '#ef4444' }}>{fmtNum(a.net)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: a.delta4w >= 0 ? '#22c55e' : '#ef4444' }}>{fmtDelta(a.delta4w)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}><PctBar value={a.pct} /></td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: a.trend >= 0 ? '#22c55e' : '#ef4444' }}>{a.trend > 0 ? '+' : ''}{Number(a.trend).toFixed(1)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 11, textAlign: 'right', color: '#71717a' }}>{a.tactical || '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}><Badge label={a.signal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// =====================================================
// REGIME PAGE
// =====================================================
function RegimePage({ data }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Macro Regime</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <NumCard label="Primary Regime" value={data.regime} color="#22c55e" />
        <NumCard label="Confidence" value={`${data.confidence}%`} color={data.confidence > 60 ? '#22c55e' : '#f59e0b'} />
        <NumCard label="Risk Appetite" value={String(Math.round(data.riskAppetite))} color={data.riskAppetite > 50 ? '#22c55e' : '#ef4444'} />
        <NumCard label="Liquidity" value={String(Math.round(data.liquidity))} color={data.liquidity > 50 ? '#22c55e' : '#ef4444'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Panel title="DXY">
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace' }}>{Number(data.dxy).toFixed(2)}</div>
          <div style={{ fontSize: 13, color: data.dxyChange >= 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>{data.dxyChange >= 0 ? '↑' : '↓'} {Math.abs(data.dxyChange).toFixed(2)}%</div>
        </Panel>
        <Panel title="VIX">
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace' }}>{Number(data.vix).toFixed(2)}</div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{Math.round(data.vixPct)}th pctl</div>
        </Panel>
        <Panel title="10Y UST">
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace' }}>{Number(data.us10y).toFixed(2)}%</div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>2s10s: {Math.round(data.curve2s10s)}bp</div>
        </Panel>
      </div>
      <Panel title="Indicators">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <GaugeBar label="Risk Appetite" value={Math.round(data.riskAppetite)} />
          <GaugeBar label="Liquidity" value={Math.round(data.liquidity)} />
          <GaugeBar label="Confidence" value={data.confidence} />
          <GaugeBar label="VIX Pctl" value={Math.round(data.vixPct)} />
        </div>
      </Panel>
    </div>
  );
}

// =====================================================
// ANALYTICS PAGE
// =====================================================
function AnalyticsPage({ data }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Trading Analytics</h1>
      <Panel title="Win Rate by Strategy">
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1f2630" horizontal={false} />
              <XAxis type="number" stroke="#52525b" fontSize={11} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="label" stroke="#52525b" fontSize={11} width={95} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
              <Bar dataKey="winRate" name="Win Rate" radius={[0, 4, 4, 0]}>
                {data.map((e: any, i: number) => (
                  <Cell key={i} fill={e.winRate >= 55 ? '#22c55e' : e.winRate >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Edge Summary">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #1e1f26' }}>
            {['Strategy', 'Win Rate', 'Mean Return', 'Samples', 'Edge'].map((h, i) => (
              <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 600, color: '#52525b', textAlign: i === 0 ? 'left' : 'right', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((m: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e1f2640' }}>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500 }}>{m.label}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: m.winRate >= 50 ? '#22c55e' : '#ef4444' }}>{Number(m.winRate).toFixed(1)}%</td>
                <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: m.meanReturn >= 0 ? '#22c55e' : '#ef4444' }}>{m.meanReturn >= 0 ? '+' : ''}{Number(m.meanReturn).toFixed(2)}%</td>
                <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#52525b' }}>{m.samples}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}><EdgeBadge edge={m.edge} /></td>
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
function ReportsPage({ data }: any) {
  const [sel, setSel] = useState(0);
  const r = data[sel] || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Weekly Reports</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <Panel title="Reports" compact>
          {data.map((rep: any, i: number) => (
            <button key={i} onClick={() => setSel(i)} style={{
              width: '100%', padding: 12, background: sel === i ? '#1e1f26' : 'transparent', border: 'none',
              borderRadius: 6, borderLeft: sel === i ? '2px solid #22c55e' : '2px solid transparent',
              cursor: 'pointer', textAlign: 'left', marginBottom: 4,
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: sel === i ? '#fff' : '#a1a1aa' }}>{rep.title}</div>
              <div style={{ fontSize: 11, color: '#52525b', marginTop: 3 }}>{rep.date}</div>
            </button>
          ))}
        </Panel>
        <Panel title={r.title} subtitle={r.date}>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: '#d4d4d8' }}>{r.summary}</div>
          {r.regime && <Section label="REGIME" text={r.regime} />}
          {r.positioning && <Section label="POSITIONING" text={r.positioning} />}
        </Panel>
      </div>
    </div>
  );
}

// =====================================================
// PROJECT LOG (Side Panel)
// =====================================================
function ProjectLog() {
  const log = `FLOW TERMINAL — Project Log
================================

STACK: React + Vite + Recharts + Lightweight Charts + Supabase
HOSTED: Vercel (free)
REPO: GitHub

SUPABASE TABLES CONNECTED:
• positioning_metrics — asset positioning, signals, percentiles
• raw_tff_reports — CFTC TFF dealer/asset mgr/leveraged flows
• market_prices — OHLCV price data
• macro_regime — DXY, VIX, rates, regime classification
• monte_carlo_results — backtest win rates and edge quality
• weekly_reports — AI-generated market commentary

RLS POLICIES:
All tables have "Allow public read" SELECT policy.

ENV VARS (Vercel):
• VITE_SUPABASE_URL
• VITE_SUPABASE_ANON_KEY

VERCEL SETTINGS:
• Framework: Vite
• Install Command: npm install (override ON)
• Root Directory: [subfolder containing package.json]

KEY FIXES:
1. Files in subfolder → set Root Directory in Vercel
2. vite not found → moved all deps to dependencies
3. npm ci fails → override install to npm install
4. 0 rows → added RLS SELECT policies
5. Blank page → switched to inline styles

PAGES:
• Flows — Price chart + flow lines + aggregate + matrix table
• Regime — DXY, VIX, 10Y, regime cards, gauge bars
• Analytics — Win rate bars, edge quality table
• Reports — Weekly report viewer`;

  return (
    <div>
      <pre style={{ fontSize: 11, lineHeight: 1.6, color: '#a1a1aa', whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0 }}>{log}</pre>
      <button onClick={() => {
        const blob = new Blob([log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'flow-terminal-log.txt'; a.click();
        URL.revokeObjectURL(url);
      }} style={{
        marginTop: 16, padding: '10px 16px', background: '#22c55e', color: '#000',
        border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
      }}>
        Download Log
      </button>
    </div>
  );
}

// =====================================================
// UI COMPONENTS
// =====================================================
function Panel({ title, subtitle, children, compact }: { title?: string; subtitle?: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <div style={{ background: '#0c0d12', border: '1px solid #1e1f26', borderRadius: 10, overflow: 'hidden' }}>
      {title && (
        <div style={{ padding: compact ? '12px 16px' : '14px 20px', borderBottom: '1px solid #1e1f26' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ padding: compact ? 12 : 20 }}>{children}</div>
    </div>
  );
}

function NumCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0c0d12', border: '1px solid #1e1f26', borderRadius: 10, padding: 20 }}>
      <div style={{ fontSize: 11, color: '#52525b', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function Leg({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 14, height: 3, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 11, color: '#71717a' }}>{label}</span>
    </div>
  );
}

function PctBar({ value }: { value: number }) {
  const color = value > 80 || value < 20 ? '#ef4444' : value > 70 || value < 30 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
      <div style={{ width: 40, height: 5, background: '#1e1f26', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#71717a', width: 24, textAlign: 'right' }}>{Math.round(value)}</span>
    </div>
  );
}

function GaugeBar({ label, value }: { label: string; value: number }) {
  const color = value >= 60 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#a1a1aa' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: '#1e1f26', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  const l = (label || '').toLowerCase();
  const color = l.includes('bull') || l.includes('buy') || l.includes('strong') ? '#22c55e' : l.includes('bear') || l.includes('sell') ? '#ef4444' : '#71717a';
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: `${color}18`, color }}>{label || '—'}</span>;
}

function EdgeBadge({ edge }: { edge: string }) {
  const e = (edge || '').toLowerCase();
  const color = e.includes('strong') ? '#22c55e' : e.includes('weak') ? '#ef4444' : '#f59e0b';
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: `${color}18`, color }}>{edge || '—'}</span>;
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#52525b', marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#a1a1aa' }}>{text}</div>
    </div>
  );
}

function FlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141418', border: '1px solid #27272a', borderRadius: 8, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 3, borderRadius: 2, background: p.color }} />
          <span style={{ fontSize: 11, color: '#a1a1aa', minWidth: 65 }}>{p.name}</span>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>
            {Number(p.value) >= 0 ? '+' : ''}{Number(p.value).toFixed(1)}k
          </span>
        </div>
      ))}
    </div>
  );
}

function fmtNum(n: number): string {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}

function fmtDelta(n: number): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${fmtNum(n)}`;
}
