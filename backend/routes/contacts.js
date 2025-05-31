const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const csv = require('csvtojson');
const path = require('path');
const fs = require('fs');

// Configuração do multer para uploads temporários
const upload = multer({ dest: path.join(__dirname, '../uploads/') });

// Listar contatos do usuário (com filtro por tag)
router.get('/', authMiddleware, async (req, res) => {
  const { tag } = req.query;
  const filter = { userId: req.userId };
  if (tag) filter.tags = tag;
  const contatos = await Contact.find(filter);
  res.json(contatos);
});

// Adicionar contatos em lote (ex: após importação)
router.post('/importar', authMiddleware, upload.single('arquivo'), async (req, res) => {
  try {
    // Recebe tags como string JSON
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    // Lê e converte o CSV
    const filePath = req.file.path;
    const contatos = await csv().fromFile(filePath);
    fs.unlinkSync(filePath); // Remove o arquivo temporário

    // Monta os docs para salvar
    const docs = contatos.map(c => ({
      nome: c.nome || c.Nome || c.NOME || "",
      telefone: c.telefone || c.Telefone || c.TELEFONE || "",
      ref: c.ref || c.Ref || c.REF || "",
      userId: req.userId,
      tags
    }));

    // Salva no banco
    await Contact.insertMany(docs);
    res.json({ success: true, inseridos: docs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar contatos' });
  }
});

// Adicionar/remover tags de um contato
router.patch('/:id/tags', authMiddleware, async (req, res) => {
  const { tags } = req.body;
  await Contact.updateOne({ _id: req.params.id, userId: req.userId }, { tags });
  res.json({ success: true });
});

// Remover contato
router.delete('/:id', authMiddleware, async (req, res) => {
  await Contact.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ success: true });
});

module.exports = router;