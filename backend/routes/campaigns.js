const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const csv     = require('csvtojson');
const XLSX    = require('xlsx');
const fs      = require('fs');
const path    = require('path');
const Campaign = require('../models/Campaign');
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Configurar multer para upload + diretório temporário
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 16 * 1024 * 1024 } // até 16 MB
});

// =============================================================================
// 1) GET /api/campaigns
//    → Lista todas as campanhas do usuário
// =============================================================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar campanhas' });
  }
});

// =============================================================================
// 2) GET /api/campaigns/:id
//    → Retorna detalhes de 1 campanha
// =============================================================================
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID inválido' });

    const campaign = await Campaign.findOne({ _id: id, userId: req.userId });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

    res.json(campaign);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar campanha' });
  }
});

// =============================================================================
// 3) DELETE /api/campaigns/:id
//    → Excluir campanha
// =============================================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID inválido' });

    await Campaign.deleteOne({ _id: id, userId: req.userId });
    res.json({ message: 'Campanha excluída' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir campanha' });
  }
});

// =============================================================================
// 4) POST /api/campaigns/temp
//    → Cria ou atualiza dados parciais (draft) a cada step
// =============================================================================
router.post('/temp', authMiddleware, async (req, res) => {
  try {
    // Os campos podem vir em qualquer etapa:
    const updateFields = {};
    if (req.body.nome)         updateFields.nome = req.body.nome;
    if (req.body.descricao)    updateFields.descricao = req.body.descricao;
    if (req.body.tipoEnvio)    updateFields.tipoEnvio = req.body.tipoEnvio;
    if (req.body.dataAgendada) updateFields.dataAgendada = req.body.dataAgendada;
    if (req.body.mensagem)     updateFields.mensagem = req.body.mensagem;
    if (req.body.velocidade)   updateFields.velocidade = req.body.velocidade;
    if (req.body.ordem)        updateFields.ordem = req.body.ordem;

    // Tenta encontrar um draft (status: 'draft') deste usuário
    let campaign = await Campaign.findOne({ userId: req.userId, status: 'draft' });
    if (!campaign) {
      // Se não existir draft, cria um novo
      campaign = new Campaign({
        userId: req.userId,
        ...updateFields,
        status: 'draft'
      });
    } else {
      // Se existir, atualiza somente os campos que vieram
      Object.assign(campaign, updateFields);
    }
    await campaign.save();
    res.json({ message: 'Dados salvos', draftId: campaign._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar dados parciais' });
  }
});

// =============================================================================
// 5) POST /api/campaigns/upload
//    → Faz upload de CSV/XLSX, parse, salva lista de contatos no draft
// =============================================================================
router.post('/upload', authMiddleware, upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let jsonArray = [];
    if (ext === '.csv') {
      jsonArray = await csv().fromFile(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      jsonArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Formato não suportado' });
    }

    // Validar e mapear cada objeto do JSON para { nome, telefone, ref }
    const contatos = jsonArray.map(item => {
      // Assuma que as colunas no CSV/XLSX sejam obrigatoriamente: nome, telefone, ref
      return {
        nome: String(item.nome).trim(),
        telefone: String(item.telefone).replace(/\D/g, '').startsWith('55')
          ? String(item.telefone).replace(/\D/g, '')
          : '55' + String(item.telefone).replace(/\D/g, ''),
        ref: item.ref ? String(item.ref).trim() : ''
      };
    });

    // Atualiza o draft do usuário
    let campaign = await Campaign.findOne({ userId: req.userId, status: 'draft' });
    if (!campaign) {
      return res.status(400).json({ error: 'Nenhum draft ativo encontrado' });
    }
    campaign.contatos = contatos;
    await campaign.save();

    // Apaga o arquivo temporário
    fs.unlinkSync(filePath);

    res.json({ message: 'Contatos importados', count: contatos.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar contatos' });
  }
});

// =============================================================================
// 6) POST /api/campaigns/finalizar
//    → Marca campaign como agendada ou em andamento e dispara scheduler
// =============================================================================
router.post('/finalizar', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ userId: req.userId, status: 'draft' });
    if (!campaign) return res.status(400).json({ error: 'Nenhum draft para finalizar' });

    // Define o status conforme tipoEnvio
    if (campaign.tipoEnvio === 'imediato') {
      campaign.status = 'em_andamento';
      await campaign.save();
      // Aqui você pode chamar uma função de scheduler para envio imediato
      // ex: sendNow(campaign);
    } else {
      campaign.status = 'agendado';
      await campaign.save();
      // Aqui programe com APScheduler ou setTimeout para a dataAgendada
      // ex: scheduleSend(campaign);
    }

    res.json({ message: 'Campanha finalizada com sucesso', campaignId: campaign._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao finalizar campanha' });
  }
});

module.exports = router;
