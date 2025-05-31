const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nome:      { type: String, required: true },
  telefone:  { type: String, required: true },
  ref:       { type: String },
  tags:      [{ type: String }]
});

module.exports = mongoose.model('Contact', contactSchema);