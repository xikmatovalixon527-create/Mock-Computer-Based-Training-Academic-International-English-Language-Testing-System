'use client';

import { useEffect, useState } from 'react';
import { Award, Trophy, User, Medal, RefreshCw } from 'lucide-react';
import { getBandTextColor } from '@/lib/utils';

interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  group_name: string;
  average_band: number;
  essay_count: number;
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.leaderboard) {
        setEntries(data.leaderboard);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500">
          <Trophy className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-7 h-7 bg-slate-400/10 border border-slate-400/30 rounded-full text-slate-300">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-7 h-7 bg-amber-700/10 border border-amber-700/30 rounded-full text-amber-700">
          <Award className="w-4 h-4" />
        </div>
      );
    }
    return (
      <span className="font-mono text-xs text-[#8a8a8e] w-7 text-center block">
        {rank}
      </span>
    );
  };

  const getRowHighlight = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/20';
    if (rank === 2) return 'bg-[#121214]/80 border border-slate-400/10';
    if (rank === 3) return 'bg-[#121214]/60 border border-amber-700/10';
    return 'bg-[#121214]/30 border border-[#1f1f23]/50';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Student Leaderboard
          </h2>
          <p className="text-xs text-[#8a8a8e]">Ranking of top students based on verified average band scores</p>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={isLoading}
          className="p-1.5 bg-[#121214] hover:bg-black border border-[#1f1f23] rounded-full text-[#f5f5f7] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-[#121214]/20 border border-[#1f1f23] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0071e3] mb-2" />
            <p className="text-xs text-[#8a8a8e]">Updating leaderboard standings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <Trophy className="w-8 h-8 mx-auto text-[#374151] mb-2" />
            <p className="text-xs text-[#8a8a8e]">No marked essays with scores yet. Leaderboard is currently empty.</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-12 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#8a8a8e] border-b border-[#1f1f23]">
              <div className="col-span-2 sm:col-span-1">Rank</div>
              <div className="col-span-6 sm:col-span-6">Student</div>
              <div className="col-span-2 sm:col-span-3 text-right sm:text-left">Group</div>
              <div className="col-span-2 sm:col-span-2 text-right">Avg Band</div>
            </div>

            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
              {entries.map((entry, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={entry.student_id}
                    className={`grid grid-cols-12 items-center p-3 rounded-lg transition-colors ${getRowHighlight(rank)}`}
                  >
                    <div className="col-span-2 sm:col-span-1">{getRankBadge(rank)}</div>
                    <div className="col-span-6 sm:col-span-6 flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-[#8a8a8e]" />
                      </div>
                      <span className="text-xs font-semibold text-white truncate">
                        {entry.full_name}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-3 text-right sm:text-left text-xs font-medium text-[#8a8a8e] truncate">
                      {entry.group_name}
                    </div>
                    <div className="col-span-2 sm:col-span-2 text-right font-mono text-xs">
                      <span className={`font-black ${getBandTextColor(entry.average_band.toFixed(1))}`}>
                        {entry.average_band.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#6e6e73] block">
                        {entry.essay_count} {entry.essay_count === 1 ? 'essay' : 'essays'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
