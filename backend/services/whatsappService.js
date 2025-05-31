// Exemplo básico, adapte conforme sua biblioteca real de WhatsApp
const instancias = {};

async function iniciar(id, userId) {
  // Aqui você inicia a conexão e gera o QR code real
  // Exemplo fictício:
  if (!instancias[id]) {
    // instancias[id] = new WhatsAppClient(...);
    // await instancias[id].connect();
    // const qrCode = await instancias[id].getQRCode();
    const qrCode = "QR_CODE_BASE64_AQUI"; // Substitua pela lógica real
    instancias[id] = { qrCode, status: 'aguardando' };
    return qrCode;
  }
  return instancias[id].qrCode;
}

async function parar(id, userId) {
  if (instancias[id]) {
    // instancias[id].disconnect();
    delete instancias[id];
  }
}

module.exports = { iniciar, parar };

<!-- Exemplo de ajuste -->
<link rel="stylesheet" href="css/styles.css">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<!-- Sidebar -->
<script>
  fetch('sidebar.html').then(r=>r.text()).then(html=>{document.getElementById('sidebar-container').innerHTML=html});
  window.location.href = "steps/step1_detalhes.html";
</script>