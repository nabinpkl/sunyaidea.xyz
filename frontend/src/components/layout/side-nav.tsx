"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Lightbulb, Bell, Pencil, Archive, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

const navItems = [
  { icon: Lightbulb, label: "Notes" },
  { icon: Bell, label: "Reminders" },
  { icon: Pencil, label: "Edit labels" },
  { icon: Archive, label: "Archive" },
  { icon: Trash2, label: "Bin" },
]

export function SideNav() {
  const { state } = useSidebar()
  const expanded = state === "expanded"
  const [active, setActive] = useState("Notes")

  return (
    <motion.nav
      animate={{ width: expanded ? 280 : 80 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col shrink-0 overflow-hidden bg-background pt-2 pb-4"
    >
      {navItems.map(({ icon: Icon, label }) => (
        <button
          key={label}
          onClick={() => setActive(label)}
          className={cn(
            "flex items-center gap-5 h-12 pl-6 pr-8 mr-2 rounded-r-full transition-all duration-200 text-left group",
            active === label
              ? "bg-sidebar-active-bg text-sidebar-active-text font-bold"
              : "text-foreground/80 hover:bg-foreground/5 font-medium"
          )}
        >
          <Icon className={cn(
            "size-6 shrink-0 transition-colors",
            active === label ? "text-sidebar-active-text" : "text-foreground/80"
          )} />
          <motion.span
            animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -10 }}
            transition={{ duration: 0.15 }}
            className="text-[15px] whitespace-nowrap overflow-hidden tracking-wide"
          >
            {label}
          </motion.span>
        </button>
      ))}
    </motion.nav>
  )
}
