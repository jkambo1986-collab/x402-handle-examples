// No wallet needed: read a handle's price the way any x402 client does.
//   node quote.mjs https://x402.spendthebits.com/@stbclaudeprod/proof/
const url = process.argv[2] ?? "https://x402.spendthebits.com/@stbclaudeprod/proof/";
const res = await fetch(url);
console.log("HTTP", res.status); // 402 Payment Required

// V2: the quote rides the PAYMENT-REQUIRED response header (base64 JSON).
const v2 = JSON.parse(Buffer.from(res.headers.get("PAYMENT-REQUIRED"), "base64").toString());
for (const a of v2.accepts) console.log(`v2  ${a.scheme.padEnd(6)} ${a.network.padEnd(44)} ${a.amount} units of ${a.asset} -> ${a.payTo}`);

// V1 (legacy clients): the same quote in the JSON body.
const v1 = await res.json();
for (const a of v1.accepts) console.log(`v1  ${a.scheme.padEnd(6)} ${a.network.padEnd(44)} ${a.maxAmountRequired} units -> ${a.payTo}`);
