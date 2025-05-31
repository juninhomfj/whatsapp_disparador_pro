const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const whatsappService = require('../services/whatsappService');
const Instancia = require('../models/Instancia');

// Lista instâncias
router.get('/', authMiddleware, async (req, res) => {
  const instancias = await Instancia.find({ userId: req.userId });
  res.json(instancias);
});

// Cria nova instância
router.post('/', authMiddleware, async (req, res) => {
  const { nome } = req.body;
  const instancia = await Instancia.create({ nome, userId: req.userId, status: 'desconectado' });
  res.json(instancia);
});

// Inicia conexão e retorna QR code
router.post('/:id/iniciar', authMiddleware, async (req, res) => {
  const qrCode = await whatsappService.iniciar(req.params.id, req.userId);
  res.json({ qrCode });
});

// Para/desconecta instância
router.post('/:id/parar', authMiddleware, async (req, res) => {
  await whatsappService.parar(req.params.id, req.userId);
  res.json({ ok: true });
});

// Remove instância
router.delete('/:id', authMiddleware, async (req, res) => {
  await Instancia.deleteOne({ _id: req.params.id, userId: req.userId });
  await whatsappService.parar(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;