import {
  decodeEventLog,
  isAddressEqual,
  type TransactionReceipt,
} from "viem"
import { commitRegistryAbi } from "./contracts"

export type VerifyResult =
  | { ok: true; timestamp: bigint }
  | { ok: false; reason: string }

/// Confirms a transaction receipt contains a `Committed(identity, payloadHash)`
/// event from the expected registry, matching the provided identity and hash.
/// The chain's receipt — not the wallet's "sent" ack — is the source of truth.
export function verifyCommitInReceipt(params: {
  receipt: TransactionReceipt
  registry: `0x${string}`
  identity: `0x${string}`
  payloadHash: `0x${string}`
}): VerifyResult {
  const { receipt, registry, identity, payloadHash } = params

  if (receipt.status !== "success") {
    return { ok: false, reason: "transaction reverted" }
  }

  for (const log of receipt.logs) {
    if (!isAddressEqual(log.address, registry)) continue
    try {
      const decoded = decodeEventLog({
        abi: commitRegistryAbi,
        data: log.data,
        topics: log.topics,
        eventName: "Committed",
      })
      if (
        isAddressEqual(decoded.args.identity, identity) &&
        decoded.args.payloadHash === payloadHash
      ) {
        return { ok: true, timestamp: decoded.args.timestamp }
      }
    } catch {
      // Log from the registry but not a Committed event — keep looking.
    }
  }

  return { ok: false, reason: "no matching Committed event in tx logs" }
}
