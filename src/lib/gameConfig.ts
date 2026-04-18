export const GAME_CONFIG = {
  styles: {
    A: { label: 'A. 校門口黃金店面 (旗艦店)', rent: 50000, depreciation: 20000, base_traffic: 3000 },
    B: { label: 'B. 側門舒適店面 (標準店)', rent: 25000, depreciation: 12000, base_traffic: 1500 },
    C: { label: 'C. 巷弄老宅咖啡 (風格店)', rent: 10000, depreciation: 5000, base_traffic: 500 },
  } as const,
  beans: { '普通商用豆': 15, '中級莊園豆': 25, '頂級藝妓豆': 40 } as const,
  milks: { '一般鮮乳': 5, '燕麥奶': 8, '不加奶': 0 } as const,
  material: 3,
};

export type StyleKey = keyof typeof GAME_CONFIG.styles;
export type BeanKey = keyof typeof GAME_CONFIG.beans;
export type MilkKey = keyof typeof GAME_CONFIG.milks;

export function predictSales(styleKey: StyleKey, price: number, marketingBudget: number): number {
  const base = GAME_CONFIG.styles[styleKey].base_traffic;
  const priceFactor = (150 - price) * 18;
  let marketingEffect: number;
  if (styleKey === 'A') {
    marketingEffect = Math.sqrt(marketingBudget) * 1;
  } else if (styleKey === 'B') {
    marketingEffect = Math.sqrt(marketingBudget) * 5;
  } else {
    if (marketingBudget < 3000) marketingEffect = -300 + (marketingBudget / 3000) * 300;
    else marketingEffect = Math.sqrt(marketingBudget) * 10;
  }
  const minGuarantee = Math.floor(marketingBudget / 500);
  return Math.floor(Math.max(minGuarantee, Math.min(10000, base + priceFactor + marketingEffect)));
}

export interface HistoryEntry {
  Month: string;
  Event: string;
  Sales: number;
  Revenue: number;
  Cost: number;
  Profit: number;
  Capital: number;
}

export interface TeamData {
  name: string;
  currentStage: number;
  style?: StyleKey;
  bean?: BeanKey;
  milk?: MilkKey;
  direct_cost?: number;
  estimated_indirect?: { 租金: number; 折舊: number; 人事: number; 營業: number; 行銷: number };
  total_indirect_cost?: number;
  sales_forecast?: number;
  profit_margin?: number;
  suggested_price?: number;
  final_price?: number;
  ai_predicted_sales?: number;
  actual_profit?: number;
  s3_revenue?: number;
  s3_cost?: number;
  bep?: number;
  capital?: number;
  debt?: number;
  s4_month?: number;
  history?: HistoryEntry[];
  finishedAt?: number;
}

export interface Session {
  createdAt: number;
  status: 'waiting' | 'active' | 'finished';
  teams: Record<string, TeamData>;
  unlockedStage?: number;
}
