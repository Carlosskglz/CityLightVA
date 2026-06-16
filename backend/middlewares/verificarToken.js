// middlewares/verificarToken.js
// Revisa que la petición traiga un token JWT válido.
// Si es válido, agrega req.usuario con los datos del token
// (id_usuario, nombre_usuario, rol) para que las rutas los usen.

const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  // El token viaja en el header: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status:  'error',
      message: 'No se proporcionó un token de autenticación'
    });
  }

  const token = authHeader.split(' ')[1]; // quita la palabra "Bearer"

  try {
    // jwt.verify revisa la firma y que no haya expirado
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = datos; // { id_usuario, nombre_usuario, rol }
    next(); // continuar a la siguiente función (la ruta)
  } catch (error) {
    return res.status(401).json({
      status:  'error',
      message: 'Token inválido o expirado, inicia sesión de nuevo'
    });
  }
}

// ─── Middleware extra: verificar rol específico ──────────────
// Uso: verificarRol('autoridad') o verificarRol('administrador')
function verificarRol(rolRequerido) {
  return (req, res, next) => {
    if (req.usuario.rol !== rolRequerido) {
      return res.status(403).json({
        status:  'error',
        message: 'No tienes permisos para realizar esta acción'
      });
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };