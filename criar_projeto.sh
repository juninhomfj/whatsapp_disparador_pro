#!/bin/bash

# Criar estrutura de pastas
mkdir -p whatsapp_disparador_pro/{frontend/{css,steps,assets},backend}

# Frontend (usando seus arquivos originais)
cat > whatsapp_disparador_pro/frontend/steps/step1.html << 'EOF'
[cole todo o conteúdo do step1.html aqui]
EOF

cat > whatsapp_disparador_pro/frontend/steps/step2_select_audience.html << 'EOF'
[cole o conteúdo do step2_select_audience.html aqui]
EOF

# Repita para os demais arquivos HTML...

# CSS
cat > whatsapp_disparador_pro/frontend/css/styles.css << 'EOF'
[cole todo o conteúdo do styles.css aqui]
EOF

# Backend
cat > whatsapp_disparador_pro/backend/app.js << 'EOF'
[cole o conteúdo do app.js anterior aqui]
EOF

# Configurações
cat > whatsapp_disparador_pro/backend/config.json << 'EOF'
{
  "maxMessagesPerHour": 50,
  "workingHours": "09:00-18:00"
}
EOF

# Script de instalação
cat > whatsapp_disparador_pro/INSTALAR.sh << 'EOF'
#!/bin/bash
cd backend
npm install express qrcode whatsapp-web.js
echo "Instalação concluída! Execute: node app.js"
EOF

# Versão Windows
cat > whatsapp_disparador_pro/INSTALAR.bat << 'EOF'
@echo off
cd backend
npm install express qrcode whatsapp-web.js
echo Instalação concluída! Execute: node app.js
pause
EOF

# Permissões
chmod +x whatsapp_disparador_pro/INSTALAR.sh

echo "Estrutura criada com sucesso!"