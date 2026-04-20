"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, push, set, get } from "firebase/database";
import { TeamData } from "@/lib/gameConfig";

export default function JoinSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [cafeName, setCafeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const name = cafeName.trim();
    if (!name) { setError("請給你的咖啡廳一個名字！"); return; }
    setLoading(true);
    setError("");

    // verify session exists
    const sessSnap = await get(ref(db, `sessions/${sessionId}`));
    if (!sessSnap.exists()) {
      setError("找不到這個場次，請確認代碼是否正確。");
      setLoading(false);
      return;
    }

    const teamsRef = ref(db, `sessions/${sessionId}/teams`);
    const newTeamRef = push(teamsRef);
    const teamId = newTeamRef.key!;
    const teamData: TeamData = { name, currentStage: 1 };
    await set(newTeamRef, teamData);

    router.push(`/play/${sessionId}/${teamId}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">☕</div>
        <h1 className="text-3xl font-bold text-amber-900">咖啡廳老闆就是你！</h1>
        <p className="text-amber-600 mt-1">請輸入你的咖啡廳名稱來加入</p>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="輸入你的咖啡廳名稱"
          value={cafeName}
          onChange={(e) => setCafeName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-500 bg-white text-center"
          maxLength={20}
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={loading || !cafeName.trim()}
          className="w-full bg-amber-800 hover:bg-amber-900 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-xl transition"
        >
          {loading ? "加入中…" : "🚀 創立我的咖啡廳！"}
        </button>
      </div>
    </div>
  );
}
