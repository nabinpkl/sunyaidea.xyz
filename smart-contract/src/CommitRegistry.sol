// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin Contracts v5.x (latest as of 2026)
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @title  CommitRegistry
/// @notice Stateless cryptographic commitment registry.
///
///         A signer presents (identity, payloadHash, sig).
///         The contract verifies the signature and emits a timestamped event.
///         The event log IS the database — there is zero on-chain storage.
///
/// @dev    Versioning: intentionally non-upgradeable.
///         New version = redeploy at new address = new EIP-712 domain.
///         Signatures from v1 cannot be replayed against v2.
///
/// @dev    Signature routing (2026):
///         1. ECDSA.tryRecover  — plain EOA
///                              — EIP-7702 accounts signing with raw private key
///                                (MetaMask Smart Accounts Kit, post-Pectra observed behavior)
///         2. ERC-1271 fallback — native smart accounts (Safe, Coinbase SW, etc.)
///                              — EIP-7702 accounts delegated via SignerERC7702
///
///         OZ closed issue #5707 saying EIP-7702 users who delegate to a
///         SignerERC7702 contract get correct ERC-1271 routing. However,
///         real-world MetaMask post-Pectra signs with raw ECDSA regardless.
///         We try ECDSA first to cover both without relying on wallet internals.
///         Cost: ~300 extra gas on the ERC-1271 path. Acceptable.
///
/// @dev    ERC-7739 (nested EIP-712 anti-phishing) is not implemented here.
///         It lives inside the identity contract (smart account), not the registry.
///         CommitRegistry calls isValidSignature and receives true/false — it never
///         sees the nested structure. Nothing to add here.
///
/// @dev    REPLAY / EVENT SPAM — accepted trade-off, documented:
///         Anyone who obtained a valid (identity, payloadHash, sig) triple off-chain
///         can re-broadcast it, emitting duplicate Committed events. This is a known
///         and deliberate design choice. Rationale:
///
///         - Preventing replay requires tracking seen digests on-chain.
///           That storage costs ~20 000 gas (SSTORE) per commit, doubling the cost
///           for every legitimate user, to stop an attack where the replayer pays
///           full transaction gas on every attempt anyway.
///
///         - The economic deterrent is real: the attacker pays L1 gas for each
///           duplicate event they emit. Sustained spam is expensive. This is a
///           meaningful constraint unlike off-chain spam (free to send).
///
///         - Semantic correctness is preserved: the first Committed event for a
///           given (identity, payloadHash) pair is the canonical record.
///           Off-chain tooling MUST treat earliest block.timestamp as authoritative
///           and deduplicate subsequent events for the same pair. See AGENTS.md:
///           "v0 verify: query chain, take earliest match."
///
///         If off-chain infra counts events or paginates without dedup, it will
///         see noise. This is an off-chain indexer concern, not a contract bug.
///         The fix belongs in the client/indexer, not here.

contract CommitRegistry is EIP712 {

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Custom error — cheaper than require(bool, string) on revert path.
    ///      Gas saved vs string error: ~150 gas at call site + calldata savings.
    error InvalidSignature();

    // ─────────────────────────────────────────────────────────────────────────
    // Typed-data schema
    // Changing this struct requires a redeploy. That is the version mechanism.
    // ─────────────────────────────────────────────────────────────────────────

    bytes32 private constant COMMIT_TYPEHASH =
        keccak256("Commit(address identity,bytes32 payloadHash)");

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted on every valid commit.
    /// @param  identity    The address that signed. v0: EOA. v1+: smart account.
    /// @param  payloadHash keccak256 of whatever the user committed off-chain.
    ///                     Plaintext never leaves the user's device.
    /// @param  timestamp   block.timestamp at the time of the commit.
    ///                     Validators can skew ~12 seconds — irrelevant for
    ///                     evidence that establishes weeks, months, or years.
    ///
    /// @dev    Both fields indexed for cheap client-side filtering.
    /// @dev    Duplicate events are possible (see REPLAY note in contract header).
    ///         Off-chain tooling must use earliest event per (identity, payloadHash)
    ///         as the canonical record. All subsequent duplicates are noise.
    event Committed(
        address indexed identity,
        bytes32 indexed payloadHash,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev "CommitRegistry" + "1" bake into the EIP-712 domain separator.
    ///      OZ's EIP712 base recomputes _domainSeparatorV4() dynamically when
    ///      block.chainid changes (handles forks correctly).
    ///      Cross-chain replay is impossible: same sig, different chainId =
    ///      different domain = different digest = verification fails.
    constructor() EIP712("CommitRegistry", "1") {}

    // ─────────────────────────────────────────────────────────────────────────
    // Core
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Commit a payload hash on behalf of an identity.
    /// @param  identity    Address whose key signs this commit.
    ///                     v0: user's EOA.
    ///                     v1+: smart account address (passkey-backed, Safe, etc.)
    ///                     The contract is identity-type-agnostic by design.
    /// @param  payloadHash keccak256 of the content being committed.
    ///                     What you hash is your choice — text, file, JSON, anything.
    ///                     The contract only stores the hash. Plaintext stays local.
    /// @param  sig         EIP-712 signature over Commit(identity, payloadHash).
    ///                     Accepts both 65-byte ECDSA and arbitrary-length ERC-1271 bytes.
    function commit(
        address identity,
        bytes32 payloadHash,
        bytes calldata sig
    ) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(COMMIT_TYPEHASH, identity, payloadHash))
        );

        if (!_isValidSig(identity, digest, sig)) revert InvalidSignature();

        emit Committed(identity, payloadHash, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns the exact EIP-712 digest the caller must sign.
    ///         Call this from the frontend before asking the wallet to sign —
    ///         confirms that client-side digest construction matches on-chain.
    ///         The wallet will display: CommitRegistry | identity | payloadHash.
    function buildDigest(
        address identity,
        bytes32 payloadHash
    ) external view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(COMMIT_TYPEHASH, identity, payloadHash))
        );
    }

    /// @notice Returns the current EIP-712 domain separator.
    ///         Recomputed dynamically by OZ EIP712 base — safe across forks.
    ///         Pass this to viem's signTypedData as the domain reference.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev ECDSA first: covers plain EOAs and EIP-7702 raw-key signers.
    ///      ERC-1271 fallback: covers native smart accounts and properly
    ///      delegated EIP-7702 accounts (SignerERC7702).
    ///      ERC-7739 compliance is the identity contract's responsibility, not ours.
    /// @dev Reentrancy is harmless: no state to corrupt.
    function _isValidSig(
        address identity,
        bytes32 digest,
        bytes calldata sig
    ) internal view returns (bool) {
        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, sig);
        if (err == ECDSA.RecoverError.NoError && recovered == identity) return true;

        return SignatureChecker.isValidERC1271SignatureNow(identity, digest, sig);
    }
}