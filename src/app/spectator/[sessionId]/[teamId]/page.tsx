"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { TeamData, GAME_CONFIG } from "@/lib/gameConfig";

// ─── Stage 4 event data (mirrors play page) ──────────────────────────────────
const S4_EVENTS: Record<number, { title: string; event: string; opts: string[]; captions: string[] }> = {
  1: {
    title: "📅 Month 1: 通膨來襲",
    event: "💥 突發事件：全球乳牛集體罷工抗爭，牛奶成本即日起暴漲 100%！",
    opts: ["A. 佛心凍漲", "B. 漲價反映", "C. 我沒賣牛奶~爽!"],
    captions: ["我是開良心事業的，成本我自己吞！", "抱歉了錢錢，漲價！售價+20%！", "哈哈哈哈你們忙，我先走了"],
  },
  2: {
    title: "📅 Month 2: 紅海競爭",
    event: "⚔️ 突發事件：校長千金在校園正中心開豪華咖啡廳慶開幕，全品項咖啡打1折！",
    opts: ["A. 割喉跟進", "B. 品牌固樁", "C. 躺平就好"],
    captions: ["跟他拚了！售價打5折，保住客流", "追加$3萬買網軍，客流僅-10%", "我就爛！讓他玩一個月，客流-75%"],
  },
  3: {
    title: "📅 Month 3: 營運災難",
    event: "💣 突發事件：一位生科系同學試圖用你的咖啡機萃取『賢者之石』，引發小規模爆炸！主設備全毀！",
    opts: ["A. 買二手應急", "B. 租賃新機", "C. 手沖硬撐"],
    captions: ["賭運氣！花$8萬，維持產能但有30%機率再爆", "穩健！花$4萬，產能有上限", "守財奴！不花錢，產能上限低！"],
  },
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────
function DoneCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
      <div className="text-xs font-bold text-green-700 mb-2">✅ {label}</div>
      <div className="text-sm text-green-900 space-y-0.5">{children}</div>
    </div>
  );
}

function WaitBanner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-8 gap-3 text-center">
      <div className="text-4xl animate-pulse">⏳</div>
      <div className="text-lg font-bold text-amber-900">{message}</div>
      <p className="text-sm text-amber-600">老師確認後將自動進入下一關</p>
    </div>
  );
}

function ScenarioBox({ children, color = "amber" }: { children: React.ReactNode; color?: "amber" | "red" | "yellow" }) {
  const cls = color === "red" ? "bg-red-50 text-red-800" : color === "yellow" ? "bg-yellow-50 text-yellow-800" : "bg-amber-50 text-amber-800";
  return <div className={`rounded-xl p-4 mb-4 text-sm font-medium ${cls}`}>{children}</div>;
}

function OptionRow({ label, caption }: { label: string; caption: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-100 bg-white mb-2">
      <div>
        <div className="font-medium text-amber-900 text-sm">{label}</div>
        <div className="text-xs text-amber-600 mt-0.5">{caption}</div>
      </div>
    </div>
  );
}

// ─── Per-stage read-only views ─────────────────────────────────────────────────

