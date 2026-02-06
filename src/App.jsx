// ✅ FILE: /src/App.jsx
import React, { useMemo, useState } from "react";
import "./style.css";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:5050").replace(/\/+$/, "");

/** Extract core fields from Zendesk paste */
function extractFieldsFromZendesk(rawText) {
  const raw = String(rawText || "");
  const text = raw
    .replace(/\r/g, "")
    .replace(/[•·]/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

  const lower = text.toLowerCase();

  // ---------- Itinerary ----------
  let itinerary = "";
  const it1 =
    text.match(/(?:itinerary\s*(?:number)?\s*[:#]?\s*)(H\d{6,})/i) ||
    text.match(/(?:itinerary\s*#\s*)(H\d{6,})/i);
  if (it1?.[1]) itinerary = it1[1].toUpperCase();

  if (!itinerary) {
    const it2 = text.match(/\bH\d{6,}\b/);
    if (it2?.[0]) itinerary = it2[0].toUpperCase();
  }

  // ---------- Guest name ----------
  let guest = "";
  const g1 = text.match(/guest\s*name\s*[:\-]\s*([A-Z][A-Z '\-]{2,})(?=\s|$)/i);
  if (g1?.[1]) guest = g1[1].trim();

  if (!guest) {
    const g2 = text.match(/\bto:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/);
    if (g2?.[1]) guest = g2[1].trim();
  }

  if (!guest) {
    const lines = raw
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const bad = /internal|show more|dec|jan|to:|phone:|ticket|standard|wns|channel managers/i;
    const nameLine = lines.find((l) => {
      if (bad.test(l)) return false;
      if (!/^[A-Za-z][A-Za-z '\-]+$/.test(l)) return false;
      const wc = l.split(/\s+/).length;
      return wc >= 2 && wc <= 4;
    });
    if (nameLine) guest = nameLine.trim();
  }

  // ---------- Issue (simple classifier) ----------
  let issue = "";
  const hasCallReview = /call review|call recording|ticketreview/.test(lower);
  const hasRefund = /refund|partial refund/.test(lower);
  const hasChargeback = /chargeback|dispute/.test(lower);
  const hasJacuzzi = /jacuzzi/.test(lower);
  const hasRoomType = /room type|booked room|booking error/.test(lower);

  if (hasChargeback) issue = "Chargeback / Dispute";
  else if (hasRefund && hasRoomType) issue = "Refund Request (Booking / Room Type Issue)";
  else if (hasRefund) issue = "Refund Request";
  else if (hasCallReview && hasJacuzzi) issue = "Call Review (Amenity Mismatch / Jacuzzi)";
  else if (hasCallReview) issue = "Call Review Requested";
  else if (hasJacuzzi) issue = "Amenity Issue (Jacuzzi)";
  else issue = "";

  // ---------- Hotel (optional) ----------
  let hotel = "";
  const h1 = text.match(/\bhotel\s*name\s*[:\-]\s*([A-Za-z0-9&'().,\- ]{3,})/i);
  if (h1?.[1]) hotel = h1[1].trim();

  // ---------- Tags / flags ----------
  const tags = [];
  if (hasRefund) tags.push("refund");
  if (hasChargeback) tags.push("chargeback");
  if (hasCallReview) tags.push("call_review");
  if (hasJacuzzi) tags.push("amenity");
  if (/\bphone\b|\+\d/.test(lower)) tags.push("phone_present");

  return {
    itinerary: itinerary || "",
    guest: guest || "",
    issue: issue || "",
    hotel: hotel || "",
    tags,
  };
}

function buildLocalDraft(extracted) {
  const it = extracted?.itinerary ? `Itinerary # ${extracted.itinerary}` : "your reservation";
  const name = extracted?.guest ? extracted.guest : "there";
  const issue = extracted?.issue ? extracted.issue : "your request";

  return `Dear ${name},

This response is related to ${it}.

Thanks for contacting us. We’re reviewing ${issue} and will follow up by email as soon as possible. If any refund is approved, timing depends on the bank/payment method processing.

Sincerely,
Travel Support`;
}

function buildRiskFlags(rawText) {
  const t = String(rawText || "").toLowerCase();
  const flags = [];

  const add = (key, label) => flags.push({ key, label });

  if (/chargeback|dispute|fraud/.test(t)) add("chargeback", "Chargeback / Dispute mention");
  if (/refund|partial refund/.test(t)) add("refund", "Refund mentioned");
  if (/call review|call recording|ticketreview/.test(t)) add("call_review", "Call review requested");
  if (/escalat|supervisor|manager/.test(t)) add("escalation", "Escalation requested");
  if (/angry|upset|frustrat|unaccept|lawsuit|attorney/.test(t)) add("tone", "High-friction customer tone");
  if (/bbb|fbi|fcc|ftc|state attorney|consumer affairs/.test(t)) add("complaint", "Threat of complaint/report");

  // de-dupe
  const seen = new Set();
  return flags.filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)));
}

async function fetchOpenAIDraft(payload) {
  const res = await fetch(`${API_BASE}/api/openai-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data?.draft || "";
}

export default function App() {
  const [raw, setRaw] = useState("");
  const [extracted, setExtracted] = useState({ itinerary: "", guest: "", issue: "", hotel: "", tags: [] });
  const [localDraft, setLocalDraft] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const risks = useMemo(() => buildRiskFlags(raw), [raw]);

  const onAnalyze = () => {
    const fields = extractFieldsFromZendesk(raw);
    setExtracted(fields);
    setLocalDraft(buildLocalDraft(fields));
    setStatus("Analyzed.");
  };

  const onClear = () => {
    setRaw("");
    setExtracted({ itinerary: "", guest: "", issue: "", hotel: "", tags: [] });
    setLocalDraft("");
    setAiDraft("");
    setStatus("Cleared.");
  };

  const onOpenAIDraft = async () => {
    try {
      setBusy(true);
      setStatus("");
      const fields = extractFieldsFromZendesk(raw);
      setExtracted(fields);
      setLocalDraft(buildLocalDraft(fields)); // keep local draft (do NOT clear info)

      const draft = await fetchOpenAIDraft({ notes: raw, extracted: fields });
      setAiDraft(draft);
      setStatus("OpenAI draft ready.");
    } catch (e) {
      setStatus(`(OpenAI Draft Error) ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tc-page">
      <header className="tc-header">
        <div className="tc-title">Ticket Copilot</div>
        <div className="tc-sub">Paste Zendesk notes → Analyze → get fields + draft reply.</div>
      </header>

      <main className="tc-main">
        <section className="tc-card">
          <div className="tc-label">Zendesk Notes</div>

          <textarea
            className="tc-textarea"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste the Zendesk internal note / conversation log here..."
          />

          <div className="tc-actionsBar">
            <div className="tc-actionsLeft">
              <button className="tc-btn" onClick={onAnalyze} disabled={!raw.trim() || busy}>
                Analyze
              </button>
              <button className="tc-btn tc-btnGhost" onClick={onClear} disabled={busy}>
                Clear
              </button>
            </div>

            <div className="tc-actionsRight">
              <button className="tc-btn tc-btnAi" onClick={onOpenAIDraft} disabled={!raw.trim() || busy}>
                {busy ? "Working..." : "OpenAI Draft Reply"}
              </button>
            </div>
          </div>

          {status ? <div className="tc-status">{status}</div> : null}
        </section>

        <section className="tc-grid">
          <div className="tc-card">
            <div className="tc-label">Extracted</div>
            <div className="tc-kv">
              <div className="tc-k">
                <span>Itinerary</span>
                <strong>{extracted.itinerary || "—"}</strong>
              </div>
              <div className="tc-k">
                <span>Guest</span>
                <strong>{extracted.guest || "—"}</strong>
              </div>
              <div className="tc-k">
                <span>Issue</span>
                <strong>{extracted.issue || "—"}</strong>
              </div>
              <div className="tc-k">
                <span>Hotel</span>
                <strong>{extracted.hotel || "—"}</strong>
              </div>
            </div>

            <div className="tc-label" style={{ marginTop: 14 }}>
              Risk Flags
            </div>
            {risks.length ? (
              <div className="tc-flags">
                {risks.map((r) => (
                  <span key={r.key} className="tc-flag tc-flagRed">
                    {r.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="tc-muted">No risk flags detected.</div>
            )}
          </div>

          <div className="tc-card">
            <div className="tc-label">Local Draft (works without OpenAI)</div>
            <pre className="tc-draft">{localDraft || "—"}</pre>

            <div className="tc-label" style={{ marginTop: 14 }}>
              OpenAI Draft
            </div>
            <pre className="tc-draft">{aiDraft || "—"}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}
