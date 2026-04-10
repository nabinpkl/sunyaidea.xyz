"use client"

import Image from "next/image"
import { Search, LayoutGrid, List, Wallet } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { ThemeToggle } from "./theme-toggle"

interface TopBarProps {
  viewMode: "grid" | "list"
  onViewChange: (v: "grid" | "list") => void
}

export function TopBar({ viewMode, onViewChange }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center bg-background px-4 border-b border-nav-border">
      <div className="flex items-center gap-3 min-w-fit">
        <Image
          src="/logo.png"
          alt="Sunya Notes"
          width={28}
          height={28}
          className="shrink-0 opacity-90"
        />
        <span className="text-[15px] font-medium text-foreground/80 tracking-tight select-none hidden sm:block">
          sunya
        </span>
      </div>

      <div className="flex-1 flex justify-center px-4 sm:px-8">
        <div className="flex w-full max-w-[540px] items-center gap-2 rounded-sm bg-search-bg px-3 h-9 focus-within:bg-search-bg-hover focus-within:shadow-sm transition-all duration-200">
          <Search className="size-[14px] text-search-placeholder shrink-0" />
          <input
            placeholder="Search notes"
            className="flex-1 bg-transparent text-[13px] outline-none text-search-text placeholder:text-search-placeholder"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden md:flex items-center gap-0.5 mr-1">
          <Toggle
            pressed={viewMode === "grid"}
            onPressedChange={() => onViewChange("grid")}
            size="sm"
            className="rounded-sm data-[state=on]:bg-foreground/10 h-8 w-8"
            aria-label="Grid view"
          >
            <LayoutGrid className="size-[14px]" />
          </Toggle>
          <Toggle
            pressed={viewMode === "list"}
            onPressedChange={() => onViewChange("list")}
            size="sm"
            className="rounded-sm data-[state=on]:bg-foreground/10 h-8 w-8"
            aria-label="List view"
          >
            <List className="size-[14px]" />
          </Toggle>
        </div>

        <ThemeToggle />

        <button className="ml-1 flex items-center gap-2 px-3 h-8 rounded-sm text-[12px] text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors font-mono tracking-tight">
          <Wallet className="size-3.5 shrink-0" />
          <span className="hidden sm:block">connect</span>
        </button>
      </div>
    </header>
  )
}
