const SOIL_SENSOR_MAX = 4095;

const THRESHOLDS = {
  temperature: { min: 10, max: 40, unit: 'C' },
  humidity: { min: 20, max: 90, unit: '%' },
  lightIntensity: { min: 15, max: 95, unit: '%' },
  soilMoisture: { min: 25, max: 85, unit: '%' },
};

const ALERT_FIELDS = ['temperature', 'humidity', 'lightIntensity', 'soilMoisture'];
const CHART_FIELDS = ['temperature', 'humidity', 'lightIntensity', 'soilMoisture'];
const STAT_FIELDS = [...CHART_FIELDS, 'soilMoistureRaw'];

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toBinaryState = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return parsed >= 1;
};

const rawToSoilMoisture = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return clamp(Number((100 - (parsed / SOIL_SENSOR_MAX) * 100).toFixed(1)), 0, 100);
};

const mapThingSpeakFeed = (feed) => {
  const soilMoistureRaw = toNumber(feed.field6);

  return {
    entryId: toNumber(feed.entry_id),
    temperature: toNumber(feed.field1),
    humidity: toNumber(feed.field2),
    lightIntensity: toNumber(feed.field3),
    inletPump: toBinaryState(feed.field4),
    rainDetected: toBinaryState(feed.field5),
    soilMoistureRaw,
    soilMoisture: rawToSoilMoisture(soilMoistureRaw),
    outletPump: toBinaryState(feed.field7),
    thingspeakCreatedAt: feed.created_at ? new Date(feed.created_at) : null,
  };
};

const getSensorConfig = (user = {}) => {
  const config = user.sensorConfig || {};

  return {
    channelId: String(config.channelId || process.env.THINGSPEAK_CHANNEL_ID || ''),
    readKey: String(config.readKey || process.env.THINGSPEAK_READ_KEY || ''),
    writeKey: String(config.writeKey || process.env.THINGSPEAK_WRITE_KEY || ''),
    baseUrl: String(config.baseUrl || process.env.THINGSPEAK_BASE_URL || 'https://api.thingspeak.com'),
    name: String(config.name || 'Sensor Channel'),
  };
};

const serializeSensorReading = (reading) => {
  if (!reading) return null;

  const doc = typeof reading.toObject === 'function' ? reading.toObject() : { ...reading };
  return {
    ...doc,
    time: doc.thingspeakCreatedAt || doc.createdAt || null,
  };
};

const formatFieldLabel = (field) =>
  field.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());

module.exports = {
  ALERT_FIELDS,
  CHART_FIELDS,
  STAT_FIELDS,
  THRESHOLDS,
  mapThingSpeakFeed,
  getSensorConfig,
  serializeSensorReading,
  formatFieldLabel,
};
