'use client'

import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  wagmiAdapter,
  wagmiConfig,
  projectId,
  networks,
  defaultNetwork,
} from '@/lib/web3-config'
import type { State } from 'wagmi'

const queryClient = new QueryClient()

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork,
  features: {
    analytics: false,
    swaps: false,
    onramp: false,
    send: false,
    history: false,
    walletFeaturesOrder: [],
  },
})


export function Web3Provider({
  children,
  initialState,
}: {
  children: React.ReactNode
  initialState?: State
}) {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
