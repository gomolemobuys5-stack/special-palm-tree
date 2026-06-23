# Market Intelligence Terminal - System Architecture

## Overview

A professional-grade institutional market intelligence terminal with integrated trading journal and analytics layer, designed for seamless embedding in Notion.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   External   │    │     n8n      │    │   Supabase   │    │  Website  │ │
│  │   Data APIs  │───▶│  Workflows   │───▶│   Database   │───▶│ Dashboard │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│        │                    │                   │                   │       │
│        │                    │                   │                   │       │
│        ▼                    ▼                   ▼                   ▼       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • CFTC Positioning API    • Transform & Clean   • market_intelligence│  │
│  │ • Economic Calendar API   • Calculate Deltas    • cftc_positioning   │  │
│  │ • Sentiment APIs          • Aggregate Stats     • economic_events    │  │
│  │ • Market Data APIs        • Schedule Jobs       • sentiment          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        NOTION INTEGRATION                             │  │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐          │  │
│  │  │  Daily  │    │  Trade  │    │ Weekly  │    │ Website │          │  │
│  │  │ Journal │◀──▶│   Log   │◀──▶│ Reviews │◀──▶│ Embed   │          │  │
│  │  └─────────┘    └─────────┘    └─────────┘    └─────────┘          │  │
│  │       │              │              │              ▲                │  │
│  │       └──────────────┴──────────────┴──────────────┘                │  │
│  │                        n8n Sync ▲                                    │  │
│  │                                 │                                    │  │
│  │                           ┌─────┴─────┐                             │  │
│  │                           │ Supabase  │                             │  │
│  │                           │  (cache)  │                             │  │
│  │                           └───────────┘                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Supabase SQL Schema

