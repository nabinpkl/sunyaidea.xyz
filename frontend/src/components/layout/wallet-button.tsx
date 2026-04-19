'use client'

import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/react'
import { Wallet, Copy, LogOut, Check } from 'lucide-react'
import { useState } from 'react'
import { sepolia, base } from '@reown/appkit/networks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NETWORKS = [sepolia, base]

export function WalletButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId, switchNetwork } = useAppKitNetwork()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const activeNetwork = NETWORKS.find(n => n.id === chainId)

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-1 flex items-center h-10 rounded-sm text-[14px] text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors font-mono tracking-tight outline-none">
            {activeNetwork && (
              <span className="hidden sm:flex items-center gap-2 pl-3 pr-2.5 h-full text-muted-foreground">
                <span className="size-2 rounded-full bg-green-500 shrink-0" />
                <span className="lowercase">{activeNetwork.name}</span>
              </span>
            )}
            <span className="hidden sm:block h-4 w-px bg-foreground/10" />
            <span className="flex items-center gap-2 px-3 h-full">
              <Wallet className="size-4.5 shrink-0" />
              <span className="hidden sm:block">{address.slice(0, 6)}…{address.slice(-4)}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">

          <DropdownMenuItem onClick={copyAddress} className="font-mono text-[13px] gap-2 cursor-pointer">
            {copied
              ? <Check className="size-3.5 shrink-0" />
              : <Copy className="size-3.5 shrink-0" />
            }
            {copied ? 'copied' : `${address.slice(0, 8)}…${address.slice(-6)}`}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {NETWORKS.map(network => (
            <DropdownMenuItem
              key={network.id}
              onClick={() => switchNetwork(network)}
              className="text-[13px] gap-2 cursor-pointer"
            >
              <span className={`size-2 rounded-full shrink-0 ${network.id === chainId ? 'bg-green-500' : 'bg-foreground/20'}`} />
              {network.name}
              {network.id === chainId && (
                <span className="ml-auto text-[11px] text-muted-foreground">active</span>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => disconnect()}
            className="text-[13px] gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="size-3.5 shrink-0" />
            Disconnect
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <button
      onClick={() => open()}
      className="ml-1 flex items-center gap-2 px-4 h-10 rounded-sm text-[14px] text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors font-mono tracking-tight"
    >
      <Wallet className="size-4.5 shrink-0" />
      <span className="hidden sm:block">Connect Wallet</span>
    </button>
  )
}
