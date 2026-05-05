"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DemandPoint = {
  location: string;
  demand: number;
};

type TrendPoint = {
  date: string;
  leads: number;
};

type AnalyticsChartsProps = {
  demandData: DemandPoint[];
  trendData: TrendPoint[];
};

export function AnalyticsCharts({ demandData, trendData }: AnalyticsChartsProps) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Demand by Location</h3>
        <div className="mt-3 h-72 min-h-[288px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
            <BarChart data={demandData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="location" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="demand" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Lead Trends</h3>
        <div className="mt-3 h-72 min-h-[288px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#0f766e"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
