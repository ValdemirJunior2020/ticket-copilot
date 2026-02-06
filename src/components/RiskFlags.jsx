// FILE: /src/components/RiskFlags.jsx
import React, { useMemo } from "react";

export function computeRiskFlags(rawText = "") {
  const text = String(rawText || "");
  const t = text.toLowerCase();

  const flags = [];

  const add = (key, label, detail = "", severity = "med") => {
    if (!flags.some((f) => f.key === key)) flags.push({ key, label, detail, severity });
  };

  if (/(don['’]?t|do not)\s+cancel/.test(t) || /please\s+don['’]?t\s+cancel/.test(t)) {
    add("no_cancel", "Guest said: DO NOT cancel", "High risk if reservation is canceled", "high");
  }

  if (/non[-\s]?refundable/.test(t) || /\bnrf\b/.test(t)) {
    add("non_refundable", "Non-refundable mentioned", "Avoid promises; follow policy", "high");
  }

  if (/\bchargeback\b/.test(t) || /\bdispute\b/.test(t)) {
    add("chargeback", "Chargeback / Dispute", "Use chargeback-safe language", "high");
  }

  if (
    /refund\s+is\s+(being\s+)?processed/.test(t) ||
    /you\s+will\s+receive\s+a\s+refund/.test(t) ||
    /we\s+have\s+issued\s+a\s+refund/.test(t) ||
    /will\s+be\s+refunded/.test(t)
  ) {
    add("refund_promise", "Refund promise risk", "Avoid confirming a refund unless proven", "high");
  }

  const cardLike = text.match(/(?:\b\d[ -]*?){13,19}\b/g);
  if (cardLike && cardLike.some((x) => x.replace(/\D/g, "").length >= 13)) {
    add("card_data", "Possible card number detected", "Remove/redact before saving/exporting", "high");
  }

  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    add("ssn", "Possible SSN detected", "Remove/redact before saving/exporting", "high");
  }

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) {
    add("email", "Email detected", "Be careful copying/exporting", "med");
  }

  if (/\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) {
    add("phone", "Phone number detected", "Be careful copying/exporting", "med");
  }

  if (/\b(call\s+review|recording|no\s+record|call\s+record)\b/.test(t)) {
    add("recording", "Call recording / review requested", "May require verification steps", "med");
  }

  if (/\bcancel(l?ed|lation)\b/.test(t)) {
    add("cancel_word", "Cancellation mentioned", "Verify approval & policy before actions", "med");
  }

  return flags;
}

export default function RiskFlags({ text }) {
  const flags = useMemo(() => computeRiskFlags(text), [text]);
  if (!flags.length) return null;

  return (
    <div className="tc-risk">
      <div className="tc-riskHead">
        <div className="tc-riskTitle">Risk Flags</div>
        <div className="tc-riskSub">Auto-detected warnings from pasted notes</div>
      </div>

      <div className="tc-riskGrid">
        {flags.map((f) => (
          <div
            key={f.key}
            className={`tc-riskBadge ${f.severity === "high" ? "is-high" : "is-med"}`}
            title={f.detail || f.label}
          >
            <span className="tc-riskDot" />
            <span className="tc-riskLabel">{f.label}</span>
            {f.detail ? <span className="tc-riskDetail">{f.detail}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
