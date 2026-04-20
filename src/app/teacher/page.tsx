"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, push, set, onValue, off } from "firebase/database";
import { Session, TeamData, GAME_CONFIG } from "@/lib/gameConfig";
import { QRCodeSVG } from "qrcode.react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
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

function CapitalTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-3 shadow text-xs max-w-[200px]">
      <div className="font-bold text-amber-900 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="mb-1.5">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="font-medium truncate">{p.name}：</span>
            <span>${Number(p.value).toLocaleString()}</span>
          </div>
          {p.payload[`${p.name}_ev`] && (
            <div className="ml-3.5 text-gray-500 text-[10px] truncate">{p.payload[`${p.name}_ev`]}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function PnLTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-3 shadow text-xs max-w-[200px]">
      <div className="font-bold text-amber-900 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="truncate">{p.name}</span>
          </div>
          <span className={`font-bold ${Number(p.value) >= 0 ? "text-green-700" : "text-red-600"}`}>
            {Number(p.value) >= 0 ? "+" : ""}${Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function SalesTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-3 shadow text-xs max-w-[200px]">
      <div className="font-bold text-amber-900 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="mb-1.5">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="font-medium truncate">{p.name}：</span>
            <span>{Number(p.value).toLocaleString()} 杯</span>
          </div>
          {p.payload[`${p.name}_ev`] && (
            <div className="ml-3.5 text-gray-500 text-[10px] truncate">{p.payload[`${p.name}_ev`]}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function TeamDetailModal({ team, onClose }: { team: TeamData & { id: string }; onClose: () => void }) {
  const history = team.history ?? [];
  const finalCapital = team.capital ?? 0;
  const finalDebt = team.debt ?? 0;
  const net = finalCapital - finalDebt;
  const memberList = Object.values(team.members ?? {});
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-amber-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-amber-900 text-lg">{team.name} — 完整對戰紀錄</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl font-light leading-none">×</button>
        </div>
        <div className="p-6">
          {/* Team composition */}
          {(team.bossName || memberList.length > 0) && (
            <div className="bg-amber-50 rounded-xl p-4 mb-5 flex flex-wrap gap-3">
              {team.bossName && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">👨‍💼</span>
                  <div>
                    <div className="text-xs text-amber-600">老闆</div>
                    <div className="font-bold text-amber-900">{team.bossName}</div>
                  </div>
                </div>
              )}
              {memberList.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg">🧑‍🎓</span>
                  <div>
                    <div className="text-xs text-amber-600">合夥人</div>
                    <div className="font-medium text-amber-900">{m.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-xs text-amber-700">最終資金</div>
              <div className={`font-bold text-lg mt-0.5 ${finalCapital < 30000 ? "text-red-600" : "text-amber-900"}`}>${finalCapital.toLocaleString()}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-xs text-amber-700">累積負債</div>
              <div className={`font-bold text-lg mt-0.5 ${finalDebt > 0 ? "text-red-600" : "text-gray-500"}`}>${finalDebt.toLocaleString()}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-xs text-amber-700">淨資產</div>
              <div className={`font-bold text-lg mt-0.5 ${net >= 0 ? "text-green-700" : "text-red-600"}`}>${net.toLocaleString()}</div>
            </div>
          </div>
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-amber-100 text-amber-900">
                    {["月份", "事件", "銷量", "營收", "成本", "損益", "資金"].map((h) => (
                      <th key={h} className="py-2 px-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.Month} className="border-b border-amber-100 hover:bg-amber-50/50">
                      <td className="py-1.5 px-2 font-bold text-amber-900">{h.Month}</td>
                      <td className="py-1.5 px-2 text-amber-800">{h.Event}</td>
                      <td className="py-1.5 px-2 text-amber-900">{h.Sales.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-amber-900">${h.Revenue.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-amber-900">${h.Cost.toLocaleString()}</td>
                      <td className={`py-1.5 px-2 font-bold ${h.Profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {h.Profit >= 0 ? "+" : ""}${h.Profit.toLocaleString()}
                      </td>
                      <td className={`py-1.5 px-2 font-medium ${h.Capital < 30000 ? "text-red-600" : "text-amber-900"}`}>${h.Capital.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-amber-500 py-6">尚未進入生存戰</p>
          )}
        </div>
      </div>
    </div>
  );
}

function exportCSV(teamList: (TeamData & { id: string })[], sessionId: string) {
  const sorted = [...teamList].sort((a, b) => {
    if (a.capital == null && b.capital == null) return 0;
    if (a.capital == null) return 1;
    if (b.capital == null) return -1;
    return (b.capital - (b.debt ?? 0)) - (a.capital - (a.debt ?? 0));
  });

  const headers = [
    "排名", "咖啡廳名稱", "老闆", "合夥人",
    "風格", "咖啡豆", "乳品", "售價", "直接成本", "固定成本", "AI預測銷量",
    "M1決策", "M1損益", "M2決策", "M2損益", "M3決策", "M3損益",
    "最終資金", "負債", "淨資產", "狀態",
  ];

  const rows = sorted.map((team, i) => {
    const net = team.capital != null ? team.capital - (team.debt ?? 0) : "";
    const members = Object.values(team.members ?? {}).map((m) => m.name).join("／");
    const getHistory = (month: string) => team.history?.find((h) => h.Month === month);
    const m1 = getHistory("M1"); const m2 = getHistory("M2"); const m3 = getHistory("M3");
    const rankLabel = team.capital == null ? "—" : i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
    return [
      rankLabel,
      team.name,
      team.bossName ?? "",
      members,
      team.style ?? "",
      team.bean ?? "",
      team.milk ?? "",
      team.final_price ?? "",
      team.direct_cost ?? "",
      team.total_indirect_cost ?? "",
      team.ai_predicted_sales ?? "",
      m1?.Event ?? "", m1?.Profit ?? "",
      m2?.Event ?? "", m2?.Profit ?? "",
      m3?.Event ?? "", m3?.Profit ?? "",
      team.capital ?? "",
      team.debt ?? 0,
      net,
      team.currentStage >= 5 ? "已完賽" : team.status === "lobby" ? "大廳中" : "進行中",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
  });

  const csv = [headers.map((h) => `"${h}"`), ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coffeegame_${sessionId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [unlockedMonth, setUnlockedMonth] = useState<number>(1);
  const [joinUrl, setJoinUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<"boss" | "partner" | null>(null);

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
    if (next === 4) {
      await set(ref(db, `sessions/${sessionId}/unlockedMonth`), 1);
    }
  }

  async function advanceMonth() {
    if (!sessionId) return;
    const next = Math.min(unlockedMonth + 1, 3);
    await set(ref(db, `sessions/${sessionId}/unlockedMonth`), next);
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

    const unlockedMonthRef = ref(db, `sessions/${sessionId}/unlockedMonth`);
    const unlockedMonthHandler = onValue(unlockedMonthRef, (snap) => {
      setUnlockedMonth(snap.val() ?? 1);
    });

    return () => {
      off(teamsRef, "value", teamsHandler);
      off(unlockedRef, "value", unlockedHandler);
      off(unlockedMonthRef, "value", unlockedMonthHandler);
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

  // Survival battle charts
  const teamsWithHistory = teamList.filter((t) => t.history && t.history.length > 0);
  const allMonths = ["M0", "M1", "M2", "M3"];
  const capitalChartData = allMonths
    .map((month) => {
      const point: Record<string, string | number | undefined> = { month };
      teamsWithHistory.forEach((team) => {
        const entry = team.history!.find((h) => h.Month === month);
        if (entry != null) {
          point[team.name] = entry.Capital;
          point[`${team.name}_ev`] = entry.Event;
        }
      });
      return point;
    })
    .filter((p) => Object.keys(p).length > 1);

  const monthlyPnLData = ["M1", "M2", "M3"]
    .map((month) => {
      const point: Record<string, string | number> = { month };
      teamsWithHistory.forEach((team) => {
        const entry = team.history!.find((h) => h.Month === month);
        if (entry != null) point[team.name] = entry.Profit;
      });
      return point;
    })
    .filter((p) => Object.keys(p).length > 1);

  const salesChartData = allMonths
    .map((month) => {
      const point: Record<string, string | number | undefined> = { month };
      teamsWithHistory.forEach((team) => {
        const entry = team.history!.find((h) => h.Month === month);
        if (entry != null) {
          point[team.name] = entry.Sales;
          point[`${team.name}_ev`] = entry.Event;
        }
      });
      return point;
    })
    .filter((p) => Object.keys(p).length > 1);

  interface EventRow { teamName: string; month: string; event: string; profit: number; capital: number; }
  const eventLog: EventRow[] = teamsWithHistory
    .flatMap((team) =>
      (team.history ?? [])
        .filter((h) => h.Month !== "M0")
        .map((h) => ({ teamName: team.name, month: h.Month, event: h.Event, profit: h.Profit, capital: h.Capital }))
    )
    .sort((a, b) => b.month.localeCompare(a.month) || b.profit - a.profit);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="text-5xl mb-3">☕</div>
          <h1 className="text-3xl font-bold text-amber-900 mb-1">咖啡廳爭霸戰 Dashboard</h1>
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
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">☕ 咖啡廳爭霸戰 Dashboard</h1>
            <p className="text-amber-600 text-xs mt-0.5">場次 ID：<code className="bg-amber-100 px-2 py-0.5 rounded">{sessionId}</code></p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stats */}
            <div className="text-center bg-white rounded-xl px-3 py-1.5 shadow-sm">
              <div className="text-xl font-bold text-amber-800">{stats.total}</div>
              <div className="text-xs text-amber-600">組加入</div>
            </div>
            <div className="text-center bg-white rounded-xl px-3 py-1.5 shadow-sm">
              <div className="text-xl font-bold text-orange-600">{stats.playing}</div>
              <div className="text-xs text-amber-600">生存戰中</div>
            </div>
            <div className="text-center bg-white rounded-xl px-3 py-1.5 shadow-sm">
              <div className="text-xl font-bold text-green-600">{stats.finished}</div>
              <div className="text-xs text-amber-600">已完賽</div>
            </div>
            {stats.waiting > 0 && (
              <div className="text-center bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-1.5 shadow-sm">
                <div className="text-xl font-bold text-yellow-700">{stats.waiting}</div>
                <div className="text-xs text-yellow-600">等待放行</div>
              </div>
            )}
            <div className="w-px h-8 bg-amber-200 hidden sm:block" />
            {/* QR buttons */}
            <button
              onClick={() => setQrModal("boss")}
              className="bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium px-3 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              👨‍💼 老闆 QR
            </button>
            <button
              onClick={() => setQrModal("partner")}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              🧑‍🎓 合夥人 QR
            </button>
            <button
              onClick={createSession}
              className="bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-3 py-2 rounded-xl transition"
            >
              🔄 新場次
            </button>
          </div>
        </div>

        {/* QR Modal */}
        {qrModal && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setQrModal(null)}
          >
            <div
              className="bg-white rounded-3xl p-8 flex flex-col items-center gap-5 w-full max-w-xs shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-bold text-xl text-amber-900">
                {qrModal === "boss" ? "👨‍💼 老闆掃此 QR Code" : "🧑‍🎓 合夥人掃此 QR Code"}
              </h2>
              <div className={`p-3 rounded-2xl border-4 ${qrModal === "boss" ? "border-amber-400" : "border-green-400"}`}>
                <QRCodeSVG
                  value={qrModal === "boss" ? `${joinUrl}/boss` : `${joinUrl}/partner`}
                  size={220}
                  bgColor="#ffffff"
                  fgColor={qrModal === "boss" ? "#92400e" : "#166534"}
                />
              </div>
              <p className="text-xs text-center text-amber-600 break-all">
                {qrModal === "boss" ? `${joinUrl}/boss` : `${joinUrl}/partner`}
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => navigator.clipboard.writeText(qrModal === "boss" ? `${joinUrl}/boss` : `${joinUrl}/partner`)}
                  className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium py-2 rounded-xl text-sm transition"
                >
                  複製連結
                </button>
                <button
                  onClick={() => setQrModal(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-xl text-sm transition"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Month Control (survival battle) */}
        {unlockedStage >= 4 && (
          <div className="mb-6 bg-white rounded-2xl shadow p-5 border-l-4 border-orange-400">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-bold text-orange-800 text-lg mb-1">🔥 生存戰月份控制</h2>
                <p className="text-sm text-orange-700">學生提交當月決策後需等待老師開放下一月，可趁機統一講評</p>
              </div>
              {unlockedMonth < 3 ? (
                <button
                  onClick={advanceMonth}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition whitespace-nowrap shadow"
                >
                  開放 M{unlockedMonth + 1} →
                </button>
              ) : (
                <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl font-medium">✅ 全部月份已開放</span>
              )}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((m) => (
                <div
                  key={m}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition ${
                    m <= unlockedMonth ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {m <= unlockedMonth ? "✓" : "🔒"} M{m}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams Grid */}
        {teamList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-amber-400">
            <div className="text-5xl mb-3">⏳</div>
            <p className="text-lg font-medium">等待學生加入中…</p>
            <p className="text-sm">點擊上方 QR Code 按鈕讓學生掃碼加入</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamList.map((team) => (
              <TeamCard key={team.id} team={team} unlockedStage={unlockedStage} />
            ))}
          </div>
        )}

        {/* Survival Battle Charts */}
        {teamsWithHistory.length > 0 && (
          <>
            {/* Monthly P&L Battle Chart */}
            {monthlyPnLData.length > 0 && (
              <div className="mt-8 bg-white rounded-2xl shadow p-6">
                <h2 className="font-bold text-amber-900 text-xl mb-1">💥 月份損益對決</h2>
                <p className="text-sm text-amber-700 mb-4">各組每月決策後的損益結果——柱子往下是虧損，往上是獲利</p>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyPnLData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                      <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#92400e", fontWeight: 700 }} />
                      <YAxis
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: "#92400e" }}
                      />
                      <Tooltip content={<PnLTooltip />} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
                      {teamsWithHistory.map((team, i) => (
                        <Bar
                          key={team.id}
                          dataKey={team.name}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          radius={[3, 3, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Capital Trend */}
            <div className="mt-6 bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-amber-900 text-xl mb-1">📈 資金走勢（Hover 看決策）</h2>
              <p className="text-sm text-amber-700 mb-4">各組資金軌跡，懸停資料點可查看當月決策</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={capitalChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#92400e" }} />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: "#92400e" }}
                    />
                    <Tooltip content={<CapitalTooltip />} />
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
                        strokeWidth={2.5}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales Chart */}
            {salesChartData.length > 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow p-6">
                <h2 className="font-bold text-amber-900 text-xl mb-1">☕ 銷量變化（Hover 看決策）</h2>
                <p className="text-sm text-amber-700 mb-4">各組每月實際銷量，反映定價與市場事件的影響</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#92400e" }} />
                      <YAxis
                        tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                        tick={{ fontSize: 11, fill: "#92400e" }}
                      />
                      <Tooltip content={<SalesTooltip />} />
                      <Legend />
                      {teamsWithHistory.map((team, i) => (
                        <Line
                          key={team.id}
                          type="monotone"
                          dataKey={team.name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2.5}
                          dot={{ r: 5 }}
                          activeDot={{ r: 7 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Event Log */}
            {eventLog.length > 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow p-6">
                <h2 className="font-bold text-amber-900 text-xl mb-1">📋 決策動態紀錄</h2>
                <p className="text-sm text-amber-700 mb-4">各組每月選擇與損益結果（最新月份優先）</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-orange-50 text-orange-900">
                        <th className="py-2 px-3 text-left rounded-l-lg">月份</th>
                        <th className="py-2 px-3 text-left">組別</th>
                        <th className="py-2 px-3 text-left">決策</th>
                        <th className="py-2 px-3 text-right">損益</th>
                        <th className="py-2 px-3 text-right rounded-r-lg">資金</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventLog.map((row, i) => (
                        <tr key={i} className="border-b border-orange-50 hover:bg-orange-50/50">
                          <td className="py-2 px-3 font-bold text-orange-700">{row.month}</td>
                          <td className="py-2 px-3 font-medium text-amber-900">{row.teamName}</td>
                          <td className="py-2 px-3 text-amber-800 max-w-[180px] truncate">{row.event}</td>
                          <td className={`py-2 px-3 text-right font-bold ${row.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {row.profit >= 0 ? "+" : ""}${row.profit.toLocaleString()}
                          </td>
                          <td className={`py-2 px-3 text-right font-medium ${row.capital < 30000 ? "text-red-600" : "text-amber-900"}`}>
                            ${row.capital.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Leaderboard */}
        {teamList.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-bold text-amber-900 text-xl">🏆 即時排行榜（全班）</h2>
              <button
                onClick={() => exportCSV(teamList, sessionId!)}
                className="bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition flex items-center gap-2"
              >
                📥 匯出成績 CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-100 text-amber-900">
                    <th className="text-left py-2 px-3 rounded-l-lg">排名</th>
                    <th className="text-left py-2 px-3">咖啡廳 / 成員</th>
                    <th className="text-left py-2 px-3">狀態</th>
                    <th className="text-left py-2 px-3">風格</th>
                    <th className="text-right py-2 px-3">資金</th>
                    <th className="text-right py-2 px-3">負債</th>
                    <th className="text-right py-2 px-3">淨資產</th>
                    <th className="text-center py-2 px-3 rounded-r-lg">詳情</th>
                  </tr>
                </thead>
                <tbody>
                  {[...teamList]
                    .sort((a, b) => {
                      if (a.capital == null && b.capital == null) return 0;
                      if (a.capital == null) return 1;
                      if (b.capital == null) return -1;
                      return (b.capital - (b.debt ?? 0)) - (a.capital - (a.debt ?? 0));
                    })
                    .map((team, i) => {
                      const hasCapital = team.capital != null;
                      const net = hasCapital ? team.capital! - (team.debt ?? 0) : null;
                      const isWaiting = team.currentStage > unlockedStage;
                      return (
                        <tr key={team.id} className="border-b border-amber-50 hover:bg-amber-50/50">
                          <td className="py-2 px-3 font-bold text-amber-700">
                            {!hasCapital ? "—" : i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-amber-900">
                              {team.name}
                              {(team.debt ?? 0) > 0 && <span className="ml-1 text-red-600 text-xs">🦈</span>}
                            </div>
                            {team.bossName && (
                              <div className="text-xs text-amber-600 mt-0.5">
                                👨‍💼 {team.bossName}
                                {Object.values(team.members ?? {}).length > 0 && (
                                  <span className="ml-1">
                                    · 🧑‍🎓 {Object.values(team.members!).map((m) => m.name).join("、")}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {team.currentStage >= 5
                              ? <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✅ 已完賽</span>
                              : isWaiting
                                ? <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ 等待放行</span>
                                : hasCapital
                                  ? <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">🔥 生存戰</span>
                                  : <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">📝 備戰中</span>
                            }
                          </td>
                          <td className="py-2 px-3 text-amber-800">{team.style ? GAME_CONFIG.styles[team.style].label.split(" ")[0] : "—"}</td>
                          <td className="py-2 px-3 text-right text-amber-900">{hasCapital ? `$${team.capital!.toLocaleString()}` : "—"}</td>
                          <td className="py-2 px-3 text-right text-red-600">{hasCapital ? `$${(team.debt ?? 0).toLocaleString()}` : "—"}</td>
                          <td className={`py-2 px-3 text-right font-bold ${net == null ? "text-gray-400" : net >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {net == null ? "—" : `$${net.toLocaleString()}`}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => setExpandedTeamId(team.id)}
                              className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium px-3 py-1 rounded-lg transition"
                            >
                              展開
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Team Detail Modal */}
        {expandedTeamId && (() => {
          const team = teamList.find((t) => t.id === expandedTeamId);
          return team ? <TeamDetailModal team={team} onClose={() => setExpandedTeamId(null)} /> : null;
        })()}
      </div>
    </div>
  );
}
