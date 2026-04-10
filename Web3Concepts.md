
Here is the collection of concepts used

- EIP-1193 connector
- EIP-1193 defines the standard for the Ethereum provider API, while EIP-6963 introduces a standardized way to discover and connect multiple injected wallet providers.
- CAIP-style chain/account/session normalization 
- Internal WalletAccount and AuthProof types, not SDK objects
- Separate crypto layer, independent of wallet vendor 

- Wallet adapter interface

MetaMaskAdapter implements Wallet adapter for now

- 
accountId: CAIP-style chain/account reference.

chainId: normalized chain reference.

address: display address.

capabilities: sign message, sign typed data, switch chain, session update.

# Legals
U.S. GENIUS Act (passed July 2025) and Europe’s MiCA.

# Web3 Gap Testing tool
Playwright dapp testing too
testing metamask version drift
and ui changes


# LI.FI usecase
Best pricing — LI.FI compares rates across 31 DEXs and 27 bridges simultaneously, finding the cheapest route you'd miss using one DEX
Cross-chain — A single DEX only works on one chain. LI.FI handles multi-chain transfers (e.g., ETH on Ethereum → USDC on Arbitrum) in one transaction
Split routes — It can split a trade across multiple DEXs for better pricing on large amounts
One integration — Instead of integrating Uniswap, SushiSwap, 1inch, Stargate, etc. separately, you integrate LI.FI once and get all of them
Fallback/reliability — If one bridge is down, it automatically routes through another

MPC
AA

EIP-6963

EIP-712 - DOMAIN_SEPARTOR + consutor + digest

ChaCha20-Poly1305

Nostr

EIP-712

Solution 1 — Stealth Addresses (EIP-5564)

ecrecover

The Solution — CREATE2 Same Address on ALL Chains
CREATE2 produces deterministic contract addresses from a salt. Same salt = same address on every EVM chain:

New UX (Circle Paymaster + ERC-4337):
  User has USDC (any chain)
  App uses Paymaster → gas paid in USDC automatically
  User sees: one button, signs once, done ✅
Pimlico public bundler


wait wait that means i need to understand the contract storage model i thought contract had fixed size allocated to their storage and each increase in user costs us more gas lol

mapping(bytes32 => bytes32) private _pointers;

This Is Exactly Why Oasis Sapphire Exists

This already exists — it is called a commit-reveal scheme + keeper pattern. And with Chainlink Automation or Gelato's decentralized keeper network, the trigger itself is decentralized.

#

This is what Vitalik proposed and Argent wallet implements:

This is a crucial question that goes back to the very core of the key derivation design. Let me think through every scenario.

### The Problem Restated

```
User's vault is encrypted with VMK
VMK is derived from wallet private key
User loses wallet / wants to switch wallets
→ New wallet = different private key = different VMK
→ Cannot decrypt old vault ❌
```

### Why This Is Hard

