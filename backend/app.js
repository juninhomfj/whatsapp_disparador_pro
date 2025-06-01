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
.catch(err => {
  console.error('[Erro na conexão com MongoDB]:', err);
  process.exit(1);
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend
try {
  app.use(express.static(path.join(__dirname, '../frontend')));
} catch (err) {
  console.error('[Erro ao servir frontend]:', err);
}

// Rotas da API
try {
  app.use('/api/auth', authRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/whatsapp/instances', instanceRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/instancias', instanciasRoutes);
} catch (err) {
  console.error('[Erro ao registrar rotas da API]:', err);
}

// Variáveis de estado WhatsApp
let whatsappClient = null;
let lastQr = null;
let connectionStatus = 'disconnected';

// Limpeza de QR a cada 2 minutos
setInterval(() => lastQr = null, 120000);

// Rotas WhatsApp
app.get('/api/status', (req, res) => {
  try {
    res.json({ status: connectionStatus });
  } catch (err) {
    console.error('[Erro na rota /api/status]:', err);
    res.status(500).json({ error: 'Erro ao obter status do WhatsApp.' });
  }
});

app.get('/api/qrcode', async (req, res) => {
  if (!lastQr) return res.status(202).json({ status: 'pending' });
  try {
    res.json({ qr: await qrcode.toDataURL(lastQr) });
  } catch (err) {
    console.error('[Erro na rota /api/qrcode]:', err);
    res.status(500).json({ error: 'Erro interno ao gerar o QR Code.' });
  }
});

// Inicialização WhatsApp
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
      console.log('QR RECEBIDO');
    });

    whatsappClient.on('ready', () => {
      connectionStatus = 'connected';
      console.log('WHATSAPP PRONTO');
    });

    whatsappClient.on('disconnected', (reason) => {
      connectionStatus = 'disconnected';
      console.error('[WhatsApp DESCONECTADO]:', reason);
      setTimeout(initWhatsApp, 5000); // Reconexão automática
    });

    whatsappClient.on('auth_failure', (msg) => {
      connectionStatus = 'disconnected';
      console.error('[Falha na autenticação WhatsApp]:', msg);
    });

    whatsappClient.on('change_state', (state) => {
      console.log('[Estado do WhatsApp alterado]:', state);
    });

    whatsappClient.on('error', (err) => {
      console.error('[Erro no WhatsApp Client]:', err);      const authRoutes = require('./routes/auth');
      app.use('/api', authRoutes);
    });

    whatsappClient.initialize();
  } catch (err) {
    console.error('[Erro ao inicializar WhatsApp]:', err);
  }
}

// Endpoint de envio de mensagens
app.post('/api/send', async (req, res) => {
  if (connectionStatus !== 'connected') {
    console.warn('[Tentativa de envio com WhatsApp desconectado]');
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
        console.error(`[Erro ao enviar mensagem para ${number}]:`, errMsg);
        results.push({ number, status: 'fail', error: errMsg.message });
      }
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    
    res.json({ success: true, results });
  } catch (err) {
    console.error('[Erro na rota /api/send]:', err);
    res.status(500).json({ 
      error: 'Erro interno ao enviar mensagem.',
      details: err.message
    });
  }
});

// Inicialização do WhatsApp e servidor
try {
  initWhatsApp();
  app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));
} catch (err) {
  console.error('[Erro ao iniciar servidor]:', err);
  process.exit(1);
}