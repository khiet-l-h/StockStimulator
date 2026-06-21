import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PriceBar } from "../types/stocks";

interface Props {
  bars: PriceBar[];
  range: string;
}

const priceFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatAxisDate(dateStr: string, range: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (range === "1M") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (range === "5Y") return d.toLocaleDateString("en-US", { year: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatTooltipDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-navy-750 border border-navy-600 rounded-xl px-3 py-2.5 shadow-dark text-xs">
      <p className="text-slate-400 mb-1">{formatTooltipDate(label)}</p>
      <p className="font-semibold text-slate-100">{priceFmt.format(payload[0].value)}</p>
    </div>
  );
}

export default function PriceChart({ bars, range }: Props) {
  if (bars.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-600 text-sm">
        No price data available
      </div>
    );
  }

  const isPositive = bars[bars.length - 1].close >= bars[0].close;
  const lineColor = isPositive ? "#00e5b0" : "#f472b6";
  const gradientId = isPositive ? "chartFillMint" : "chartFillPink";

  const step = Math.max(1, Math.ceil(bars.length / 6));
  const ticks = bars
    .filter((_, i) => i % step === 0 || i === bars.length - 1)
    .map((b) => b.date);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={bars} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="2 4" stroke="#162241" vertical={false} />

        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={(v: string) => formatAxisDate(v, range)}
          tick={{ fontSize: 10, fill: "#4a5778" }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          tick={{ fontSize: 10, fill: "#4a5778" }}
          axisLine={false}
          tickLine={false}
          width={58}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1a2847", strokeWidth: 1 }} />

        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
