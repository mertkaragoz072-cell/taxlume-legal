// Hata günlüğü: yakalanmamış hatalar + reddedilmiş promise'ler cihazda saklanır (son 20, 'nexora_errlog'); Ayarlar'dan panoya kopyalanabilir (telefonda teşhis).
const KEY = 'nexora_errlog'; let log = [];
try { log = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(log)) log = []; } catch (_) { log = []; }
const add = (kind, msg, stack) => { log.push({ t: new Date().toISOString(), kind, msg: String(msg).slice(0, 300), stack: String(stack || '').split('\n').slice(0, 3).join(' | ').slice(0, 300), ua: navigator.userAgent.slice(0, 80) }); log = log.slice(-20); try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (_) { /* yoksay */ } };
export function initErrorLog() {
  addEventListener('error', (e) => add('error', e.message, e.error && e.error.stack));
  addEventListener('unhandledrejection', (e) => add('promise', e.reason && e.reason.message || e.reason, e.reason && e.reason.stack));
}
export const errorCount = () => log.length;
export const errorText = () => `CLASHBORN hata günlüğü (${log.length})\n` + log.map((l) => `${l.t} [${l.kind}] ${l.msg}\n  ${l.stack}\n  ${l.ua}`).join('\n');
export function clearErrors() { log = []; try { localStorage.removeItem(KEY); } catch (_) { /* yoksay */ } }
