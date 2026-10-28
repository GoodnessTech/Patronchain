import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Bell, Blocks, CheckCircle2, CircleAlert, CircleHelp,
  ClipboardList, CreditCard, ExternalLink, Fingerprint, Globe2, LayoutDashboard,
  Loader2, Menu, MoreHorizontal, Plus, Search, ShieldCheck, Sparkles, Tags, UserRound,
  Users, Wallet, X, Zap, Coins, ArrowUpRight, Ban
} from './components/Icons';

import { useWallet } from './hooks/useWallet';
import { usePatronChain } from './hooks/usePatronChain';
import { getExplorerTxUrl, getExplorerAddressUrl } from './config/environments';
import { verificationService, type ExtendedVerificationResult } from './services/verification';
import type { MembershipTier } from './types/membership';
import { formatEther } from 'viem';

type View = 'home' | 'dashboard' | 'tiers' | 'subscribers' | 'payments' | 'explore' | 'creator' | 'membership' | 'my-memberships';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'tiers', label: 'My memberships', icon: Tags },
  { id: 'subscribers', label: 'Subscribers', icon: Users },
  { id: 'payments', label: 'Payment history', icon: CreditCard },
];

function navigate(view: View) {
  window.location.hash = view === 'home' ? '' : view;
}

function useRoute(): View {
  const read = () => (window.location.hash.replace('#', '') || 'home') as View;
  const [route, setRoute] = useState<View>(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

function shortenAddress(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function Mark({ dark = false }: { dark?: boolean }) {
  return (
    <button onClick={() => navigate('home')} className={`flex items-center gap-3 ${dark ? 'text-[#f4f1eb]' : ''}`} aria-label="PatronChain home">
      <span className="relative flex h-8 w-8 items-center justify-center border-2 border-current bg-[#ffda24] text-sm font-bold shadow-brutal-sm">P</span>
      <span className="text-[17px] font-bold tracking-[-.04em]">PatronChain<span className="text-[#18b8ce]">.</span></span>
    </button>
  );
}

function Pill({ children, color = 'cyan' }: { children: React.ReactNode; color?: 'cyan' | 'pink' | 'yellow' | 'dark' }) {
  const colors = {
    cyan: 'bg-[#19c9df]',
    pink: 'bg-[#f36bb7]',
    yellow: 'bg-[#ffda24]',
    dark: 'bg-[#121416] text-white',
  };
  return <span className={`mono inline-flex items-center gap-1 border-2 border-[#121416] px-2 py-1 text-[10px] uppercase tracking-[.12em] ${colors[color]}`}>{children}</span>;
}

function WalletButton({
  address,
  balanceBot,
  isConnected,
  onConnect,
  onDisconnect,
}: {
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden border-2 border-[#121416] bg-white px-3 py-2 text-xs font-bold sm:block">
          <span className="text-[#0aa6bc]">{balanceBot}</span> BOT
        </div>
        <button
          onClick={onDisconnect}
          title="Click to disconnect"
          className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-3.5 py-2 text-xs font-bold shadow-brutal-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {shortenAddress(address)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-4 py-2.5 text-sm font-semibold shadow-brutal-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
    >
      <Wallet size={16} /> Connect wallet
    </button>
  );
}

function NetworkBanner({
  chainId,
  isCorrectNetwork,
  onSwitch,
}: {
  chainId: number | null;
  isCorrectNetwork: boolean;
  onSwitch: () => void;
}) {
  if (chainId && !isCorrectNetwork) {
    return (
      <div className="border-b-2 border-[#121416] bg-[#f36bb7] px-4 py-2.5 text-xs font-bold text-[#121416]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <span className="flex items-center gap-2">
            <CircleAlert size={16} /> Connected to wrong network (Chain {chainId}). PatronChain lives on BOT Chain Testnet (Chain ID 968).
          </span>
          <button
            onClick={onSwitch}
            className="border-2 border-[#121416] bg-[#ffda24] px-3 py-1 font-bold shadow-brutal-sm hover:bg-white"
          >
            Switch to BOT Testnet
          </button>
        </div>
      </div>
    );
  }
  return null;
}

function Topbar({
  onConnect,
  address,
  balanceBot,
  isConnected,
  onDisconnect,
}: {
  onConnect: () => void;
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onDisconnect: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-[#121416] bg-[#f4f1eb]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
        <Mark />
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <button onClick={() => navigate('explore')} className="transition hover:text-[#0aa6bc]">Discover memberships</button>
          <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="transition hover:text-[#0aa6bc]">How it works</button>
          <button onClick={() => navigate('dashboard')} className="transition hover:text-[#0aa6bc]">For creators</button>
          <button onClick={() => navigate('membership')} className="transition hover:text-[#0aa6bc]">Verify access</button>
        </nav>
        <div className="flex items-center gap-3">
          <span className="mono hidden border border-[#aeb3ae] px-2 py-1 text-[10px] uppercase text-[#687070] lg:block">BOT Testnet · 968</span>
          <WalletButton
            address={address}
            balanceBot={balanceBot}
            isConnected={isConnected}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        </div>
      </div>
    </header>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121416]/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md border-2 border-[#121416] bg-[#f4f1eb] shadow-brutal">
        <div className="flex items-center justify-between border-b-2 border-[#121416] px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="hover:text-[#0aa6bc]"><X /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConnectModal({ onClose, onConnectBrowser }: { onClose: () => void; onConnectBrowser: () => void }) {
  return (
    <Modal title="Connect a wallet" onClose={onClose}>
      <p className="mb-5 text-sm leading-6 text-[#4e5555]">
        Connect your Web3 browser wallet to manage memberships, subscribe to creators, and verify access on BOT Chain.
      </p>
      <div className="space-y-3">
        <button
          onClick={onConnectBrowser}
          className="flex w-full items-center justify-between border-2 border-[#121416] bg-white p-4 text-left font-semibold transition hover:bg-[#19c9df]"
        >
          <span className="flex items-center gap-3"><Wallet size={18} /> Browser wallet (MetaMask / Rabby)</span>
          <ArrowRight size={17} />
        </button>
        <button
          onClick={onConnectBrowser}
          className="flex w-full items-center justify-between border-2 border-[#121416] bg-white p-4 text-left font-semibold transition hover:bg-[#ffda24]"
        >
          <span className="flex items-center gap-3"><Fingerprint size={18} /> Injected Provider</span>
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="mt-5 border-t border-[#c5c5bf] pt-4 text-center text-xs text-[#687070]">
        BOT Chain Testnet · Chain ID 968 · Native BOT
      </div>
    </Modal>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-[#121416] bg-[#f4f1eb] px-5 py-10 lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-10 md:flex-row">
        <div>
          <Mark />
          <p className="mt-4 max-w-xs text-sm text-[#687070]">Memberships that live on-chain.</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="mono text-xs text-[#687070]">BOT Chain Testnet (Bohr) · 968</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-14 gap-y-3 text-sm">
          <button onClick={() => navigate('explore')} className="text-left hover:text-[#0aa6bc]">Discover</button>
          <button onClick={() => navigate('dashboard')} className="text-left hover:text-[#0aa6bc]">For creators</button>
          <button onClick={() => navigate('membership')} className="text-left hover:text-[#0aa6bc]">Verify Access</button>
          <button onClick={() => navigate('my-memberships')} className="text-left hover:text-[#0aa6bc]">My memberships</button>
          <a href="https://www.botchain.ai/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#0aa6bc]">
            Botchain <ExternalLink size={12} />
          </a>
          <a href="https://scan.botchain.ai/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#0aa6bc]">
            Botscan <ExternalLink size={12} />
          </a>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-[1440px] border-t border-[#c5c5bf] pt-5 text-xs text-[#687070] flex flex-col sm:flex-row justify-between gap-3">
        <div>© 2026 PatronChain. Built for open membership infrastructure.</div>
        <div>Authoritative Contract: <a href="https://scan.bohr.life/address/0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f" target="_blank" rel="noreferrer" className="underline hover:text-[#0aa6bc]">0xb1ceb3…a845f</a></div>
      </div>
    </footer>
  );
}

function PageHeader({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-9 flex flex-col justify-between gap-5 border-b-2 border-[#121416] pb-7 sm:flex-row sm:items-end">
      <div>
        <div className="mono mb-3 text-[10px] uppercase tracking-[.14em] text-[#0aa6bc]">{eyebrow}</div>
        <h1 className="text-4xl font-bold tracking-[-.07em] sm:text-5xl">{title}</h1>
        {body && <p className="mt-3 max-w-xl text-sm leading-6 text-[#687070]">{body}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Blocks; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-[#9ca19d] bg-[#f4f1eb] px-6 py-16 text-center">
      <Icon className="mx-auto text-[#0aa6bc]" size={32} strokeWidth={1.5} />
      <h2 className="mt-5 text-xl font-bold tracking-[-.04em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#687070]">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ----------------------------------------------------
// TIER CREATION MODAL / FORM
// ----------------------------------------------------
function TierFormModal({
  onSave,
  onCancel,
  initial,
  isLoading,
}: {
  onSave: (tier: { name: string; description: string; price: string; billingPeriod: 'monthly' | 'yearly'; subscriberLimit?: number }) => void;
  onCancel: () => void;
  initial?: MembershipTier;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.descriptionURI || '');
  const [price, setPrice] = useState(initial?.priceBot || '');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(initial?.billingPeriodType || 'monthly');
  const [limit, setLimit] = useState(initial?.subscriberLimit?.toString() || '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      price,
      billingPeriod,
      subscriberLimit: limit ? Number(limit) : 0,
    });
  };

  return (
    <Modal title={initial ? 'Edit tier' : 'New membership tier'} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Tier name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Studio Patron"
            className="w-full border-2 border-[#121416] bg-white px-3 py-2.5 text-sm outline-none focus:bg-[#fffbcc]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Description</span>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What does this membership unlock?"
            className="w-full resize-none border-2 border-[#121416] bg-white px-3 py-2.5 text-sm outline-none focus:bg-[#fffbcc]"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Price in BOT</span>
            <input
              required
              type="number"
              min="0.0001"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.05"
              className="w-full border-2 border-[#121416] bg-white px-3 py-2.5 text-sm outline-none focus:bg-[#fffbcc]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Billing period</span>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value as 'monthly' | 'yearly')}
              className="w-full border-2 border-[#121416] bg-white px-3 py-2.5 text-sm"
            >
              <option value="monthly">Monthly (30d)</option>
              <option value="yearly">Yearly (365d)</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">
            Subscriber limit <span className="font-normal normal-case text-[#687070]">(0 = unlimited)</span>
          </span>
          <input
            type="number"
            min="0"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="0"
            className="w-full border-2 border-[#121416] bg-white px-3 py-2.5 text-sm outline-none focus:bg-[#fffbcc]"
          />
        </label>
        <div className="flex justify-end gap-3 pt-3 border-t border-[#c5c5bf]">
          <button type="button" onClick={onCancel} className="border-2 border-[#121416] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-4 py-2 text-sm font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Publish on-chain
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------------------------------
// SUBSCRIBE CONFIRMATION MODAL
// ----------------------------------------------------
function SubscribeModal({
  creator,
  tier,
  onConfirm,
  onClose,
  isLoading,
}: {
  creator: string;
  tier: MembershipTier;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal title="Confirm Subscription" onClose={onClose}>
      <div className="space-y-4">
        <div className="border-2 border-[#121416] bg-white p-4">
          <div className="mono text-[10px] uppercase text-[#687070]">Target Tier</div>
          <div className="mt-1 text-lg font-bold">{tier.name}</div>
          <div className="text-xs text-[#687070] mt-1">{tier.descriptionURI}</div>
          <div className="mt-3 flex items-baseline justify-between border-t border-[#eeece5] pt-2">
            <span className="text-xs font-bold">Billing Cycle</span>
            <span className="mono text-xs uppercase">{tier.billingPeriodType}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs font-bold">Price</span>
            <span className="text-base font-bold text-[#0aa6bc]">{tier.priceBot} BOT</span>
          </div>
        </div>

        <div className="bg-[#eeece5] p-3 text-xs leading-5 text-[#4e5555]">
          <div className="flex justify-between">
            <span>Creator address:</span>
            <span className="mono">{shortenAddress(creator)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform fee (included):</span>
            <span className="mono">2.5%</span>
          </div>
          <div className="flex justify-between font-bold text-[#121416] mt-1 border-t border-[#c5c5bf] pt-1">
            <span>Total to pay:</span>
            <span>{tier.priceBot} BOT</span>
          </div>
        </div>

        <div className="text-[11px] text-[#687070] leading-4">
          By confirming, you will broadcast an on-chain transaction to BOT Chain testnet. A time-bound entitlement will be written to the PatronChain contract.
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="border-2 border-[#121416] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#19c9df] px-5 py-2 text-sm font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Approve {tier.priceBot} BOT
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------
// TIP MODAL
// ----------------------------------------------------
function TipModal({
  creator,
  onConfirm,
  onClose,
  isLoading,
}: {
  creator: string;
  onConfirm: (amountBot: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [amount, setAmount] = useState('0.05');

  return (
    <Modal title="Send a Tip" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[#4e5555]">
          Send a one-time native BOT tip directly to the creator on BOT Chain. Tips do not create or renew recurring memberships.
        </p>
        <div className="flex gap-2">
          {['0.01', '0.05', '0.1', '0.5'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className={`border-2 border-[#121416] px-3 py-1.5 text-xs font-bold ${amount === v ? 'bg-[#ffda24]' : 'bg-white'}`}
            >
              {v} BOT
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Custom tip amount (BOT)</span>
          <input
            type="number"
            min="0.001"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border-2 border-[#121416] bg-white px-3 py-2 text-sm font-bold outline-none"
          />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="border-2 border-[#121416] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(amount)}
            disabled={isLoading || !amount || Number(amount) <= 0}
            className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-5 py-2 text-sm font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
            Send {amount} BOT
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------
// UPGRADE MODAL
// ----------------------------------------------------
function UpgradeModal({
  creator,
  tier,
  onConfirm,
  onClose,
  isLoading,
}: {
  creator: string;
  tier: MembershipTier;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal title="Upgrade Membership Tier" onClose={onClose}>
      <div className="space-y-4">
        <div className="border-2 border-[#121416] bg-[#fffbcc] p-3 text-xs leading-5">
          <strong className="block text-[#121416] mb-1">Important Disclosure:</strong>
          The upgrade starts a new billing period immediately from the upgrade transaction timestamp. The previous payment is not refunded, and unused time is not credited in v1.
        </div>
        <div className="border-2 border-[#121416] bg-white p-4">
          <div className="mono text-[10px] uppercase text-[#687070]">Target Tier</div>
          <div className="text-lg font-bold">{tier.name}</div>
          <div className="text-xs text-[#687070]">{tier.descriptionURI}</div>
          <div className="mt-2 text-xl font-bold text-[#0aa6bc]">{tier.priceBot} BOT / {tier.billingPeriodType}</div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="border-2 border-[#121416] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#f36bb7] px-5 py-2 text-sm font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
            Confirm Upgrade ({tier.priceBot} BOT)
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------
// CANCELLATION MODAL
// ----------------------------------------------------
function CancelModal({
  creator,
  onConfirm,
  onClose,
  isLoading,
}: {
  creator: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal title="Cancel Subscription" onClose={onClose}>
      <div className="space-y-4">
        <div className="border-2 border-[#121416] bg-white p-3 text-xs leading-5">
          <strong className="block text-[#121416] mb-1">Cancellation Policy:</strong>
          Cancellation stops future renewal intent. Your existing paid membership remains valid until its expiry date. No funds will be debited and you can renew or resubscribe at any time.
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="border-2 border-[#121416] px-4 py-2 text-sm font-semibold">
            Keep Subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#f36bb7] px-4 py-2 text-sm font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            Confirm Cancel Intent
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------
// PUBLIC VERIFICATION TOOL
// ----------------------------------------------------
function MembershipVerificationWidget() {
  const [creatorInput, setCreatorInput] = useState('0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51');
  const [supporterInput, setSupporterInput] = useState('');
  const [result, setResult] = useState<ExtendedVerificationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [verError, setVerError] = useState<string | null>(null);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorInput || !supporterInput) return;
    setChecking(true);
    setVerError(null);
    setResult(null);
    try {
      const res = await verificationService.verify(creatorInput.trim(), supporterInput.trim(), 968);
      setResult(res);
    } catch (err: any) {
      setVerError(err?.message || 'Verification failed. Check wallet addresses.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="border-2 border-[#121416] bg-white p-6 shadow-brutal-sm">
      <div className="flex items-center justify-between border-b-2 border-[#121416] pb-4">
        <div>
          <Pill color="cyan">Public Verification API</Pill>
          <h2 className="mt-2 text-xl font-bold">Verify Supporter Access On-Chain</h2>
        </div>
        <ShieldCheck size={28} className="text-[#0aa6bc]" />
      </div>
      <form onSubmit={check} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Creator Wallet Address</label>
          <input
            required
            value={creatorInput}
            onChange={(e) => setCreatorInput(e.target.value)}
            placeholder="0x..."
            className="w-full border-2 border-[#121416] bg-[#f4f1eb] px-3 py-2 text-xs font-mono outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Supporter Wallet Address</label>
          <input
            required
            value={supporterInput}
            onChange={(e) => setSupporterInput(e.target.value)}
            placeholder="0x..."
            className="w-full border-2 border-[#121416] bg-[#f4f1eb] px-3 py-2 text-xs font-mono outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={checking}
          className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-5 py-2.5 text-xs font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          Query PatronChain Contract
        </button>
      </form>

      {verError && (
        <div className="mt-4 border-2 border-[#121416] bg-[#f36bb7] p-3 text-xs font-semibold">
          {verError}
        </div>
      )}

      {result && (
        <div className="mt-6 border-2 border-[#121416] bg-[#f4f1eb] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase">Verification Status:</span>
            <span
              className={`border-2 border-[#121416] px-2.5 py-1 text-xs font-bold ${
                result.isActive ? 'bg-[#19c9df]' : result.exists ? 'bg-[#ffda24]' : 'bg-[#eeece5]'
              }`}
            >
              {result.statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#687070]">Membership Record:</span>
              <p className="font-bold">{result.exists ? 'Found on-chain' : 'None'}</p>
            </div>
            <div>
              <span className="text-[#687070]">Current Tier ID:</span>
              <p className="font-bold">{result.tierId || '—'}</p>
            </div>
            <div>
              <span className="text-[#687070]">Started At:</span>
              <p className="font-bold">{result.formattedStartedAt}</p>
            </div>
            <div>
              <span className="text-[#687070]">Paid Until:</span>
              <p className="font-bold">{result.formattedPaidUntil}</p>
            </div>
            <div>
              <span className="text-[#687070]">Cancelled Renewal:</span>
              <p className="font-bold">{result.cancelled ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-[#687070]">Total Paid:</span>
              <p className="font-bold">{formatEther(result.totalPaid)} BOT</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// PRODUCT PREVIEW COMPONENT
// ----------------------------------------------------
function ProductPreview() {
  return (
    <div className="relative border-2 border-[#121416] bg-[#f8f7f2] shadow-brutal">
      <div className="flex items-center justify-between border-b-2 border-[#121416] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f36bb7]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffda24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#19c9df]" />
        </div>
        <span className="mono text-[9px] uppercase tracking-[.16em] text-[#687070]">creator / memberships</span>
        <MoreHorizontal size={16} />
      </div>
      <div className="grid grid-cols-12">
        <aside className="col-span-3 hidden border-r-2 border-[#121416] bg-[#eeece5] p-4 sm:block">
          <div className="mb-8 h-5 w-5 border-2 border-[#121416] bg-[#ffda24]" />
          <div className="space-y-4 text-[10px] font-semibold">
            <div className="flex gap-2"><LayoutDashboard size={13} /> Overview</div>
            <div className="flex gap-2 text-[#0ba5ba]"><Tags size={13} /> My tiers</div>
            <div className="flex gap-2"><Users size={13} /> Subscribers</div>
            <div className="flex gap-2"><CreditCard size={13} /> Payments</div>
          </div>
        </aside>
        <div className="col-span-12 p-5 sm:col-span-9 sm:p-7">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mono mb-2 text-[9px] uppercase tracking-[.16em] text-[#687070]">Your memberships</div>
              <h3 className="text-2xl font-bold tracking-[-.05em]">Build your circle.</h3>
            </div>
            <span className="hidden border-2 border-[#121416] bg-[#19c9df] px-2 py-1 text-[9px] font-bold uppercase sm:block">
              BOT testnet · 968
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border-2 border-[#121416] bg-[#ffda24] p-4">
              <div className="mb-8 flex justify-between">
                <span className="mono text-[9px] uppercase font-bold">Founding member</span>
                <ArrowRight size={16} />
              </div>
              <div className="flex items-end justify-between">
                <strong className="text-xl">0.02 BOT</strong>
                <span className="text-xs">/ month</span>
              </div>
            </div>
            <div className="border-2 border-[#121416] bg-[#19c9df] p-4">
              <div className="mb-8 flex justify-between">
                <span className="mono text-[9px] uppercase font-bold">VIP Studio access</span>
                <ArrowRight size={16} />
              </div>
              <div className="flex items-end justify-between">
                <strong className="text-xl">0.05 BOT</strong>
                <span className="text-xs">/ month</span>
              </div>
            </div>
          </div>
          <div className="mt-3 border-2 border-dashed border-[#7b8180] p-4 text-center text-xs text-[#687070]">
            Verified on BOT Chain Testnet: <span className="mono font-bold">0xb1ceb3…a845f</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// HOME VIEW
// ----------------------------------------------------
function Home({
  onConnect,
  address,
  balanceBot,
  isConnected,
  onDisconnect,
}: {
  onConnect: () => void;
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div>
      <Topbar
        onConnect={onConnect}
        address={address}
        balanceBot={balanceBot}
        isConnected={isConnected}
        onDisconnect={onDisconnect}
      />
      <main>
        <section className="grid-paper border-b-2 border-[#121416] px-5 pb-20 pt-16 lg:px-10 lg:pb-28 lg:pt-24">
          <div className="mx-auto grid max-w-[1440px] items-center gap-16 lg:grid-cols-[.82fr_1.18fr] lg:gap-20">
            <div>
              <Pill color="yellow"><Zap size={11} /> SocialFi + PayFi infrastructure on BOT Chain</Pill>
              <h1 className="mt-7 max-w-xl text-[clamp(3.3rem,7vw,6.9rem)] font-bold leading-[.89] tracking-[-.085em]">
                Turn your community into a{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">membership</span>
                  <span className="absolute bottom-1 left-0 -z-0 h-4 w-full bg-[#19c9df]" />
                </span>{' '}
                economy.
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-[#4e5555]">
                Recurring memberships for creators, communities and digital businesses. Payments, access and history — recorded on-chain.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('explore')}
                  className="inline-flex items-center gap-3 border-2 border-[#121416] bg-[#121416] px-5 py-3 text-sm font-semibold text-white shadow-brutal-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#0b969f]"
                >
                  Explore memberships <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('dashboard')}
                  className="inline-flex items-center gap-2 border-2 border-[#121416] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[#f36bb7]"
                >
                  Start creating
                </button>
              </div>
              <div className="mt-9 flex items-center gap-3 text-xs text-[#687070]">
                <ShieldCheck size={17} /> Transparent by design. No inflated metrics, no hidden numbers.
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="how-it-works" className="border-b-2 border-[#121416] bg-[#121416] px-5 py-20 text-[#f4f1eb] lg:px-10">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-5">
              <div>
                <Pill color="cyan">How it works</Pill>
                <h2 className="mt-5 max-w-xl text-4xl font-bold tracking-[-.06em] sm:text-6xl">A better way to belong.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#a6aeaa]">
                Simple for supporters. Powerful for creators. Verifiable for every app built on top.
              </p>
            </div>
            <div className="grid gap-px border-2 border-[#4a5252] bg-[#4a5252] md:grid-cols-3">
              {[
                ['01', 'Create a tier', 'Define what your community gets and how often they pay in native BOT.'],
                ['02', 'Connect & subscribe', 'Supporters choose a tier and approve recurring BOT payments.'],
                ['03', 'Unlock access', 'Membership status is verifiable on-chain, wherever it matters.'],
              ].map(([num, title, body], i) => (
                <div key={num} className="bg-[#121416] p-7 transition hover:bg-[#1b2224]">
                  <span
                    className={`mono inline-flex h-9 w-9 items-center justify-center border-2 border-[#121416] text-xs text-[#121416] font-bold ${
                      i === 0 ? 'bg-[#ffda24]' : i === 1 ? 'bg-[#19c9df]' : 'bg-[#f36bb7]'
                    }`}
                  >
                    {num}
                  </span>
                  <h3 className="mt-14 text-2xl font-bold tracking-[-.04em]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#a6aeaa]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-[#121416] px-5 py-20 lg:px-10">
          <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-2">
            <div>
              <Pill color="pink">For creators</Pill>
              <h2 className="mt-5 max-w-lg text-4xl font-bold tracking-[-.06em] sm:text-5xl">
                Own the relationship, not just the audience.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-[#4e5555]">
                Set your terms, see your payment history and give your best supporters a reliable way to stay close.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['01', 'Predictable revenue', 'Recurring support without platform lock-in.'],
                ['02', 'Portable access', 'Let external apps verify an active membership.'],
                ['03', 'Clear payments', 'Every payment has a public, traceable record on BOT Chain.'],
                ['04', 'Built to grow', 'Start with one tier. Add your whole ecosystem later.'],
              ].map(([num, t, b]) => (
                <div key={num} className="border-2 border-[#121416] bg-white p-5 shadow-brutal-sm">
                  <span className="mono text-[10px] text-[#0aa6bc] font-bold">{num}</span>
                  <h3 className="mt-9 font-bold">{t}</h3>
                  <p className="mt-2 text-sm leading-5 text-[#687070]">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-[#121416] bg-[#eeece5] px-5 py-20 lg:px-10">
          <div className="mx-auto max-w-[1440px]">
            <MembershipVerificationWidget />
          </div>
        </section>

        <section className="grid-paper-dark px-5 py-20 text-[#f4f1eb] lg:px-10">
          <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <Pill color="yellow">Ready when you are</Pill>
              <h2 className="mt-5 max-w-2xl text-5xl font-bold leading-none tracking-[-.07em] sm:text-7xl">
                Make belonging<br />
                <span className="text-[#19c9df]">a little more permanent.</span>
              </h2>
            </div>
            <button
              onClick={() => navigate('explore')}
              className="inline-flex items-center gap-3 border-2 border-[#f4f1eb] bg-[#f4f1eb] px-5 py-3 text-sm font-semibold text-[#121416] transition hover:bg-[#ffda24]"
            >
              Explore the network <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ----------------------------------------------------
// DASHBOARD SHELL
// ----------------------------------------------------
function DashboardShell({
  view,
  setView,
  children,
  onConnect,
  address,
  balanceBot,
  isConnected,
  onDisconnect,
}: {
  view: View;
  setView: (v: View) => void;
  children: React.ReactNode;
  onConnect: () => void;
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onDisconnect: () => void;
}) {
  const [mobile, setMobile] = useState(false);

  return (
    <div className="min-h-screen bg-[#eeece5]">
      <header className="flex items-center justify-between border-b-2 border-[#121416] bg-[#f4f1eb] px-5 py-4 lg:px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setMobile(!mobile)} className="lg:hidden" aria-label="Open menu">
            <Menu />
          </button>
          <Mark />
        </div>
        <div className="flex items-center gap-3">
          <span className="mono hidden border border-[#aeb3ae] px-2 py-1 text-[10px] uppercase text-[#687070] sm:block">
            BOT Testnet · 968
          </span>
          <WalletButton
            address={address}
            balanceBot={balanceBot}
            isConnected={isConnected}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={`${mobile ? 'block' : 'hidden'} absolute z-20 min-h-[calc(100vh-73px)] w-64 border-r-2 border-[#121416] bg-[#f4f1eb] p-5 lg:relative lg:block`}
        >
          <div className="mono mb-4 text-[10px] uppercase tracking-[.14em] text-[#687070]">Workspace</div>
          <nav className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setView(id);
                  setMobile(false);
                }}
                className={`flex w-full items-center gap-3 border-2 px-3 py-3 text-left text-sm font-semibold transition ${
                  view === id
                    ? 'border-[#121416] bg-[#19c9df] shadow-brutal-sm'
                    : 'border-transparent hover:border-[#121416] hover:bg-white'
                }`}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
            <div className="my-5 border-t border-[#c5c5bf]" />
            <button
              onClick={() => navigate('explore')}
              className="flex w-full items-center gap-3 border-2 border-transparent px-3 py-3 text-left text-sm font-semibold hover:border-[#121416] hover:bg-white"
            >
              <Globe2 size={17} /> Discover
            </button>
            <button
              onClick={() => navigate('membership')}
              className="flex w-full items-center gap-3 border-2 border-transparent px-3 py-3 text-left text-sm font-semibold hover:border-[#121416] hover:bg-white"
            >
              <ShieldCheck size={17} /> Verify Access
            </button>
            <button
              onClick={() => navigate('my-memberships')}
              className="flex w-full items-center gap-3 border-2 border-transparent px-3 py-3 text-left text-sm font-semibold hover:border-[#121416] hover:bg-white"
            >
              <UserRound size={17} /> Supporter Space
            </button>
          </nav>
          <div className="mt-16 border-2 border-[#121416] bg-[#ffda24] p-4">
            <Sparkles size={18} />
            <p className="mt-7 text-sm font-bold">Make your first tier</p>
            <p className="mt-1 text-xs leading-5">Give your community a reason to come closer.</p>
            <button onClick={() => setView('tiers')} className="mt-4 text-xs font-bold underline">
              Create tier <ArrowRight className="inline" size={12} />
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-5 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// OVERVIEW TAB
// ----------------------------------------------------
function Overview({
  setView,
  address,
  isRegistered,
  tiers,
  financials,
  history,
  onRegister,
  onWithdraw,
  onOpenCreateTier,
  actionLoading,
}: {
  setView: (v: View) => void;
  address: string | null;
  isRegistered: boolean;
  tiers: MembershipTier[];
  financials: any;
  history: any[];
  onRegister: () => void;
  onWithdraw: () => void;
  onOpenCreateTier: () => void;
  actionLoading: boolean;
}) {
  const pendingBot = financials ? formatEther(financials.pendingEarnings) : '0.00';
  const grossBot = financials ? formatEther(financials.totalGrossVolume) : '0.00';
  const withdrawnBot = financials ? formatEther(financials.totalWithdrawn) : '0.00';
  const tipsBot = financials ? formatEther(financials.totalTipsReceived) : '0.00';

  const totalSubscribers = tiers.reduce((acc, t) => acc + t.totalSubscribers, 0);

  return (
    <>
      <PageHeader
        eyebrow="Creator workspace / overview"
        title="Good morning."
        body="Your on-chain membership operations, at a glance."
        action={
          <div className="flex gap-2">
            {!isRegistered && address && (
              <button
                onClick={onRegister}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#19c9df] px-4 py-3 text-sm font-bold shadow-brutal-sm hover:shadow-brutal"
              >
                <BadgeCheck size={17} /> Register Creator
              </button>
            )}
            <button
              onClick={onOpenCreateTier}
              className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-4 py-3 text-sm font-bold shadow-brutal-sm hover:shadow-brutal"
            >
              <Plus size={17} /> Create tier
            </button>
          </div>
        }
      />

      {!isRegistered && address && (
        <div className="mb-6 border-2 border-[#121416] bg-[#fffbcc] p-5 shadow-brutal-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base">Creator Registration Required</h3>
              <p className="text-xs text-[#4e5555] mt-1">
                Your wallet is connected, but not yet registered as a creator on BOT Chain. Registering writes your identity to the PatronChain registry.
              </p>
            </div>
            <button
              onClick={onRegister}
              disabled={actionLoading}
              className="border-2 border-[#121416] bg-[#19c9df] px-4 py-2 text-xs font-bold shadow-brutal-sm hover:shadow-brutal"
            >
              Register Now
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="border-2 border-[#121416] bg-[#19c9df] p-5">
          <span className="mono text-[10px] uppercase font-bold">Active memberships</span>
          <div className="mt-8 text-3xl font-bold tracking-[-.06em]">{address ? totalSubscribers : '—'}</div>
          <div className="mt-2 text-xs">{tiers.length} published tiers</div>
        </div>
        <div className="border-2 border-[#121416] bg-[#ffda24] p-5">
          <span className="mono text-[10px] uppercase font-bold">Pending earnings</span>
          <div className="mt-8 text-3xl font-bold tracking-[-.06em]">{address ? `${parseFloat(pendingBot).toFixed(4)}` : '—'} BOT</div>
          <div className="mt-2 text-xs">Ready for withdrawal</div>
        </div>
        <div className="border-2 border-[#121416] bg-[#f36bb7] p-5">
          <span className="mono text-[10px] uppercase font-bold">Gross revenue</span>
          <div className="mt-8 text-3xl font-bold tracking-[-.06em]">{address ? `${parseFloat(grossBot).toFixed(4)}` : '—'} BOT</div>
          <div className="mt-2 text-xs">Total on-chain volume</div>
        </div>
        <div className="border-2 border-[#121416] bg-white p-5">
          <span className="mono text-[10px] uppercase font-bold">Total Tips</span>
          <div className="mt-8 text-3xl font-bold tracking-[-.06em]">{address ? `${parseFloat(tipsBot).toFixed(4)}` : '—'} BOT</div>
          <div className="mt-2 text-xs">Withdrawn: {parseFloat(withdrawnBot).toFixed(4)} BOT</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_.7fr]">
        <div className="border-2 border-[#121416] bg-[#f4f1eb] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Recent on-chain payment activity</h2>
            <button onClick={() => setView('payments')} className="text-xs font-bold underline">
              View all ({history.length})
            </button>
          </div>
          <div className="mt-6">
            {history.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                body="When a supporter subscribes or tips, their verified BOT Chain transaction will appear here."
              />
            ) : (
              <div className="space-y-2">
                {history.slice(0, 5).map((tx) => (
                  <div key={tx.hash} className="flex items-center justify-between border-2 border-[#121416] bg-white p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Pill color={tx.eventType === 'Subscribed' ? 'cyan' : tx.eventType === 'CreatorTipped' ? 'yellow' : 'pink'}>
                        {tx.eventType}
                      </Pill>
                      <span className="mono text-[#687070]">{shortenAddress(tx.supporter || tx.creator)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {tx.grossAmountBot && <strong className="font-bold">{tx.grossAmountBot} BOT</strong>}
                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0aa6bc] hover:underline flex items-center gap-0.5"
                      >
                        Scan <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-2 border-[#121416] bg-[#f4f1eb] p-6">
          <h2 className="font-bold">Creator actions</h2>
          <div className="mt-5 space-y-2">
            <button
              onClick={onOpenCreateTier}
              className="flex w-full items-center justify-between border-2 border-[#121416] bg-white p-3 text-left text-sm font-semibold hover:bg-[#19c9df]"
            >
              Create a tier <ArrowRight size={16} />
            </button>
            <button
              onClick={onWithdraw}
              disabled={actionLoading || !financials || financials.pendingEarnings === 0n}
              className="flex w-full items-center justify-between border-2 border-[#121416] bg-[#ffda24] p-3 text-left text-sm font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
            >
              Withdraw {parseFloat(pendingBot).toFixed(4)} BOT <Coins size={16} />
            </button>
            <button
              onClick={() => navigate('explore')}
              className="flex w-full items-center justify-between border-2 border-[#121416] bg-white p-3 text-left text-sm font-semibold hover:bg-[#ffda24]"
            >
              Preview public page <ArrowRight size={16} />
            </button>
          </div>
          <div className="mt-10 border-t border-[#c5c5bf] pt-4 text-xs leading-5 text-[#687070]">
            All metrics populate authoritatively from contract <span className="mono font-bold">0xb1ceb3…a845f</span> on BOT Chain testnet.
          </div>
        </div>
      </div>
    </>
  );
}

// ----------------------------------------------------
// TIERS VIEW
// ----------------------------------------------------
function Tiers({
  tiers,
  onOpenCreate,
  onToggleActive,
}: {
  tiers: MembershipTier[];
  onOpenCreate: () => void;
  onToggleActive: (tierId: number, current: boolean) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Creator workspace / memberships"
        title="Your tiers."
        body="Shape the offers your community can subscribe to on BOT Chain."
        action={
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-4 py-3 text-sm font-bold shadow-brutal-sm hover:shadow-brutal"
          >
            <Plus size={17} /> Create tier
          </button>
        }
      />

      {tiers.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No tiers published"
          body="Create your first membership tier to start receiving recurring payments on BOT Chain."
          action={
            <button
              onClick={onOpenCreate}
              className="border-2 border-[#121416] bg-[#19c9df] px-4 py-3 text-sm font-bold shadow-brutal-sm hover:shadow-brutal"
            >
              <Plus className="mr-2 inline" size={16} /> Create your first tier
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="border-2 border-[#121416] bg-white p-5 shadow-brutal-sm">
              <div className="flex items-start justify-between">
                <Pill color={tier.active ? 'cyan' : 'yellow'}>
                  {tier.active ? 'Active' : 'Inactive'}
                </Pill>
                <button
                  onClick={() => onToggleActive(tier.id, tier.active)}
                  className="text-xs font-bold underline"
                >
                  {tier.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              <h2 className="mt-8 text-xl font-bold">{tier.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-5 text-[#687070]">{tier.descriptionURI}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-[#687070]">
                <span>Active subscribers:</span>
                <span className="mono font-bold text-[#121416]">
                  {tier.totalSubscribers} {tier.subscriberLimit > 0 ? `/ ${tier.subscriberLimit}` : ''}
                </span>
              </div>
              <div className="mt-4 border-t-2 border-[#121416] pt-4 flex items-baseline justify-between">
                <div>
                  <strong className="text-2xl">{tier.priceBot} BOT</strong>
                  <span className="text-xs text-[#687070]"> / {tier.billingPeriodType}</span>
                </div>
                <span className="mono text-[10px] uppercase text-[#0aa6bc]">Tier #{tier.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------
// SUBSCRIBERS VIEW
// ----------------------------------------------------
function Subscribers({ history }: { history: any[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const subscriberMap = new Map<string, any>();
  for (const h of history) {
    if (h.supporter && !subscriberMap.has(h.supporter)) {
      subscriberMap.set(h.supporter, h);
    }
  }
  const subscribers = Array.from(subscriberMap.values());

  const filtered = subscribers.filter((s) => {
    if (!query) return true;
    return s.supporter.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <>
      <PageHeader
        eyebrow="Creator workspace / people"
        title="Subscribers."
        body="See who supports your work, with auditable on-chain proof."
      />
      <div className="border-2 border-[#121416] bg-[#f4f1eb]">
        <div className="flex flex-col justify-between gap-3 border-b-2 border-[#121416] p-4 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-3 text-[#687070]" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wallet address (0x...)"
              className="w-full border-2 border-[#121416] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:bg-[#fffbcc]"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-2 border-[#121416] bg-white px-3 text-sm"
          >
            <option>All statuses</option>
            <option>Active</option>
            <option>Expired</option>
            <option>Cancelled</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No subscribers found"
              body="Verified BOT Chain membership records will appear here as supporters join your community."
            />
          </div>
        ) : (
          <div className="divide-y-2 divide-[#121416]">
            {filtered.map((s) => (
              <div key={s.supporter} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white hover:bg-[#f9f8f5]">
                <div className="flex items-center gap-3">
                  <span className="mono font-bold text-sm">{shortenAddress(s.supporter)}</span>
                  <Pill color="cyan">Tier #{s.tierId || '1'}</Pill>
                </div>
                <div className="mt-2 sm:mt-0 flex items-center gap-4 text-xs">
                  <span className="text-[#687070]">Last Action: {s.eventType}</span>
                  <a
                    href={s.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#0aa6bc] hover:underline"
                  >
                    Explorer <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ----------------------------------------------------
// PAYMENT HISTORY VIEW
// ----------------------------------------------------
function Payments({ history }: { history: any[] }) {
  const [filter, setFilter] = useState<string>('All');

  const filtered = history.filter((tx) => {
    if (filter === 'All') return true;
    if (filter === 'Subscriptions') return tx.eventType === 'Subscribed';
    if (filter === 'Renewals') return tx.eventType === 'SubscriptionRenewed';
    if (filter === 'Tips') return tx.eventType === 'CreatorTipped';
    if (filter === 'Withdrawals') return tx.eventType === 'CreatorEarningsWithdrawn';
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Creator workspace / money"
        title="Payment history."
        body="An auditable record of subscriptions, renewals, upgrades, tips and withdrawals from BOT Chain testnet."
      />

      <div className="border-2 border-[#121416] bg-[#f4f1eb]">
        <div className="flex flex-wrap gap-2 border-b-2 border-[#121416] p-4 bg-white">
          {['All', 'Subscriptions', 'Renewals', 'Tips', 'Withdrawals'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`border-2 border-[#121416] px-3 py-1 text-xs font-bold transition ${
                filter === f ? 'bg-[#ffda24] shadow-brutal-sm' : 'bg-white hover:bg-[#f4f1eb]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CreditCard}
              title="No payment records found"
              body="Transactions will appear here in real-time as events are emitted by the PatronChain contract."
            />
          </div>
        ) : (
          <div className="divide-y-2 divide-[#121416]">
            {filtered.map((tx) => (
              <div key={tx.hash} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white hover:bg-[#fffbcc] transition">
                <div className="flex items-center gap-3">
                  <Pill color={tx.eventType === 'Subscribed' ? 'cyan' : tx.eventType === 'CreatorTipped' ? 'yellow' : 'pink'}>
                    {tx.eventType}
                  </Pill>
                  <div>
                    <div className="mono font-bold text-xs">{shortenAddress(tx.supporter || tx.creator)}</div>
                    <div className="text-[10px] text-[#687070] mono">Block #{tx.blockNumber?.toString()}</div>
                  </div>
                </div>
                <div className="mt-2 sm:mt-0 flex items-center gap-4 text-xs">
                  {tx.grossAmountBot && (
                    <div className="text-right">
                      <strong className="text-sm font-bold text-[#121416]">{tx.grossAmountBot} BOT</strong>
                      {tx.feeWei ? <div className="text-[10px] text-[#687070]">2.5% fee</div> : null}
                    </div>
                  )}
                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 border-2 border-[#121416] bg-[#ffda24] px-2.5 py-1 text-xs font-bold shadow-brutal-sm hover:shadow-brutal"
                  >
                    Scan <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ----------------------------------------------------
// EXPLORE VIEW
// ----------------------------------------------------
function Explore({
  onConnect,
  address,
  balanceBot,
  isConnected,
  onDisconnect,
  onSelectTier,
  onOpenTip,
}: {
  onConnect: () => void;
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onDisconnect: () => void;
  onSelectTier: (creator: string, tier: MembershipTier) => void;
  onOpenTip: (creator: string) => void;
}) {
  const [query, setQuery] = useState('');

  // Real verified creator on testnet
  const sampleCreator = '0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51';

  const sampleTiers: MembershipTier[] = [
    {
      id: 1,
      creator: sampleCreator,
      name: 'Founding Member',
      descriptionURI: 'Exclusive direct access, monthly studio call, private repo updates, and founding patron badge.',
      priceWei: 20000000000000000n,
      priceBot: '0.02',
      billingPeriodSeconds: 30 * 86400,
      billingPeriodType: 'monthly',
      active: true,
      subscriberLimit: 100,
      totalSubscribers: 1,
    },
    {
      id: 2,
      creator: sampleCreator,
      name: 'VIP Studio Access',
      descriptionURI: 'Full private channel access, VIP beta test rights, live architecture pairing, and priority reviews.',
      priceWei: 50000000000000000n,
      priceBot: '0.05',
      billingPeriodSeconds: 30 * 86400,
      billingPeriodType: 'monthly',
      active: true,
      subscriberLimit: 50,
      totalSubscribers: 1,
    },
  ];

  const filtered = sampleTiers.filter(
    (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.descriptionURI.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Topbar
        onConnect={onConnect}
        address={address}
        balanceBot={balanceBot}
        isConnected={isConnected}
        onDisconnect={onDisconnect}
      />
      <main className="mx-auto max-w-[1440px] px-5 py-14 lg:px-10">
        <PageHeader
          eyebrow="The open network"
          title="Discover memberships."
          body="Find and support verified on-chain communities on BOT Chain testnet."
        />

        <div className="mb-8 flex max-w-xl items-center gap-3 border-2 border-[#121416] bg-white px-4 py-3 shadow-brutal-sm">
          <Search size={18} className="text-[#687070]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creators or memberships"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="mb-10 border-2 border-[#121416] bg-[#121416] p-7 text-[#f4f1eb]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Pill color="cyan">Featured Creator</Pill>
              <h2 className="mt-3 text-2xl font-bold">PatronChain Protocol Labs</h2>
              <p className="mono text-xs text-[#a6aeaa] mt-1">{sampleCreator}</p>
            </div>
            <button
              onClick={() => onOpenTip(sampleCreator)}
              className="inline-flex items-center gap-2 border-2 border-[#f4f1eb] bg-[#ffda24] px-4 py-2.5 text-xs font-bold text-[#121416] shadow-brutal-sm hover:bg-white"
            >
              <Coins size={14} /> Send a Tip
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tier) => (
            <div key={tier.id} className="border-2 border-[#121416] bg-white p-6 shadow-brutal-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <Pill color={tier.id === 1 ? 'yellow' : 'cyan'}>Tier #{tier.id}</Pill>
                  <span className="mono text-[10px] text-[#687070]">{tier.totalSubscribers} active members</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold">{tier.name}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4e5555]">{tier.descriptionURI}</p>
              </div>

              <div className="mt-8 border-t-2 border-[#121416] pt-5">
                <div className="flex items-baseline justify-between mb-4">
                  <strong className="text-3xl font-bold tracking-tight">{tier.priceBot} BOT</strong>
                  <span className="text-xs text-[#687070] uppercase mono">/ {tier.billingPeriodType}</span>
                </div>
                <button
                  onClick={() => onSelectTier(sampleCreator, tier)}
                  className="w-full inline-flex items-center justify-center gap-2 border-2 border-[#121416] bg-[#19c9df] py-3 text-sm font-bold shadow-brutal-sm hover:shadow-brutal hover:bg-[#ffda24] transition"
                >
                  Subscribe now <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ----------------------------------------------------
// PUBLIC CREATOR PROFILE VIEW
// ----------------------------------------------------
function PublicCreator({
  onConnect,
  address,
  balanceBot,
  isConnected,
  onDisconnect,
  onOpenTip,
  onSelectTier,
}: {
  onConnect: () => void;
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onDisconnect: () => void;
  onOpenTip: (creator: string) => void;
  onSelectTier: (creator: string, tier: MembershipTier) => void;
}) {
  const creatorAddr = '0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51';

  return (
    <>
      <Topbar
        onConnect={onConnect}
        address={address}
        balanceBot={balanceBot}
        isConnected={isConnected}
        onDisconnect={onDisconnect}
      />
      <main className="mx-auto max-w-[1100px] px-5 py-14 lg:px-10">
        <div className="border-2 border-[#121416] bg-[#121416] p-7 text-[#f4f1eb] sm:p-12">
          <Pill color="cyan"><BadgeCheck size={12} /> Verified Creator Profile</Pill>
          <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="mb-4 h-16 w-16 border-2 border-[#121416] bg-[#ffda24] flex items-center justify-center text-2xl font-bold text-[#121416]">
                P
              </div>
              <h1 className="text-4xl font-bold tracking-[-.06em]">PatronChain Lead Studio</h1>
              <p className="mono mt-2 text-xs text-[#a6aeaa]">{creatorAddr}</p>
            </div>
            <button
              onClick={() => onOpenTip(creatorAddr)}
              className="border-2 border-[#f4f1eb] bg-[#ffda24] px-5 py-3 text-sm font-bold text-[#121416] shadow-brutal-sm hover:bg-white transition"
            >
              <Coins className="inline mr-2" size={16} /> Send a tip
            </button>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Published Membership Tiers</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="border-2 border-[#121416] bg-white p-6 shadow-brutal-sm">
              <Pill color="yellow">Founding Tier</Pill>
              <h3 className="mt-4 text-xl font-bold">Founding Member</h3>
              <p className="mt-2 text-sm text-[#4e5555]">
                Exclusive direct access, monthly studio call, private repo updates, and founding patron badge.
              </p>
              <div className="mt-6 border-t border-[#eeece5] pt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold">0.02 BOT / mo</span>
                <button
                  onClick={() =>
                    onSelectTier(creatorAddr, {
                      id: 1,
                      creator: creatorAddr,
                      name: 'Founding Member',
                      descriptionURI: 'Exclusive direct access',
                      priceWei: 20000000000000000n,
                      priceBot: '0.02',
                      billingPeriodSeconds: 30 * 86400,
                      billingPeriodType: 'monthly',
                      active: true,
                      subscriberLimit: 100,
                      totalSubscribers: 1,
                    })
                  }
                  className="border-2 border-[#121416] bg-[#19c9df] px-4 py-2 text-xs font-bold shadow-brutal-sm hover:bg-[#ffda24]"
                >
                  Subscribe
                </button>
              </div>
            </div>

            <div className="border-2 border-[#121416] bg-white p-6 shadow-brutal-sm">
              <Pill color="cyan">VIP Tier</Pill>
              <h3 className="mt-4 text-xl font-bold">VIP Studio Access</h3>
              <p className="mt-2 text-sm text-[#4e5555]">
                Full private channel access, VIP beta test rights, live architecture pairing, and priority reviews.
              </p>
              <div className="mt-6 border-t border-[#eeece5] pt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold">0.05 BOT / mo</span>
                <button
                  onClick={() =>
                    onSelectTier(creatorAddr, {
                      id: 2,
                      creator: creatorAddr,
                      name: 'VIP Studio Access',
                      descriptionURI: 'Full private channel access',
                      priceWei: 50000000000000000n,
                      priceBot: '0.05',
                      billingPeriodSeconds: 30 * 86400,
                      billingPeriodType: 'monthly',
                      active: true,
                      subscriberLimit: 50,
                      totalSubscribers: 1,
                    })
                  }
                  className="border-2 border-[#121416] bg-[#19c9df] px-4 py-2 text-xs font-bold shadow-brutal-sm hover:bg-[#ffda24]"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ----------------------------------------------------
// VERIFICATION / DETAILS VIEW
// ----------------------------------------------------
function MembershipDetails({
  onConnect,
  address,
  balanceBot,
  isConnected,
  onDisconnect,
}: {
  onConnect: () => void;
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onDisconnect: () => void;
}) {
  return (
    <>
      <Topbar
        onConnect={onConnect}
        address={address}
        balanceBot={balanceBot}
        isConnected={isConnected}
        onDisconnect={onDisconnect}
      />
      <main className="mx-auto max-w-[1100px] px-5 py-14 lg:px-10">
        <PageHeader
          eyebrow="Verification engine"
          title="Authoritative Membership Check."
          body="Any external service or dApp can independently query the PatronChain contract to gate content or services."
        />
        <MembershipVerificationWidget />
      </main>
      <Footer />
    </>
  );
}

// ----------------------------------------------------
// SUPPORTER SPACE / MY MEMBERSHIPS
// ----------------------------------------------------
function MyMemberships({
  onConnect,
  address,
  balanceBot,
  isConnected,
  onDisconnect,
  onOpenUpgrade,
  onOpenCancel,
  onRenew,
  actionLoading,
}: {
  onConnect: () => void;
  address: string | null;
  balanceBot: string;
  isConnected: boolean;
  onDisconnect: () => void;
  onOpenUpgrade: (creator: string, tier: MembershipTier) => void;
  onOpenCancel: (creator: string) => void;
  onRenew: (creator: string, priceWei: bigint) => void;
  actionLoading: boolean;
}) {
  const [membershipData, setMembershipData] = useState<ExtendedVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const creatorAddr = '0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51';

  useEffect(() => {
    if (address) {
      setLoading(true);
      verificationService.verify(creatorAddr, address, 968)
        .then((res) => setMembershipData(res))
        .catch(console.warn)
        .finally(() => setLoading(false));
    }
  }, [address]);

  return (
    <>
      <Topbar
        onConnect={onConnect}
        address={address}
        balanceBot={balanceBot}
        isConnected={isConnected}
        onDisconnect={onDisconnect}
      />
      <main className="mx-auto max-w-[1100px] px-5 py-14 lg:px-10">
        <PageHeader
          eyebrow="Supporter space"
          title="Your memberships."
          body="Track, renew, upgrade, or cancel your active on-chain memberships."
        />

        {!isConnected ? (
          <EmptyState
            icon={Users}
            title="Wallet not connected"
            body="Connect your wallet to view memberships and manage your subscriptions on BOT Chain."
            action={
              <button
                onClick={onConnect}
                className="border-2 border-[#121416] bg-[#ffda24] px-4 py-3 text-sm font-bold shadow-brutal-sm"
              >
                Connect Wallet
              </button>
            }
          />
        ) : loading ? (
          <div className="p-12 text-center border-2 border-[#121416] bg-white">
            <Loader2 className="mx-auto animate-spin text-[#0aa6bc]" size={32} />
            <p className="mt-3 text-sm text-[#687070]">Querying BOT Chain contract state...</p>
          </div>
        ) : !membershipData || !membershipData.exists ? (
          <EmptyState
            icon={Users}
            title="No active memberships found"
            body="You have not subscribed to any creator tiers yet. Explore the network to find communities to support."
            action={
              <button
                onClick={() => navigate('explore')}
                className="border-2 border-[#121416] bg-[#ffda24] px-4 py-3 text-sm font-bold shadow-brutal-sm"
              >
                Discover memberships <ArrowRight className="ml-2 inline" size={16} />
              </button>
            }
          />
        ) : (
          <div className="border-2 border-[#121416] bg-white p-6 shadow-brutal-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#121416] pb-4 gap-4">
              <div>
                <Pill color={membershipData.isActive ? 'cyan' : 'yellow'}>{membershipData.statusLabel}</Pill>
                <h2 className="mt-2 text-2xl font-bold">
                  {membershipData.tierId === 1 ? 'Founding Member' : 'VIP Studio Access'}
                </h2>
                <p className="mono text-xs text-[#687070] mt-1">Creator: {membershipData.creator}</p>
              </div>
              <div className="text-right">
                <span className="mono text-xs text-[#687070]">Total Paid On-Chain</span>
                <p className="text-xl font-bold">{formatEther(membershipData.totalPaid)} BOT</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="border border-[#c5c5bf] p-3">
                <span className="text-[#687070] block">Access Status</span>
                <strong className={`font-bold ${membershipData.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {membershipData.isActive ? 'Active Entitlement' : 'Expired'}
                </strong>
              </div>
              <div className="border border-[#c5c5bf] p-3">
                <span className="text-[#687070] block">Member Since</span>
                <strong className="font-bold">{membershipData.formattedStartedAt}</strong>
              </div>
              <div className="border border-[#c5c5bf] p-3">
                <span className="text-[#687070] block">Paid-Through Expiry</span>
                <strong className="font-bold">{membershipData.formattedPaidUntil}</strong>
              </div>
              <div className="border border-[#c5c5bf] p-3">
                <span className="text-[#687070] block">Cancellation State</span>
                <strong className="font-bold">{membershipData.cancelled ? 'Renewal Stopped' : 'Auto-Renew Intent Active'}</strong>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-[#eeece5] pt-4">
              <button
                onClick={() => onRenew(membershipData.creator, membershipData.tierId === 1 ? 20000000000000000n : 50000000000000000n)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#ffda24] px-4 py-2 text-xs font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
              >
                Renew (+30 Days)
              </button>
              {membershipData.tierId === 1 && (
                <button
                  onClick={() =>
                    onOpenUpgrade(membershipData.creator, {
                      id: 2,
                      creator: membershipData.creator,
                      name: 'VIP Studio Access',
                      descriptionURI: 'VIP upgrade',
                      priceWei: 50000000000000000n,
                      priceBot: '0.05',
                      billingPeriodSeconds: 30 * 86400,
                      billingPeriodType: 'monthly',
                      active: true,
                      subscriberLimit: 50,
                      totalSubscribers: 1,
                    })
                  }
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 border-2 border-[#121416] bg-[#19c9df] px-4 py-2 text-xs font-bold shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
                >
                  Upgrade to VIP (0.05 BOT)
                </button>
              )}
              {!membershipData.cancelled && (
                <button
                  onClick={() => onOpenCancel(membershipData.creator)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 border-2 border-[#121416] bg-white px-4 py-2 text-xs font-bold hover:bg-[#f36bb7] transition disabled:opacity-50"
                >
                  Cancel Renewal
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

// ----------------------------------------------------
// MAIN APP COMPONENT
// ----------------------------------------------------
function App() {
  const route = useRoute();
  const [connectOpen, setConnectOpen] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [subscribeModalData, setSubscribeModalData] = useState<{ creator: string; tier: MembershipTier } | null>(null);
  const [upgradeModalData, setUpgradeModalData] = useState<{ creator: string; tier: MembershipTier } | null>(null);
  const [cancelModalCreator, setCancelModalCreator] = useState<string | null>(null);
  const [tipModalCreator, setTipModalCreator] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; txHash?: string } | null>(null);

  const {
    address,
    chainId,
    balanceBot,
    isConnected,
    isCorrectNetwork,
    connect,
    disconnect,
    switchToTestnet,
    refreshBalance,
  } = useWallet();

  const {
    isRegistered,
    profile,
    tiers,
    financials,
    history,
    loading,
    actionLoading,
    actionError,
    lastTxHash,
    registerCreator,
    createTier,
    updateTier,
    setTierActive,
    subscribe,
    renewSubscription,
    upgradeSubscription,
    cancelSubscription,
    tipCreator,
    withdrawEarnings,
    refresh,
  } = usePatronChain(address, chainId);

  const [dashView, setDashView] = useState<View>(route === 'home' ? 'dashboard' : route);

  useEffect(() => {
    if (['dashboard', 'tiers', 'subscribers', 'payments'].includes(route)) {
      setDashView(route);
    }
  }, [route]);

  const handleConnectBrowser = async () => {
    try {
      await connect();
      setConnectOpen(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRegister = async () => {
    try {
      const hash = await registerCreator('https://patronchain.xyz/metadata/creator.json');
      setNotification({
        type: 'success',
        message: 'Successfully registered as creator on BOT Chain!',
        txHash: hash,
      });
      refreshBalance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Registration failed' });
    }
  };

  const handleCreateTier = async (data: {
    name: string;
    description: string;
    price: string;
    billingPeriod: 'monthly' | 'yearly';
    subscriberLimit?: number;
  }) => {
    try {
      const hash = await createTier(
        data.name,
        data.description,
        data.price,
        data.billingPeriod,
        data.subscriberLimit || 0
      );
      setTierModalOpen(false);
      setNotification({
        type: 'success',
        message: `Published tier "${data.name}" on-chain!`,
        txHash: hash,
      });
      refreshBalance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Tier creation failed' });
    }
  };

  const handleToggleTier = async (tierId: number, current: boolean) => {
    try {
      const hash = await setTierActive(tierId, !current);
      setNotification({
        type: 'success',
        message: `Tier #${tierId} set to ${!current ? 'Active' : 'Inactive'}`,
        txHash: hash,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Status change failed' });
    }
  };

  const handleSubscribe = async () => {
    if (!subscribeModalData) return;
    try {
      const hash = await subscribe(
        subscribeModalData.creator,
        subscribeModalData.tier.id,
        subscribeModalData.tier.priceWei
      );
      setSubscribeModalData(null);
      setNotification({
        type: 'success',
        message: `Subscribed to ${subscribeModalData.tier.name}!`,
        txHash: hash,
      });
      refreshBalance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Subscription failed' });
    }
  };

  const handleRenew = async (creator: string, priceWei: bigint) => {
    try {
      const hash = await renewSubscription(creator, priceWei);
      setNotification({
        type: 'success',
        message: 'Subscription extended for 30 days!',
        txHash: hash,
      });
      refreshBalance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Renewal failed' });
    }
  };

  const handleUpgrade = async () => {
    if (!upgradeModalData) return;
    try {
      const hash = await upgradeSubscription(
        upgradeModalData.creator,
        upgradeModalData.tier.id,
        upgradeModalData.tier.priceWei
      );
      setUpgradeModalData(null);
      setNotification({
        type: 'success',
        message: `Upgraded to ${upgradeModalData.tier.name}!`,
        txHash: hash,
      });
      refreshBalance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Upgrade failed' });
    }
  };

  const handleCancel = async () => {
    if (!cancelModalCreator) return;
    try {
      const hash = await cancelSubscription(cancelModalCreator);
      setCancelModalCreator(null);
      setNotification({
        type: 'success',
        message: 'Renewal stopped. Access preserved until expiration.',
        txHash: hash,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Cancellation failed' });
    }
  };

  const handleTip = async (amountBot: string) => {
    if (!tipModalCreator) return;
    try {
      const hash = await tipCreator(tipModalCreator, amountBot);
      setTipModalCreator(null);
      setNotification({
        type: 'success',
        message: `Sent ${amountBot} BOT tip to creator!`,
        txHash: hash,
      });
      refreshBalance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Tip failed' });
    }
  };

  const handleWithdraw = async () => {
    try {
      const hash = await withdrawEarnings();
      setNotification({
        type: 'success',
        message: 'Earnings withdrawn successfully to creator wallet!',
        txHash: hash,
      });
      refreshBalance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Withdrawal failed' });
    }
  };

  const dashboardContent = (
    <DashboardShell
      view={dashView}
      setView={(v) => {
        setDashView(v);
        navigate(v);
      }}
      onConnect={() => setConnectOpen(true)}
      address={address}
      balanceBot={balanceBot}
      isConnected={isConnected}
      onDisconnect={disconnect}
    >
      {dashView === 'dashboard' && (
        <Overview
          setView={setDashView}
          address={address}
          isRegistered={isRegistered}
          tiers={tiers}
          financials={financials}
          history={history}
          onRegister={handleRegister}
          onWithdraw={handleWithdraw}
          onOpenCreateTier={() => setTierModalOpen(true)}
          actionLoading={actionLoading}
        />
      )}
      {dashView === 'tiers' && (
        <Tiers
          tiers={tiers}
          onOpenCreate={() => setTierModalOpen(true)}
          onToggleActive={handleToggleTier}
        />
      )}
      {dashView === 'subscribers' && <Subscribers history={history} />}
      {dashView === 'payments' && <Payments history={history} />}
    </DashboardShell>
  );

  return (
    <>
      <NetworkBanner
        chainId={chainId}
        isCorrectNetwork={isCorrectNetwork}
        onSwitch={switchToTestnet}
      />

      {/* Global Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md border-2 border-[#121416] bg-white p-4 shadow-brutal">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="text-emerald-600 mt-0.5" size={18} />
              ) : (
                <CircleAlert className="text-red-600 mt-0.5" size={18} />
              )}
              <div>
                <strong className="block text-sm font-bold">{notification.message}</strong>
                {notification.txHash && (
                  <a
                    href={getExplorerTxUrl(notification.txHash, 968)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs text-[#0aa6bc] font-bold hover:underline"
                  >
                    View on Botscan <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            <button onClick={() => setNotification(null)} className="text-[#687070] hover:text-[#121416]">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Route Views */}
      {route === 'home' && (
        <Home
          onConnect={() => setConnectOpen(true)}
          address={address}
          balanceBot={balanceBot}
          isConnected={isConnected}
          onDisconnect={disconnect}
        />
      )}
      {['dashboard', 'tiers', 'subscribers', 'payments'].includes(route) && dashboardContent}
      {route === 'explore' && (
        <Explore
          onConnect={() => setConnectOpen(true)}
          address={address}
          balanceBot={balanceBot}
          isConnected={isConnected}
          onDisconnect={disconnect}
          onSelectTier={(creator, tier) => {
            if (!isConnected) {
              setConnectOpen(true);
            } else {
              setSubscribeModalData({ creator, tier });
            }
          }}
          onOpenTip={(creator) => {
            if (!isConnected) {
              setConnectOpen(true);
            } else {
              setTipModalCreator(creator);
            }
          }}
        />
      )}
      {route === 'creator' && (
        <PublicCreator
          onConnect={() => setConnectOpen(true)}
          address={address}
          balanceBot={balanceBot}
          isConnected={isConnected}
          onDisconnect={disconnect}
          onOpenTip={(creator) => {
            if (!isConnected) {
              setConnectOpen(true);
            } else {
              setTipModalCreator(creator);
            }
          }}
          onSelectTier={(creator, tier) => {
            if (!isConnected) {
              setConnectOpen(true);
            } else {
              setSubscribeModalData({ creator, tier });
            }
          }}
        />
      )}
      {route === 'membership' && (
        <MembershipDetails
          onConnect={() => setConnectOpen(true)}
          address={address}
          balanceBot={balanceBot}
          isConnected={isConnected}
          onDisconnect={disconnect}
        />
      )}
      {route === 'my-memberships' && (
        <MyMemberships
          onConnect={() => setConnectOpen(true)}
          address={address}
          balanceBot={balanceBot}
          isConnected={isConnected}
          onDisconnect={disconnect}
          onOpenUpgrade={(creator, tier) => setUpgradeModalData({ creator, tier })}
          onOpenCancel={(creator) => setCancelModalCreator(creator)}
          onRenew={handleRenew}
          actionLoading={actionLoading}
        />
      )}

      {/* Modals */}
      {connectOpen && (
        <ConnectModal
          onClose={() => setConnectOpen(false)}
          onConnectBrowser={handleConnectBrowser}
        />
      )}
      {tierModalOpen && (
        <TierFormModal
          onCancel={() => setTierModalOpen(false)}
          onSave={handleCreateTier}
          isLoading={actionLoading}
        />
      )}
      {subscribeModalData && (
        <SubscribeModal
          creator={subscribeModalData.creator}
          tier={subscribeModalData.tier}
          onClose={() => setSubscribeModalData(null)}
          onConfirm={handleSubscribe}
          isLoading={actionLoading}
        />
      )}
      {upgradeModalData && (
        <UpgradeModal
          creator={upgradeModalData.creator}
          tier={upgradeModalData.tier}
          onClose={() => setUpgradeModalData(null)}
          onConfirm={handleUpgrade}
          isLoading={actionLoading}
        />
      )}
      {cancelModalCreator && (
        <CancelModal
          creator={cancelModalCreator}
          onClose={() => setCancelModalCreator(null)}
          onConfirm={handleCancel}
          isLoading={actionLoading}
        />
      )}
      {tipModalCreator && (
        <TipModal
          creator={tipModalCreator}
          onClose={() => setTipModalCreator(null)}
          onConfirm={handleTip}
          isLoading={actionLoading}
        />
      )}
    </>
  );
}

export default App;
