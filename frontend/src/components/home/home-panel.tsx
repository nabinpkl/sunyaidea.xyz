"use client"

import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { sepolia } from "@reown/appkit/networks"
import { useAppKit } from "@reown/appkit/react"
import { CommitStage } from "./commit-stage"
import { ProofList } from "./proof-list"

/// Owner home. Gates (wallet + chain) then a two-section layout:
///   Stage  — drop a file, cross-checked against your own prior commits,
///            resolves into either a "you already committed this" readout or
///            a Commit button.
///   List   — every commit you've ever made on Sepolia, each row re-verifiable
///            by dropping the original file back in.
export function HomePanel() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const onWrongChain = isConnected && chainId !== sepolia.id

  return (
    <section className="flex flex-col gap-10 py-10 max-w-2xl mx-auto">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-medium tracking-tight">My ideas</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Drop a file. Its hash is signed by your key and written to the
          blockchain. The file itself never leaves your device.
        </p>
      </header>

      {!isConnected ? (
        <button
          onClick={() => open()}
          className="self-start h-9 px-4 rounded-sm bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          Connect wallet to start
        </button>
      ) : onWrongChain ? (
        <div className="flex items-center justify-between gap-4 px-4 h-12 border border-border rounded-sm bg-muted/30">
          <span className="text-[12px] text-muted-foreground">
            This page needs Sepolia.
          </span>
          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitching}
            className="text-[12px] text-foreground hover:underline underline-offset-4 disabled:opacity-50"
          >
            {isSwitching ? "Switching…" : "Switch network"}
          </button>
        </div>
      ) : (
        <>
          <CommitStage address={address!} />
          <ProofList address={address!} />
        </>
      )}
    </section>
  )
}
