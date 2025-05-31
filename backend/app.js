require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const instanceRoutes = require('./routes/instances');
const contactRoutes = require('./routes/contacts');
const instanciasRoutes = require('./routes/instancias');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Conexão com MongoDB (Aprimorada para Atlas)
mongoose.connect(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true
})
.then(() => console.log('🗄️ MongoDB conectado'))
.catch(err => console.error('Erro MongoDB:', err));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/whatsapp/instances', instanceRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/instancias', instanciasRoutes);

// Variáveis de estado WhatsApp
let whatsappClient = null;
let lastQr = null;
let connectionStatus = 'disconnected';

// Limpeza de QR a cada 2 minutos
setInterval(() => lastQr = null, 120000);

// Rotas WhatsApp
app.get('/api/status', (req, res) => res.json({ status: connectionStatus }));
app.get('/api/qrcode', async (req, res) => {
  if (!lastQr) return res.status(202).json({ status: 'pending' });
  try {
    res.json({ qr: await qrcode.toDataURL(lastQr) });
  } catch {
    res.status(202).json({ status: 'pending' });
  }
});

// Inicialização WhatsApp
function initWhatsApp() {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  });

  whatsappClient.on('qr', (qr) => {
    lastQr = qr;
    connectionStatus = 'qr-pending';
    console.log('QR RECEBIDO');
  });

  whatsappClient.on('ready', () => {
    connectionStatus = 'connected';
    console.log('WHATSAPP PRONTO');
  });

  whatsappClient.on('disconnected', () => {
    connectionStatus = 'disconnected';
    console.log('WHATSAPP DESCONECTADO');
    setTimeout(initWhatsApp, 5000); // Reconexão automática
  });

  whatsappClient.initialize();
}

// Endpoint de envio de mensagens
app.post('/api/send', async (req, res) => {
  if (connectionStatus !== 'connected') {
    return res.status(425).json({ error: 'WhatsApp não conectado' });
  }
  
  try {
    const { numbers, message } = req.body;
    const results = [];
    
    for (const number of numbers) {
      const chatId = number.replace(/[^\d]/g, '') + '@c.us';
      await whatsappClient.sendMessage(chatId, message);
      results.push({ number, status: 'success' });
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro no envio',
      details: error.message
    });
  }
});

// Inicialização do WhatsApp e servidor
initWhatsApp();
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));