The encryption is deliberately tied to the wallet key. That is the whole security model.  Breaking that tie means breaking the security. There is a fundamental tension: [docs.ipfs](https://docs.ipfs.tech/concepts/content-addressing/)

```
Tight key binding:   maximum security, zero recovery options
Loose key binding:   recovery possible, but how do you authorize it?
```

### The Solutions

**Solution 1 — Secret Recovery Phrase (Already Planned — Phase 4)**

This is the cleanest answer and you already have it in the roadmap:

```
VMK is NOT derived from wallet directly.
VMK is derived from a 24-word BIP39 mnemonic.
Wallet just SIGNS to prove ownership, not to derive the key.

Flow:
  24-word phrase → derive VMK (deterministic, permanent)
  wallet signs to authorize access → app derives VMK from phrase
  
New wallet?
  User enters 24-word phrase → derives same VMK → decrypts vault ✅
  Wallet is just authentication, not encryption key
  
Phrase lost + wallet lost?
  → vault unrecoverable (user's responsibility)
```

This completely separates authentication (wallet) from encryption (phrase). Wallet changes are free.

**Solution 2 — Contract-Managed Key Rotation**

```solidity
contract SunyaPointer {
    // locatorId → current authorized wallet
    mapping(bytes32 => address) private _authorizedWallet;
    
    // Add new wallet authorized to update this locatorId
    function authorizeNewWallet(
        bytes32 locatorId,
        address newWallet,
        bytes calldata oldWalletSig  // signature from OLD wallet
    ) external {
        require(_verifyOldWallet(locatorId, newWallet, oldWalletSig));
        _authorizedWallet[locatorId] = newWallet;
    }
}
```

But this only rotates the **pointer authorization**. The vault is still encrypted with old VMK. New wallet cannot decrypt.  Contract rotation alone does not solve decryption. [par.nsf](https://par.nsf.gov/servlets/purl/10451529)

**Solution 3 — Re-encrypt Vault With New Key**

```
User has both old and new wallet simultaneously:
  1. Decrypt vault with old VMK (old wallet signs)
  2. Re-encrypt vault with new VMK (new wallet)
  3. Upload re-encrypted vault to IPFS → new CID
  4. Update contract pointer to new CID
  5. Old wallet revoked
```

Works perfectly but requires both wallets active at same time.  Not useful if old wallet is lost. [coinsbench](https://coinsbench.com/accessing-private-data-in-smart-contracts-e346f3ac7910)

**Solution 4 — Social Recovery (Contract-Based)**

This is what Vitalik proposed and Argent wallet implements: [x](https://x.com/safe/status/1877342297668370553)

```solidity
contract SunyaPointer {
    mapping(bytes32 => address[]) private _guardians;
    mapping(bytes32 => RecoveryRequest) private _recoveryRequests;
    
    // User pre-designates 3 trusted people
    // 2-of-3 guardians can authorize new wallet
    function initiateRecovery(bytes32 locatorId, address newWallet) external {
        _recoveryRequests[locatorId] = RecoveryRequest(newWallet, 1);
    }
    
    function approveRecovery(bytes32 locatorId) external {
        require(isGuardian(locatorId, msg.sender));
        _recoveryRequests[locatorId].approvals++;
        if (_recoveryRequests[locatorId].approvals >= 2) {
            // execute recovery
        }
    }
}
```

Still does not solve VMK re-encryption though. Same problem — guardians authorize new wallet but cannot re-encrypt the vault. [pdtn](https://pdtn.org/smart-contracts-privacy/)

### The Honest Architecture Decision

The BIP39 phrase approach from Phase 4 is the ONLY clean solution: [par.nsf](https://par.nsf.gov/servlets/purl/10451529)

```
WRONG design (current assumption):
  VMK = HKDF(walletPrivKey, "sunya_vmk")
  → VMK changes when wallet changes
  → vault becomes unreadable on wallet change ❌

RIGHT design:
  VMK = HKDF(BIP39phrase, "sunya_vmk")
  → VMK is permanent, independent of wallet
  → wallet is just authentication token
  → change wallet freely, vault stays readable ✅
  → lose wallet → recover with phrase ✅
  → lose phrase AND wallet → vault gone (acceptable) ✅
```

### The Contract Enhancement For This

The contract stores ONE extra thing — an encrypted copy of the BIP39 phrase itself, encrypted to the wallet:

```
contract stores:
  locatorId → cidHash (the vault pointer)
  locatorId → encryptedRecoveryHint (optional)

encryptedRecoveryHint = encrypt(
    "your phrase is stored in your password manager",
    walletKey
)
```

When user rotates wallet: [ethereum](https://ethereum.org/developers/docs/smart-contracts/anatomy/)

```
1. Decrypt vault with BIP39-derived VMK (unchanged)
2. Update contract: new wallet authorized for locatorId
3. Done — vault never needed re-encryption
   because VMK was NEVER tied to wallet in first place
```

### The Complete Key Architecture

```
BIP39 phrase (24 words)
    ↓ HKDF("sunya_vmk")
    ↓
VMK (permanent, wallet-independent)
    ↓ AES-GCM-256
    ↓
Encrypted vault ← lives on IPFS forever

Wallet keypair (can be rotated freely)
    ↓ signs transactions
    ↓
Contract authorization ← controls who can update the pointer
```

These two layers are completely independent. VMK never changes. Wallet can change any time. The contract just tracks which wallet is currently authorized to update which locatorId. Smart contract makes this possible — and you were right, endless possibilities. [ethereum](https://ethereum.org/developers/docs/smart-contracts/anatomy/)

This is Phase 1 design decision that you need to make NOW before writing any code — because it changes how VMK is derived. BIP39 phrase as VMK root is the right answer. Ready to write the code with this design?

The BIP39 phrase approach from Phase 4 is the ONLY clean solution:

locatorId → cidHash         (the vault pointer)
locatorId → authorizedWallet  (who can update the pointer)

Wallet rotation:
  Old wallet signs: "authorize newWallet for locatorId X"
  Contract updates authorizedWallet
  Done. VMK untouched. Vault untouched. IPFS untouched.

  EIP-712

  ERC-4337 Bundlers — decentralized, you do not run them:

Our architecture = IPCM + BIP39 VMK + IPFS + Nostr for fast sync

IPCM handles:    permanent mutable pointer, per user, any EVM chain
BIP39 VMK:       encryption independent of wallet
IPFS:            actual encrypted vault storage
Nostr:           fast device sync (skip contract for live sync)
ERC-4337 USDC:   gas payment in stablecoins

This is ERC-4337 + EIP-7702 session key delegation. The user signs once per day at most. Every individual save is completely invisible.

EIP-7702 — The May 2025 Ethereum Upgrade
Session keys = cryptographic delegation
  "This temp key can sign on my behalf" 
  → eliminates popup fatigue ✅
  → does NOT eliminate gas ❌

Gas = payment to Ethereum validators for computation
  Validators are real people running real hardware
  They get paid in ETH
  Someone ALWAYS pays, even if not the user

  #

  Build the most private possible notes app
that is ALSO the most frictionless possible
that is ALSO serverless
that is ALSO decentralized
that is ALSO syncable
that is ALSO recoverable
that is ALSO on the web



#

SignerEIP7702

#
Front running the attack
1. Front-run proof     → attacker can't steal your locatorId from mempool
2. Wallet agnostic     → locatorId survives wallet swap
3. Ownership proof     → only YOU can register this locatorId

#
Stealth Addresses (ERC-5564) — How It Actually Works

Two wallets approach:
  Wallet A (public)  → never touches contract
  Wallet B (fresh)   → does setup() on contract

  Problem:
  → You manually created Wallet B
  → You funded Wallet B from somewhere
  → If funded from Wallet A → trivially linked ❌
  → If funded from exchange → breaks link ✅
  → Observer still can't PROVE B belongs to A
     unless funding is traceable

Stealth address approach:
  Bob publishes ONE stealth meta-address publicly
  Alice (the app) generates 0xSTEALTH mathematically
  Alice sends ETH to 0xSTEALTH
  Bob uses 0xSTEALTH to do setup()

  Key difference:
  → Bob NEVER manually created 0xSTEALTH
  → ALICE generated it from Bob's meta-address
  → Bob just scans the chain to find it
  → No funding trail FROM Bob to 0xSTEALTH ✅

  Alice (sender) generates stealth address for Bob (receiver)
  Alice funds it as part of sending money ✅

#
Privacy pools

#
  → Double Ratchet algorithm (new key for EVERY message)

#
  → Forward secrecy (old messages can't be decrypted even if key stolen)




#

What EIP-1271 Does

#
EIP-2098 compact 64-byte sigs

#

SunyaNotes users:
  → Open MetaMask
  → Sign and submit their own transactions
  → Pay their own gas (Base = fraction of a cent)

Relayer use cases:
  → Gasless UX (sponsor gas for users)
  → Account abstraction / ERC-4337 bundlers
  → Backend-submitted transactions

Do you need any of these?