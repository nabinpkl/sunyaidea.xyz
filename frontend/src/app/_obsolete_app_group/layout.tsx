import { ScrollArea } from "@/components/ui/scroll-area"
import { AppNav } from "@/components/layout/app-nav"

/// Layout shared by every primary app section (Commit, Verify).
/// Owns the sub-nav strip and the scrollable main region.
///
/// Persists across tab-switches — clicking Commit <-> Verify re-renders
/// only the child `page.tsx`, not this layout, so the nav underline
/// never flickers.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AppNav />
      <ScrollArea className="flex-1">
        <main className="max-w-6xl mx-auto px-6">{children}</main>
      </ScrollArea>
    </>
  )
}
