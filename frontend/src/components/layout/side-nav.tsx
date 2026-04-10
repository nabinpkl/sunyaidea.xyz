"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { FileText, Tag, Archive, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

const navItems = [
  { icon: FileText, label: "Notes" },
  { icon: Tag, label: "Tags" },
  { icon: Archive, label: "Archive" },
  { icon: Trash2, label: "Bin" },
]

export function SideNav() {
  const { state } = useSidebar()
  const expanded = state === "expanded"
  const [active, setActive] = useState("Notes")

  return (
    <motion.nav
      animate={{ width: expanded ? 260 : 64 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col shrink-0 overflow-hidden bg-background pt-2 pb-4"
    >
      {navItems.map(({ icon: Icon, label }) => (
        <button
          key={label}
          onClick={() => setActive(label)}
          className={cn(
            "flex items-center gap-4 h-11 px-5 w-full transition-all duration-150 text-left",
            active === label
              ? "border-l-2 border-foreground pl-[18px] bg-foreground/5 text-foreground font-medium"
              : "border-l-2 border-transparent text-foreground/60 hover:bg-foreground/4 hover:text-foreground/80 font-normal"
          )}
        >
          <Icon className="size-[18px] shrink-0" />
          <motion.span
            animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -8 }}
            transition={{ duration: 0.15 }}
            className="text-[14px] whitespace-nowrap overflow-hidden tracking-wide"
          >
            {label}
          </motion.span>
        </button>
      ))}
    </motion.nav>
  )
}
