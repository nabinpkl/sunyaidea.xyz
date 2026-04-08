// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title VaultRegistry
/// @notice Commit-reveal registration + wallet-agnostic locatorIds + user-sovereign session keys
/// @dev Part of SunyaNotes — serverless encrypted notes experiment
///
/// TRUST ASSUMPTION: On L2s (Base, Arbitrum), the sequencer controls block.timestamp.
/// MIN_COMMIT_DELAY relies on sequencer honesty. On mainnet, miner drift is ±15s max.
/// This is an accepted tradeoff for L2 deployment.
///
/// RELAY SUPPORT: setup() and authorizeSessionKey() accept an explicit owner param
/// so a relayer can submit on behalf of the owner. The EIP-712 signature is the auth.
/// commit() must still be called directly by the owner (msg.sender = owner) since
/// it has no sig check — separating owner from msg.sender there would open a griefing
/// vector. set() accepts an explicit sessionKey + keySig so a relayer can submit
/// silent background saves on behalf of an unfunded session key.
///
/// PRIVACY NOTE: vault ownership is permanently public via ownerOf() and vaultOf().
/// Relay support for set() hides write-activity timing but not ownership identity.
/// For identity privacy, use a fresh wallet for registration (stealth address pattern).
/// Meta-transaction / full relay support (ERC-2771 or ERC-4337) is deferred to a future version.

