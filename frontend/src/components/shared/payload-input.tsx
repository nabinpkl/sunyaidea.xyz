"use client"

import { useEffect, useRef, useState } from "react"
import { keccak256, type Hex } from "viem"
import { FileDrop } from "./file-drop"

export interface Payload {
  hash: Hex
  source: "text" | "file"
  label: string
}

interface PayloadInputProps {
  payload: Payload | null
  onPayload: (p: Payload | null) => void
  disabled?: boolean
}

/// Two-mode payload entry: a textarea for plaintext, or a file drop.
/// Both paths produce a keccak256 of the raw bytes. The contract cannot
/// tell which mode produced the hash, and verification uses the same keccak
/// over the same bytes regardless of how the user re-entered the payload.
export function PayloadInput({ payload, onPayload, disabled }: PayloadInputProps) {
  const [mode, setMode] = useState<"text" | "file">("text")
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const hashSeq = useRef(0)

  // Parent clearing the payload (e.g. after commit, or on identity change)
  // must also clear our local state so the inputs don't contradict the
  // hash we just told the parent to forget.
  useEffect(() => {
    if (payload === null) {
      setText("")
      setFile(null)
    }
  }, [payload])

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
    <div className="flex flex-col gap-3">
      <div className="flex self-start border border-border rounded-sm overflow-hidden">
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
        <div className="flex flex-col gap-1.5">
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled}
            rows={6}
            placeholder="Type or paste the idea you want to commit… e.g A new social media platform where you can only follow 10 people."
            spellCheck={false}
            className="px-3 py-2 text-[13px] bg-transparent border border-border rounded-sm outline-none focus:border-foreground/40 transition-colors resize-y min-h-28 disabled:opacity-50"
          />
          <div className="text-[10px] text-muted-foreground/70 font-mono tracking-wide">
            hashed locally · never uploaded
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
        "h-7 px-3 text-[11px] font-mono tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
        (active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  )
}
