const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
            type: String,
                    required: true,
                            unique: true,
                                    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'E-mail inválido']
                                        },
                                            password: {
                                                    type: String,
                                                            required: true
                                                                },
                                                                    createdAt: {
                                                                            type: Date,
                                                                                    default: Date.now
                                                                                        }
                                                                                        });

                                                                                        // Middleware para hash da senha antes de salvar
                                                                                        userSchema.pre('save', async function(next) {
                                                                                            if(!this.isModified('password')) return next();
                                                                                                
                                                                                                    try {
                                                                                                            const salt = await bcrypt.genSalt(10);
                                                                                                                    this.password = await bcrypt.hash(this.password, salt);
                                                                                                                            next();
                                                                                                                                } catch (error) {
                                                                                                                                        next(error);
                                                                                                                                            }
                                                                                                                                            });

                                                                                                                                            module.exports = mongoose.model('User', userSchema);