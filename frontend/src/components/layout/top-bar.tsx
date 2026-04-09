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
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-border bg-background px-4">
      <div className="flex items-center gap-3 min-w-fit">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 group hover:bg-accent/50 rounded-full w-12 h-12"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <div className="flex flex-col gap-[3.5px] items-start p-1">
            <span className="w-5 h-[2.5px] bg-foreground/70 rounded-full transition-all group-hover:bg-foreground" />
            <span className="w-5 h-[2.5px] bg-foreground/70 rounded-full transition-all group-hover:bg-foreground" />
            <span className="w-5 h-[2.5px] bg-foreground/70 rounded-full transition-all group-hover:bg-foreground" />
          </div>
        </Button>

        <div className="flex items-center gap-2 px-1">
          <Image
            src="/logo.png"
            alt="Sunyanotes logo"
            width={40}
            height={40}
            className="shrink-0"
          />
          <span className="text-xl font-normal tracking-tight select-none hidden sm:block text-foreground/90">
            Sunyanotes
          </span>
        </div>
      </div>

      <div className="flex-1 flex justify-center px-4 sm:px-8">
        <div className="flex w-full max-w-2xl items-center gap-3 rounded-lg border border-transparent bg-secondary/50 px-4 h-12 focus-within:bg-background focus-within:border-border focus-within:shadow-sm transition-all duration-200">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            placeholder="Search"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
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
