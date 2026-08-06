import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { FlavorRadar } from "../types/domain";

type FlavorProfilePanelProps = {
  flavorRadar: FlavorRadar;
  story: string;
};

const flavorAxes: Array<[keyof FlavorRadar, string]> = [
  ["sweetness", "甜度"],
  ["bitterness", "苦度"],
  ["acidity", "酸度"],
  ["aroma", "香气"],
  ["body", "酒精"],
  ["alcohol", "酒感"],
];

export function FlavorProfilePanel({
  flavorRadar,
  story,
}: FlavorProfilePanelProps) {
  return (
    <section className="panel flavor-profile-panel">
      <div className="flavor-profile-grid">
        <FlavorRadarSection flavorRadar={flavorRadar} />
        <FlavorStorySection story={story} />
      </div>
    </section>
  );
}

export function FlavorRadarSection({
  flavorRadar,
}: Pick<FlavorProfilePanelProps, "flavorRadar">) {
  const radarData = flavorAxes.map(([key, label]) => ({
    label,
    value: flavorRadar[key],
  }));

  return (
    <section className="detail-ledger-section flavor-chart-column">
      <h2>风味图谱</h2>
      <div
        className="flavor-radar"
        aria-label="甜度、苦度、酸度、香气、酒精、酒感"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="68%">
            <PolarGrid
              gridType="polygon"
              stroke="rgba(201, 161, 90, 0.28)"
            />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: "#c7ab7a" }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              axisLine={false}
              domain={[0, 5]}
              tick={false}
            />
            <Radar
              dataKey="value"
              fill="#c9a15a"
              fillOpacity={0.42}
              stroke="#efd08a"
              strokeWidth={2}
              dot={{ fill: "#efd08a", r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function FlavorStorySection({
  story,
}: Pick<FlavorProfilePanelProps, "story">) {
  return (
    <section className="detail-ledger-section flavor-story">
      <h2>背后的故事</h2>
      <p>{story}</p>
    </section>
  );
}
