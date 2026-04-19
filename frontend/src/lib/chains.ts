import { sepolia, base, type AppKitNetwork } from '@reown/appkit/networks'
import { commitRegistryAddress } from './contracts'

/// Single source of truth for which chains the app supports. Any chain listed
/// here must have an entry in `commitRegistryAddress` and
/// `commitRegistryDeployBlock` in contracts.ts.
export const supportedChains = [sepolia, base] as const

export type SupportedChainId = (typeof supportedChains)[number]['id']

export function isSupportedChainId(
  chainId: number | undefined | null,
): chainId is SupportedChainId {
  return (
    chainId !== undefined &&
    chainId !== null &&
    chainId in commitRegistryAddress
  )
}

export function getSupportedChain(chainId: number): AppKitNetwork | undefined {
  return supportedChains.find((c) => c.id === chainId)
}

export function chainShortName(chainId: number): string {
  const c = getSupportedChain(chainId)
  return c ? c.name : `chain ${chainId}`
}

/// Per-chain block-explorer base URL. Used for tx / address links.
const explorerByChainId: Record<number, string> = {
  [sepolia.id]: 'https://sepolia.etherscan.io',
  [base.id]: 'https://basescan.org',
}

export function explorerTxUrl(chainId: number, txHash: string): string {
  const base = explorerByChainId[chainId]
  return base ? `${base}/tx/${txHash}` : ''
}

export function explorerAddressUrl(chainId: number, address: string): string {
  const base = explorerByChainId[chainId]
  return base ? `${base}/address/${address}` : ''
}
