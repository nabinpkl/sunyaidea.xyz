"use client"

import { useQuery } from "@tanstack/react-query"
import { findCommits, type CommitRecord } from "@/lib/query-commits"
import { ProofRow } from "./proof-row"

interface ProofListProps {
  address: `0x${string}`
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

export function ProofList({ address }: ProofListProps) {
  const q = useQuery({
    queryKey: ["commits", "by-identity", address],
    queryFn: () => findCommits({ identity: address }),
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[13px] font-medium tracking-tight">
        My commits
      </h2>

      {q.isLoading && (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 border border-border rounded-sm bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      )}

      {q.isError && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border border-border rounded-sm bg-muted/30">
          <span className="text-[12px] text-muted-foreground">
            Couldn&apos;t reach Sepolia.
          </span>
          <button
            onClick={() => q.refetch()}
            className="text-[12px] text-foreground hover:underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="text-[12px] text-muted-foreground">
          Nothing committed yet from this address.
        </div>
      )}

      {q.data && q.data.length > 0 && (
        <div className="flex flex-col">
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
