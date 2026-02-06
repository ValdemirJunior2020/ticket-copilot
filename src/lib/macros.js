// FILE: /src/lib/macros.js
export const MACROS = [
  {
    key: "refund_in_review_no_promise",
    title: "Refund Request → In Review (No Promise)",
    body: `Dear [Name],

This response is related to your reservation for Itinerary # [ITIN].

We are in the process of reviewing your request. We will provide an update as soon as possible. If approved, refund timing depends on the payment method and bank processing.

Sincerely,
Travel Support`,
  },
  {
    key: "dispute_locked_charge_review",
    title: "Dispute / Chargeback → Refund Locked",
    body: `Dear [Name],

This response is related to your reservation for Itinerary # [ITIN].

We received a notification that the booking amount has been disputed through your card issuer. When a dispute is open, we are locked out of the refund process while it is under review with the bank, which can take up to 90 days.

If you have documentation showing the dispute was closed or withdrawn, please email ChargeReview@HotelPlanner.com with proof so our team can review next steps.

Thank you for your patience.

Sincerely,
Hotel Reservations`,
  },
  {
    key: "vc_issue_in_progress",
    title: "Hotel Needs Payment (VC) → In Progress",
    body: `Dear [Name],

This response is related to your reservation for Itinerary # [ITIN].

We are reviewing the virtual card issue and coordinating internally. We will provide an update as soon as possible.

Sincerely,
Travel Support`,
  },
];

export function pickMacro(analysis) {
  const issue = analysis?.fields?.issue || "";
  const flags = analysis?.fields?.flags || [];
  if (flags.includes("dispute")) return "dispute_locked_charge_review";
  if (issue === "Refund Request") return "refund_in_review_no_promise";
  if (issue.includes("VC")) return "vc_issue_in_progress";
  return "refund_in_review_no_promise";
}
