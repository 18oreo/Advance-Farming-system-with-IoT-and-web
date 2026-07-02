import React, { useCallback, useEffect, useState } from 'react';
import { alertAPI, sensorAPI } from '../utils/api';
import { formatFieldLabel, formatFieldValue } from '../utils/sensorData';
import './Alerts.css';

const THRESHOLDS = {
  temperature: { min: 10, max: 40, unit: 'C', icon: 'T' },
  humidity: { min: 20, max: 90, unit: '%', icon: 'H' },
  soilMoisture: { min: 25, max: 85, unit: '%', icon: 'S' },
  lightIntensity: { min: 15, max: 95, unit: '%', icon: 'L' },
};

export default function Alerts() {
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const loadAlerts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      await sensorAPI.sync();
      const response = await alertAPI.getAll({ resolved: false, limit: 100 });
      setLiveAlerts(response.data.data || []);
    } catch (error) {
      setLiveAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(() => {
      loadAlerts({ silent: true }).catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const dismiss = async (id) => {
    try {
      await alertAPI.resolve(id);
      setLiveAlerts((current) => current.filter((alert) => alert._id !== id));
    } catch (error) {
      // Keep the alert visible if the resolve call fails.
    }
  };

  const dismissAll = async () => {
    try {
      await alertAPI.resolveAll();
      setLiveAlerts([]);
    } catch (error) {
      // Keep the alerts visible if the bulk resolve call fails.
    }
  };

  const visible = liveAlerts.filter((alert) =>
    filterSeverity === 'all' || alert.severity === filterSeverity
  );

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...visible].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="alerts-page">
      <div className="page-header animate-up">
        <div>
          <h1>Alerts & Notifications</h1>
          <p>Saved alerts from your sensor readings</p>
        </div>
        <div className="alert-actions">
          {visible.length > 0 && (
            <button className="btn btn-secondary" onClick={dismissAll}>Dismiss All</button>
          )}
        </div>
      </div>

      <div className="alert-stats animate-up">
        {['critical', 'high', 'medium', 'low'].map((severity) => {
          const count = liveAlerts.filter((alert) => alert.severity === severity).length;
          return (
            <div key={severity} className={`stat-box card sev-${severity}`}>
              <div className="stat-count">{count}</div>
              <div className="stat-sev">{severity.toUpperCase()}</div>
            </div>
          );
        })}
      </div>

      <div className="alert-filter card animate-up">
        <span className="filter-label">Filter by severity:</span>
        {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
          <button
            key={severity}
            className={`filter-btn ${filterSeverity === severity ? 'active' : ''}`}
            onClick={() => setFilterSeverity(severity)}
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </button>
        ))}
      </div>

      <div className="alerts-list animate-up">
        {loading ? (
          <div className="loading-skeleton" style={{ height: 200 }} />
        ) : sorted.length === 0 ? (
          <div className="no-alerts card">
            <span className="no-alerts-icon">OK</span>
            <h3>All Clear!</h3>
            <p>No active alerts. All saved sensor readings are within normal thresholds.</p>
          </div>
        ) : (
          sorted.map((alert) => {
            const config = THRESHOLDS[alert.type] || { unit: '', icon: '!' };
            const alertTime = alert.createdAt ? new Date(alert.createdAt) : new Date();

            return (
              <div key={alert._id} className={`alert-item card sev-border-${alert.severity} animate-up`}>
                <div className="alert-icon">{config.icon}</div>
                <div className="alert-body">
                  <div className="alert-top">
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                    <span className="alert-type">{formatFieldLabel(alert.type)}</span>
                    <span className="alert-time">{alertTime.toLocaleTimeString()}</span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <div className="alert-bar">
                    <div className="threshold-bar">
                      <div
                        className="threshold-fill"
                        style={{
                          width: `${Math.min(100, (alert.value / (alert.threshold * 1.5)) * 100)}%`,
                          background: alert.severity === 'critical' ? '#c0392b' : alert.severity === 'high' ? '#e67e22' : '#f1c40f',
                        }}
                      />
                    </div>
                    <span className="threshold-label">
                      Value: {formatFieldValue(alert.type, alert.value)} / Threshold: {alert.threshold}{config.unit}
                    </span>
                  </div>
                </div>
                <button className="dismiss-btn" onClick={() => dismiss(alert._id)} title="Dismiss">X</button>
              </div>
            );
          })
        )}
      </div>

      <div className="thresholds-ref card animate-up">
        <h2>Threshold Reference</h2>
        <div className="thresh-grid">
          {Object.entries(THRESHOLDS).map(([field, config]) => (
            <div key={field} className="thresh-item">
              <span className="thresh-icon">{config.icon}</span>
              <div>
                <div className="thresh-name">{formatFieldLabel(field)}</div>
                <div className="thresh-range">
                  {config.min !== undefined ? `Min: ${config.min}${config.unit}` : ''}
                  {config.min !== undefined && config.max !== undefined ? ' - ' : ''}
                  {config.max !== undefined ? `Max: ${config.max}${config.unit}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
