"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "motion/react"
import { Tag, Lock, Archive, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NewNoteBar() {
  const [expanded, setExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    if (expanded) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [expanded])

  return (
    <div ref={ref} className="w-full max-w-xl mx-auto my-6">
      <motion.div
        layout
        className="border border-border rounded-sm bg-background overflow-hidden"
        style={{ boxShadow: expanded ? "0 1px 3px 0 oklch(0 0 0 / 0.06)" : "none" }}
        transition={{ duration: 0.16, ease: "easeInOut" }}
      >
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="w-full h-10 px-4 flex items-center text-[13px] text-muted-foreground text-left"
          >
            Write a note…
          </button>
        ) : (
          <>
            <input
              autoFocus
              placeholder="Title"
              className="w-full px-4 pt-3 pb-1 text-[14px] font-medium bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <textarea
              placeholder="Write something…"
              rows={3}
              className="w-full px-4 py-1 text-[13px] bg-transparent outline-none resize-none placeholder:text-muted-foreground leading-relaxed"
            />
            <div className="flex items-center justify-between px-2 pb-2 pt-1 border-t border-border/50">
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label="Add tag">
                  <Tag className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Encryption">
                  <Lock className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Archive">
                  <Archive className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="More">
                  <MoreVertical className="size-3.5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
