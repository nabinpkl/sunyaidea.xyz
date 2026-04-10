

The reviewer's final question is the right one. Contract is settled — now the hard part is the client. Here's the architecture:

***

## The Core Problem

```
User types note
  → auto-save fires every 3 seconds
  → encrypts → pins to IPFS → gets CID
  → session key signs → VaultRegistry.set()
  → TX REVERTS: SessionKeyExpiredOrInvalid
  → edit is... where?
```

***

## The Write-Ahead Buffer (Never Lose An Edit)

```
Rule: local write ALWAYS happens before any async operation.
      The chain is a mirror of local state, not the source of it.

Layer 1 — Keystroke (immediate, synchronous):
  user types → IndexedDB.write(draftBuffer)
  No network. No encryption. Just raw text saved locally.
  Even if tab crashes here → draft survives on reload. ✅

Layer 2 — Debounced encrypt (every 3s):
  draftBuffer → encrypt with VMK → encryptedBlob
  Store encryptedBlob in IndexedDB too.
  Still no network. ✅

Layer 3 — IPFS pin (async, failable):
  encryptedBlob → pin to IPFS → CID
  If pin fails → retry queue with backoff.
  Draft still safe in IndexedDB. ✅

Layer 4 — Chain write (async, failable):
  CID → session key signs → VaultRegistry.set()
  If TX reverts → catch, classify, handle.
  Draft STILL safe in IndexedDB. ✅

Layer 5 — Confirm:
  Only on TX success:
  → mark draft as "synced"
  → update local sync status indicator
  NEVER clear the buffer before this point. ✅
```

***

## The Revert Handler — Classify Before Acting

```javascript
async function handleSetRevert(error, pendingCID) {
  const reason = parseRevertReason(error)

  switch (reason) {

    case 'SessionKeyExpiredOrInvalid':
      // Key is dead. Draft is safe in IndexedDB.
      // Don't discard pendingCID — it's already pinned on IPFS.
      syncQueue.pause()
      showBanner(
        "Session key invalidated by your vault's time policy. " +
        "Re-connect wallet to continue syncing. Your edits are safe."
      )
      // When user re-auths → resume queue with same pendingCID
      // No re-encrypt. No re-pin. Just re-submit the set() call.
      awaitReauth().then(() => syncQueue.resume(pendingCID))
      break

    case 'NotRegistered':
      // Catastrophic — locatorId missing. Should never happen.
      showBanner("Vault not found on this chain. Check your chain setting.")
      syncQueue.halt()
      break

    case 'ZeroCidHash':
      // Bug in our code. Log and discard this item.
      console.error("BUG: attempted to write zero CID hash")
      syncQueue.skip()
      break

    default:
      // Network blip, gas issue etc — retry with backoff
      syncQueue.retryWithBackoff(pendingCID)
  }
}
```

***

## The Sync Queue State Machine

```
States:
  IDLE       → no pending saves
  ENCRYPTING → draft → encryptedBlob
  PINNING    → encryptedBlob → IPFS → CID
  WRITING    → CID → VaultRegistry.set()
  PAUSED     → session key dead, awaiting reauth
  HALTED     → unrecoverable error, user action needed
  RETRYING   → backoff timer running

Transitions:
  IDLE       → ENCRYPTING  (on keystroke debounce)
  ENCRYPTING → PINNING     (encrypt success)
  PINNING    → WRITING     (pin success)
  WRITING    → IDLE        (TX success)
  WRITING    → PAUSED      (SessionKeyExpiredOrInvalid)
  WRITING    → RETRYING    (network/gas failure)
  PAUSED     → WRITING     (user re-auths)
  RETRYING   → WRITING     (backoff expires)
  any        → HALTED      (unrecoverable)
```

***

## The Status Indicator

```
UI should always show sync state clearly:

  ● Saved          → IDLE, last sync < 30s ago
  ↻ Syncing...     → ENCRYPTING / PINNING / WRITING
  ⚠ Saved locally  → PAUSED (session key dead)
                     subtitle: "Re-connect to sync"
  ✗ Sync failed    → HALTED
  ↺ Retrying (3s)  → RETRYING

The user is never confused about where their data is.
"Saved locally" is not an error — it's an honest status.
```

***

## The Reauth Flow (Zero Edit Loss)

```
1. Session key dies mid-session
2. Banner: "Your edits are safe. Reconnect wallet to sync."
3. User clicks reconnect → MetaMask opens
4. User signs new session key (one TX)
5. syncQueue.resume(pendingCID)
   → skips re-encrypt, skips re-pin
   → submits set() with same CID that was already pinned
6. TX succeeds → status → "Saved" ✅

User never re-types anything. ✅
IPFS pin is not wasted. ✅
```

***

## The Offline Case (No Chain Needed)

```
SunyaNotes should work fully offline:

  User has no internet:
    → types notes
    → saves to IndexedDB only
    → sync queue accumulates pending items
    → status: "Saved locally (offline)"

  User comes back online:
    → queue drains in order
    → chain catches up to local state
    → status: "Saved" ✅

The chain is a backup mirror of local state.
Local IndexedDB is the primary storage during a session.
This is also why we never clear the buffer before TX confirm.
```

***

## Final Answer To The Reviewer's Question

```
The frontend never loses edits because:

1. Draft written to IndexedDB on every keystroke
   before any async operation begins

2. Revert reason is parsed and classified
   SessionKeyExpiredOrInvalid → pause queue, prompt reauth
   Not → discard edit

3. Already-pinned CIDs are preserved across reauth
   No re-encrypt. No re-pin. Just re-submit the TX.

4. Status indicator always reflects honest sync state
   "Saved locally" is a valid resting state, not an error

5. Offline works the same way — queue just drains later

The chain cannot cause data loss
because local state always leads chain state. ✅
```

Ready to write this as actual code?