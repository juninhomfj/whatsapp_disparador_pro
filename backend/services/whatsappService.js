const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const Instancia = require('../models/Instancia');
const instancias = {};

async function iniciar(id, userId) {
  if (!instancias[id]) {
    const client = new Client({ /* ...configuração... */ });
    instancias[id] = { client, status: 'aguardando', qrCode: null };

    client.on('ready', async () => {
      instancias[id].status = 'conectado';
      await Instancia.findByIdAndUpdate(id, { status: 'conectado' });
    });

    client.on('qr', async (qr) => {
      instancias[id].status = 'aguardando';
      await Instancia.findByIdAndUpdate(id, { status: 'aguardando' });
      instancias[id].qrCode = await qrcode.toDataURL(qr);
    });

    client.on('disconnected', async () => {
      instancias[id].status = 'desconectado';
      await Instancia.findByIdAndUpdate(id, { status: 'desconectado' });
    });

    await client.initialize();
    // Aguarda o QR code ser gerado
    let tentativas = 0;
    while (!instancias[id].qrCode && tentativas < 50) { // timeout de 10s
      await new Promise(res => setTimeout(res, 200));
      tentativas++;
    }
    return { qrCode: instancias[id].qrCode, status: instancias[id].status };
  }
  return { qrCode: instancias[id].qrCode, status: instancias[id].status };
}

async function parar(id, userId) {
  try {
    if (instancias[id]) {
      // instancias[id].client.destroy(); // Descomente se quiser encerrar a sessão
      delete instancias[id];
      await Instancia.findByIdAndUpdate(id, { status: 'desconectado' });
    }
  } catch (err) {
    console.error("Erro ao parar instância:", err);
  }
}

module.exports = { iniciar, parar };