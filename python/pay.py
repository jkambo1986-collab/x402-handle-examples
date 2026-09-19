"""Pay a SpendTheBits @handle with the STOCK Python x402 client.

    pip install "x402[evm,requests]"
    BUYER_KEY=0x… python pay.py https://x402.spendthebits.com/@stbclaudeprod/proof/
"""
import os
import sys

from eth_account import Account
from x402.client import x402ClientSync
from x402.http.clients.requests import x402_requests
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

url = sys.argv[1] if len(sys.argv) > 1 else "https://x402.spendthebits.com/@stbclaudeprod/proof/"

client = x402ClientSync()
# Name the network YOU hold USDC on ("eip155:8453" = Base): a handle quotes several
# and the client signs the first one it supports, without checking balances.
register_exact_evm_client(
    client, EthAccountSigner(Account.from_key(os.environ["BUYER_KEY"])), networks="eip155:8453"
)

response = x402_requests(client).get(url, timeout=60)
print(response.status_code, response.text)
print("settled:", response.headers.get("PAYMENT-RESPONSE"))  # base64 JSON: {success, transaction, network, payer}
