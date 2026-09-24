// Buy a real gift card with the STOCK x402 client. Every card in the
// SpendTheBits store is an x402 resource:
//
//   https://x402.spendthebits.com/@stb/cards/<country>/<brand>/<amount>/
//
// Two payments, in this order, so an unpaid probe never creates an order at
// the card provider: (1) the card URL quotes a small fee; paying it locks the
// provider's exact price and returns the order; (2) the order is paid to a
// per-order forwarder contract whose only options are "forward to the card
// provider before the deadline", "pay the quoted fee" or "refund the payer".
// SpendTheBits never holds the money. The card is issued in the agent OWNER's
// name and appears in their app; this script never prints a card code.
//
// Who can buy: an agent key created under Agent budgets in the SpendTheBits
// app, with gift cards switched on by its owner. Any other key is refused at
// verify time, before any payment settles.
//
//   npm install @x402/fetch @x402/evm viem
//   BUYER_KEY=0x<agent key> node buy-gift-card.mjs usa amazon-com 10 [--pay] [--ref @handle]
//
// Without --pay the script only prices the card (and pays the quote fee).
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const STORE = process.env.STB_CARD_STORE ?? "https://x402.spendthebits.com/@stb/cards";
const args = process.argv.slice(2);
const pay = args.includes("--pay");
const ref = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : "";
const [country, brand, amount] = args.filter((a) => !a.startsWith("--") && a !== ref);
if (!country || !brand || !amount) {
  throw new Error("usage: node buy-gift-card.mjs <country> <brand-slug> <amount> [--pay] [--ref @handle]");
}
if (!process.env.BUYER_KEY) throw new Error("set BUYER_KEY to the agent's key (from the app's Agent budgets)");

// Stock clients refuse any payment above about $1 unless told otherwise. A
// card costs its face value plus a small service fee and a bridge-fee ceiling;
// MAX_USDC is the most this run may sign for ONE payment.
const maxPerPayment = `$${process.env.MAX_USDC ?? String(Math.ceil(Number(amount) * 1.25) + 1)}`;

const account = privateKeyToAccount(process.env.BUYER_KEY);
const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  // Gift cards are quoted on Base (eip155:8453) only.
  schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }],
  spendControls: { maxAmountPerPayment: maxPerPayment },
});

// 1. Lock the price: the card URL answers 402 for the quote fee; paying it
//    returns the order at the provider's exact price.
const cardUrl = `${STORE}/${country}/${brand}/${amount}/${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
const quoted = await fetchWithPayment(cardUrl, { method: "POST" });
const quote = await quoted.json();
if (quoted.status !== 201 && quoted.status !== 200) {
  // A refusal is free: nothing settled. Common ones: unknown_agent (register
  // the key under Agent budgets), giftcards_not_allowed, over_order_cap,
  // brand_not_allowed, cannot_quote (amount not a denomination).
  throw new Error(`quote refused (${quoted.status}): ${quote.error ?? ""} ${quote.detail ?? ""}`);
}
console.log(`${quote.brand} ${quote.face_value} ${quote.currency} (${quote.redeemable_in})`);
console.log(`total ${quote.total_usdc} USDC = card ${quote.includes.card_usdc} + fee ${quote.includes.service_fee_usdc} + bridge ceiling ${quote.includes.bridge_fee_ceiling_usdc}`);
if (quote.spend_controls_hint) console.log(quote.spend_controls_hint);
if (quote.status === "awaiting_owner") {
  console.log("Over the owner's limit: the owner has been asked on their phone. Poll status_url.");
}
if (!pay) {
  console.log(`priced only. Re-run with --pay to buy (pay by ${new Date(quote.pay_by * 1000).toISOString()}).`);
  process.exit(0);
}

// 2. Pay the order. The 402 names the order's forwarder contract as payTo and
//    the exact total. Pay from the SAME key that bought the quote — the
//    contract refunds that address if the price expires unforwarded.
if (quote.status === "awaiting_payment") {
  const paid = await fetchWithPayment(quote.pay_url, { method: "POST" });
  const body = await paid.json();
  if (paid.status === 202) {
    console.log("settlement pending; do NOT pay again — polling status");
  } else if (paid.status !== 200) {
    throw new Error(`payment refused (${paid.status}): ${body.error ?? ""} ${body.detail ?? ""}`);
  } else {
    const receipt = paid.headers.get("PAYMENT-RESPONSE");
    if (receipt) console.log("settled:", decodePaymentResponseHeader(receipt).transaction);
  }
}

// 3. Poll with the claim token (a header, never a query string). About five
//    minutes: forward in seconds, bridge ~1 minute, then the provider issues.
const headers = { "X-Claim-Token": quote.claim_token };
for (;;) {
  await new Promise((r) => setTimeout(r, 15_000));
  const s = await fetch(quote.status_url, { headers }).then((r) => r.json());
  console.log(new Date().toISOString(), s.status);
  if (s.status === "completed") {
    console.log(`card ready in the owner's app${s.valid_until ? ` (valid until ${s.valid_until})` : ""}.`);
    if (s.reveal_url) console.log("the owner allowed codes for this agent: GET reveal_url once with X-Claim-Token");
    break;
  }
  if (["refunded", "failed", "expired", "declined", "credited"].includes(s.status)) {
    console.log(`${s.status}${s.detail ? `: ${s.detail}` : ""}`);
    process.exit(1);
  }
}
