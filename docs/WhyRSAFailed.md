Great question. You found the exact flaw that killed RSA key exchange in HTTPS. [reddit](https://www.reddit.com/r/networking/comments/16vcnh4/chrome_says_rsa_key_exchange_is_obsolete_under/)

***

## Your Suggestion — Ephemeral RSA Keys

You're thinking:

```
Generate fresh RSA keypair for every session
Use it once
Throw it away
→ Eve can't decrypt later because key is gone ✅
```

**You're right in theory.** This would technically work. [reddit](https://www.reddit.com/r/cryptography/comments/1oijp8c/forward_secrecy_with_just_rsa_using_ephemeral_keys/)

***

## Then Why Don't They Do It?

**Two reasons:** [reddit](https://www.reddit.com/r/networking/comments/16vcnh4/chrome_says_rsa_key_exchange_is_obsolete_under/)

```
Problem 1 — RSA key generation is EXPENSIVE:
  
  RSA requires finding two large prime numbers.
  Generating a 2048-bit RSA keypair: ~10-100ms on a server
  
  Amazon.com handles 100,000+ connections per second.
  100,000 × 10ms = 1,000,000ms = 1000 seconds of CPU
                                 per second of load. ❌
  
  ECDH generates a fresh keypair in ~0.1ms.
  1000× faster. [web:1529]
  Same security level at 256 bits vs 2048 bits.
  ECDH wins easily on performance alone.

Problem 2 — "Harvest Now, Decrypt Later" attack:
  
  Eve records all encrypted HTTPS traffic today.
  Waits 10-15 years.
  Quantum computers arrive.
  Shor's algorithm factorises RSA keys trivially.
  Eve decrypts ALL past traffic. [web:1534]
  
  This is actually happening right now.
  Nation states ARE recording encrypted traffic today
  banking on future quantum decryption. ← real threat
  
  ECDH is also vulnerable to quantum, BUT:
  → Much harder to break even with quantum
  → NIST already standardised post-quantum alternatives (2024)
  → ECDH getting replaced by ML-KEM (Kyber) in TLS 1.3+ now
```

***

## The Static RSA Problem (Old HTTPS Before 2020)

This is the real reason old HTTPS was broken: [youtube](https://www.youtube.com/watch?v=zZVGrGajopQ)

```
Old TLS 1.2 with RSA key exchange:

  Browser: generates random session key K
  Browser: encrypts K with Amazon's LONG-TERM public key
  Browser: sends encrypted K to Amazon
  Amazon:  decrypts K with its LONG-TERM private key
  Both use K for AES encryption ✅

  Eve records: encrypted(K) sitting on the wire

  5 years later: Amazon's private key leaks (hack, court order, ex-employee)
  Eve: takes all her recorded traffic
       decrypts K from recorded encrypted(K) using leaked private key
       decrypts ALL past sessions ❌

  The problem: encrypted(K) never expires.
               It sits on Eve's hard drive forever.
               Waiting for the private key to leak.
```

 This is why Chrome started showing "RSA key exchange is obsolete" warnings. [youtube](https://www.youtube.com/watch?v=zZVGrGajopQ)

***

## Why ECDH Fixes This

```
ECDH (Ephemeral):

  Browser:  generates random a, sends A = a×G
  Amazon:   generates random b, sends B = b×G
  Both:     compute shared secret ab×G
  Both:     derive K from ab×G
  
  a and b are IMMEDIATELY discarded after handshake.
  Stored nowhere. Not on disk. Not in RAM.
  
  Eve records: A and B floating on the wire
  5 years later Amazon's IDENTITY key leaks:
  → That key was only used for SIGNING (proving Amazon's identity)
  → NOT used for key exchange
  → Eve has A and B but cannot compute ab×G without knowing a or b
  → Past sessions safe forever ✅
  
  This is called Perfect Forward Secrecy (PFS).
```



***

## The Full Picture Now

```
RSA key exchange:     ❌ no forward secrecy, slow, quantum-vulnerable
                       Killed in TLS 1.3 (2018), deprecated fully now

Ephemeral RSA:        ✅ forward secrecy, ❌ too slow, ❌ quantum-vulnerable
                       Theoretically possible, never standardised

ECDH (ephemeral):     ✅ forward secrecy, ✅ fast, ⚠️ quantum-vulnerable
                       Current standard in TLS 1.3

ML-KEM / Kyber:       ✅ forward secrecy, ✅ fast, ✅ quantum-safe
                       Being rolled out in TLS 1.3 right now (2025-2026)
```

The direction is clear — everything moves toward ephemeral keys and forward secrecy. [reddit](https://www.reddit.com/r/networking/comments/16vcnh4/chrome_says_rsa_key_exchange_is_obsolete_under/)

Now — shall we really build? 😄