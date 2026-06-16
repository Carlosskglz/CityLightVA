// auth.routes.js — Registro y Login

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

// ─── Validación de registro ─────────────────────────────────
function validarRegistro(datos) {
  const errores = [];

  if (!datos.nombre_usuario || datos.nombre_usuario.trim().length < 2) {
    errores.push('El nombre es obligatorio (mínimo 2 caracteres)');
  }

  if (!datos.correo_usuario || typeof datos.correo_usuario !== 'string') {
    errores.push('El correo es obligatorio');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(datos.correo_usuario)) {
      errores.push('El formato del correo no es válido');
    }
  }

  if (!datos.telefono_usuario || !/^[0-9]{10}$/.test(datos.telefono_usuario.trim())) {
    errores.push('El teléfono debe tener exactamente 10 dígitos');
  }

  if (!datos.contrasena_usuario || datos.contrasena_usuario.length < 8) {
    errores.push('La contraseña debe tener mínimo 8 caracteres');
  }

  if (datos.contrasena_usuario !== datos.confirmar_contrasena) {
    errores.push('Las contraseñas no coinciden');
  }

  return errores;
}

// ============================================================
// POST /api/auth/registro
// ============================================================
router.post('/registro', async (req, res) => {
  try {
    // 1. Validar datos
    const errores = validarRegistro(req.body);
    if (errores.length > 0) {
      return res.status(400).json({ status: 'error', message: errores.join('; ') });
    }

    // 2. Desestructurar — una sola vez, sin repetir
    const { nombre_usuario, correo_usuario, telefono_usuario, contrasena_usuario } = req.body;

    // 3. Verificar que el correo no exista
    const [existente] = await db.execute(
      'SELECT id_usuario FROM usuario WHERE correo_usuario = ?',
      [correo_usuario.trim().toLowerCase()]
    );

    if (existente.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ya existe una cuenta con ese correo' });
    }

    // 4. Encriptar contraseña
    const contrasenaHash = await bcrypt.hash(contrasena_usuario, 10);

    // 5. Insertar usuario con rol "usuario" (id_tipoUsuario = 1)
    const [resultado] = await db.execute(
      `INSERT INTO usuario (id_tipoUsuario, nombre_usuario, contrasena_usuario, correo_usuario, telefono_usuario)
       VALUES (1, ?, ?, ?, ?)`,
      [
        nombre_usuario.trim(),
        contrasenaHash,
        correo_usuario.trim().toLowerCase(),
        telefono_usuario.trim()
      ]
    );

    res.status(201).json({
      status:  'success',
      message: 'Cuenta creada correctamente',
      data: {
        id_usuario:     resultado.insertId,
        nombre_usuario: nombre_usuario.trim(),
        correo_usuario: correo_usuario.trim().toLowerCase(),
        rol:            'usuario'
      }
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'Ya existe una cuenta con ese correo' });
    }
    console.error('Error en registro:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { correo_usuario, contrasena_usuario } = req.body;

    // 1. Validación básica
    if (!correo_usuario || !contrasena_usuario) {
      return res.status(400).json({ status: 'error', message: 'Correo y contraseña son obligatorios' });
    }

    // 2. Buscar usuario con JOIN para traer el rol
    const [usuarios] = await db.execute(
      `SELECT u.id_usuario, u.nombre_usuario, u.correo_usuario,
              u.contrasena_usuario, u.activo, t.tipo_usuario
       FROM usuario u
       INNER JOIN tipos_de_usuario t ON u.id_tipoUsuario = t.id_tipoUsuario
       WHERE u.correo_usuario = ?`,
      [correo_usuario.trim().toLowerCase()]
    );

    // 3. Correo no encontrado — mensaje genérico por seguridad
    if (usuarios.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Correo o contraseña incorrectos' });
    }

    const usuario = usuarios[0];

    // Verificar que la cuenta no esté baneada
    if (!usuario.activo) {
      return res.status(403).json({
        status:  'error',
        message: 'Tu cuenta ha sido suspendida. Contacta al administrador.'
      });
    }

    // 4. Verificar contraseña con bcrypt
    const contrasenaValida = await bcrypt.compare(contrasena_usuario, usuario.contrasena_usuario);
    if (!contrasenaValida) {
      return res.status(401).json({ status: 'error', message: 'Correo o contraseña incorrectos' });
    }

    // 5. Generar token JWT con id, nombre y rol
    const token = jwt.sign(
      {
        id_usuario:     usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        rol:            usuario.tipo_usuario
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 6. Responder con token y datos (sin contraseña)
    res.json({
      status:  'success',
      message: `Bienvenido, ${usuario.nombre_usuario}`,
      data: {
        token,
        id_usuario:     usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        correo_usuario: usuario.correo_usuario,
        rol:            usuario.tipo_usuario
      }
    });

  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;