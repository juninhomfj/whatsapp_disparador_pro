require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3000;

let whatsappClient = null;
let lastQr = null;
let connectionStatus = 'disconnected'; // disconnected | qr-pending | connected

// Limpa QR após 2 minutos
setInterval(() => {
  if (lastQr) lastQr = null;
}, 120000);

// Servir arquivos estáticos do frontend
app.use(express.static('../frontend'));
app.use(express.json());
app.use('/api', authRoutes);

// Status da conexão para o frontend
app.get('/status', (req, res) => {
  res.send(connectionStatus);
});

// Rota para obter o QR Code
app.get('/qrcode', async (req, res) => {
  if (!lastQr) return res.send('waiting');
  try {
    const qrImage = await qrcode.toDataURL(lastQr);
    res.send(qrImage);
  } catch {
    res.send('waiting');
  }
});

// Inicialização do WhatsApp Client
function initWhatsApp() {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    }
  });

  whatsappClient.on('qr', (qr) => {
    lastQr = qr;
    connectionStatus = 'qr-pending';
    console.log('QR Code gerado!');
  });

  whatsappClient.on('ready', () => {
    lastQr = null;
    connectionStatus = 'connected';
    console.log('WhatsApp conectado!');
  });

  whatsappClient.on('disconnected', () => {
    connectionStatus = 'disconnected';
    console.log('WhatsApp desconectado!');
  });

  whatsappClient.on('auth_failure', (msg) => {
    connectionStatus = 'disconnected';
    console.error('Falha na autenticação:', msg);
  });

  whatsappClient.initialize();
}

// Inicializa o WhatsApp ao iniciar o servidor
initWhatsApp();

// Exemplo de endpoint para envio de mensagens
app.post('/send', async (req, res) => {
  if (connectionStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não está conectado.' });
  }
  const { numbers, message } = req.body;
  try {
    for (const number of numbers) {
      const chatId = number.replace('+', '') + '@c.us';
      await whatsappClient.sendMessage(chatId, message);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Delay anti-ban
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro no envio', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});