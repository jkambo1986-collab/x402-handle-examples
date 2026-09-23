// Ask-to-Pay: instead of paying an x402 endpoint itself, an agent ASKS its
// owner's SpendTheBits wallet to pay. The owner gets a push, reviews the site
// and the price, and approves with Face ID; the payment comes from the owner's
// own wallet. The agent then collects the paid response.
//
//   STB_AGENT_ID  the agent id shown in the app (Agent budgets -> Ask-to-Pay)
//   STB_ASK_URL   https://backend-production-716d3.up.railway.app/x402/agents/ask/
//   STB_AGENT_KEY the agent's own key (the one the app generated for it)
//
//   node ask-to-pay.mjs https://x402.spendthebits.com/@stbclaudeprod/proof/ 0.05 "why I need it"
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";

const [url, maxUsd = "0.25", reason = ""] = process.argv.slice(2);
if (!url) throw new Error("usage: node ask-to-pay.mjs <x402 url> [max_usd] [reason]");
const { STB_AGENT_ID: agentId, STB_ASK_URL: askUrl, STB_AGENT_KEY: key } = process.env;
if (!agentId || !askUrl || !key) throw new Error("set STB_AGENT_ID, STB_ASK_URL and STB_AGENT_KEY");

const agent = privateKeyToAccount(key);
const body = {
  agent: agentId, url, max_usd: maxUsd, reason,
  nonce: randomBytes(16).toString("hex"),
  issued_at: Math.floor(Date.now() / 1000),
};
// The exact text the server rebuilds (GET STB_ASK_URL returns the template).
const message = [
  "SpendTheBits Ask-to-Pay", `agent: ${body.agent}`, `url: ${body.url}`,
  `max_usd: ${body.max_usd}`, `nonce: ${body.nonce}`, `issued_at: ${body.issued_at}`,
].join("\n");
body.signature = await agent.signMessage({ message });

const opened = await fetch(askUrl, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json() }));
if (opened.status !== 201) throw new Error(`refused (${opened.status}): ${opened.json.error}`);
const { id, claim_token: token } = opened.json;
console.log(`asked: ${id} — waiting for the owner (price ${opened.json.max_usd} max)`);

for (;;) {
  await new Promise((r) => setTimeout(r, 5000));
  const r = await fetch(`${askUrl}${id}/`, { headers: { authorization: `Bearer ${token}` } }).then((x) => x.json());
  if (r.status === "paid") {
    console.log(`paid ${r.price_usd} USDC on ${r.network} (tx ${r.tx_hash})`);
    console.log(r.body_is_base64 ? Buffer.from(r.body, "base64") : r.body);
    break;
  }
  if (["declined", "expired", "failed"].includes(r.status)) {
    console.log(`${r.status}${r.decline_reason ? `: ${r.decline_reason}` : ""}`);
    process.exit(1);
  }
}
