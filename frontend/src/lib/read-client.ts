import { createPublicClient, http } from 'viem'
import { sepolia, base } from '@reown/appkit/networks'
import type { SupportedChainId } from './chains'

/// Read-only viem clients, one per supported chain. Used by the verify and
/// proof-list flows. Independent of the user's wallet, so reads work whether
/// or not a wallet is connected, and regardless of the network the wallet is
/// currently on. Transports are the default public RPCs for each chain. No
/// Sunya-operated endpoint.
///
/// Typed as a loose record because the per-chain client types carry chain
/// specific transaction unions (e.g. Base has `deposit` txs that Sepolia
/// does not) that don't unify into a single `PublicClient` type. Callers
/// only need getLogs/getBlock, which behave the same across chains.
const clients = {
  [sepolia.id]: createPublicClient({ chain: sepolia, transport: http() }),
  [base.id]: createPublicClient({ chain: base, transport: http() }),
}

export function getReadClient(chainId: SupportedChainId) {
  return clients[chainId]
}
