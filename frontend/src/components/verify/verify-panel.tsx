"use client"

import { useRef, useState } from "react"
import { type Address, type Hex } from "viem"
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
import { ManualScopeDialog, type ManualScope } from "./manual-scope-dialog"

type Phase =
  | { kind: "idle" }
  | { kind: "searching"; payloadHash: Hex }
  | { kind: "result"; payloadHash: Hex; matches: CommitRecord[]; identity: Address | null }
  | { kind: "error"; message: string }

export function VerifyPanel() {
  const { open } = useAppKit()
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const [manual, setManual] = useState<ManualScope | null>(null)
  const [manualOpen, setManualOpen] = useState(false)

  const walletChainIsSupported = isSupportedChainId(chainId)
  const walletChainId = walletChainIsSupported
    ? (chainId as SupportedChainId)
    : null
  const activeChainId: SupportedChainId | null =
    manual?.chainId ?? walletChainId
  const identityFilter: Address | null = manual?.identity ?? null
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
    const identity = identityFilter
    setPhase({ kind: "searching", payloadHash })
    try {
      const matches = await findCommitsOnChain({
        chainId: activeChainId,
        payloadHash,
        ...(identity ? { identity } : {}),
      })
      if (runSeq.current !== id) return
      setPhase({ kind: "result", payloadHash, matches, identity })
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
          {isConnected || manual ? (
            <>
              Re-enter the plaintext or drop the file that was committed. The
              content is hashed locally and the selected chain is queried
              directly. No server, no upload. Any matching commits are returned
              with the identity that signed them.
            </>
          ) : (
            <>
              Check whether an idea was committed to the chain. Paste the
              plaintext or drop the file, and its <a
                href="https://www.techtarget.com/searchdatamanagement/definition/hashing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors"
              >hash</a> is compared directly against the
              public chain. No wallet is required to verify connecting one
              only picks which chain to read.
            </>
          )}
        </p>
      </header>

      {!isConnected && !manual ? (
        <div className="flex flex-col gap-8">
          <ol className="flex flex-col gap-5 text-[14px] leading-relaxed">
            <li className="flex gap-4">
              <span className="font-mono text-[12px] text-muted-foreground pt-0.5 shrink-0 w-6">
                01
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground">
                  Bring the original plaintext or file
                </span>
                <span className="text-muted-foreground">
                  Exactly what was committed. Any byte difference produces a
                  different hash.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-[12px] text-muted-foreground pt-0.5 shrink-0 w-6">
                02
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground">
                  Hashing happens in your browser
                </span>
                <span className="text-muted-foreground">
                  The content never leaves your device. Sunya runs no server
                  and sees nothing.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-[12px] text-muted-foreground pt-0.5 shrink-0 w-6">
                03
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground">
                  The chain is read directly
                </span>
                <span className="text-muted-foreground">
                  Any matching commits come back with the signer, block, and
                  timestamp — trust the chain, not us.
                </span>
              </div>
            </li>
          </ol>

          <div className="flex flex-col items-start gap-3">
            <button
              onClick={() => open()}
              className="h-10 px-5 rounded-sm bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition-opacity"
            >
              Connect wallet to start
            </button>
            <button
              onClick={() => setManualOpen(true)}
              className="text-[13px] text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Or verify without connecting — just pick a chain →
            </button>
          </div>
        </div>
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
          {manual && (
            <div className="flex items-center justify-between gap-4 px-4 h-11 border border-border rounded-sm bg-muted/30">
              <div className="flex items-baseline gap-2 text-[12px] min-w-0">
                <span className="text-muted-foreground shrink-0">
                  Reading {chainShortName(manual.chainId)}
                </span>
                {manual.identity && (
                  <span className="font-mono text-foreground/80 truncate">
                    · {manual.identity}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setManualOpen(true)}
                  className="text-[12px] text-foreground hover:underline underline-offset-4"
                >
                  Change
                </button>
                <button
                  onClick={() => {
                    setManual(null)
                    resetResult()
                  }}
                  className="text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

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
              identityFilter={phase.identity}
            />
          )}
        </div>
      )}

      <ManualScopeDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        initial={manual}
        onConfirm={(scope) => {
          setManual(scope)
          resetResult()
        }}
      />
    </section>
  )
}
