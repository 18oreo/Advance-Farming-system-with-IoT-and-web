import { useState, useEffect, useCallback, useRef } from 'react';
import { sensorAPI, thingspeakAPI } from '../utils/api';
import { mapThingSpeakFeed } from '../utils/sensorData';
import { useAuth } from '../context/AuthContext';

export const useThingSpeak = (refreshInterval = 15000) => {
  const { isFullUser } = useAuth();
  const [latest, setLatest] = useState(null);
  const [feeds, setFeeds] = useState([]);
  const [channelInfo, setChannelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchForUser = useCallback(async () => {
    await sensorAPI.sync();
    const [latestRes, feedsRes] = await Promise.all([
      sensorAPI.getLatest(),
      sensorAPI.getFeeds(100),
    ]);

    setLatest(latestRes.data.data || null);
    setFeeds(feedsRes.data.data || []);
    setChannelInfo(feedsRes.data.channel || latestRes.data.channel || null);
  }, []);

  const fetchForGuest = useCallback(async () => {
    const [latestRes, feedsRes] = await Promise.all([
      thingspeakAPI.getLatest(),
      thingspeakAPI.getFeeds(100),
    ]);

    setLatest(mapThingSpeakFeed(latestRes.data));
    setFeeds(feedsRes.data.feeds.map(mapThingSpeakFeed));
    setChannelInfo(feedsRes.data.channel);
  }, []);

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent || !feeds.length) setLoading(true);

    try {
      if (isFullUser) {
        await fetchForUser();
      } else {
        await fetchForGuest();
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load sensor data');
    } finally {
      setLoading(false);
    }
  }, [fetchForGuest, fetchForUser, feeds.length, isFullUser]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => {
      fetchAll({ silent: true });
    }, refreshInterval);

    return () => clearInterval(intervalRef.current);
  }, [fetchAll, refreshInterval]);

  const getStats = (field) => {
    const values = feeds
      .map((feed) => feed[field])
      .filter((value) => value !== null && !Number.isNaN(value));

    if (!values.length) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((total, value) => total + value, 0) / values.length,
      latest: latest?.[field],
    };
  };

  return {
    latest,
    feeds,
    channelInfo,
    loading,
    error,
    lastUpdated,
    getStats,
    refresh: fetchAll,
  };
};
