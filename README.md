🚀 whatsapp_disparador_pro
Sistema de disparo de mensagens pelo WhatsApp.

📃 Descrição
Este projeto tem como objetivo facilitar o envio automatizado de mensagens em massa pelo WhatsApp para campanhas, notificações e outros usos. Ele é composto por uma API backend e uma interface web frontend, proporcionando controle prático e seguro.

⚙️ Tecnologias Utilizadas
Backend: Node.js
Frontend: HTML, CSS, JavaScript
Outros: whatsapp-web.js (biblioteca para integração com o WhatsApp Web)
🗂️ Estrutura do Projeto
text
whatsapp_disparador_pro/
├── backend/
│   ├── .wwebjs_auth/
│   ├── .wwebjs_cache/
│   ├── app.js
│   ├── config.json
│   ├── models/
│   ├── package.json
│   ├── package-lock.json
│   └── routes/
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── dashboard.html
│   ├── favicon.ico
│   ├── forgot-password.html
│   ├── index.html
│   ├── login.html
│   ├── qr-scanner.html
│   ├── register.html
│   ├── report.html
│   ├── reset-password.html
│   └── steps/
├── .gitignore
├── INSTALAR.bat
├── INSTALAR.sh
├── LICENSE
├── README.md
├── campanha_whatsapp_steps.zip
├── criar_estrutura.bat
└── criar_projeto.sh
Acesse a estrutura completa pelo GitHub.

🚦 Como Instalar e Rodar
Clone o repositório

bash
git clone https://github.com/juninhomfj/whatsapp_disparador_pro.git
cd whatsapp_disparador_pro
Instale as dependências do Backend

bash
cd backend
npm install
Configure as variáveis de ambiente

Crie um arquivo .env dentro da pasta backend/ com as configurações necessárias (veja modelo abaixo).
Importante: Não compartilhe esse arquivo, pois contém dados sensíveis.
Inicie o Backend

bash
node app.js
ou utilize:

bash
npm start
Acesse o Frontend

Basta abrir os arquivos HTML na pasta frontend/ no navegador, ou configure um servidor local para servir os arquivos.
📝 Exemplo de .env
env
# backend/.env
WHATSAPP_SESSION_SECRET=suachavesecreta
PORT=3000
# Outras variáveis necessárias...
💡 Funcionalidades
Login e autenticação via QR Code
Cadastro e gerenciamento de campanhas
Relatórios de envio
Interface web amigável para operadores
🛡️ Segurança
O arquivo .env e outras informações sensíveis não devem ser versionados.
Use sempre variáveis de ambiente para senhas, tokens, etc.
Para proteger seu histórico git, veja instruções em: Remover arquivos do histórico do Git.
🤝 Contribuição
Fork este repositório
Crie uma branch: git checkout -b minha-feature
Faça commit das suas alterações: git commit -m 'Minha nova feature'
Envie para o repositório remoto: git push origin minha-feature
Abra um Pull Request
📄 Licença
Este projeto está sob licença MIT. Veja o arquivo LICENSE para mais detalhes.

🔗 Links Úteis
whatsapp-web.js
Documentação Node.js
Remover arquivos do histórico do Git
