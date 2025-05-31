const mongoose = require('mongoose');

const instanceSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nome:        { type: String }, // Nome personalizado da instância
  numero:      { type: String, required: true }, // Número do WhatsApp
  fotoPerfil:  { type: String }, // URL da foto de perfil
  status:      { type: String, enum: ['connected', 'disconnected', 'pending'], default: 'pending' },
  sessionData: { type: Object }, // Dados da sessão para reconexão automática
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Instance', instanceSchema);