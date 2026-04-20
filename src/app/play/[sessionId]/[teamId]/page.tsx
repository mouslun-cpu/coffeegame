"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue, off, update, get } from "firebase/database";
import {
  GAME_CONFIG, predictSales, TeamData, StyleKey, BeanKey, MilkKey, HistoryEntry,
} from "@/lib/gameConfig";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-amber-900 mb-3">{children}</h2>;
}

function Stat({ label, value, sub, red }: { label: string; value: string; sub?: string; red?: boolean }) {
  return (
    <div className="bg-amber-50 rounded-xl p-3 text-center">
      <div className="text-xs text-amber-700">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${red ? "text-red-600" : "text-amber-900"}`}>{value}</div>
      {sub && <div className="text-xs text-amber-600">{sub}</div>}
    </div>
  );
}

// ─── Waiting Screen ────────────────────────────────────────────────────────────
function WaitingScreen({ completedStage }: { completedStage: number }) {
  return (
    <Card>
      <div className="flex flex-col items-center py-8 gap-4">
        <div className="text-5xl animate-pulse">⏳</div>
        <div className="text-center">
          <div className="text-xl font-bold text-amber-900 mb-1">第 {completedStage - 1} 關完成！</div>
          <div className="text-amber-700">等待老師開放下一關…</div>
        </div>
        <div className="bg-amber-50 rounded-xl px-6 py-3 text-sm text-amber-800 text-center">
          老師確認後將自動進入第 {completedStage} 關
        </div>
      </div>
    </Card>
  );
}

// ─── Stage 1 ────────────────────────────────────────────────────────────────
function Stage1({ data, onSave }: { data: TeamData; onSave: (d: Partial<TeamData>) => void }) {
  const [style, setStyle] = useState<StyleKey>(data.style ?? "A");
  const [bean, setBean] = useState<BeanKey>(data.bean ?? "普通商用豆");
  const [milk, setMilk] = useState<MilkKey>(data.milk ?? "一般鮮乳");

  function submit() {
    const dc = GAME_CONFIG.beans[bean] + GAME_CONFIG.milks[milk] + GAME_CONFIG.material;
    onSave({ style, bean, milk, direct_cost: dc, currentStage: 2 });
  }

  return (
    <Card>
      <SectionTitle>第一關：打造你的咖啡廳 ☕</SectionTitle>

      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">📍 選擇店面風格</p>
        <div className="flex flex-col gap-2">
          {(Object.keys(GAME_CONFIG.styles) as StyleKey[]).map((k) => (
            <label key={k} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${style === k ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
              <input type="radio" name="style" checked={style === k} onChange={() => setStyle(k)} className="mt-1 accent-amber-600" />
              <div>
                <div className="font-medium text-amber-900">{GAME_CONFIG.styles[k].label}</div>
                <div className="text-xs text-amber-700">租金 ${GAME_CONFIG.styles[k].rent.toLocaleString()} | 基礎客流 {GAME_CONFIG.styles[k].base_traffic.toLocaleString()}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">☕ 選擇咖啡豆</p>
        <div className="flex flex-col gap-2">
          {(Object.keys(GAME_CONFIG.beans) as BeanKey[]).map((k) => (
            <label key={k} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${bean === k ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
              <input type="radio" name="bean" checked={bean === k} onChange={() => setBean(k)} className="accent-amber-600" />
              <span className="font-medium text-amber-900">{k}</span>
              <span className="ml-auto text-sm text-amber-700">${GAME_CONFIG.beans[k]}/杯</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm font-semibold text-amber-800 mb-2">🥛 選擇乳品</p>
        <div className="flex flex-col gap-2">
          {(Object.keys(GAME_CONFIG.milks) as MilkKey[]).map((k) => (
            <label key={k} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${milk === k ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
              <input type="radio" name="milk" checked={milk === k} onChange={() => setMilk(k)} className="accent-amber-600" />
              <span className="font-medium text-amber-900">{k}</span>
              <span className="ml-auto text-sm text-amber-700">{GAME_CONFIG.milks[k] === 0 ? "免費" : `$${GAME_CONFIG.milks[k]}/杯`}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-amber-100 rounded-xl p-3 mb-4 text-sm text-center text-amber-800">
        預估每杯直接成本：<span className="font-bold text-amber-900">${GAME_CONFIG.beans[bean] + GAME_CONFIG.milks[milk] + GAME_CONFIG.material}</span>
      </div>

      <button onClick={submit} className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 rounded-xl text-lg transition">
        確認打造！前往第二關 →
      </button>
    </Card>
  );
}

// ─── Stage 2 ────────────────────────────────────────────────────────────────
function Stage2({ data, onSave }: { data: TeamData; onSave: (d: Partial<TeamData>) => void }) {
  const styleKey = data.style!;
  const styleCfg = GAME_CONFIG.styles[styleKey];
  const prior = data.estimated_indirect;
  const [staff, setStaff] = useState(prior?.人事 ?? 30000);
  const [op, setOp] = useState(prior?.營業 ?? 10000);
  const [mkt, setMkt] = useState(prior?.行銷 ?? 5000);

  const total = styleCfg.rent + styleCfg.depreciation + staff + op + mkt;

  function submit() {
    onSave({
      estimated_indirect: { 租金: styleCfg.rent, 折舊: styleCfg.depreciation, 人事: staff, 營業: op, 行銷: mkt },
      total_indirect_cost: total,
      currentStage: 3,
    });
  }

  return (
    <Card>
      <SectionTitle>第二關：成本估算 💰</SectionTitle>
      <div className="bg-blue-100 rounded-xl p-3 mb-4 text-sm text-blue-900 font-medium">
        已鎖定：<span className="font-bold">{styleCfg.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="店面租金（已鎖定）" value={`$${styleCfg.rent.toLocaleString()}`} />
        <Stat label="設備折舊（已鎖定）" value={`$${styleCfg.depreciation.toLocaleString()}`} />
      </div>

      {[
        { label: "👥 人事費用", val: staff, set: setStaff, step: 5000 },
        { label: "🔧 營業費用", val: op, set: setOp, step: 1000 },
        { label: "📣 行銷費用", val: mkt, set: setMkt, step: 1000 },
      ].map(({ label, val, set, step }) => (
        <div key={label} className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-amber-800">{label}</label>
            <span className="text-sm font-bold text-amber-900">${val.toLocaleString()}</span>
          </div>
          <input
            type="range" min={0} max={100000} step={step} value={val}
            onChange={(e) => set(Number(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div className="flex justify-between text-xs text-amber-600">
            <span>$0</span><span>$100,000</span>
          </div>
        </div>
      ))}

      <div className="bg-amber-100 rounded-xl p-4 text-center mt-4 mb-6">
        <div className="text-amber-700 text-sm">每月固定成本合計</div>
        <div className="text-3xl font-bold text-amber-900">${total.toLocaleString()}</div>
      </div>

      <button onClick={submit} className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 rounded-xl text-lg transition">
        提交預算！前往第三關 →
      </button>
    </Card>
  );
}

// ─── Stage 3 ────────────────────────────────────────────────────────────────
function Stage3({ data, onSave }: { data: TeamData; onSave: (d: Partial<TeamData>) => void }) {
  const [salesForecast, setSalesForecast] = useState(data.sales_forecast ?? 1000);
  const [margin, setMargin] = useState(data.profit_margin ?? 50);
  const [finalPrice, setFinalPrice] = useState<number | null>(data.final_price ?? null);
  const [phase, setPhase] = useState<"p1" | "p2" | "result">(data.ai_predicted_sales != null ? "result" : data.suggested_price != null ? "p2" : "p1");

  const fc = data.total_indirect_cost!;
  const dc = data.direct_cost!;
  const suggested = Math.round((dc + fc / salesForecast) * (1 + margin / 100));

  function calcResult() {
    if (finalPrice == null) return null;
    const mkt = data.estimated_indirect!.行銷;
    const ai_sales = predictSales(data.style!, finalPrice, mkt);
    const revenue = finalPrice * ai_sales;
    const total_cost = Math.round(dc * ai_sales + fc);
    const profit = revenue - total_cost;
    const cm = finalPrice - dc;
    const bep = cm > 0 ? Math.round(fc / cm) : Infinity;
    return { ai_sales, revenue, total_cost, profit, bep };
  }

  function handleP1() {
    onSave({ sales_forecast: salesForecast, profit_margin: margin, suggested_price: suggested });
    setFinalPrice(suggested);
    setPhase("p2");
  }

  function handleP2() {
    if (!finalPrice) return;
    const res = calcResult()!;
    onSave({
      final_price: finalPrice,
      ai_predicted_sales: res.ai_sales,
      actual_profit: res.profit,
      s3_revenue: res.revenue,
      s3_cost: res.total_cost,
      bep: res.bep,
    });
    setPhase("result");
  }

  function enterSurvival() {
    const s3_profit = data.actual_profit!;
    const initialCapital = Math.max(30000, s3_profit);
    const note = "M0 開局" + (s3_profit < 30000 ? " (媽媽贊助)" : "");
    onSave({
      capital: initialCapital,
      debt: 0,
      s4_month: 1,
      currentStage: 4,
      history: [{
        Month: "M0", Event: note,
        Sales: data.ai_predicted_sales!, Revenue: data.s3_revenue!, Cost: data.s3_cost!,
        Profit: s3_profit, Capital: initialCapital,
      }],
    });
  }

  const bepVal = data.bep ?? 0;
  const maxX = Math.max(5000, Math.round(bepVal * 1.5));
  const chartData = Array.from({ length: 51 }, (_, i) => {
    const x = Math.round((maxX / 50) * i);
    return { 銷量: x, 總收入: (data.final_price ?? 0) * x, 總成本: fc + dc * x };
  });

  return (
    <Card>
      <SectionTitle>第三關：定價策略與市場模擬 📊</SectionTitle>

      {phase === "p1" && (
        <>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-amber-800">📦 預估月銷量</label>
              <span className="font-bold text-amber-900">{salesForecast.toLocaleString()} 杯</span>
            </div>
            <input type="range" min={100} max={10000} step={100} value={salesForecast}
              onChange={(e) => setSalesForecast(Number(e.target.value))} className="w-full accent-amber-600" />
            <div className="flex justify-between text-xs text-amber-600">
              <span>100 杯</span><span>10,000 杯</span>
            </div>
          </div>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-amber-800">📈 期望利潤率</label>
              <span className="font-bold text-amber-900">{margin}%</span>
            </div>
            <input type="range" min={0} max={200} step={5} value={margin}
              onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-amber-600" />
            <div className="flex justify-between text-xs text-amber-600">
              <span>0%</span><span>200%</span>
            </div>
          </div>
          <div className="bg-amber-100 rounded-xl p-4 text-center mb-6">
            <div className="text-amber-700 text-sm">系統建議售價</div>
            <div className="text-3xl font-bold text-amber-900">${suggested}</div>
          </div>
          <button onClick={handleP1} className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 rounded-xl text-lg transition">
            試算完成 → 進入定價
          </button>
        </>
      )}

      {phase === "p2" && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="直接成本" value={`$${dc}`} />
            <Stat label="分攤固定" value={`$${Math.round(fc / salesForecast)}`} />
            <Stat label="每杯總成本" value={`$${Math.round(dc + fc / salesForecast)}`} />
          </div>
          <div className="bg-blue-100 border border-blue-300 rounded-xl p-3 text-center mb-4">
            <div className="text-blue-800 text-sm">系統建議售價</div>
            <div className="text-2xl font-bold text-blue-900">${data.suggested_price ?? suggested}</div>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-amber-800 block mb-2">決定最終售價 ($/杯)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number" min={1} value={finalPrice ?? ""}
                onChange={(e) => setFinalPrice(Number(e.target.value))}
                className="flex-1 border-2 border-amber-300 rounded-xl px-4 py-3 text-xl font-bold text-amber-900 text-center focus:outline-none focus:border-amber-500"
              />
              <span className="text-lg text-amber-700">元</span>
            </div>
          </div>
          <button onClick={handleP2} disabled={!finalPrice}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-lg transition">
            🤖 確認定價，與 AI 對決！
          </button>
        </>
      )}

      {phase === "result" && data.ai_predicted_sales != null && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="AI預測銷量" value={`${data.ai_predicted_sales.toLocaleString()} 杯`}
              sub={`預估差 ${(data.ai_predicted_sales - (data.sales_forecast ?? 0)).toLocaleString()}`} />
            <Stat label="模擬營收" value={`$${data.s3_revenue!.toLocaleString()}`} />
            <Stat label="模擬損益" value={`$${data.actual_profit!.toLocaleString()}`} red={data.actual_profit! < 0} />
          </div>

          <div className="mb-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="銷量" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="總收入" stroke="#1d4ed8" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="總成本" stroke="#dc2626" dot={false} strokeWidth={2} />
                <ReferenceLine x={data.bep} stroke="#6b7280" strokeDasharray="4 4" label={{ value: `BEP=${data.bep}`, position: "top", fontSize: 10 }} />
                <ReferenceLine x={data.ai_predicted_sales} stroke="#16a34a" strokeDasharray="4 4" label={{ value: "AI落點", position: "top", fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {data.capital == null && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
              <div className="font-bold text-orange-800 text-lg mb-1">🔥 挑戰！市場風雲三部曲</div>
              {data.actual_profit! < 30000 ? (
                <p className="text-sm text-orange-700">⚠️ 試營運獲利不足 $30,000… <strong>媽媽決定贊助！</strong> 起始資金補足至 $30,000。</p>
              ) : (
                <p className="text-sm text-orange-700">📈 你將帶著 <strong>${data.actual_profit!.toLocaleString()}</strong> 進入生存戰！</p>
              )}
            </div>
          )}

          {data.capital == null && (
            <button onClick={enterSurvival}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-lg transition">
              接受挑戰，進入生存戰！ 🔥
            </button>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Stage 4 ────────────────────────────────────────────────────────────────
function Stage4({ data, onSave, unlockedMonth }: { data: TeamData; onSave: (d: Partial<TeamData>) => void; unlockedMonth: number }) {
  const month = data.s4_month!;
  const capital = data.capital!;
  const debt = data.debt ?? 0;
  const [choice, setChoice] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset local state when month advances (fixes bug where saving stays true after Firebase update)
  useEffect(() => {
    setChoice("");
    setSaving(false);
  }, [month]);

  // Loan shark
  useEffect(() => {
    if (capital <= 0 && month <= 3) {
      const loan = 30000;
      onSave({ capital: capital + loan, debt: debt + loan });
    }
  }, []);

  const options: Record<number, { title: string; event: string; opts: string[]; captions: string[] }> = {
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

  if (month > 3) return <FinalReport data={data} />;

  if (month > unlockedMonth) {
    return (
      <Card>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat label="💰 目前資金" value={`$${capital.toLocaleString()}`} red={capital < 30000} />
          <Stat label="💀 累積負債" value={`$${debt.toLocaleString()}`} red={debt > 0} sub={debt > 0 ? "+10% 月利" : undefined} />
        </div>
        <div className="flex flex-col items-center py-6 gap-4">
          <div className="text-5xl animate-pulse">⏳</div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-900 mb-1">M{month - 1} 決策已提交！</div>
            <div className="text-amber-700">等待老師開放 M{month}…</div>
          </div>
          <div className="bg-amber-50 rounded-xl px-6 py-3 text-sm text-amber-800 text-center">
            老師確認後將自動進入 M{month}
          </div>
        </div>
      </Card>
    );
  }

  const cfg = options[month];

  function handleSubmit() {
    if (!choice) return;
    setSaving(true);

    const dc = data.direct_cost!;
    const fc = data.total_indirect_cost!;
    const baseSales = data.ai_predicted_sales ?? 1000;
    const price = data.final_price!;
    const mkt = data.estimated_indirect!.行銷;
    const interest = Math.round(debt * 0.1);
    let newPrice = price, sales = baseSales, newFc = fc, note = "";

    if (month === 1) {
      const milkCost = GAME_CONFIG.milks[data.milk!];
      if (choice.startsWith("C") && data.milk === "一般鮮乳") {
        alert("😡 騙人！你第一關明明就選了要加鮮奶！請誠實面對你的成本！");
        setSaving(false); return;
      }
      const newDc = choice.startsWith("A") || choice.startsWith("B") ? dc + milkCost : dc;
      newPrice = choice.startsWith("B") ? Math.round(price * 1.2) : price;
      sales = predictSales(data.style!, newPrice, mkt);
      const revenue = Math.round(newPrice * sales);
      const totalCost = Math.round(newDc * sales + fc + interest);
      const profit = revenue - totalCost;
      const newCapital = capital + profit;
      const newHistory: HistoryEntry = { Month: "M1", Event: choice, Sales: sales, Revenue: revenue, Cost: totalCost, Profit: profit, Capital: newCapital };
      onSave({ capital: newCapital, debt: debt + (debt > 0 ? interest : 0), s4_month: 2, history: [...(data.history ?? []), newHistory] });
      return;
    }

    if (month === 2) {
      let revenue: number, totalCost: number;
      if (choice.startsWith("A")) { newPrice = Math.round(price * 0.5); sales = baseSales; newFc = fc; }
      else if (choice.startsWith("B")) { newPrice = price; sales = Math.round(baseSales * 0.9); newFc = fc + 30000; }
      else { newPrice = price; sales = Math.round(baseSales * 0.25); newFc = fc; }
      revenue = Math.round(newPrice * sales);
      totalCost = Math.round(dc * sales + newFc + interest);
      const profit = revenue - totalCost;
      const newCapital = capital + profit;
      const newHistory: HistoryEntry = { Month: "M2", Event: choice, Sales: sales, Revenue: revenue, Cost: totalCost, Profit: profit, Capital: newCapital };
      onSave({ capital: newCapital, debt: debt + (debt > 0 ? interest : 0), s4_month: 3, history: [...(data.history ?? []), newHistory] });
      return;
    }

    if (month === 3) {
      let revenue: number, totalCost: number;
      if (choice.startsWith("A")) {
        newFc = fc + 80000;
        const isFail = Math.random() < 0.3;
        sales = isFail ? Math.round(baseSales * 0.5) : baseSales;
        note = isFail ? " (💥賭輸爆炸!)" : " (✨賭贏了!)";
      } else if (choice.startsWith("B")) {
        newFc = fc + 40000; sales = Math.min(baseSales, 2000);
      } else {
        newFc = fc; sales = Math.min(baseSales, 800);
      }
      revenue = Math.round(price * sales);
      totalCost = Math.round(dc * sales + newFc + interest);
      const profit = revenue - totalCost;
      const newCapital = capital + profit;
      const newHistory: HistoryEntry = { Month: "M3", Event: choice + note, Sales: sales, Revenue: revenue, Cost: totalCost, Profit: profit, Capital: newCapital };
      onSave({ capital: newCapital, debt: debt + (debt > 0 ? interest : 0), s4_month: 4, history: [...(data.history ?? []), newHistory], currentStage: 5, finishedAt: Date.now() });
      return;
    }
  }

  return (
    <Card>
      <SectionTitle>🔥 市場風雲三部曲</SectionTitle>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="💰 目前資金" value={`$${capital.toLocaleString()}`} red={capital < 30000} />
        <Stat label="💀 累積負債" value={`$${debt.toLocaleString()}`} red={debt > 0} sub={debt > 0 ? "+10% 月利" : undefined} />
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-amber-700 mb-1">
          <span>月份進度</span><span>M{month - 1} / 3</span>
        </div>
        <div className="w-full bg-amber-100 rounded-full h-2">
          <div className="bg-amber-600 h-2 rounded-full transition-all" style={{ width: `${((month - 1) / 3) * 100}%` }} />
        </div>
      </div>

      <div className="my-4 border-t pt-4">
        <p className="font-bold text-amber-800 mb-1">{cfg.title}</p>
        <div className={`rounded-xl p-3 mb-4 text-sm font-medium ${month === 1 ? "bg-red-50 text-red-800" : month === 2 ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}>
          {cfg.event}
        </div>

        <div className="flex flex-col gap-2">
          {cfg.opts.map((opt, i) => (
            <label key={opt} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${choice === opt ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
              <input type="radio" name={`m${month}`} checked={choice === opt} onChange={() => setChoice(opt)} className="mt-1 accent-amber-600" />
              <div>
                <div className="font-medium text-amber-900">{opt}</div>
                <div className="text-xs text-amber-700 mt-0.5">{cfg.captions[i]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!choice || saving}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-lg transition mt-2">
        {saving ? "結算中…" : "確定決策 →"}
      </button>
    </Card>
  );
}

// ─── Final Report ────────────────────────────────────────────────────────────
function FinalReport({ data }: { data: TeamData }) {
  const finalCapital = data.capital!;
  const finalDebt = data.debt ?? 0;
  const net = finalCapital - finalDebt;
  const history = data.history ?? [];

  return (
    <Card>
      <SectionTitle>🏁 最終結算</SectionTitle>
      {net > 0 ? (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center mb-4">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-green-800 font-bold text-xl">恭喜完賽！</div>
          <div className="text-green-700">最終淨資產：<span className="font-bold text-2xl">${net.toLocaleString()}</span></div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-center mb-4">
          <div className="text-4xl mb-2">💀</div>
          <div className="text-red-800 font-bold text-xl">遊戲結束</div>
          <div className="text-red-700">資不抵債，淨資產：<span className="font-bold text-2xl">-${Math.abs(net).toLocaleString()}</span></div>
        </div>
      )}

      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Month" />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Line type="monotone" dataKey="Capital" stroke="#d97706" strokeWidth={2} dot={{ r: 5 }} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "破產線", position: "insideLeft", fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

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
              <tr key={h.Month} className="border-b border-amber-100">
                <td className="py-1.5 px-2 font-bold text-amber-900">{h.Month}</td>
                <td className="py-1.5 px-2 text-amber-800 max-w-[80px] truncate">{h.Event}</td>
                <td className="py-1.5 px-2 text-amber-900">{h.Sales.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-amber-900">${h.Revenue.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-amber-900">${h.Cost.toLocaleString()}</td>
                <td className={`py-1.5 px-2 font-bold ${h.Profit >= 0 ? "text-green-700" : "text-red-600"}`}>${h.Profit.toLocaleString()}</td>
                <td className="py-1.5 px-2 font-medium text-amber-900">${h.Capital.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {finalDebt > 0 && (
        <div className="mt-3 bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800">
          ⚠️ 注意：你仍欠地下錢莊 ${finalDebt.toLocaleString()}，上述資金尚未扣除此負債。
        </div>
      )}
    </Card>
  );
}

// ─── Main Play Page ──────────────────────────────────────────────────────────
export default function PlayPage() {
  const { sessionId, teamId } = useParams<{ sessionId: string; teamId: string }>();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [unlockedStage, setUnlockedStage] = useState<number>(1);
  const [unlockedMonth, setUnlockedMonth] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teamRef = ref(db, `sessions/${sessionId}/teams/${teamId}`);
    const handler = onValue(teamRef, (snap) => {
      if (snap.exists()) setTeamData(snap.val());
      setLoading(false);
    });
    return () => off(teamRef, "value", handler);
  }, [sessionId, teamId]);

  useEffect(() => {
    const unlockedRef = ref(db, `sessions/${sessionId}/unlockedStage`);
    const handler = onValue(unlockedRef, (snap) => {
      setUnlockedStage(snap.val() ?? 1);
    });
    return () => off(unlockedRef, "value", handler);
  }, [sessionId]);

  useEffect(() => {
    const unlockedMonthRef = ref(db, `sessions/${sessionId}/unlockedMonth`);
    const handler = onValue(unlockedMonthRef, (snap) => {
      setUnlockedMonth(snap.val() ?? 1);
    });
    return () => off(unlockedMonthRef, "value", handler);
  }, [sessionId]);

  const saveData = useCallback(async (partial: Partial<TeamData>) => {
    const teamRef = ref(db, `sessions/${sessionId}/teams/${teamId}`);
    const current = (await get(teamRef)).val() as TeamData;
    await update(teamRef, { ...current, ...partial });
  }, [sessionId, teamId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-amber-700">載入中…</div>;
  if (!teamData) return <div className="min-h-screen flex items-center justify-center text-red-600">找不到資料</div>;

  const stage = teamData.currentStage;
  const isWaiting = stage > unlockedStage;

  return (
    <div className="min-h-screen pb-12">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-amber-800 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="font-bold truncate">{teamData.name}</div>
        <div className="flex items-center gap-2 text-xs">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition
              ${stage > s ? "bg-green-400 text-white" : stage === s ? "bg-white text-amber-800" : "bg-amber-600 text-amber-300"}`}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {isWaiting ? (
          <WaitingScreen completedStage={stage} />
        ) : (
          <>
            {stage === 1 && <Stage1 data={teamData} onSave={saveData} />}
            {stage === 2 && <Stage2 data={teamData} onSave={saveData} />}
            {stage === 3 && <Stage3 data={teamData} onSave={saveData} />}
            {stage === 4 && <Stage4 data={teamData} onSave={saveData} unlockedMonth={unlockedMonth} />}
            {stage >= 5 && <FinalReport data={teamData} />}
          </>
        )}
      </div>
    </div>
  );
}
