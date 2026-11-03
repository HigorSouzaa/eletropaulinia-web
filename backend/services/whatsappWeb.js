import path from 'node:path';
import { access } from 'node:fs/promises';

export class WhatsAppWebSession {
  constructor(factory) {
    this.factory = factory;
    this.client = null;
    this.state = 'desligado';
    this.changedAt = new Date();
    this.qr = null;
    this.qrExpiresAt = null;
  }
  snapshot() { return { state: this.state, changedAt: this.changedAt.toISOString() }; }
  transition(state) {
    this.state = state;
    this.changedAt = new Date();
    if (state !== 'aguardando_qr') { this.qr = null; this.qrExpiresAt = null; }
  }
  async connect() {
    if (this.client) return this.snapshot();
    this.transition('iniciando');
    try {
      const client = await this.factory();
      this.client = client;
      client.on('qr', value => {
        if (this.client !== client || typeof value !== 'string') return;
        this.qr = value;
        this.qrExpiresAt = Date.now() + 60000;
        this.transition('aguardando_qr');
      });
      client.on('authenticated', () => { if (this.client === client) this.transition('autenticando'); });
      client.on('ready', () => { if (this.client === client) this.transition('conectado'); });
      client.on('disconnected', () => { if (this.client === client) { this.client = null; this.transition('desconectado'); } });
      Promise.resolve(client.initialize()).catch(() => {
        if (this.client === client) { this.client = null; this.transition('erro'); }
      });
    } catch { this.client = null; this.transition('erro'); }
    return this.snapshot();
  }
  qrValue() {
    if (this.state !== 'aguardando_qr' || !this.qr || Date.now() >= this.qrExpiresAt) return null;
    return this.qr;
  }
  async disconnect() {
    const current = this.client;
    this.client = null;
    this.transition('desconectado');
    if (current) await current.destroy().catch(() => {});
    return this.snapshot();
  }
}

async function localFactory() {
  const folder = process.env.WHATSAPP_SESSION_DIR;
  const chrome = process.env.WHATSAPP_CHROME_PATH;
  if (process.env.NODE_ENV === 'production' || !folder || !path.isAbsolute(folder) || !chrome || !path.isAbsolute(chrome)) throw new Error('LOCAL_RUNTIME_UNAVAILABLE');
  const repository = path.resolve(import.meta.dirname, '../..');
  const relative = path.relative(repository, folder);
  if (!relative.startsWith('..') || relative === '') throw new Error('SESSION_DIR_INSIDE_REPOSITORY');
  await access(chrome);
  const { default: library } = await import('whatsapp-web.js');
  const { Client, LocalAuth } = library;
  return new Client({ authStrategy: new LocalAuth({ dataPath: folder, clientId: 'eletropaulinia' }),
    puppeteer: { headless: true, executablePath: chrome } });
}

export const whatsappWeb = new WhatsAppWebSession(localFactory);
