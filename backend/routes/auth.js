const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
require('dotenv').config();

// Middleware de autenticação JWT
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

    const [, token] = authHeader.split(' ');
    if (!token) return res.status(401).json({ error: 'Token mal formatado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// 🔐 Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Senha inválida' });

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '72h' }
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// 📝 Registro
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'E-mail e senha obrigatórios' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Usuário já existe' });

        const newUser = new User({ email, password });
        await newUser.save();

        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// 🔑 Esqueci a Senha
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'Se o e-mail estiver cadastrado, você receberá um link.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpires = Date.now() + 3600000;
        await user.save();

        const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;
        console.log("Link de redefinição (DEV):", resetLink);

        return res.status(200).json({ message: 'Link de redefinição enviado para o e-mail' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao processar' });
    }
});

// 🔄 Redefinir Senha
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Senha redefinida com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
});

// 🔎 Dados do usuário autenticado
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password -resetToken -resetTokenExpires');
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

module.exports = router; // ✅ Exportando apenas o router corretamente