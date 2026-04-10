"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Plus, Tag, Lock, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ComposeCard() {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setEditing(false)
      }
    }
    if (editing) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [editing])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full border border-dashed border-border rounded-sm p-4 flex items-center gap-3 text-muted-foreground hover:border-foreground/30 hover:text-foreground/70 transition-colors cursor-pointer text-left"
      >
        <Plus className="size-4 shrink-0" />
        <span className="text-[13px]">New note</span>
      </button>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      className="border border-border border-l-2 border-l-foreground/25 rounded-sm bg-background overflow-hidden shadow-sm"
    >
      <input
        autoFocus
        placeholder="Title"
        className="w-full px-4 pt-3 pb-1 text-[14px] font-medium bg-transparent outline-none placeholder:text-muted-foreground"
      />
      <textarea
        placeholder="Write something…"
        rows={4}
        className="w-full px-4 py-1 text-[13px] bg-transparent outline-none resize-none placeholder:text-muted-foreground leading-relaxed"
      />
      <div className="flex items-center justify-between px-2 pb-2 pt-1 border-t border-border/40">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Add tag">
            <Tag className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Encryption">
            <Lock className="size-3.5" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(false)}
          aria-label="Close"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}
