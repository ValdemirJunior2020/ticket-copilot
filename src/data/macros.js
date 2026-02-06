export const MACROS = [
  {
    key: "dispute_charge_review",
    label: "Dispute / Chargeback — Charge Review Lockout",
    category: "DISPUTE",
    emailTemplate: ({ itinerary, guestName }) => `Dear ${guestName || "Guest"},

This response is related to your reservation for Itinerary # ${itinerary || "[ITINERARY]"}.

We received a notification that the booking amount has been disputed through your card issuer. When a notice of a disputed charge is received, we are locked out of the refund process while the dispute is under review with your banking institution. As there is no manual override, we must hold action on the refund process until the dispute is closed, which can take up to 90 days.

If you have documentation from your bank/card issuer confirming the dispute was withdrawn or closed, please provide it (see requirements below) so our Charge Review team can proceed:
- Screenshot from the bank’s secure online messaging portal OR a photo of a letter on bank letterhead (not a forwarded email)
- Must state the cardholder withdrew/dropped the dispute OR the bank closed the dispute
- Must include cardholder name, last 4 digits, and dispute amount (must match)

You may also contact: ChargeReview@HotelPlanner.com

Thank you for your patience.

Sincerely,
Travel Support`,
    internalNoteTemplate: ({ agentName, itinerary, guestName, slaDays }) =>
`Ticket Concern: DISPUTE/CHARGEBACK. Guest contacted us re: dispute reason and requests assistance.
Explained dispute lockout: no refund processing while dispute is under review (can take up to 90 days). Requested dispute-closed documentation (bank portal screenshot or bank letterhead; must include cardholder name, last 4 digits, amount).
Itinerary: ${itinerary || "[ITINERARY]"} | Guest: ${guestName || "[GUEST]"} | Update ETA: ${slaDays || "N/A"} // EOC ${agentName || "[AGENT]"}`,
    slackTemplate: ({ itinerary }) =>
`Dispute/Chargeback received | Itin: ${itinerary || "[ITIN]"} | Refund lockout. Requesting dispute-closed documentation; advise next steps if needed.`
  },
  {
    key: "vc_followup_hotel_payment_support",
    label: "Hotel Needs Payment/Support — VC Declined Follow-up",
    category: "VC_ISSUE",
    emailTemplate: ({ itinerary, guestName }) => `Dear ${guestName || "Guest"},

This response is related to your reservation for Itinerary # ${itinerary || "[ITINERARY]"}.

We are in the process of reviewing your request and coordinating with the appropriate team. We will provide an update as soon as possible. We appreciate your patience regarding this matter.

Sincerely,
Travel Support`,
    internalNoteTemplate: ({ agentName, itinerary, guestName, callerName, hotelEmail, slaDays }) =>
`::STANDARD::~Hotel Needs Payment or Support, ${callerName || "Hotel"} called for a follow-up regarding a declined virtual card.
I advised that I would be creating a follow-up ticket with our escalations team to ensure proper handling.
Proper expectations were set: update will be provided via email within ${slaDays || "1–2"} business days.
Verified email: ${hotelEmail || "[HOTEL EMAIL]"}.
Itinerary: ${itinerary || "[ITINERARY]"} | Guest: ${guestName || "[GUEST]"} // EOC ${agentName || "[AGENT]"}`,
    slackTemplate: ({ itinerary, hotelEmail }) =>
`Follow-up needed — VC Declined / Hotel Needs Payment or Support | Itin: ${itinerary || "[ITIN]"} | Hotel email: ${hotelEmail || "[EMAIL]"} | Please advise status / proof sent / next action.`
  },
  {
    key: "refund_followup",
    label: "Refund — Follow-up / Status Update",
    category: "REFUND",
    emailTemplate: ({ itinerary, guestName }) => `Dear ${guestName || "Guest"},

This response is related to your reservation for Itinerary # ${itinerary || "[ITINERARY]"}.

We have received your request and it is currently under review. We will provide an update as soon as possible. Thank you for your patience.

Sincerely,
Travel Support`,
    internalNoteTemplate: ({ agentName, itinerary, guestName, slaDays }) =>
`Refund follow-up requested by guest. Verified itinerary and details.
Set expectations: update via email within ${slaDays || "1–2"} business days.
Itinerary: ${itinerary || "[ITINERARY]"} | Guest: ${guestName || "[GUEST]"} // EOC ${agentName || "[AGENT]"}`,
    slackTemplate: ({ itinerary }) =>
`Refund follow-up needed | Itin: ${itinerary || "[ITIN]"} | Please confirm status / next update.`
  }
];

export const CATEGORY_LABELS = {
  DISPUTE: "Dispute / Chargeback (Charge Review lockout)",
  VC_ISSUE: "VC Issue (Declined/Hotel Payment Support)",
  REFUND: "Refund",
  OTHER: "Other",
};
