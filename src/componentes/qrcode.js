// QR Code "Leve este passeio no seu celular" — gerado no próprio totem (offline).
// A URL base vem de VITE_QR_URL_BASE (.env) ou de config.qrUrlBase (locais.json).
import QRCode from 'qrcode';
import { estado } from '../core/estado.js';

export function urlDoLocal(id) {
  const base = import.meta.env.VITE_QR_URL_BASE || estado.dados.config.qrUrlBase || '';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}local=${encodeURIComponent(id)}&lang=${estado.idioma}`;
}

export function gerarQr(id) {
  return QRCode.toDataURL(urlDoLocal(id), {
    margin: 0,
    width: 420,
    errorCorrectionLevel: 'M',
    color: { dark: '#2a1d14', light: '#f6f1e7' },
  });
}
