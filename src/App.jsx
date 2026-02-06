import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./style.css";

/* =========================
   Helpers
========================= */
function normalizeText(rawText) {
  return String(rawText || "")
    .replace(/\r/g, "")
    .replace(/[•·]/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function genId() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

function formatNowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* =========================
   Extraction (Zendesk paste)
========================= */
function extractFieldsFromZendesk(rawText) {
  const text = normalizeText(rawText);
  const lower = text.toLowerCase();

  // ---------- Itinerary ----------
  // supports: H13982795, H 13982795, Itinerary # H13982795, Itinerary Number: H13982795
  let itinerary = "";
  const it =
    text.match(/itinerary\s*(?:number)?\s*[:#]\s*(H\s*\d{6,})/i) ||
    text.match(/itinerary\s*#\s*(H\s*\d{6,})/i) ||
    text.match(/\b(H\s*\d{6,})\b/i);

  if (it?.[1]) itinerary = String(it[1]).replace(/\s+/g, "").toUpperCase();

  // ---------- Guest ----------
  let guest = "";

  // Guest Name: ANDREA JIMENEZ
  const g1 = text.match(
    /guest\s*name\s*[:\-]\s*([A-Z][A-Z '\-]{2,})(?=\s*(?:rooms?\b|itinerary\b|status\b|$))/i
  );
  if (g1?.[1]) guest = g1[1].trim();

  // To: Andrea Jimenez
  if (!guest) {
    const g2 = text.match(/\bto:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/);
    if (g2?.[1]) guest = g2[1].trim();
  }

  // top header name line
  if (!guest) {
    const lines = String(rawText || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const bad = /internal|show more|dec|jan|to:|phone:|ticket|standard|wns|channel managers|pending|call recording/i;

    const nameLine = lines.find((l) => {
      if (bad.test(l)) return false;
      if (!/^[A-Za-z][A-Za-z '\-]+$/.test(l)) return false;
      const wc = l.split(/\s+/).length;
      return wc >= 2 && wc <= 4;
    });

    if (nameLine) guest = nameLine.trim();
  }

  // ---------- Issue ----------
  const hasCallReview = /call review|call recording|ticketreview|no record for the call/.test(lower);
  const hasRefund = /refund|partial refund|issuing partial refund|refund is being processed/.test(lower);
  const hasChargeback = /chargeback|dispute/.test(lower);
  const hasJacuzzi = /jacuzzi/.test(lower);
  const hasAmenity = /amenity|room type|booked room|booking error|agent booked room diff/.test(lower);

  let issue = "";
  if (hasChargeback) issue = "Chargeback / Dispute";
  else if (hasRefund && hasAmenity) issue = "Refund (Booking / Room Type Issue)";
  else if (hasRefund) issue = "Refund Request";
  else if (hasCallReview && hasJacuzzi) issue = "Call Review (Amenity / Jacuzzi)";
  else if (hasCallReview) issue = "Call Review Requested";
  else if (hasJacuzzi) issue = "Amenity Issue (Jacuzzi)";
  else if (hasAmenity) issue = "Room / Booking Issue";

  // ---------- Hotel ----------
  let hotel = "";
  const h1 = text.match(/\bhotel\s*(?:name)?\s*[:\-]\s*([A-Za-z0-9&'().,\- ]{3,})/i);
  if (h1?.[1]) hotel = h1[1].trim();

  if (!hotel) {
    const h2 = text.match(/\bat\s+the\s+([A-Za-z0-9&'().,\- ]{3,60})\b/i);
    if (h2?.[1] && !/point of sale|hotel reservations/i.test(h2[1])) hotel = h2[1].trim();
  }

  if (!hotel) {
    const h3 = text.match(/\b(CLD\s+HTL)\b/i);
    if (h3?.[1]) hotel = h3[1].toUpperCase();
  }

  // ---------- Tags ----------
  const tags = [];
  if (hasRefund) tags.push("refund");
  if (hasChargeback) tags.push("chargeback");
  if (hasCallReview) tags.push("call_review");
  if (hasJacuzzi) tags.push("amenity");
  if (/\bphone\b|\+\d/.test(lower)) tags.push("phone_present");

  return { itinerary, guest, issue, hotel, tags };
}

/* =========================
   Risk flags (red cards)
========================= */
function detectRiskFlags(rawText) {
  const text = normalizeText(rawText);
  const lower = text.toLowerCase();
  const flags = [];

  const phone = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  if (phone) {
    flags.push({
      key: "phone",
      title: "Phone number detected",
      desc: "Be careful copying/exporting.",
    });
  }

  if (/refund is being processed|refund will be processed|refund has been processed|we issued a refund|issuing partial refund/.test(lower)) {
    flags.push({
      key: "refund_promise",
      title: "Refund promise risk",
      desc: "Avoid confirming a refund unless proven/approved.",
    });
  }

  if (/call recording|call review|ticketreview|no record for the call/.test(lower)) {
    flags.push({
      key: "call_review",
      title: "Call recording / review requested",
      desc: "May require verification steps.",
    });
  }

  if (/chargeback|dispute/.test(lower)) {
    flags.push({
      key: "chargeback",
      title: "Chargeback / dispute keyword",
      desc: "Use careful wording and confirm policy steps.",
    });
  }

  if (/credit card|card number|cvv/.test(lower)) {
    flags.push({
      key: "cc",
      title: "Card data risk",
      desc: "Remove card numbers before saving/exporting.",
    });
  }

  return flags;
}

/* =========================
   Macro / Draft templates
========================= */
function macroFromFields(f) {
  const itin = f.itinerary ? `Itinerary # ${f.itinerary}` : "your reservation";
  const name = f.guest ? f.guest : "[Name]";
  const bodyLines = [];

  if (/call review/i.test(f.issue || "")) {
    bodyLines.push("We’ve received your request and are reviewing the details with our escalation team.");
    bodyLines.push("If additional information is needed, we’ll reach out by email as soon as possible.");
  } else if (/refund/i.test(f.issue || "")) {
    bodyLines.push("We’re reviewing your request and will follow up by email as soon as possible.");
    bodyLines.push("If approved, refund timing depends on the payment method and bank processing.");
  } else {
    bodyLines.push("Thanks for contacting us. We’re reviewing your request and will follow up by email as soon as possible.");
  }

  return `Dear ${name},\n\nThis response is related to ${itin}.\n\n${bodyLines.join(" ")}\n\nSincerely,\nTravel Support`;
}

function suggestMacroName(fields) {
  const issue = (fields.issue || "").toLowerCase();
  if (issue.includes("chargeback")) return "Chargeback / Dispute → Acknowledge + Next Steps";
  if (issue.includes("refund")) return "Refund Request → In Review (No Promise)";
  if (issue.includes("call review")) return "Call Review → Escalation In Review";
  if (issue.includes("amenity") || issue.includes("room")) return "Amenity / Room Issue → In Review";
  return "General → In Review";
}

/* =========================
   API (server)
========================= */
async function openAiDraft({ apiBase, raw, fields }) {
  const res = await fetch(`${apiBase}/api/openai-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, fields }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Request failed (${res.status})`);
  }
  const data = await res.json();
  return data?.draft || "";
}

/* =========================
   Local save + export
========================= */
const LS_KEY = "ticket_copilot_saved_v1";

function loadSaved() {
  try {
    const j = localStorage.getItem(LS_KEY);
    const arr = j ? JSON.parse(j) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persistSaved(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function exportExcel(items) {
  const rows = items.map((x) => ({
    SavedAt: x.savedAt,
    Itinerary: x.fields?.itinerary || "",
    Guest: x.fields?.guest || "",
    Issue: x.fields?.issue || "",
    Hotel: x.fields?.hotel || "",
    Tags: (x.fields?.tags || []).join(", "),
    MacroSuggestion: x.macroSuggestion || "",
    MacroPreview: x.macro || "",
    DraftReply: x.draft || "",
    Raw: x.raw || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Saved");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `ticket-copilot-${Date.now()}.xlsx`);
}

/* =========================
   App
========================= */
export default function App() {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5050";

  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("Ready");

  const [fields, setFields] = useState({
    itinerary: "",
    guest: "",
    issue: "",
    hotel: "",
    tags: [],
  });

  const [macroSuggestion, setMacroSuggestion] = useState("");
  const [macro, setMacro] = useState("");
  const [draft, setDraft] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [saved, setSaved] = useState(() => loadSaved());

  const charCount = raw.length;

  const riskFlags = useMemo(() => detectRiskFlags(raw), [raw]);

  const canExport = saved.length > 0;

  const macroRef = useRef(null);
  const draftRef = useRef(null);

  // Auto-extract shortly after paste/typing
  useEffect(() => {
    const v = raw.trim();
    if (!v) {
      setStatus("Ready");
      setFields({ itinerary: "", guest: "", issue: "", hotel: "", tags: [] });
      setMacroSuggestion("");
      setMacro("");
      setDraft("");
      setAiError("");
      return;
    }

    const t = setTimeout(() => {
      const extracted = extractFieldsFromZendesk(raw);
      setFields(extracted);

      const mName = suggestMacroName(extracted);
      const m = macroFromFields(extracted);

      setMacroSuggestion(mName);
      setMacro(m);

      // local draft (always available)
      setDraft(m);

      const okAny = !!(
        extracted.itinerary ||
        extracted.guest ||
        extracted.issue ||
        extracted.hotel ||
        (extracted.tags || []).length
      );

      setStatus(okAny ? "Analyzed" : "Analyzed (no fields detected)");
    }, 250);

    return () => clearTimeout(t);
  }, [raw]);

  // Persist saved
  useEffect(() => {
    persistSaved(saved);
  }, [saved]);

  function onAnalyze() {
    // kept for UX, but auto-extract already does it
    const extracted = extractFieldsFromZendesk(raw);
    setFields(extracted);
    const mName = suggestMacroName(extracted);
    const m = macroFromFields(extracted);
    setMacroSuggestion(mName);
    setMacro(m);
    setDraft(m);
    setStatus("Analyzed");
  }

  function onClear() {
    setRaw("");
    setAiError("");
    setAiLoading(false);
    setStatus("Ready");
  }

  async function onOpenAiDraft() {
    setAiError("");
    setAiLoading(true);
    try {
      const text = await openAiDraft({
        apiBase: API_BASE,
        raw,
        fields,
      });
      if (text && typeof text === "string") {
        setDraft(text);
        setStatus("AI Draft Ready");
      } else {
        setAiError("OpenAI returned empty draft.");
      }
    } catch (e) {
      setAiError(String(e?.message || e));
    } finally {
      setAiLoading(false);
    }
  }

  function onSave() {
    const v = raw.trim();
    if (!v) return;

    const entry = {
      id: genId(),
      savedAt: formatNowISO(),
      raw,
      fields,
      macroSuggestion,
      macro,
      draft,
    };

    setSaved((prev) => [entry, ...prev].slice(0, 200));
    setStatus("Saved");
  }

  function onClearSaved() {
    setSaved([]);
    setStatus("Saved cleared");
  }

  function onExport() {
    exportExcel(saved);
    setStatus("Exported");
  }

  function copyText(s) {
    navigator.clipboard?.writeText(String(s || "")).catch(() => {});
  }

  return (
    <div className="tc-page">
      <header className="tc-header">
        <div className="tc-headerLeft">
          <div className="tc-title">Ticket Copilot</div>
          <div className="tc-subtitle">
            Paste Zendesk notes → extract fields → suggest macro → (optional) OpenAI draft → save → export.
          </div>
        </div>

        <div className="tc-headerRight">
          <div className="tc-pill">Chars: {charCount}</div>
          <div className="tc-muted">Keep it clean — remove credit card numbers.</div>
        </div>
      </header>

      <main className="tc-main">
        <section className="tc-card">
          <div className="tc-cardHeader">
            <div className="tc-cardTitle">Paste ticket notes</div>
            <div className="tc-rightTiny">Zendesk / Slack / SMS logs</div>
          </div>

          <textarea
            className="tc-textarea"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste the Zendesk internal note / conversation log here..."
          />

          <div className="tc-actionsBar">
            <div className="tc-actionsLeft">
              <button className="tc-btn" onClick={onAnalyze} disabled={!raw.trim()}>
                Analyze
              </button>
              <button className="tc-btn tc-btnGhost" onClick={onClear} disabled={!raw.trim()}>
                Clear
              </button>
              <div className="tc-status">{status}</div>
            </div>

            <div className="tc-actionsRight">
              <button
                className="tc-btn tc-btnPrimary"
                onClick={onOpenAiDraft}
                disabled={!raw.trim() || aiLoading}
                title="Optional: draft using OpenAI (server call)"
              >
                {aiLoading ? "Drafting..." : "OpenAI Draft Reply"}
              </button>

              <button className="tc-btn tc-btnSuccess" onClick={onSave} disabled={!raw.trim()}>
                Save
              </button>

              <button className="tc-btn" onClick={onExport} disabled={!canExport}>
                Export Excel
              </button>

              <button className="tc-btn tc-btnGhost" onClick={onClearSaved} disabled={!canExport}>
                Clear Saved
              </button>
            </div>
          </div>

          <div className="tc-tip">
            Tip: OpenAI is optional — local draft already works.
            {aiError ? <span className="tc-error"> (OpenAI Draft Error) {aiError}</span> : null}
          </div>
        </section>

        {/* Risk flags */}
        {riskFlags.length > 0 ? (
          <section className="tc-card">
            <div className="tc-cardHeader">
              <div className="tc-cardTitle">Risk Flags</div>
              <div className="tc-rightTiny">Auto-detected warnings from pasted notes</div>
            </div>

            <div className="tc-riskGrid">
              {riskFlags.map((f) => (
                <div key={f.key} className="tc-riskCard">
                  <div className="tc-riskDot" />
                  <div className="tc-riskBody">
                    <div className="tc-riskTitle">{f.title}</div>
                    <div className="tc-riskDesc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Results */}
        <section className="tc-card">
          <div className="tc-cardHeader">
            <div className="tc-cardTitle">Results</div>
            <div className="tc-rightTiny">Auto-filled (no need to click Analyze)</div>
          </div>

          <div className="tc-grid">
            <div className="tc-field">
              <div className="tc-label">Itinerary</div>
              <div className="tc-value">{fields.itinerary || "-"}</div>
            </div>

            <div className="tc-field">
              <div className="tc-label">Issue</div>
              <div className="tc-value">{fields.issue || "-"}</div>
            </div>

            <div className="tc-field">
              <div className="tc-label">Guest</div>
              <div className="tc-value">{fields.guest || "-"}</div>
            </div>

            <div className="tc-field">
              <div className="tc-label">Hotel</div>
              <div className="tc-value">{fields.hotel || "-"}</div>
            </div>

            <div className="tc-field tc-fieldWide">
              <div className="tc-label">Flags</div>
              <div className="tc-tags">
                {(fields.tags || []).length ? (
                  fields.tags.map((t) => (
                    <span key={t} className="tc-tag">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="tc-value">-</span>
                )}
              </div>
            </div>

            <div className="tc-field tc-fieldWide">
              <div className="tc-label">Macro suggestion</div>
              <div className="tc-value">{macroSuggestion || "-"}</div>
            </div>
          </div>
        </section>

        {/* Macro preview */}
        <section className="tc-card">
          <div className="tc-cardHeader">
            <div className="tc-cardTitle">Macro preview</div>
            <div className="tc-rightTiny">
              <button className="tc-miniBtn" onClick={() => copyText(macro)} disabled={!macro.trim()}>
                Copy
              </button>
            </div>
          </div>

          <textarea
            ref={macroRef}
            className="tc-output"
            value={macro}
            onChange={(e) => setMacro(e.target.value)}
            placeholder="(Paste notes to generate)"
          />
        </section>

        {/* Draft reply */}
        <section className="tc-card">
          <div className="tc-cardHeader">
            <div className="tc-cardTitle">Draft reply</div>
            <div className="tc-rightTiny">
              <button className="tc-miniBtn" onClick={() => copyText(draft)} disabled={!draft.trim()}>
                Copy
              </button>
            </div>
          </div>

          <textarea
            ref={draftRef}
            className="tc-output"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="(Paste notes to generate local draft, or click OpenAI Draft Reply)"
          />
        </section>

        {/* Saved */}
        <section className="tc-card">
          <div className="tc-cardHeader">
            <div className="tc-cardTitle">Saved</div>
            <div className="tc-rightTiny">{saved.length ? `${saved.length} item(s)` : "Nothing saved yet"}</div>
          </div>

          {saved.length ? (
            <div className="tc-savedList">
              {saved.slice(0, 10).map((s) => (
                <div key={s.id} className="tc-savedItem">
                  <div className="tc-savedTop">
                    <div className="tc-savedTitle">
                      {s.fields?.itinerary || "No itinerary"} • {s.fields?.guest || "No guest"} • {s.fields?.issue || "No issue"}
                    </div>
                    <div className="tc-savedMeta">{s.savedAt}</div>
                  </div>

                  <div className="tc-savedBtns">
                    <button className="tc-miniBtn" onClick={() => copyText(s.draft || "")}>
                      Copy Draft
                    </button>
                    <button className="tc-miniBtn tc-miniGhost" onClick={() => copyText(s.raw || "")}>
                      Copy Raw
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="tc-muted">Click Save after pasting/analyzing a ticket.</div>
          )}
        </section>

        <footer className="tc-footer">
          Ticket Copilot • Local-first extraction • Optional OpenAI • API: {API_BASE}
        </footer>
      </main>
    </div>
  );
}
