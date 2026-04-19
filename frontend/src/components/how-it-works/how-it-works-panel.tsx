import { ArrowUpRight } from "lucide-react"
import { sepolia, base } from "@reown/appkit/networks"
import { commitRegistryAddress } from "@/lib/contracts"
import {
  chainShortName,
  explorerAddressUrl,
  type SupportedChainId,
} from "@/lib/chains"

/// Deployed contract instances. The source is the same across chains; each
/// row points to that chain's block explorer and to Sourcify, which hosts
/// the verified source and metadata so anyone can reproduce the bytecode.
const deployments: { chainId: SupportedChainId }[] = [
  { chainId: base.id },
  { chainId: sepolia.id },
]

function sourcifyUrl(chainId: number, address: string) {
  return `https://repo.sourcify.dev/${chainId}/${address}`
}

/// How it works: plain-language explainer. Grounds the user in what Sunya
/// actually is (a commit registry), what it is not (a notes app, a proof of
/// authorship by itself), and what they are responsible for (keeping the
/// plaintext, committing before sharing). Written in prose, not bullets,
/// because this is a document, not a checklist.
export function HowItWorksPanel() {
  return (
    <section className="flex flex-col gap-12 py-12 max-w-3xl mx-auto">
      <header className="flex flex-col gap-3">
        <h1 className="text-[30px] font-medium tracking-tight">
          How it works
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed">
          Sunya is a idea commit registry. You write an idea on your device, and a
          cryptographic fingerprint of that text is signed by your key and
          written to a public blockchain. Only the fingerprint is ever sent
          anywhere. The text itself stays with you.
        </p>
      </header>

      <Section title="The contract">
        <p>
          One contract, deployed to each supported chain. Same source, same
          bytecode. Every commit you see in this app was emitted by one of
          these addresses, and the source is published on Sourcify so anyone
          can reproduce the bytecode and read what the contract actually does.
        </p>
        <div className="flex flex-col border border-border rounded-sm overflow-hidden">
          {deployments.map(({ chainId }, i) => {
            const address = commitRegistryAddress[chainId]
            return (
              <div
                key={chainId}
                className={
                  "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              >
                <div className="flex items-center gap-2 shrink-0 sm:w-24">
                  <span className="size-1.5 rounded-full bg-foreground/40" />
                  <span className="text-[13px] text-foreground/90 lowercase tracking-wide">
                    {chainShortName(chainId)}
                  </span>
                </div>
                <span className="font-mono text-[12px] text-foreground/80 truncate min-w-0 flex-1">
                  {address}
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  <a
                    href={explorerAddressUrl(chainId, address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-foreground/70 hover:text-foreground transition-colors"
                  >
                    Explorer
                    <ArrowUpRight className="size-3" />
                  </a>
                  <a
                    href={sourcifyUrl(chainId, address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-foreground hover:opacity-70 transition-opacity underline underline-offset-4 decoration-foreground/30"
                  >
                    Verify source
                    <ArrowUpRight className="size-3" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

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

      <Section title="You don't have to trust us">
        <p>
          The claim that your plaintext never leaves your device is something
          you can check yourself in under a minute, without reading any
          source code. Open your browser&apos;s developer tools, switch to the
          Network tab, and start typing into the commit box. Every character,
          every file drop, every keystroke. Watch the list. Nothing is sent
          anywhere. The hash is computed in JavaScript that already ran when
          the page loaded, so there is no network request to make.
        </p>
        <p>
          When you do click Commit, the only network activity you will see is
          your wallet talking to the chain&apos;s RPC endpoint to submit the
          signed transaction. That traffic carries the hash and the signature.
          It does not carry your plaintext, because the plaintext was never
          read by anything except the hash function.
        </p>
        <p>
          If you want to be stricter, use DevTools to block all requests to
          this domain <em>after</em> the page has loaded (Network tab → right
          click a request → Block request domain). The app keeps working:
          hashing still runs locally, the wallet still talks to the chain
          directly, and you have now cut Sunya out of the loop entirely for
          the rest of the session. There is nothing we could send or receive
          even if we wanted to.
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
    <section className="flex flex-col gap-4">
      <h2 className="text-[18px] font-medium tracking-tight">{title}</h2>
      <div className="flex flex-col gap-4 text-[16px] text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[14px] text-foreground/90">{children}</span>
  )
}
