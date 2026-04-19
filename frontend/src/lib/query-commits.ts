import { getAbiItem, type Address, type Hex } from 'viem'
import {
  commitRegistryAbi,
  commitRegistryAddress,
  commitRegistryDeployBlock,
} from './contracts'
import { getReadClient } from './read-client'
import { type SupportedChainId } from './chains'

export interface CommitRecord {
  /// The chain this commit was found on. Needed so downstream UI can link to
  /// the correct block explorer and render chain-aware copy.
  chainId: SupportedChainId
  identity: Address
  payloadHash: Hex
  /// Timestamp emitted by the contract (block.timestamp at commit time).
  eventTimestamp: bigint
  /// Timestamp of the block that contains the event log. The two should
  /// match for this contract; we surface both so a mismatch can be caught
  /// instead of silently trusted.
  blockTimestamp: bigint
  blockNumber: bigint
  blockHash: Hex
  txHash: Hex
  logIndex: number
}

const committedEvent = getAbiItem({
  abi: commitRegistryAbi,
  name: 'Committed',
})

/// Query a single supported chain for on-chain commits. Either or both
/// filters may be provided; at least one is required (no unscoped global
/// scan, since the event log is public but paying to pull it all over http
/// is pointless and the use cases in this app never need it).
///
/// Uses the indexed-topic filter on `eth_getLogs`. No indexer, no server.
/// Results are returned earliest-first, which matches the contract's own
/// guidance: "the first Committed event for a given (identity, payloadHash)
/// pair is the canonical record."
export async function findCommitsOnChain(params: {
  chainId: SupportedChainId
  payloadHash?: Hex
  identity?: Address
}): Promise<CommitRecord[]> {
  const { chainId, payloadHash, identity } = params
  if (!payloadHash && !identity) {
    throw new Error('findCommits requires at least one of identity or payloadHash')
  }
  const client = getReadClient(chainId)

  const args =
    identity && payloadHash
      ? { identity, payloadHash }
      : identity
        ? { identity }
        : { payloadHash: payloadHash! }

  const logs = await client.getLogs({
    address: commitRegistryAddress[chainId],
    event: committedEvent,
    args,
    fromBlock: commitRegistryDeployBlock[chainId],
    toBlock: 'latest',
  })

  // Fetch block timestamps in parallel, deduped by block number so a
  // burst of commits in one block costs a single RPC call.
  const uniqueBlockNumbers = [...new Set(logs.map((l) => l.blockNumber))]
  const blocks = await Promise.all(
    uniqueBlockNumbers.map((bn) =>
      client.getBlock({ blockNumber: bn as bigint })
    )
  )
  const blockTsByNumber = new Map(blocks.map((b) => [b.number, b.timestamp]))

  const records: CommitRecord[] = logs.map((log) => {
    const { identity: loggedIdentity, payloadHash: loggedHash, timestamp } =
      log.args
    // `strict` defaults to false so args are typed optional; we only get
    // here for logs whose topic-0 matches the Committed event and whose
    // topic-2 matches our payloadHash filter, so the fields are always
    // present in practice. Guard anyway.
    if (!loggedIdentity || !loggedHash || timestamp === undefined) {
      throw new Error('getLogs returned an undecodable Committed event')
    }
    return {
      chainId,
      identity: loggedIdentity,
      payloadHash: loggedHash,
      eventTimestamp: timestamp,
      blockTimestamp: blockTsByNumber.get(log.blockNumber as bigint)!,
      blockNumber: log.blockNumber as bigint,
      blockHash: log.blockHash as Hex,
      txHash: log.transactionHash as Hex,
      logIndex: log.logIndex as number,
    }
  })

  records.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber)
      return Number(a.blockNumber - b.blockNumber)
    return a.logIndex - b.logIndex
  })

  return records
}

