"use client"

import { useRef, useState } from "react"
import { keccak256, type Hex } from "viem"
import { FileDrop } from "./file-drop"
import { Textarea } from "@/components/ui/textarea"

export interface Payload {
  hash: Hex
  source: "text" | "file"
  label: string
}

interface PayloadInputProps {
  onPayload: (p: Payload | null) => void
  disabled?: boolean
}

/// Two-mode payload entry: a textarea for plaintext, or a file drop.
/// Both paths produce a keccak256 of the raw bytes. The contract cannot
/// tell which mode produced the hash, and verification uses the same keccak
/// over the same bytes regardless of how the user re-entered the payload.
export function PayloadInput({ onPayload, disabled }: PayloadInputProps) {
  const [mode, setMode] = useState<"text" | "file">("text")
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const hashSeq = useRef(0)

  const onTextChange = (v: string) => {
    setText(v)
    hashSeq.current++
    if (!v) {
      onPayload(null)
      return
    }
    const bytes = new TextEncoder().encode(v)
    const hash = keccak256(bytes)
    const preview = v.length <= 48 ? v : v.slice(0, 48) + "…"
    onPayload({ hash, source: "text", label: `“${preview}”` })
  }

  const onFileChange = async (f: File | null) => {
    const id = ++hashSeq.current
    setFile(f)
    if (!f) {
      onPayload(null)
      return
    }
    const buf = await f.arrayBuffer()
    if (hashSeq.current !== id) return
    const hash = keccak256(new Uint8Array(buf))
    onPayload({ hash, source: "file", label: f.name })
  }

  const switchMode = (next: "text" | "file") => {
    if (mode === next) return
    setMode(next)
    hashSeq.current++
    setText("")
    setFile(null)
    onPayload(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex self-start overflow-hidden border border-border bg-background/70">
        <ModeTab
          active={mode === "text"}
          disabled={disabled}
          onClick={() => switchMode("text")}
        >
          Text
        </ModeTab>
        <ModeTab
          active={mode === "file"}
          disabled={disabled}
          onClick={() => switchMode("file")}
        >
          File
        </ModeTab>
      </div>

      {mode === "text" ? (
        <div className="flex flex-col gap-3">
          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled}
            rows={7}
            placeholder="Type or paste the idea you want to commit..."
            spellCheck={false}
            className="min-h-56 resize-y border-border bg-background/55 px-4 py-3 text-[15px] leading-relaxed shadow-none focus-visible:ring-1"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span className="font-mono tracking-wide">hashed locally · never uploaded</span>
            <span className="font-mono tracking-wide">{text.length} chars</span>
          </div>
        </div>
      ) : (
        <FileDrop file={file} onFile={onFileChange} disabled={disabled} />
      )}
    </div>
  )
}

function ModeTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "h-8 px-4 text-[12px] font-medium tracking-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  )
}
