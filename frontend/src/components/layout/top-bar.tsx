"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { WalletButton } from "./wallet-button"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "My ideas", href: "/" },
  { label: "Verify", href: "/verify" },
  { label: "How it works", href: "/how-it-works" },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

export function TopBar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-20 border-b border-nav-border bg-background/94 backdrop-blur-md">
      <div className="mx-auto flex h-[58px] max-w-[1160px] items-center bg-background/96 px-10 shadow-[0_0_0_1px_color-mix(in_oklch,var(--border)_78%,transparent)] sm:px-16 lg:px-[78px]">
        <Link href="/" className="flex min-w-fit items-center gap-2">
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            className="shrink-0 opacity-95"
          />
          <span className="select-none text-[16px] font-medium tracking-tight text-foreground">
            SunyaIdeas
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-16 hidden h-full md:block">
          <ul className="flex h-full items-stretch gap-9">
            {tabs.map((tab) => {
              const active = isActive(pathname, tab.href)
              return (
                <li key={tab.href} className="relative flex items-stretch">
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center text-[12px] font-medium tracking-tight transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </Link>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        <span className="flex-1" />

        <div className="flex items-center">
          <WalletButton />
        </div>
      </div>
    </header>
  )
}
