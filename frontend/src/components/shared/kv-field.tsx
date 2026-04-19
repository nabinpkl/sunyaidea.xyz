"use client"

import { ExternalLink } from "lucide-react"

interface KvFieldProps {
  label: string
  value: string
  href?: string
}

/// Label/value row used inside the two-column grids on the commit receipt
/// and verify result panels. Truncates long values (addresses, hashes)
/// and turns them into outbound etherscan links when an href is given.
export function KvField({ label, value, href }: KvFieldProps) {
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
