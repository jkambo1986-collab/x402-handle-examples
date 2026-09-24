// Read the status of a gift-card order an agent bought (no wallet needed —
// the claim token returned with the quote is the proof of purchase).
//
//   node gift-card-status.mjs <status_url> <claim_token>
//
// Statuses: awaiting_payment → processing → completed; or awaiting_owner
// (the owner was asked to approve an over-limit card), declined, expired,
// refunded (price expired before the forward; the contract sent the money
// back to the paying key), failed, credited (the provider failed after the
// money arrived: it sits as a credit used on the owner's next card).
// The card code is never in this response; if the owner allowed codes for
// the agent, `reveal_url` serves it ONCE, with the same header.
const [statusUrl, token] = process.argv.slice(2);
if (!statusUrl || !token) throw new Error("usage: node gift-card-status.mjs <status_url> <claim_token>");

const r = await fetch(statusUrl, { headers: { "X-Claim-Token": token } });
const s = await r.json();
if (r.status === 404) throw new Error("unknown order or wrong claim token");
console.log(`${s.brand} ${s.face_value} ${s.currency}: ${s.status}`);
console.log(`total ${s.total_usdc} USDC, pay_to ${s.pay_to}, typical ${s.typical_minutes} min`);
if (s.valid_until) console.log(`valid until ${s.valid_until}`);
if (s.reveal_url) console.log(`code available once at ${s.reveal_url} (X-Claim-Token)`);
