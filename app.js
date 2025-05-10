var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
require("dotenv").config();
const cors = require('cors');


var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var searchRouter = require("./routes/search");
var randomRouter = require("./routes/random");
var chatbotRouter = require("./routes/chatbot");
var translateRouter = require('./routes/translate');
var authRouter = require('./routes/auth');
var redirectRouter = require('./routes/redirect');
var deckRouter = require("./routes/deck");
var classifyRouter = require("./routes/classify");
var friendRouter = require("./routes/friend");
var badgeRouter = require("./routes/badge");

var app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
app.use(cors({ origin: '*' })); // Allow all origins

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.route('/test')
  .get((req, res) => {
    res.json({ message: "GET request to /test is working!" });
  })
  .post((req, res) => {
    res.json({ message: "POST request to /test received!", data: req.body });
  });

mongoose
  .connect(process.env.MONGO_URI, { dbName: "dictionaryDB" })
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((err) => {
    console.log("Error connecting to the database");
    console.log(err);
  });

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.render("index", {
    title: "Lacquer - Vietnamese Inspired Web Platform",
    description: "A bold and charismatic web platform inspired by Vietnamese culture",
  })
})
app.use('/users', usersRouter);
app.use('/search', searchRouter);
app.use('/random', randomRouter);
app.use('/translate', translateRouter);
app.use("/chatbot", chatbotRouter);
app.use('/auth', authRouter);
app.use("/chatbot", chatbotRouter);
app.use("/redirect", redirectRouter);
app.use("/deck", deckRouter)
app.use("/classify", classifyRouter);
app.use("/friend", friendRouter);
app.use("/badge", badgeRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // set status code
  const statusCode = err.status || 500;
  
  // check if the request accepts HTML (browser request)
  if (req.accepts('html')) {
    // render the error page for browsers
    res.status(statusCode);
    res.render("error");
  } else {
    // return JSON error for API requests
    res.status(statusCode).json({
      success: false,
      message: err.message,
      error: req.app.get("env") === "development" ? err : {},
      status: statusCode
    });
  }
});

module.exports = app;
