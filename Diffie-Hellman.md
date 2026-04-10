
# HOw Https and signal work

Okay. Let me build this up from the very bottom. [binance](https://www.binance.com/en/square/post/1404613253930)

***

## Step 0 — The ONE Property You Need To Know

```
On an elliptic curve:
  privateKey × G = publicKey    ← easy, takes milliseconds
  publicKey  ÷ G = privateKey   ← impossible, takes longer than age of universe

That's it. One-way multiplication. Everything else flows from this.
```

***

## Step 1 — Diffie-Hellman (How HTTPS and Signal Work)

Imagine Alice and Bob want a shared secret but can only communicate over a public channel that Eve reads: [chainstack](https://chainstack.com/stealth-addresses-blockchain-transaction-privacy/)

```
Alice picks private: a = 3
Bob   picks private: b = 5
G is a public fixed point everyone knows

Alice publishes: A = a×G = 3G
Bob   publishes: B = b×G = 5G

Eve sees: A, B, G — but NOT a or b

Alice computes: a × B = 3 × 5G = 15G
Bob   computes: b × A = 5 × 3G = 15G

Both got: 15G ← shared secret ✅
Eve sees A and B but cannot compute 15G without knowing a or b ✅
```

This is EXACTLY how HTTPS establishes a session key. Your browser and the server do this in milliseconds when you visit any https:// site. Signal does the same for every message. [chainstack](https://chainstack.com/stealth-addresses-blockchain-transaction-privacy/)

***

## Step 2 — Now Stealth Addresses Are Just Diffie-Hellman + One Twist

```
Bob has:
  private spending key: b
  public  spending key: B = b×G    ← published openly

Alice wants to generate a one-time address FOR Bob:

  Alice picks random: r  (throwaway, never reused)
  Alice publishes:    R = r×G      ← ephemeral pubkey, public

  Shared secret (Diffie-Hellman):
    Alice: S = r × B = r × b×G = rb×G
    Bob:   S = b × R = b × r×G = rb×G
    Same S. Neither shared r or b. ✅

  Stealth address:
    P = B + hash(S)×G              ← Alice computes this, sends ETH here
      = b×G + hash(rb×G)×G

  Bob's private key for P:
    p = b + hash(S)                ← Bob computes this locally
    
  Verify: p×G = (b + hash(S))×G
               = b×G + hash(S)×G
               = B + hash(S)×G
               = P ✅
```

***

## The Click Moment

```
Alice did NOT create a random address.
Alice created an address that is mathematically offset
from Bob's existing public key by hash(S).

Bob's private key for P is his existing private key
offset by the same hash(S).

They both know hash(S) because of Diffie-Hellman.
Nobody else does.

So:
  Alice: can compute P (the address) ✅
  Alice: cannot compute p (the private key) ❌ — needs b
  Bob:   can compute p (has b + knows hash(S)) ✅
  Eve:   sees P and R, cannot compute p or S ❌
```

 It's not magic — it's just Diffie-Hellman applied to key derivation instead of session encryption. [binance](https://www.binance.com/en/square/post/1404613253930)

***

## How It Relates To HTTPS and Signal

| | HTTPS | Signal | Stealth Address |
|---|---|---|---|
| **Algorithm** | ECDH | ECDH | ECDH |
| **Shared secret used for** | Encrypt session data | Encrypt messages | Derive one-time address |
| **Eve sees** | Encrypted traffic | Encrypted messages | Random address on chain |
| **Without private key** | Can't decrypt | Can't read | Can't spend |

Same math. Different application. [chainstack](https://chainstack.com/stealth-addresses-blockchain-transaction-privacy/)

Ready to build now? 😄


Job 2 — KEY EXCHANGE (establishing a shared secret):
  Two parties derive the SAME shared secret
  without sending the secret itself
  
  Used by: HTTPS, Signal, stealth addresses
