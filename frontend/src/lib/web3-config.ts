import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { sepolia, base, type AppKitNetwork } from '@reown/appkit/networks'
import { cookieStorage, createStorage } from 'wagmi'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!

if (!projectId) throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not set')

// Supported chains. Order here only influences UI default ordering where
// callers iterate this array; the *session* default network is chosen by
// `defaultNetwork` below so the wallet picks the right chain on connect.
const allNetworks = { [base.id]: base, [sepolia.id]: sepolia } as const

/// Pick which chain the wallet should land on when the user first connects.
///
/// Precedence:
///   1. `NEXT_PUBLIC_DEFAULT_CHAIN_ID` explicit override (any supported id).
///   2. NODE_ENV === "production"  → base    (real money, real evidence)
///   3. otherwise                   → sepolia (testnet for localhost / preview)
///
/// We fall back rather than throw on a bad env value so a typo in deployment
/// config doesn't take the whole app down — the user can still switch chains
/// manually from the wallet menu.
function resolveDefaultNetwork(): AppKitNetwork {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID
  if (raw) {
    const id = Number(raw)
    const hit = allNetworks[id as keyof typeof allNetworks]
    if (hit) return hit
  }
  return process.env.NODE_ENV === 'production' ? base : sepolia
}

export const defaultNetwork = resolveDefaultNetwork()

// Put the default first so AppKit's network picker and wagmi's initial
// chain hint both surface it before the alternatives.
export const networks: [AppKitNetwork, ...AppKitNetwork[]] =
  defaultNetwork.id === base.id ? [base, sepolia] : [sepolia, base]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
