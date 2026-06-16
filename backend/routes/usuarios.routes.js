// usuarios.routes.js — Gestión de cuentas (Administrador)

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { verificarToken, verificarRol } = require('../middlewares/verificarToken');

// ============================================================
// GET /api/usuarios — Listar todas las cuentas (solo admin)
// ============================================================
router.get('/', verificarToken, verificarRol('administrador'), async (req, res) => {
  try {
    const [usuarios] = await db.execute(
      `SELECT u.id_usuario, u.nombre_usuario, u.correo_usuario, u.telefono_usuario,
              u.fecha_registro, u.activo, u.reportado, u.motivo_reporte,
              t.tipo_usuario AS rol
       FROM usuario u
       JOIN tipos_de_usuario t ON u.id_tipoUsuario = t.id_tipoUsuario
       ORDER BY u.id_usuario ASC`
    );
    res.json({ status: 'success', data: usuarios, count: usuarios.length });
  } catch (error) {
    console.error('Error al listar usuarios:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// FUNCIÓN: Validar datos de nuevo empleado (autoridad/admin)
// ============================================================
function validarEmpleado(datos) {
  const errores = [];

  if (!datos.nombre_usuario || datos.nombre_usuario.trim().length < 2) {
    errores.push('El nombre es obligatorio (mínimo 2 caracteres)');
  }

  if (!datos.correo_usuario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo_usuario)) {
    errores.push('El correo no es válido');
  }

  if (!datos.telefono_usuario || !/^[0-9]{10}$/.test(datos.telefono_usuario.trim())) {
    errores.push('El teléfono debe tener exactamente 10 dígitos');
  }

  if (!datos.contrasena_usuario || datos.contrasena_usuario.length < 8) {
    errores.push('La contraseña debe tener mínimo 8 caracteres');
  }

  if (!['autoridad', 'administrador'].includes(datos.rol)) {
    errores.push('El rol debe ser "autoridad" o "administrador"');
  }

  return errores;
}

// ============================================================
// POST /api/usuarios — Crear cuenta de autoridad o admin
// ============================================================
router.post('/', verificarToken, verificarRol('administrador'), async (req, res) => {
  try {
    const errores = validarEmpleado(req.body);
    if (errores.length > 0) {
      return res.status(400).json({ status: 'error', message: errores.join('; ') });
    }

    const { nombre_usuario, correo_usuario, telefono_usuario, contrasena_usuario, rol } = req.body;

    // Verificar correo no exista
    const [existente] = await db.execute(
      'SELECT id_usuario FROM usuario WHERE correo_usuario = ?',
      [correo_usuario.trim().toLowerCase()]
    );
    if (existente.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ya existe una cuenta con ese correo' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena_usuario, 10);

    // id_tipoUsuario: 2 = autoridad, 3 = administrador
    const idTipo = rol === 'autoridad' ? 2 : 3;

    const [resultado] = await db.execute(
      `INSERT INTO usuario (id_tipoUsuario, nombre_usuario, contrasena_usuario, correo_usuario, telefono_usuario)
       VALUES (?, ?, ?, ?, ?)`,
      [idTipo, nombre_usuario.trim(), contrasenaHash, correo_usuario.trim().toLowerCase(), telefono_usuario.trim()]
    );

    res.status(201).json({
      status:  'success',
      message: `Cuenta de ${rol} creada correctamente`,
      data: { id_usuario: resultado.insertId, nombre_usuario: nombre_usuario.trim(), rol }
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'Ya existe una cuenta con ese correo' });
    }
    console.error('Error al crear empleado:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// PUT /api/usuarios/:id/baneo — Banear o reactivar cuenta (admin)
// ============================================================
router.put('/:id/baneo', verificarToken, verificarRol('administrador'), async (req, res) => {
  try {
    const { id } = req.params;

    // El admin no puede banearse a sí mismo
    if (parseInt(id) === req.usuario.id_usuario) {
      return res.status(400).json({ status: 'error', message: 'No puedes banear tu propia cuenta' });
    }

    const [usuarios] = await db.execute('SELECT activo FROM usuario WHERE id_usuario = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const nuevoEstado = usuarios[0].activo ? 0 : 1; // toggle

    await db.execute('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [nuevoEstado, id]);

    res.json({
      status:  'success',
      message: nuevoEstado ? 'Cuenta reactivada' : 'Cuenta baneada',
      data: { activo: !!nuevoEstado }
    });

  } catch (error) {
    console.error('Error al banear/reactivar:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// PUT /api/usuarios/:id/reportar — Autoridad marca a un usuario
// ============================================================
router.put('/:id/reportar', verificarToken, verificarRol('autoridad'), async (req, res) => {
  try {
    const { id }     = req.params;
    const { motivo } = req.body;

    if (!motivo || motivo.trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Describe el motivo del reporte (mínimo 5 caracteres)' });
    }

    const [usuarios] = await db.execute('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    await db.execute(
      'UPDATE usuario SET reportado = 1, motivo_reporte = ? WHERE id_usuario = ?',
      [motivo.trim(), id]
    );

    res.json({ status: 'success', message: 'Usuario marcado para revisión del administrador' });

  } catch (error) {
    console.error('Error al reportar usuario:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// PUT /api/usuarios/:id/quitar-reporte — Admin descarta la marca
// ============================================================
router.put('/:id/quitar-reporte', verificarToken, verificarRol('administrador'), async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      'UPDATE usuario SET reportado = 0, motivo_reporte = NULL WHERE id_usuario = ?',
      [id]
    );

    res.json({ status: 'success', message: 'Marca de reporte eliminada' });

  } catch (error) {
    console.error('Error al quitar reporte:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// DELETE /api/usuarios/:id — Eliminar cuenta (admin)
// ============================================================
router.delete('/:id', verificarToken, verificarRol('administrador'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.usuario.id_usuario) {
      return res.status(400).json({ status: 'error', message: 'No puedes eliminar tu propia cuenta' });
    }

    const [usuarios] = await db.execute(
      'SELECT id_usuario, nombre_usuario FROM usuario WHERE id_usuario = ?', [id]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    await db.execute('DELETE FROM usuario WHERE id_usuario = ?', [id]);

    res.json({
      status:  'success',
      message: `Cuenta de "${usuarios[0].nombre_usuario}" eliminada correctamente`
    });

  } catch (error) {
    // Si el usuario tiene reportes asociados, la FK lo impide
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        status:  'error',
        message: 'No se puede eliminar: este usuario tiene reportes asociados. Considera banearlo en su lugar.'
      });
    }
    console.error('Error al eliminar usuario:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;