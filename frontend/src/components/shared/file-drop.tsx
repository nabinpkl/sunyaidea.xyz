"use client"

import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"

interface FileDropProps {
  file: File | null
  onFile: (file: File | null) => void
  disabled?: boolean
}

export function FileDrop({ file, onFile, disabled }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 h-12 border border-border rounded-sm bg-muted/40">
        <div className="min-w-0 flex items-baseline gap-3">
          <span className="text-[13px] text-foreground truncate">{file.name}</span>
          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
            {formatBytes(file.size)}
          </span>
        </div>
        <button
          onClick={() => onFile(null)}
          disabled={disabled}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Remove file"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (disabled) return
        const dropped = e.dataTransfer.files[0]
        if (dropped) onFile(dropped)
      }}
      className={
        "flex flex-col items-center justify-center gap-2 h-32 border border-dashed rounded-sm cursor-pointer transition-colors " +
        (dragging
          ? "border-foreground/40 bg-foreground/[0.03]"
          : "border-border hover:border-foreground/30 hover:bg-foreground/[0.02]") +
        (disabled ? " opacity-50 cursor-not-allowed pointer-events-none" : "")
      }
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) onFile(picked)
          e.target.value = ""
        }}
      />
      <Upload className="size-4 text-muted-foreground" />
      <div className="text-[12px] text-muted-foreground">
        Drop a file here, or <span className="text-foreground">click to choose</span>
      </div>
      <div className="text-[10px] text-muted-foreground/70 font-mono tracking-wide">
        hashed locally · never uploaded
      </div>
    </label>
  )
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
