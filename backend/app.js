require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Rotas da aplicação
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const instanceRoutes = require('./routes/instances');
const contactRoutes = require('./routes/contacts');
const instanciasRoutes = require('./routes/instancias');
const uploadRoutes = require('./routes/upload');

// Conexão com MongoDB (usando MongoDB Atlas com TLS)
mongoose.connect(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true
})
.then(() => console.log('🗄️ MongoDB conectado'))
.catch(err => {
  console.error('[Erro na conexão com MongoDB]:', err);
  process.exit(1);
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos do frontend e uploads
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/whatsapp/instances', instanceRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/instancias', instanciasRoutes);
app.use('/api/upload', uploadRoutes);

// Variáveis do WhatsApp
let whatsappClient = null;
let lastQr = null;
let connectionStatus = 'disconnected';

// Limpa o QR code antigo a cada 2 minutos
setInterval(() => {
  lastQr = null;
}, 120000);

// Rota para status da conexão com WhatsApp
app.get('/api/status', (req, res) => {
  res.json({ status: connectionStatus });
});

// Rota para obter QR Code do WhatsApp
app.get('/api/qrcode', async (req, res) => {
  if (!lastQr) return res.status(202).json({ status: 'pending' });

  try {
    const qrImage = await qrcode.toDataURL(lastQr);
    res.json({ qr: qrImage });
  } catch (err) {
    console.error('[Erro ao gerar QR Code]:', err);
    res.status(500).json({ error: 'Erro ao gerar QR Code.' });
  }
});

// Função para inicializar o WhatsApp Web
function initWhatsApp() {
  try {
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
      console.log('📱 QR Code recebido');
    });

    whatsappClient.on('ready', () => {
      connectionStatus = 'connected';
      console.log('✅ WhatsApp pronto');
    });

    whatsappClient.on('disconnected', (reason) => {
      connectionStatus = 'disconnected';
      console.error('[Desconectado do WhatsApp]:', reason);
      setTimeout(initWhatsApp, 5000); // tenta reconectar
    });

    whatsappClient.on('auth_failure', (msg) => {
      connectionStatus = 'disconnected';
      console.error('[Falha na autenticação WhatsApp]:', msg);
    });

    whatsappClient.on('change_state', (state) => {
      console.log('[Estado do WhatsApp alterado]:', state);
    });

    whatsappClient.on('error', (err) => {
      console.error('[Erro no WhatsApp Client]:', err);
    });

    whatsappClient.initialize();
  } catch (err) {
    console.error('[Erro ao inicializar WhatsApp]:', err);
  }
}

// Endpoint para envio de mensagens
app.post('/api/send', async (req, res) => {
  if (connectionStatus !== 'connected') {
    return res.status(425).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const { numbers, message } = req.body;
    const results = [];

    for (const number of numbers) {
      const chatId = number.replace(/[^\d]/g, '') + '@c.us';
      try {
        await whatsappClient.sendMessage(chatId, message);
        results.push({ number, status: 'success' });
      } catch (errMsg) {
        console.error(`[Erro ao enviar para ${number}]:`, errMsg);
        results.push({ number, status: 'fail', error: errMsg.message });
      }

      await new Promise(resolve => setTimeout(resolve, 2500)); // Delay entre envios
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('[Erro no envio de mensagens]:', err);
    res.status(500).json({ 
      error: 'Erro interno ao enviar mensagem.',
      details: err.message
    });
  }
});

// Inicializa WhatsApp e servidor
initWhatsApp();
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));