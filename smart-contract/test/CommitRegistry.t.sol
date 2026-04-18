// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {CommitRegistry} from "../src/CommitRegistry.sol";

/// @dev Minimal ERC-1271 identity. isValidSignature returns the magic value iff
///      the digest matches a single preapproved digest set by the owner.
///      Deliberately does not recover a signer — we just need to prove the
///      ERC-1271 fallback path fires correctly.
contract MockERC1271 is IERC1271 {
    bytes32 public approvedDigest;

    function approve(bytes32 digest) external {
        approvedDigest = digest;
    }

    function isValidSignature(bytes32 digest, bytes memory)
        external
        view
        override
        returns (bytes4)
    {
        if (digest == approvedDigest) return IERC1271.isValidSignature.selector;
        return 0xffffffff;
    }
}

contract CommitRegistryTest is Test {
    CommitRegistry internal registry;

    uint256 internal constant SIGNER_PK = 0xA11CE;
    address internal signer;
    address internal other;

    event Committed(
        address indexed identity,
        bytes32 indexed payloadHash,
        uint256 timestamp
    );

    function setUp() public {
        registry = new CommitRegistry();
        signer = vm.addr(SIGNER_PK);
        other = vm.addr(0xB0B);
    }

    // ────────────────────────────────────────────────────────────────────
    // Digest construction
    // ────────────────────────────────────────────────────────────────────

    function test_BuildDigest_MatchesClientReconstruction() public view {
        bytes32 payloadHash = keccak256("hello world");
        bytes32 onChain = registry.buildDigest(signer, payloadHash);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Commit(string title,string description,address identity,bytes32 payloadHash)"
                ),
                keccak256(bytes(registry.TITLE())),
                keccak256(bytes(registry.DESCRIPTION())),
                signer,
                payloadHash
            )
        );
        bytes32 expected = _toTypedDataHash(
            registry.domainSeparator(),
            structHash
        );

        assertEq(onChain, expected, "digest must match manual EIP-712 build");
    }

    // ────────────────────────────────────────────────────────────────────
    // EOA path (ECDSA.tryRecover)
    // ────────────────────────────────────────────────────────────────────

    function test_Commit_EmitsEvent_OnValidEOA() public {
        bytes32 payloadHash = keccak256("an idea worth keeping");
        bytes memory sig = _signAs(SIGNER_PK, signer, payloadHash);

        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, false, true, address(registry));
        emit Committed(signer, payloadHash, 1_700_000_000);

        registry.commit(signer, payloadHash, sig);
    }

    function test_Commit_RevertsWhenSignerDoesNotMatchIdentity() public {
        bytes32 payloadHash = keccak256("wrong signer");
        bytes memory sig = _signAs(SIGNER_PK, other, payloadHash);

        vm.expectRevert(CommitRegistry.InvalidSignature.selector);
        registry.commit(other, payloadHash, sig);
    }

    function test_Commit_RevertsOnTamperedPayload() public {
        bytes32 signedHash = keccak256("original");
        bytes32 tamperedHash = keccak256("tampered");
        bytes memory sig = _signAs(SIGNER_PK, signer, signedHash);

        vm.expectRevert(CommitRegistry.InvalidSignature.selector);
        registry.commit(signer, tamperedHash, sig);
    }

    function test_Commit_RevertsOnMalformedSignature() public {
        bytes32 payloadHash = keccak256("garbage sig");
        bytes memory sig = hex"deadbeef";

        vm.expectRevert(CommitRegistry.InvalidSignature.selector);
        registry.commit(signer, payloadHash, sig);
    }

    /// @dev Documents deliberate replay behavior (see contract header).
    ///      Off-chain tooling must dedupe by earliest (identity, payloadHash).
    function test_Commit_AcceptsDuplicate_ReplayByDesign() public {
        bytes32 payloadHash = keccak256("replay me");
        bytes memory sig = _signAs(SIGNER_PK, signer, payloadHash);

        vm.warp(1_000);
        registry.commit(signer, payloadHash, sig);

        vm.warp(2_000);
        vm.recordLogs();
        registry.commit(signer, payloadHash, sig);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(logs.length, 1, "duplicate commit still emits an event");
        assertEq(
            uint256(logs[0].topics[1]),
            uint256(uint160(signer)),
            "identity topic"
        );
        (uint256 ts) = abi.decode(logs[0].data, (uint256));
        assertEq(ts, 2_000, "second event carries later timestamp");
    }

    // ────────────────────────────────────────────────────────────────────
    // ERC-1271 path (smart-account identity)
    // ────────────────────────────────────────────────────────────────────

    function test_Commit_EmitsEvent_OnValidERC1271() public {
        MockERC1271 account = new MockERC1271();
        bytes32 payloadHash = keccak256("smart account commit");
        bytes32 digest = registry.buildDigest(address(account), payloadHash);
        account.approve(digest);

        // The mock ignores signature bytes — any non-empty blob will do.
        bytes memory sig = hex"00";

        vm.expectEmit(true, true, false, false, address(registry));
        emit Committed(address(account), payloadHash, 0);

        registry.commit(address(account), payloadHash, sig);
    }

    function test_Commit_RevertsWhenERC1271Rejects() public {
        MockERC1271 account = new MockERC1271();
        bytes32 payloadHash = keccak256("unapproved");
        bytes memory sig = hex"00";

        vm.expectRevert(CommitRegistry.InvalidSignature.selector);
        registry.commit(address(account), payloadHash, sig);
    }

    // ────────────────────────────────────────────────────────────────────
    // Fuzz
    // ────────────────────────────────────────────────────────────────────

    function testFuzz_Commit_AcceptsAnyPayloadHash(bytes32 payloadHash) public {
        bytes memory sig = _signAs(SIGNER_PK, signer, payloadHash);
        registry.commit(signer, payloadHash, sig);
    }

    function testFuzz_Commit_RejectsRandomSignatureBytes(
        bytes32 payloadHash,
        bytes calldata badSig
    ) public {
        // Skip the vanishingly rare case where fuzzed bytes happen to recover
        // to our signer — keccak collision, effectively impossible.
        vm.assume(badSig.length != 65);
        vm.expectRevert(CommitRegistry.InvalidSignature.selector);
        registry.commit(signer, payloadHash, badSig);
    }

    // ────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────

    function _signAs(uint256 pk, address identity, bytes32 payloadHash)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = registry.buildDigest(identity, payloadHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Local copy of OZ MessageHashUtils.toTypedDataHash to avoid an import
    ///      just for one line of test-side reconstruction.
    function _toTypedDataHash(bytes32 domain, bytes32 structHash)
        private
        pure
        returns (bytes32 digest)
    {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, hex"1901000000000000000000000000000000000000000000000000000000000000")
            mstore(add(ptr, 0x02), domain)
            mstore(add(ptr, 0x22), structHash)
            digest := keccak256(ptr, 0x42)
        }
    }
}
