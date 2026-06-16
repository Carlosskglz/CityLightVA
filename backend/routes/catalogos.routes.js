// catalogos.routes.js — Gestión de catálogos (Administrador)
// Permite agregar y eliminar: alcaldías, colonias y tipos de falla
// Todas las rutas requieren rol "administrador"

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verificarToken, verificarRol } = require('../middlewares/verificarToken');

// Todas las rutas de este archivo requieren ser administrador
router.use(verificarToken, verificarRol('administrador'));

// ============================================================
// ALCALDÍAS
// ============================================================

// GET /api/catalogos/alcaldias
router.get('/alcaldias', async (req, res) => {
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

// POST /api/catalogos/alcaldias
router.post('/alcaldias', async (req, res) => {
  try {
    const { nombre_alcaldia } = req.body;

    if (!nombre_alcaldia || nombre_alcaldia.trim().length < 2) {
      return res.status(400).json({ status: 'error', message: 'El nombre debe tener al menos 2 caracteres' });
    }

    // Evitar duplicados (sin importar mayúsculas/minúsculas)
    const [existente] = await db.execute(
      'SELECT id_alcaldia FROM alcaldia WHERE LOWER(nombre_alcaldia) = LOWER(?)',
      [nombre_alcaldia.trim()]
    );
    if (existente.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Esa alcaldía ya existe' });
    }

    const [resultado] = await db.execute(
      'INSERT INTO alcaldia (nombre_alcaldia) VALUES (?)',
      [nombre_alcaldia.trim()]
    );

    res.status(201).json({
      status:  'success',
      message: 'Alcaldía agregada correctamente',
      data: { id_alcaldia: resultado.insertId, nombre_alcaldia: nombre_alcaldia.trim() }
    });

  } catch (error) {
    console.error('Error al crear alcaldía:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// DELETE /api/catalogos/alcaldias/:id
router.delete('/alcaldias/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existente] = await db.execute('SELECT id_alcaldia FROM alcaldia WHERE id_alcaldia = ?', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Alcaldía no encontrada' });
    }

    await db.execute('DELETE FROM alcaldia WHERE id_alcaldia = ?', [id]);

    res.json({ status: 'success', message: 'Alcaldía eliminada correctamente' });

  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        status:  'error',
        message: 'No se puede eliminar: tiene colonias o reportes asociados'
      });
    }
    console.error('Error al eliminar alcaldía:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});


// ============================================================
// COLONIAS
// ============================================================

// GET /api/catalogos/colonias — todas, con el nombre de su alcaldía
router.get('/colonias', async (req, res) => {
  try {
    const [colonias] = await db.execute(`
      SELECT c.id_colonia, c.nombre_colonia, c.id_alcaldia, a.nombre_alcaldia
      FROM colonia c
      JOIN alcaldia a ON c.id_alcaldia = a.id_alcaldia
      ORDER BY a.nombre_alcaldia ASC, c.nombre_colonia ASC
    `);
    res.json({ status: 'success', data: colonias });
  } catch (error) {
    console.error('Error al listar colonias:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// POST /api/catalogos/colonias
router.post('/colonias', async (req, res) => {
  try {
    const { nombre_colonia, id_alcaldia } = req.body;

    if (!nombre_colonia || nombre_colonia.trim().length < 2) {
      return res.status(400).json({ status: 'error', message: 'El nombre debe tener al menos 2 caracteres' });
    }
    if (!id_alcaldia) {
      return res.status(400).json({ status: 'error', message: 'Selecciona la alcaldía a la que pertenece' });
    }

    // Verificar que la alcaldía exista
    const [alcaldia] = await db.execute('SELECT id_alcaldia FROM alcaldia WHERE id_alcaldia = ?', [id_alcaldia]);
    if (alcaldia.length === 0) {
      return res.status(404).json({ status: 'error', message: 'La alcaldía seleccionada no existe' });
    }

    // Evitar duplicados dentro de la misma alcaldía
    const [existente] = await db.execute(
      'SELECT id_colonia FROM colonia WHERE LOWER(nombre_colonia) = LOWER(?) AND id_alcaldia = ?',
      [nombre_colonia.trim(), id_alcaldia]
    );
    if (existente.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Esa colonia ya existe en esa alcaldía' });
    }

    const [resultado] = await db.execute(
      'INSERT INTO colonia (nombre_colonia, id_alcaldia) VALUES (?, ?)',
      [nombre_colonia.trim(), id_alcaldia]
    );

    res.status(201).json({
      status:  'success',
      message: 'Colonia agregada correctamente',
      data: { id_colonia: resultado.insertId, nombre_colonia: nombre_colonia.trim(), id_alcaldia }
    });

  } catch (error) {
    console.error('Error al crear colonia:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// DELETE /api/catalogos/colonias/:id
router.delete('/colonias/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existente] = await db.execute('SELECT id_colonia FROM colonia WHERE id_colonia = ?', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Colonia no encontrada' });
    }

    await db.execute('DELETE FROM colonia WHERE id_colonia = ?', [id]);

    res.json({ status: 'success', message: 'Colonia eliminada correctamente' });

  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        status:  'error',
        message: 'No se puede eliminar: tiene reportes asociados a esta colonia'
      });
    }
    console.error('Error al eliminar colonia:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});


// ============================================================
// TIPOS DE PROBLEMA (FALLA)
// ============================================================

// GET /api/catalogos/problemas
router.get('/problemas', async (req, res) => {
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

// POST /api/catalogos/problemas
router.post('/problemas', async (req, res) => {
  try {
    const { tipo_problema } = req.body;

    if (!tipo_problema || tipo_problema.trim().length < 3) {
      return res.status(400).json({ status: 'error', message: 'El nombre debe tener al menos 3 caracteres' });
    }

    const [existente] = await db.execute(
      'SELECT id_problema FROM problema WHERE LOWER(tipo_problema) = LOWER(?)',
      [tipo_problema.trim()]
    );
    if (existente.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ese tipo de falla ya existe' });
    }

    const [resultado] = await db.execute(
      'INSERT INTO problema (tipo_problema) VALUES (?)',
      [tipo_problema.trim()]
    );

    res.status(201).json({
      status:  'success',
      message: 'Tipo de falla agregado correctamente',
      data: { id_problema: resultado.insertId, tipo_problema: tipo_problema.trim() }
    });

  } catch (error) {
    console.error('Error al crear problema:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// DELETE /api/catalogos/problemas/:id
router.delete('/problemas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existente] = await db.execute('SELECT id_problema FROM problema WHERE id_problema = ?', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Tipo de falla no encontrado' });
    }

    await db.execute('DELETE FROM problema WHERE id_problema = ?', [id]);

    res.json({ status: 'success', message: 'Tipo de falla eliminado correctamente' });

  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        status:  'error',
        message: 'No se puede eliminar: hay reportes que usan este tipo de falla'
      });
    }
    console.error('Error al eliminar problema:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;