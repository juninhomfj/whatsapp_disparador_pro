@echo off
set "ROOT=whatsapp_disparador_pro"

:: Criar pastas
mkdir %ROOT%
mkdir %ROOT%\frontend
mkdir %ROOT%\frontend\css
mkdir %ROOT%\frontend\steps
mkdir %ROOT%\backend

:: Criar arquivos vazios
type nul > %ROOT%\frontend\css\styles.css
type nul > %ROOT%\frontend\steps\step1.html
type nul > %ROOT%\frontend\steps\step2_select_audience.html
type nul > %ROOT%\frontend\steps\step3_select_channels.html
type nul > %ROOT%\frontend\steps\step4_create_content.html
type nul > %ROOT%\frontend\steps\step5_review_confirm.html
type nul > %ROOT%\frontend\dashboard.html
type nul > %ROOT%\frontend\report.html
type nul > %ROOT%\frontend\qr-scanner.html
type nul > %ROOT%\backend\config.json
type nul > %ROOT%\backend\app.js
type nul > %ROOT%\backend\package.json

echo Estrutura de pastas e arquivos criada com sucesso.
pause
