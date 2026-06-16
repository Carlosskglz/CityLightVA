// db.js — Conexión a MySQL
 
const mysql = require('mysql2');
require('dotenv').config();
 
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:  10,   // máximo 10 conexiones simultáneas
  queueLimit:       0     // sin límite de peticiones en espera
});
 
// Verificar que MySQL responde al arrancar
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
    return;
  }
  console.log('✅ Conexión a MySQL exitosa');
  connection.release();
});
 
module.exports = pool.promise();