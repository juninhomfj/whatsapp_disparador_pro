const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Login
router.post('/login', async (req, res) => {
    try {
            const { email, password } = req.body;
                    
                            // 1. Buscar usuário
                                    const user = await User.findOne({ email });
                                            if(!user) return res.status(401).json({ error: 'Credenciais inválidas' });

                                                    // 2. Verificar senha
                                                            const validPassword = await bcrypt.compare(password, user.password);
                                                                    if(!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' });

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

                                                                                                                                                                        // Registro
                                                                                                                                                                        router.post('/register', async (req, res) => {
                                                                                                                                                                            try {
                                                                                                                                                                                    const { email, password } = req.body;

                                                                                                                                                                                            // 1. Verificar se usuário existe
                                                                                                                                                                                                    const existingUser = await User.findOne({ email });
                                                                                                                                                                                                            if(existingUser) return res.status(400).json({ error: 'Usuário já existe' });

                                                                                                                                                                                                                    // 2. Hash da senha
                                                                                                                                                                                                                            const hashedPassword = await bcrypt.hash(password, 10);

                                                                                                                                                                                                                                    // 3. Criar novo usuário
                                                                                                                                                                                                                                            const newUser = new User({
                                                                                                                                                                                                                                                        email,
                                                                                                                                                                                                                                                                    password: hashedPassword
                                                                                                                                                                                                                                                                            });

                                                                                                                                                                                                                                                                                    await newUser.save();

                                                                                                                                                                                                                                                                                            res.status(201).json({ message: 'Usuário criado com sucesso' });

                                                                                                                                                                                                                                                                                                } catch (error) {
                                                                                                                                                                                                                                                                                                        console.error(error);
                                                                                                                                                                                                                                                                                                                res.status(500).json({ error: 'Erro ao criar usuário' });
                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                                                    module.exports = router;