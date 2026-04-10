
Yes. You caught it exactly. That's a real active threat RIGHT NOW. [ssh](https://www.ssh.com/academy/how-quantum-computing-threats-impact-cryptography-and-cybersecurity)

***

## First — Yes RSA Was Used Until Very Recently

```
TLS 1.0/1.1/1.2 with RSA key exchange:
  Used broadly until ~2018-2020
  Chrome started warning "RSA key exchange is obsolete" around 2020 [web:1529]
  TLS 1.3 (2018) completely removed RSA key exchange [web:1542]
  
  But TLS 1.2 servers using RSA still existed in production
  until 2022-2023 in many places [web:1540]
  
  So yes — a LOT of historical traffic was encrypted with RSA.
```

***

## Your Question — Won't Quantum Decrypt Historical RSA Traffic?

**YES. Absolutely. This is already happening.** [ssh](https://www.ssh.com/academy/how-quantum-computing-threats-impact-cryptography-and-cybersecurity)

```
"Harvest Now, Decrypt Later" (HNDL) attack:

  NSA, Chinese intelligence, Russian FSB etc:
  → Recording ALL internet traffic since ~2010
  → Storing it all
  → Waiting for quantum computers
  
  When quantum arrives (~2030-2035 by consensus): [web:1550]
  → Run Shor's algorithm on stored RSA key exchanges
  → Recover the session keys
  → Decrypt 15-20 years of recorded internet history
  
  Every RSA-encrypted email, medical record, 
  financial transaction, diplomatic cable from that era
  → readable. [web:1545][web:1549]
```

***

## So ECDH Doesn't Fully Escape Either

```
Wait — ECDH also uses elliptic curves.
Shor's algorithm breaks elliptic curve discrete log too.

So recorded ECDH traffic is ALSO vulnerable to quantum? ✅ Yes.

BUT — forward secrecy saves you:

  RSA (old):
    Eve records: encrypted(sessionKey) with Amazon's long-term RSA key
    Quantum breaks Amazon's RSA key → reveals sessionKey → all past sessions readable ❌

  ECDH (ephemeral):
    Eve records: A = a×G and B = b×G
    Quantum breaks ECDH → recovers a from A
    → computes ab×G = shared secret
    → derives sessionKey
    → decrypts that session ❌
    
    BUT: a was thrown away. 
    Each session had a different a.
    Eve must quantum-crack EACH SESSION SEPARATELY.
    
    For RSA: crack ONE key → decrypt ALL history
    For ECDH: crack EACH session individually ← much harder
```

 So ECDH with forward secrecy raises the cost of quantum attack enormously, even if it doesn't eliminate it. [reddit](https://www.reddit.com/r/networking/comments/16vcnh4/chrome_says_rsa_key_exchange_is_obsolete_under/)

***

## The Real Solution — Post-Quantum Cryptography (PQC)

```
NIST finalised post-quantum standards in 2024:

  ML-KEM (Kyber) — key exchange, quantum-safe
  ML-DSA (Dilithium) — signatures, quantum-safe
  
  These are based on lattice problems, not elliptic curves.
  Shor's algorithm doesn't work on them.
  
  TLS 1.3 is being upgraded to hybrid:
  X25519 (ECDH) + ML-KEM together
  "Even if quantum breaks ECDH, ML-KEM is still safe" ✅

  Chrome already ships ML-KEM hybrid since 2024.
  Google, Cloudflare rolling it out now. [web:1529]
```

***

## The Uncomfortable Truth

```
Historical RSA traffic (pre-2018):
  → Already harvested by nation states
  → Will be decrypted when quantum arrives (~2030-2035)
  → Nothing you can do about past data ❌

ECDH traffic (2018-2024):
  → Each session needs individual quantum cracking
  → High cost but not impossible
  → Sensitive long-lived secrets at risk

Post-quantum (ML-KEM, 2024+):
  → Quantum-safe even with future computers ✅
  → But doesn't protect what was already recorded
```

 The uncomfortable reality: if you sent anything sensitive over HTTPS before 2018, assume a nation-state will eventually read it. [cyberresilience](https://cyberresilience.com/blog/when-will-quantum-decryption-become-practical/)

Now — PLEASE can we build the contracts? 😄