// Require the express web application framework (https://expressjs.com)
const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');     // Added to support access to file system paths

const app = express();
const port = 3000;

const bcrypt = require('bcrypt');
const saltRounds = 10; // Number of salt rounds for bcrypt

let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('myDB');




async function registerUser(email, password, firstName, lastName, dateCreated, dateEdited, req, res) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user data into the database
    const sql = 'INSERT INTO UserDetails (email, actualPassword, salt, hashedPassword, firstName, lastName, dateCreated, dateEdited) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [email, password, salt, hashedPassword, firstName, lastName, dateCreated, dateEdited];
    db.run(sql, values, (err, result) => {
      if (err) {
        console.error('Error registering user:', err);
        return;
      }
      console.log('User registered successfully');
      console.log(result)
      res.render('login-page', {title: "Please Log In", isAuthenticated: !!req.session.userId});
    });
  } catch (error) {
    console.error('Error registering user:', error);
  }
}

async function loginUser(email, password, req, res) {
  try {
    // Retrieve user data from the database
    const sql = 'SELECT * FROM UserDetails WHERE email = ?';
    db.all(sql, [email], async (err, results) => {
      if (err) {
        console.error('Error retrieving user:', err);
        return;
      }
      if (results.length === 0) {
        console.log('User not found');
        return;
      }
      const user = results[0];

      // Compare the provided password with the stored hashed password
      const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);
      if (isPasswordMatch) {
        console.log('Login successful');
        let userID = email;
        console.log(userID)
        
        req.session.userId = userID;
        res.render('index', {title: "Logged In", isAuthenticated: !!req.session.userId});
      } else {
        console.log('Invalid username or password');
        res.render('login-page', {title: "Invalid Username or Password", isAuthenticated: !!req.session.userId});
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
  }
}


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


function isAuthenticated(req, res, next) {
  if (req.session.userId) {
      // User is authenticated
      next();
  } else {
      // User is not authenticated, redirect to login page or send an error response
      res.redirect('/login-page');
  }
}


// Set up session middleware
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret:"Morelasdshdgfhdjlf;kand123423",
  })
);


app.use(express.static('public'));

// Have the logging code 
app.use(morgan('common'));

//Here we are configuring express to use body-parser as middle-ware.
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res, next) => {
  res.render('index', {title: "Moreland Photography Studio", isAuthenticated: !!req.session.userId});
});


app.get('/about-us', (req, res, next) => {
  res.render('about-us', {title: "About Us", isAuthenticated: !!req.session.userId});
});

app.get('/news', (req, res, next) => {
  res.render('news', {title: "Latest News", isAuthenticated: !!req.session.userId});
});

app.get('/photography', (req, res, next) => {
  res.render('photography', {title: "Photography", isAuthenticated: !!req.session.userId});
});

app.get('/login-page', (req, res, next) => {
  res.render('login-page', {title: "Log In to your Moreland Photography Studio account", isAuthenticated: !!req.session.userId});
});

app.post('/login', async(req, res, next) => {
  let email = req.body.email.toLowerCase();
  let password = req.body.password;

  try {
    await loginUser(email, password, req, res);
    // res.status(200).send('Login successful');
} catch (error) {
    console.error('Error logging in:', error);
    res.redirect("/login-page")
}
});

app.get('/register-page', (req, res, next) => {
  res.render('register-page', {title: "Register", isAuthenticated: !!req.session.userId});
});

app.post('/register', async(req, res, next) => {
  let email = req.body.email.toLowerCase();
  let password = req.body.password;
  let firstName = req.body.fname;
  let lastName = req.body.lname;
  let dateCreated = new Date().toDateString();
  let dateEdited = new Date().toDateString();

  try {
    await registerUser(email, password, firstName, lastName, dateCreated, dateEdited, req, res);
    // res.status(200).send('User registered successfully');
} catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Internal Server Error');
}
});

app.get('/account-changes-page', isAuthenticated, (req, res, next) => {
  res.render('account-changes-page', {title: "Change Account Details", isAuthenticated: !!req.session.userId});
});


