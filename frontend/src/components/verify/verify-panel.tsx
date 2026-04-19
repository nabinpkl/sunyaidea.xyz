"use client"

import { useRef, useState } from "react"
import { getAddress, isAddress, keccak256, type Address, type Hex } from "viem"
import { FileDrop } from "../shared/file-drop"
import { findCommits, type CommitRecord } from "@/lib/query-commits"
import { VerifyResult } from "./verify-result"

type Phase =
  | { kind: "idle" }
  | { kind: "hashing"; file: File }
  | { kind: "searching"; file: File; payloadHash: Hex; identity: Address }
  | {
      kind: "result"
      file: File
      payloadHash: Hex
      identity: Address
      matches: CommitRecord[]
    }
  | { kind: "error"; file: File | null; payloadHash: Hex | null; message: string }

export function VerifyPanel() {
  const [identityInput, setIdentityInput] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const runSeq = useRef(0)

  const identityValid = isAddress(identityInput)
  const normalizedIdentity: Address | null = identityValid
    ? getAddress(identityInput)
    : null

  const resetResult = () => {
    runSeq.current++
    setPhase({ kind: "idle" })
  }

  const onFile = (f: File | null) => {
    setFile(f)
    resetResult()
  }

  const onIdentityChange = (v: string) => {
    setIdentityInput(v)
    resetResult()
  }

  const runVerify = async () => {
    if (!file || !normalizedIdentity) return
    const id = ++runSeq.current
    setPhase({ kind: "hashing", file })
    try {
      const buf = await file.arrayBuffer()
      if (runSeq.current !== id) return
      const payloadHash = keccak256(new Uint8Array(buf))

      setPhase({ kind: "searching", file, payloadHash, identity: normalizedIdentity })

      const matches = await findCommits({
        identity: normalizedIdentity,
        payloadHash,
      })
      if (runSeq.current !== id) return

      setPhase({
        kind: "result",
        file,
        payloadHash,
        identity: normalizedIdentity,
        matches,
      })
    } catch (e: unknown) {
      if (runSeq.current !== id) return
      const err = e as { shortMessage?: string; message?: string }
      setPhase({
        kind: "error",
        file,
        payloadHash: null,
        message: err?.shortMessage ?? err?.message ?? "failed",
      })
    }
  }

  const busy = phase.kind === "hashing" || phase.kind === "searching"
  const payloadHash =
    phase.kind === "searching" || phase.kind === "result"
      ? phase.payloadHash
      : null

  const canSubmit = !!file && identityValid && !busy
  const identityShowsError = identityInput.length > 0 && !identityValid

  return (
    <section className="flex flex-col gap-6 py-10 max-w-2xl mx-auto">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-medium tracking-tight">
          Verify a commit
        </h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Paste an identity address and drop the file that was committed.
          The file is hashed locally and Sepolia is queried directly —
          no server, no upload.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted-foreground font-mono tracking-wide">
            identity
          </span>
          <input
            value={identityInput}
            onChange={(e) => onIdentityChange(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            className={
              "h-10 px-3 text-[13px] font-mono bg-transparent border rounded-sm outline-none transition-colors " +
              (identityShowsError
                ? "border-destructive/60 focus:border-destructive"
                : "border-border focus:border-foreground/40")
            }
          />
          {identityShowsError && (
            <span className="text-[11px] text-destructive">
              Not a valid address.
            </span>
          )}
        </label>

        <FileDrop file={file} onFile={onFile} disabled={busy} />

        {payloadHash && (
          <div className="flex items-baseline gap-3 text-[11px] min-w-0">
            <span className="text-muted-foreground font-mono tracking-wide shrink-0">
              keccak256
            </span>
            <span className="font-mono text-foreground/80 truncate">
              {payloadHash}
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={runVerify}
            disabled={!canSubmit}
            className="h-9 px-4 rounded-sm bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {phase.kind === "hashing"
              ? "Hashing…"
              : phase.kind === "searching"
                ? "Checking Sepolia…"
                : "Verify"}
          </button>
          {phase.kind === "error" && (
            <span className="text-[12px] text-destructive">{phase.message}</span>
          )}
        </div>

        {phase.kind === "result" && (
          <VerifyResult
            payloadHash={phase.payloadHash}
            matches={phase.matches}
            identityFilter={phase.identity}
          />
        )}
      </div>
    </section>
  )
}
