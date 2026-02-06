// FILE: /src/lib/extract.js

const clean = (s = "") =>
  String(s)
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .trim();

const firstMatch = (text, patterns) => {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return clean(m[1]);
  }
  return "";
};

export function extractFields(raw) {
  const text = clean(raw);
  const lc = text.toLowerCase();

  // --- Itinerary ---
  // supports: "Itinerary Number: H123", "Itinerary # H123", "Itinerary: 123", "H12345678" anywhere
  const itinerary =
    firstMatch(text, [
      /\bItinerary(?:\s*Number)?\s*[:#-]\s*([A-Z]?\d{6,12})\b/i,
      /\bItin(?:erary)?\s*[:#-]\s*([A-Z]?\d{6,12})\b/i,
      /\b([A-Z]\d{7,12})\b/i, // H######## etc
    ]) || "-";

  // --- Guest ---
  // supports: "Guest Name: John Doe", "Name: John Doe", "Dear John,"
  let guest =
    firstMatch(text, [
      /\bGuest\s*Name\s*[:#-]\s*([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,4})\b/i,
      /\bName\s*[:#-]\s*([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,4})\b/i,
      /\bDear\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,4})\b/i,
    ]) || "-";

  // If guest looks like "Rooms" or "Hotel" due to messy paste, discard
  if (guest !== "-" && /\b(rooms?|hotel|itinerary|status|check\s*in)\b/i.test(guest)) guest = "-";

  // --- Hotel ---
  // supports: "Hotel: X", "Property: X", "at the X", "We'll be staying at the X"
  let hotel =
    firstMatch(text, [
      /\bHotel\s*[:#-]\s*([^\n]{3,80})/i,
      /\bProperty\s*[:#-]\s*([^\n]{3,80})/i,
      /\bstaying at (?:the\s+)?([A-Za-z0-9&'().,\- ]{3,80})/i,
      /\bat the (?:hotel\s+)?([A-Za-z0-9&'().,\- ]{3,80})/i,
    ]) || "-";

  // Trim hotel junk
  if (hotel !== "-") {
    hotel = hotel.replace(/\b(rooms?|status|itinerary|check\s*in|check\s*out)\b.*$/i, "").trim();
    if (hotel.length < 3) hotel = "-";
  }

  // --- Issue (simple classification) ---
  const issueRules = [
    ["Chargeback / Dispute", /\bcharge\s*back\b|\bchargeback\b|\bdispute\b|\bcb\b/],
    ["Refund Request", /\brefund\b|\breimburse\b|\bcredit\b|\bpartial refund\b/],
    ["Cancellation", /\bcancel\b|\bcancellation\b/],
    ["Modify Dates", /\bchange\b.*\bdate\b|\bmodify\b.*\bdate\b|\bdate change\b/],
    ["Call Recording / Review", /\bcall\b.*\brecord\b|\brecording\b|\bcall review\b|\breview requested\b/],
    ["No Record / Missing Call", /\bno record\b|\bmissing\b.*\bcall\b|\bno call\b.*\bfound\b/],
  ];

  let issue = "-";
  for (const [label, re] of issueRules) {
    if (re.test(lc)) {
      issue = label;
      break;
    }
  }

  // --- Flags (keywords) ---
  const flags = [];
  if (/\brefund\b|\breimburse\b|\bcredit\b|\bpartial refund\b/i.test(text)) flags.push("refund");
  if (/\bcharge\s*back\b|\bchargeback\b|\bdispute\b/i.test(text)) flags.push("chargeback");
  if (/\bcall\b.*\brecord\b|\brecording\b|\bcall review\b/i.test(text)) flags.push("call-review");
  if (/\bmanager\b|\bsupervisor\b|\bescalat/i.test(text)) flags.push("escalation");
  if (/\bnon[-\s]?refundable\b/i.test(text)) flags.push("nonref");

  return {
    itinerary,
    guest,
    hotel,
    issue,
    flags: flags.length ? Array.from(new Set(flags)).join(", ") : "-",
  };
}