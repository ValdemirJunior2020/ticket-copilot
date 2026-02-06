// FILE: C:\Users\Valdemir Goncalves\Desktop\Projetos-2026\ticket-copilot\src\App.jsx
import React, { useMemo, useState } from "react";
import "./style.css";

function extractFields(raw) {
  const text = String(raw || "");

  const itinMatch =
    text.match(/\b(?:H|ITIN|Itin(?:erary)?)\s*#?:?\s*([A-Z0-9-]{6,})\b/i) ||
    text.match(/\b([A-Z]\d{6,})\b/);

  const itinerary = itinMatch?.[1] || "";

  const lower = text.toLowerCase();
  const flags = [];
  if (/\brefund\b/.test(lower)) flags.push("refund");
  if (/\bchargeback\b|\bdispute\b/.test(lower)) flags.push("chargeback");
  if (/\bcancel\b|\bcancellation\b/.test(lower)) flags.push("cancel");
  if (/\bno[-\s]?show\b/.test(lower)) flags.push("no-show");

  let issue = "";
  if (flags.includes("chargeback")) issue = "Chargeback / Dispute";
  else if (flags.includes("refund")) issue = "Refund Request";
  else if (flags.includes("cancel")) issue = "Cancellation";
  else issue = "General Inquiry";

  const guestMatch =
    text.match(/\bGuest[:\s]+([^\n\r]+)\b/i) ||
    text.match(/\bName[:\s]+([^\n\r]+)\b/i);
  const guest = (guestMatch?.[1] || "").trim();

  const hotelMatch = text.match(/\bHotel[:\s]+([^\n\r]+)\b/i);
  const hotel = (hotelMatch?.[1] || "").trim();

  const macro = {
    title:
      issue === "Refund Request"
        ? "Refund Request → In Review (No Promise)"
        : issue === "Chargeback / Dispute"
        ? "Chargeback → Received (In Review)"
        : issue === "Cancellation"
        ? "Cancellation → Confirm Details"
        : "General → Acknowledge + Next Steps",
  };

  const macroPreview = `Dear [Name],

This response is related to your reservation for Itinerary # ${itinerary || "[ITIN]"}.

We are in the process of reviewing your request. We will provide an update as soon as possible. If approved, refund timing depends on the payment method and bank processing.

Sincerely,
Travel Support`;

  const localDraft = `Dear ${guest || "[Name]"},\n\nThis response is related to your reservation for Itinerary # ${
    itinerary || "[ITIN]"
  }.\n\nThanks for contacting us. We’re reviewing your request and will follow up by email as soon as possible. If approved, refund timing depends on the payment method/bank processing.\n\nSincerely,\nTravel Support`;

  return {
    fields: { itinerary, issue, guest, hotel, flags },
    macro,
    macroPreview,
    localDraft,
  };
}

export default function App() {
  const [raw, setRaw] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [draft, setDraft] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [saved, setSaved] = useState([]);

  const chars = useMemo(() => raw.length, [raw]);

  function onAnalyze() {
    const a = extractFields(raw);
    setAnalysis(a);
    setDraft(a.localDraft);
  }

  async function onOpenAiDraft() {
    try {
      setAiBusy(true);
      const res = await fetch("http://localhost:5050/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw,
          analysis,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "OpenAI Draft Error");
      if (data?.draft) setDraft(data.draft);
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setAiBusy(false);
    }
  }

  function onSave() {
    if (!analysis) return;
    const row = {
      ts: new Date().toISOString(),
      itinerary: analysis.fields.itinerary,
      issue: analysis.fields.issue,
      guest: analysis.fields.guest,
      hotel: analysis.fields.hotel,
      flags: (analysis.fields.flags || []).join(", "),
      draft,
    };
    setSaved((prev) => [row, ...prev]);
  }

  function onExportExcel() {
    // Simple CSV export (opens in Excel)
    const rows = saved;
    if (!rows.length) return;

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ticket-copilot-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tc-page">
      <header className="tc-header">
        <div className="tc-title">Ticket Copilot</div>
        <div className="tc-sub">
          Paste Zendesk notes → extract fields → suggest macro → (optional) OpenAI draft → save → export.
        </div>
      </header>

      <section className="tc-card">
        <div className="tc-row">
          <div className="tc-cardTitle">Paste ticket notes</div>
          <div className="tc-rightHint">
            <span className="tc-badge">Chars: {chars}</span>
            <span className="tc-muted">Keep it clean — remove credit card numbers.</span>
          </div>
        </div>

        <textarea
          className="tc-textarea"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste the Zendesk internal note / conversation log here..."
        />

        <div className="tc-actions">
          <button className="tc-btn" onClick={onAnalyze} disabled={!raw.trim()}>
            Analyze
          </button>

          <button
            className="tc-btn tc-btnGhost"
            onClick={() => {
              setRaw("");
              setAnalysis(null);
              setDraft("");
            }}
          >
            Clear
          </button>

          <div className="tc-spacer" />

          <button className="tc-btn tc-btnAi" onClick={onOpenAiDraft} disabled={!raw.trim() || aiBusy}>
            {aiBusy ? "Drafting..." : "OpenAI Draft Reply"}
          </button>

          <button className="tc-btn tc-btnSave" onClick={onSave} disabled={!analysis}>
            Save
          </button>

          <button className="tc-btn tc-btnExport" onClick={onExportExcel} disabled={!saved.length}>
            Export Excel
          </button>
        </div>

        <div className="tc-hint">Tip: OpenAI is optional — local draft already works.</div>
      </section>

      <section className="tc-card">
        <div className="tc-cardTitle">Results</div>

        <div className="tc-grid">
          <div className="tc-field">
            <div className="tc-label">Itinerary</div>
            <div className="tc-value">{analysis?.fields?.itinerary || "-"}</div>
          </div>

          <div className="tc-field">
            <div className="tc-label">Issue</div>
            <div className="tc-value">{analysis?.fields?.issue || "-"}</div>
          </div>

          <div className="tc-field">
            <div className="tc-label">Guest</div>
            <div className="tc-value">{analysis?.fields?.guest || "-"}</div>
          </div>

          <div className="tc-field">
            <div className="tc-label">Hotel</div>
            <div className="tc-value">{analysis?.fields?.hotel || "-"}</div>
          </div>

          <div className="tc-field">
            <div className="tc-label">Flags</div>
            <div className="tc-value">{(analysis?.fields?.flags || []).join(", ") || "-"}</div>
          </div>

          <div className="tc-field">
            <div className="tc-label">Macro suggestion</div>
            <div className="tc-value">{analysis?.macro?.title || "-"}</div>
          </div>
        </div>

        <div className="tc-split">
          <div className="tc-col">
            <div className="tc-labelRow">
              <span className="tc-label">Macro preview</span>
              <button className="tc-copy" onClick={() => navigator.clipboard.writeText(analysis?.macroPreview || "")}>
                Copy
              </button>
            </div>
            <textarea className="tc-textareaSmall" readOnly value={analysis?.macroPreview || ""} />
          </div>

          <div className="tc-col">
            <div className="tc-labelRow">
              <span className="tc-label">Draft reply</span>
              <button className="tc-copy" onClick={() => navigator.clipboard.writeText(draft || "")}>
                Copy
              </button>
            </div>
            <textarea
              id="draft-reply-box"
              className="tc-textareaSmall"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Analyze first, then click OpenAI Draft Reply (optional)..."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
