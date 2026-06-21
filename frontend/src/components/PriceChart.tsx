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

export default function PriceChart({ bars, range }: Props) {
  if (bars.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
        No price data available
      </div>
    );
  }

  const isPositive = bars[bars.length - 1].close >= bars[0].close;
  const lineColor = isPositive ? "#16a34a" : "#dc2626";

  // Pick ~6 evenly spaced x-axis labels to avoid crowding
  const step = Math.max(1, Math.ceil(bars.length / 6));
  const ticks = bars
    .filter((_, i) => i % step === 0 || i === bars.length - 1)
    .map((b) => b.date);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={bars} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.12} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={(v: string) => formatAxisDate(v, range)}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={58}
        />

        <Tooltip
          formatter={(value: number) => [priceFmt.format(value), "Close"]}
          labelFormatter={(label: string) => formatTooltipDate(label)}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#chartFill)"
          dot={false}
          activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
