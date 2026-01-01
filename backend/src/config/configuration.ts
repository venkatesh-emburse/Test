export default () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '6700', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'liveconnect',
    password: process.env.DB_PASSWORD || 'liveconnect_dev_password',
    name: process.env.DB_NAME || 'liveconnect',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  },

  // Agora
  agora: {
    appId: process.env.AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  },

  // RevenueCat
  revenueCat: {
    apiKey: process.env.REVENUECAT_API_KEY || '',
  },

  // AWS S3
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  // Feature Flags (defaults - can be overridden by admin in database)
  features: {
    freeSwipesPerDay: parseInt(process.env.DEFAULT_FREE_SWIPES_PER_DAY || '10', 10),
    freeRadiusKm: parseInt(process.env.DEFAULT_FREE_RADIUS_KM || '30', 10),
    freeMapProfiles: parseInt(process.env.DEFAULT_FREE_MAP_PROFILES || '5', 10),
    premiumRadiusKm: parseInt(process.env.DEFAULT_PREMIUM_RADIUS_KM || '100', 10),
  },
});
