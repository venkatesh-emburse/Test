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

  // Cloudinary (for photo/video uploads)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Admin (manual review)
  admin: {
    apiKey: process.env.ADMIN_API_KEY || 'dev-admin-key',
  },

  // Admin JWT (separate from app user JWT)
  adminJwt: {
    secret: process.env.ADMIN_JWT_SECRET || 'admin-dev-secret',
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h',
  },

  // Email (Nodemailer / Gmail SMTP)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '', // Gmail App Password
    from: process.env.EMAIL_FROM || 'LiveConnect <noreply@liveconnect.app>',
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  // MVP Feature Settings (all features free with configurable limits)
  features: {
    // Daily limits (MVP: generous limits for all users)
    swipesPerDay: parseInt(process.env.SWIPES_PER_DAY || '50', 10),
    superLikesPerDay: parseInt(process.env.SUPER_LIKES_PER_DAY || '5', 10),

    // Discovery settings
    maxRadiusKm: parseInt(process.env.MAX_RADIUS_KM || '100', 10),
    mapProfilesLimit: parseInt(process.env.MAP_PROFILES_LIMIT || '50', 10),
  },
});
