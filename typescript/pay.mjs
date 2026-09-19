// Pay a SpendTheBits @handle with the STOCK x402 client. Nothing here is
// STB-specific: a handle URL is an ordinary x402 resource.
//
//   npm install @x402/fetch @x402/evm viem
//   BUYER_KEY=0x… node pay.mjs https://x402.spendthebits.com/@stbclaudeprod/proof/
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const url = process.argv[2] ?? "https://x402.spendthebits.com/@stbclaudeprod/proof/";
const account = privateKeyToAccount(process.env.BUYER_KEY);

const pay = wrapFetchWithPaymentFromConfig(fetch, {
  // Name the network YOU hold USDC on. A handle quotes several (Base, Polygon,
  // Arbitrum, Arc, Solana…) and the client signs the first one it supports — it
  // does not check balances. "eip155:8453" = Base. No gas is needed: the payment
  // is a signed EIP-3009 authorization that the facilitator submits.
  schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }],
});

const res = await pay(url);
console.log(res.status, await res.text());

const receipt = res.headers.get("PAYMENT-RESPONSE");
if (receipt) console.log("settled:", decodePaymentResponseHeader(receipt)); // { success, transaction, network, payer }
