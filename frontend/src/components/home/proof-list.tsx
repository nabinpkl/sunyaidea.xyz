"use client"

import { useQuery } from "@tanstack/react-query"
import { findCommitsOnChain, type CommitRecord } from "@/lib/query-commits"
import { ProofRow } from "./proof-row"
import {
  chainShortName,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chains"
import { Button } from "@/components/ui/button"

interface ProofListProps {
  address: `0x${string}`
  chainId: number
}

interface DedupedRecord {
  record: CommitRecord
  duplicates: number
}

/// Dedupe by payloadHash keeping earliest (records come earliest-first).
/// Subsequent duplicates are counted and surfaced on the row as re-broadcasts,
/// per the contract's replay note.
function dedupe(records: CommitRecord[]): DedupedRecord[] {
  const byHash = new Map<string, DedupedRecord>()
  for (const r of records) {
    const existing = byHash.get(r.payloadHash)
    if (existing) existing.duplicates++
    else byHash.set(r.payloadHash, { record: r, duplicates: 0 })
  }
  return [...byHash.values()]
}

export function ProofList({ address, chainId }: ProofListProps) {
  const supported = isSupportedChainId(chainId)
  const activeChainId = supported ? (chainId as SupportedChainId) : null
  const networkName = activeChainId ? chainShortName(activeChainId) : ""

  const q = useQuery({
    queryKey: ["commits", "by-identity", activeChainId, address],
    queryFn: () =>
      findCommitsOnChain({ chainId: activeChainId!, identity: address }),
    enabled: !!activeChainId,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px] font-medium tracking-tight">
            My committed ideas
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Event log entries from {networkName}. Plaintext is not stored here.
          </p>
        </div>
      </div>

      {q.isLoading && (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse border border-border bg-muted/20"
            />
          ))}
        </div>
      )}

      {q.isError && (
        <div className="flex items-center justify-between gap-4 border border-border bg-card/80 px-4 py-3">
          <span className="text-[12px] text-muted-foreground">
            Couldn&apos;t reach {networkName}.
          </span>
          <Button onClick={() => q.refetch()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="border border-border bg-card/70 px-5 py-8 text-[14px] text-muted-foreground">
          Nothing committed yet from this address on {networkName}.
        </div>
      )}

      {q.data && q.data.length > 0 && (
        <div className="flex flex-col border border-border bg-card/70">
          {dedupe(q.data).map(({ record, duplicates }) => (
            <ProofRow
              key={`${record.txHash}-${record.logIndex}`}
              record={record}
              duplicates={duplicates}
            />
          ))}
        </div>
      )}
    </div>
  )
}
