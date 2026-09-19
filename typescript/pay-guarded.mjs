// Pay a SpendTheBits @handle with a pre-flight check in front of the wallet.
//
// Same stock x402 client as pay.mjs, plus 402Signal's buyer guard: before the
// client signs, the guard pays 402Signal's checking fee ($0.003), re-reads the
// seller's unpaid 402 itself, verifies the signed evidence against a PINNED log
// key, and aborts unless the offer is exactly the one the client selected.
//
//   npm install @x402/fetch @x402/core @x402/evm viem @402signal/route-guard
//   BUYER_KEY=0x… node pay-guarded.mjs
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { signalGuard } from "@402signal/route-guard/x402";
import { privateKeyToAccount } from "viem/accounts";

const url = process.argv[2] ?? "https://x402.spendthebits.com/@stbclaudeprod/proof/";

// 402Signal's log verification key. Pin it in YOUR configuration — copy it from
// https://402signal.com/transparency, never from a check response.
const SIGNAL_LOG_VKEY = process.env.SIGNAL_LOG_VKEY
  ?? "402signal.com/pq/log/mainnet-v1+e6b81414+AaIa9f1eNnNFArj9fz9/kpEGRitH7ZPmgAeDRNvTLSyC";

const client = new x402Client();
client.register("eip155:8453", new ExactEvmScheme(privateKeyToAccount(process.env.BUYER_KEY))); // Base
const pay = wrapFetchWithPayment(fetch, client);

client.onBeforePaymentCreation(signalGuard({
  fetchWithPayment: pay,
  trustedLogVkey: SIGNAL_LOG_VKEY,
  requestFor: ({ paymentRequired }) => ({
    url: paymentRequired.resource.url,
    networks: ["base"],
    require_route_binding: true,
    max_price_usd: 0.02, // the guard refuses anything dearer than this
  }),
  onResult: (result) => console.log("402Signal check:", result.text.slice(0, 200)),
}));

try {
  const res = await pay(url);
  console.log(res.status, await res.text());
  const receipt = res.headers.get("PAYMENT-RESPONSE");
  if (receipt) console.log("settled:", decodePaymentResponseHeader(receipt));
} catch (err) {
  // An abort is the guard working: nothing was signed for the seller.
  console.error("not paid:", err.message);
  process.exitCode = 1;
}
