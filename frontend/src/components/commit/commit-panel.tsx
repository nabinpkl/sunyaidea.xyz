"use client"

import { useRef, useState } from "react"
import { keccak256 } from "viem"
import { sepolia } from "@reown/appkit/networks"
import { useAppKit } from "@reown/appkit/react"
import {
  useAccount,
  useChainId,
  useSignTypedData,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"
import {
  commitRegistryAbi,
  commitRegistryAddress,
  commitTypedDataDomain,
  commitTypedDataTypes,
  COMMIT_TITLE,
  COMMIT_DESCRIPTION,
} from "@/lib/contracts"
import { verifyCommitInReceipt } from "@/lib/verify-commit"
import { FileDrop } from "./file-drop"
import { CommitReceipt } from "./commit-receipt"

export function CommitPanel() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const [file, setFile] = useState<File | null>(null)
  const [payloadHash, setPayloadHash] = useState<`0x${string}` | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hashSeq = useRef(0)

  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData()
  const {
    writeContractAsync,
    data: txHash,
    isPending: isBroadcasting,
    reset: resetWrite,
  } = useWriteContract()
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: sepolia.id,
  })

  const handleFile = async (f: File | null) => {
    const id = ++hashSeq.current
    setFile(f)
    setError(null)
    if (!f) {
      setPayloadHash(null)
      return
    }
    const buf = await f.arrayBuffer()
    if (hashSeq.current !== id) return
    setPayloadHash(keccak256(new Uint8Array(buf)))
  }

  const reset = () => {
    hashSeq.current++
    setFile(null)
    setPayloadHash(null)
    setError(null)
    resetWrite()
  }

  const onCommit = async () => {
    setError(null)
    if (!address || !payloadHash) return
    try {
      const signature = await signTypedDataAsync({
        domain: {
          ...commitTypedDataDomain,
          chainId: sepolia.id,
          verifyingContract: commitRegistryAddress[sepolia.id],
        },
        types: commitTypedDataTypes,
        primaryType: "Commit",
        message: {
          title: COMMIT_TITLE,
          description: COMMIT_DESCRIPTION,
          identity: address,
          payloadHash,
        },
      })
      await writeContractAsync({
        abi: commitRegistryAbi,
        address: commitRegistryAddress[sepolia.id],
        functionName: "commit",
        args: [address, payloadHash, signature],
        chainId: sepolia.id,
      })
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string }
      setError(err?.shortMessage ?? err?.message ?? "failed")
    }
  }

  const onWrongChain = isConnected && chainId !== sepolia.id
  const busy = isSigning || isBroadcasting || isConfirming

  const verification = receipt && address && payloadHash
    ? verifyCommitInReceipt({
        receipt,
        registry: commitRegistryAddress[sepolia.id],
        identity: address,
        payloadHash,
      })
    : null

  return (
    <section className="flex flex-col gap-6 py-10 max-w-2xl mx-auto">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-medium tracking-tight">Commit an idea</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Drop a file. Its hash is signed by your key and written to Blockchain.
          The file itself never leaves your device.
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
            This commit needs Sepolia.
          </span>
          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitching}
            className="text-[12px] text-foreground hover:underline underline-offset-4 disabled:opacity-50"
          >
            {isSwitching ? "Switching…" : "Switch network"}
          </button>
        </div>
      ) : verification?.ok ? (
        <CommitReceipt
          identity={address!}
          payloadHash={payloadHash!}
          txHash={txHash!}
          blockNumber={receipt!.blockNumber}
          timestamp={verification.timestamp}
          onReset={reset}
        />
      ) : verification ? (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] text-destructive">
            Transaction did not produce a valid Committed event.
          </div>
          <div className="text-[12px] text-muted-foreground">
            Reason: {verification.reason}. tx:{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline underline-offset-4"
            >
              {txHash}
            </a>
          </div>
          <button
            onClick={reset}
            className="self-start text-[12px] text-foreground/70 hover:text-foreground underline underline-offset-4"
          >
            Start over
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <FileDrop file={file} onFile={handleFile} disabled={busy} />

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
              onClick={onCommit}
              disabled={!payloadHash || busy}
              className="h-9 px-4 rounded-sm bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSigning
                ? "Sign in your wallet…"
                : isBroadcasting
                  ? "Submitting…"
                  : isConfirming
                    ? "Confirming…"
                    : "Commit To Blockchain"}
            </button>
            {error && (
              <span className="text-[12px] text-destructive">{error}</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
