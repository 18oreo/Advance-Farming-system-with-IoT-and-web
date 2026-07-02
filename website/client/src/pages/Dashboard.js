import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import SensorCard from '../components/SensorCard';
import { useThingSpeak } from '../hooks/useThingSpeak';
import {
  CHART_FIELDS,
  OVERVIEW_FIELDS,
  formatFieldLabel,
  formatFieldValue,
  hasFieldData,
} from '../utils/sensorData';
import './Dashboard.css';

const FIELD_COLORS = {
  temperature: '#e67e22',
  humidity: '#3498db',
  lightIntensity: '#f1c40f',
  soilMoisture: '#27ae60',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{new Date(label).toLocaleTimeString()}</p>
      {payload.map((point) => (
        <p key={point.dataKey} style={{ color: point.color, fontWeight: 600, fontSize: 13 }}>
          {formatFieldLabel(point.dataKey)}: {formatFieldValue(point.dataKey, point.value)}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { latest, feeds, channelInfo, loading, error, lastUpdated, getStats, refresh } = useThingSpeak(15000);
  const [activeChart, setActiveChart] = useState('temperature');

  useEffect(() => {
    document.title = 'Dashboard - AgriTechPro';
  }, []);

  const overviewFields = hasFieldData(feeds, 'outletPump')
    ? [...OVERVIEW_FIELDS, 'outletPump']
    : OVERVIEW_FIELDS;
  const detailFields = hasFieldData(feeds, 'outletPump')
    ? [...CHART_FIELDS, 'soilMoistureRaw', 'inletPump', 'rainDetected', 'outletPump']
    : [...CHART_FIELDS, 'soilMoistureRaw', 'inletPump', 'rainDetected'];

  const chartData = feeds
    .slice(-50)
    .map((feed) => ({
      time: feed.time,
      [activeChart]: feed[activeChart],
    }))
    .filter((point) => point[activeChart] !== null);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="dashboard">
      <div className="dash-header animate-up">
        <div>
          <h1 className="dash-title">{greeting}, Farmer</h1>
          <p className="dash-subtitle">
            Real-time monitoring for <span className="mono">{channelInfo?.name || 'Advance Farming'}</span>
          </p>
        </div>
        <div className="dash-actions">
          {lastUpdated && (
            <div className="last-updated">
              <span className="pulse"></span>
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => refresh()} disabled={loading}>
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner animate-up">
          Connection issue: {error}. The dashboard will retry automatically.
        </div>
      )}

      <div className="summary-bar card animate-up">
        <div className="sum-item">
          <span className="sum-icon">RD</span>
          <div>
            <div className="sum-val">{feeds.length}</div>
            <div className="sum-key">Readings</div>
          </div>
        </div>
        <div className="sum-divider" />
        <div className="sum-item">
          <span className="sum-icon">TP</span>
          <div>
            <div className="sum-val">{formatFieldValue('temperature', latest?.temperature, { fallback: '--' })}</div>
            <div className="sum-key">Temperature</div>
          </div>
        </div>
        <div className="sum-divider" />
        <div className="sum-item">
          <span className="sum-icon">SM</span>
          <div>
            <div className="sum-val">{formatFieldValue('soilMoisture', latest?.soilMoisture, { fallback: '--' })}</div>
            <div className="sum-key">Soil Moisture</div>
          </div>
        </div>
        <div className="sum-divider" />
        <div className="sum-item">
          <span className="sum-icon">LT</span>
          <div>
            <div className="sum-val">{formatFieldValue('lightIntensity', latest?.lightIntensity, { fallback: '--' })}</div>
            <div className="sum-key">Light Level</div>
          </div>
        </div>
        <div className="sum-divider" />
        <div className="sum-item">
          <span className="sum-icon">RN</span>
          <div>
            <div className="sum-val">{formatFieldValue('rainDetected', latest?.rainDetected, { fallback: '--' })}</div>
            <div className="sum-key">Rain Sensor</div>
          </div>
        </div>
      </div>

      {loading && !latest ? (
        <div className="skeleton-grid">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="loading-skeleton" style={{ height: 180 }} />
          ))}
        </div>
      ) : (
        <div className="sensors-grid">
          {overviewFields.map((field) => (
            <SensorCard
              key={field}
              field={field}
              value={latest?.[field]}
              stats={getStats(field)}
            />
          ))}
        </div>
      )}

      <div className="chart-section card animate-up">
        <div className="chart-header">
          <h2 className="chart-title">Historical Trend</h2>
          <div className="chart-tabs">
            {CHART_FIELDS.map((field) => (
              <button
                key={field}
                className={`chart-tab ${activeChart === field ? 'active' : ''}`}
                style={activeChart === field ? { background: FIELD_COLORS[field], color: 'white' } : {}}
                onClick={() => setActiveChart(field)}
              >
                {formatFieldLabel(field)}
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={activeChart}
                stroke={FIELD_COLORS[activeChart]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">No chart data available. Refresh to load more readings.</div>
        )}
      </div>

      {latest && (
        <div className="latest-detail card animate-up">
          <h2>Latest Entry Details</h2>
          <p className="detail-time">Entry #{latest.entryId} - {new Date(latest.time).toLocaleString()}</p>
          <div className="detail-grid">
            {detailFields.map((field) => (
              <div key={field} className="detail-item">
                <span className="detail-key">{formatFieldLabel(field)}</span>
                <span className="detail-val mono">
                  {formatFieldValue(field, latest[field])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