function Stage1View() {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-amber-800 mb-2">📍 店面風格選項</p>
      {(Object.keys(GAME_CONFIG.styles) as (keyof typeof GAME_CONFIG.styles)[]).map((k) => {
        const s = GAME_CONFIG.styles[k];
        return (
          <div key={k} className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-100 bg-white mb-2">
            <div>
              <div className="font-medium text-amber-900 text-sm">{s.label}</div>
              <div className="text-xs text-amber-600">租金 ${s.rent.toLocaleString()} | 基礎客流 {s.base_traffic.toLocaleString()}</div>
            </div>
          </div>
        );
      })}
      <p className="text-sm font-semibold text-amber-800 mt-3 mb-2">☕ 咖啡豆選項</p>
      {(Object.keys(GAME_CONFIG.beans) as (keyof typeof GAME_CONFIG.beans)[]).map((k) => (
        <div key={k} className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-100 bg-white mb-2">
          <span className="font-medium text-amber-900 text-sm">{k}</span>
          <span className="text-sm text-amber-600">${GAME_CONFIG.beans[k]}/杯</span>
        </div>
      ))}
      <p className="text-sm font-semibold text-amber-800 mt-3 mb-2">🥛 乳品選項</p>
      {(Object.keys(GAME_CONFIG.milks) as (keyof typeof GAME_CONFIG.milks)[]).map((k) => (
        <div key={k} className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-100 bg-white mb-2">
          <span className="font-medium text-amber-900 text-sm">{k}</span>
          <span className="text-sm text-amber-600">{GAME_CONFIG.milks[k] === 0 ? "免費" : `$${GAME_CONFIG.milks[k]}/杯`}</span>
        </div>
      ))}
    </div>
  );
}

