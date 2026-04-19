



## The Mailbox Analogy

```
Normal wallet address:
  Bob publishes: "send to 0xBOB"
  Alice sends to 0xBOB
  Eve watches chain: "Alice paid Bob" ← linked ❌

Stealth meta-address:
  Bob publishes: "send to my meta-address M"
  M is NOT an address — it's two public keys
  Think of it as a FORMULA, not a destination
```

***

## Step By Step — No Math

```
Step 1 — Bob publishes his meta-address M publicly
          (like an ENS record: nabin.eth → meta-address M)

Step 2 — Alice wants to pay Bob:
          Alice generates a random number r (her secret)
          Alice computes a brand new address P using:
            r + Bob's meta-address M → P (one-time address)
          Alice sends ETH to P
          Alice also publishes r×G (ephemeral pubkey) on the
          Announcer contract — just a public noticeboard

Step 3 — Bob scans the Announcer noticeboard:
          For every new ephemeral pubkey published:
          Bob uses HIS private key + ephemeral pubkey
          to compute: "is this address mine?"
          When he finds P → YES this is mine ✅

Step 4 — Bob claims:
          Bob derives the private key for P (pure math, offline)
          Bob now controls P like any normal wallet
          Spends from it directly ✅
```



***

## The Key Magic — Why Only Bob Can Find It

```
Alice computed P using: r + Bob's PUBLIC keys
Bob  recovers P using:  ephemeral pubkey + Bob's PRIVATE keys

Both arrive at the same P.
But an observer watching the chain only sees:
  → Some ETH went to 0xRANDOM_P
  → Some ephemeral data in Announcer
  → Zero idea P belongs to Bob ✅

Eve cannot compute P from ephemeral pubkey alone.
She needs Bob's private key — which only Bob has.
```

This is **Diffie-Hellman** — the same math behind HTTPS/Signal. [chainstack](https://chainstack.com/stealth-addresses-blockchain-transaction-privacy/)

***

## Why It's NOT The Same As Two Wallets

```
Two wallets: Bob MANUALLY creates wallet B
             Bob KNOWS about wallet B before Alice pays
             Bob FUNDS wallet B himself (visible trail)

Stealth:     Bob has NO IDEA what P will be before Alice pays
             P is computed by ALICE at payment time
             Bob DISCOVERS P by scanning AFTER Alice pays
             Alice FUNDS P as part of the payment itself
             No prior action from Bob. No trail from Bob. ✅
```

***

#
Perfect. Let's do exactly what you said — start simple with one key, see what breaks, then understand why two keys exist. [blog.plan99](https://blog.plan99.net/ecdh-in-the-payment-protocol-cb2f81962c1b?gi=1e5264bfcf12)

***

## Simple Version — Just ab×G Like HTTPS

```
Bob publishes: B = b×G  (one public key, like normal wallet)

Alice pays Bob:
  Alice generates random: r
  Shared secret: S = r × B = rb×G   ← ECDH, same as HTTPS
  Alice derives address: P = B + hash(S)×G
  Alice sends ETH to P
  Alice publishes R = r×G on Announcer

Bob scans Announcer:
  Sees R
  Computes: S = b × R = br×G = rb×G ✅  ← same shared secret
  Computes: P = B + hash(S)×G ✅
  Derives:  p = b + hash(S)
  Controls P ✅
```

**This works perfectly.** One key. Done. [reddit](https://www.reddit.com/r/crypto/comments/1vcux1/bitcoin_stealth_addresses_using_a_published/)

***

## So Why Does ERC-5564 Have Two Keys?

One key has exactly ONE problem: [vitalik.eth](https://vitalik.eth.limo/general/2023/01/20/stealth.html)

```
To SCAN (find your payments):
  Bob must compute: S = b × R for every R on Announcer
  Bob must use: b  ← his SPENDING private key

  Bob wants to scan on his phone, laptop, server, cloud...
  Every scanning device needs b.
  b is the key that controls ALL his money.
  
  Phone gets hacked → b leaks → all funds gone ❌
  Give b to accountant to scan → accountant can steal funds ❌
  Put b on a server → server gets hacked → funds gone ❌
```

***

## The Two-Key Solution — Separation of Powers [vitalik.eth](https://vitalik.eth.limo/general/2023/01/20/stealth.html)

```
Bob creates TWO keys:
  spending key:  b,  B = b×G  ← controls money, kept cold/offline
  viewing  key:  v,  V = v×G  ← only for scanning, can be shared

Alice uses VIEWING key for ECDH (finding):
  S = r × V = rv×G

Bob scans with VIEWING key (finding):
  S = v × R = vr×G  ← same S ✅
  Can find all payments ✅
  Cannot spend — doesn't know b ✅

Bob spends with SPENDING key (claiming):
  p = b + hash(S)  ← needs b, done offline ✅
```

***

## The Direct Answer To Your Question

```
Simple one-key version:
  → Cryptographically works ✅
  → But scanning device needs spending key ← security risk ❌

Two-key version:
  → Scanning uses viewing key (safe to expose)
  → Spending uses spending key (stays cold)
  → You can run a scanning server without risking your funds ✅

It's NOT a workaround for contract scanning.
It IS a separation of: "find my money" vs "spend my money"
Same reason hardware wallets exist — keep spending key offline.
```

 Vitalik literally says: "the viewing key step and the spending key step are two separate clever cryptographic operations chained together." [blog.plan99](https://blog.plan99.net/ecdh-in-the-payment-protocol-cb2f81962c1b?gi=1e5264bfcf12)

***

## Now Full Recursion Complete

```
HTTPS ECDH:
  shared secret → encrypt data

Stealth (one key):
  shared secret → derive address + private key
  works but scanning exposes spending key

Stealth (two keys):
  viewing key ECDH → shared secret → find address (safe to scan)
  spending key math → p = b + hash(S) → claim address (stays cold)
  
  Separation of concerns. Same math. Two roles.
```

NOW — pool contract? 😄