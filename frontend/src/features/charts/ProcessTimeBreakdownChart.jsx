import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ResponsiveContainer } from 'recharts';
import { formatDuration } from '../../lib/utils.js';

const STACK_KEYS = [
  { key: 'vat', label: 'Value-Added', color: '#22C55E' },
  { key: 'wait', label: 'Waiting', color: '#F59E0B' },
  { key: 'rework', label: 'Rework', color: '#EF4444' },
  { key: 'handover', label: 'Handover', color: '#3B82F6' },
  { key: 'other', label: 'Other', color: '#94A3B8' },
];

function formatMinutes(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  if (safeSeconds < 3600) return `${Math.round(safeSeconds / 60)}m`;
  if (safeSeconds < 86400) return `${Math.round(safeSeconds / 3600)}h`;
  if (safeSeconds < 2592000) return `${Math.round(safeSeconds / 86400)}d`;
  return `${Math.round(safeSeconds / 2592000)}mo`;
}

function normalizeChartData(data) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return [];

  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  if (hasStackShape) return rows.map((row, index) => ({
    ...row,
    name: row.name || row.label || `Step ${index + 1}`,
  }));

  return rows.map((row, index) => ({
    id: row.key || row.id || row.label || `segment_${index}`,
    name: row.label || row.name || `Segment ${index + 1}`,
    seconds: Number(row.seconds) || 0,
    color: row.color || '#94A3B8',
  }));
}

function getStackKeys(data) {
  const rows = Array.isArray(data) ? data : [];
  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  if (hasStackShape) return STACK_KEYS;

  return rows.map((row, index) => ({
    key: row.key || row.id || row.label || `segment_${index}`,
    label: row.label || row.name || `Segment ${index + 1}`,
    color: row.color || '#94A3B8',
  }));
}

function DurationBarLabel({ x, y, width, value, index, chartData }) {
  const row = chartData[index] || {};
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={Math.max(12, y - 8)}
      textAnchor="middle"
      fill={row.color || '#334155'}
      className="text-[11px] font-bold"
    >
      {formatDuration(value)}
    </text>
  );
}

export const ProcessTimeBreakdownChart = ({ data, showLabels = true }) => {
  const rows = Array.isArray(data) ? data : [];
  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  const chartData = React.useMemo(() => normalizeChartData(data), [data]);
  const stackKeys = React.useMemo(() => getStackKeys(data), [data]);
  
  return (
    <div className="h-full min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 34, right: 10, left: -25, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            interval={0} 
            tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
          />
          <YAxis 
            tickFormatter={formatMinutes} 
            tick={{ fontSize: 12, fill: '#64748b' }}
            width={80}
          />
          <Tooltip formatter={(value) => formatDuration(value)} />
          {hasStackShape && <Legend />}
          {hasStackShape ? (
            stackKeys.map(({ key, label, color }) => (
              <Bar key={key} dataKey={key} stackId="process" fill={color} name={label} />
            ))
          ) : (
            <Bar dataKey="seconds" name="Duration" radius={[8, 8, 0, 0]}>
              {showLabels && <LabelList content={(props) => <DurationBarLabel {...props} chartData={chartData} />} />}
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
