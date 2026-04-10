// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title VaultRegistry
/// @notice Commit-reveal registration + wallet-agnostic locatorIds + user-sovereign session keys
/// @dev Part of SunyaNotes — serverless encrypted notes experiment
contract VaultRegistry is EIP712 {
    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct Pointer {
        bytes32 cidHash;
        uint64 timestamp;
    }

    struct CommitData {
        bytes32 hash;
        uint64 timestamp;
    }

    struct SessionData {
        uint64 expiry;
        uint64 issuedAt;
        uint64 epoch;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    uint64 public constant MIN_COMMIT_DELAY = 12 seconds;
    uint64 public constant MAX_COMMIT_DELAY = 24 hours;
    uint64 public constant ABSOLUTE_MAX_LIFETIME = 365 days;

    bytes32 public constant SETUP_INTENT_TYPEHASH =
        keccak256(
            "SetupIntent(address wallet,address sessionKey,uint64 sessionExpiry,uint64 chosenMaxLifetime,bytes32 salt,uint256 nonce)"
        );

    bytes32 public constant AUTHORIZE_KEY_TYPEHASH =
        keccak256("AuthorizeKey(address wallet,address sessionKey,uint64 expiry,uint256 nonce)");

    bytes32 public constant SET_INTENT_TYPEHASH =
        keccak256("SetIntent(bytes32 locatorId,bytes32 cidHash,uint256 nonce)");

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => Pointer) private _pointers;
    mapping(address => CommitData) private _commitments;
    mapping(address => mapping(address => SessionData)) private _sessionKeys;
    mapping(address => uint64) private _maxLifetimes;
    mapping(address => uint64) private _ownerEpoch;
    mapping(address => uint256) private _nonces;
    mapping(address => bytes32) private _vaultOf;
    mapping(address => uint256) private _sessionKeyNonces;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event Committed(address indexed committer);
    event Registered(bytes32 indexed locatorId, address indexed owner);
    event PointerUpdated(bytes32 indexed locatorId, bytes32 cidHash, uint64 timestamp);
    event SessionKeyAuthorized(address indexed owner, address indexed sessionKey, uint64 expiry);
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
    error InvalidIntent();
    error OwnerAlreadyRegistered();

    constructor() EIP712("SunyaNotes", "1") {}

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 1 — Commit
    // ─────────────────────────────────────────────────────────────────────────

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

    function setup(
        address owner,
        bytes32 salt,
        address sessionKey,
        uint64 sessionExpiry,
        uint64 chosenMaxLifetime,
        bytes calldata ownerSig
    ) external returns (bytes32 locatorId) {
        // Verify EIP-712 signed intent
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

        // Verify commitment
        CommitData storage c = _commitments[owner];
        if (c.timestamp == 0) revert NoCommitmentFound();

        uint64 elapsed = uint64(block.timestamp) - c.timestamp;
        if (elapsed < MIN_COMMIT_DELAY) revert CommitTooRecent();
        if (elapsed > MAX_COMMIT_DELAY) revert CommitExpired();

        if (c.hash != _buildCommitment(owner, salt, sessionKey, sessionExpiry, chosenMaxLifetime))
            revert CommitmentMismatch();

        if (chosenMaxLifetime > ABSOLUTE_MAX_LIFETIME) revert ExceedsAbsoluteMaxLifetime();

        locatorId = _deriveLocatorId(salt);

        if (_vaultOf[owner] != bytes32(0)) revert OwnerAlreadyRegistered();
        if (_owners[locatorId] != address(0)) revert AlreadyRegistered();

        _owners[locatorId] = owner;
        _vaultOf[owner] = locatorId;
        _maxLifetimes[owner] = chosenMaxLifetime;
        delete _commitments[owner];

        emit Registered(locatorId, owner);

        if (sessionKey != address(0)) {
            if (sessionExpiry <= uint64(block.timestamp)) revert InvalidExpiry();
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

    function authorizeSessionKey(
        address owner,
        address sessionKey,
        uint64 expiry,
        bytes calldata ownerSig
    ) external {
        if (sessionKey == address(0)) revert ZeroAddress();
        if (expiry <= uint64(block.timestamp)) revert InvalidExpiry();

        uint256 nonce = _nonces[owner]++;
        bytes32 structHash = keccak256(
            abi.encode(AUTHORIZE_KEY_TYPEHASH, owner, sessionKey, expiry, nonce)
        );
        if (!SignatureChecker.isValidSignatureNow(owner, _hashTypedDataV4(structHash), ownerSig))
            revert InvalidIntent();

        if (_vaultOf[owner] == bytes32(0)) revert NotRegistered();
        if (expiry > uint64(block.timestamp) + _maxLifetimes[owner]) revert ExpiryExceedsUserLimit();

        _sessionKeys[owner][sessionKey] = SessionData({
            expiry: expiry,
            issuedAt: uint64(block.timestamp),
            epoch: _ownerEpoch[owner]
        });
        emit SessionKeyAuthorized(owner, sessionKey, expiry);
    }

    function revokeSessionKey(address sessionKey) external {
        delete _sessionKeys[msg.sender][sessionKey];
        emit SessionKeyRevoked(msg.sender, sessionKey);
    }

    function revokeAllSessionKeys() external {
        unchecked {
            _ownerEpoch[msg.sender]++;
        }
        emit AllSessionKeysRevoked(msg.sender, _ownerEpoch[msg.sender]);
    }

    function updateMaxLifetime(uint64 newMaxLifetime) external {
        if (newMaxLifetime > ABSOLUTE_MAX_LIFETIME) revert ExceedsAbsoluteMaxLifetime();
        _maxLifetimes[msg.sender] = newMaxLifetime;
        emit MaxLifetimeUpdated(msg.sender, newMaxLifetime);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core write
    // ─────────────────────────────────────────────────────────────────────────

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
            uint256 nonce = _sessionKeyNonces[sessionKey]++;
            bytes32 structHash = keccak256(
                abi.encode(SET_INTENT_TYPEHASH, locatorId, cidHash, nonce)
            );
            if (
                !SignatureChecker.isValidSignatureNow(
                    sessionKey,
                    _hashTypedDataV4(structHash),
                    keySig
                )
            ) revert InvalidIntent();

            SessionData storage sd = _sessionKeys[owner][sessionKey];
            if (sd.issuedAt == 0) revert SessionKeyExpiredOrInvalid();
            if (uint64(block.timestamp) > sd.expiry) revert SessionKeyExpiredOrInvalid();
            if (uint64(block.timestamp) - sd.issuedAt >= _maxLifetimes[owner])
                revert SessionKeyExpiredOrInvalid();
            if (sd.epoch < _ownerEpoch[owner]) revert SessionKeyExpiredOrInvalid();
        }

        _pointers[locatorId] = Pointer({cidHash: cidHash, timestamp: uint64(block.timestamp)});
        emit PointerUpdated(locatorId, cidHash, uint64(block.timestamp));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reads
    // ─────────────────────────────────────────────────────────────────────────

    function get(bytes32 locatorId) external view returns (bytes32 cidHash, uint64 timestamp) {
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

    function getNonce(address owner) external view returns (uint256) {
        return _nonces[owner];
    }

    function getSessionKeyNonce(address sessionKey) external view returns (uint256) {
        return _sessionKeyNonces[sessionKey];
    }

    function vaultOf(address owner) external view returns (bytes32) {
        return _vaultOf[owner];
    }

    function deriveLocatorId(bytes32 salt) external view returns (bytes32) {
        return _deriveLocatorId(salt);
    }

    function isSessionKeyValid(address owner, address sessionKey) external view returns (bool) {
        SessionData storage sd = _sessionKeys[owner][sessionKey];
        if (sd.issuedAt == 0) return false;
        if (uint64(block.timestamp) > sd.expiry) return false;
        if (uint64(block.timestamp) - sd.issuedAt >= _maxLifetimes[owner]) return false;
        if (sd.epoch < _ownerEpoch[owner]) return false;
        return true;
    }

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

    function _deriveLocatorId(bytes32 salt) internal view returns (bytes32) {
        return keccak256(abi.encode(address(this), block.chainid, salt));
    }

    function _buildCommitment(
        address wallet,
        bytes32 salt,
        address sessionKey,
        uint64 sessionExpiry,
        uint64 chosenMaxLifetime
    ) internal pure returns (bytes32) {
        return
            keccak256(abi.encode(wallet, salt, sessionKey, sessionExpiry, chosenMaxLifetime));
    }
}