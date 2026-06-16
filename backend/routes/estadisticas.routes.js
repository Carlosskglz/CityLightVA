// estadisticas.routes.js — Resumen del sistema (Autoridad/Admin)

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verificarToken } = require('../middlewares/verificarToken');

// GET /api/estadisticas — solo autoridad o administrador
router.get('/', verificarToken, async (req, res) => {
  try {
    const rol = req.usuario.rol;
    if (rol !== 'autoridad' && rol !== 'administrador') {
      return res.status(403).json({ status: 'error', message: 'Sin permisos' });
    }

    // ─── Total de reportes ────────────────────────────────────
    const [[{ total: totalReportes }]] = await db.execute(
      'SELECT COUNT(*) AS total FROM reportes'
    );

    // ─── Reportes agrupados por estado ────────────────────────
    const [porEstado] = await db.execute(`
      SELECT e.nombre_estado, COUNT(r.id_reporte) AS total
      FROM estado e
      LEFT JOIN reportes r ON e.id_estado = r.nombre_estado
      GROUP BY e.id_estado, e.nombre_estado
      ORDER BY e.id_estado ASC
    `);

    // ─── Porcentaje de resolución ──────────────────────────────
    const resueltos = porEstado.find(e => e.nombre_estado === 'Resuelto')?.total || 0;
    const porcentajeResueltos = totalReportes > 0
      ? Math.round((resueltos / totalReportes) * 100)
      : 0;

    // ─── Total de usuarios (rol "usuario") ────────────────────
    const [[{ total: totalUsuarios }]] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM usuario u
      JOIN tipos_de_usuario t ON u.id_tipoUsuario = t.id_tipoUsuario
      WHERE t.tipo_usuario = 'usuario'
    `);

    // ─── Usuarios nuevos en los últimos 7 días ────────────────
    const [[{ total: usuariosNuevos }]] = await db.execute(`
      SELECT COUNT(*) AS total FROM usuario
      WHERE fecha_registro >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // ─── Reportes nuevos en los últimos 7 días ────────────────
    const [[{ total: reportesNuevos }]] = await db.execute(`
      SELECT COUNT(*) AS total FROM reportes
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // ─── Top 5 alcaldías con más reportes ─────────────────────
    const [topAlcaldias] = await db.execute(`
      SELECT a.nombre_alcaldia, COUNT(r.id_reporte) AS total
      FROM reportes r
      JOIN ubicacion u ON r.id_ubicacion   = u.id_ubicacion
      JOIN alcaldia  a ON u.nombre_alcaldia = a.id_alcaldia
      GROUP BY a.id_alcaldia, a.nombre_alcaldia
      ORDER BY total DESC
      LIMIT 5
    `);

    res.json({
      status: 'success',
      data: {
        totalReportes,
        porEstado,
        porcentajeResueltos,
        totalUsuarios,
        usuariosNuevos,
        reportesNuevos,
        topAlcaldias
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;