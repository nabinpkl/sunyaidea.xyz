"use client"

import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { useAppKit } from "@reown/appkit/react"
import { CommitStage } from "./commit-stage"
import { ProofList } from "./proof-list"
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
    <section className="flex flex-col gap-12 py-12 max-w-3xl mx-auto">
      <header className="flex flex-col gap-3">
        <h1 className="text-[30px] font-medium tracking-tight">My ideas</h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed">
          {isConnected
            ? "Type your idea here or drop a file. Its hash is signed by your key and written to the blockchain. The content itself never leaves your device."
            : <>Have an Idea? Commit your idea <a href="https://www.techtarget.com/searchdatamanagement/definition/hashing" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors">hash</a> to a public blockchain under your own key. Timestamped, signed, impossible to backdate. If the idea is ever contested, you reveal the original and prove it matches.</>}
        </p>
      </header>

      {!isConnected ? (
        <div className="flex flex-col gap-8">
          <ol className="flex flex-col gap-5 text-[14px] leading-relaxed">
            <li className="flex gap-4">
              <span className="font-mono text-[12px] text-muted-foreground pt-0.5 shrink-0 w-6">
                01
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground">Connect your own wallet</span>
                <span className="text-muted-foreground">
                  Any EVM wallet like metamask  works. Sunya never holds your keys and runs no
                  server.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-[12px] text-muted-foreground pt-0.5 shrink-0 w-6">
                02
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground">
                  Type or drop what you want to commit
                </span>
                <span className="text-muted-foreground">
                  The content is hashed in your browser. The
                  plaintext never leaves your device.
                </span>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-[12px] text-muted-foreground pt-0.5 shrink-0 w-6">
                03
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground">Sign and submit yourself</span>
                <span className="text-muted-foreground">
                  You sign and pay gas. Only the hash goes on chain. Anyone can
                  verify it later; no one can forge or backdate it.
                </span>
              </div>
            </li>
          </ol>

          <button
            onClick={() => open()}
            className="self-start h-10 px-5 rounded-sm bg-foreground text-background text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            Connect wallet to start
          </button>

          <p className="text-[12px] text-muted-foreground leading-relaxed max-w-xl">
            Tip: commit before you share. Anyone with your idea can commit its
            hash. Sunya secures what you commit the moment you commit it, not
            what you&apos;ve already disclosed elsewhere.
          </p>
        </div>
      ) : onWrongChain ? (
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
        <>
          <CommitStage address={address!} chainId={chainId} />
          <ProofList address={address!} chainId={chainId} />
        </>
      )}
    </section>
  )
}
