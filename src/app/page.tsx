"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace("/teacher"); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-amber-700">
      載入中…
    </div>
  );
}
