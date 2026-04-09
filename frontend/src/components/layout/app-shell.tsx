"use client"

import { useState } from "react"
import { SideNav } from "./side-nav"
import { TopBar } from "./top-bar"
import { NewNoteBar } from "@/components/notes/new-note-bar"
import { NotesGrid } from "@/components/notes/notes-grid"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarProvider } from "@/components/ui/sidebar"

export function AppShell() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <SideNav />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar viewMode={viewMode} onViewChange={setViewMode} />
          <ScrollArea className="flex-1">
            <main className="px-6 pb-12">
              <NewNoteBar />
              <NotesGrid viewMode={viewMode} />
            </main>
          </ScrollArea>
        </div>
      </div>
    </SidebarProvider>
  )
}
