// FILE: /src/App.jsx
import React, { useMemo, useState } from "react";
import { extractFields } from "./lib/extract";
import "./style.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5050";

const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

function detectRiskFlags(text) {
  const t = String(text || "");
  const out = [];

  const hasPhone = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/.test(t);
  const hasCC = /\b(?:\d[ -]*?){13,16}\b/.test(t) && /\b(?:visa|mastercard|amex|discover)\b/i.test(t) === false;
  const refundPromise = /\b(refund (is|will be|has been) (processed|approved|issued)|you will receive a refund|we will refund)\b/i.test(t);

  if (refundPromise) out.push({ key: "refund_promise", title: "Refund promise risk", desc: "Avoid confirming a refund unless proven." });
  if (hasPhone) out.push({ key: "phone", title: "Phone number detected", desc: "Be careful copying/exporting." });
  if (hasCC) out.push({ key: "cc", title: "Possible card number detected", desc: "Remove payment data before saving/exporting." });

  if (/\b(call review|recording|call record|no record for the call)\b/i.test(t)) {
    out.push({ key: "callreview", title: "Call recording / review requested", desc: "May require verification steps." });
  }

  return out;
}

export default function App() {
  const [raw, setRaw] = useState("");
  const [fields, setFields] = useState({ itinerary: "-", issue: "-", guest: "-", hotel: "-", flags: "-" });

  const [macroSuggestion, setMacroSuggestion] = useState("-");
  const [macroPreview, setMacroPreview] = useState("");
  const [draft, setDraft] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [busyAI, setBusyAI] = useState(false);
  const [saved, setSaved] = useState([]);
  const [status, setStatus] = useState("Ready");

  const riskFlags = useMemo(() => detectRiskFlags(raw), [raw]);
  const chars = raw.length;

  function analyze() {
    const f = extractFields(raw);
    setFields(f);

    // Simple macro suggestion based on issue/flags
    let sug = "General → In Review";
    if (/chargeback/i.test(f.issue) || /chargeback/i.test(f.flags)) sug = "Chargeback → In Review (No Promise)";
    else if (/refund/i.test(f.issue) || /refund/i.test(f.flags)) sug = "Refund Request → In Review (No Promise)";
    else if (/call recording|review/i.test(f.issue) || /call-review/i.test(f.flags)) sug = "Call Review → Verification Needed";

    setMacroSuggestion(sug);

    // Macro preview template (no AI)
    const itin = f.itinerary !== "-" ? f.itinerary : "[ITIN]";
    const name = f.guest !== "-" ? f.guest : "[Name]";
    const preview = `Dear ${name},

This response is related to your reservation for Itinerary # ${itin}.

We are reviewing your request and will provide an update as soon as possible. If approved, timing depends on the payment method and bank processing.

Sincerely,
Travel Support`;
    setMacroPreview(preview);

    // Local draft (still editable)
    const localDraft = `Dear ${name},

This response is related to your reservation for Itinerary # ${itin}.

Thanks for contacting us. We’re reviewing your request and will follow up by email as soon as possible. If approved, refund timing depends on the payment method/bank processing.

Sincerely,
Travel Support`;
    setDraft(localDraft);

    setStatus("Analyzed");
  }

  function clearAll() {
    setRaw("");
    setFields({ itinerary: "-", issue: "-", guest: "-", hotel: "-", flags: "-" });
    setMacroSuggestion("-");
    setMacroPreview("");
    setDraft("");
    setAiDraft("");
    setStatus("Cleared");
  }

  async function openAiDraft() {
    setBusyAI(true);
    setStatus("Generating AI draft...");
    try {
      const res = await fetch(`${API_BASE}/api/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw,
          extracted: fields,
          currentDraft: draft || macroPreview,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAiDraft(String(data?.draft || "").trim());
      setStatus("AI draft ready");
    } catch (e) {
      setStatus(`OpenAI Draft Error: ${e?.message || "Failed"}`);
    } finally {
      setBusyAI(false);
    }
  }

  function saveRow() {
    if (!raw.trim()) return;
    const row = {
      id: genId(),
      ts: new Date().toISOString(),
      itinerary: fields.itinerary,
      issue: fields.issue,
      guest: fields.guest,
      hotel: fields.hotel,
      flags: fields.flags,
      macroSuggestion,
      draft: aiDraft || draft || "",
      raw,
    };
    setSaved((p) => [row, ...p]);
    setStatus("Saved");
  }

  async function exportExcel() {
    setStatus("Exporting...");
    try {
      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: saved }),
      });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-copilot-export.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Exported");
    } catch (e) {
      setStatus(`Export Error: ${e?.message || "Failed"}`);
    }
  }

  return (
    <div className="tc-page">
      <header className="tc-header">
        <div className="tc-title">Ticket Copilot</div>
        <div className="tc-sub">Paste Zendesk notes → extract fields → suggest macro → (optional) OpenAI draft → save → export.</div>
      </header>

      <section className="tc-card">
        <div className="tc-cardHead">
          <div className="tc-cardTitle">Paste ticket notes</div>
          <div className="tc-cardMeta">
            <span className="tc-pill">Chars: {chars}</span>
            <span className="tc-pill">Keep it clean — remove credit card numbers.</span>
          </div>
        </div>

        <textarea
          className="tc-textarea"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste the Zendesk internal note / conversation log here..."
        />

        {!!riskFlags.length && (
          <div className="tc-riskWrap">
            <div className="tc-riskTop">
              <div className="tc-riskTitle">Risk Flags</div>
              <div className="tc-riskHint">Auto-detected warnings from pasted notes</div>
            </div>

            <div className="tc-riskGrid">
              {riskFlags.map((r) => (
                <div key={r.key} className="tc-riskCard">
                  <div className="tc-riskDot" />
                  <div className="tc-riskBody">
                    <div className="tc-riskName">{r.title}</div>
                    <div className="tc-riskDesc">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tc-actions">
          <button className="tc-btn" onClick={analyze}>Analyze</button>
          <button className="tc-btn tc-btnGhost" onClick={clearAll}>Clear</button>

          <div className="tc-actionsRight">
            <button className="tc-btn tc-btnBlue" onClick={openAiDraft} disabled={busyAI || !raw.trim()}>
              {busyAI ? "Generating..." : "OpenAI Draft Reply"}
            </button>
            <button className="tc-btn tc-btnGreen" onClick={saveRow} disabled={!raw.trim()}>
              Save
            </button>
            <button className="tc-btn tc-btnGhost" onClick={exportExcel} disabled={!saved.length}>
              Export Excel
            </button>
          </div>
        </div>

        <div className="tc-tipRow">
          <div className="tc-tip">Tip: OpenAI is optional — local draft already works.</div>
          <div className="tc-status">{status}</div>
        </div>
      </section>

      <section className="tc-card">
        <div className="tc-cardHead">
          <div className="tc-cardTitle">Results</div>
        </div>

        <div className="tc-grid">
          <div className="tc-kv">
            <div className="tc-k">Itinerary</div>
            <div className="tc-v">{fields.itinerary}</div>
          </div>
          <div className="tc-kv">
            <div className="tc-k">Issue</div>
            <div className="tc-v">{fields.issue}</div>
          </div>
          <div className="tc-kv">
            <div className="tc-k">Guest</div>
            <div className="tc-v">{fields.guest}</div>
          </div>
          <div className="tc-kv">
            <div className="tc-k">Hotel</div>
            <div className="tc-v">{fields.hotel}</div>
          </div>
          <div className="tc-kv">
            <div className="tc-k">Flags</div>
            <div className="tc-v">{fields.flags}</div>
          </div>
          <div className="tc-kv">
            <div className="tc-k">Macro suggestion</div>
            <div className="tc-v">{macroSuggestion}</div>
          </div>
        </div>

        <div className="tc-split">
          <div className="tc-panel">
            <div className="tc-panelHead">
              <div className="tc-panelTitle">Macro preview</div>
              <button className="tc-miniBtn" onClick={() => navigator.clipboard.writeText(macroPreview || "")} disabled={!macroPreview}>
                Copy
              </button>
            </div>
            <textarea className="tc-box" readOnly value={macroPreview} placeholder="(Analyze to generate)" />
          </div>

          <div className="tc-panel">
            <div className="tc-panelHead">
              <div className="tc-panelTitle">Draft reply</div>
              <button className="tc-miniBtn" onClick={() => navigator.clipboard.writeText((aiDraft || draft || "") + "")} disabled={!(aiDraft || draft)}>
                Copy
              </button>
            </div>
            <textarea
              className="tc-box"
              value={aiDraft || draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="(Analyze to generate local draft, or click OpenAI Draft Reply)"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
