import React from "react";

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
      <div className="text-xs text-white/60">{label}</div>
      <div className="max-w-[70%] text-right text-sm font-medium break-words">{value || <span className="text-white/30">—</span>}</div>
    </div>
  );
}

export default function ExtractedFields({ categoryLabel, fields }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold">Detected</h2>
      <div className="mt-3 space-y-1">
        <Row label="Category" value={categoryLabel} />
        <Row label="Subject" value={fields?.detectedSubject} />
        <Row label="Itinerary" value={fields?.itinerary} />
        <Row label="Guest/Requester" value={fields?.guestName} />
        <Row label="Hotel" value={fields?.hotelName} />
        <Row label="Dates" value={fields?.dates} />
        <Row label="Hotel/Guest email" value={fields?.hotelEmail} />
        <Row label="Assignee/Agent" value={fields?.agentName} />
      </div>
    </div>
  );
}
