import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';

export interface Notification {
  id: string;
  type: 'proposal' | 'vote' | 'reveal';
  text: string;
  time: string;
  timestamp: number;
  proposalId?: bigint;
  read: boolean;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const persistReadIds = (ids: Set<string>) => {
  try {
    const arr = [...ids].slice(-200);
    localStorage.setItem('shadowdao-notifications-read', JSON.stringify(arr));
  } catch {}
};

export function useNotifications() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('shadowdao-notifications-read');
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Use a ref so fetchNotifications can read the current readIds value
  // without being in its dependency array (prevents infinite re-fetch loop)
  const readIdsRef = useRef(readIds);
  readIdsRef.current = readIds;

  const fetchNotifications = useCallback(async () => {
    if (!publicClient) return;

    try {
      setLoading(true);

      const currentBlock = await publicClient.getBlockNumber();
      // Look back ~2000 blocks (~7 hours on Sepolia at ~12s/block)
      const fromBlock = currentBlock > 2000n ? currentBlock - 2000n : 0n;

      const [proposalLogs, voteLogs, revealLogs] = await Promise.all([
        publicClient.getLogs({
          address: SHADOWVOTE_ADDRESS,
          event: {
            type: 'event' as const,
            name: 'ProposalCreated',
            inputs: [
              { name: 'proposalId', type: 'uint256', indexed: true },
              { name: 'creator', type: 'address', indexed: true },
              { name: 'title', type: 'string', indexed: false },
              { name: 'optionCount', type: 'uint8', indexed: false },
              { name: 'deadline', type: 'uint256', indexed: false },
              { name: 'quorum', type: 'uint256', indexed: false },
            ],
          },
          fromBlock,
          toBlock: 'latest',
        }).catch(() => []),
        publicClient.getLogs({
          address: SHADOWVOTE_ADDRESS,
          event: {
            type: 'event' as const,
            name: 'VoteCast',
            inputs: [
              { name: 'proposalId', type: 'uint256', indexed: true },
              { name: 'voter', type: 'address', indexed: true },
            ],
          },
          fromBlock,
          toBlock: 'latest',
        }).catch(() => []),
        publicClient.getLogs({
          address: SHADOWVOTE_ADDRESS,
          event: {
            type: 'event' as const,
            name: 'ResultsRevealed',
            inputs: [
              { name: 'proposalId', type: 'uint256', indexed: true },
            ],
          },
          fromBlock,
          toBlock: 'latest',
        }).catch(() => []),
      ]);

      // Resolve block timestamps (batch unique blocks, cap at 50 RPC calls)
      const blockNumbers = new Set<bigint>();
      [...proposalLogs, ...voteLogs, ...revealLogs].forEach((log) => {
        if (log.blockNumber) blockNumbers.add(log.blockNumber);
      });

      const blockTimestamps = new Map<bigint, number>();
      await Promise.all(
        Array.from(blockNumbers).slice(0, 50).map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps.set(bn, Number(block.timestamp) * 1000);
          } catch {}
        })
      );

      const current = readIdsRef.current;
      const items: Notification[] = [];

      for (const log of proposalLogs) {
        const args = (log as any).args;
        if (!args?.proposalId) continue;
        const ts = blockTimestamps.get(log.blockNumber!) || Date.now();
        // Include logIndex to prevent ID collision for multiple events in same block
        const id = `proposal-${args.proposalId}-${log.blockNumber}-${log.logIndex ?? 0}`;
        items.push({
          id,
          type: 'proposal',
          text: `New proposal: "${args.title}"`,
          time: timeAgo(ts),
          timestamp: ts,
          proposalId: args.proposalId,
          read: current.has(id),
        });
      }

      for (const log of voteLogs) {
        const args = (log as any).args;
        if (!args?.proposalId) continue;
        const ts = blockTimestamps.get(log.blockNumber!) || Date.now();
        const id = `vote-${args.proposalId}-${args.voter}-${log.blockNumber}-${log.logIndex ?? 0}`;
        const isMe = args.voter?.toLowerCase() === address?.toLowerCase();
        items.push({
          id,
          type: 'vote',
          text: isMe
            ? `You voted on proposal #${args.proposalId}`
            : `New vote on proposal #${args.proposalId}`,
          time: timeAgo(ts),
          timestamp: ts,
          proposalId: args.proposalId,
          read: current.has(id),
        });
      }

      for (const log of revealLogs) {
        const args = (log as any).args;
        if (!args?.proposalId) continue;
        const ts = blockTimestamps.get(log.blockNumber!) || Date.now();
        const id = `reveal-${args.proposalId}-${log.blockNumber}-${log.logIndex ?? 0}`;
        items.push({
          id,
          type: 'reveal',
          text: `Results revealed for proposal #${args.proposalId}`,
          time: timeAgo(ts),
          timestamp: ts,
          proposalId: args.proposalId,
          read: current.has(id),
        });
      }

      items.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(items.slice(0, 20));
    } catch (err) {
      console.warn('[ShadowDAO] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  // readIds intentionally omitted — read via readIdsRef.current to avoid
  // re-fetching blockchain every time user marks a notification as read
  }, [publicClient, address]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set<string>(prev);
      setNotifications((ns) => {
        ns.forEach((n) => next.add(n.id));
        return ns.map((n) => ({ ...n, read: true }));
      });
      persistReadIds(next);
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set<string>(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, markAllRead, markRead, refetch: fetchNotifications };
}
