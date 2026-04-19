

***

## The Two Uses of Public Key Crypto

Public key crypto does TWO different jobs: [en.wikipedia](https://en.wikipedia.org/wiki/Public-key_cryptography)

```
Job 1 — ENCRYPTION (confidentiality):
  Anyone encrypts with your PUBLIC key
  Only you decrypt with your PRIVATE key
  
  Used by: Email (PGP/S/MIME), file encryption

Job 2 — KEY EXCHANGE (establishing a shared secret):
  Two parties derive the SAME shared secret
  without sending the secret itself
  
  Used by: HTTPS, Signal, stealth addresses
```

***

## How Email Uses It (Job 1 — Encryption)

```
Bob wants to email Alice secretly:

  1. Alice publishes her public key (PGP/S/MIME)
  2. Bob encrypts email WITH Alice's public key
  3. Sends ciphertext to Alice
  4. Alice decrypts with her private key ✅
  
  Eve intercepts the email → sees gibberish
  Only Alice can decrypt → only she has private key

Problem with normal email (Gmail etc):
  → No encryption by default
  → Gmail server reads everything
  → PGP exists but nobody uses it (UX nightmare)
```


***

## How HTTPS Uses It (Job 2 — Key Exchange)

```
HTTPS doesn't encrypt EVERYTHING with public key.
That would be too slow for streaming data.

Instead — hybrid approach: [web:1503][web:1505]

  Step 1 — Identity (public key):
    Server sends its certificate (contains public key)
    Browser verifies: "yes this is really amazon.com"
    
  Step 2 — Key exchange (Diffie-Hellman):
    Browser + Server do ECDH to agree on a shared session key
    Nobody else can compute this session key ✅
    
  Step 3 — Bulk encryption (symmetric):
    All actual data encrypted with that fast session key (AES)
    Public key crypto only used ONCE at the start

Public key = used for identity + key exchange
AES = used for actual data (1000× faster)
```

***

## How Signal Uses It (Both Jobs + More)

Signal is the most sophisticated: [cloudflare](https://www.cloudflare.com/learning/ssl/how-does-public-key-encryption-work/)

```
Signal uses:
  → Public key crypto for identity (who you are)
  → ECDH for key exchange (shared secret per session)
  → Double Ratchet algorithm (new key for EVERY message)
  → Forward secrecy (old messages can't be decrypted even if key stolen)

Each message has a fresh derived key.
Even if Signal's server is hacked → they can't read your messages.
Even if your phone is stolen → past messages are safe.
```

***

## How They All Connect To Stealth Addresses

```
All three use the SAME underlying math:

  Email (PGP):       encrypt(data, publicKey) → only privateKey decrypts
  HTTPS:             ECDH → shared session key → AES encrypt data  
  Signal:            ECDH + Double Ratchet → per-message keys
  Stealth addresses: ECDH → shared secret → derive one-time address

The shared secret in ECDH is the common thread:
  a × B = b × A = shared secret    ← Diffie-Hellman
  
  HTTPS uses it to encrypt traffic
  Signal uses it to derive message keys
  Stealth uses it to derive a one-time wallet address
```

 Same math, three different applications. Ethereum wallets, HTTPS, and Signal are all running the same elliptic curve Diffie-Hellman under the hood. [cloudflare](https://www.cloudflare.com/learning/ssl/how-does-public-key-encryption-work/)

Now — back to building? 😄