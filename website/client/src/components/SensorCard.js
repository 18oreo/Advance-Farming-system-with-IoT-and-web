import React from 'react';
import './SensorCard.css';
import {
  FIELD_CONFIG,
  formatFieldValue,
  getFieldBarPercent,
  getFieldStatus,
} from '../utils/sensorData';

export default function SensorCard({ field, value, trend, stats }) {
  const config = FIELD_CONFIG[field] || {};
  const status = getFieldStatus(field, value);
  const percent = getFieldBarPercent(field, value);
  const showStats = config.type !== 'boolean' && stats;
  const showTrend = typeof trend === 'number' && config.type !== 'boolean';

  return (
    <div className={`sensor-card card animate-up status-border-${status}`}>
      <div className="sc-header">
        <span className="sc-icon">{config.icon || field.slice(0, 2).toUpperCase()}</span>
        <div className="sc-meta">
          <span className="sc-label">{config.label || field}</span>
          <span className={`badge badge-${status}`}>{status}</span>
        </div>
      </div>

      <div className="sc-value">
        {value !== null && value !== undefined ? (
          <span className="sc-num">{formatFieldValue(field, value)}</span>
        ) : (
          <span className="sc-null">No Data</span>
        )}
        {showTrend && (
          <span className={`sc-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'}`}>
            {trend > 0 ? '+' : trend < 0 ? '-' : '='} {Math.abs(trend).toFixed(1)}
          </span>
        )}
      </div>

      <div className="sc-bar-wrap">
        <div className="sc-bar">
          <div
            className={`sc-bar-fill fill-${status}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {config.min !== undefined && config.max !== undefined && (
          <div className="sc-bar-labels">
            <span>{formatFieldValue(field, config.min)}</span>
            <span>{formatFieldValue(field, config.max)}</span>
          </div>
        )}
      </div>

      {showStats && (
        <div className="sc-stats">
          <div className="sc-stat"><span>Min</span><strong>{formatFieldValue(field, stats.min, { withUnit: false })}</strong></div>
          <div className="sc-stat"><span>Avg</span><strong>{formatFieldValue(field, stats.avg, { withUnit: false })}</strong></div>
          <div className="sc-stat"><span>Max</span><strong>{formatFieldValue(field, stats.max, { withUnit: false })}</strong></div>
        </div>
      )}
    </div>
  );
}
