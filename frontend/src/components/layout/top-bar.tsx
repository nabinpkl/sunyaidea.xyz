"use client"

import Image from "next/image"
import { ThemeToggle } from "./theme-toggle"
import { WalletButton } from "./wallet-button"

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center bg-background px-5 border-b border-nav-border">
      <div className="flex items-center gap-3 min-w-fit">
        <Image
          src="/logo.png"
          alt="SunyaIdeas"
          width={32}
          height={32}
          className="shrink-0 opacity-90"
        />
        <span className="text-[17px] font-medium text-foreground/80 tracking-tight select-none hidden sm:block">
          SunyaIdeas
        </span>
      </div>

      <span className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <WalletButton />
      </div>
    </header>
  )
}
