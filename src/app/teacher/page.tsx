"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, push, set, onValue, off } from "firebase/database";
import { Session, TeamData, GAME_CONFIG } from "@/lib/gameConfig";
import { QRCodeSVG } from "qrcode.react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const STAGE_LABELS: Record<number, string> = {
  1: "第一關：打造咖啡廳",
  2: "第二關：成本估算",
  3: "第三關：定價策略",
  4: "生存戰進行中",
  5: "已完賽",
};

const STAGE_CONTROL_LABELS: Record<number, string> = {
  1: "第一關", 2: "第二關", 3: "第三關", 4: "生存戰", 5: "最終結算",
};

const CHART_COLORS = [
  "#d97706", "#dc2626", "#16a34a", "#2563eb", "#7c3aed",
  "#db2777", "#0891b2", "#65a30d", "#ea580c", "#6366f1",
  "#92400e", "#1e40af", "#166534", "#9f1239", "#4c1d95",
];

function stageColor(stage: number) {
  if (stage <= 1) return "bg-gray-100 text-gray-700";
  if (stage === 2) return "bg-blue-100 text-blue-800";
  if (stage === 3) return "bg-yellow-100 text-yellow-800";
  if (stage === 4) return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
}

function profitColor(n: number) {
  if (n > 0) return "text-green-700 font-bold";
  if (n < 0) return "text-red-600 font-bold";
  return "text-gray-600";
}

