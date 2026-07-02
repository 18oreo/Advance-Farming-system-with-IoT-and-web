const SOIL_SENSOR_MAX = 4095;

export const FIELD_CONFIG = {
  temperature: {
    label: 'Temperature',
    unit: 'C',
    type: 'number',
    min: 10,
    max: 40,
    decimals: 1,
    icon: 'T',
  },
  humidity: {
    label: 'Humidity',
    unit: '%',
    type: 'number',
    min: 20,
    max: 90,
    decimals: 1,
    icon: 'H',
  },
  lightIntensity: {
    label: 'Light Level',
    unit: '%',
    type: 'number',
    min: 15,
    max: 95,
    decimals: 1,
    icon: 'L',
  },
  soilMoisture: {
    label: 'Soil Moisture',
    unit: '%',
    type: 'number',
    min: 25,
    max: 85,
    decimals: 1,
    icon: 'S',
  },
  soilMoistureRaw: {
    label: 'Soil Sensor',
    unit: ' ADC',
    type: 'number',
    decimals: 0,
    icon: 'SR',
  },
  inletPump: {
    label: 'Inlet Pump',
    type: 'boolean',
    trueText: 'Running',
    falseText: 'Stopped',
    icon: 'IN',
  },
  rainDetected: {
    label: 'Rain Sensor',
    type: 'boolean',
    trueText: 'Rain detected',
    falseText: 'Dry',
    icon: 'RN',
  },
  outletPump: {
    label: 'Outlet Pump',
    type: 'boolean',
    trueText: 'Running',
    falseText: 'Stopped',
    icon: 'OUT',
  },
};

export const CHART_FIELDS = ['temperature', 'humidity', 'lightIntensity', 'soilMoisture'];
export const OVERVIEW_FIELDS = [
  'temperature',
  'humidity',
  'lightIntensity',
  'soilMoisture',
  'inletPump',
  'rainDetected',
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const toBinaryState = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return parsed >= 1;
};

export const rawToSoilMoisture = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return clamp(Number((100 - (parsed / SOIL_SENSOR_MAX) * 100).toFixed(1)), 0, 100);
};

export const mapThingSpeakFeed = (feed) => {
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
    time: feed.created_at,
  };
};

export const formatFieldLabel = (field) =>
  FIELD_CONFIG[field]?.label || field.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());

export const formatFieldValue = (
  field,
  value,
  { withUnit = true, fallback = 'N/A' } = {}
) => {
  if (value === null || value === undefined) return fallback;

  const config = FIELD_CONFIG[field];
  if (config?.type === 'boolean') {
    return value ? config.trueText : config.falseText;
  }

  if (typeof value === 'number') {
    const decimals = config?.decimals ?? 1;
    const formatted = value.toFixed(decimals);
    if (!withUnit || !config?.unit) return formatted;
    return `${formatted}${config.unit}`;
  }

  return String(value);
};

export const getFieldStatus = (field, value) => {
  if (value === null || value === undefined) return 'unknown';

  const config = FIELD_CONFIG[field];
  if (config?.type === 'boolean') {
    if (field === 'rainDetected') return value ? 'warning' : 'good';
    return 'good';
  }

  if (!config) return 'good';
  if (value < config.min * 0.8 || value > config.max * 1.2) return 'critical';
  if (value < config.min || value > config.max) return 'warning';
  return 'good';
};

export const getFieldBarPercent = (field, value) => {
  if (value === null || value === undefined) return 0;

  const config = FIELD_CONFIG[field];
  if (config?.type === 'boolean') {
    return value ? 100 : 0;
  }

  if (!config || config.min === undefined || config.max === undefined) return 0;
  const range = config.max - config.min;
  if (range <= 0) return 0;
  return clamp(((value - config.min) / range) * 100, 0, 100);
};

export const hasFieldData = (feeds, field) =>
  feeds.some((feed) => feed[field] !== null && feed[field] !== undefined);
