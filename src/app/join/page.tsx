"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [sessionId, setSessionId] = useState("");
  const router = useRouter();

  function handleJoin() {
    const id = sessionId.trim();
    if (id) router.push(`/join/${id}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <div className="text-5xl mb-3">🧑‍🎓</div>
        <h1 className="text-3xl font-bold text-amber-900">加入遊戲</h1>
        <p className="text-amber-600 mt-1">請輸入老師提供的場次代碼</p>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="場次代碼"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-500 bg-white"
        />
        <button
          onClick={handleJoin}
          disabled={!sessionId.trim()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-lg transition"
        >
          進入遊戲 →
        </button>
      </div>
    </div>
  );
}