```sql
-- ============================================
-- MARKET INTELLIGENCE TABLE
-- Core market regime and macro data
-- ============================================
CREATE TABLE market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL UNIQUE,
  market_regime TEXT CHECK (market_regime IN ('risk_on', 'risk_off', 'neutral', 'transitioning')),
  volatility_regime TEXT CHECK (volatility_regime IN ('low', 'medium', 'high', 'extreme')),
  trend_strength INTEGER CHECK (trend_strength BETWEEN -100 AND 100),
  dxy_bias TEXT CHECK (dxy_bias IN ('bullish', 'bearish', 'neutral')),
  risk_appetite_score INTEGER CHECK (risk_appetite_score BETWEEN 0 AND 100),
  macro_momentum INTEGER CHECK (macro_momentum BETWEEN -100 AND 100),
  intermarket_correlation DECIMAL(4,3) CHECK (intermarket_correlation BETWEEN -1 AND 1),
  notes TEXT
);

CREATE INDEX idx_market_intelligence_date ON market_intelligence(date DESC);

-- ============================================
-- CFTC POSITIONING TABLE
-- Commitment of Traders data with delta calculations
-- ============================================
CREATE TABLE cftc_positioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  report_date DATE NOT NULL,
  asset TEXT NOT NULL,
  asset_class TEXT CHECK (asset_class IN ('fx', 'commodities', 'indices', 'rates', 'crypto')),
  long_positions BIGINT NOT NULL,
  short_positions BIGINT NOT NULL,
  net_positioning BIGINT NOT NULL,
  open_interest BIGINT,
  change_in_longs BIGINT,
  change_in_shorts BIGINT,
  change_in_net BIGINT,
  delta_4w BIGINT,  -- 4-week change in net positioning
  delta_12w BIGINT, -- 12-week change in net positioning
  percentile_rank INTEGER CHECK (percentile_rank BETWEEN 0 AND 100),
  extreme_reading BOOLEAN DEFAULT FALSE,
  UNIQUE(report_date, asset)
);

CREATE INDEX idx_cftc_positioning_date ON cftc_positioning(report_date DESC);
CREATE INDEX idx_cftc_positioning_asset ON cftc_positioning(asset);
CREATE INDEX idx_cftc_positioning_class ON cftc_positioning(asset_class);

-- ============================================
-- ECONOMIC EVENTS TABLE
-- Economic calendar with impact levels
-- ============================================
CREATE TABLE economic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_timestamp TIMESTAMPTZ NOT NULL,
  currency TEXT NOT NULL,
  event_name TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  deviation DECIMAL(10,4),
  surprise_direction TEXT CHECK (surprise_direction IN ('positive', 'negative', 'inline')),
  is_completed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_economic_events_timestamp ON economic_events(event_timestamp);
CREATE INDEX idx_economic_events_currency ON economic_events(currency);
CREATE INDEX idx_economic_events_impact ON economic_events(impact);

-- ============================================
-- SENTIMENT TABLE
-- Market sentiment indicators
-- ============================================
CREATE TABLE sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  asset TEXT,
  sentiment_score INTEGER CHECK (sentiment_score BETWEEN -100 AND 100),
  fear_greed_index INTEGER CHECK (fear_greed_index BETWEEN 0 AND 100),
  put_call_ratio DECIMAL(6,4),
  vix_level DECIMAL(8,4),
  vix_term_structure TEXT CHECK (vix_term_structure IN ('contango', 'backwardation', 'flat')),
  retail_sentiment INTEGER CHECK (retail_sentiment BETWEEN -100 AND 100),
  institutional_flow TEXT CHECK (institutional_flow IN ('buying', 'selling', 'neutral')),
  news_sentiment INTEGER CHECK (news_sentiment BETWEEN -100 AND 100),
  social_sentiment INTEGER CHECK (social_sentiment BETWEEN -100 AND 100)
);

CREATE INDEX idx_sentiment_date ON sentiment(date DESC);

-- ============================================
-- PERFORMANCE SNAPSHOTS TABLE
-- Trading performance tracking
-- ============================================
CREATE TABLE performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  period_type TEXT CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  starting_equity DECIMAL(15,2) NOT NULL,
  ending_equity DECIMAL(15,2) NOT NULL,
  pnl DECIMAL(15,2) NOT NULL,
  pnl_percent DECIMAL(8,4) NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2),
  profit_factor DECIMAL(8,4),
  expectancy DECIMAL(10,2),
  max_drawdown DECIMAL(15,2),
  max_drawdown_percent DECIMAL(8,4),
  sharpe_ratio DECIMAL(8,4),
  sortino_ratio DECIMAL(8,4),
  avg_win DECIMAL(10,2),
  avg_loss DECIMAL(10,2),
  largest_win DECIMAL(10,2),
  largest_loss DECIMAL(10,2),
  avg_hold_time INTERVAL,
  notes TEXT,
  UNIQUE(date, period_type)
);

CREATE INDEX idx_performance_date ON performance_snapshots(date DESC);
CREATE INDEX idx_performance_period ON performance_snapshots(period_type);

-- ============================================
-- ASSET PRICES TABLE
-- Time-series price data
-- ============================================
CREATE TABLE asset_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  timestamp TIMESTAMPTZ NOT NULL,
  asset TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  open DECIMAL(20,8) NOT NULL,
  high DECIMAL(20,8) NOT NULL,
  low DECIMAL(20,8) NOT NULL,
  close DECIMAL(20,8) NOT NULL,
  volume DECIMAL(20,2),
  timeframe TEXT CHECK (timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d', '1w'))
);

CREATE INDEX idx_asset_prices_timestamp ON asset_prices(timestamp DESC);
CREATE INDEX idx_asset_prices_asset ON asset_prices(asset);
CREATE INDEX idx_asset_prices_timeframe ON asset_prices(timeframe);

-- ============================================
-- JOURNAL ENTRIES TABLE
-- Synced from Notion
-- ============================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notion_page_id TEXT UNIQUE,
  entry_date DATE NOT NULL,
  entry_type TEXT CHECK (entry_type IN ('daily', 'trade', 'weekly_review', 'playbook')),
  title TEXT NOT NULL,
  content TEXT,
  mood TEXT CHECK (mood IN ('excellent', 'good', 'neutral', 'poor', 'terrible')),
  market_conditions TEXT,
  key_observations JSONB,
  lessons_learned JSONB,
  action_items JSONB,
  tags JSONB,
  trades_taken INTEGER,
  pnl_summary DECIMAL(10,2),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  synced_at TIMESTAMPTZ
);

CREATE INDEX idx_journal_date ON journal_entries(entry_date DESC);
CREATE INDEX idx_journal_type ON journal_entries(entry_type);
CREATE INDEX idx_journal_notion ON journal_entries(notion_page_id);

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================
-- Enable RLS if you want public read access
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE cftc_positioning ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Public read policy (for anon key access)
CREATE POLICY "Public read access" ON market_intelligence FOR SELECT USING (true);
CREATE POLICY "Public read access" ON cftc_positioning FOR SELECT USING (true);
CREATE POLICY "Public read access" ON economic_events FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sentiment FOR SELECT USING (true);
CREATE POLICY "Public read access" ON performance_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read access" ON journal_entries FOR SELECT USING (true);
```

---

## n8n Workflow Configurations

### Workflow A: Market Data Ingestion

