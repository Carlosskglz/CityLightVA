// middlewares/upload.js
// Configuración de multer para subir imágenes de reportes.
// Las imágenes se guardan en backend/uploads/
// y en la BD solo se guarda la ruta (ej: "uploads/1718000000-foto.jpg")

const multer = require('multer');
const path   = require('path');

const storage = multer.diskStorage({
  // Carpeta donde se guardan los archivos
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  // Nombre del archivo: timestamp + nombre original (evita duplicados)
  filename: function (req, file, cb) {
    const nombreUnico = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, nombreUnico);
  }
});

// Solo permitir imágenes
function filtroArchivos(req, file, cb) {
  const tiposPermitidos = /jpeg|jpg|png|webp/;
  const esValido = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());

  if (esValido) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, webp)'));
  }
}

const upload = multer({
  storage: storage,
  fileFilter: filtroArchivos,
  limits: { fileSize: 5 * 1024 * 1024 } // máximo 5MB
});

module.exports = upload;