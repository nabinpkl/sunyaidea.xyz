"use client"

import { useRef, useState } from "react"
import { type Hex } from "viem"
import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import { PayloadInput, type Payload } from "../shared/payload-input"
import {
  findCommitsOnChain,
  type CommitRecord,
} from "@/lib/query-commits"
import {
  chainShortName,
  isSupportedChainId,
  supportedChains,
  type SupportedChainId,
} from "@/lib/chains"
import { VerifyResult } from "./verify-result"

type Phase =
  | { kind: "idle" }
  | { kind: "searching"; payloadHash: Hex }
  | { kind: "result"; payloadHash: Hex; matches: CommitRecord[] }
  | { kind: "error"; message: string }

export function VerifyPanel() {
  const { open } = useAppKit()
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const onSupportedChain = isSupportedChainId(chainId)
  const activeChainId = onSupportedChain ? (chainId as SupportedChainId) : null
  const networkName = activeChainId ? chainShortName(activeChainId) : ""
  const fallbackChain = supportedChains[0]

  const [payload, setPayload] = useState<Payload | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const runSeq = useRef(0)

  const resetResult = () => {
    runSeq.current++
    setPhase({ kind: "idle" })
  }

  const onPayload = (p: Payload | null) => {
    setPayload(p)
    resetResult()
  }

  const runVerify = async () => {
    if (!payload || !activeChainId) return
    const id = ++runSeq.current
    const payloadHash = payload.hash
    setPhase({ kind: "searching", payloadHash })
    try {
      const matches = await findCommitsOnChain({
        chainId: activeChainId,
        payloadHash,
      })
      if (runSeq.current !== id) return
      setPhase({ kind: "result", payloadHash, matches })
    } catch (e: unknown) {
      if (runSeq.current !== id) return
      const err = e as { shortMessage?: string; message?: string }
      setPhase({
        kind: "error",
        message: err?.shortMessage ?? err?.message ?? "failed",
      })
    }
  }

  const busy = phase.kind === "searching"
  const payloadHash = payload?.hash ?? null
  const canSubmit = !!payload && !busy && !!activeChainId

  return (
    <section className="flex flex-col gap-8 py-12 max-w-3xl mx-auto">
      <header className="flex flex-col gap-3">
        <h1 className="text-[30px] font-medium tracking-tight">
          Verify a commit
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed">
          Re-enter the plaintext or drop the file that was committed. The
          content is hashed locally and the selected chain is queried
          directly. No server, no upload. Any matching commits are returned
          with the identity that signed them.
        </p>
      </header>

      {!isConnected ? (
        <button
          onClick={() => open()}
          className="self-start h-10 px-5 rounded-sm bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          Connect wallet to pick a chain
        </button>
      ) : !activeChainId ? (
        <div className="flex items-center justify-between gap-4 px-5 h-14 border border-border rounded-sm bg-muted/30">
          <span className="text-[14px] text-muted-foreground">
            Switch to a supported network to continue.
          </span>
          <button
            onClick={() => switchChain({ chainId: fallbackChain.id as number })}
            disabled={isSwitching}
            className="text-[14px] text-foreground hover:underline underline-offset-4 disabled:opacity-50"
          >
            {isSwitching
              ? "Switching…"
              : `Switch to ${chainShortName(fallbackChain.id as number)}`}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <PayloadInput payload={payload} onPayload={onPayload} disabled={busy} />

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
              className="h-10 px-5 rounded-sm bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {phase.kind === "searching"
                ? `Checking ${networkName}…`
                : `Verify on ${networkName}`}
            </button>
            {phase.kind === "error" && (
              <span className="text-[13px] text-destructive">{phase.message}</span>
            )}
          </div>

          {phase.kind === "result" && (
            <VerifyResult
              payloadHash={phase.payloadHash}
              matches={phase.matches}
              chainId={activeChainId}
            />
          )}
        </div>
      )}
    </section>
  )
}
