// Este arquivo serve como ponto de partida para implementar o envio real
// Exemplo básico usando setInterval para monitorar campanhas agendadas em MongoDB

const mongoose = require('mongoose');
const Campaign = require('./models/Campaign');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
}).then(() => console.log('🗄️ MongoDB conectado (scheduler)'))
  .catch(err => console.error(err));

async function checkScheduled() {
  const now = new Date();
  // Busca campanhas agendadas cuja dataAgendada <= now
  const toSend = await Campaign.find({
    status: 'agendado',
    dataAgendada: { $lte: now }
  });

  for (const camp of toSend) {
    // Atualiza status para em_andamento
    camp.status = 'em_andamento';
    await camp.save();
    console.log(`Campanha "${camp.nome}" iniciada automaticamente pelo scheduler`);
    // Aqui chamaria a função de envio, ex: sendCampaign(camp);
  }
}

// Verifica a cada 1 minuto
setInterval(checkScheduled, 60 * 1000);
