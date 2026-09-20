"""Ask for a refund inside a seller's refund window (the X-Refund-Window header).

    BUYER_KEY=0x… python request_refund.py <settlement transaction hash>

The request is a signature by the wallet that paid - no account, no API key.
"""
import os, sys, httpx
from eth_account import Account
from eth_account.messages import encode_defunct
B = "https://x402.spendthebits.com/x402/refunds/request/"; tx = sys.argv[1]
info = httpx.get(B, params={"tx": tx}, timeout=30).json(); print("info:", info)
acct = Account.from_key(os.environ["BUYER_KEY"])
sig = Account.sign_message(encode_defunct(text=info["message"]), acct.key).signature.hex()
sig = sig if sig.startswith("0x") else "0x" + sig
r = httpx.post(B, json={"tx": tx, "signature": sig, "reason": "The response was not what was described."}, timeout=30); print("payer ->", r.status_code, r.json())
