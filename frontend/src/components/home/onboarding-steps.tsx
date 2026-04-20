"use client"

import Image from "next/image"
import { motion } from "motion/react"

interface Step {
  id: string
  title: string
  description: string
  image: string
}

const steps: Step[] = [
  {
    id: "01",
    title: "Connect your own wallet",
    description: "Any EVM wallet like MetaMask or Rabby works. Sunya never holds your keys and operates no servers.",
    image: "/images/wallet.png",
  },
  {
    id: "02",
    title: "Type or drop your idea",
    description: "Content is hashed locally in your browser. The plaintext never leaves your device, ensuring total privacy.",
    image: "/images/hashing.png",
  },
  {
    id: "03",
    title: "Sign and submit",
    description: "You sign and pay gas. Only the hash goes on chain—a permanent, unforgeable proof of your idea.",
    image: "/images/commitment.png",
  },
]

export function OnboardingSteps({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col gap-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col gap-6 group"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30 border border-border/50 group-hover:border-foreground/20 transition-colors">
              <Image
                src={step.image}
                alt={step.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 font-mono text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/50">
                {step.id}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-[16px] font-medium tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onConnect}
          className="self-start h-12 px-8 rounded-sm bg-foreground text-background text-[15px] font-medium hover:opacity-90 transition-opacity"
        >
          Connect wallet to start
        </motion.button>

        <p className="text-[12px] text-muted-foreground leading-relaxed max-w-xl italic">
          Tip: commit before you share. Anyone with your idea can commit its
          hash. Sunya secures what you commit the moment you commit it, not
          what you&apos;ve already disclosed elsewhere.
        </p>
      </div>
    </div>
  )
}
