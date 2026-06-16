// server.js — Punto de entrada del servidor CityLight
// Estructura idéntica al server.js del profesor

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ────────────────────────────────────────────
// Igual que el profesor: CORS, JSON y logger de peticiones

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Servir los archivos HTML/CSS/JS del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── Rutas ──────────────────────────────────────────────────
// Misma forma que el profesor: un archivo por recurso

const authRouter         = require('./routes/auth.routes');
const reportesRouter     = require('./routes/reportes.routes');
const usuariosRouter     = require('./routes/usuarios.routes');
const catalogosRouter    = require('./routes/catalogos.routes');
const estadisticasRouter = require('./routes/estadisticas.routes');

app.use('/api/auth',         authRouter);         // registro y login
app.use('/api/reportes',     reportesRouter);     // CRUD de reportes
app.use('/api/usuarios',     usuariosRouter);     // gestión (admin)
app.use('/api/catalogos',    catalogosRouter);    // alcaldías, colonias, problemas (admin)
app.use('/api/estadisticas', estadisticasRouter); // resumen del sistema (autoridad/admin)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ─── Documentación de endpoints ─────────────────────────────
// Igual que el profesor: GET /api muestra todas las rutas

app.get('/api', (req, res) => {
  res.json({
    status:  'success',
    message: 'API CityLight — Sistema de Reportes de Alumbrado Público',
    endpoints: {
      auth: {
        registro: 'POST /api/auth/registro',
        login:    'POST /api/auth/login'
      },
      reportes: {
        listar:      'GET  /api/reportes',
        obtener:     'GET  /api/reportes/:id',
        crear:       'POST /api/reportes',
        actualizarEstado: 'PUT /api/reportes/:id/estado'
      },
      usuarios: {
        listar:   'GET    /api/usuarios',
        eliminar: 'DELETE /api/usuarios/:id'
      }
    }
  });
});

// ─── Ruta no encontrada ──────────────────────────────────────
app.use('/api/*path', (req, res) => {
  res.status(404).json({
    status:  'error',
    message: 'Ruta no encontrada'
  });
});

// ─── Manejador global de errores ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).json({
    status:  'error',
    message: 'Error interno del servidor'
  });
});

// ─── Iniciar servidor ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Servidor CityLight corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoints disponibles en http://localhost:${PORT}/api`);
});