"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  ArrowRight,
  Box,
  Copy,
  Eye,
  Globe2,
  Hash,
  HelpCircle,
  PenLine,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const proofRows = ["Payload hash", "Identity root", "Block", "Transaction"]

const steps = [
  {
    id: "1",
    icon: Hash,
    title: "Hash locally",
    description: "Your idea is hashed in your browser. Plaintext never leaves your device.",
  },
  {
    id: "2",
    icon: PenLine,
    title: "Sign intent",
    description: "You sign the hash with your wallet to prove authorship and intent.",
  },
  {
    id: "3",
    icon: Box,
    title: "Submit on chain",
    description: "Only the hash is recorded on the blockchain as an immutable proof.",
  },
]

const assurances = [
  {
    icon: ShieldCheck,
    title: "No servers",
    description: "Sunya runs entirely in your browser. No accounts. No databases.",
  },
  {
    icon: UserRound,
    title: "You sign",
    description: "Your wallet proves authorship. You stay in control.",
  },
  {
    icon: Globe2,
    title: "Public record",
    description: "Verifiable by anyone. On-chain, forever.",
  },
]

export function OnboardingSteps({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_352px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3 text-[13px] font-semibold">
            <span>Your idea</span>
            <span className="h-4 w-px bg-border" />
            <span className="inline-flex items-center gap-2 text-[12px] font-medium text-primary">
              <ShieldCheck />
              Stored only on your device
            </span>
          </div>

          <div
            aria-disabled="true"
            className="flex min-h-[146px] cursor-not-allowed select-none flex-col border border-border bg-card/55 opacity-70"
          >
            <div className="flex-1 px-4 py-4 text-[13px] text-muted-foreground">
              Write or paste your idea here...
            </div>
            <div className="flex items-center justify-between px-4 pb-4 text-[11px] text-muted-foreground">
              <span>0 characters</span>
              <span>Never leaves your device</span>
            </div>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="border border-border bg-card/70"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-[13px] font-medium">
            <Eye />
            Proof preview
          </div>
          <div className="px-4 py-2">
            {proofRows.map((label) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border py-2.5 last:border-b-0"
              >
                <div className="flex items-center gap-2 text-[12px] text-foreground">
                  {label}
                  <HelpCircle className="text-muted-foreground" />
                </div>
                <span className="font-mono text-[13px] text-muted-foreground">-</span>
                <Copy className="text-muted-foreground" />
              </div>
            ))}
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 bg-muted/45 px-4 py-2.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="shrink-0 text-primary" />
              This is a preview. Values appear after you submit.
            </div>
          </div>
        </motion.aside>
      </div>

      <div className="flex flex-col gap-5">
        <h2 className="text-[15px] font-semibold">Commit in 3 steps</h2>
        <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start">
          {steps.map((step, index) => (
            <StepItem key={step.id} step={step} showArrow={index < steps.length - 1} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <Button onClick={onConnect} size="lg" className="h-10 min-w-52 justify-start px-6">
          <Wallet data-icon="inline-start" />
          Connect wallet to start
        </Button>
        <Button asChild variant="link" className="px-0 text-primary">
          <Link href="/how-it-works">
            How it works
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <Separator className="-mx-10 mt-1 w-auto sm:-mx-16 lg:-mx-[78px]" />

      <div className="grid gap-6 pb-4 md:grid-cols-3">
        {assurances.map((item, index) => (
          <div key={item.title} className="grid grid-cols-[36px_1fr] gap-4">
            <span className="flex size-8 items-center justify-center text-foreground">
              <item.icon />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-[12px] font-semibold">{item.title}</h3>
              <p className="text-[11px] leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>
            {index < assurances.length - 1 && (
              <span className="hidden border-r border-border md:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StepItem({
  step,
  showArrow,
}: {
  step: (typeof steps)[number]
  showArrow: boolean
}) {
  const Icon = step.icon

  return (
    <>
      <div className="grid grid-cols-[28px_1fr] gap-x-4 gap-y-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[12px] font-semibold text-muted-foreground">
          {step.id}
        </span>
        <span />
        <span className="flex size-6 items-center justify-center bg-muted text-muted-foreground">
          <Icon />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold">{step.title}</h3>
          <p className="max-w-40 text-[11px] leading-5 text-muted-foreground">
            {step.description}
          </p>
        </div>
      </div>
      {showArrow && (
        <div className="hidden items-center pt-[54px] text-muted-foreground md:flex">
          <span className="h-px w-20 bg-border" />
          <ArrowRight />
        </div>
      )}
    </>
  )
}