contract VaultRegistry is EIP712 {

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct Pointer {
        bytes32 cidHash;
        uint64 timestamp;
    }

    /// @dev hash covers ALL setup params, not just sender+salt — see commit()
    struct CommitData {
        bytes32 hash;
        uint64 timestamp;
    }

    /// @dev Packed into one 256-bit slot — expiry + issuedAt + epoch = 192 bits
    struct SessionData {
        uint64 expiry;
        uint64 issuedAt;
        uint64 epoch; // epoch at issuance — key is dead if epoch < _ownerEpoch[owner]
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev 12s minimum delay — prevents same-block front-running.
    uint64 public constant MIN_COMMIT_DELAY = 12 seconds;

    /// @dev 24h window — user can walk away and return without commitment expiring.
    uint64 public constant MAX_COMMIT_DELAY = 24 hours;

    /// @dev Hard protocol ceiling on user-chosen session lifetime.
    uint64 public constant ABSOLUTE_MAX_LIFETIME = 365 days;

    /// @dev EIP-712 type hash for the SetupIntent struct.
    bytes32 public constant SETUP_INTENT_TYPEHASH =
        keccak256(
            "SetupIntent("
            "address wallet,"
            "address sessionKey,"
            "uint64 sessionExpiry,"
            "uint64 chosenMaxLifetime,"
            "bytes32 salt,"
            "uint256 nonce"
            ")"
        );

    /// @dev EIP-712 type hash for the AuthorizeKey struct.
    bytes32 public constant AUTHORIZE_KEY_TYPEHASH =
        keccak256(
            "AuthorizeKey("
            "address wallet,"
            "address sessionKey,"
            "uint64 expiry,"
            "uint256 nonce"
            ")"
        );

    /// @dev EIP-712 type hash for the SetIntent struct.
    bytes32 public constant SET_INTENT_TYPEHASH =
        keccak256(
            "SetIntent("
            "bytes32 locatorId,"
            "bytes32 cidHash,"
            "uint256 nonce"
            ")"
        );

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => Pointer) private _pointers;
    mapping(address => CommitData) private _commitments;
    mapping(address => mapping(address => SessionData)) private _sessionKeys;
    mapping(address => uint64) private _maxLifetimes;

    /// @dev Incremented by revokeAllSessionKeys(). Keys from a prior epoch are dead.
    mapping(address => uint64) private _ownerEpoch;

    /// @dev Consumed on every setup() and authorizeSessionKey() — prevents EIP-712 signature replay.
    mapping(address => uint256) private _nonces;

    /// @dev Enforces one vault per owner. Also enables forward lookup: owner → locatorId.
    mapping(address => bytes32) private _vaultOf;

    /// @dev Per-session-key nonce for set() — prevents SetIntent replay.
    mapping(address => uint256) private _sessionKeyNonces;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event Committed(address indexed committer);
    event Registered(bytes32 indexed locatorId, address indexed owner);
    event PointerUpdated(
        bytes32 indexed locatorId,
        bytes32 cidHash,
        uint64 timestamp
    );
    event SessionKeyAuthorized(
        address indexed owner,
        address indexed sessionKey,
        uint64 expiry
    );
    event SessionKeyRevoked(address indexed owner, address indexed sessionKey);
    event AllSessionKeysRevoked(address indexed owner, uint64 newEpoch);
    event MaxLifetimeUpdated(address indexed owner, uint64 newMaxLifetime);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error NoCommitmentFound();
    error CommitTooRecent();
    error CommitExpired();
    error CommitmentMismatch();
    error AlreadyRegistered();
    error NotRegistered();
    error SessionKeyExpiredOrInvalid();
    error ZeroCidHash();
    error InvalidExpiry();
    error ZeroAddress();
    error ExceedsAbsoluteMaxLifetime();
    error ExpiryExceedsUserLimit();
    error InvalidIntent(); // EIP-712 sig does not match declared owner or session key
    error OwnerAlreadyRegistered();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor() EIP712("SunyaNotes", "1") {}

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 1 — Commit
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Submit blinded commitment. Wait 12s then call setup().
    ///
    /// @dev Commitment must cover ALL setup parameters:
    ///      keccak256(abi.encodePacked(owner, salt, sessionKey, sessionExpiry, chosenMaxLifetime))
    ///      Use buildCommitment() to generate this off-chain before calling here.
    ///
    ///      Binding all params prevents a compromised setup() call from swapping
    ///      sessionKey/expiry/lifetime after an honest commit().
    ///      Residual risk: a fully malicious frontend controls both calls — the
    ///      EIP-712 signature required in setup() is the primary defense there,
    ///      since MetaMask renders all params in human-readable form for the user.
    ///
    ///      Overwrites any prior stranded commitment — user never gets stuck.
    ///
    ///      Note: commit() must be called directly by the owner (msg.sender = owner).
    ///      It has no sig check — separating owner from msg.sender here would allow
    ///      anyone to overwrite any owner's commitment (griefing). For relay-submitted
    ///      setup(), the owner param must match the address used in this commitment.
    function commit(bytes32 commitment) external {
        _commitments[msg.sender] = CommitData({
            hash: commitment,
            timestamp: uint64(block.timestamp)
        });
        emit Committed(msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 2 — Reveal + Register
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Reveal salt, verify commitment, register vault.
    ///
    /// @dev Three-layer security:
    ///      A. EIP-712 sig — MetaMask shows wallet/sessionKey/expiry/lifetime in
    ///         human-readable form. User explicitly approves exact params. Sig is
    ///         verified on-chain so attacker cannot forge owner intent.
    ///      B. Commitment match — all five fields here must match what was committed.
    ///         Closes the substitution attack even if setup() is called by a relay.
    ///      C. Nonce consumed — prevents sig replay across separate setup() calls.
    ///
    /// @param owner              Wallet address that owns the vault
    /// @param salt               Private random bytes32
    /// @param sessionKey         Ephemeral browser keypair (address(0) = cold vault, no session key)
    /// @param sessionExpiry      Unix timestamp for first session key (ignored if sessionKey = 0)
    /// @param chosenMaxLifetime  User's sovereign limit (≤ ABSOLUTE_MAX_LIFETIME)
    /// @param ownerSig           EIP-712 signature over SetupIntent, signed by owner
    /// @return locatorId         Permanent vault identifier — store locally
    function setup(
        address owner,
        bytes32 salt,
        address sessionKey,
        uint64 sessionExpiry,
        uint64 chosenMaxLifetime,
        bytes calldata ownerSig
    ) external returns (bytes32 locatorId) {
        // ── A. Verify EIP-712 signed intent ─────────────────────────────────
        {
            uint256 nonce = _nonces[owner]++;
            bytes32 structHash = keccak256(
                abi.encode(
                    SETUP_INTENT_TYPEHASH,
                    owner,
                    sessionKey,
                    sessionExpiry,
                    chosenMaxLifetime,
                    salt,
                    nonce
                )
            );
            if (!SignatureChecker.isValidSignatureNow(owner, _hashTypedDataV4(structHash), ownerSig))
                revert InvalidIntent();
        }

        // ── B. Verify commitment covers all params ───────────────────────────
        CommitData storage c = _commitments[owner];
        if (c.timestamp == 0) revert NoCommitmentFound();

        uint64 elapsed = uint64(block.timestamp) - c.timestamp;
        if (elapsed < MIN_COMMIT_DELAY) revert CommitTooRecent();
        if (elapsed > MAX_COMMIT_DELAY) revert CommitExpired();

        if (c.hash != _buildCommitment(owner, salt, sessionKey, sessionExpiry, chosenMaxLifetime))
            revert CommitmentMismatch();

        if (chosenMaxLifetime > ABSOLUTE_MAX_LIFETIME)
            revert ExceedsAbsoluteMaxLifetime();

        locatorId = _deriveLocatorId(salt);

        // One vault per owner — session keys are owner-wide so multiple vaults
        // would allow a session key for one vault to write to all of them.
        if (_vaultOf[owner] != bytes32(0)) revert OwnerAlreadyRegistered();
        if (_owners[locatorId] != address(0)) revert AlreadyRegistered();

        // ── C. Commit consumed — write state ────────────────────────────────
        _owners[locatorId] = owner;
        _vaultOf[owner] = locatorId;
        _maxLifetimes[owner] = chosenMaxLifetime;
        delete _commitments[owner];

        emit Registered(locatorId, owner);

        // Session key is optional — address(0) = cold vault (Safe multisig, no browser key)
        if (sessionKey != address(0)) {
            if (sessionExpiry <= uint64(block.timestamp))
                revert InvalidExpiry();
            if (sessionExpiry > uint64(block.timestamp) + chosenMaxLifetime)
                revert ExpiryExceedsUserLimit();

            _sessionKeys[owner][sessionKey] = SessionData({
                expiry: sessionExpiry,
                issuedAt: uint64(block.timestamp),
                epoch: _ownerEpoch[owner]
            });
            emit SessionKeyAuthorized(owner, sessionKey, sessionExpiry);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Session key management
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Authorize a new session key (new device or key rotation).
    /// @dev EIP-712 signed intent prevents blind-signing attacks from phishing
    ///      frontends — MetaMask renders wallet/sessionKey/expiry in human-readable
    ///      form. Nonce prevents replay across separate authorizeSessionKey() calls.
    ///      Shares the same _nonces[owner] counter as setup() — cross-function
    ///      replay is also prevented.
    /// @param owner       Wallet address that owns the vault
    /// @param sessionKey  Ephemeral address to authorize
    /// @param expiry      Unix timestamp after which the key is invalid
    /// @param ownerSig    EIP-712 signature over AuthorizeKey, signed by owner
    function authorizeSessionKey(
        address owner,
        address sessionKey,
        uint64 expiry,
        bytes calldata ownerSig
    ) external {
        // ── 1. Cheap pure checks — no storage reads ──────────────────────────
        if (sessionKey == address(0)) revert ZeroAddress();
        if (expiry <= uint64(block.timestamp)) revert InvalidExpiry();

        // ── 2. Verify EIP-712 sig before any storage reads or writes ─────────
        uint256 nonce = _nonces[owner]++;
        bytes32 structHash = keccak256(
            abi.encode(AUTHORIZE_KEY_TYPEHASH, owner, sessionKey, expiry, nonce)
        );
        if (!SignatureChecker.isValidSignatureNow(
            owner,
            _hashTypedDataV4(structHash),
            ownerSig
        )) revert InvalidIntent();

        // ── 3. Storage reads + writes after sig confirmed ────────────────────
        if (_vaultOf[owner] == bytes32(0)) revert NotRegistered();
        if (expiry > uint64(block.timestamp) + _maxLifetimes[owner])
            revert ExpiryExceedsUserLimit();

        _sessionKeys[owner][sessionKey] = SessionData({
            expiry: expiry,
            issuedAt: uint64(block.timestamp),
            epoch: _ownerEpoch[owner]
        });
        emit SessionKeyAuthorized(owner, sessionKey, expiry);
    }

    /// @notice Permanently revoke one session key (lost/stolen device).
    /// @dev Deletes storage — cannot be undone.
    function revokeSessionKey(address sessionKey) external {
        delete _sessionKeys[msg.sender][sessionKey];
        emit SessionKeyRevoked(msg.sender, sessionKey);
    }

    /// @notice Permanently revoke ALL session keys by advancing the owner epoch.
    ///
    /// @dev This is the KILL switch. updateMaxLifetime(0) is the PAUSE switch.
    ///      updateMaxLifetime(0)   → keys paused, revive if limit raised later (Zombie Keys)
    ///      revokeAllSessionKeys() → keys permanently dead regardless of future limit changes
    ///
    ///      All keys issued in epoch N are permanently dead after this call.
    ///      New keys authorized in epoch N+1 (after this call) are unaffected.
    ///      Epoch is transaction-ordered, not timestamp-ordered — same-block keys
    ///      authorized after this call correctly receive the new epoch and survive.
    function revokeAllSessionKeys() external {
        unchecked { _ownerEpoch[msg.sender]++; }
        emit AllSessionKeysRevoked(msg.sender, _ownerEpoch[msg.sender]);
    }

    /// @notice Update global max session lifetime.
    /// @dev Only callable by owner wallet directly — session keys cannot call this.
    ///
    ///      PAUSE: setting to 0 blocks all session key writes immediately.
    ///      keyAge >= 0 is always true, so every key fails Check 3 in set().
    ///      Existing keys revive if limit is raised again (Zombie Keys).
    ///      To permanently kill existing keys, call revokeAllSessionKeys() instead.
    function updateMaxLifetime(uint64 newMaxLifetime) external {
        if (newMaxLifetime > ABSOLUTE_MAX_LIFETIME)
            revert ExceedsAbsoluteMaxLifetime();
        _maxLifetimes[msg.sender] = newMaxLifetime;
        emit MaxLifetimeUpdated(msg.sender, newMaxLifetime);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core write
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Update vault pointer. Called silently by session key on every save.
    ///
    /// @dev Two execution paths:
    ///      A. msg.sender == owner: direct owner write (cold vault / Safe multisig).
    ///         sessionKey and keySig params are ignored in this path.
    ///      B. msg.sender != owner: relay path. sessionKey signs SetIntent off-chain,
    ///         relay submits. Four-part validity check applied to sessionKey:
    ///         1. Key exists (issuedAt != 0)
    ///         2. Key has not passed its own expiry
    ///         3. Key age has not exceeded owner's current maxLifetime (retrospective pause)
    ///            >= instead of > — when maxLifetime=0, keyAge(0)>=0 is true,
    ///            so a key issued in the same block as updateMaxLifetime(0) is blocked.
    ///         4. Key was not permanently revoked via revokeAllSessionKeys() (epoch check)
    function set(
        bytes32 locatorId,
        bytes32 cidHash,
        address sessionKey,
        bytes calldata keySig
    ) external {
        if (cidHash == bytes32(0)) revert ZeroCidHash();

        address owner = _owners[locatorId];
        if (owner == address(0)) revert NotRegistered();

        if (msg.sender != owner) {
            // ── Relay path: verify session key signed this exact SetIntent ───
            uint256 nonce = _sessionKeyNonces[sessionKey]++;
            bytes32 structHash = keccak256(
                abi.encode(SET_INTENT_TYPEHASH, locatorId, cidHash, nonce)
            );
            if (!SignatureChecker.isValidSignatureNow(
                sessionKey,
                _hashTypedDataV4(structHash),
                keySig
            )) revert InvalidIntent();

            SessionData storage sd = _sessionKeys[owner][sessionKey];

            // Check 1: key exists
            if (sd.issuedAt == 0) revert SessionKeyExpiredOrInvalid();

            // Check 2: key has not passed its own expiry
            if (uint64(block.timestamp) > sd.expiry)
                revert SessionKeyExpiredOrInvalid();

            // Check 3: retrospective pause — owner lowered maxLifetime
            uint64 keyAge = uint64(block.timestamp) - sd.issuedAt;
            if (keyAge >= _maxLifetimes[owner])
                revert SessionKeyExpiredOrInvalid();

            // Check 4: key issued in a prior epoch — permanently revoked
            if (sd.epoch < _ownerEpoch[owner])
                revert SessionKeyExpiredOrInvalid();
        }
        // ── Direct owner path: msg.sender == owner, no session key required ──

        _pointers[locatorId] = Pointer({
            cidHash: cidHash,
            timestamp: uint64(block.timestamp)
        });

        emit PointerUpdated(locatorId, cidHash, uint64(block.timestamp));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reads (free, no gas)
    // ─────────────────────────────────────────────────────────────────────────

    function get(bytes32 locatorId)
        external view returns (bytes32 cidHash, uint64 timestamp)
    {
        Pointer storage p = _pointers[locatorId];
        return (p.cidHash, p.timestamp);
    }

    function ownerOf(bytes32 locatorId) external view returns (address) {
        return _owners[locatorId];
    }

    function maxLifetimeOf(address owner) external view returns (uint64) {
        return _maxLifetimes[owner];
    }

    function ownerEpoch(address owner) external view returns (uint64) {
        return _ownerEpoch[owner];
    }

    /// @notice Returns current owner nonce — frontend must read this before signing
    ///         SetupIntent or AuthorizeKey.
    function getNonce(address owner) external view returns (uint256) {
        return _nonces[owner];
    }

    /// @notice Returns current session key nonce — frontend must read this before
    ///         signing SetIntent for set().
    function getSessionKeyNonce(address sessionKey) external view returns (uint256) {
        return _sessionKeyNonces[sessionKey];
    }

    /// @notice Look up an owner's vault locatorId. Returns bytes32(0) if not registered.
    function vaultOf(address owner) external view returns (bytes32) {
        return _vaultOf[owner];
    }

    /// @notice Expose locatorId derivation logic for frontend to verify off-chain before commit().
    function deriveLocatorId(bytes32 salt) external view returns (bytes32) {
        return _deriveLocatorId(salt);
    }

    /// @notice Full four-part validity check — mirrors set() relay path logic exactly.
    function isSessionKeyValid(address owner, address sessionKey)
        external view returns (bool)
    {
        SessionData storage sd = _sessionKeys[owner][sessionKey];
        if (sd.issuedAt == 0) return false;
        if (uint64(block.timestamp) > sd.expiry) return false;
        uint64 keyAge = uint64(block.timestamp) - sd.issuedAt;
        if (keyAge >= _maxLifetimes[owner]) return false;
        if (sd.epoch < _ownerEpoch[owner]) return false;
        return true;
    }

    /// @notice Build commitment hash off-chain before calling commit().
    ///         All five fields must exactly match what you will pass to setup().
    function buildCommitment(
        address wallet,
        bytes32 salt,
        address sessionKey,
        uint64 sessionExpiry,
        uint64 chosenMaxLifetime
    ) external pure returns (bytes32) {
        return _buildCommitment(wallet, salt, sessionKey, sessionExpiry, chosenMaxLifetime);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Single source of truth for locatorId derivation.
    ///      Domain-separated by contract address + chainId to prevent squatting
    ///      across chains or future redeployments.
    function _deriveLocatorId(bytes32 salt) internal view returns (bytes32) {
        return keccak256(abi.encode(address(this), block.chainid, salt));
    }

    /// @dev Single source of truth for commitment hashing.
    ///      Both setup() reveal check and buildCommitment() call this.
    function _buildCommitment(
        address wallet,
        bytes32 salt,
        address sessionKey,
        uint64 sessionExpiry,
        uint64 chosenMaxLifetime
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            wallet,
            salt,
            sessionKey,
            sessionExpiry,
            chosenMaxLifetime
        ));
    }
}