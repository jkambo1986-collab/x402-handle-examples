"""Call a resource for free with a PASS (x402 sign-in-with-x, CAIP-122).

Buy the pass first with the ordinary client:  python pay.py <resource url>pass/
Then:  BUYER_KEY=0x… python use_pass.py <resource url>
"""
import base64, json, os, sys, httpx
from eth_account import Account
from eth_account.messages import encode_defunct
U = sys.argv[1]; acct = Account.from_key(os.environ["BUYER_KEY"])
r = httpx.get(U, timeout=30); env = json.loads(base64.b64decode(r.headers["payment-required"]))
info = env["extensions"]["sign-in-with-x"]["info"]
p = {**info, "address": acct.address, "chainId": "eip155:8453", "type": "eip191"}
lines = [f"{p['domain']} wants you to sign in with your Ethereum account:", p["address"], "", p["statement"], "",
         f"URI: {p['uri']}", f"Version: {p['version']}", "Chain ID: 8453", f"Nonce: {p['nonce']}", f"Issued At: {p['issuedAt']}",
         f"Expiration Time: {p['expirationTime']}", "Resources:"] + [f"- {x}" for x in p["resources"]]
sig = Account.sign_message(encode_defunct(text="\n".join(lines)), acct.key).signature.hex()
p["signature"] = sig if sig.startswith("0x") else "0x" + sig
hdr = base64.b64encode(json.dumps(p).encode()).decode()
r2 = httpx.get(U, headers={"SIGN-IN-WITH-X": hdr}, timeout=30)
print(r2.status_code, r2.text[:120], "| valid until:", r2.headers.get("x-pass-valid-until"), "| err:", r2.headers.get("x-pass-error"))
