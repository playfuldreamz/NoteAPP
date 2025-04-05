import React from 'react';
import { FileText, Mic, Tags, Timer } from 'lucide-react';
import StatCard from '../shared/StatCard';
import MiniChart from '../shared/MiniChart';

interface Stats {
  totalNotes: number;
  totalRecordings: number;
  totalTags: number;
  recordingTime: number; // in seconds
}

interface StatsRowProps {
  stats: Stats;
  chartData?: {
    notes: number[];
    recordings: number[];
    tags: number[];
    time: number[];
  };
}

const defaultChartData = {
  notes: [4, 6, 8, 5, 9, 7, 10],
  recordings: [2, 5, 3, 7, 4, 6, 8],
  tags: [3, 5, 8, 6, 9, 7, 10],
  time: [5, 8, 6, 9, 7, 10, 8]
};

const StatsRow: React.FC<StatsRowProps> = ({ stats, chartData = defaultChartData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard
        icon={FileText}
        title="Total Notes"
        value={stats.totalNotes}
        color="bg-blue-500"
        delay={0}
        chart={<MiniChart data={chartData.notes} color="bg-blue-500/60" />}
      />
      <StatCard
        icon={Mic}
        title="Total Recordings"
        value={stats.totalRecordings}
        color="bg-purple-500"
        delay={0.1}
        chart={<MiniChart data={chartData.recordings} color="bg-purple-500/60" />}
      />
      <StatCard
        icon={Tags}
        title="Unique Tags"
        value={stats.totalTags}
        color="bg-emerald-500"
        delay={0.2}
        chart={<MiniChart data={chartData.tags} color="bg-emerald-500/60" />}
      />
      <StatCard
        icon={Timer}
        title="Recording Time"
        value={`${Math.floor(stats.recordingTime / 60)}m ${stats.recordingTime % 60}s`}
        color="bg-amber-500"
        delay={0.3}
        chart={<MiniChart data={chartData.time} color="bg-amber-500/60" />}
      />
    </div>
  );
};

export default StatsRow;