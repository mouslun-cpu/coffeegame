"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, push, set, get } from "firebase/database";
import { TeamData } from "@/lib/gameConfig";

export default function BossRegisterPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [bossName, setBossName] = useState("");
  const [cafeName, setCafeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const boss = bossName.trim();
    const cafe = cafeName.trim();
    if (!boss) { setError("請輸入你的姓名！"); return; }
    if (!cafe) { setError("請給咖啡廳一個名字！"); return; }
    setLoading(true);
    setError("");

    const sessSnap = await get(ref(db, `sessions/${sessionId}`));
    if (!sessSnap.exists()) {
      setError("找不到這個場次，請確認連結是否正確。");
      setLoading(false);
      return;
    }

    const teamsRef = ref(db, `sessions/${sessionId}/teams`);
    const newTeamRef = push(teamsRef);
    const teamData: TeamData = {
      name: cafe,
      bossName: boss,
      members: {},
      status: "lobby",
      currentStage: 1,
    };
    await set(newTeamRef, teamData);
    router.push(`/boss/${sessionId}/${newTeamRef.key}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">👨‍💼</div>
        <h1 className="text-3xl font-bold text-amber-900">我要當老闆！</h1>
        <p className="text-amber-600 mt-1">填寫個人資訊，創立你的咖啡廳</p>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium text-amber-800 block mb-1">👤 你的中文姓名</label>
          <input
            type="text"
            placeholder="例：張小明"
            value={bossName}
            onChange={(e) => setBossName(e.target.value)}
            className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-500 bg-white"
            maxLength={10}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-amber-800 block mb-1">☕ 咖啡廳名稱</label>
          <input
            type="text"
            placeholder="例：晨光咖啡"
            value={cafeName}
            onChange={(e) => setCafeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-500 bg-white"
            maxLength={20}
          />
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={loading || !bossName.trim() || !cafeName.trim()}
          className="w-full bg-amber-800 hover:bg-amber-900 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-xl transition mt-1"
        >
          {loading ? "建立中…" : "🚀 創立咖啡廳！"}
        </button>
      </div>
    </div>
  );
}
