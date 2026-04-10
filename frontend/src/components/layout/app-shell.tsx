"use client"

import { useState } from "react"
import { TopBar } from "./top-bar"
import { NotesGrid } from "@/components/notes/notes-grid"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AppShell() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeFilter, setActiveFilter] = useState("notes")

  const filters = [
    { id: "notes", label: "Notes" },
    { id: "tags", label: "Tags" },
    { id: "archive", label: "Archive" },
    { id: "bin", label: "Bin" },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopBar viewMode={viewMode} onViewChange={setViewMode} />
      <ScrollArea className="flex-1">
        <main className="max-w-6xl mx-auto px-6 pb-12">
          <nav className="flex items-center gap-1 pt-4 pb-5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={
                  activeFilter === f.id
                    ? "px-3 py-1.5 text-[13px] font-medium text-foreground border-b-2 border-foreground transition-colors"
                    : "px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                }
              >
                {f.label}
              </button>
            ))}
            <span className="flex-1" />
            <span className="text-[11px] text-muted-foreground font-mono tracking-wide">
              all encrypted
            </span>
          </nav>
          <NotesGrid viewMode={viewMode} />
        </main>
      </ScrollArea>
    </div>
  )
}
