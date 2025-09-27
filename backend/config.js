const dotenv = require('dotenv');
dotenv.config();

const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cross-domain-recs',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000'
};

module.exports = config;
