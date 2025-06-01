const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const csv     = require('csvtojson');
const XLSX    = require('xlsx');
const fs      = require('fs');
const path    = require('path');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
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
    const { status, page = 1, limit = 10, busca } = req.query;
    const filter = { userId: req.userId };
    if (status) filter.status = status;
    if (busca) filter.nome = { $regex: busca, $options: 'i' };
    const total = await Campaign.countDocuments(filter);
    const campanhas = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ campanhas, total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar campanhas" });
  }
});

// =============================================================================
// 2) GET /api/campaigns/:id
//    → Retorna detalhes de 1 campanha
// =============================================================================
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const campanha = await Campaign.findOne({ _id: req.params.id, userId: req.userId });
    if (!campanha) return res.status(404).json({ error: "Campanha não encontrada" });

    // Exemplo: supondo que campanha.envios é um array de {nome, telefone, status, dataHora}
    const envios = campanha.envios || [];

    // Agrupa por hora para o gráfico
    const enviosPorHora = [];
    const agrupamento = {};
    envios.forEach(e => {
      if (!e.dataHora) return;
      const hora = new Date(e.dataHora).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      agrupamento[hora] = (agrupamento[hora] || 0) + 1;
    });
    for (const hora in agrupamento) {
      enviosPorHora.push({ hora, qtd: agrupamento[hora] });
    }
    enviosPorHora.sort((a, b) => a.hora.localeCompare(b.hora));

    res.json({
      nome: campanha.nome,
      status: campanha.status,
      mensagem: campanha.mensagem,
      enviadas: envios.filter(e => e.status === "enviado").length,
      createdAt: campanha.createdAt,
      envios,
      enviosPorHora
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar relatório" });
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

    if (req.body.contatos && Array.isArray(req.body.contatos)) {
      // Busque os contatos completos pelo ID
      const contatos = await Contact.find({ _id: { $in: req.body.contatos }, userId: req.userId });
      updateFields.contatos = contatos.map(c => ({
        nome: c.nome,
        telefone: c.telefone,
        ref: c.ref
      }));
    }

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
//    → Faz upload de arquivo e retorna os nomes das colunas
// =============================================================================
router.post('/upload', upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const filePath = req.file.path;
  // Lê a primeira linha do arquivo para pegar os nomes das colunas
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Erro ao ler arquivo' });
    const header = data.split('\n')[0].replace('\r', '');
    const columns = header.split(',');
    fs.unlinkSync(filePath); // Remove o arquivo após ler
    res.json({ columns });
  });
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

// =============================================================================
// 7) POST /api/campaigns/:id/cancelar
//    → Cancela uma campanha ativa/em andamento
// =============================================================================
router.post('/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID inválido' });

    const campanha = await Campaign.findOne({ _id: id, userId: req.userId });
    if (!campanha) return res.status(404).json({ error: 'Campanha não encontrada' });

    // Só permite cancelar se estiver ativa/em andamento
    if (campanha.status !== 'active' && campanha.status !== 'em_andamento') {
      return res.status(400).json({ error: 'Só é possível cancelar campanhas ativas ou em andamento' });
    }

    campanha.status = 'cancelled'; // ou 'cancelada' se preferir
    await campanha.save();

    // (Opcional) Interrompa o envio aqui, se houver processo rodando

    res.json({ message: 'Campanha cancelada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar campanha' });
  }
});

// Adicione este bloco antes de module.exports = router;
router.post('/import-csv', upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const filePath = req.file.path;
  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const delimiter = rawContent.includes(';') ? ';' : ',';
    const jsonArray = await csv({ delimiter }).fromString(rawContent);
    fs.unlinkSync(filePath); // Remove o arquivo após processar

    // Aqui você pode salvar os contatos, validar ou apenas retornar o array
    res.json({ data: jsonArray });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar CSV' });
  }
});

module.exports = router;