function TeamCard({ team, unlockedStage }: { team: TeamData & { id: string }; unlockedStage: number }) {
  const lastHistory = team.history?.[team.history.length - 1];
  const styleLabel = team.style ? GAME_CONFIG.styles[team.style].label : "—";
  const hasLoan = (team.debt ?? 0) > 0;
  const isWaiting = team.currentStage > unlockedStage;

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3 border border-amber-100">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-lg text-amber-900 truncate">{team.name}</h3>
          {hasLoan && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium whitespace-nowrap">🦈 地下錢莊</span>
          )}
          {isWaiting && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium whitespace-nowrap">⏳ 等待放行</span>
          )}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${stageColor(team.currentStage)}`}>
          {STAGE_LABELS[team.currentStage] ?? `關卡 ${team.currentStage}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-amber-700 text-xs">店面風格</div>
          <div className="font-medium text-amber-900 text-xs mt-0.5">{styleLabel}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-amber-700 text-xs">咖啡豆</div>
          <div className="font-medium text-amber-900 text-xs mt-0.5">{team.bean ?? "—"}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-amber-700 text-xs">直接成本</div>
          <div className="font-medium text-amber-900">{team.direct_cost != null ? `$${team.direct_cost}` : "—"}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-amber-700 text-xs">固定成本</div>
          <div className="font-medium text-amber-900">{team.total_indirect_cost != null ? `$${team.total_indirect_cost.toLocaleString()}` : "—"}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-amber-700 text-xs">最終售價</div>
          <div className="font-medium text-amber-900">{team.final_price != null ? `$${team.final_price}` : "—"}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-amber-700 text-xs">AI預測銷量</div>
          <div className="font-medium text-amber-900">{team.ai_predicted_sales != null ? `${team.ai_predicted_sales.toLocaleString()} 杯` : "—"}</div>
        </div>
      </div>

      {team.capital != null && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-amber-700">目前資金</div>
            <div className={`text-sm font-bold ${team.capital < 30000 ? "text-red-600" : "text-green-700"}`}>
              ${team.capital.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-amber-700">負債</div>
            <div className={`text-sm font-bold ${(team.debt ?? 0) > 0 ? "text-red-600" : "text-gray-500"}`}>
              ${(team.debt ?? 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-amber-700">生存月份</div>
            <div className="text-sm font-bold text-amber-800">M{(team.s4_month ?? 1) - 1}/3</div>
          </div>
        </div>
      )}

      {lastHistory && (
        <div className="text-xs text-amber-800 border-t border-amber-100 pt-2">
          <span className="font-medium">{lastHistory.Month}</span>：{lastHistory.Event}
          {" → 損益 "}
          <span className={profitColor(lastHistory.Profit)}>${lastHistory.Profit.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

export default function TeacherPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Record<string, TeamData>>({});
  const [unlockedStage, setUnlockedStage] = useState<number>(1);
  const [joinUrl, setJoinUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function createSession() {
    setCreating(true);
    const sessRef = ref(db, "sessions");
    const newRef = push(sessRef);
    const session: Session = { createdAt: Date.now(), status: "active", teams: {}, unlockedStage: 1 };
    await set(newRef, session);
    const id = newRef.key!;
    setSessionId(id);
    setCreating(false);
  }

  async function advanceStage() {
    if (!sessionId) return;
    const next = Math.min(unlockedStage + 1, 5);
    await set(ref(db, `sessions/${sessionId}/unlockedStage`), next);
  }

  useEffect(() => {
    if (!sessionId) return;
    const url = `${window.location.origin}/join/${sessionId}`;
    setJoinUrl(url);

    const teamsRef = ref(db, `sessions/${sessionId}/teams`);
    const teamsHandler = onValue(teamsRef, (snap) => {
      setTeams(snap.val() ?? {});
    });

    const unlockedRef = ref(db, `sessions/${sessionId}/unlockedStage`);
    const unlockedHandler = onValue(unlockedRef, (snap) => {
      setUnlockedStage(snap.val() ?? 1);
    });

    return () => {
      off(teamsRef, "value", teamsHandler);
      off(unlockedRef, "value", unlockedHandler);
    };
  }, [sessionId]);

  const teamList = Object.entries(teams)
    .map(([id, t]) => ({ ...t, id }))
    .sort((a, b) => (b.capital ?? 0) - (a.capital ?? 0));

  const stats = {
    total: teamList.length,
    playing: teamList.filter((t) => t.currentStage === 4).length,
    finished: teamList.filter((t) => t.currentStage >= 5).length,
    waiting: teamList.filter((t) => t.currentStage > unlockedStage).length,
  };

  // Capital curves chart
  const teamsWithHistory = teamList.filter((t) => t.history && t.history.length > 0);
  const allMonths = ["M0", "M1", "M2", "M3"];
  const capitalChartData = allMonths
    .map((month) => {
      const point: Record<string, string | number> = { month };
      teamsWithHistory.forEach((team) => {
        const entry = team.history!.find((h) => h.Month === month);
        if (entry != null) point[team.name] = entry.Capital;
      });
      return point;
    })
    .filter((p) => Object.keys(p).length > 1);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="text-5xl mb-3">👩‍🏫</div>
          <h1 className="text-3xl font-bold text-amber-900 mb-1">老師端控制台</h1>
          <p className="text-amber-700">建立新的遊戲場次，取得 QR Code 讓學生加入</p>
        </div>
        <button
          onClick={createSession}
          disabled={creating}
          className="bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold py-4 px-10 rounded-2xl text-xl shadow-lg transition-all hover:scale-105"
        >
          {creating ? "建立中…" : "🚀 建立新場次"}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">☕ 老師端儀錶板</h1>
            <p className="text-amber-700 text-sm">場次 ID：<code className="bg-amber-100 px-2 py-0.5 rounded text-xs">{sessionId}</code></p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="text-center bg-white rounded-xl px-4 py-2 shadow-sm">
              <div className="text-2xl font-bold text-amber-800">{stats.total}</div>
              <div className="text-xs text-amber-700">組加入</div>
            </div>
            <div className="text-center bg-white rounded-xl px-4 py-2 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{stats.playing}</div>
              <div className="text-xs text-amber-700">生存戰中</div>
            </div>
            <div className="text-center bg-white rounded-xl px-4 py-2 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.finished}</div>
              <div className="text-xs text-amber-700">已完賽</div>
            </div>
            {stats.waiting > 0 && (
              <div className="text-center bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 shadow-sm">
                <div className="text-2xl font-bold text-yellow-700">{stats.waiting}</div>
                <div className="text-xs text-yellow-700">等待放行</div>
              </div>
            )}
          </div>
        </div>

        {/* Stage Control Panel */}
        <div className="mb-6 bg-white rounded-2xl shadow p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold text-amber-900 text-lg mb-1">🎮 關卡進度控制</h2>
              <p className="text-sm text-amber-700">學生完成當前關卡後，需等待老師點選「開放」才能進入下一關</p>
            </div>
            {unlockedStage < 5 ? (
              <button
                onClick={advanceStage}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl transition whitespace-nowrap shadow"
              >
                開放 {STAGE_CONTROL_LABELS[unlockedStage + 1]} →
              </button>
            ) : (
              <span className="bg-green-100 text-green-800 px-4 py-2 rounded-xl font-medium">✅ 全部關卡已開放</span>
            )}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition ${
                  s <= unlockedStage ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {s <= unlockedStage ? "✓" : "🔒"} {STAGE_CONTROL_LABELS[s]}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* QR Code Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center gap-4 sticky top-4">
              <h2 className="font-bold text-amber-900 text-lg">📱 學生掃碼加入</h2>
              <div className="bg-white p-3 rounded-xl border-2 border-amber-200">
                <QRCodeSVG value={joinUrl} size={180} bgColor="#ffffff" fgColor="#78350f" />
              </div>
              <p className="text-xs text-center text-amber-700 break-all">{joinUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(joinUrl)}
                className="w-full text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium py-2 rounded-xl transition"
              >
                複製連結
              </button>
              <button
                onClick={createSession}
                className="w-full text-sm bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 rounded-xl transition"
              >
                🔄 新場次
              </button>
            </div>
          </div>

          {/* Teams Grid */}
          <div className="lg:col-span-3">
            {teamList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-amber-400">
                <div className="text-5xl mb-3">⏳</div>
                <p className="text-lg font-medium">等待學生加入中…</p>
                <p className="text-sm">學生掃描 QR Code 即可加入遊戲</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {teamList.map((team) => (
                  <TeamCard key={team.id} team={team} unlockedStage={unlockedStage} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Capital Curves Chart */}
        {teamsWithHistory.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-amber-900 text-xl mb-1">📈 各組資金變化曲線</h2>
            <p className="text-sm text-amber-700 mb-4">追蹤每組在生存戰各月份的資金走勢</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={capitalChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#92400e" }} />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "#92400e" }}
                  />
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Legend />
                  <ReferenceLine
                    y={0}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: "破產線", position: "insideLeft", fontSize: 10, fill: "#ef4444" }}
                  />
                  {teamsWithHistory.map((team, i) => (
                    <Line
                      key={team.id}
                      type="monotone"
                      dataKey={team.name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {teamList.some((t) => t.capital != null) && (
          <div className="mt-8 bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-amber-900 text-xl mb-4">🏆 即時排行榜（依淨資產）</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-100 text-amber-900">
                    <th className="text-left py-2 px-3 rounded-l-lg">排名</th>
                    <th className="text-left py-2 px-3">咖啡廳名稱</th>
                    <th className="text-left py-2 px-3">狀態</th>
                    <th className="text-left py-2 px-3">風格</th>
                    <th className="text-right py-2 px-3">資金</th>
                    <th className="text-right py-2 px-3">負債</th>
                    <th className="text-right py-2 px-3 rounded-r-lg">淨資產</th>
                  </tr>
                </thead>
                <tbody>
                  {teamList
                    .filter((t) => t.capital != null)
                    .sort((a, b) => (b.capital! - (b.debt ?? 0)) - (a.capital! - (a.debt ?? 0)))
                    .map((team, i) => {
                      const net = team.capital! - (team.debt ?? 0);
                      const isWaiting = team.currentStage > unlockedStage;
                      return (
                        <tr key={team.id} className="border-b border-amber-50 hover:bg-amber-50/50">
                          <td className="py-2 px-3 font-bold text-amber-700">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </td>
                          <td className="py-2 px-3 font-medium text-amber-900">
                            {team.name}
                            {(team.debt ?? 0) > 0 && <span className="ml-1 text-red-600 text-xs">🦈</span>}
                          </td>
                          <td className="py-2 px-3">
                            {isWaiting
                              ? <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ 等待放行</span>
                              : <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">▶ 進行中</span>
                            }
                          </td>
                          <td className="py-2 px-3 text-amber-800">{team.style ? GAME_CONFIG.styles[team.style].label.split(" ")[0] : "—"}</td>
                          <td className="py-2 px-3 text-right text-amber-900">${team.capital!.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-red-600">${(team.debt ?? 0).toLocaleString()}</td>
                          <td className={`py-2 px-3 text-right font-bold ${net >= 0 ? "text-green-700" : "text-red-600"}`}>
                            ${net.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
