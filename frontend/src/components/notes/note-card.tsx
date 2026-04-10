"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Lock, Tag, Pin, Archive, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NoteCardProps {
  title?: string
  body: string
  cid?: string
  updatedAt?: string
  viewMode?: "grid" | "list"
}

export function NoteCard({
  title,
  body,
  cid = "Qm3xf…9a2",
  updatedAt = "2h ago",
  viewMode = "grid",
}: NoteCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn(
        "cursor-pointer select-none group transition-colors",
        viewMode === "grid"
          ? "border border-border border-l-2 border-l-foreground/15 rounded-sm p-4 hover:border-l-foreground/40 bg-background"
          : "border-b border-border py-4 pl-3 border-l-2 border-l-transparent hover:border-l-foreground/30 hover:bg-foreground/[0.02]"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground/60 font-mono tracking-wide">
        <Lock className="size-2.5" />
        <span>{cid}</span>
        <span>·</span>
        <span>{updatedAt}</span>
      </div>

      {title && (
        <p className={cn(
          "font-medium text-foreground leading-snug",
          viewMode === "grid" ? "text-[15px] mb-1.5" : "text-[14px] mb-1"
        )}>
          {title}
        </p>
      )}
      <p className={cn(
        "text-[13px] text-foreground/65 leading-relaxed whitespace-pre-line",
        viewMode === "list" && "line-clamp-2"
      )}>
        {body}
      </p>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-0.5 mt-2.5 -mb-0.5"
          >
            <Button variant="ghost" size="icon-sm" aria-label="Add tag">
              <Tag className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Pin to IPFS">
              <Pin className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Archive">
              <Archive className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreVertical className="size-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
