const express = require("express");
const morgan = require('morgan');
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
// const xss = require('xss-clean');

const app = express();

const stocksDataUpload = require("./populateStocks/stocksData"); 

const checkAuthRouter = require('./routes/checkAuthRoutes');
const advisorRouter = require("./routes/advisorRoutes");
const clientRouter = require("./routes/clientRoutes");
const otpRouter = require("./routes/otpRoutes");
const stockRouter = require("./routes/stockRoutes");

const AppError = require("./utils/appError");

const globalErrorHandler = require('./controllers/errorController');

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
// app.use(xss());


// Parse JSON bodies
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

function getCurrentGitBranch() {
  const { execSync } = require('child_process');
  try {
      return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
      console.error('Error getting Git branch:', error);
      return null;
  }
}

// Check if the current Git branch is 'main'
const currentBranch = getCurrentGitBranch();
const corsOrigin = 'https://invest-public.azurewebsites.net';

// Set up CORS middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'))

app.use(cookieParser());

app.use('/stocksUpload', stocksDataUpload.fillStocks);
app.use('/api/v1/check-auth', checkAuthRouter);
app.use('/api/v1/advisor', advisorRouter);
app.use('/api/v1/client', clientRouter);
app.use('/api/v1/otp', otpRouter);
app.use('/api/v1/stock', stockRouter);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find the URL: ${req.originalUrl} in this server! :(`, 404));
})

app.use(globalErrorHandler);

module.exports = app;
