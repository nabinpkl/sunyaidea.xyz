"use client"

import { useState } from "react"
import { AlertTriangle, Check, X, ExternalLink } from "lucide-react"
import type { Hex } from "viem"
import type { CommitRecord } from "@/lib/query-commits"
import { explorerTxUrl } from "@/lib/chains"
import { PayloadInput, type Payload } from "../shared/payload-input"

interface ProofRowProps {
  record: CommitRecord
  duplicates: number
}

type Check =
  | { kind: "idle" }
  | { kind: "match" }
  | { kind: "mismatch"; hash: Hex }

function formatTs(ts: bigint) {
  return (
    new Date(Number(ts) * 1000).toISOString().replace("T", " ").slice(0, 19) +
    " UTC"
  )
}

/// A single row of the My commits list. Collapsed by default  expand to
/// drop the original file back in, which is hashed locally and compared
/// to the row's payloadHash (no chain read). Lets the owner confirm they
/// still hold the bytes that produced the commit.
export function ProofRow({ record, duplicates }: ProofRowProps) {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<Payload | null>(null)
  const [check, setCheck] = useState<Check>({ kind: "idle" })

  const tsMismatch = record.eventTimestamp !== record.blockTimestamp

  const onPayload = (p: Payload | null) => {
    setPayload(p)
    if (!p) {
      setCheck({ kind: "idle" })
      return
    }
    if (p.hash === record.payloadHash) setCheck({ kind: "match" })
    else setCheck({ kind: "mismatch", hash: p.hash })
  }

  const closeVerify = () => {
    setOpen(false)
    setPayload(null)
    setCheck({ kind: "idle" })
  }

  const shortTx = `${record.txHash.slice(0, 6)}…${record.txHash.slice(-4)}`

  return (
    <div className="flex flex-col gap-3 py-5 border-b border-border last:border-b-0">
      {/* Hash is the headline of the row. Full width, mono, foreground,
          truncated so long hashes don't break the layout on narrow screens. */}
      <div className="min-w-0">
        <span
          className="block font-mono text-[14px] text-foreground truncate"
          title={record.payloadHash}
        >
          {record.payloadHash}
        </span>
      </div>

      {/* Metadata byline. All the surrounding context in one muted line. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground font-mono">
        <span>block {record.blockNumber.toString()}</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{formatTs(record.blockTimestamp)}</span>
        <span className="text-muted-foreground/40">·</span>
        <a
          href={explorerTxUrl(record.chainId, record.txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          tx {shortTx}
          <ExternalLink className="size-3" />
        </a>
        {duplicates > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span>re-broadcast {duplicates}×</span>
          </>
        )}
      </div>

      {tsMismatch && (
        <div className="text-[12px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" />
          Event timestamp ({formatTs(record.eventTimestamp)}) does not match
          the block it was emitted in.
        </div>
      )}

      <div className="flex items-center gap-4">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="text-[13px] text-foreground/80 hover:text-foreground underline underline-offset-4 decoration-foreground/20"
          >
            Verify this commit
          </button>
        ) : (
          <button
            onClick={closeVerify}
            className="text-[13px] text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-foreground/20"
          >
            Close
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 pt-2">
          <PayloadInput payload={payload} onPayload={onPayload} />
          {check.kind === "match" && (
            <div className="flex items-center gap-2 text-[13px] text-foreground">
              <Check className="size-4" />
              Matches this commit.
            </div>
          )}
          {check.kind === "mismatch" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[13px] text-destructive">
                <X className="size-4" />
                This does not hash to the committed payload.
              </div>
              <div className="flex items-baseline gap-3 text-[11px] min-w-0">
                <span className="text-muted-foreground font-mono tracking-wide shrink-0">
                  got
                </span>
                <span className="font-mono text-foreground/80 truncate">
                  {check.hash}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
