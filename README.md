# Pay a SpendTheBits `@handle` with a stock x402 client

**Short answer: yes, any regular x402 client can pay a handle, and no lookup is
needed.** A handle URL such as

```
https://x402.spendthebits.com/@stbclaudeprod/proof/
```

is an ordinary [x402](https://x402.org) resource. An unpaid request answers
`402 Payment Required` with everything a client needs — price, token, network and
the seller's address — in the standard places: the `PAYMENT-REQUIRED` header
(protocol v2) and the JSON body (v1, for legacy clients). Your client signs a USDC
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

> **Current limitation (2026-09-20):** 402Signal's free readiness check reports the
> handle live, payable and invocable, but its *bound-evidence* check declines with
> `ambiguous_challenge`, so the guard aborts before signing (no fee, no payment).
> Handles are dual-stack: the `PAYMENT-REQUIRED` header carries the x402 v2 quote
> and the JSON body carries the v1 quote for legacy clients, and the guard requires
> the two to be identical. Run the guard with `onMiss: "allow"` to treat that as
> advisory, or use `pay.mjs`.

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

## Verified with

`@x402/fetch` 2.26 · `x402-fetch` 1.2 (protocol v1) · Python `x402` 2.23 — each reads
the quote, signs and retries against a live handle with no SpendTheBits-specific code.

## Sell something yourself

Claim an `@handle` in the [SpendTheBits app](https://superapp.spendthebits.com/get),
add a resource and a price, and share the URL. More: <https://superapp.spendthebits.com/agents>

MIT licensed.
