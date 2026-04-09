"use client"

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
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background px-3">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="size-5" />
      </Button>

      <span className="text-sm font-medium tracking-tight mr-2 hidden sm:block select-none">
        sunyanotes
      </span>

      <div className="flex flex-1 max-w-lg items-center gap-2 rounded-sm border border-border bg-secondary px-3 h-9 focus-within:bg-background transition-colors">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <input
          placeholder="Search"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <Toggle
          pressed={viewMode === "grid"}
          onPressedChange={() => onViewChange("grid")}
          size="sm"
          aria-label="Grid view"
        >
          <LayoutGrid className="size-4" />
        </Toggle>
        <Toggle
          pressed={viewMode === "list"}
          onPressedChange={() => onViewChange("list")}
          size="sm"
          aria-label="List view"
        >
          <List className="size-4" />
        </Toggle>

        <ThemeToggle />

        <Avatar className="ml-2 cursor-pointer">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
