#!/usr/bin/env sh
# The whole protocol in one request: an unpaid GET answers 402 with the price.
URL="${1:-https://x402.spendthebits.com/@stbclaudeprod/proof/}"
curl -s -D - -o /dev/null "$URL" | grep -i -E '^HTTP|^payment-required' | cut -c1-120
echo "--- decoded quote (V2):"
curl -s -D - -o /dev/null "$URL" | awk 'tolower($1)=="payment-required:"{print $2}' | tr -d '\r' | base64 -d 2>/dev/null | python3 -m json.tool | head -40
