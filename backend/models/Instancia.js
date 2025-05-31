const mongoose = require('mongoose');
const InstanciaSchema = new mongoose.Schema({
  nome: String,
  userId: mongoose.Schema.Types.ObjectId,
  status: String,
  fotoPerfil: String,
  numero: String
});
module.exports = mongoose.model('Instancia', InstanciaSchema);