```json
{
  "name": "Market Data Pipeline",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 4 }]
        }
      }
    },
    {
      "name": "Fetch CFTC Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "https://your-cftc-data-source/api/positioning"
      }
    },
    {
      "name": "Transform Data",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Calculate deltas, percentiles, extreme readings\nconst data = $input.all();\n// ... transformation logic"
      }
    },
    {
      "name": "Upsert to Supabase",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "upsert",
        "table": "cftc_positioning",
        "conflictFields": ["report_date", "asset"]
      }
    }
  ]
}
```

### Workflow B: Performance Snapshot

```json
{
  "name": "Daily Performance Snapshot",
  "nodes": [
    {
      "name": "Daily Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "cronExpression", "expression": "0 0 * * *" }] }
      }
    },
    {
      "name": "Fetch Trading Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-broker-api/trades"
      }
    },
    {
      "name": "Calculate Stats",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Calculate win rate, P&L, expectancy, etc."
      }
    },
    {
      "name": "Insert Snapshot",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "table": "performance_snapshots"
      }
    }
  ]
}
```

### Workflow C: Notion Journal Sync

```json
{
  "name": "Notion Journal Sync",
  "nodes": [
    {
      "name": "Schedule (Every 30min)",
      "type": "n8n-nodes-base.scheduleTrigger"
    },
    {
      "name": "Query Notion Database",
      "type": "n8n-nodes-base.notion",
      "parameters": {
        "operation": "getDatabasePages",
        "databaseId": "your-journal-database-id"
      }
    },
    {
      "name": "Transform Notion Pages",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Map Notion properties to Supabase schema"
      }
    },
    {
      "name": "Upsert to Supabase",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "upsert",
        "table": "journal_entries",
        "conflictFields": ["notion_page_id"]
      }
    }
  ]
}
```

---

## Notion Workspace Setup

### Databases to Create

1. **Daily Journal**
   - Date (Date)
   - Title (Title)
   - Content (Text)
   - Mood (Select: Excellent, Good, Neutral, Poor, Terrible)
   - Market Conditions (Text)
   - Key Observations (Multi-select)
   - Rating (Number 1-5)

2. **Trade Log**
   - Date (Date)
   - Title (Title)
   - Asset (Select)
   - Direction (Select: Long, Short)
   - Entry Price (Number)
   - Exit Price (Number)
   - P&L (Formula)
   - Notes (Text)
   - Tags (Multi-select)

3. **Weekly Reviews**
   - Week Of (Date)
   - Summary (Text)
   - Total P&L (Number)
   - Win Rate (Number)
   - Key Lessons (Text)
   - Action Items (Text)

### Embedding the Dashboard

Add this embed block to any Notion page:

```
/embed
URL: https://your-vercel-deployment.vercel.app
```

For specific pages:
- `/` - Full dashboard
- `/trading` - Performance metrics
- `/calendar` - Economic calendar
- `/journal` - Journal viewer

---

## Environment Variables

### Vercel Deployment

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### n8n Workflows

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
NOTION_API_KEY=your-notion-integration-secret
NOTION_JOURNAL_DB=your-journal-database-id
```

---

## Deployment Steps

### 1. Supabase Setup
1. Create new Supabase project
2. Run SQL schema in SQL Editor
3. Enable RLS policies
4. Copy project URL and anon key

### 2. n8n Setup
1. Self-host or use n8n cloud
2. Install Supabase and Notion nodes
3. Configure credentials
4. Import workflow JSONs
5. Activate workflows

### 3. Notion Setup
1. Create Integration at notion.so/my-integrations
2. Share databases with integration
3. Copy database IDs

### 4. Vercel Deployment
1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### 5. Embed in Notion
1. Go to your Notion workspace
2. Add /embed block
3. Paste Vercel URL
4. Adjust embed size

---

## Data Flow Summary

```
1. External Data Sources
   ├── CFTC API → n8n → Supabase → Website
   ├── Economic Calendar API → n8n → Supabase → Website
   ├── Sentiment APIs → n8n → Supabase → Website
   └── Market Data → n8n → Supabase → Website

2. Journal Flow
   ├── Notion (Write) → n8n → Supabase → Website (Read)
   └── Website (Display) ← Supabase ← n8n ← Notion

3. Performance Data
   └── Broker API → n8n (Calculate) → Supabase → Website
```

---

## Security Considerations

1. **Never expose service keys in frontend**
2. **Use RLS policies for data access control**
3. **Notion API calls through backend only**
4. **Environment variables for all secrets**
5. **CORS configuration for embed security**

---

## Scaling Notes

- Supabase handles real-time subscriptions
- n8n workflows can be parallelized
- Consider TimescaleDB extension for time-series
- Add caching layer if needed (Redis)
- Use Supabase Edge Functions for complex queries
