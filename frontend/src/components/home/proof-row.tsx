"use client"

import { useRef, useState } from "react"
import { AlertTriangle, Check, X } from "lucide-react"
import { keccak256, type Hex } from "viem"
import type { CommitRecord } from "@/lib/query-commits"
import { FileDrop } from "../shared/file-drop"
import { KvField } from "../shared/kv-field"

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

/// A single row of the My commits list. Collapsed by default — expand to
/// drop the original file back in, which is hashed locally and compared
/// to the row's payloadHash (no chain read). Lets the owner confirm they
/// still hold the bytes that produced the commit.
export function ProofRow({ record, duplicates }: ProofRowProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [check, setCheck] = useState<Check>({ kind: "idle" })
  const seq = useRef(0)

  const tsMismatch = record.eventTimestamp !== record.blockTimestamp

  const onFile = async (f: File | null) => {
    const id = ++seq.current
    setFile(f)
    if (!f) {
      setCheck({ kind: "idle" })
      return
    }
    const buf = await f.arrayBuffer()
    if (seq.current !== id) return
    const hash = keccak256(new Uint8Array(buf))
    if (hash === record.payloadHash) setCheck({ kind: "match" })
    else setCheck({ kind: "mismatch", hash })
  }

  const closeVerify = () => {
    seq.current++
    setOpen(false)
    setFile(null)
    setCheck({ kind: "idle" })
  }

  return (
    <div className="flex flex-col gap-3 py-4 border-b border-border last:border-b-0">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px]">
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

      <div className="flex items-center gap-4">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="text-[12px] text-foreground/70 hover:text-foreground underline underline-offset-4"
          >
            Verify file
          </button>
        ) : (
          <button
            onClick={closeVerify}
            className="text-[12px] text-foreground/70 hover:text-foreground underline underline-offset-4"
          >
            Close
          </button>
        )}
        {duplicates > 0 && (
          <span className="text-[11px] text-muted-foreground">
            re-broadcast {duplicates}×
          </span>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 pt-1">
          <FileDrop file={file} onFile={onFile} />
          {check.kind === "match" && (
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <Check className="size-3.5" />
              File matches this commit.
            </div>
          )}
          {check.kind === "mismatch" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[12px] text-destructive">
                <X className="size-3.5" />
                This file does not hash to the committed payload.
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
