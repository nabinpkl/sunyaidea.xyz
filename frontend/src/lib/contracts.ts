import { sepolia } from '@reown/appkit/networks'

export const commitRegistryAddress = {
  [sepolia.id]: '0xB3A6CcC60E621857124596Ee690eef2175547B24',
} as const satisfies Record<number, `0x${string}`>

export const commitRegistryAbi = [
  {
    type: 'function',
    name: 'commit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'identity', type: 'address' },
      { name: 'payloadHash', type: 'bytes32' },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'buildDigest',
    stateMutability: 'view',
    inputs: [
      { name: 'identity', type: 'address' },
      { name: 'payloadHash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'domainSeparator',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'event',
    name: 'Committed',
    anonymous: false,
    inputs: [
      { name: 'identity', type: 'address', indexed: true },
      { name: 'payloadHash', type: 'bytes32', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
] as const

// Domain name must match the contract's EIP712 constructor argument exactly.
export const commitTypedDataDomain = {
  name: 'CommitRegistry',
  version: '1',
} as const

// Struct schema must match the contract's COMMIT_TYPEHASH exactly.
export const commitTypedDataTypes = {
  Commit: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'identity', type: 'address' },
    { name: 'payloadHash', type: 'bytes32' },
  ],
} as const

// Title and description values must match the contract's TITLE / DESCRIPTION
// constants byte-for-byte, or the digest won't match and the tx will revert.
// Any change here REQUIRES a contract redeploy.
export const COMMIT_TITLE = 'Commit an idea to the blockchain'
export const COMMIT_DESCRIPTION =
  'I am committing a cryptographic hash of an idea. The original content ' +
  'stays on my device. Anyone can later re-hash the content and verify ' +
  'it matches this commit.'