function Stage2View({ team }: { team: TeamData }) {
  const style = GAME_CONFIG.styles[team.style!];
  return (
    <div className="mt-4 space-y-2">
      <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-900">
        已鎖定風格：<span className="font-bold">{style.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <div className="text-xs text-amber-600">店面租金（固定）</div>
          <div className="font-bold text-amber-900">${style.rent.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <div className="text-xs text-amber-600">設備折舊（固定）</div>
          <div className="font-bold text-amber-900">${style.depreciation.toLocaleString()}</div>
        </div>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
        老闆正在設定人事費用、營業費用、行銷費用（各可調整 $0–$100,000）
      </p>
    </div>
  );
}

function Stage3View({ team }: { team: TeamData }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <div className="text-xs text-amber-600">直接成本/杯</div>
          <div className="font-bold text-amber-900">${team.direct_cost}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <div className="text-xs text-amber-600">每月固定成本</div>
          <div className="font-bold text-amber-900">${team.total_indirect_cost?.toLocaleString()}</div>
        </div>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
        老闆正在預估銷量、設定利潤率，並決定最終售價。每杯直接成本已確定，定價需涵蓋固定成本才能獲利。
      </p>
    </div>
  );
}

function Stage4MonthView({ month }: { month: number }) {
  const cfg = S4_EVENTS[month];
  if (!cfg) return null;
  const eventBg = month === 2 ? "yellow" : "red";
  return (
    <div className="mt-4">
      <p className="font-bold text-amber-800 mb-2">{cfg.title}</p>
      <ScenarioBox color={eventBg as "red" | "yellow"}>{cfg.event}</ScenarioBox>
      <p className="text-xs font-semibold text-amber-700 mb-2">選項：</p>
      {cfg.opts.map((opt, i) => (
        <OptionRow key={opt} label={opt} caption={cfg.captions[i]} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SpectatorPage() {
  const { sessionId, teamId } = useParams<{ sessionId: string; teamId: string }>();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [unlockedStage, setUnlockedStage] = useState(1);
  const [unlockedMonth, setUnlockedMonth] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(db, `sessions/${sessionId}/teams/${teamId}`);
    const h = onValue(r, (snap) => { if (snap.exists()) setTeam(snap.val()); setLoading(false); });
    return () => off(r, "value", h);
  }, [sessionId, teamId]);

  useEffect(() => {
    const r = ref(db, `sessions/${sessionId}/unlockedStage`);
    const h = onValue(r, (snap) => setUnlockedStage(snap.val() ?? 1));
    return () => off(r, "value", h);
  }, [sessionId]);

  useEffect(() => {
    const r = ref(db, `sessions/${sessionId}/unlockedMonth`);
    const h = onValue(r, (snap) => setUnlockedMonth(snap.val() ?? 1));
    return () => off(r, "value", h);
  }, [sessionId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-amber-700">載入中…</div>;
  if (!team) return <div className="min-h-screen flex items-center justify-center text-red-600">找不到資料</div>;

  if (team.status === "lobby") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl animate-pulse">☕</div>
        <h2 className="text-xl font-bold text-amber-900">{team.name}</h2>
        <p className="text-amber-700">老闆 {team.bossName} 正在等待合夥人加入…</p>
      </div>
    );
  }

  const stage = team.currentStage;
  const isWaiting = stage > unlockedStage;
  const month = team.s4_month ?? 1;

  // Build history lookup for stage 4
  const getMonthHistory = (m: string) => team.history?.find((h) => h.Month === m);

  return (
    <div className="min-h-screen pb-16">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-amber-800 text-white px-4 py-3 shadow">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <div className="font-bold">{team.name}</div>
            <div className="text-xs text-amber-200">老闆：{team.bossName}</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="bg-amber-600 px-2 py-0.5 rounded-full">👀 觀戰中</span>
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center font-bold
                ${stage > s ? "bg-green-400 text-white" : stage === s ? "bg-white text-amber-800" : "bg-amber-600 text-amber-300"}`}>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* ── Completed stage summaries ── */}

        {stage >= 2 && team.style && (
          <DoneCard label="第一關：打造咖啡廳">
            <p>🏪 {GAME_CONFIG.styles[team.style].label}</p>
            <p>☕ 咖啡豆：{team.bean}　🥛 乳品：{team.milk}</p>
            <p>直接成本：${team.direct_cost}/杯</p>
          </DoneCard>
        )}

        {stage >= 3 && team.total_indirect_cost != null && (
          <DoneCard label="第二關：成本估算">
            {team.estimated_indirect && (
              <>
                <p>人事 ${team.estimated_indirect.人事.toLocaleString()} | 營業 ${team.estimated_indirect.營業.toLocaleString()} | 行銷 ${team.estimated_indirect.行銷.toLocaleString()}</p>
                <p className="font-bold mt-0.5">每月固定成本合計：${team.total_indirect_cost.toLocaleString()}</p>
              </>
            )}
          </DoneCard>
        )}

        {stage >= 4 && team.final_price != null && (
          <DoneCard label="第三關：定價策略">
            <p>最終售價：<span className="font-bold">${team.final_price}</span></p>
            <p>AI預測銷量：{team.ai_predicted_sales?.toLocaleString()} 杯　損益：${team.actual_profit?.toLocaleString()}</p>
            {(team.actual_profit ?? 0) < 30000 && <p className="text-orange-700 text-xs mt-0.5">⚠️ 媽媽贊助補至 $30,000</p>}
          </DoneCard>
        )}

        {/* Survival battle month summaries */}
        {stage >= 4 && ([1, 2, 3] as const).map((m) => {
          const h = getMonthHistory(`M${m}`);
          const isCompleted = month > m || stage >= 5;
          if (!h || !isCompleted) return null;
          return (
            <DoneCard key={m} label={`生存戰 M${m}`}>
              <p>決策：{h.Event}</p>
              <p>銷量 {h.Sales.toLocaleString()} 杯　損益 <span className={h.Profit >= 0 ? "text-green-700 font-bold" : "text-red-600 font-bold"}>{h.Profit >= 0 ? "+" : ""}${h.Profit.toLocaleString()}</span></p>
              <p>資金：${h.Capital.toLocaleString()}</p>
            </DoneCard>
          );
        })}

        {/* ── Current stage content ── */}

        <div className="bg-white rounded-2xl shadow p-5">
          {/* Stage 1 active */}
          {stage === 1 && (
            <>
              <div className="text-lg font-bold text-amber-900 mb-1">第一關：打造你的咖啡廳 ☕</div>
              <ScenarioBox>老闆正在選擇店面風格、咖啡豆與乳品，參考下方選項一起討論吧！</ScenarioBox>
              <Stage1View />
            </>
          )}

          {/* Stage 2 active */}
          {stage === 2 && !isWaiting && team.style && (
            <>
              <div className="text-lg font-bold text-amber-900 mb-1">第二關：成本估算 💰</div>
              <ScenarioBox>老闆正在設定人事、營業、行銷費用。討論看看各項要分配多少？</ScenarioBox>
              <Stage2View team={team} />
            </>
          )}

          {/* Stage 3 active */}
          {stage === 3 && !isWaiting && team.direct_cost != null && (
            <>
              <div className="text-lg font-bold text-amber-900 mb-1">第三關：定價策略 📊</div>
              <ScenarioBox>老闆正在規劃售價。根據成本討論一個合理又有競爭力的定價！</ScenarioBox>
              <Stage3View team={team} />
            </>
          )}

          {/* Stage 4 active — survival battle */}
          {stage === 4 && (
            <>
              <div className="text-lg font-bold text-amber-900 mb-3">🔥 市場風雲三部曲</div>
              {/* Current capital */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-amber-600">目前資金</div>
                  <div className={`font-bold text-lg ${(team.capital ?? 0) < 30000 ? "text-red-600" : "text-amber-900"}`}>${(team.capital ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-amber-600">累積負債</div>
                  <div className={`font-bold text-lg ${(team.debt ?? 0) > 0 ? "text-red-600" : "text-gray-500"}`}>${(team.debt ?? 0).toLocaleString()}</div>
                </div>
              </div>

              {month <= 3 && month > unlockedMonth ? (
                <WaitBanner message={`M${month - 1} 決策已送出，等待老師開放 M${month}`} />
              ) : month <= 3 ? (
                <>
                  <ScenarioBox color={month === 2 ? "yellow" : "red"}>
                    老闆正在決策 {S4_EVENTS[month]?.title}，參考下方事件與選項一起討論！
                  </ScenarioBox>
                  <Stage4MonthView month={month} />
                </>
              ) : (
                <WaitBanner message="三個月已全部完成！等待最終結算…" />
              )}
            </>
          )}

          {/* Stage 5 — final report */}
          {stage >= 5 && (() => {
            const history = team.history ?? [];
            const net = (team.capital ?? 0) - (team.debt ?? 0);
            return (
              <>
                <div className="text-lg font-bold text-amber-900 mb-3">🏁 最終結算</div>
                {net > 0 ? (
                  <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center mb-4">
                    <div className="text-3xl mb-1">🎉</div>
                    <div className="text-green-800 font-bold">恭喜完賽！</div>
                    <div className="text-green-700">最終淨資產：<span className="font-bold text-xl">${net.toLocaleString()}</span></div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-center mb-4">
                    <div className="text-3xl mb-1">💀</div>
                    <div className="text-red-800 font-bold">資不抵債</div>
                    <div className="text-red-700">淨資產：<span className="font-bold text-xl">-${Math.abs(net).toLocaleString()}</span></div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-amber-100 text-amber-900">
                        {["月份", "事件", "銷量", "營收", "損益", "資金"].map((h) => (
                          <th key={h} className="py-2 px-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.Month} className="border-b border-amber-100">
                          <td className="py-1.5 px-2 font-bold text-amber-900">{h.Month}</td>
                          <td className="py-1.5 px-2 text-amber-800 max-w-[80px] truncate">{h.Event}</td>
                          <td className="py-1.5 px-2">{h.Sales.toLocaleString()}</td>
                          <td className="py-1.5 px-2">${h.Revenue.toLocaleString()}</td>
                          <td className={`py-1.5 px-2 font-bold ${h.Profit >= 0 ? "text-green-700" : "text-red-600"}`}>${h.Profit.toLocaleString()}</td>
                          <td className="py-1.5 px-2">${h.Capital.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          {/* Waiting screen (between stages, waiting for teacher) */}
          {isWaiting && stage < 4 && (
            <WaitBanner message={`第 ${stage - 1} 關已完成，等待老師開放第 ${stage} 關…`} />
          )}
        </div>
      </div>
    </div>
  );
}
