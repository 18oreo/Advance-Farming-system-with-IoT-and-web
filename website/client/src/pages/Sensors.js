import React, { useEffect, useState } from 'react';
import { useThingSpeak } from '../hooks/useThingSpeak';
import { formatFieldLabel, formatFieldValue, hasFieldData } from '../utils/sensorData';
import './Sensors.css';

const BASE_COLUMNS = [
  { key: 'temperature', type: 'number', unitLabel: 'C' },
  { key: 'humidity', type: 'number', unitLabel: '%' },
  { key: 'lightIntensity', type: 'number', unitLabel: '%' },
  { key: 'soilMoisture', type: 'number', unitLabel: '%' },
  { key: 'soilMoistureRaw', type: 'number', unitLabel: 'ADC' },
  { key: 'inletPump', type: 'boolean' },
  { key: 'rainDetected', type: 'boolean' },
  { key: 'outletPump', type: 'boolean', optional: true },
];

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function Sensors() {
  const { feeds, channelInfo, loading, refresh } = useThingSpeak(30000);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('time');
  const [sortDir, setSortDir] = useState('desc');
  const perPage = 20;

  const columns = BASE_COLUMNS.filter((column) => !column.optional || hasFieldData(feeds, column.key));

  const getSortValue = (row, field) => {
    if (field === 'time') return row.time ? new Date(row.time).getTime() : Number.NEGATIVE_INFINITY;

    const value = row[field];
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return value;
    return value ?? Number.NEGATIVE_INFINITY;
  };

  const sorted = [...feeds].sort((a, b) => {
    const av = getSortValue(a, sortField);
    const bv = getSortValue(b, sortField);
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const query = filter.trim().toLowerCase();
  const filtered = sorted.filter((row) => {
    if (!query) return true;

    const searchParts = [
      String(row.entryId ?? ''),
      row.time ? new Date(row.time).toLocaleString() : '',
      ...columns.map((column) => formatFieldValue(column.key, row[column.key], { fallback: '' })),
    ];

    return searchParts.some((part) => part.toLowerCase().includes(query));
  });

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage((current) => Math.min(current, pages));
  }, [pages]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const exportCSV = () => {
    const header = ['Entry ID', 'Time', ...columns.map((column) => (
      column.unitLabel ? `${formatFieldLabel(column.key)} (${column.unitLabel})` : formatFieldLabel(column.key)
    ))];
    const rows = filtered.map((row) => ([
      row.entryId ?? '',
      row.time ? new Date(row.time).toISOString() : '',
      ...columns.map((column) => formatFieldValue(column.key, row[column.key], { fallback: '' })),
    ]));
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sensor_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sensors-page">
      <div className="page-header animate-up">
        <div>
          <h1>Sensor Data</h1>
          <p>All ThingSpeak feeds - Channel: {channelInfo?.name || 'Loading...'}</p>
        </div>
        <div className="sensor-actions">
          <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => refresh()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {channelInfo && (
        <div className="channel-info card animate-up">
          <div className="ci-item"><span>Channel ID</span><strong className="mono">{channelInfo.id}</strong></div>
          <div className="ci-item"><span>Name</span><strong>{channelInfo.name}</strong></div>
          <div className="ci-item"><span>Description</span><strong>{channelInfo.description || 'N/A'}</strong></div>
          <div className="ci-item"><span>Created</span><strong>{channelInfo.created_at ? new Date(channelInfo.created_at).toLocaleDateString() : 'N/A'}</strong></div>
          <div className="ci-item"><span>Last Entry</span><strong>{channelInfo.last_entry_id}</strong></div>
          <div className="ci-item"><span>Total Records</span><strong>{feeds.length}</strong></div>
        </div>
      )}

      <div className="table-controls card animate-up">
        <input
          type="text"
          placeholder="Search timestamps and values..."
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 280 }}
        />
        <span className="record-count">{filtered.length} records</span>
      </div>

      <div className="table-wrap card animate-up">
        {loading && !feeds.length ? (
          <div className="loading-skeleton" style={{ height: 400 }} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('entryId')} className="sortable">
                  # {sortField === 'entryId' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('time')} className="sortable">
                  Timestamp {sortField === 'time' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                {columns.map((column) => (
                  <th key={column.key} onClick={() => handleSort(column.key)} className="sortable">
                    {formatFieldLabel(column.key)}
                    {column.unitLabel ? <><br /><span className="unit-hint">({column.unitLabel})</span></> : null}
                    {sortField === column.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, index) => (
                <tr key={row.entryId || index} className={index % 2 === 0 ? 'even' : 'odd'}>
                  <td className="mono entry-id">#{row.entryId}</td>
                  <td className="timestamp">{row.time ? new Date(row.time).toLocaleString() : '--'}</td>
                  {columns.map((column) => (
                    <td key={column.key} className="mono">
                      {row[column.key] !== null && row[column.key] !== undefined ? (
                        <span className="val-pill">{formatFieldValue(column.key, row[column.key])}</span>
                      ) : (
                        <span className="null-val">--</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="pagination animate-up">
          <button className="btn btn-secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Prev</button>
          <div className="page-nums">
            {[...Array(Math.min(5, pages))].map((_, index) => {
              const pageNumber = Math.max(1, Math.min(page - 2, pages - 4)) + index;
              return (
                <button key={pageNumber} className={`page-num ${page === pageNumber ? 'active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
              );
            })}
          </div>
          <button className="btn btn-secondary" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages}>Next</button>
        </div>
      )}
    </div>
  );
}
