"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { PencilLine, Bell, Tag, Archive, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

const navItems = [
  { icon: PencilLine, label: "Notes" },
  { icon: Bell, label: "Reminders" },
  { icon: Tag, label: "Labels" },
  { icon: Archive, label: "Archive" },
  { icon: Trash2, label: "Trash" },
]

export function SideNav() {
  const { state } = useSidebar()
  const expanded = state === "expanded"
  const [active, setActive] = useState("Notes")

  return (
    <motion.nav
      animate={{ width: expanded ? 200 : 56 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="relative flex flex-col shrink-0 overflow-hidden border-r border-border bg-background pt-2 pb-4"
    >
      {navItems.map(({ icon: Icon, label }) => (
        <button
          key={label}
          onClick={() => setActive(label)}
          className={cn(
            "flex items-center gap-3 h-10 pl-4 pr-6 mr-2 rounded-r-full text-sm font-medium transition-colors text-left",
            "hover:bg-accent hover:text-accent-foreground",
            active === label
              ? "bg-accent text-accent-foreground font-semibold"
              : "text-foreground"
          )}
        >
          <Icon className="size-5 shrink-0" />
          <motion.span
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.12 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        </button>
      ))}
    </motion.nav>
  )
}
