"use client"

import { motion } from "motion/react"
import { NoteCard } from "./note-card"
import { ComposeCard } from "./compose-card"

const STUB_NOTES = [
  {
    id: 1,
    title: "Weekly goals",
    body: "Ship the auth flow\nReview PRs\nWrite tests for note encryption",
    cid: "Qm7kx…3b1",
    updatedAt: "1h ago",
  },
  {
    id: 2,
    body: "Grocery list: oat milk, eggs, sourdough, olive oil, lentils",
    cid: "QmA4p…e72",
    updatedAt: "3h ago",
  },
  {
    id: 3,
    title: "Zero-knowledge proof",
    body: "Look into zk-SNARKs for note metadata privacy. The key point is the verifier learns nothing beyond the validity of the statement.",
    cid: "Qm9wz…c84",
    updatedAt: "yesterday",
  },
  {
    id: 4,
    body: "Call dentist Friday",
    cid: "QmF2n…7d5",
    updatedAt: "yesterday",
  },
  {
    id: 5,
    title: "IPFS pinning",
    body: "Use web3.storage or nft.storage. Pin encrypted note CIDs per user wallet address. Consider gateway fallbacks for availability.",
    cid: "Qm1rq…a90",
    updatedAt: "2 days ago",
  },
  {
    id: 6,
    title: "Book recommendations",
    body: "The Remains of the Day\nThink and Grow Rich\nThe Seventh Function of Language\nThe Three-Body Problem",
    cid: "QmB3s…f16",
    updatedAt: "2 days ago",
  },
  {
    id: 7,
    body: "Redesign the onboarding flow — too many steps before user can create their first note.",
    cid: "Qm5vc…2e3",
    updatedAt: "3 days ago",
  },
  {
    id: 8,
    title: "Encryption",
    body: "AES-256-GCM for note content. Derive key from wallet signature using HKDF. Store encrypted blob on IPFS, keep CID in index.",
    cid: "QmD8t…b47",
    updatedAt: "4 days ago",
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.16 } },
}

interface NotesGridProps {
  viewMode: "grid" | "list"
}

export function NotesGrid({ viewMode }: NotesGridProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={
        viewMode === "grid"
          ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3"
          : "flex flex-col max-w-3xl"
      }
    >
      <motion.div
        variants={item}
        className={viewMode === "grid" ? "break-inside-avoid mb-3" : "mb-1"}
      >
        <ComposeCard />
      </motion.div>

      {STUB_NOTES.map((note) => (
        <motion.div
          key={note.id}
          variants={item}
          className={viewMode === "grid" ? "break-inside-avoid mb-3" : undefined}
        >
          <NoteCard
            title={note.title}
            body={note.body}
            cid={note.cid}
            updatedAt={note.updatedAt}
            viewMode={viewMode}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
