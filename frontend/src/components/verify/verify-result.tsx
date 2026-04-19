"use client"

import { Check, AlertTriangle } from "lucide-react"
import type { CommitRecord } from "@/lib/query-commits"
import { KvField } from "../shared/kv-field"

interface VerifyResultProps {
  payloadHash: `0x${string}`
  matches: CommitRecord[]
  identityFilter?: `0x${string}` | null
}

function formatTs(ts: bigint) {
  return (
    new Date(Number(ts) * 1000).toISOString().replace("T", " ").slice(0, 19) +
    " UTC"
  )
}

/// Renders the result of a verify query. Three shapes:
///   - zero matches: affirmative "not found" (honest negative answer).
///   - one match: single commit, displayed like the CommitReceipt.
///   - many matches: the earliest is canonical per the contract; later ones
///     are noise (replays of the same signed digest). We show them all,
///     earliest first, and label the first one "earliest — canonical".
export function VerifyResult({
  payloadHash,
  matches,
  identityFilter,
}: VerifyResultProps) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <AlertTriangle className="size-3.5" />
          No commit of this file on Sepolia
          {identityFilter ? " by this address" : ""}.
        </div>
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          The file was hashed locally and the chain was queried directly.
          Nothing was uploaded. If you expected a match, check that you&apos;re
          using the exact same file byte-for-byte — any change produces a
          different hash.
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px] pt-2">
          <KvField label="payload hash" value={payloadHash} />
          {identityFilter && (
            <KvField label="identity filter" value={identityFilter} />
          )}
        </dl>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-[12px] text-foreground">
        <Check className="size-3.5" />
        {matches.length === 1
          ? "1 commit of this file found on Sepolia."
          : `${matches.length} commits of this file found on Sepolia.`}
      </div>

      <div className="flex flex-col gap-5">
        {matches.map((m, i) => (
          <MatchRow
            key={`${m.txHash}-${m.logIndex}`}
            record={m}
            canonical={i === 0 && matches.length > 1}
          />
        ))}
      </div>

      <div className="pt-2 text-[11px] text-muted-foreground leading-relaxed">
        The chain&apos;s block timestamp is the trust anchor. If the contract&apos;s
        emitted timestamp ever diverges from the block timestamp, it is flagged
        instead of silently trusted.
      </div>
    </div>
  )
}

function MatchRow({
  record,
  canonical,
}: {
  record: CommitRecord
  canonical: boolean
}) {
  const tsMismatch = record.eventTimestamp !== record.blockTimestamp

  return (
    <div className="flex flex-col gap-3">
      {canonical && (
        <div className="text-[11px] text-muted-foreground font-mono tracking-wide">
          earliest — canonical
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px]">
        <KvField
          label="identity"
          value={record.identity}
          href={`https://sepolia.etherscan.io/address/${record.identity}`}
        />
        <KvField label="payload hash" value={record.payloadHash} />
        <KvField label="block" value={record.blockNumber.toString()} />
        <KvField label="timestamp" value={formatTs(record.blockTimestamp)} />
        {tsMismatch && (
          <KvField
            label="event ts (mismatch!)"
            value={formatTs(record.eventTimestamp)}
          />
        )}
        <KvField
          label="tx"
          value={record.txHash}
          href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
        />
      </dl>
      {tsMismatch && (
        <div className="text-[11px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="size-3" />
          Event timestamp does not match the block it was emitted in.
        </div>
      )}
    </div>
  )
}
