const express = require('express');
const router = express.Router();
const Instance = require('../models/Instance');
const authMiddleware = require('../middleware/authMiddleware');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Função para criar um client WhatsApp único por instância
function createWhatsappClient(instanceId) {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: instanceId // cria sessão única por ID
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    }
  });
  return client;
}

// Lista todas as instâncias do usuário
router.get('/', authMiddleware, async (req, res) => {
  const instances = await Instance.find({ userId: req.userId });
  res.json(instances);
});

// Cria uma nova instância e retorna o QR code para conexão
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Cria um registro da instância no banco
    const instance = new Instance({
      userId: req.userId,
      status: 'pending'
    });
    await instance.save();

    // Caminho da sessão
    const clientId = instance._id.toString();
    const sessionPath = path.join(__dirname, '..', '.wwebjs_auth', clientId);
    if (fs.existsSync(sessionPath)) {
      // Se a instância já existe, pode avisar ou reusar
      return res.status(409).json({ error: 'Já existe uma sessão ativa para esta instância.' });
      // Ou, se desejar, prosseguir para reutilizar a instância existente
    }

    // Cria novo client usando a função utilitária
    const client = createWhatsappClient(clientId);

    client.on('qr', async (qr) => {
      // Salva o QR code temporariamente no banco (opcional)
      instance.qrCode = qr;
      await instance.save();
      // Retorna o QR code em base64 para o frontend
      res.json({ instanceId: instance._id, qr: await qrcode.toDataURL(qr) });
    });

    client.on('ready', async () => {
      // Atualiza status e salva número e foto de perfil
      const info = await client.info;
      instance.status = 'connected';
      instance.numero = info.wid.user;
      try {
        const profilePicUrl = await client.getProfilePicUrl(info.wid._serialized);
        instance.fotoPerfil = profilePicUrl;
      } catch {}
      await instance.save();
    });

    client.on('disconnected', async () => {
      instance.status = 'disconnected';
      await instance.save();
    });

    client.initialize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar instância' });
  }
});

// Remove/desconecta uma instância pelo ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const instance = await Instance.findOne({ _id: id, userId: req.userId });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    // Opcional: aqui você pode encerrar a sessão do whatsapp-web.js se desejar

    await Instance.deleteOne({ _id: id });
    res.json({ message: 'Instância removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover instância' });
  }
});

module.exports = router;