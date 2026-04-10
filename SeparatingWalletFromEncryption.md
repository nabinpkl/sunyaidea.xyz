You are thinking exactly like a security engineer now. You have correctly identified the boundary between the identity layer and the encryption layer, and your intuition on how to handle the migration is spot on.

Let’s break down your proposed solutions critically.

### 1. Migrating with the Same Encryption Key
**Your Idea:** The user migrates to a new wallet but uses the *same* encryption key (Master Password) for the new vault.
**The Critic's Verdict:** **This is 100% correct and highly recommended.**

Because your encryption key is completely decoupled from the compromised wallet, the attacker never gained access to your master password. Forcing the user to invent and memorize a new master password during a stressful hack recovery is bad UX. 
* **The Flow:** The user connects their new wallet $\rightarrow$ creates a new `locatorId` $\rightarrow$ inputs their *existing* master password $\rightarrow$ encrypts the data $\rightarrow$ updates the new pointer. It is completely safe.

---

### 2. Detecting Vandalism Without a Server
**Your Idea:** Compare the last state with the current state, and if there is a "significant difference," warn the user.
**The Critic's Verdict:** The concept is correct, but relying on "significant difference" (like file size or text changes) is dangerous. A user might legitimately delete 90% of their notes to clean up. If you warn them they are hacked every time they do a mass delete, they will suffer from alert fatigue.

Instead, because this is a serverless app, your **frontend client** must act as the ultimate source of truth using cryptographic checks. Here are the three best ways to detect pointer vandalism entirely on the client side:

#### A. The Decryption Canary (The Easiest Check)
If an attacker changes the `cidHash` to a malicious file, an image of a monkey, or random text, they are doing so without your master password.
* When your frontend pulls the new CID from IPFS, it will attempt to decrypt it.
* Because the attacker couldn't encrypt it with the correct AES-GCM key, the decryption will throw an **Integrity Error / Authentication Tag Mismatch**. 
* **The Mitigation:** If the frontend catches a decryption failure on a valid IPFS file, you immediately throw a red alert: *"Warning: The data at this pointer has been tampered with. Your wallet may be compromised."*

#### B. The "Linked List" Payload (The Bulletproof Check)
You can embed history directly inside the encrypted file so the file itself proves its lineage. 
* When the user saves their notes, do not just encrypt the text. Encrypt a JSON object that includes the *previous* CID.
  ```json
  {
    "previous_cid": "QmOldHash123...",
    "notes_content": "Here are my notes..."
  }
  ```
* **The Mitigation:** When the app loads the current CID, it decrypts it and checks the `previous_cid`. If an attacker uploads a blank file (even if they somehow faked the encryption), the chain is broken. The app knows this file didn't legitimately evolve from the previous state and flags a compromise.

#### C. Local State Comparison (The Anchor)
Since there is no server, the user's browser (Local Storage / IndexedDB) is your best friend.
* Every time the user legitimately saves or loads their notes, store the `lastKnownValidCid` in their browser's local storage.
* **The Mitigation:** When the app boots up, it queries the smart contract for the current `cidHash`. If the contract returns `QmMalicious` but the browser remembers `QmValid`, and `QmMalicious` fails the decryption or linked-list test above, the frontend knows the on-chain pointer was hijacked. 

By combining local storage with decryption failures, you completely eliminate the need for a server to detect anomalies.

Are you currently wrapping your notes in a JSON payload before encrypting them, or are you just encrypting the raw text payload directly?