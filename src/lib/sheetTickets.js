/**
 * Google Sheets public fetch via GVIZ.
 * Works when the sheet is accessible to the user (public OR your browser session can access it).
 *
 * IMPORTANT:
 * - For private sheets without publishing, browser fetch may be blocked by auth/cors.
 * - Best practice later: use a small server proxy (Express) or Google Sheets API with OAuth/service account.
 */
function gvizUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
}

function parseGViz(text) {
  // GVIZ returns: "/*O_o*/\ngoogle.visualization.Query.setResponse(<JSON>);"
  const start = text.indexOf("(");
  const end = text.lastIndexOf(");");
  const json = text.slice(start + 1, end);
  return JSON.parse(json);
}

function cellValue(c) {
  if (!c) return "";
  // v is raw, f is formatted
  if (typeof c.f !== "undefined") return String(c.f);
  if (typeof c.v !== "undefined") return String(c.v);
  return "";
}

export async function fetchTicketsFromSheet() {
  const sheetId = import.meta.env.VITE_SHEET_ID;
  const gid = import.meta.env.VITE_SHEET_GID;

  if (!sheetId || !gid) {
    throw new Error("Missing VITE_SHEET_ID or VITE_SHEET_GID in .env");
  }

  const res = await fetch(gvizUrl(sheetId, gid));
  if (!res.ok) throw new Error(`GVIZ fetch failed: ${res.status}`);
  const raw = await res.text();
  const data = parseGViz(raw);

  const table = data?.table;
  const cols = (table?.cols || []).map((c) => (c?.label || "").trim());
  const rows = table?.rows || [];

  const out = rows.map((r) => {
    const cells = r?.c || [];
    const obj = {};
    for (let i = 0; i < cols.length; i++) {
      const key = cols[i] || `col_${i}`;
      obj[key] = cellValue(cells[i]);
    }
    // also keep array style access
    obj.__cells = cells.map(cellValue);
    return obj;
  });

  return { cols, rows: out };
}
