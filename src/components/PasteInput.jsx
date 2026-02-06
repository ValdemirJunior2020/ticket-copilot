import { MACROS } from "../data/macros.js";

function firstMatch(regex, text) {
  const m = String(text).match(regex);
  return m ? m[1] : "";
}

function pickFirstEmail(text) {
  const m = String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  if (!m || !m.length) return "";
  const preferred = m.find((e) => /hotel|inn|suites|hospitality|lodging/i.test(e));
  return preferred || m[0];
}

function pickItinerary(text) {
  const s = String(text);
  const h = s.match(/\bH\d{6,12}\b/i);
  if (h) return h[0].toUpperCase();
  const dashed = s.match(/\b\d{2,4}-\d{4,}\b/);
  if (dashed) return dashed[0];
  const itin = s.match(/\b(itin(?:erary)?\s*#?\s*[:\-]?\s*)([A-Z0-9-]{6,})\b/i);
  if (itin) return itin[2].toUpperCase();
  return "";
}

function pickGuestName(text) {
  const s = String(text);
  let m =
    s.match(/Requester\s+([A-Z][A-Za-z .'-]{2,60})/i) ||
    s.match(/GUEST'?S?\s*NAME\s*[:\-]\s*([A-Z][A-Z .'-]{2,60})/i) ||
    s.match(/\bDear\s+\[?([A-Z][A-Za-z .'-]{2,60})\]?,/iborder-white/20"
        placeholder="Paste the Zendesk thread / internal notes / SMS / emails…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
