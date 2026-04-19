"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { keccak256, type Hex } from "viem"
import { sepolia } from "@reown/appkit/networks"
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
import { findCommits } from "@/lib/query-commits"
import { verifyCommitInReceipt } from "@/lib/verify-commit"
import { FileDrop } from "../shared/file-drop"
import { KvField } from "../shared/kv-field"

interface CommitStageProps {
  address: `0x${string}`
}

function formatTs(ts: bigint) {
  return (
    new Date(Number(ts) * 1000).toISOString().replace("T", " ").slice(0, 19) +
    " UTC"
  )
}

/// Staging area at the top of the owner home. Drop-then-decide: a file is
/// hashed locally, cross-checked against the user's own commits, and the
/// panel resolves into either a "you already committed this" readout or a
/// Commit button. No auto-trigger — the user sits with the hash before acting.
export function CommitStage({ address }: CommitStageProps) {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [payloadHash, setPayloadHash] = useState<Hex | null>(null)
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

  const crossCheck = useQuery({
    queryKey: ["commits", "by-identity-and-hash", address, payloadHash],
    queryFn: () =>
      findCommits({ identity: address, payloadHash: payloadHash! }),
    enabled: !!payloadHash && !txHash,
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
    if (!payloadHash) return
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

  const verification =
    receipt && payloadHash
      ? verifyCommitInReceipt({
          receipt,
          registry: commitRegistryAddress[sepolia.id],
          identity: address,
          payloadHash,
        })
      : null

  const committed = verification?.ok === true && !!txHash

  useEffect(() => {
    if (!committed) return
    // Commit landed — refresh the list below so the new row appears.
    qc.invalidateQueries({
      queryKey: ["commits", "by-identity", address],
    })
  }, [committed, qc, address])

  const existingMatch = crossCheck.data?.[0]
  const busy = isSigning || isBroadcasting || isConfirming

  if (committed) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <Check className="size-3.5" />
          Committed to Sepolia · event verified
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
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
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

  if (verification && !verification.ok) {
    return (
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
    )
  }

  return (
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

      {payloadHash && crossCheck.isFetching && (
        <div className="text-[12px] text-muted-foreground">
          Checking if you&apos;ve committed this before…
        </div>
      )}

      {payloadHash && !crossCheck.isFetching && existingMatch && (
        <div className="flex flex-col gap-3 p-4 border border-border rounded-sm bg-muted/30">
          <div className="flex items-center gap-2 text-[12px] text-foreground">
            <Check className="size-3.5" />
            You already committed this file.
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
              href={`https://sepolia.etherscan.io/tx/${existingMatch.txHash}`}
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
