"use client";
import { useParams, useRouter } from "next/navigation";

export default function JoinSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">☕</div>
        <h1 className="text-3xl font-bold text-amber-900">咖啡廳老闆就是你！</h1>
        <p className="text-amber-700 mt-1">選擇你的身份加入遊戲</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-md">
        <button
          onClick={() => router.push(`/join/${sessionId}/boss`)}
          className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-8 px-6 rounded-2xl text-xl shadow-lg transition-all hover:scale-105 flex flex-col items-center gap-2"
        >
          <span className="text-4xl">👨‍💼</span>
          我要當老闆
          <span className="text-sm font-normal opacity-80">創立並命名咖啡廳</span>
        </button>
        <button
          onClick={() => router.push(`/join/${sessionId}/partner`)}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-8 px-6 rounded-2xl text-xl shadow-lg transition-all hover:scale-105 flex flex-col items-center gap-2"
        >
          <span className="text-4xl">🧑‍🎓</span>
          我是合夥人
          <span className="text-sm font-normal opacity-80">加入同學的咖啡廳</span>
        </button>
      </div>
    </div>
  );
}
