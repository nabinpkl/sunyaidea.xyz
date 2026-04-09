"use client"

import Image from "next/image"
import { Menu, Search, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "./theme-toggle"
import { useSidebar } from "@/components/ui/sidebar"

interface TopBarProps {
  viewMode: "grid" | "list"
  onViewChange: (v: "grid" | "list") => void
}

export function TopBar({ viewMode, onViewChange }: TopBarProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center bg-background px-4 border-b border-nav-border">
      <div className="flex items-center gap-3 min-w-fit">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 group hover:bg-accent/80 rounded-full w-12 h-12"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <div className="flex flex-col gap-[3.5px] items-start p-1">
            <span className="w-5 h-[2px] bg-foreground/80 rounded-full transition-all group-hover:bg-foreground" />
            <span className="w-5 h-[2px] bg-foreground/80 rounded-full transition-all group-hover:bg-foreground" />
            <span className="w-5 h-[2px] bg-foreground/80 rounded-full transition-all group-hover:bg-foreground" />
          </div>
        </Button>

        <div className="flex items-center gap-4 px-1">
          <Image
            src="/logo.png"
            alt="Sunya Notes logo"
            width={40}
            height={40}
            className="shrink-0"
          />
          <span className="text-xl font-normal tracking-tight select-none hidden sm:block text-foreground/90">
            Sunya Notes
          </span>
        </div>
      </div>

      <div className="flex-1 flex justify-center px-2 sm:px-8">
        <div className="flex w-full max-w-[720px] items-center gap-2 rounded-sm border border-transparent bg-search-bg px-2 h-12 focus-within:bg-search-bg-hover focus-within:border-transparent focus-within:shadow-md transition-all duration-200">
          <Button variant="ghost" size="icon" className="shrink-0 hover:bg-foreground/5 rounded-full size-10">
            <Search className="size-[20px] text-search-placeholder" />
          </Button>
          <input
            placeholder="Search"
            className="flex-1 bg-transparent text-[18px] font-medium outline-none text-search-text placeholder:text-search-placeholder placeholder:font-normal"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1 mr-2">
          <Toggle
            pressed={viewMode === "grid"}
            onPressedChange={() => onViewChange("grid")}
            size="sm"
            className="rounded-full data-[state=on]:bg-accent/50"
            aria-label="Grid view"
          >
            <LayoutGrid className="size-5" />
          </Toggle>
          <Toggle
            pressed={viewMode === "list"}
            onPressedChange={() => onViewChange("list")}
            size="sm"
            className="rounded-full data-[state=on]:bg-accent/50"
            aria-label="List view"
          >
            <List className="size-5" />
          </Toggle>
        </div>

        <ThemeToggle />

        <Avatar className="ml-2 size-9 cursor-pointer border border-border/50 hover:ring-2 hover:ring-accent transition-all">
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">US</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
