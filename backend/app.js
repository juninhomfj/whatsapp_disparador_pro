const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
const port = 3000;

// Configurações
const config = require('./config.json');
let whatsappClient = null;

// Frontend
app.use(express.static('../frontend'));
app.use(express.json());

// Rota do QR Code
app.get('/qrcode', async (req, res) => {
  if (!whatsappClient) initWhatsApp();
  
  try {
    const qr = await whatsappClient.getQrCode();
    const qrImage = await qrcode.toDataURL(qr);
    res.send(qrImage);
  } catch {
    res.send('waiting');
  }
});

// Inicialização WhatsApp
function initWhatsApp() {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
  });

  whatsappClient.on('qr', () => console.log('QR Code gerado!'));
  whatsappClient.on('ready', () => console.log('WhatsApp conectado!'));
  whatsappClient.initialize();
}

// Disparo de mensagens
app.post('/send', async (req, res) => {
  const { numbers, message } = req.body;
  
  try {
    for (const number of numbers) {
      const chatId = number.replace('+', '') + '@c.us';
      await whatsappClient.sendMessage(chatId, message);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Delay anti-ban
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro no envio' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});