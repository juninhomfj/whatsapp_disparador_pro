const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');

// 🔐 Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Buscar usuário
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

        // 2. Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' });

        // 3. Gerar token JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// 📝 Registro
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Verificar se usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Usuário já existe' });

        // 2. Criptografar senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Criar novo usuário
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Gerar token de redefinição
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'Se o e-mail estiver cadastrado, você receberá um link.' });
        }

        // Gerar token e validade de 1 hora
        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpires = Date.now() + 3600000;
        await user.save();

        const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;
        console.log("Link de redefinição:", resetLink);

        // Simulação: exibir no console (depois pode enviar e-mail)
        return res.status(200).json({ message: 'Link de redefinição gerado.', link: resetLink });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao processar' });
    }
});

// Rota para redefinir senha com token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Senha redefinida com sucesso' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
});

module.exports = router;
// 🔒 Middleware de Autenticação