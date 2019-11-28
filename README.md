# techdegree-project9

## REST API
An API built for users to administer a school database containing info about courses. Users can retrieve a list of courses, as well as add, update and delete courses.

## Getting Started
Run the following commands from the root of the folder.

First, install the project's dependencies using `npm`.

```
npm install

```

Second, seed the SQLite database.

```
npm run seed
```

And lastly, start the application.

```
npm start
```

To test the Express server, browse to the URL [http://localhost:5000/](http://localhost:5000/).

## Dependencies
- Express v4.16.3
- Express validator v6.2.0
- Basic-Auth v2.0.1
- Bcryptjs v2.4.3
- Morgan v1.9.0
- Sequelize v5.21.2
- SQLite3 v4.0.2

## Features
- Validates that required fields are filled when creating a new user or course.
- Validates that the email address being used to create a new user is valid and doesn't already exist in the database
- Validates that the currently authenticated user owns the course they are trying to edit or delete. Denies access if they are not.
- Course GET routes filter out the createdAt, updatedAt and password columns from the database tables.