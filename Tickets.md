
# Web3 Gap Testing tool
Playwright dapp testing too
testing metamask version drift
and ui changes

# Buy me a coffee

# Later implement web 2 to web 3 auth using login with google

# Wallet change feature

# Emergency backup feature for 24 phrase as well as payload

Your Locator ID: a1b2c3d4e5f6g7h8...
Your 24-Word Recovery Phrase: apple banana car dog...

Technical Payload (Do not modify):*
{"domain":{"name":"SunyaNotes Vault","version":"1"},"message":{"action":"Log in to SunyaNotes","description":"Verify your wallet to access your encrypted notes.","securityNotice":"This is a free authentication request. No gas fees will be charged."}}

# ETH storage smart contract based dynamic storage

EIP-4844 BLOBs

# 
Smart contract on Base (one-time write, ~$0.01):
  locatorId → "lighthouse:USER_CID" or "ipfs:CID"

Actual vault bytes → User's own Lighthouse/IPFS


# For preventing key loggers we use keyboard mapping from gibberish to non gibberish option if you require that secure


#

It is fantastic that you are in the planning phase. Catching this now will save you from a massive technical debt trap later. 

As a critic, I will give you the blunt answer: **Do not, under any circumstances, just encrypt the raw text payload.** If you just encrypt the raw text, you are building a system that cannot evolve and cannot defend itself. You must wrap your data in a structured format (like JSON) *before* you encrypt it. 

Here is exactly why you should use a JSON wrapper and what your schema should look like.

### **The "Vault Payload" Schema**

Before you pass the data to your AES-GCM encryption function, structure your user's entire notebook (or individual note) as a JSON object. Here is the blueprint for a production-ready, future-proof payload:

```json
{
  "version": "1.0",
  "previous_cid": "QmOldHash123...", 
  "timestamp": 1712438900,
  "metadata": {
    "title": "My Vault",
    "last_modified_device": "Desktop-Chrome"
  },
  "notes": [
    {
      "id": "uuid-1234",
      "content": "Here is the raw text of my first note...",
      "folder": "ideas"
    }
  ]
}
```

### **Why This Architecture is Mandatory**

**1. The "Linked List" Security (Tamper Detection)**
As we discussed, if an attacker hacks the wallet and vandalizes the smart contract pointer, they can change the `cidHash` to a file they control. By embedding the `previous_cid` inside the *encrypted* payload, your frontend can cryptographically prove the lineage of the data. 
* *Client-side check:* "Does the `previous_cid` inside this newly downloaded file match the CID I had yesterday?" If no $\rightarrow$ throw a "Compromised Vault" warning. Raw text cannot do this.

**2. Forward Compatibility (The `version` tag)**
Six months from now, you might want to switch from simple text notes to rich text (like Draft.js or Slate) or add support for multiple folders. If you only encrypt raw text, your app will crash when it tries to read old V1 notes with the V2 parser. By wrapping it in JSON with a `"version": "1.0"` flag, your app knows exactly how to parse historical data.

**3. Extensibility (Metadata)**
Users will eventually want tags, folders, or the ability to pin notes. If you encrypt a raw string, adding a "tag" feature means writing messy regex to parse hashtags out of the text. With JSON, you just add a `"tags": []` array to your metadata object. 

**4. AES-GCM Integrity is Built-In**
When you encrypt this JSON object using AES-GCM, the algorithm appends an "Authentication Tag" to the cipher. When the app downloads the file from IPFS, it checks this tag first. If a hacker uploads garbage data or tries to flip bits in the encrypted file, AES-GCM will immediately fail to decrypt it. Combined with your JSON structure, you have absolute certainty that the file is authentic and unaltered.

By wrapping the data in JSON before encrypting, you build a foundation that is secure, verifiable, and ready for future features without ever needing to touch the smart contract again.

Since we have established that your encryption is decoupled from the wallet identity to protect against wallet hacks, how are you planning to derive that AES encryption key? Are you going to stretch a user's Master Password using a standard like Argon2/PBKDF2, or are you looking into modern alternatives like Passkeys?