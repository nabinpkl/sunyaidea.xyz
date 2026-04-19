# CommitRegistry — Audit Notes

This file is the source of truth for what [CommitRegistry.sol](src/CommitRegistry.sol)
does and does not protect against, which tests demonstrate each property,
and which trade-offs were accepted deliberately.

If you are auditing this contract, start here.

## Dependencies

| Dep | Version | Source |
| --- | --- | --- |
| OpenZeppelin Contracts | **v5.6.1** | [lib/openzeppelin-contracts](lib/openzeppelin-contracts) (git tag `v5.6.1`) |
| Solidity | `^0.8.20` | pragma in [src/CommitRegistry.sol:2](src/CommitRegistry.sol#L2) |
| Foundry remapping | `@openzeppelin/contracts/` → `lib/openzeppelin-contracts/contracts/` | [foundry.toml:7](foundry.toml#L7) |

Three OZ primitives are in the trusted base:

- `EIP712` — domain separator, `_hashTypedDataV4`, dynamic chainid handling
- `ECDSA.tryRecover` — plain-EOA and EIP-7702 raw-key recovery, rejects high-s
- `SignatureChecker.isValidERC1271SignatureNow` — smart-account fallback, swallows reverts

No other dependencies. No custom crypto.

## Security properties → tests

Each row pairs a property the contract claims with the test that proves it.
All tests live in [test/CommitRegistry.t.sol](test/CommitRegistry.t.sol).

| Property | Test |
| --- | --- |
| On-chain digest matches independent EIP-712 reconstruction (no frontend/contract drift) | [`test_BuildDigest_MatchesClientReconstruction`](test/CommitRegistry.t.sol#L64) |
| Valid EOA signature emits `Committed` with correct fields and timestamp | [`test_Commit_EmitsEvent_OnValidEOA`](test/CommitRegistry.t.sol#L91) |
| Signature by a key other than the claimed identity is rejected | [`test_Commit_RevertsWhenSignerDoesNotMatchIdentity`](test/CommitRegistry.t.sol#L102) |
| Payload-hash tampering invalidates the signature | [`test_Commit_RevertsOnTamperedPayload`](test/CommitRegistry.t.sol#L110) |
| Arbitrary / malformed signature bytes revert cleanly | [`test_Commit_RevertsOnMalformedSignature`](test/CommitRegistry.t.sol#L119) |
| Cross-chain replay impossible (domain separator includes chainid) | [`test_Commit_RevertsWhenChainIdChanges`](test/CommitRegistry.t.sol#L130) |
| Signature malleability (high-s) rejected | [`test_Commit_RevertsOnHighSSignature`](test/CommitRegistry.t.sol#L173) |
| ERC-1271 smart-account path validates correctly | [`test_Commit_EmitsEvent_OnValidERC1271`](test/CommitRegistry.t.sol#L192) |
| ERC-1271 rejection path reverts with `InvalidSignature` | [`test_Commit_RevertsWhenERC1271Rejects`](test/CommitRegistry.t.sol#L207) |
| Hostile ERC-1271 that reverts cannot brick callers — normalized to `InvalidSignature` | [`test_Commit_RevertsGracefullyOnERC1271Revert`](test/CommitRegistry.t.sol#L216) |
| Any 32-byte value is an acceptable `payloadHash` (no content constraints) | [`testFuzz_Commit_AcceptsAnyPayloadHash`](test/CommitRegistry.t.sol#L232) |
| Random non-65-byte signature bytes are always rejected | [`testFuzz_Commit_RejectsRandomSignatureBytes`](test/CommitRegistry.t.sol#L237) |
| Replay of a valid triple is accepted by design and emits a later-timestamped event | [`test_Commit_AcceptsDuplicate_ReplayByDesign`](test/CommitRegistry.t.sol#L145) |

Run: `forge test -vv`.

## Accepted trade-offs

### Replay is permitted by design

A valid `(identity, payloadHash, sig)` triple can be re-broadcast by anyone
who obtains it. Each rebroadcast emits a new `Committed` event with a later
timestamp. See [src/CommitRegistry.sol:38-60](src/CommitRegistry.sol#L38-L60)
for the inline rationale. Proven by
[`test_Commit_AcceptsDuplicate_ReplayByDesign`](test/CommitRegistry.t.sol#L145).

Why we accepted it:

- Preventing replay requires an on-chain seen-digest set (~20 000 gas per
  commit). That doubles legitimate-user cost to deter an attack whose
  attacker already pays full L1 gas per attempt.
- Replay cannot forge a new commitment — the signer already authorized
  this `payloadHash` for this `identity`. It can only produce duplicate
  events.
- Semantic correctness is preserved: earliest `block.timestamp` per
  `(identity, payloadHash)` is the canonical record. Off-chain verifiers
  MUST dedupe on read.

If a future indexer paginates or counts events without dedup, that is an
indexer bug. It is not a contract defect.

### Validator timestamp skew

`block.timestamp` can drift ~12 seconds from wall clock. For evidence
establishing priority on the scale of weeks or years this is negligible
and not mitigated. Documented at
[src/CommitRegistry.sol:106-107](src/CommitRegistry.sol#L106-L107).

### Extra ~300 gas on the ERC-1271 path

`_isValidSig` always tries ECDSA first, then falls back to ERC-1271
([src/CommitRegistry.sol:212-221](src/CommitRegistry.sol#L212-L221)). Smart
accounts pay the wasted `tryRecover` call. This is deliberate: it covers
both EIP-7702 wallets that sign with raw ECDSA (MetaMask post-Pectra) and
those that delegate through `SignerERC7702`, without sniffing wallet
internals.

## Deliberately not protected against

These are out of scope by design, not oversights.

### Pre-commit disclosure

If the user shared their idea off-platform (conversation, message, public
post) before committing, anyone with that plaintext can compute the same
`payloadHash` and commit it first. The contract protects what you commit
at the moment you commit it. The honest use pattern — documented in
[AGENTS.md](../AGENTS.md) under *What the product is not* — is **commit
first, share later**. No on-chain mechanism can protect against prior
disclosure.

### Front-running a pending commit

A mempool observer who sees a pending `commit` tx learns the
`payloadHash` (already public at the moment of submission). They cannot
forge the signature, so they cannot commit under the user's identity.
They can commit the same hash under their *own* identity — but since
their identity differs, both commits co-exist without conflict. No
first-to-commit ordering is promised by the contract; ordering in a
dispute falls back to block timestamp across distinct identities, which
is an off-chain evidentiary question.

### Wallet-side phishing (ERC-7739)

ERC-7739's nested EIP-712 anti-phishing lives inside the identity contract
(smart account), not inside the registry. `CommitRegistry` only sees the
`bool` returned from `isValidSignature` — it cannot inspect nesting.
Delegating this to the identity contract is correct per the ERC and
documented at [src/CommitRegistry.sol:33-36](src/CommitRegistry.sol#L33-L36).

### Plaintext loss

The contract never sees plaintext. If the user loses their plaintext, the
commit becomes unverifiable. This is a feature, not a bug: Sunya cannot
lose what it never held. Out of scope for the contract.

### keccak256 preimage / collision attacks

We assume keccak256 is collision-resistant and preimage-resistant. A
practical break would invalidate every Ethereum commit, not just ours.
Not mitigated, not mitigatable.

### Denial of service via event spam

Mitigated economically, not structurally: each spam event costs the
attacker L1 gas. There is no rate limiter, no allowlist, no fee. Consistent
with the "no owner, no admin, no configurable parameters" stance at
[src/CommitRegistry.sol:123-132](src/CommitRegistry.sol#L123-L132).

### Reentrancy

The `commit` function has no state to corrupt — it verifies and emits.
Reentrancy from a hostile ERC-1271 `isValidSignature` is harmless and
noted at [src/CommitRegistry.sol:211](src/CommitRegistry.sol#L211).

### Contract upgradability

None. No proxy, no admin, no `UUPS`, no `selfdestruct`. Material changes
require redeploying at a new address, which produces a new EIP-712 domain
and makes v1 signatures invalid against v2. This is the version mechanism
([src/CommitRegistry.sol:16-18](src/CommitRegistry.sol#L16-L18)). Any
migration is explicit, not silent.

### Governance

None. There is no owner, no role, no timelock, no parameter. Nothing to
govern. `msg.sender`-based authorization is explicitly forbidden by
[AGENTS.md](../AGENTS.md) under *Hard constraints* and *Refactor-resistance
rules*.
