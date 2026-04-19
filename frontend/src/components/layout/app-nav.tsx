"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface Tab {
  label: string
  href: string
}

const tabs: Tab[] = [
  { label: "My ideas", href: "/" },
  { label: "Verify", href: "/verify" },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

/// Sub-nav sits under the TopBar and owns primary section navigation.
/// URL-driven via `usePathname`; each tab is a real `<Link>` so clicking
/// a tab is a route change, and the active underline reflects the path.
export function AppNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="sticky top-14 z-10 bg-background border-b border-nav-border"
    >
      <div className="max-w-6xl mx-auto px-6">
        <ul className="flex items-stretch h-10 gap-6">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <li key={tab.href} className="relative flex items-stretch">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "inline-flex items-center text-[13px] tracking-tight transition-colors " +
                    (active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80")
                  }
                >
                  {tab.label}
                </Link>
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-px bg-foreground"
                  />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
