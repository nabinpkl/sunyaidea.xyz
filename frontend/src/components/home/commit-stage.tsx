"use client"

import { useEffect, useState } from "react"
import {
  Check,
  Hash,
  KeyRound,
  RadioTower,
  RotateCcw,
  type LucideIcon,
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

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
  const [inputNonce, setInputNonce] = useState(0)

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
    setInputNonce((n) => n + 1)
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
      <div className="flex flex-col gap-5 border border-border bg-card/88 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <Check className="size-3.5" />
          Committed to {networkName} · event verified
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px] sm:grid-cols-[auto_1fr_auto_1fr]">
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
        <Button onClick={reset} variant="outline" size="sm" className="self-start">
          <RotateCcw data-icon="inline-start" />
          Commit another
        </Button>
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="border border-border bg-card/90 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[14px] font-medium">Your idea</h2>
            <p className="text-[12px] text-muted-foreground">
              Plaintext is hashed locally and stays with you.
            </p>
          </div>
          <Badge variant="secondary">{networkName}</Badge>
        </div>

        <div className="p-5">
          <PayloadInput
            key={inputNonce}
            onPayload={handlePayload}
            disabled={busy}
          />
        </div>
      </div>

      <aside className="flex flex-col border border-border bg-background/72 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <span className="text-[14px] font-medium">Proof preview</span>
          <Badge variant={payloadHash ? "default" : "outline"}>
            {payloadHash ? "Ready" : "Waiting"}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-5">
          <div className="flex flex-col gap-3">
            <ProofPreviewRow
              icon={Hash}
              label="Payload hash"
              value={payloadHash ?? "Type or drop an idea to compute hash"}
              active={!!payloadHash}
            />
            <ProofPreviewRow
              icon={KeyRound}
              label="Identity root"
              value={address}
              active
            />
            <ProofPreviewRow
              icon={RadioTower}
              label="Public record"
              value={payloadHash ? "Signed event after wallet approval" : "No transaction yet"}
              active={!!payloadHash}
            />
          </div>

          <Separator />

          {payloadHash && crossCheck.isFetching && (
            <div className="text-[12px] text-muted-foreground">
              Checking if you&apos;ve committed this before…
            </div>
          )}

          {payloadHash && !crossCheck.isFetching && existingMatch && activeChainId && (
            <div className="flex flex-col gap-3 border border-border bg-muted/35 p-4">
              <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                <Check className="size-3.5" />
                Already committed on {networkName}
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
              <Button onClick={reset} variant="outline" size="sm" className="self-start">
                Clear
              </Button>
            </div>
          )}

          {payloadHash && !crossCheck.isFetching && !existingMatch && (
            <div className="mt-auto flex flex-col gap-3">
              <Button onClick={onCommit} disabled={busy} size="lg" className="w-full">
                {isSigning
                  ? "Sign in your wallet…"
                  : isBroadcasting
                    ? "Submitting…"
                    : isConfirming
                      ? "Confirming…"
                      : `Commit to ${networkName}`}
              </Button>
              {error && (
                <span className="text-[13px] text-destructive">{error}</span>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function ProofPreviewRow({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: LucideIcon
  label: string
  value: string
  active?: boolean
}) {
  return (
    <div className="grid min-w-0 grid-cols-[28px_1fr] gap-3">
      <span className="flex size-7 items-center justify-center border border-border bg-card text-muted-foreground">
        <Icon />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={
            "truncate font-mono text-[12px] " +
            (active ? "text-foreground" : "text-muted-foreground")
          }
        >
          {value}
        </span>
      </div>
    </div>
  )
}
