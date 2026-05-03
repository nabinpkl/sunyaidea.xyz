"use client"

import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import { CommitStage } from "./commit-stage"
import { ProofList } from "./proof-list"
import { OnboardingSteps } from "./onboarding-steps"
import { Button } from "@/components/ui/button"
import {
  isSupportedChainId,
  supportedChains,
  chainShortName,
} from "@/lib/chains"

/// Owner home. Gates (wallet + chain) then a two-section layout:
///   Stage   drop a file, cross-checked against your own prior commits,
///            resolves into either a "you already committed this" readout or
///            a Commit button.
///   List    every commit you've ever made on the connected chain, each row
///            re-verifiable by dropping the original file back in.
export function HomePanel() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const onSupportedChain = isSupportedChainId(chainId)
  const onWrongChain = isConnected && !onSupportedChain

  // When on an unsupported chain, nudge to the first supported chain.
  const fallbackChain = supportedChains[0]

  return (
    <section className="flex flex-col gap-7 py-8">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
        <div className="flex flex-col gap-4">
          <h1 className="font-serif text-[34px] font-normal leading-none tracking-tight text-foreground sm:text-[38px]">
            {isConnected ? "My ideas" : "Commit an idea"}
          </h1>
          <p className="max-w-[620px] text-[13px] leading-6 text-muted-foreground">
            {isConnected
              ? "Type your idea here or drop a file. Its hash is signed by your key and written to the blockchain. The content itself never leaves your device."
              : "Hash your idea locally and commit only the hash to the blockchain. You keep the original. Anyone can verify."}
          </p>
        </div>
        {!isConnected && (
          <p className="hidden border-l border-border pl-6 text-[13px] leading-6 text-muted-foreground lg:block">
            Commit before you share. Anyone who has the idea can commit the
            same hash first.
          </p>
        )}
      </header>

      {!isConnected ? (
        <OnboardingSteps onConnect={open} />
      ) : onWrongChain ? (
        <div className="flex items-center justify-between gap-4 border border-border bg-card/88 px-5 py-4 shadow-sm backdrop-blur-sm">
          <span className="text-[14px] text-muted-foreground">
            Switch to a supported network to continue.
          </span>
          <Button
            onClick={() => switchChain({ chainId: fallbackChain.id as number })}
            disabled={isSwitching}
            variant="outline"
          >
            {isSwitching
              ? "Switching…"
              : `Switch to ${chainShortName(fallbackChain.id as number)}`}
          </Button>
        </div>
      ) : (
        <>
          <CommitStage address={address!} chainId={chainId} />
          <ProofList address={address!} chainId={chainId} />
        </>
      )}
    </section>
  )
}
