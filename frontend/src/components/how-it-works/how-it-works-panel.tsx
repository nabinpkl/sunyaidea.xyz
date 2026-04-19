/// How it works: plain-language explainer. Grounds the user in what Sunya
/// actually is (a commit registry), what it is not (a notes app, a proof of
/// authorship by itself), and what they are responsible for (keeping the
/// plaintext, committing before sharing). Written in prose, not bullets,
/// because this is a document, not a checklist.
export function HowItWorksPanel() {
  return (
    <section className="flex flex-col gap-10 py-10 max-w-2xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="text-[24px] font-medium tracking-tight">
          How it works
        </h1>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Sunya is a commit registry. You write an idea on your device, and a
          cryptographic fingerprint of that text is signed by your key and
          written to a public blockchain. Only the fingerprint is ever sent
          anywhere. The text itself stays with you.
        </p>
      </header>

      <Section title="The commit">
        <p>
          When you commit, three things happen in sequence on your device.
          First, your browser computes a <Mono>keccak256</Mono> hash of the
          plaintext, which is a fixed-length fingerprint that changes if even
          a single character changes. Second, your wallet signs a typed
          message containing that hash. Third, the signature and the hash
          are submitted to the <Mono>CommitRegistry</Mono> contract, which
          verifies the signature on-chain and emits a{" "}
          <Mono>Committed</Mono> event.
        </p>
        <p>
          The plaintext never leaves your device. Sunya operates no server,
          no database, no relayer, no indexer. You bring your own wallet,
          you sign your own transactions, you pay your own gas.
        </p>
      </Section>

      <Section title="The reveal">
        <p>
          Later, if the idea is contested in a dispute, a priority argument,
          or a scoop, you can reveal the original plaintext. Anyone can
          re-hash it themselves and confirm that the hash matches the one
          recorded on chain at a specific block, signed by your key. No
          trust in Sunya is required. No trust in any third party is
          required. The chain&apos;s block timestamp is the anchor.
        </p>
        <p>
          The Verify page on this app is one way to do that check, but it is
          not the only way. The contract is public and the event log is
          public; anyone can query it directly.
        </p>
      </Section>

      <Section title="If you lose the plaintext">
        <p>
          The commit remains on chain. Your signed hash is still there,
          still timestamped, still verifiable as yours. But without the
          original bytes you can no longer <em>reveal</em> what was
          committed. A hash is a one-way function. You cannot recover the
          text from it.
        </p>
        <p>
          This is deliberate. The reason the plaintext never touches Sunya
          is that no server can leak what it never had. The trade-off is
          that the responsibility for keeping the original content lives
          with you. If the bytes are gone, the evidence is reduced to
          &quot;this address committed <em>some</em> hash at this
          time&quot;, which is rarely enough on its own to matter in a
          dispute.
        </p>
        <p>
          Back up the plaintext somewhere you trust. Multiple places is
          better. The commit is the part we secure; the content is the part
          you secure.
        </p>
      </Section>

      <Section title="Your responsibility as an IP protector">
        <p>
          Sunya gives you one strong piece of evidence. You bring the rest.
          A credible case typically combines the commit with drafts, dated
          notes, related prior work, witnesses, and corroborating
          communications. The commit anchors a specific claim to a specific
          point in time; the other evidence makes the claim legible and
          contextualises it.
        </p>
        <p>
          There is one behaviour that matters more than any technical
          detail: commit first, share later. If you discuss an idea with
          someone in a message, a call, or a public post before committing
          it, then anyone with that information can commit the same hash
          before you. Sunya secures what you commit the moment you commit
          it. It cannot retroactively protect anything you have already
          disclosed.
        </p>
        <p>
          The wallet you use is your identity here. Protect its keys. If
          your key is compromised, someone else can commit under your
          identity, and your case weakens because observers can no longer
          distinguish your commits from the attacker&apos;s.
        </p>
      </Section>

      <Section title="What a commit is not">
        <p>
          A commit is not a patent. It is not a legal filing. It is not a
          finding of originality. It is not a guarantee that you had the
          idea first. It only proves you committed this specific hash at
          this specific time, signed by this specific key.
        </p>
        <p>
          It is one piece of evidence, cryptographically anchored, that no
          party can forge or backdate after the fact. How much that piece
          matters depends on what else you bring.
        </p>
      </Section>

      <Section title="What Sunya does not do">
        <p>
          There are no user accounts, no stored plaintexts, no recovery
          flow. There is no &quot;admin&quot; who can edit the registry or
          reverse a commit. The contract has no owner. The contract is not
          upgradable; if it ever needs a material change, it will be
          redeployed as a new contract and existing commits will remain
          valid under the old one.
        </p>
        <p>
          The only things Sunya operates are the smart contracts and the
          static files of this client. Everything else, including key
          custody, gas, plaintext storage, backups, and the decision of
          when to reveal, is yours.
        </p>
      </Section>
    </section>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-[14px] text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[13px] text-foreground/90">{children}</span>
  )
}
