import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { sepolia, type AppKitNetwork } from '@reown/appkit/networks'
import { cookieStorage, createStorage } from 'wagmi'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!

if (!projectId) throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not set')

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
