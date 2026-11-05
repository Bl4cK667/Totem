// QR Code "Como chegar": abre o Google Maps no celular com o destino já preenchido.
// Gerado no próprio totem pela biblioteca "qrcode" (instalada no projeto, sem internet).
import QRCode from 'qrcode';

/** Link de rota do Google Maps até as coordenadas do pin */
export function urlComoChegar({ lat, lng }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Imagem (data URL) do QR: marrom bem escuro sobre branco, com margem branca para o celular ler fácil */
export function gerarQrComoChegar(ponto) {
  return QRCode.toDataURL(urlComoChegar(ponto), {
    margin: 4,
    width: 640,
    errorCorrectionLevel: 'M',
    color: { dark: '#1f150e', light: '#ffffff' },
  });
}
