"use client"

import { TopBar } from "./top-bar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CommitPanel } from "@/components/commit/commit-panel"

export function AppShell() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopBar />
      <ScrollArea className="flex-1">
        <main className="max-w-6xl mx-auto px-6">
          <CommitPanel />
        </main>
      </ScrollArea>
    </div>
  )
}
