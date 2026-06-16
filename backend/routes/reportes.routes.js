// reportes.routes.js
// IMPORTANTE: el orden de las rutas importa.
// Las rutas específicas (/todos, /mis-reportes, /catalogos/...)
// deben ir ANTES de la ruta dinámica (/:id)

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const upload  = require('../middlewares/upload');
const { verificarToken, verificarRol } = require('../middlewares/verificarToken');

// ============================================================
// CATÁLOGOS — para llenar los <select> del formulario
// ============================================================

// GET /api/reportes/catalogos/alcaldias
router.get('/catalogos/alcaldias', async (req, res) => {
  try {
    const [alcaldias] = await db.execute(
      'SELECT id_alcaldia, nombre_alcaldia FROM alcaldia ORDER BY nombre_alcaldia ASC'
    );
    res.json({ status: 'success', data: alcaldias });
  } catch (error) {
    console.error('Error al listar alcaldías:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// GET /api/reportes/catalogos/colonias/:id_alcaldia
router.get('/catalogos/colonias/:id_alcaldia', async (req, res) => {
  try {
    const { id_alcaldia } = req.params;
    const [colonias] = await db.execute(
      'SELECT id_colonia, nombre_colonia FROM colonia WHERE id_alcaldia = ? ORDER BY nombre_colonia ASC',
      [id_alcaldia]
    );
    res.json({ status: 'success', data: colonias });
  } catch (error) {
    console.error('Error al listar colonias:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// GET /api/reportes/catalogos/problemas
router.get('/catalogos/problemas', async (req, res) => {
  try {
    const [problemas] = await db.execute(
      'SELECT id_problema, tipo_problema FROM problema ORDER BY id_problema ASC'
    );
    res.json({ status: 'success', data: problemas });
  } catch (error) {
    console.error('Error al listar problemas:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/reportes/mis-reportes — Reportes del usuario logueado
// ============================================================
router.get('/mis-reportes', verificarToken, async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    const [reportes] = await db.execute(
      `SELECT
         r.id_reporte, r.folio, r.fecha_creacion, r.imagen,
         e.nombre_estado AS estado,
         p.tipo_problema, d.desc_extra,
         a.nombre_alcaldia, c.nombre_colonia, u.calle, u.numero_casa
       FROM reportes r
       JOIN estado     e  ON r.nombre_estado  = e.id_estado
       JOIN descripcion d ON r.id_descripcion = d.id_descripcion
       JOIN problema   p  ON d.tipo_problema  = p.id_problema
       JOIN ubicacion  u  ON r.id_ubicacion   = u.id_ubicacion
       JOIN colonia    c  ON u.nombre_colonia  = c.id_colonia
       JOIN alcaldia   a  ON u.nombre_alcaldia = a.id_alcaldia
       WHERE r.id_usuario = ?
       ORDER BY r.fecha_creacion DESC`,
      [id_usuario]
    );

    res.json({ status: 'success', data: reportes, count: reportes.length });

  } catch (error) {
    console.error('Error al listar mis reportes:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/reportes/todos — Todos los reportes (autoridad/admin)
// Soporta filtros: ?estado=Pendiente&alcaldia=Iztapalapa&desde=2026-01-01
// ============================================================
router.get('/todos', verificarToken, async (req, res) => {
  try {
    const rol = req.usuario.rol;
    if (rol !== 'autoridad' && rol !== 'administrador') {
      return res.status(403).json({ status: 'error', message: 'Sin permisos' });
    }

    const { estado, alcaldia, desde } = req.query;

    let query = `
      SELECT
        r.id_reporte, r.folio, r.fecha_creacion, r.imagen,
        e.nombre_estado AS estado,
        p.tipo_problema, d.tiempo_falla,
        a.nombre_alcaldia, c.nombre_colonia, u.calle
      FROM reportes r
      JOIN estado     e  ON r.nombre_estado  = e.id_estado
      JOIN descripcion d ON r.id_descripcion = d.id_descripcion
      JOIN problema   p  ON d.tipo_problema  = p.id_problema
      JOIN ubicacion  u  ON r.id_ubicacion   = u.id_ubicacion
      JOIN colonia    c  ON u.nombre_colonia  = c.id_colonia
      JOIN alcaldia   a  ON u.nombre_alcaldia = a.id_alcaldia
      WHERE 1=1
    `;

    const valores = [];

    if (estado) {
      query += ' AND e.nombre_estado = ?';
      valores.push(estado);
    }
    if (alcaldia) {
      query += ' AND a.nombre_alcaldia = ?';
      valores.push(alcaldia);
    }
    if (desde) {
      query += ' AND r.fecha_creacion >= ?';
      valores.push(desde);
    }

    query += ' ORDER BY r.fecha_creacion DESC';

    const [reportes] = await db.execute(query, valores);
    res.json({ status: 'success', data: reportes, count: reportes.length });

  } catch (error) {
    console.error('Error al listar todos los reportes:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// POST /api/reportes — Crear nuevo reporte (solo usuarios)
// ============================================================
function validarReporte(datos) {
  const errores = [];
  if (!datos.id_alcaldia)   errores.push('Selecciona una alcaldía');
  if (!datos.id_colonia)    errores.push('Selecciona una colonia');
  if (!datos.calle || datos.calle.trim() === '') errores.push('La calle es obligatoria');
  if (!datos.numero_casa || datos.numero_casa.trim() === '') errores.push('El número es obligatorio');
  if (!datos.id_problema)   errores.push('Selecciona el tipo de problema');
  if (!datos.desc_extra || datos.desc_extra.trim().length < 5) {
    errores.push('La descripción debe tener al menos 5 caracteres');
  }
  return errores;
}

router.post('/', verificarToken, upload.single('imagen'), async (req, res) => {
  try {
    const errores = validarReporte(req.body);
    if (errores.length > 0) {
      return res.status(400).json({ status: 'error', message: errores.join('; ') });
    }

    const {
      id_alcaldia, id_colonia, calle, numero_casa,
      id_problema, tiempo_falla, desc_extra
    } = req.body;

    const id_usuario = req.usuario.id_usuario;
    const rutaImagen = req.file ? `uploads/${req.file.filename}` : null;

    // Crear ubicacion
    const [ubicacion] = await db.execute(
      `INSERT INTO ubicacion (nombre_colonia, nombre_alcaldia, numero_casa, calle)
       VALUES (?, ?, ?, ?)`,
      [id_colonia, id_alcaldia, numero_casa.trim(), calle.trim()]
    );
    const id_ubicacion = ubicacion.insertId;

    // Crear descripcion
    const [descripcion] = await db.execute(
      `INSERT INTO descripcion (tipo_problema, tiempo_falla, desc_extra)
       VALUES (?, ?, ?)`,
      [id_problema, tiempo_falla || null, desc_extra.trim()]
    );
    const id_descripcion = descripcion.insertId;

    // Crear reporte (estado 1 = Pendiente)
    const [reporte] = await db.execute(
      `INSERT INTO reportes (id_ubicacion, nombre_estado, id_descripcion, imagen, id_usuario)
       VALUES (?, 1, ?, ?, ?)`,
      [id_ubicacion, id_descripcion, rutaImagen, id_usuario]
    );
    const id_reporte = reporte.insertId;

    // Asignar folio
    await db.execute('UPDATE reportes SET folio = ? WHERE id_reporte = ?', [id_reporte, id_reporte]);

    res.status(201).json({
      status:  'success',
      message: 'Reporte creado correctamente',
      data:    { id_reporte, folio: id_reporte, imagen: rutaImagen }
    });

  } catch (error) {
    console.error('Error al crear reporte:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// GET /api/reportes/:id — Detalle de un reporte específico
// IMPORTANTE: esta ruta siempre va después de /mis-reportes y /todos
// ============================================================
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id }     = req.params;
    const id_usuario = req.usuario.id_usuario;
    const rol        = req.usuario.rol;

    const [reportes] = await db.execute(
      `SELECT
         r.id_reporte, r.id_usuario, r.folio, r.fecha_creacion,
         r.fecha_actualizacion, r.imagen,
         e.nombre_estado AS estado,
         p.tipo_problema, d.desc_extra, d.tiempo_falla,
         a.nombre_alcaldia, c.nombre_colonia, u.calle, u.numero_casa
       FROM reportes r
       JOIN estado     e  ON r.nombre_estado  = e.id_estado
       JOIN descripcion d ON r.id_descripcion = d.id_descripcion
       JOIN problema   p  ON d.tipo_problema  = p.id_problema
       JOIN ubicacion  u  ON r.id_ubicacion   = u.id_ubicacion
       JOIN colonia    c  ON u.nombre_colonia  = c.id_colonia
       JOIN alcaldia   a  ON u.nombre_alcaldia = a.id_alcaldia
       WHERE r.id_reporte = ?`,
      [id]
    );

    if (reportes.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reporte no encontrado' });
    }

    const reporte = reportes[0];

    // Un usuario solo puede ver SUS propios reportes
    if (rol === 'usuario' && reporte.id_usuario !== id_usuario) {
      return res.status(403).json({ status: 'error', message: 'No tienes permiso para ver este reporte' });
    }

    res.json({ status: 'success', data: reporte });

  } catch (error) {
    console.error('Error al obtener reporte:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// PUT /api/reportes/:id/estado — Actualizar estado (autoridad/admin)
// ============================================================
router.put('/:id/estado', verificarToken, async (req, res) => {
  try {
    const rol = req.usuario.rol;
    if (rol !== 'autoridad' && rol !== 'administrador') {
      return res.status(403).json({ status: 'error', message: 'Sin permisos' });
    }

    const { id }      = req.params;
    const { id_estado } = req.body;

    if (!id_estado) {
      return res.status(400).json({ status: 'error', message: 'El nuevo estado es obligatorio' });
    }

    const [existente] = await db.execute(
      'SELECT id_reporte FROM reportes WHERE id_reporte = ?', [id]
    );
    if (existente.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reporte no encontrado' });
    }

    await db.execute(
      `UPDATE reportes
       SET nombre_estado = ?, fecha_actualizacion = NOW(), id_autoridad = ?
       WHERE id_reporte = ?`,
      [id_estado, req.usuario.id_usuario, id]
    );

    res.json({ status: 'success', message: 'Estado actualizado correctamente' });

  } catch (error) {
    console.error('Error al actualizar estado:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// DELETE /api/reportes/:id — Eliminar reporte (solo admin)
// ============================================================
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({ status: 'error', message: 'Sin permisos' });
    }

    const { id } = req.params;

    const [existente] = await db.execute(
      'SELECT id_reporte FROM reportes WHERE id_reporte = ?', [id]
    );
    if (existente.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reporte no encontrado' });
    }

    await db.execute('DELETE FROM reportes WHERE id_reporte = ?', [id]);

    res.json({ status: 'success', message: `Reporte #${id} eliminado correctamente` });

  } catch (error) {
    console.error('Error al eliminar reporte:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;