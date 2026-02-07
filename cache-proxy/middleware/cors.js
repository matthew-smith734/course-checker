/**
 * CORS configuration middleware
 */

// Only requests coming from the Angular UI should be accepted.
const allowedOrigins = [
  'http://localhost:4200',
  'http://angular-frontend:4200'
];

// Only allow the Angular frontend URLs to avoid accidental open proxy behavior.
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
