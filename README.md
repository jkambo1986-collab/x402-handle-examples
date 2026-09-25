# Pay a SpendTheBits `@handle` with a stock x402 client

**Short answer: yes, any regular x402 client can pay a handle, and no lookup is
needed.** A handle URL such as

```
https://x402.spendthebits.com/@stbclaudeprod/proof/
```

is an ordinary [x402](https://x402.org) resource. An unpaid request answers
`402 Payment Required` with everything a client needs — price, token, network and
the seller's address — in the standard place: one x402 v2 quote in the
`PAYMENT-REQUIRED` header, repeated identically in the JSON body. Your client signs a USDC
authorization, retries, and gets the resource plus a settlement receipt.

The seller is a person's self-custody wallet. SpendTheBits never holds the money:
`payTo` is an address only the seller's own keys control.

## See the quote (no wallet)

```sh
./quote.sh https://x402.spendthebits.com/@stbclaudeprod/proof/
# or
cd typescript && npm install && node quote.mjs
```

## Pay it — TypeScript (`@x402/fetch`)

```sh
cd typescript && npm install
BUYER_KEY=0x<key of a wallet holding USDC on Base> node pay.mjs
```

[`typescript/pay.mjs`](typescript/pay.mjs) is the library's own README example with
a handle URL in it — 15 lines, nothing SpendTheBits-specific.

## Pay it with a pre-flight check (`@402signal/route-guard`)

```sh
cd typescript && npm install
BUYER_KEY=0x… node pay-guarded.mjs
```

[`typescript/pay-guarded.mjs`](typescript/pay-guarded.mjs) is the same client with
[402Signal](https://402signal.com)'s buyer guard hooked in before signing. The guard
re-reads the handle's unpaid 402 itself, verifies signed evidence of the offer against
a pinned log key, and aborts unless the price, recipient, token and network are exactly
what the client selected. It costs the buyer $0.003 per check, paid from the same wallet.
Handles pass its readiness rules: no redirects, standard fields only, Base quoted first,
and a Bazaar descriptor that declares the GET takes no inputs.

> **Checked 2026-09-20:** 402Signal's bound-evidence check binds a handle (selected
> offer: USDC on Base, signed decision issued). Handles answer with ONE x402 v2 quote —
> the `PAYMENT-REQUIRED` header and the JSON body are identical — which is what a guard
> that compares the two needs.

## Pay it — Python (`x402`)

```sh
cd python && pip install -r requirements.txt
BUYER_KEY=0x… python pay.py
```

## What you need

| | |
|---|---|
| A wallet key | any EVM account |
| USDC on the network you register | the demo resource costs **$0.01**; Base is the usual choice |
| Gas | **none** — the payment is a signed EIP-3009 authorization; the facilitator submits it |
| An account, API key or lookup | **none** |

## Good to know

- **Name your network.** A handle quotes several networks at once. A stock client
  signs the first one it supports and does not check balances, so register the
  network you actually hold USDC on (`eip155:8453` for Base) rather than `eip155:*`.
- **`invalid_payload: … execution reverted`** on the retry almost always means the
  paying wallet holds less USDC on that network than the price.
- **Paying yourself is refused** (`self_send_not_allowed`): the buyer and the seller
  must be different addresses.
- **Replays are safe.** Re-sending the same signed authorization returns the same
  response without charging again.
- **One URL, two facilitators, nothing to configure.** USDC on Arc (`eip155:5042`)
  settles through Circle's x402 facilitator; Base, Polygon, Arbitrum and Solana
  settle through Coinbase's. The client sees one standard quote either way.
- **No redirects.** The URL answers directly with or without its trailing slash, so
  guards that fetch with `redirect: "error"` are fine.
- **Browsers work too.** The endpoints send CORS headers, expose `PAYMENT-REQUIRED`
  / `PAYMENT-RESPONSE`, and accept the payment headers on preflight.
- **Discovery:** [`/.well-known/x402`](https://x402.spendthebits.com/.well-known/x402),
  [`/llms.txt`](https://x402.spendthebits.com/llms.txt) and
  [`/openapi.json`](https://x402.spendthebits.com/openapi.json) list public resources.

## Proof: real payments from unmodified clients

Both of these are the files in this repo, run as-is against the live handle on
Base mainnet (2026-09-20), $0.01 USDC each, settled through the facilitator with
no gas paid by the buyer:

| Client | Settlement |
|---|---|
| `typescript/pay.mjs` (`@x402/fetch` 2.26) | [`0x471653dc…11d7bf`](https://basescan.org/tx/0x471653dcb314d8fa68fb4704ca28873658e51f4266ad5de57904d4203f11d7bf) |
| `python/pay.py` (`x402` 2.23) | [`0xbba32fe4…439923`](https://basescan.org/tx/0xbba32fe41a6d93795830ac5aefed24dc68dc008006aa89943a4ffb841e439923) |

## More than pay-per-call

Everything below works with the same stock clients, and every line was run with real
USDC on Base (2026-09-20).

| What | How | Proof |
|---|---|---|
| **Referral links** | add `?ref=<handle>` to a resource URL. When the seller offers a referral share, the quote's `payTo` is an immutable [0xSplits](https://splits.org) contract that pays seller, referrer and platform fee on-chain. | payment [`0x6894d3f8…`](https://basescan.org/tx/0x6894d3f8c6f75a22b9fff5f113123e27b6bd2c9b7f9b85aa5143dff2b95cfba5) → split `0x82B3…f039` paid out three ways |
| **Passes** | pay `<resource>pass/` once with `pay.mjs` / `pay.py`, then call free with [`python/use_pass.py`](python/use_pass.py) (the official x402 `sign-in-with-x` extension). An expired pass simply gets the ordinary 402. | purchase [`0x812d80eb…`](https://basescan.org/tx/0x812d80eb7665de0e071a91692a484e63f23413e89458ead5a491f47271734aec), then a free `200`; a replayed proof is refused |
| **Refund window** | a seller that promises refunds sends `X-Refund-Window`. Ask with [`python/request_refund.py`](python/request_refund.py): a signature by the wallet that paid, keyed on the settlement transaction. | request accepted `201`; a stranger's signature `403`; a second request `409` |

## Buy a gift card (a real purchase, not another API call)

Every gift card in the SpendTheBits store is an x402 resource:

```
https://x402.spendthebits.com/@stb/cards/<country>/<brand>/<amount>/
                                         usa       amazon-com  25
```

```bash
cd typescript && npm install
BUYER_KEY=0x<agent key> node buy-gift-card.mjs usa amazon-com 10          # price it
BUYER_KEY=0x<agent key> node buy-gift-card.mjs usa amazon-com 10 --pay    # buy it
node gift-card-status.mjs <status_url> <claim_token>                     # check it
```

Two payments, in this order, so an unpaid probe never creates an order at the
card provider:

1. **Lock the price.** The card URL answers `402` for a quote fee of a few cents.
   Paying it creates the order at the provider's exact price and returns
   `total_usdc`, `pay_url`, `status_url` and a `claim_token`.
2. **Pay the order.** `pay_url` quotes the exact total with `payTo` = a per-order
   forwarder contract on Base. Its terms are part of its address: forward the USDC
   to the card provider before the deadline, pay the quoted service fee, or refund
   the payer. A second payment is refunded, never burned. SpendTheBits never holds
   the money.
3. **Poll `status_url`** with `X-Claim-Token`. About five minutes later the card is
   in the agent owner's app, in the owner's name. The code is never in the HTTP
   response unless the owner allowed it for that agent (then `reveal_url` serves
   it once).

**Who can buy:** a key created under *Agent budgets* in the SpendTheBits app with
gift cards switched on by its owner (per-card and monthly limits). Any other key
is refused at verify time, before any payment settles. Over a limit, the store
asks the owner on their phone instead of refusing (`status: awaiting_owner`).

**Client cap:** `@x402/fetch` refuses any payment above about $1 unless you set
`spendControls: { maxAmountPerPayment: "$30" }` — every agent developer hits this.
The script derives it from the amount; override with `MAX_USDC=…`.

**Referrals:** add `?ref=@handle` (or `--ref @handle`). The referrer's share of the
service fee goes to an ownerless, immutable split contract, which pays it out
on-chain once about $0.50 has built up there or 24 hours after the oldest unpaid
share, whichever comes first. It is not paid in the purchase transaction.

**Proof (2026-09-20, mainnet, times UTC):** an unmodified `@x402/fetch` with an agent
key from the owner's Agents screen bought a $10 Amazon.com card, about 4.5 minutes
end to end, and the agent never saw the code:

| Time | Step | Transaction |
|---|---|---|
| 19:04:01 | quote fee paid | [`0x265b368e…2254`](https://basescan.org/tx/0x265b368e767fb5f92a7b9414417cbcd938bc83929631f161b01e65937ec02254) |
| 19:04:03 | order paid, 11.224455 USDC to the counterfactual forwarder `0x9f27…F4b1` | [`0x5494ea30…05de`](https://basescan.org/tx/0x5494ea30bbff5f5c2d82ab1a60d8503df9ba7fc931d10c39e872444e48bb05de) |
| 19:04:15 | forwarder deployed = forwarded (CCTP burn to the card provider) | [`0xd5aecb29…1b89`](https://basescan.org/tx/0xd5aecb298ca6c65faf486d4a3e4021a91ba61d84dea74af3d234d93d352c1b89) |
| ~19:05 | minted on Ethereum to the provider, ~50 s after payment | |
| 19:08:28 | card issued to the owner | |

**Codes:** neither script ever prints a card code. If the owner turned on "Let the
agent read card codes" for this agent, the status response carries `reveal_url`,
which serves the code exactly once (`GET` with `X-Claim-Token`); the scripts only
tell you it exists. Guide: https://superapp.spendthebits.com/agents/gift-cards

## Ask your owner to pay (Ask-to-Pay)

An agent does not have to hold money to buy something. If its owner uses the
SpendTheBits wallet, the agent can **ask** instead: the owner gets a push, sees the
site and the price, and approves with Face ID. The payment comes from the owner's
own wallet, and the agent collects the paid response.

```bash
cd typescript && npm install
STB_AGENT_ID=<id from the app> STB_AGENT_KEY=0x<the agent's key> \
STB_ASK_URL=https://backend-production-716d3.up.railway.app/x402/agents/ask/ \
node ask-to-pay.mjs https://api.example.com/report 0.25 "Q3 filing for the weekly summary"
```

The request is signed with the agent's key over a fixed message
(`GET …/x402/agents/ask/` returns it). The owner's rules (on/off, per-request and
24-hour limits, allowed sites) can only turn a request away; nothing is paid
without the owner's signature. The result is read with the bearer `claim_token`
returned once when the request opens.

**Proof (2026-09-23, mainnet):** this script asked for a one-cent resource, the owner
approved on the phone, and the agent received the paid body — Polygon tx
[`0x05311d96…`](https://polygonscan.com/tx/0x05311d96773605363a6ecb61036620fd71e93c84d7df6818457a610c7b0b1f74).

## Verified with

`@x402/fetch` 2.26 · Python `x402` 2.23 — each reads the quote, signs and retries against
a live handle with no SpendTheBits-specific code. Legacy v1 clients (`x402-fetch` 1.x):
v1 payments are still accepted, and the same path on the API host
(`https://backend-production-716d3.up.railway.app/x402/@handle/resource/`) quotes v1.

## Sell something yourself

Claim an `@handle` in the [SpendTheBits app](https://superapp.spendthebits.com/get),
add a resource and a price, and share the URL. More: <https://superapp.spendthebits.com/agents>

MIT licensed.
