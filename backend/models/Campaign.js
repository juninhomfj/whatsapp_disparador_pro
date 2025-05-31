const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  nome:      { type: String, required: true },
  telefone:  { type: String, required: true },
  ref:       { type: String, default: '' }
});

const campaignSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nome:             { type: String, required: true },
  descricao:        { type: String, default: '' },
  tipoEnvio:        { type: String, enum: ['imediato', 'agendado'], required: true },
  dataAgendada:     { type: Date },
  mensagem:         { type: String, required: true },
  contatos:         [contactSchema],
  velocidade:       { type: String, enum: ['seguro','medio','rapido'], default: 'medio' },
  ordem:            { type: String, enum: ['sequencial','aleatorio'], default: 'sequencial' },
  status:           { type: String, enum: ['draft','agendado','em_andamento','finalizada'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
