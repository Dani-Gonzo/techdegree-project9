'use strict';

// load modules
const express = require('express');
const {check, validationResult} = require("express-validator");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const morgan = require('morgan');
const { sequelize, models } = require('./db');

// references to our models
const {User, Course} = models;

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
router.post("/users", [
  check("firstName").exists().withMessage("Please provide a value for 'firstName'"),
  check("lastName").exists().withMessage("Please provide a value for 'lastName'"),
  // TODO: Figure out how to validate email address is unique in the database (query database, check it against email entry)
  check("emailAddress").exists().withMessage("Please provide a value for 'emailAddress'").isEmail().withMessage("Please provide a valid email address"),
  check("password").exists().withMessage("Please provide a value for 'password'")
], async (req, res, next) => {
  // Get validation result from Request object
  const errors = validationResult(req);

  // If there are errors...
  if (!errors.isEmpty()) {
    // Map over errors object to get error messages
    const errorMessages = errors.array().map(error => error.msg);

    // Return errors to the client
    next({message: errorMessages, status: 400});
  } else {
    let user;
    try {
      user = req.body;
      user.password = bcryptjs.hashSync(user.password);
      // Get user from the request body
      await User.create(user);
      // Set status 201 Created, set Location and end
      res.status(201).setHeader("Location", "/");
      res.end();
    } catch (err) {
      next(err);
    }
  }
});

// --- Course Routes ---
// Returns list of courses
router.get("/courses", async (req, res) => {
  const courses = await Course.findAll({include: [{model: User, as: "user"}]});
  res.json(courses);
});

// Returns course (including user) for the provided id
router.get("/courses/:id", async (req, res) => {
  const course = await Course.findByPk(req.params.id, {include: [{model: User, as: "user"}]});
  res.json(course);
});

// Create course
router.post("/courses", [
  check("title").exists().withMessage("Please provide a value for 'title'"),
  check("description").exists().withMessage("Please provide a value for 'description'")
], async (req, res, next) => {
  // Get validation result from Request object
  const errors = validationResult(req);

  // If there are errors...
  if (!errors.isEmpty()) {
    // Map over errors object to get error messages
    const errorMessages = errors.array().map(error => error.msg);

    // Return errors to the client
    next({message: errorMessages, status: 400});
  } else {
    let course;
    try {
      // Get course from the request body
      course = await Course.create(req.body);
      // Set status 201 Created, set Location and end
      res.status(201).setHeader("Location", `/api/courses/${course.id}`);
      res.end();
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
});

// Update course
router.put("/courses/:id", [
  check("title").exists().withMessage("Please provide a value for 'title'"),
  check("description").exists().withMessage("Please provide a value for 'description'")
], async (req, res) => {
  // Get validation result from Request object
  const errors = validationResult(req);

  // If there are errors...
  if (!errors.isEmpty()) {
    // Map over errors object to get error messages
    const errorMessages = errors.array().map(error => error.msg);

    // Return errors to the client
    next({message: errorMessages, status: 400});
  } else {
    let course;
    try {
      course = await Course.findByPk(req.params.id);
      await course.update(req.body);
      res.status(204).end();
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
});

// Delete course
router.delete("/courses/:id", async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  await course.destroy();
  res.status(204).end();
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
