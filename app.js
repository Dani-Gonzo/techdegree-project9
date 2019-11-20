'use strict';

// load modules
const express = require('express');
const router = express.Router();
const morgan = require('morgan');
const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./fsjstd-restapi.db"
});

// references to our models
const Course = require("./models/course")(sequelize);
const User = require("./models/user")(sequelize);

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

app.use(express.json());
app.use("/api", router);

// setup morgan which gives us http request logging
app.use(morgan('dev'));

// Database connection test
console.log('Testing the connection to the database...');

(async () => {
  console.log('Connection to the database successful!');
  await sequelize.authenticate();
})();

// TODO setup your api routes here

// --- User Routes ---
// Returns currently authenticated user
router.get("/users", (req, res) => {
  const user = req.currentUser;

  res.json({
    name: user.name,
    username: user.username
  })
});

// Create user
router.post("/users", (req, res) => {
  let user;
  // Get user from the request body
  user = User.create(req.body);
  res.redirect("/");
  
  // Set status 201 Created
  res.status(201).end();
});

// --- Course Routes ---
// Returns list of courses
router.get("/courses", async (req, res) => {
  const courses = await Course.findAll({include: [{model: User, as: "user"}]});
  res.json(courses);
});

// Returns course (including user) for the provided id
router.get("/courses/:id", async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  res.json(course);
});

// Create course
router.post("/courses", (req, res) => {

});

// Update course
router.put("/courses/:id", (req, res) => {

});

// Delete course
router.delete("/courses/:id", (req, res) => {

});


// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
