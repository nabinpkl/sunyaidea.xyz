"use client"

import { ExternalLink, Check } from "lucide-react"

interface CommitReceiptProps {
  identity: `0x${string}`
  payloadHash: `0x${string}`
  txHash: `0x${string}`
  blockNumber: bigint
  timestamp: bigint
  onReset: () => void
}

export function CommitReceipt({
  identity,
  payloadHash,
  txHash,
  blockNumber,
  timestamp,
  onReset,
}: CommitReceiptProps) {
  const when = new Date(Number(timestamp) * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[12px] text-foreground">
        <Check className="size-3.5" />
        Committed to Sepolia · event verified
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px]">
        <Field label="identity" value={identity} href={`https://sepolia.etherscan.io/address/${identity}`} />
        <Field label="payload hash" value={payloadHash} />
        <Field label="block" value={blockNumber.toString()} />
        <Field label="timestamp" value={when} />
        <Field label="tx" value={txHash} href={`https://sepolia.etherscan.io/tx/${txHash}`} />
      </dl>

      <div className="pt-2 text-[11px] text-muted-foreground leading-relaxed">
        Save the file yourself. To prove this commit later, anyone can re-hash
        the file and query this chain — no server involved.
      </div>

      <button
        onClick={onReset}
        className="self-start text-[12px] text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-foreground/20"
      >
        Commit another
      </button>
    </div>
  )
}

function Field({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <>
      <dt className="text-muted-foreground font-mono tracking-wide">{label}</dt>
      <dd className="font-mono text-foreground/80 min-w-0 truncate">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <span className="truncate">{value}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        ) : (
          value
        )}
      </dd>
    </>
  )
}
