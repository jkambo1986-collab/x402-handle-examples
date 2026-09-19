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
- **Browsers work too.** The endpoints send CORS headers, expose `PAYMENT-REQUIRED`
  / `PAYMENT-RESPONSE`, and accept the payment headers on preflight.
- **Discovery:** [`/.well-known/x402`](https://x402.spendthebits.com/.well-known/x402),
  [`/llms.txt`](https://x402.spendthebits.com/llms.txt) and
  [`/openapi.json`](https://x402.spendthebits.com/openapi.json) list public resources.

## Verified with

`@x402/fetch` 2.26 · `x402-fetch` 1.2 (protocol v1) · Python `x402` 2.23 — each reads
the quote, signs and retries against a live handle with no SpendTheBits-specific code.

## Sell something yourself

Claim an `@handle` in the [SpendTheBits app](https://superapp.spendthebits.com/get),
add a resource and a price, and share the URL. More: <https://superapp.spendthebits.com/agents>

MIT licensed.