app.post('/change-email', async (req, res, next) => {
  let newEmail = req.body.new_email.toLowerCase();
  let dateEdited = new Date().toDateString();
  let currentEmail = req.session.userId;

  const sql = 'UPDATE UserDetails SET email = ?, dateEdited = ? WHERE email = ?';
  const values = [newEmail, dateEdited, currentEmail];
  db.run(sql, values, (err, result) => {
    if (err) {
      console.error('Error changing email:', err);
      return;
    }
    console.log('Email changed successfully');
    req.session.userId = newEmail;
    res.redirect('/logout');
  });
});

app.post('/change-password', async (req, res, next) => {
  let newPassword = req.body.new_password;
  let currentPassword = req.body.current_password;
  let dateEdited = new Date().toDateString();
  let currentEmail = req.session.userId;


  db.all(`SELECT * FROM UserDetails WHERE email = "${req.session.userId}"`, async function (err, rows) {
    if (err) {
      return console.error(err.message);
    } else {
      let oldPassword = rows[0].hashedPassword

      const isPasswordMatch = await bcrypt.compare(currentPassword, oldPassword);
      if (isPasswordMatch) {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        const sql = 'UPDATE UserDetails SET actualPassword = ?, salt = ?, hashedPassword = ?, dateEdited = ? WHERE email = ?';
        const values = [newPassword, salt, hashedPassword, dateEdited, currentEmail];
        db.run(sql, values, (err, result) => {
          if (err) {
            console.error('Error changing password:', err);
            return;
          }
          console.log('Password changed successfully');
          res.redirect('/logout');
        });
      } else {
        console.log('Current password does not match user details.');
      }
    }
  })
});


app.post('/change-firstname', async (req, res, next) => {
  let newFirstName = req.body.new_fname;
  let dateEdited = new Date().toDateString();
  let currentEmail = req.session.userId;

  const sql = 'UPDATE UserDetails SET firstName = ?, dateEdited = ? WHERE email = ?';
  const values = [newFirstName, dateEdited, currentEmail];
  db.run(sql, values, (err, result) => {
    if (err) {
      console.error('Error changing first name:', err);
      return;
    }
    console.log('First name changed successfully');
    res.redirect('/user-details');
  });
});


app.post('/change-lastname', async (req, res, next) => {
  let newLastName = req.body.new_lname;
  let dateEdited = new Date().toDateString();
  let currentEmail = req.session.userId;

  const sql = 'UPDATE UserDetails SET lastName = ?, dateEdited = ? WHERE email = ?';
  const values = [newLastName, dateEdited, currentEmail];
  db.run(sql, values, (err, result) => {
    if (err) {
      console.error('Error changing last name:', err);
      return;
    }
    console.log('Last name changed successfully');
    res.redirect('/user-details');
  });
});



app.get('/user-details', isAuthenticated, (req, res, next) => {
  console.log(req.session.userId)
  console.log('Session ID:', req.session);
  db.all(`SELECT * FROM UserDetails WHERE email = "${req.session.userId}"`, function (err, rows) {
    if (err) {
      return console.error(err.message);
    } else {
      let data = rows;

      res.render('user-details', { 
        title: "User Details",
        data: data, 
        isAuthenticated: !!req.session.userId
      });
    }
  });
});

app.get('/user-details-change', (req, res) => {
  res.render('user-details', { 
    title: "User Details",
    data: data, 
    isAuthenticated: !!req.session.userId
  });
});


app.get('/logout', (req, res) => {  
  req.session.destroy((err) => {
      if (err) {
          console.error('Error destroying session:', err);
      } else {
        const isAuthenticated = false; 
        res.render('login-page', { isAuthenticated, title: "You have been logged Out. Please log in again with your new details."});
      }
  });
});


app.use((req, res) => {
  res.status(404);
  const isAuthenticated = req.session && req.session.userId;
  res.render('404', { message: '404 - Not Found', url: req.url , title: "404 - Not Found", isAuthenticated});
})

// The final error handler uses the temaplte error.ejs
app.use((error, request, response, next) => {
  let errorStatus = error.status || 500;
  response.status(errorStatus);
  const isAuthenticated = request.session && request.session.userId;
  response.render('error', { title: '5xx', message: '5xx - System error', error: error, isAuthenticated});
});

// Tell our application to listen to requests at port 3000 on the localhost
app.listen(port, () => {
  console.log(`Web server running at: http://localhost:${port}`)
  console.log(`Type Ctrl+C to shut down the web server`)
})
