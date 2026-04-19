import { createPublicClient, http } from 'viem'
import { sepolia } from '@reown/appkit/networks'

/// Read-only viem client for the verify flow.
///
/// Independent of the user's wallet: verify is a pure proof check, so it
/// should work whether or not a wallet is connected, and regardless of the
/// network the wallet is currently on. Transport is the default public RPC
/// for Sepolia — no Sunya-operated endpoint.
export const sepoliaReadClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})
