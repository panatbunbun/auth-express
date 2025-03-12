const cors = require("cors");
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:8888", "http://127.0.0.1:5500"],
  }),
);
app.use(cookieParser());

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  }),
);

const port = 8000;
const secret = "mysecret";

let conn = null;

// function init connection mysql
const initMySQL = async () => {
  conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "tutorial",
    port: 8880
  });
};

/* เราจะแก้ไข code ที่อยู่ตรงกลาง */

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const userData = {
      email,
      password: passwordHash
    }

    const [results] = await conn.query('INSERT INTO user SET ?', userData);
    res.json({
      message: 'Register success',
      results
    })
  } catch (error) {
    console.log('error', error);
    res.json({
      message: 'Register failed',
      error
    })
  }
});

app.post('/api/login', async (req, res) => {
  try {  const { email, password } = req.body;
  const [results] = await conn.query('SELECT * FROM user WHERE email = ?', [email]);
  const userData = results[0];
  const match = await bcrypt.compare(password, userData.password);
  if (!match) {
    res.status(400).json({ 
      message: 'Login failed wrong email or password' 
    });
    return false
  }

  //สร้าง token jwt token
  const token = jwt.sign({ email, role: 'Admin' }, secret, { expiresIn: '1h' });
  res.json({ 
    message: 'Login success',
    token
  });
 } catch (error) {
  res.status(401).json ({
    message: 'Login failed' , error
  })
 }
});

app.get('/api/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let authToken = null;
    if (authHeader) {
      authToken = authHeader.split(' ')[1];
    }
    console.log('authToken', authToken);
    const user = jwt.verify(authToken, secret);
    console.log('user', user.email);

    const [checkResults] = await conn.query('SELECT * FROM user WHERE email = ?', [user.email]);
    if (!checkResults[0]) {
      throw {message: 'not found user'}
    }

    const [results] = await conn.query('SELECT * FROM user');
    res.json({
      user: results
    })
  } catch (error) {
    res.status(403).json ({
      message: 'Authentical failed' , error
    })
  }
})

// Listen
app.listen(port, async () => {
  await initMySQL();
  console.log("Server started at port 8000");
});
