import React from 'react';

// Simplified horizontal bar chart to avoid complex dependencies
export const ProcessTimeBreakdownChart = ({ data }) => {
  const totalSeconds = data.reduce((sum, item) => sum + item.seconds, 0);
  
  return (
    <div className="w-full space-y-4">
      {data.map((item) => {
        const percentage = totalSeconds > 0 ? (item.seconds / totalSeconds) * 100 : 0;
        return (
          <div key={item.label} className="group">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="text-slate-500">{Math.round(item.seconds / 60)} min</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out`}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
