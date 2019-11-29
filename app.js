'use strict';

// load modules
const express = require('express');
const {check, validationResult} = require("express-validator");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const auth = require("basic-auth");
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
  try {
    await sequelize.authenticate();
    console.log('Connection to the database successful!');
  } catch (err) {
    console.log('Connection to the database failed:' + err);
  }
})();

// User authentication
const authenticateUser = async (req, res, next) => {
  let message = null;

  // Parse user's credentials from Auth header
  const credentials = auth(req);

  // If credentials are available...
  if (credentials) {
    // Attempt retrieval by emailAddress
    const user = await User.findOne({where: {emailAddress: credentials.name}});
    
    // If successfully retrieved...
    if (user) {
      // Use bcrypt to compare password to password in the data store
      const authenticated = bcryptjs.compareSync(credentials.pass, user.password);

      // If passwords match...
      if (authenticated) {
        // Store retrieved user object on req object so other middleware functions can access user info
        req.currentUser = user;
      } else {
        message = "Authentication failed";
      }
    } else {
      message = "User not found";
    }
  } else {
    message = "Auth header not found";
  }

  // If user auth failed...
  if (message) {
    console.warn(message);

    // Return message with 401 Unauthorized
    res.status(401).json({message: "Access Denied"});
  } else {
    // Or if auth succeeded...
    next();
  }
}

// TODO setup your api routes here

// --- User Routes ---
// Returns currently authenticated user
router.get("/users", authenticateUser, (req, res) => {
  const user = req.currentUser;

  res.json({
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress
  })
});

// Create user
router.post("/users", [
  check("firstName").exists().withMessage("Please provide a value for 'firstName'"),
  check("lastName").exists().withMessage("Please provide a value for 'lastName'"),
  // TODO: Figure out how to validate email address is unique in the database (query database, check it against email entry)
  check("emailAddress").exists().withMessage("Please provide a value for 'emailAddress'").isEmail().withMessage("Please provide a valid email address").custom(async (value) => {
    const userEmail = await User.findOne({where: {emailAddress: value}});
    if (userEmail !== null) {
      throw new Error("Email address is already in use");
    }
  }),
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
  const courses = await Course.findAll({
    include: [{model: User, attributes: {exclude: ['createdAt', 'updatedAt', 'password']}, as: "user"}],
    attributes: {exclude: ['createdAt', 'updatedAt']}
  });
  res.json(courses);
});

// Returns course (including user) for the provided id
router.get("/courses/:id", async (req, res) => {
  const course = await Course.findByPk(
    req.params.id, 
    {include: [{model: User, attributes: {exclude: ['createdAt', 'updatedAt', 'password']}, as: "user"}],
    attributes: {exclude: ['createdAt', 'updatedAt']}
  });
  res.json(course);
});

// Create course
router.post("/courses", [
  check("title").exists().withMessage("Please provide a value for 'title'"),
  check("description").exists().withMessage("Please provide a value for 'description'")
], authenticateUser, async (req, res, next) => {
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
], authenticateUser, async (req, res, next) => {
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
    const user = req.currentUser;
    try {
      course = await Course.findByPk(req.params.id);
      // If current user is not the id associated with course, do not allow updating
      if (user.id !== course.userId) {
        res.status(403).end();
      } else {
        await course.update(req.body);
        res.status(204).end();
      }
      
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
});

// Delete course
router.delete("/courses/:id", authenticateUser, async (req, res) => {
  const user = req.currentUser;
  const course = await Course.findByPk(req.params.id);
  // If current user is not the id associated with course, do not allow deleting
  if (user.id !== course.userId) {
    res.status(403).end();
  } else {
    await course.destroy();
    res.status(204).end();
  }
  
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
