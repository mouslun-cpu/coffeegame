"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">☕</div>
        <h1 className="text-4xl font-bold text-amber-900 mb-2">咖啡廳老闆就是你！</h1>
        <p className="text-amber-700 text-lg">請選擇你的身份進入遊戲</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
        <button
          onClick={() => router.push("/teacher")}
          className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-6 px-8 rounded-2xl text-xl shadow-lg transition-all hover:scale-105"
        >
          👩‍🏫<br />老師端
        </button>
        <button
          onClick={() => router.push("/join")}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 rounded-2xl text-xl shadow-lg transition-all hover:scale-105"
        >
          🧑‍🎓<br />學生端
        </button>
      </div>
    </div>
  );
}
