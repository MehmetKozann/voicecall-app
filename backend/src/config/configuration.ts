export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-32-chars-long',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-32-chars-long',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '30d',
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    publicUrl: process.env.STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads',
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      bucket: process.env.S3_BUCKET_NAME,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  },
});
