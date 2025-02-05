// const mysql = require("mysql");
// require("dotenv").config();

// const db = mysql.createConnection({
//   host: "127.0.0.1",
//   user: "genicminds_PetgroomDB",
//   password: "uive6ORDxdT3",
//   database: "genicminds_PetgroomDB",
// });

// db.connect((err) => {
//   if (err) throw err;
//   console.log("Connected to MySQL Database.");
// });

// module.exports = db;


const mysql = require("mysql");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    return;
  }
  console.log("Connected to MySQL Database.");
});

module.exports = db;
