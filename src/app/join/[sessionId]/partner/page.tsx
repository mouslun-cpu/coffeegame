"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue, off, set, remove, get } from "firebase/database";
import { TeamData } from "@/lib/gameConfig";

type Phase = "name" | "pick" | "wait";

const STORAGE_KEY = (sid: string) => `cfgame_partner_${sid}`;

function loadState(sessionId: string): { memberId: string; name: string; teamId: string | null } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(sessionId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(sessionId: string, data: { memberId: string; name: string; teamId: string | null }) {
  localStorage.setItem(STORAGE_KEY(sessionId), JSON.stringify(data));
}

export default function PartnerJoinPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [phase, setPhase] = useState<Phase>("name");
  const [inputName, setInputName] = useState("");
  const [myName, setMyName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [joinedTeamId, setJoinedTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Record<string, TeamData & { id: string }>>({});
  const [error, setError] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const memberIdRef = useRef(memberId);
  const joinedRef = useRef(joinedTeamId);

  // Restore persisted state
  useEffect(() => {
    const saved = loadState(sessionId);
    if (saved) {
      setMemberId(saved.memberId);
      memberIdRef.current = saved.memberId;
      setMyName(saved.name);
      setJoinedTeamId(saved.teamId);
      joinedRef.current = saved.teamId;
      setPhase(saved.teamId ? "wait" : "pick");
    }
  }, [sessionId]);

  // Listen to teams
  useEffect(() => {
    const teamsRef = ref(db, `sessions/${sessionId}/teams`);
    const handler = onValue(teamsRef, (snap) => {
      const data: Record<string, TeamData & { id: string }> = {};
      snap.forEach((child) => {
        const val = child.val() as TeamData;
        if (val.status === "lobby") {
          data[child.key!] = { ...val, id: child.key! };
        }
      });
      setTeams(data);
    });
    return () => off(teamsRef, "value", handler);
  }, [sessionId]);

  // Watch joined team status
  useEffect(() => {
    if (!joinedTeamId) return;
    const statusRef = ref(db, `sessions/${sessionId}/teams/${joinedTeamId}/status`);
    const handler = onValue(statusRef, (snap) => {
      if (snap.val() === "active") setGameStarted(true);
    });
    return () => off(statusRef, "value", handler);
  }, [sessionId, joinedTeamId]);

  function submitName() {
    const name = inputName.trim();
    if (!name) { setError("請輸入中文姓名！"); return; }
    const id = crypto.randomUUID();
    setMyName(name);
    setMemberId(id);
    memberIdRef.current = id;
    saveState(sessionId, { memberId: id, name, teamId: null });
    setPhase("pick");
    setError("");
  }

  async function joinTeam(teamId: string) {
    await set(ref(db, `sessions/${sessionId}/teams/${teamId}/members/${memberIdRef.current}`), {
      name: myName,
      joinedAt: Date.now(),
    });
    setJoinedTeamId(teamId);
    joinedRef.current = teamId;
    saveState(sessionId, { memberId: memberIdRef.current, name: myName, teamId });
    setPhase("wait");
  }

  async function leaveTeam() {
    if (!joinedRef.current || !memberIdRef.current) return;
    await remove(ref(db, `sessions/${sessionId}/teams/${joinedRef.current}/members/${memberIdRef.current}`));
    setJoinedTeamId(null);
    joinedRef.current = null;
    saveState(sessionId, { memberId: memberIdRef.current, name: myName, teamId: null });
    setPhase("pick");
    setGameStarted(false);
  }

  // Phase: Enter name
  if (phase === "name") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🧑‍🎓</div>
          <h1 className="text-3xl font-bold text-amber-900">我是合夥人！</h1>
          <p className="text-amber-600 mt-1">輸入姓名後選擇加入哪家咖啡廳</p>
        </div>
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-amber-800 block mb-1">👤 你的中文姓名</label>
            <input
              type="text"
              placeholder="例：李小花"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitName()}
              className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-500 bg-white"
              maxLength={10}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={submitName}
            disabled={!inputName.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-xl transition"
          >
            下一步 →
          </button>
        </div>
      </div>
    );
  }

  // Phase: Pick a team
  if (phase === "pick") {
    const teamList = Object.values(teams);
    return (
      <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-12 gap-5">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">☕</div>
            <h1 className="text-2xl font-bold text-amber-900">選擇你的咖啡廳</h1>
            <p className="text-amber-600 text-sm mt-1">你好，{myName}！選一間加入吧</p>
          </div>

          {teamList.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <div className="text-4xl mb-3 animate-pulse">⏳</div>
              <p className="text-amber-700">還沒有老闆創立咖啡廳…</p>
              <p className="text-amber-500 text-sm mt-1">等待老闆掃碼後自動出現</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {teamList.map((team) => {
                const memberCount = Object.keys(team.members ?? {}).length;
                const alreadyIn = team.members && memberIdRef.current in team.members;
                return (
                  <div key={team.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-amber-900 text-lg">{team.name}</div>
                      <div className="text-sm text-amber-700">老闆：{team.bossName}</div>
                      <div className="text-xs text-amber-500 mt-0.5">已有 {memberCount} 位合夥人</div>
                      {alreadyIn && (
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✓ 你已在此隊</span>
                      )}
                    </div>
                    <button
                      onClick={() => joinTeam(team.id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition whitespace-nowrap"
                    >
                      加入
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase: Wait
  const joinedTeam = joinedTeamId ? teams[joinedTeamId] : null;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm text-center">
        {gameStarted ? (
          <>
            <div className="text-6xl mb-4">🔥</div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">遊戲開始了！</h2>
            <p className="text-green-700">你的老闆正在進行遊戲，結果將由老師公佈。</p>
            {joinedTeam && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mt-4">
                <div className="font-bold text-green-900 text-lg">{joinedTeam.name}</div>
                <div className="text-green-700 text-sm">老闆：{joinedTeam.bossName}</div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-6xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-2xl font-bold text-amber-900 mb-2">等待老闆開始遊戲</h2>
            <p className="text-amber-700 text-sm">老闆確認人員後按下「進入遊戲」即自動開始</p>
            {joinedTeam && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 mb-2">
                <div className="font-bold text-amber-900 text-xl">{joinedTeam.name}</div>
                <div className="text-amber-700 text-sm">老闆：{joinedTeam.bossName}</div>
                <div className="text-amber-600 text-xs mt-1">合夥人：{myName}</div>
              </div>
            )}
            <button
              onClick={leaveTeam}
              className="mt-3 text-sm text-red-500 hover:text-red-700 underline"
            >
              退出並重新選擇
            </button>
          </>
        )}
      </div>
    </div>
  );
}
