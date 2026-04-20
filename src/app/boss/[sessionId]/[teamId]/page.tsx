"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue, off, update, remove } from "firebase/database";
import { TeamData } from "@/lib/gameConfig";

export default function BossLobbyPage() {
  const { sessionId, teamId } = useParams<{ sessionId: string; teamId: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const teamRef = ref(db, `sessions/${sessionId}/teams/${teamId}`);
    const handler = onValue(teamRef, (snap) => {
      if (snap.exists()) setTeam(snap.val());
    });
    return () => off(teamRef, "value", handler);
  }, [sessionId, teamId]);

  async function kickMember(memberId: string) {
    await remove(ref(db, `sessions/${sessionId}/teams/${teamId}/members/${memberId}`));
  }

  async function startGame() {
    setStarting(true);
    await update(ref(db, `sessions/${sessionId}/teams/${teamId}`), { status: "active" });
    router.push(`/play/${sessionId}/${teamId}`);
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center text-amber-700">
        載入中…
      </div>
    );
  }

  const memberList = Object.entries(team.members ?? {});

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 gap-6 pt-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">☕</div>
          <h1 className="text-2xl font-bold text-amber-900">{team.name}</h1>
          <p className="text-amber-700 mt-1">老闆：{team.bossName}</p>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl shadow p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-amber-900 text-lg">🤝 合夥人</h2>
            <span className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
              {memberList.length} 人加入
            </span>
          </div>

          {memberList.length === 0 ? (
            <div className="text-center py-6 text-amber-400">
              <div className="text-3xl mb-2 animate-pulse">⏳</div>
              <p className="text-sm">等待合夥人掃碼加入…</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {memberList.map(([id, m]) => (
                <div key={id} className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧑‍🎓</span>
                    <span className="font-medium text-amber-900">{m.name}</span>
                  </div>
                  <button
                    onClick={() => kickMember(id)}
                    className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
          <p className="font-medium mb-1">📱 讓合夥人掃描「我是合夥人」QR Code</p>
          <p className="text-amber-700">合夥人輸入姓名後，選擇加入「{team.name}」即可出現在上方列表。</p>
        </div>

        {/* Start button */}
        <button
          onClick={startGame}
          disabled={starting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-xl shadow-lg transition-all hover:scale-105"
        >
          {starting ? "準備中…" : "✅ 全員到齊，進入遊戲！"}
        </button>
        <p className="text-xs text-center text-amber-600 mt-2">點擊後將正式開始，等待老師放行</p>
      </div>
    </div>
  );
}
