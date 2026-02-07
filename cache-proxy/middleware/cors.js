/**
 * CORS configuration middleware
 */

// Read allowed origins from the environment so deployments can add new hosts without editing code.
const defaultOrigins = ['http://localhost:4200', 'http://angular-frontend:4200'];
const allowedOrigins = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0)
  : defaultOrigins);

// Prevent this cache proxy from acting as an open proxy by whitelisting only trusted origins.
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept'
  ]
};

module.exports = corsOptions;
