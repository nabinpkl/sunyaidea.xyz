"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  useSignTypedData,
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
import { findCommitsOnChain } from "@/lib/query-commits"
import { verifyCommitInReceipt } from "@/lib/verify-commit"
import {
  chainShortName,
  explorerTxUrl,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chains"
import { PayloadInput, type Payload } from "../shared/payload-input"
import { KvField } from "../shared/kv-field"

interface CommitStageProps {
  address: `0x${string}`
  chainId: number
}

function formatTs(ts: bigint) {
  return (
    new Date(Number(ts) * 1000).toISOString().replace("T", " ").slice(0, 19) +
    " UTC"
  )
}

/// Staging area at the top of the owner home. Drop-then-decide: a file is
/// hashed locally, cross-checked against the user's own commits on the
/// connected chain, and the panel resolves into either a "you already
/// committed this" readout or a Commit button. No auto-trigger, so the user
/// sits with the hash before acting.
export function CommitStage({ address, chainId }: CommitStageProps) {
  const qc = useQueryClient()
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const payloadHash = payload?.hash ?? null
  // Gate-level check upstream (home-panel) already prevents this component
  // from mounting on an unsupported chain, but narrow the type here so the
  // contract/explorer lookups below are type-safe.
  const supported = isSupportedChainId(chainId)
  const activeChainId = supported ? (chainId as SupportedChainId) : null
  const networkName = activeChainId ? chainShortName(activeChainId) : ""

  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData()
  const {
    writeContractAsync,
    data: txHash,
    isPending: isBroadcasting,
    reset: resetWrite,
  } = useWriteContract()
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: activeChainId ?? undefined,
  })

  const crossCheck = useQuery({
    queryKey: ["commits", "by-identity-and-hash", activeChainId, address, payloadHash],
    queryFn: () =>
      findCommitsOnChain({
        chainId: activeChainId!,
        identity: address,
        payloadHash: payloadHash!,
      }),
    enabled: !!payloadHash && !!activeChainId && !txHash,
  })

  const handlePayload = (p: Payload | null) => {
    setPayload(p)
    setError(null)
  }

  const reset = () => {
    setPayload(null)
    setError(null)
    resetWrite()
  }

  const onCommit = async () => {
    setError(null)
    if (!payloadHash || !activeChainId) return
    try {
      const signature = await signTypedDataAsync({
        domain: {
          ...commitTypedDataDomain,
          chainId: activeChainId,
          verifyingContract: commitRegistryAddress[activeChainId],
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
        address: commitRegistryAddress[activeChainId],
        functionName: "commit",
        args: [address, payloadHash, signature],
        chainId: activeChainId,
      })
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string }
      setError(err?.shortMessage ?? err?.message ?? "failed")
    }
  }

  const verification =
    receipt && payloadHash && activeChainId
      ? verifyCommitInReceipt({
          receipt,
          registry: commitRegistryAddress[activeChainId],
          identity: address,
          payloadHash,
        })
      : null

  const committed = verification?.ok === true && !!txHash

  useEffect(() => {
    if (!committed) return
    // Commit landed. Refresh the list below so the new row appears.
    qc.invalidateQueries({
      queryKey: ["commits", "by-identity", activeChainId, address],
    })
  }, [committed, qc, address, activeChainId])

  const existingMatch = crossCheck.data?.[0]
  const busy = isSigning || isBroadcasting || isConfirming

  if (committed && activeChainId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <Check className="size-3.5" />
          Committed to {networkName} · event verified
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px]">
          <KvField label="payload hash" value={payloadHash!} />
          <KvField
            label="block"
            value={receipt!.blockNumber.toString()}
          />
          <KvField label="timestamp" value={formatTs(verification.timestamp)} />
          <KvField
            label="tx"
            value={txHash}
            href={explorerTxUrl(activeChainId, txHash)}
          />
        </dl>
        <button
          onClick={reset}
          className="self-start text-[12px] text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-foreground/20"
        >
          Commit another
        </button>
      </div>
    )
  }

  if (verification && !verification.ok && activeChainId && txHash) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[13px] text-destructive">
          Transaction did not produce a valid Committed event.
        </div>
        <div className="text-[12px] text-muted-foreground">
          Reason: {verification.reason}. tx:{" "}
          <a
            href={explorerTxUrl(activeChainId, txHash)}
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
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PayloadInput payload={payload} onPayload={handlePayload} disabled={busy} />

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

      {payloadHash && crossCheck.isFetching && (
        <div className="text-[12px] text-muted-foreground">
          Checking if you&apos;ve committed this before…
        </div>
      )}

      {payloadHash && !crossCheck.isFetching && existingMatch && activeChainId && (
        <div className="flex flex-col gap-3 p-4 border border-border rounded-sm bg-muted/30">
          <div className="flex items-center gap-2 text-[12px] text-foreground">
            <Check className="size-3.5" />
            You already committed this on {networkName}.
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px]">
            <KvField
              label="block"
              value={existingMatch.blockNumber.toString()}
            />
            <KvField
              label="timestamp"
              value={formatTs(existingMatch.blockTimestamp)}
            />
            <KvField
              label="tx"
              value={existingMatch.txHash}
              href={explorerTxUrl(activeChainId, existingMatch.txHash)}
            />
          </dl>
          <button
            onClick={reset}
            className="self-start text-[12px] text-foreground/70 hover:text-foreground underline underline-offset-4"
          >
            Clear
          </button>
        </div>
      )}

      {payloadHash && !crossCheck.isFetching && !existingMatch && (
        <div className="flex items-center gap-4">
          <button
            onClick={onCommit}
            disabled={busy}
            className="h-9 px-4 rounded-sm bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSigning
              ? "Sign in your wallet…"
              : isBroadcasting
                ? "Submitting…"
                : isConfirming
                  ? "Confirming…"
                  : "Commit to blockchain"}
          </button>
          {error && (
            <span className="text-[12px] text-destructive">{error}</span>
          )}
        </div>
      )}
    </div>
  )
}
