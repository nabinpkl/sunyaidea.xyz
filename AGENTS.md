<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Sunya

A product lab exploring one question: can a cryptographic commitment
registry for idea-priority evidence be delivered to users honestly,
without operating any server, and without hiding what's happening
underneath?

## The vision (why this exists)

A user has an idea. They commit a cryptographic hash of that idea
to a public blockchain under their own key. The commit is immutable,
timestamped by the chain, and signed by the user. Later, if the idea
becomes contested — in a dispute, a patent proceeding, a priority
argument, an academic scoop — the user can reveal the original text
and prove it hashes to the commit recorded on chain at that time.

The chain provides one piece of cryptographically anchored evidence
that no party (not Sunya, not the user, not an adversary) can forge
or alter after the fact. The user combines it with whatever other
evidence they hold (drafts, witnesses, related work, corroborating
communications) to build a complete case.

The value Sunya provides is this: if you commit an idea on Sunya,
at least one piece of your evidence is secured in a form that cannot
be faked or backdated. The rest of your case is your own.

## What the product is

- A client where users commit cryptographic hashes of any plaintext
  (thoughts, drafts, predictions, decisions, promises) to a public
  blockchain under their own signing key
- The plaintext stays on the user's device; only the hash is on chain
- Any commit can later be revealed, and the reveal is verifiable by
  anyone without needing to trust Sunya or any third party
- The user brings their own wallet, signs their own transactions,
  and pays their own gas. Sunya adds nothing between the user and
  the chain.
- The only things Sunya operates are (a) deployed smart contracts
  and (b) static frontend files. No servers, no APIs, no databases,
  no user accounts, no relayers, no indexers.

## What the product is not

- Not a notes app. Users don't store arbitrary data here; they commit
  hashes and keep plaintext themselves.
- Not a Google Keep competitor. The blockchain is load-bearing for
  the commit-reveal semantics; no centralized alternative can do
  this job.
- Not a guarantee of first thought. If you share an idea off-platform
  (in conversation, in a message, in a public post) before committing
  it, anyone with that information can commit the same hash before
  you. Sunya secures what you commit the moment you commit it; it
  cannot retroactively protect anything you've already disclosed
  elsewhere. The honest use pattern is: commit first, share later.
- Not a complete authorship proof. A commit is one piece of evidence.
  A strong case combines it with other evidence the user holds —
  drafts, witnesses, related work, corroborating communications.
- Not a business. The lab studies the primitive; it does not monetize it.

## What the lab is studying

Primary questions (tested in v0):

- Can a commit primitive be delivered with zero Sunya-operated
  infrastructure — user brings keys, user submits transactions,
  user pays gas — and still feel coherent to use?
- How small can the on-chain surface be while still supporting an
  honest commit-reveal flow?

Secondary questions (for later layers, after v0 ships):

- Can the same protocol later extend to passkey-based identity
  without breaking the client's conceptual model?
- Can progressive disclosure of the underlying crypto work in a UI
  that starts minimal and reveals depth as users ask?
- Can gasless onboarding be added as an opt-in layer without
  introducing a centralized relayer?

## Hard constraints

- No Sunya-operated dynamic HTTP endpoints, ever. Static files
  (HTML, JS, CSS, docs) on any CDN are fine. Dynamic APIs, backend
  services, databases, user accounts, relayers, paymasters, and
  indexers are not.
- No owner address and no msg.sender-based authorization in the
  contract. All contract operations are authorized by cryptographic
  signatures verified against the identity, not by the caller.
- The contract is not upgradable. If the contract needs a material
  change, it is redeployed as a new contract. This is not a refactor;
  it is a deliberate redeployment with explicit migration. The v0
  contract is deliberately small so that a future redeployment is
  cheap to consider.
- Plaintext never leaves the user's device unless the user explicitly
  chooses to share or back it up somewhere of their choosing.
- In v0, the user owns their keys and submits their own transactions.
  No relayer, no paymaster, no intermediary between user and chain.

## v0 scope

The v0 client is the thinnest possible implementation of the commit
primitive. The contract is correspondingly minimal. Everything else
is deferred to later layers, which are additive.

### v0 identity

- The user's existing EVM wallet (MetaMask, Rabby, or any standard
  wallet) is the v0 identity. The wallet's address is the signing key.
- No wallet generation inside the app. No passkey. No seed backup
  flow. No key rotation. The user brings a wallet or cannot use v0.
