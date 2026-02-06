// FILE: /src/lib/analyze.js
function pickFirstMatch(text, regex) {
  const m = text.match(regex);
  return m ? m[1] : "";
}

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function guessIssue(t) {
  const s = t.toLowerCase();
  if (/(chargeback|dispute|disputed|bank|issuer)/i.test(s)) return "Chargeback / Dispute";
  if (/(refund|reimburse|refunded|money back)/i.test(s)) return "Refund Request";
  if (/(declined virtual card|vc is declining|virtual card|vc issue)/i.test(s)) return "VC Issue / Hotel Needs Payment";
  if (/(cancel|cancellation)/i.test(s)) return "Cancellation Request";
  if (/(legal|lawsuit|attorney|sue)/i.test(s)) return "Legal Threat";
  return "General Support";
}

function buildFlags(t) {
  const s = t.toLowerCase();
  const flags = [];
  if (/(chargeback|dispute|disputed)/i.test(s)) flags.push("dispute");
  if (/(legal|lawsuit|attorney|sue)/i.test(s)) flags.push("legal");
  if (/(refund|reimburse|money back)/i.test(s)) flags.push("refund");
  if (/(declined virtual card|vc is declining|virtual card)/i.test(s)) flags.push("vc");
  if (/(hung up|disconnect|disconnected)/i.test(s)) flags.push("disconnect");
  return Array.from(new Set(flags));
}

export function analyzeTicket(raw) {
  const text = String(raw || "");
  const itinerary = pickFirstMatch(text, /\b(H\d{6,})\b/i);
  // tries: "Guest's NAME: JOHN DOE" or "Requester John Doe" or "Dear John"
  let guestName =
    pickFirstMatch(text, /GUEST(?:'s)?\s*NAME:\s*([A-Z][A-Z\s.'-]{2,})/i) ||
    pickFirstMatch(text, /Requester\s+([A-Z][A-Za-z\s.'-]{2,})/i) ||
    pickFirstMatch(text, /Dear\s+([A-Z][A-Za-z\s.'-]{2,})/i);

  guestName = normalizeSpaces(guestName);

  // hotel name guess (common patterns)
  let hotelName =
    pickFirstMatch(text, /reservation at\s+(.+?)\s+for\s+/i) ||
    pickFirstMatch(text, /at\s+(Hampton Inn.+?)(?:\s+for|\s+\(|\s+\-|$)/i) ||
    pickFirstMatch(text, /Hotel Name:\s*(.+?)\s*(?:\r?\n|$)/i);

  hotelName = normalizeSpaces(hotelName);

  const issue = guessIssue(text);
  const flags = buildFlags(text);

  const outputs = {
    draftReply: localDraft({ itinerary, guestName, hotelName, issue, flags }),
  };

  return {
    fields: { itinerary, guestName, hotelName, issue, flags },
    outputs,
  };
}

function localDraft({ itinerary, guestName, issue, flags }) {
  const name = guestName || "[Name]";
  const itin = itinerary || "H_______";

  if (flags.includes("dispute")) {
    return `Dear ${name},

This response is related to your reservation for Itinerary # ${itin}.

We received a notification that the booking amount has been disputed through your card issuer. When a notice of a disputed charge is received, we are locked out of the refund process while the dispute is under review with your banking institution. As there is no manual override in this process, we must close your ticket pending the dispute review (which can take up to 90 days).

If you have documentation from your bank/credit card issuer confirming the dispute was closed or withdrawn, please email ChargeReview@HotelPlanner.com with that proof so our team can review next steps.

Thank you for your patience.

Sincerely,
Travel Support`;
  }

  if (issue === "Refund Request") {
    return `Dear ${name},

This response is related to your reservation for Itinerary # ${itin}.

Thank you for contacting us. We’re reviewing your request and will follow up by email as soon as possible. If approved, refund timing depends on the payment method and bank processing.

Sincerely,
Travel Support`;
  }

  return `Dear ${name},

This response is related to your reservation for Itinerary # ${itin}.

Thank you for contacting us. We’re reviewing the details and will follow up by email as soon as possible.

Sincerely,
Travel Support`;
}
