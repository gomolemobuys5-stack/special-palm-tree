export default async function handler(req, res) {
  // CORS headers for the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const NOTION_SECRET = process.env.NOTION_SECRET;
  const NOTION_DB = process.env.NOTION_DATABASE_ID;

  if (!NOTION_SECRET || !NOTION_DB) {
    return res.status(500).json({ error: 'Notion not configured' });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_SECRET}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: 'Month', direction: 'descending' }],
        page_size: 100,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    // Parse Notion pages into clean trade objects
    const trades = data.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        trade: getTitle(props.Trade),
        month: getText(props.Month),
        asset: getText(props.Asset),
        direction: getText(props.Direction),
        pnl: getNumber(props.PnL),
        result: getText(props.Result),
        notes: getText(props.Notes),
        createdAt: page.created_time,
      };
    });

    return res.status(200).json({ trades });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Notion property extractors
function getTitle(prop) {
  if (!prop || prop.type !== 'title') return '';
  return prop.title?.map((t) => t.plain_text).join('') || '';
}

function getText(prop) {
  if (!prop) return '';
  if (prop.type === 'rich_text') return prop.rich_text?.map((t) => t.plain_text).join('') || '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'multi_select') return prop.multi_select?.map((s) => s.name).join(', ') || '';
  if (prop.type === 'title') return prop.title?.map((t) => t.plain_text).join('') || '';
  return '';
}

function getNumber(prop) {
  if (!prop || prop.type !== 'number') return 0;
  return prop.number || 0;
}