- Identity in the contract is derived from the signing key, not
  stored as an owner address, so the same design extends to passkeys
  and other signers in later layers without a client refactor.

### v0 contract

- One function: commit that verifies
  the EIP-712 signature against the identity root, then emits an event.
- One event: `Committed(identityRoot, payloadHash, timestamp)` carrying
  everything a verifier needs.
- No state beyond what events provide. The contract is stateless or
  near-stateless.
- No key registration, no key rotation, no key revocation, no views
  beyond basic event queries. These are deferred to future contracts.
- No admin, no owner, no upgradability, no fee mechanics, no
  configurable parameters, no paymaster coupling.
- Signature verification uses standard EIP-712 typed data and
  supports ERC-1271 so smart-account identities work later without
  a new contract.

### v0 client

- User connects their own wallet via a standard EVM connector.
- User types plaintext into a text area.
- Client computes the payload hash locally (keccak256), builds an
  EIP-712 commit intent, asks the wallet to sign, and the wallet
  submits the transaction directly to the chain.
- After the transaction confirms, the client shows the user: the
  identity root, the payload hash, the block number, and the
  transaction hash. The user saves the plaintext themselves.
- Separate verify flow: user pastes plaintext + identity root +
  block number, client queries the chain via public RPC, confirms
  the hash and the signer, displays the result.

### v0 UI

- Landing page with a single call-to-action
- Commit page (connect wallet → text input → sign → receipt)
- Verify page (text + identity + block → result)
- Nothing else

### What v0 explicitly does NOT include

- Passkey-based identity (future layer)
- Multi-key identity / key sets (future layer)
- Key rotation, revocation, recovery flows (future layer)
- Local storage of plaintexts, encrypted or otherwise (future layer)
- Commit history view (future layer)
- Rich content types — markdown, files, attachments (future layer)
- Shareable proof artifacts or verify URLs (future layer)
- Gasless onboarding / paymaster / ERC-4337 (future layer)
- Multi-device access (future layer)
- Any UI state beyond what v0 screens need (future layer)

### Why this split

The v0 goal is to prove the commit primitive works end-to-end with
real users, their real wallets, and a real chain — with the minimum
possible surface area. Every feature deferred above adds complexity
that is not required to validate the core thesis. Each later layer
adds only client and UI code; the v0 contract is treated as fixed
for the lifetime of v0. If a layer needs contract changes, that is
a new contract generation, not a v0 refactor.

## Rules (general)

- Design is implicit; does not need to scream words
- No AI cliché design: no glowing, no gradients, no sparkles, no big
  rounded corners, no blocky cards
- Verify before assuming; always see latest docs before coding as
  this project uses the latest libraries
- UI is component-based, not god components
- Do not add custom Tailwind classes to shadcn components if a CSS
  variable in globals.css can achieve the same result

## Frontend libs

- pnpm as package manager
- Tailwind CSS v4+ (css first)
- TanStack Query, Zustand
- motion/react for animation
- shadcn/ui
- viem for chain interaction
- libsodium-wrappers reserved for future local encryption (not used in v0)

## Refactor-resistance rules for coding agents

- Never bypass the client core library to talk to the chain from UI
  code. Chain reads and writes go through the core, always.
- Never add msg.sender-based authorization in the contract.
  Signatures verified against the identity are the only auth.
- Never add a user-facing "mode" flag at any layer. Different user
  experiences come from different identity types or different entry
  points, not from a toggle that says "convenient vs sovereign."
  Key properties like expiry or type are fine; UI toggles that
  change the trust model are not.
- Never optimize by caching chain state in a way that can drift
  from the event log. The event log is the source of truth.
- Never introduce a Sunya-operated server, relayer, paymaster, or
  indexer for any reason, for any slice, at any layer.
- Never assume identity equals "a specific EOA address" at the
  contract level. The contract verifies signatures against an
  identity root; the mapping between an address and an identity
  lives in the client and is expected to change as passkeys, key
  sets, and other identity forms are added in later layers.
- Before adding any feature, check the v0 scope section. If the
  feature is not in v0 and would require contract changes, stop.
  Either defer the feature to a future contract generation or
  reopen v0 explicitly (which means delaying the v0 launch).
  Contract changes after v0 ships are new contract generations,
  not refactors, and should be treated as explicit decisions.
- Before reading any other project document as authoritative, check
  that it reflects the current AGENTS.md. This file supersedes any
  prior framing (including earlier versions of this file) of what
  Sunya is.
