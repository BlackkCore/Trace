// ── Globals ───────────────────────────────────────────────
'use strict';
const G = function(id){ return document.getElementById(id); };
let advType = 'xhttp';
let advEnc = 'none';  // value written when the Encryption toggle is on
let advPass = [];     // [key,value] params of a loaded link with no dedicated field
let hist = [];
let aQrLinks = [], aQrCur = 0;
let _uuidTarget = null;

// ── Base64 (Unicode-safe) ─────────────────────────────────
function toBase64(str) {
  // TextEncoder gives us UTF-8 bytes; we convert to a binary string for btoa
  var bytes = new TextEncoder().encode(str);
  var bin = '';
  bytes.forEach(function(b){ bin += String.fromCharCode(b); });
  return btoa(bin);
}
function fromBase64(b64) {
  // Normalise URL-safe base64 (- → +, _ → /) before stripping invalid chars —
  // many subscription providers use the URL-safe alphabet (RFC 4648 §5)
  b64 = (b64 || '').replace(/-/g, '+').replace(/_/g, '/');
  // Strip whitespace, newlines and any remaining chars atob rejects
  b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  // Re-pad to multiple of 4 in case padding was stripped
  while(b64.length % 4 !== 0) b64 += '=';
  try {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch(e) {
    throw new Error('Base64 decode failed: ' + e.message);
  }
}
function lsGet(k){ try{ var v=JSON.parse(localStorage.getItem(k)); return v; }catch(e){ return null; } }
function lsGetArr(k){ var v=lsGet(k); return Array.isArray(v)?v:[]; }
// Returns true when v was stored. Saved data is never trimmed to fit: on overflow the
// oldest history entries are evicted (they can be regenerated), and if that isn't
// enough the write is refused so callers can leave the user's existing data untouched.
function lsSet(k,v){
  for(;;) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch(e) {
      if(e.name !== 'QuotaExceededError' && e.name !== 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.error('lsSet failed ('+k+'):', e);
        toast(t('toast_storage_failed'), 'err');
        return false;
      }
      if(!hist.length) break;
      hist.pop(); // when k is bc_hist, v is hist itself, so the retry writes less
      if(k !== 'bc_hist') {
        try { localStorage.setItem('bc_hist', JSON.stringify(hist)); } catch(e2) {}
      } else if(!hist.length) {
        break;
      }
    }
  }
  console.error('lsSet failed (quota) for key:', k);
  toast(t('toast_storage_full'), 'err');
  return false;
}

// ── Safe fetch — URL allow-list to prevent SSRF ─────────────
// Only http:// and https:// are permitted. file://, data://, ftp://,
// and private/link-local addresses are blocked before the network call.
function _isPrivateIPv4(a, b) {
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
}

function _isBlockedHost(hostname) {
  if(!hostname) return true;
  var raw = String(hostname).trim();
  if(raw.charAt(0) !== '[' && raw.split(':').length > 2) raw = '[' + raw + ']';
  // The URL parser canonicalises 127.1, 0x7f.0.0.1, 2130706433 and IPv6 spellings
  var host;
  try { host = new URL('http://' + raw + '/').hostname.toLowerCase(); } catch(e) { return false; }
  host = host.replace(/\.+$/, '');
  if(host === 'localhost' || /\.(localhost|local)$/.test(host)) return true;
  if(host.charAt(0) === '[') {
    var v6 = host.slice(1, -1);
    var mapped = v6.match(/^::ffff:([0-9a-f]{1,4}):[0-9a-f]{1,4}$/);
    if(mapped) {
      var hi = parseInt(mapped[1], 16);
      return _isPrivateIPv4(hi >> 8, hi & 255);
    }
    return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
  }
  var v4 = host.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  return !!v4 && _isPrivateIPv4(parseInt(v4[1], 10), parseInt(v4[2], 10));
}

function safeFetch(url, opts) {
  var parsed;
  try { parsed = new URL(url); } catch(e) { return Promise.reject(new Error(t('m_bad_url'))); }
  if(parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return Promise.reject(new Error(t('m_http_only')));
  }
  var host = parsed.hostname;
  if(_isBlockedHost(host)) {
    return Promise.reject(new Error(t('m_private')));
  }
  return fetch(url, opts).then(function(res) {
    var finalHost = '';
    try { finalHost = new URL(res.url).hostname; } catch(e) {}
    if(res.redirected && finalHost && _isBlockedHost(finalHost)) {
      throw new Error(t('m_private'));
    }
    return res;
  });
}

// ── VLESS link parsing ────────────────────────────────────
// Single parser for every feature that reads a vless:// link.
function safeDecode(s) {
  try { return decodeURIComponent(s); } catch(e) { return s; }
}
function formatHost(host) {
  return host.indexOf(':') > -1 && host.charAt(0) !== '[' ? '[' + host + ']' : host;
}

const _LINK_KEYS  = ['encryption','security','sni','fp','alpn','insecure','allowInsecure','type','host','pbk','sid','spx','flow'];
const _PATH_TYPES = ['xhttp','ws','httpupgrade','splithttp'];

// Returns the link's fields, or null when it can't be parsed.
// Values are decoded exactly once and '+' stays literal (URLSearchParams would turn it
// into a space). Params without a dedicated field are kept in `pass` so that
// regenerating a link doesn't lose them.
function parseVless(raw) {
  raw = String(raw || '').trim();
  if(!/^vless:\/\//i.test(raw)) return null;
  var u;
  try { u = new URL(raw.replace(/^vless:\/\//i, 'https://')); } catch(e) { return null; }

  var q = Object.create(null), order = [];
  u.search.slice(1).split('&').forEach(function(kv) {
    if(!kv) return;
    var eq  = kv.indexOf('=');
    var key = safeDecode(eq < 0 ? kv : kv.slice(0, eq));
    if(key in q) return;
    q[key] = eq < 0 ? '' : safeDecode(kv.slice(eq + 1));
    order.push(key);
  });

  var type = q.type || 'tcp';
  var isX  = type === 'xhttp' || type === 'splithttp';
  var known = _LINK_KEYS.slice();
  if(_PATH_TYPES.indexOf(type) > -1) known.push('path');
  if(isX) known.push('mode', 'extra');
  if(type === 'grpc') known.push('serviceName');

  return {
    uuid: safeDecode(u.username),
    address: u.hostname.replace(/^\[|\]$/g, ''),
    port: u.port || '443', // https:// parsing strips :443, the VLESS default as well
    encryption: q.encryption || '',
    security: q.security || 'none',
    sni: q.sni || '', fp: q.fp || '', alpn: q.alpn || '',
    pbk: q.pbk || '', sid: q.sid || '', spx: q.spx || '', flow: q.flow || '',
    insecure: ['1','true'].indexOf(q.allowInsecure) > -1 || ['1','true'].indexOf(q.insecure) > -1,
    type: type, host: q.host || '', path: q.path || '/',
    mode: isX ? (q.mode || '') : '',
    extra: isX ? (q.extra || '') : '',
    serviceName: type === 'grpc' ? (q.serviceName || '') : '',
    remark: safeDecode(u.hash.slice(1)),
    q: q,
    pass: order.filter(function(k){ return known.indexOf(k) < 0; }).map(function(k){ return [k, q[k]]; })
  };
}

// ── UUID ──────────────────────────────────────────────────
// Accepts any UUID version (v1-v5 + random) — VLESS configs are not restricted to v4
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function genUUID() {
  // Use the browser's cryptographic RNG — available in all modern Chromium-based webviews
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for any edge case
  // crypto.getRandomValues fallback — cryptographically secure, no Math.random
  var buf = new Uint8Array(16);
  (typeof crypto !== 'undefined' ? crypto : window.crypto).getRandomValues(buf);
  buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // variant bits
  var hex = Array.from(buf).map(function(b){ return ('0'+b.toString(16)).slice(-2); });
  return hex.slice(0,4).join('')+'-'+hex.slice(4,6).join('')+'-'+hex.slice(6,8).join('')+'-'+hex.slice(8,10).join('')+'-'+hex.slice(10).join('');
}
function newUUID(id) {
  G(id).value = genUUID();
  G(id).classList.remove('invalid');
  var e = G('err_'+id); if(e) e.classList.remove('show');
  toast(t('toast_new_uuid'),'ok');
}
function validateUUID(id) {
  var val = G(id).value.trim(), valid = UUID_RE.test(val);
  G(id).classList.toggle('invalid',!valid);
  var e = G('err_'+id); if(e) e.classList.toggle('show',!valid);
  return valid;
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type, action) {
  var el = G('toast'), act = G('toastAct');
  if(!el) return;
  G('toastMsg').textContent = msg;
  act.hidden = !action;
  if(action) {
    act.textContent = action.label;
    act.onclick = function(){ el.className = ''; action.run(); };
  }
  el.className = 'show ' + (type || 'ok');
  var bar = G('toastBar');
  bar.className = '';
  if(action) { void bar.offsetWidth; bar.className = 'run'; }
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ el.className = ''; }, action ? 6000 : 2600);
}
// Deleted data stays recoverable for as long as the toast is on screen
function undoToast(msg, key, previous, restored) {
  toast(msg, 'ok', { label: t('undo'), run: function(){ lsSet(key, previous); restored(); updateRoute(); } });
}

// ── Helpers ───────────────────────────────────────────────
function linesOf(id) {
  return G(id).value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
}

// ── IP Range Expander ─────────────────────────────────────
// Supports:
//   192.168.1.1-10        → last-octet range
//   192.168.1.1-192.168.1.10  → full start-end range
//   192.168.1.0/24        → CIDR notation
//   plain IP / hostname   → returned as-is
function expandIPRange(entry) {
  entry = entry.trim();
    var result = [];

  // CIDR: e.g. 192.168.1.0/24
  var cidrMatch = entry.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if(cidrMatch) {
    var base = cidrMatch[1], prefix = parseInt(cidrMatch[2], 10);
    if(prefix < 0 || prefix > 32) return [entry];
    var hostBits = 32 - prefix;
    var count = Math.pow(2, hostBits);
    if(count > 65536) { toast(tf('m_cidr_large', { p: prefix, n: count }), 'err'); return [entry]; }
    if(!isValidIPv4(base)) return [entry];
    var ipNum = ipToInt(base);
    var networkNum = (ipNum & (~0 << hostBits)) >>> 0;
    // skip network (.0) and broadcast for /30 and larger subnets;
    // /31 (point-to-point) and /32 (host) use all addresses per RFC 3021/3927
    var start = prefix <= 30 ? networkNum + 1 : networkNum;
    var end   = prefix <= 30 ? networkNum + count - 2 : networkNum + count - 1;
    for(var cidrN = start; cidrN <= end; cidrN++) result.push(intToIp(cidrN));
    return result;
  }

  // Range with full IPs: e.g. 192.168.1.1-192.168.1.50
  var fullRangeMatch = entry.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})-(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if(fullRangeMatch) {
    if(!isValidIPv4(fullRangeMatch[1]) || !isValidIPv4(fullRangeMatch[2])) return [entry];
    var startN = ipToInt(fullRangeMatch[1]), endN = ipToInt(fullRangeMatch[2]);
    if(endN < startN) { toast(t('m_range_order'), 'err'); return [entry]; }
    if(endN - startN > 65535) { toast(t('m_range_large'), 'err'); return [entry]; }
    for(var rangeN = startN; rangeN <= endN; rangeN++) result.push(intToIp(rangeN));
    return result;
  }

  // Short range: last-octet only — e.g. 192.168.1.1-50
  var shortRangeMatch = entry.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)(\d{1,3})-(\d{1,3})$/);
  if(shortRangeMatch) {
    var prefix3 = shortRangeMatch[1];
    var from = parseInt(shortRangeMatch[2], 10), to = parseInt(shortRangeMatch[3], 10);
    if(to < from || from < 0 || to > 255 || !isValidIPv4(prefix3 + '0')) { toast(tf('m_bad_octet', { v: entry }), 'err'); return [entry]; }
    for(var i = from; i <= to; i++) result.push(prefix3 + i);
    return result;
  }

  // Plain IP or hostname — return as-is
  return [entry];
}

function isValidIPv4(ip) {
  return ip.split('.').every(function(o){ return parseInt(o, 10) <= 255; });
}
// expandIPRange hands back any range it refused, so a range-shaped entry here means
// the expansion failed; generating from it would produce a malformed link.
function rangesExpanded(ips) {
  var bad = ips.filter(function(ip){ return /^[\d.]+[-\/][\d.]+$/.test(ip); });
  if(bad.length) toast(t('toast_invalid_range') + bad[0], 'err');
  return !bad.length;
}
// [ip, sni] pairs to generate. Pair mode runs to the longer list and wraps the shorter
// one, so it always matches the live counter.
function pairsOf(ips, snis, paired) {
  var pairs = [];
  if(!ips.length) return pairs;
  if(paired && snis.length) {
    for(var i = 0; i < Math.max(ips.length, snis.length); i++) {
      pairs.push([ips[i % ips.length], snis[i % snis.length]]);
    }
    return pairs;
  }
  ips.forEach(function(ip) {
    (snis.length ? snis : ['']).forEach(function(sni){ pairs.push([ip, sni]); });
  });
  return pairs;
}
function ipToInt(ip) {
  // Use multiplication instead of bit-shift to avoid signed 32-bit overflow
  // on octets > 127 (e.g. 192.x, 172.x) during intermediate accumulation.
  return ip.split('.').reduce(function(acc, o){ return acc * 256 + parseInt(o, 10); }, 0) >>> 0;
}
function intToIp(n) {
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
}

// Expand all lines in an IP textarea, replacing ranges with individual IPs
function expandIPsInField(id) {
  var raw = G(id).value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
  var totalBefore = raw.length;
  var expanded = [];
  raw.forEach(function(line){ expanded = expanded.concat(expandIPRange(line)); });

  // Detect range/CIDR patterns directly — set membership comparison is unreliable
  // when the expanded count happens to equal the input count by coincidence.
  var rangePattern = /^[\d.]+[-\/][\d.]+$/;
  var hasRange = raw.some(function(l){ return rangePattern.test(l.trim()); });
  if(!hasRange) { toast(t('m_no_ranges'),'ok'); return; }
  G(id).value = expanded.join('\n');
  toast(tf('m_expanded', { n: expanded.length }),'ok');
}
function expandAdvIPs()    { expandIPsInField('a_ips'); liveCount(); }

// linesOfExpanded: like linesOf but auto-expands ranges before returning
function linesOfExpanded(id) {
  var raw = G(id).value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
  var result = [];
  raw.forEach(function(line){ result = result.concat(expandIPRange(line)); });
  return result;
}
// togglePairHint(chkId, hintId, offText?)
// offText is optional — pass a custom off-state string when the default
// 'OFF — full IP × SNI matrix' wording doesn't fit (e.g. Simple mode).
function togglePairHint(chkId,hintId,offText) {
  var on = G(chkId).checked;
  G(hintId).textContent = on
    ? t('pair_mode_on')
    : (offText || t('pair_mode_off_adv'));
}
// Selects val, adding a temporary option for values the list doesn't offer so a loaded
// link's setting is kept instead of the previous selection staying silently in place.
function setOptVal(sel,val) {
  val = val == null ? '' : String(val);
  Array.from(sel.options).forEach(function(o){
    if(o.dataset.loaded && o.value !== val) o.remove();
  });
  if(!Array.from(sel.options).some(function(o){ return o.value === val; })) {
    var opt = new Option(val, val);
    opt.dataset.loaded = '1';
    sel.add(opt);
  }
  sel.value = val;
}
// Reality's fields only apply to security=reality. prefix: 's' or 'a'.
function toggleReality(prefix) {
  var on = G(prefix + '_security').value === 'reality';
  document.querySelectorAll('.' + prefix + '-reality').forEach(function(el){
    el.classList.toggle('open', on);
  });
}
function dlText(filename, content) {
  // Inside Telegram Mini App: file downloads are not supported in WebView.
  // Copy the content to clipboard and notify the user.
  var tg = window._tg;
  if (tg) {
    navigator.clipboard.writeText(content).then(function() {
      toast(tf('m_clip_saved', { f: filename }), 'ok');
    }).catch(function() {
      // Clipboard also blocked — show content in a full-screen overlay so user can select & copy
      var box = document.createElement('div');
      box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;flex-direction:column;padding:16px;gap:10px;';
      var title = document.createElement('div');
      title.textContent = filename;
      title.style.cssText = 'color:var(--accent);font-weight:700;font-size:13px;flex-shrink:0;';
      var area = document.createElement('textarea');
      area.value = content;
      area.readOnly = true;
      area.style.cssText = 'flex:1;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:11px;resize:none;';
      var btn = document.createElement('button');
      btn.textContent = t('btn_close');
      btn.style.cssText = 'flex-shrink:0;';
      btn.onclick = function() { document.body.removeChild(box); };
      box.appendChild(title); box.appendChild(area); box.appendChild(btn);
      document.body.appendChild(box);
      setTimeout(function(){ area.select(); }, 50);
    });
    return;
  }
  // Normal browser: original download behaviour
  var url = URL.createObjectURL(new Blob([content],{type:'text/plain'}));
  var a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}
function applyRemarkTpl(tpl, ip, sni, port, idx, prefix) {
  if (!tpl) return (prefix ? prefix+'_' : '') + 'Config_' + idx;
  return tpl
    .replace(/\{prefix\}/g, prefix||'')
    .replace(/\{ip\}/g, ip||'')
    .replace(/\{sni\}/g, sni||'')
    .replace(/\{port\}/g, port||'')
    .replace(/\{idx\}/g, String(idx));
}

// ── Navigation ────────────────────────────────────────────
const _ROUTE = ['gen','check','export','library'];

function navTab(name) {
  var from = _ROUTE.findIndex(function(n){ return G('tp-'+n).classList.contains('active'); });
  _ROUTE.forEach(function(n){
    G('nt-'+n).classList.toggle('active', n===name);
    G('tp-'+n).classList.toggle('active', n===name);
  });
  var at = _ROUTE.indexOf(name);
  G('link1').classList.toggle('on', at===1 || at===2);
  G('link2').classList.toggle('on', at===2);
  routeMotion(name, from, at);
  if(name==='library') { renderProfiles(); renderUUIDs(); renderIPLists(); renderSNILists(); renderHist(); }
  if(name==='export') renderExport();
  updateRoute();
  syncThumbs();
  window.scrollTo(0, 0);
}

function subTab(group, name) {
  var section = G('tp-'+group);
  section.querySelectorAll('.sub').forEach(function(b){
    b.classList.toggle('active', b.dataset.sub === group+'-'+name);
  });
  section.querySelectorAll('.subpanel').forEach(function(p){
    p.classList.toggle('active', p.id === 'sp-'+group+'-'+name);
  });
  syncThumbs();
}

// Live counts on the route, so each step shows what it holds
function updateRoute() {
  var usable = _cfgPingResults.filter(function(r){ return r.ok || r.inconclusive; }).length;
  G('stepBuild').textContent = _advRawLinks.length + ' ' + t('dyn_links');
  G('stepCheck').textContent = _cfgPingResults.length ? usable + ' ' + t('step_working') : '0 ' + t('step_tested');
  G('stepExport').textContent = t('fmt_' + _fmt).split(' ')[0];
  var saved = ['bc_profiles','bc_uuids','bc_iplists','bc_snilists'].reduce(function(n, k){ return n + lsGetArr(k).length; }, 0);
  G('stepLibrary').textContent = saved + ' ' + t('step_saved');
}

// Sends the generated links straight into a test
function checkLinks() {
  if(!_advRawLinks.length) { toast(t('toast_generate_first'), 'err'); return; }
  G('cfgPingInput').value = _advRawLinks.join('\n');
  navTab('check');
  subTab('check', 'servers');
  runCfgPing();
}

// ── Build query params ────────────────────────────────────
function buildParams(opts) {
  var q = [];
  var sec = opts.security||'tls';
  if(opts.useEnc) q.push('encryption='+encodeURIComponent(opts.enc||'none'));
  q.push('security='+encodeURIComponent(sec));
  if(sec!=='none'){
    if(opts.sni)  q.push('sni='+encodeURIComponent(opts.sni));
    if(opts.fp)   q.push('fp='+encodeURIComponent(opts.fp));
    if(opts.alpn) q.push('alpn='+encodeURIComponent(opts.alpn));
    q.push('insecure='+(opts.insecure?'1':'0'));
    q.push('allowInsecure='+(opts.insecure?'1':'0'));
  }
  if(sec==='reality'){
    if(opts.pbk) q.push('pbk='+encodeURIComponent(opts.pbk));
    if(opts.sid) q.push('sid='+encodeURIComponent(opts.sid));
    if(opts.spx) q.push('spx='+encodeURIComponent(opts.spx));
  }
  if(opts.flow) q.push('flow='+encodeURIComponent(opts.flow));
  var type = opts.type||'tcp';
  if(type!=='tcp') q.push('type='+encodeURIComponent(type));
  if(opts.host) q.push('host='+encodeURIComponent(opts.host));
  var showPath = _PATH_TYPES.indexOf(type)>-1;
  if(showPath && opts.path) q.push('path='+encodeURIComponent(opts.path||'/'));
  var isX = type==='xhttp'||type==='splithttp';
  if(isX && opts.mode && opts.mode!=='auto') q.push('mode='+encodeURIComponent(opts.mode));
  if(isX && opts.extra) q.push('extra='+encodeURIComponent(opts.extra));
  if(type==='grpc' && opts.grpc) q.push('serviceName='+encodeURIComponent(opts.grpc));
  (opts.pass||[]).forEach(function(kv){ q.push(encodeURIComponent(kv[0])+'='+encodeURIComponent(kv[1])); });
  return q;
}

// ── QR helpers ────────────────────────────────────────────
function renderQR(canvasId,link) {
  QRCode.toCanvas(G(canvasId),link,{width:160,margin:1,color:{dark:'#000',light:'#fff'}});
}
function updateAQr() {
  if(!aQrLinks.length) return;
  renderQR('aQr',aQrLinks[aQrCur]);
  G('aQrIdx').textContent=(aQrCur+1)+' / '+aQrLinks.length;
  G('aQrNav').style.display=aQrLinks.length>1?'flex':'none';
}
function aQrPrev(){ if(aQrCur>0){ aQrCur--; updateAQr(); } }
function aQrNext(){ if(aQrCur<aQrLinks.length-1){ aQrCur++; updateAQr(); } }

// ── Transport type ──────────────────────────────
function aType(type) {
  if(type!==advType) advPass=[]; // kept params belong to the transport they came with
  advType=type;
  document.querySelectorAll('.pill').forEach(function(p){ p.classList.toggle('active',p.textContent===type); });
  var showPath=['xhttp','ws','httpupgrade','splithttp'].indexOf(type)>-1;
  var showHost=['xhttp','ws','httpupgrade','splithttp','grpc'].indexOf(type)>-1;
  var showX=type==='xhttp'||type==='splithttp';
  syncThumbs();
  G('a_xhttpF').style.display   = showX          ? '':'none';
  G('a_grpcF').style.display    = type==='grpc'  ? '':'none';
  G('a_pathRow').style.display  = showPath       ? '':'none';
  G('a_hostRow').style.display  = showHost       ? '':'none';
}

// ── Generate ────────────────────────────────────
function advGen() {
  var uuid = G('a_uuid').value.trim();
  if(!uuid){ toast(t('toast_uuid_required'),'err'); return; }
  if(!validateUUID('a_uuid')){ toast(t('toast_invalid_uuid'),'err'); return; }
  var portVal=parseInt(G('a_port').value.trim(),10);
  if(!portVal||portVal<1||portVal>65535){ toast(t('toast_port_invalid'),'err'); return; }
  var port=String(portVal);
  var ips=linesOfExpanded('a_ips'), snis=linesOf('a_snis');
  if(!ips.length){ toast(t('toast_add_ip'),'err'); return; }
  if(!rangesExpanded(ips)) return;
  var pbk      = G('a_pbk').value.trim();
  if(G('a_security').value==='reality' && !pbk){ toast(t('toast_reality_pbk'),'err'); return; }
  var tpl      = G('a_prefix').value.trim();
  var prefixVal = G('a_prefix_val') ? G('a_prefix_val').value.trim() : '';
  var security = G('a_security').value;
  var fp       = G('a_fp').value;
  var alpn     = G('a_alpn').value;
  var insecure = G('a_insecure').checked;
  var useEnc   = G('a_encryption').checked;
  var host     = G('a_host').value.trim();
  var path     = G('a_path').value.trim()||'/';
  var mode     = G('a_mode').value;
  var extra    = G('a_extra').value.trim();
  var grpc     = G('a_grpc').value.trim();
  var flow     = G('a_flow').value;
  var sid      = G('a_sid').value.trim();
  var spx      = G('a_spx').value.trim();
  var ipList   = ips.length ? ips : [''];
  var sniList  = snis.length ? snis : [''];
  // Warn before generating very large outputs — matrix mode can produce
  // thousands of links that slow down the browser's text rendering.
  var paired=G('a_pairMode').checked;
  var estimatedCount = paired ? Math.max(ipList.length, sniList.length) : ipList.filter(Boolean).length * sniList.length;
  if(estimatedCount > 50000) {
    toast(t('toast_generating_too_many'), 'err');
    return;
  }
  if(estimatedCount > 15000) {
    if(!confirm(estimatedCount.toLocaleString() + t('dyn_confirm_large'))) return;
  }
  var out=[],idx=1;
  pairsOf(ips,snis,paired).forEach(function(pair){
    var ip=pair[0], sni=pair[1];
    var q=buildParams({useEnc:useEnc,enc:advEnc,security:security,sni:sni,fp:fp,alpn:alpn,insecure:insecure,type:advType,host:host,path:path,mode:mode,extra:extra,grpc:grpc,flow:flow,pbk:pbk,sid:sid,spx:spx,pass:advPass});
    var remark=applyRemarkTpl(tpl,ip,sni,port,idx,prefixVal);
    out.push('vless://'+uuid+'@'+formatHost(ip)+':'+port+'?'+q.join('&')+'#'+encodeURIComponent(remark));
    idx++;
  });
  var txt=out.join('\n');
  G('aLinks').textContent=out.length;
  G('aIPs').textContent=ipList.filter(Boolean).length;
  G('aSNIs').textContent=sniList.filter(Boolean).length;
  aQrLinks=out; aQrCur=0; updateAQr();
  G('aQrW').classList.remove('open'); G('aQrBtn').textContent=t('btn_qr');
  // Store canonical link list for filter/sort/shuffle; reset UI controls
  _advRawLinks = out.slice();
  _outRenderUnlocked = false; // reset "Show all" state for the new result set
  _resetAdvFilterSort();
  // Use renderAdvOut so dataset.plain is always set (required for Clash/Singbox/download/filter)
  renderAdvOut(out);
  staggerIn(G('aOut').querySelectorAll('.out-row'));
  once(G('genBtn'), 'sheen', 700);
  hist.unshift({time:Date.now(),count:out.length,first:out[0]||'',all:txt});
  if(hist.length>20) hist.pop();
  updateRoute();
  if(!lsSet('bc_hist', hist)) return; // keep the storage warning on screen
  toast(out.length+' '+t('dyn_config')+(out.length!==1&&_currentLang==='en'?'s':'')+t('toast_generated'),'ok');
}

function advQR(){ if(G('aOut').classList.contains('empty')){ toast(t('toast_generate_first'),'err'); return; } G('aQrW').classList.toggle('open'); G('aQrBtn').textContent=G('aQrW').classList.contains('open')?t('dyn_hide_qr'):t('dyn_show_qr'); }
function advCopyOut() {
  if(G('aOut').classList.contains('empty')){ toast(t('toast_nothing_copy'),'err'); return; }

  // Always use _advRawLinks — the canonical source (reflects shuffle/sort order).
  // Filter reduces to the visible subset when a filter query is active.
  var q = G('aOutFilter').value.trim().toLowerCase();
  var txt = q
    ? _advRawLinks.filter(function(l){ return l.toLowerCase().indexOf(q) > -1; }).join('\n')
    : _advRawLinks.join('\n');

  safeClipboard(txt)
    .then(function(){ flashCopied(G('copyOutBtn')); })
    .catch(function(){ toast(t('m_copy_failed'),'err'); });
}
function advClear(){
  ['a_uuid','a_ips','a_snis','a_host','a_prefix','a_prefix_val','a_grpc','a_pbk','a_sid','a_spx','impUri'].forEach(function(id){ G(id).value=''; });
  G('a_port').value='443'; G('a_path').value='/'; G('a_extra').value='{"xPaddingBytes":"100-1000"}';
  setOptVal(G('a_flow'),''); advEnc='none'; advPass=[];
  G('parts').hidden=true;
  _pasteHint();
  G('aOut').textContent=t('adv_output_empty'); G('aOut').classList.add('empty'); G('aOut').dataset.plain='';
  G('aBadge').textContent='0 '+t('dyn_links'); G('aLinks').textContent=G('aIPs').textContent=G('aSNIs').textContent='0';
  G('aQrW').classList.remove('open'); G('aQrBtn').textContent=t('btn_qr');
  aQrLinks=[]; aQrCur=0;
  _advRawLinks=[]; _outRenderUnlocked=false; _resetAdvFilterSort();
  _liveCountNow(); updateRoute();
  toast(t('toast_cleared'),'ok');
}

// ── Paste detection ───────────────────────────────────────
// The paste box accepts anything: it works out what it was given and routes it.
function _pasteStatus(state, msg) {
  var el = G('pasteStatus');
  el.className = 'detect ' + state;
  el.textContent = msg;
}

// With an empty paste box, offers an example link. It uses a reserved documentation address.
function _pasteHint() {
  if(G('impUri').value.trim()) return;
  _pasteStatus('', t('paste_hint'));
  var b = document.createElement('button');
  b.className = 'mini-btn accent';
  b.textContent = t('paste_try');
  b.addEventListener('click', function() {
    G('impUri').value = 'vless://' + genUUID() + '@203.0.113.10:443?security=tls&sni=cdn.example.com&fp=chrome&type=ws&path=%2Fws#Example';
    smartPaste();
    G('impUri').focus();
  });
  G('pasteStatus').appendChild(b);
}

function _openInCheck(links) {
  G('cfgPingInput').value = links.join('\n');
  navTab('check');
  subTab('check', 'servers');
  toast(t('paste_many').replace('{n}', links.length), 'ok');
}

function smartPaste() {
  var raw = G('impUri').value.trim();
  G('parts').hidden = true;
  if(!raw) { _pasteHint(); return; }
  if(raw.length > 2000000) { _pasteStatus('bad', t('toast_input_too_large')); return; }
  var lines = raw.split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
  var links = lines.filter(function(x){ return /^vless:\/\//i.test(x); });
  if(links.length > 1) { _pasteStatus('ok', t('paste_many').replace('{n}', links.length)); _openInCheck(links); return; }
  if(links.length === 1) {
    var c = parseVless(links[0]);
    if(!c) { _pasteStatus('bad', t('toast_parse_failed')); return; }
    applyLink(c);
    renderParts(c);
    _pasteStatus('ok', t('paste_link'));
    return;
  }
  if(/^https?:\/\//i.test(raw)) {
    _pasteStatus('ok', t('paste_url'));
    var fetchBtn = document.createElement('button');
    fetchBtn.className = 'mini-btn';
    fetchBtn.textContent = t('paste_fetch');
    fetchBtn.addEventListener('click', function(){
      G('subUrlInput').value = raw;
      navTab('check'); subTab('check', 'import'); bulkSwitchTab('url');
      fetchSubUrl();
    });
    G('pasteStatus').appendChild(fetchBtn);
    return;
  }
  if(/^[A-Za-z0-9+\/=_-]{16,}$/.test(raw.replace(/\s/g, ''))) {
    var decoded = [];
    try { decoded = fromBase64(raw).split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return /^vless:\/\//i.test(x); }); } catch(e) {}
    if(decoded.length) { _pasteStatus('ok', t('paste_many').replace('{n}', decoded.length)); _openInCheck(decoded); return; }
  }
  _pasteStatus('bad', t('paste_bad'));
}

// Fills the form from a parsed link. Every field is set, so nothing from the previous
// config carries over.
function applyLink(c) {
  G('a_uuid').value = c.uuid; G('a_uuid').classList.remove('invalid');
  G('a_ips').value = c.address; G('a_port').value = c.port;
  G('a_prefix').value = c.remark; G('a_snis').value = c.sni;
  G('a_host').value = c.host; G('a_path').value = c.path;
  setOptVal(G('a_security'), c.security); setOptVal(G('a_fp'), c.fp); setOptVal(G('a_alpn'), c.alpn);
  setOptVal(G('a_flow'), c.flow);
  G('a_pbk').value = c.pbk; G('a_sid').value = c.sid; G('a_spx').value = c.spx;
  toggleReality('a');
  G('a_insecure').checked = c.insecure; G('insecureNote').hidden = !c.insecure;
  G('a_encryption').checked = !!c.encryption;
  advEnc = c.encryption || 'none';
  aType(c.type);
  advPass = c.pass;
  setOptVal(G('a_mode'), c.mode || 'auto');
  G('a_extra').value = c.extra;
  G('a_grpc').value = c.serviceName;
  liveCount();
}

// After a language change, relabels the breakdown without touching what the user edited
let _lastLink = null;
function refreshPaste() {
  if(G('parts').hidden || !_lastLink) return;
  renderParts(_lastLink);
  _pasteStatus('ok', t('paste_link'));
}

// Shows the pasted link split into its parts. Clicking a part jumps to its field.
function renderParts(c) {
  var el = G('parts');
  _lastLink = c;
  var fresh = el.dataset.was !== c.uuid + c.address;
  el.dataset.was = c.uuid + c.address;
  el.classList.toggle('fresh', fresh);
  el.textContent = '';
  function sep(text) {
    var s = document.createElement('span');
    s.className = 'sep'; s.textContent = text;
    s.style.setProperty('--i', el.children.length);
    el.appendChild(s);
  }
  function part(value, labelKey, fieldId) {
    var b = document.createElement('button');
    b.className = 'tok';
    var v = document.createElement('i'); v.textContent = value;
    var l = document.createElement('small'); l.textContent = t(labelKey);
    b.appendChild(v); b.appendChild(l);
    b.style.setProperty('--i', el.children.length);
    b.addEventListener('click', function(){ G(fieldId).focus(); });
    el.appendChild(b);
  }
  sep('vless://');
  part(c.uuid.slice(0, 8) + '…', 'label_uuid', 'a_uuid');
  sep('@'); part(c.address, 'label_address', 'a_ips');
  sep(':'); part(c.port, 'label_port', 'a_port');
  sep('?'); part(c.security, 'label_security', 'a_security');
  sep('&'); part(c.type, 'label_type', 'a_security');
  if(c.remark) { sep('#'); part(c.remark, 'label_remark', 'a_prefix'); }
  el.hidden = false;
}

// ── List rows ─────────────────────────────────────────────
// o: { title, meta, metaMono, tag, tagOn, titleInput, actions:[{label,run}], pick }
function listItem(o) {
  var item = document.createElement('div');
  item.className = 'hist-item' + (o.pick ? ' pick' : '');
  if(o.pick) item.addEventListener('click', o.pick);
  var main = document.createElement('div');
  main.className = 'item-main';
  if(o.titleInput) { main.appendChild(o.titleInput); }
  else {
    var title = document.createElement('b');
    title.textContent = o.title;
    main.appendChild(title);
  }
  if(o.meta) {
    var meta = document.createElement('small');
    if(o.metaMono) meta.className = 'mono';
    meta.textContent = o.meta;
    main.appendChild(meta);
  }
  item.appendChild(main);
  if(o.tag) {
    var tag = document.createElement('span');
    tag.className = 'tag' + (o.tagOn ? ' on' : '');
    tag.textContent = o.tag;
    item.appendChild(tag);
  }
  (o.actions || []).forEach(function(a){
    var b = document.createElement('button');
    b.className = 'text-act' + (a.main ? ' main' : '');
    b.textContent = a.label;
    b.addEventListener('click', a.run);
    item.appendChild(b);
  });
  return item;
}
function emptyState(el, msg) {
  el.textContent = '';
  var d = document.createElement('div');
  d.className = 'empty-state';
  d.textContent = msg;
  el.appendChild(d);
}

// ── History ───────────────────────────────────────────────
function renderHist(){
  var el=G('histList');
  if(!hist.length){ emptyState(el, t('dyn_no_history')); return; }
  var frag = document.createDocumentFragment();
  hist.forEach(function(h, i) {
    frag.appendChild(listItem({
      title: h.count + ' ' + t('dyn_links'),
      meta: fmtTime(h.time) + (h.first ? '  ' + getRemark(h.first) : ''),
      actions: [
        { label: t('btn_copy'), run: function(){ copyH(i); } },
        { label: t('dyn_load_btn'), main: true, run: function(){ loadH(i); } }
      ]
    }));
  });
  el.textContent = '';
  el.appendChild(frag);
}
function copyH(i){ safeClipboard(hist[i].all||hist[i].first).then(function(){ toast(t('copied'),'ok'); }).catch(function(){ toast(t('m_copy_failed'),'err'); }); }
function loadH(i) {
  var h = hist[i]; if(!h) return;
  var raw = h.all || h.first || '';
  if(!raw){ toast(t('m_hist_empty'),'err'); return; }
  var links = raw.split('\n').filter(Boolean);
  _advRawLinks = links;
  _outRenderUnlocked = false; // reset render cap so large history entries don't freeze the browser
  renderAdvOut(links);
  _resetAdvFilterSort();
  var count = h.count || links.length;
  G('aBadge').textContent = count + ' ' + t('dyn_link') + (count !== 1 && _currentLang==='en' ? 's' : '');
  G('aLinks').textContent = count;
  G('aIPs').textContent   = '—';
  G('aSNIs').textContent  = '—';
  aQrLinks = links; aQrCur = 0; updateAQr();
  navTab('gen');
  toast(t('m_loaded'),'ok');
}
function clearHist(){
  var previous = hist;
  hist = [];
  lsSet('bc_hist', []);
  renderHist();
  toast(t('toast_cleared'), 'ok', { label: t('undo'), run: function(){ hist = previous; lsSet('bc_hist', hist); renderHist(); } });
}
function exportHist(){
  if(!hist.length){ toast(t('m_no_hist'),'err'); return; }
  dlText('vless_history.txt', hist.map(function(h){ return '# '+fmtTime(h.time)+' ('+h.count+')\n'+h.all; }).join('\n\n'));
  toast(t('m_exported'),'ok');
}

// ══════════════════════════════════════════════════════════
// PROFILES
// ══════════════════════════════════════════════════════════
function saveProfile(){
  G('profileName').value='';
  G('profileModal').classList.add('open');
  setTimeout(function(){ G('profileName').focus(); },100);
}
function confirmSaveProfile(){
  var name=G('profileName').value.trim();
  if(!name){ toast(t('m_profile_name'),'err'); return; }
  var profiles=lsGetArr('bc_profiles');
  var data = captureAdvanced();
  data._mode='advanced';
  data._subUrl = G('profileSubUrl').value.trim();
  var existing=profiles.findIndex(function(p){ return p.name===name; });
  var entry={name:name,data:data,time:Date.now(),subUrl:data._subUrl};
  if(existing>-1) { entry.pinned=profiles[existing].pinned; profiles[existing]=entry; }
  else profiles.unshift(entry);
  if(!lsSet('bc_profiles',profiles)) return;
  closeProfileModalDirect();
  toast(tf('m_profile_saved', { n: name }),'ok');
  renderProfiles();
  updateRoute();
}
function captureAdvanced(){
  return { uuid:G('a_uuid').value, port:G('a_port').value, ips:G('a_ips').value, snis:G('a_snis').value, host:G('a_host').value, path:G('a_path').value, security:G('a_security').value, fp:G('a_fp').value, alpn:G('a_alpn').value, prefix:G('a_prefix').value, prefixVal:G('a_prefix_val').value, insecure:G('a_insecure').checked, pairMode:G('a_pairMode').checked, type:advType, extra:G('a_extra').value, grpc:G('a_grpc').value, encryption:G('a_encryption').checked, enc:advEnc, pass:advPass, flow:G('a_flow').value, pbk:G('a_pbk').value, sid:G('a_sid').value, spx:G('a_spx').value, mode:G('a_mode').value };
}
function renderProfiles(){
  var profiles=lsGetArr('bc_profiles');
  var el=G('profileList');
  var q = G('profileSearch').value.trim().toLowerCase();
  var filtered = q ? profiles.filter(function(p){ return p.name.toLowerCase().indexOf(q) > -1; }) : profiles;
  if(!profiles.length){ emptyState(el, t('dyn_no_profiles')); return; }
  if(!filtered.length){ emptyState(el, t('dyn_no_profiles_match') + ' "' + q + '"'); return; }
  var frag = document.createDocumentFragment();
  filtered.forEach(function(p) {
    var idx = profiles.indexOf(p);
    var actions = [];
    if(p.subUrl || (p.data && p.data._subUrl)) actions.push({ label: t('dyn_refresh_sub'), run: function(){ refreshProfileSub(idx); } });
    actions.push({ label: p.pinned ? t('dyn_unpin_title') : t('dyn_pin_title'), run: function(){ togglePin(idx); } });
    actions.push({ label: t('dyn_load_btn'), main: true, run: function(){ loadProfile(idx); } });
    actions.push({ label: t('btn_delete'), run: function(){ deleteProfile(idx); } });
    frag.appendChild(listItem({ title: p.name, meta: fmtTime(p.time), tag: p.pinned ? t('dyn_pinned') : '', tagOn: true, actions: actions }));
  });
  el.textContent = '';
  el.appendChild(frag);
}

function togglePin(i){
  var profiles=lsGetArr('bc_profiles');
  if(!profiles[i]) return;
  profiles[i].pinned = !profiles[i].pinned;
  var nowPinned = profiles[i].pinned;
  profiles.sort(function(a,b){ return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });
  lsSet('bc_profiles',profiles);
  renderProfiles();
  toast(nowPinned ? t('toast_pinned') : t('toast_unpinned'),'ok');
}
// Loads a profile into the Build form. Profiles saved by older versions used separate
// Simple and Advanced shapes, and on/off switches for some fields.
function loadProfile(i){
  var p=lsGetArr('bc_profiles')[i];
  if(!p) return;
  var d=p.data, simple=d._mode==='simple';
  G('a_uuid').value=d.uuid||''; G('a_uuid').classList.remove('invalid'); G('a_port').value=d.port||'443';
  G('a_ips').value=d.useIps===false?'':(d.ips||'');
  G('a_snis').value=d.useSnis===false?'':(d.snis||'');
  G('a_host').value=d.useHost===false?'':(d.host||'');
  G('a_path').value=d.usePath===false?'/':(d.path||'/');
  setOptVal(G('a_security'),d.security||'tls'); setOptVal(G('a_fp'),d.fp||''); setOptVal(G('a_alpn'),d.alpn||'');
  setOptVal(G('a_flow'),d.flow||'');
  G('a_pbk').value=d.pbk||''; G('a_sid').value=d.sid||''; G('a_spx').value=d.spx||'';
  toggleReality('a');
  G('a_prefix').value=(simple?d.remark:d.prefix)||'';
  G('a_prefix_val').value=(simple?d.prefix:d.prefixVal)||'';
  G('a_insecure').checked=!!d.insecure; G('insecureNote').hidden=!d.insecure;
  G('a_pairMode').checked=!!d.pairMode;
  togglePairHint('a_pairMode','a_pairHint');
  aType((simple?d.simType:d.type)||'tcp');
  advPass=d.pass||[];
  var enc=simple?(d.simEnc||(d.simHasEnc?'none':'')):(d.encryption?(d.enc||'none'):'');
  G('a_encryption').checked=!!enc; advEnc=enc||'none';
  G('a_extra').value=d.useExtra===false?'':(d.extra||'');
  G('a_grpc').value=d.grpc||'';
  setOptVal(G('a_mode'),d.mode||'auto');
  liveCount();
  navTab('gen');
  toast(tf('m_profile_loaded', { n: p.name }),'ok');
}
function deleteProfile(i){
  var profiles=lsGetArr('bc_profiles'), previous=profiles.slice(), gone=profiles.splice(i,1)[0];
  lsSet('bc_profiles',profiles);
  renderProfiles();
  updateRoute();
  undoToast(t('toast_deleted').replace('{n}', gone.name), 'bc_profiles', previous, renderProfiles);
}
function closeProfileModal(e){ if(e.target===G('profileModal')) closeProfileModalDirect(); }
function closeProfileModalDirect(){ G('profileModal').classList.remove('open'); G('profileName').value=''; if(G('profileSubUrl')) G('profileSubUrl').value=''; }

async function refreshProfileSub(i) {
  var profiles = lsGetArr('bc_profiles');
  var p = profiles[i]; if(!p) return;
  var url = p.subUrl || (p.data && p.data._subUrl) || '';
  if(!url){ toast(t('m_no_sub'),'err'); return; }
  toast(t('m_refreshing'),'ok');

  var controller = new AbortController();
  var tid = setTimeout(function(){ controller.abort(); }, 15000);

  try {
    var res = await safeFetch(url, { signal: controller.signal });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    var text = (await res.text()).trim();
    var links = [];
    try { var decoded = fromBase64(text); links = decoded.split('\n').map(function(x){return x.trim();}).filter(function(x){return x.startsWith('vless://');});} catch(e){}
    if(!links.length) links = text.split('\n').map(function(x){return x.trim();}).filter(function(x){return x.startsWith('vless://');});
    if(!links.length){ toast(t('m_sub_empty'),'err'); return; }
    var existing = G('bulkInput').value.trim();
    var existingLinks = existing ? existing.split('\n').map(function(x){return x.trim();}).filter(Boolean) : [];
    var existingSet = {};
    existingLinks.forEach(function(l){ existingSet[l.replace(/#[^#]*$/, '')] = true; });
    var newLinks = links.filter(function(l){ return !existingSet[l.replace(/#[^#]*$/, '')]; });
    G('bulkInput').value = existingLinks.concat(newLinks).join('\n');
    navTab('check');
    subTab('check','import');
    bulkSwitchTab('links');
    toast(tf('m_sub_added', { a: newLinks.length, b: links.length - newLinks.length }), 'ok');
  } catch(e) {
    var msg = e.name === 'AbortError' ? t('m_timeout') : e.message;
    toast(tf('m_refresh_failed', { e: msg }), 'err');
  } finally {
    clearTimeout(tid);
  }
}

// ══════════════════════════════════════════════════════════
// UUID MANAGER
// Threat model note: UUIDs are stored in localStorage under 'bc_uuids'.
// In a Tauri WebView this storage is process-isolated and safe.
// If dist/index.html is opened directly in a browser, any extension
// with access to that origin can read all saved UUIDs.
// For production hardening, migrate to Tauri fs plugin + $APPDATA storage.
// ══════════════════════════════════════════════════════════
function addUUID(){
  var uuids=lsGetArr('bc_uuids');
  var uuid=genUUID();
  uuids.unshift({uuid:uuid,name:'UUID '+(uuids.length+1)});
  if(!lsSet('bc_uuids',uuids)) return;
  renderUUIDs();
  updateRoute();
  toast(t('m_uuid_added'),'ok');
}
function showAddCustomUUID(){
  var row=G('customUUIDRow');
  row.style.display = row.style.display==='none' ? '' : 'none';
  if(row.style.display!=='none') setTimeout(function(){ G('customUUIDInput').focus(); },60);
}
function validateCustomUUID(){
  var val=G('customUUIDInput').value.trim();
  var valid=UUID_RE.test(val)||val==='';
  G('customUUIDInput').classList.toggle('invalid',!valid&&val!=='');
  var e=G('err_customUUID'); if(e) e.classList.toggle('show',!valid&&val!=='');
  return valid;
}
function confirmAddCustomUUID(){
  var val=G('customUUIDInput').value.trim();
  if(!val){ toast(t('m_enter_uuid'),'err'); return; }
  if(!UUID_RE.test(val)){ toast(t('toast_invalid_uuid'),'err'); return; }
  var name=G('customUUIDName').value.trim()||'Custom UUID';
  var uuids=lsGetArr('bc_uuids');
  if(uuids.find(function(u){ return u.uuid===val; })){ toast(t('m_uuid_dup'),'err'); return; }
  uuids.unshift({uuid:val,name:name});
  if(!lsSet('bc_uuids',uuids)) return;
  G('customUUIDInput').value='';
  G('customUUIDName').value='';
  G('customUUIDRow').style.display='none';
  renderUUIDs();
  updateRoute();
  toast(t('m_uuid_added'),'ok');
}
function renderUUIDs(){
  var uuids=lsGetArr('bc_uuids');
  var el=G('uuidList');
  if(!uuids.length){ emptyState(el, t('dyn_no_uuids')); return; }
  var frag = document.createDocumentFragment();
  uuids.forEach(function(u, i) {
    var name = document.createElement('input');
    name.value = u.name;
    name.setAttribute('aria-label', t('label_nickname'));
    name.addEventListener('change', function(){ renameUUID(i, this.value); });
    frag.appendChild(listItem({
      titleInput: name, meta: u.uuid, metaMono: true,
      actions: [
        { label: t('btn_copy'), run: function(){ copyUUIDItem(u.uuid); } },
        { label: t('btn_delete'), run: function(){ deleteUUID(i); } }
      ]
    }));
  });
  el.textContent = '';
  el.appendChild(frag);
}
function renameUUID(i,name){
  var uuids=lsGetArr('bc_uuids');
  if(uuids[i]) uuids[i].name=name;
  lsSet('bc_uuids',uuids);
}
function deleteUUID(i){
  var uuids=lsGetArr('bc_uuids'), previous=uuids.slice(), gone=uuids.splice(i,1)[0];
  lsSet('bc_uuids',uuids);
  renderUUIDs();
  updateRoute();
  undoToast(t('toast_deleted').replace('{n}', gone.name), 'bc_uuids', previous, renderUUIDs);
}
function copyUUIDItem(uuid){
  safeClipboard(uuid).then(function(){ toast(t('copied'),'ok'); }).catch(function(){ toast(t('m_copy_failed'),'err'); });
}
function pickUUID(targetId){
  _uuidTarget=targetId;
  var uuids=lsGetArr('bc_uuids');
  var el=G('uuidPickList');
  if(!uuids.length) emptyState(el, t('dyn_no_saved_uuids'));
  else {
    var frag = document.createDocumentFragment();
    uuids.forEach(function(u) {
      frag.appendChild(listItem({ title: u.name, meta: u.uuid, metaMono: true, pick: function(){ selectUUID(u.uuid); } }));
    });
    el.textContent = '';
    el.appendChild(frag);
  }
  G('uuidModal').classList.add('open');
}
function selectUUID(uuid){
  if(_uuidTarget){ G(_uuidTarget).value=uuid; G(_uuidTarget).classList.remove('invalid'); }
  closeUUIDModalDirect();
  toast(t('m_uuid_applied'),'ok');
}
function closeUUIDModal(e){ if(e.target===G('uuidModal')) closeUUIDModalDirect(); }
function closeUUIDModalDirect(){ G('uuidModal').classList.remove('open'); _uuidTarget=null; }

// ══════════════════════════════════════════════════════════
// IP LIST MANAGER
// ══════════════════════════════════════════════════════════
let _ipTarget = null; // field id that triggered the IP picker

function showAddIPList() {
  var row = G('addIPListRow');
  row.style.display = row.style.display === 'none' ? '' : 'none';
  if(row.style.display !== 'none') setTimeout(function(){ G('ipListName').focus(); }, 60);
}

function confirmAddIPList() {
  var name = G('ipListName').value.trim();
  var ips  = G('ipListInput').value.trim();
  if(!name) { toast(t('m_label_ip'),'err'); return; }
  if(!ips)  { toast(t('toast_add_ip'),'err'); return; }
  var lists = lsGetArr('bc_iplists');
  var existing = lists.findIndex(function(l){ return l.name===name; });
  var entry = { name:name, ips:ips, time:new Date().toLocaleString() };
  if(existing > -1) lists[existing] = entry;
  else lists.unshift(entry);
  if(!lsSet('bc_iplists', lists)) return;
  G('ipListName').value=''; G('ipListInput').value='';
  G('addIPListRow').style.display='none';
  renderIPLists();
  updateRoute();
  toast(tf('m_list_saved', { n: name }),'ok');
}

function _lineCount(text) {
  return text.split('\n').filter(function(x){ return x.trim(); }).length;
}
function renderIPLists() {
  var lists = lsGetArr('bc_iplists');
  var el = G('ipSavedList');
  if(!lists.length) { emptyState(el, t('dyn_no_ip_lists')); return; }
  var frag = document.createDocumentFragment();
  lists.forEach(function(l, i) {
    frag.appendChild(listItem({
      title: l.name, meta: _lineCount(l.ips) + ' ' + t('dyn_entries'),
      actions: [
        { label: t('btn_copy'), run: function(){ copyIPListItem(i); } },
        { label: t('btn_delete'), run: function(){ deleteIPList(i); } }
      ]
    }));
  });
  el.textContent = '';
  el.appendChild(frag);
}

function deleteIPList(i) {
  var lists = lsGetArr('bc_iplists'), previous = lists.slice(), gone = lists.splice(i,1)[0];
  lsSet('bc_iplists',lists);
  renderIPLists();
  updateRoute();
  undoToast(t('toast_deleted').replace('{n}', gone.name), 'bc_iplists', previous, renderIPLists);
}

function copyIPListItem(i) {
  var lists = lsGetArr('bc_iplists');
  if(!lists[i]) return;
  safeClipboard(lists[i].ips).then(function(){ toast(t('copied'),'ok'); }).catch(function(){ toast(t('m_copy_failed'),'err'); });
}

// Save IPs from a textarea field into the saved lists
function saveIPList(fieldId) {
  var val = G(fieldId) ? G(fieldId).value.trim() : '';
  if(!val) { toast(t('m_ip_empty'),'err'); return; }
  // Use inline modal instead of prompt() — prompt() is blocked in Android WebViews
  _pendingSaveField = fieldId;
  _pendingSaveType  = 'ip';
  G('saveListLabelInput').value = '';
  G('saveListModal').classList.add('open');
  setTimeout(function(){ G('saveListLabelInput').focus(); }, 80);
}

// Open the IP picker modal for a target field
function pickIPList(targetId) {
  _ipTarget = targetId;
  var lists = lsGetArr('bc_iplists');
  var el = G('ipPickList');
  if(!lists.length) emptyState(el, t('dyn_no_saved_ips'));
  else {
    var frag = document.createDocumentFragment();
    lists.forEach(function(l, i) {
      frag.appendChild(listItem({ title: l.name, meta: _lineCount(l.ips) + ' ' + t('dyn_entries'), pick: function(){ selectIPList(i); } }));
    });
    el.textContent = '';
    el.appendChild(frag);
  }
  G('ipModal').classList.add('open');
}

function selectIPList(i) {
  var lists = lsGetArr('bc_iplists');
  if(!lists[i]) return;
  if(_ipTarget && G(_ipTarget)) {
    G(_ipTarget).value = lists[i].ips;
    liveCount();
  }
  closeIPModalDirect();
  toast(tf('m_list_loaded', { n: lists[i].name }),'ok');
}

function closeIPModal(e) { if(e.target===G('ipModal')) closeIPModalDirect(); }
function closeIPModalDirect() { if(G('ipModal')) G('ipModal').classList.remove('open'); _ipTarget=null; }

// ══════════════════════════════════════════════════════════
// SNI LIST MANAGER
// ══════════════════════════════════════════════════════════
let _sniTarget = null; // field id that triggered the SNI picker

function showAddSNIList() {
  var row = G('addSNIListRow');
  row.style.display = row.style.display === 'none' ? '' : 'none';
  if(row.style.display !== 'none') setTimeout(function(){ G('sniListName').focus(); }, 60);
}

function confirmAddSNIList() {
  var name = G('sniListName').value.trim();
  var snis = G('sniListInput').value.trim();
  if(!name) { toast(t('m_label_sni'),'err'); return; }
  if(!snis) { toast(t('m_enter_sni'),'err'); return; }
  var lists = lsGetArr('bc_snilists');
  var existing = lists.findIndex(function(l){ return l.name===name; });
  var entry = { name:name, snis:snis, time:new Date().toLocaleString() };
  if(existing > -1) lists[existing] = entry;
  else lists.unshift(entry);
  if(!lsSet('bc_snilists', lists)) return;
  G('sniListName').value=''; G('sniListInput').value='';
  G('addSNIListRow').style.display='none';
  renderSNILists();
  updateRoute();
  toast(tf('m_list_saved', { n: name }),'ok');
}

function renderSNILists() {
  var lists = lsGetArr('bc_snilists');
  var el = G('sniSavedList');
  if(!lists.length) { emptyState(el, t('dyn_no_sni_lists')); return; }
  var frag = document.createDocumentFragment();
  lists.forEach(function(l, i) {
    frag.appendChild(listItem({
      title: l.name, meta: _lineCount(l.snis) + ' SNI',
      actions: [
        { label: t('btn_copy'), run: function(){ copySNIListItem(i); } },
        { label: t('btn_delete'), run: function(){ deleteSNIList(i); } }
      ]
    }));
  });
  el.textContent = '';
  el.appendChild(frag);
}

function deleteSNIList(i) {
  var lists = lsGetArr('bc_snilists'), previous = lists.slice(), gone = lists.splice(i,1)[0];
  lsSet('bc_snilists',lists);
  renderSNILists();
  updateRoute();
  undoToast(t('toast_deleted').replace('{n}', gone.name), 'bc_snilists', previous, renderSNILists);
}

function copySNIListItem(i) {
  var lists = lsGetArr('bc_snilists');
  if(!lists[i]) return;
  safeClipboard(lists[i].snis).then(function(){ toast(t('copied'),'ok'); }).catch(function(){ toast(t('m_copy_failed'),'err'); });
}

// Save SNIs from a textarea field into the saved lists
function saveSNIList(fieldId) {
  var val = G(fieldId) ? G(fieldId).value.trim() : '';
  if(!val) { toast(t('m_sni_empty'),'err'); return; }
  // Use inline modal instead of prompt() — prompt() is blocked in Android WebViews
  _pendingSaveField = fieldId;
  _pendingSaveType  = 'sni';
  G('saveListLabelInput').value = '';
  G('saveListModal').classList.add('open');
  setTimeout(function(){ G('saveListLabelInput').focus(); }, 80);
}

// Open the SNI picker modal for a target field
function pickSNIList(targetId) {
  _sniTarget = targetId;
  var lists = lsGetArr('bc_snilists');
  var el = G('sniPickList');
  if(!lists.length) emptyState(el, t('dyn_no_saved_snis'));
  else {
    var frag = document.createDocumentFragment();
    lists.forEach(function(l, i) {
      frag.appendChild(listItem({ title: l.name, meta: _lineCount(l.snis) + ' SNI', pick: function(){ selectSNIList(i); } }));
    });
    el.textContent = '';
    el.appendChild(frag);
  }
  G('sniModal').classList.add('open');
}

function selectSNIList(i) {
  var lists = lsGetArr('bc_snilists');
  if(!lists[i]) return;
  if(_sniTarget && G(_sniTarget)) {
    G(_sniTarget).value = lists[i].snis;
    liveCount();
  }
  closeSNIModalDirect();
  toast(tf('m_list_loaded', { n: lists[i].name }),'ok');
}

function closeSNIModal(e) { if(e.target===G('sniModal')) closeSNIModalDirect(); }
function closeSNIModalDirect() { if(G('sniModal')) G('sniModal').classList.remove('open'); _sniTarget=null; }


// ══════════════════════════════════════════════════════════
// BULK IMPORT & DEDUPLICATE
// ══════════════════════════════════════════════════════════
function bulkImport(){
  // Determine which tab is active and gather links accordingly
  var activeTab = 'links';
  ['links','b64','url'].forEach(function(n){
    if(G('bt-'+n) && G('bt-'+n).classList.contains('active')) activeTab = n;
  });

  // If on b64 tab, auto-decode first; bail if nothing usable comes back
  if(activeTab === 'b64') {
    var raw = G('subInput').value.trim();
    if(!raw){ toast(t('m_paste_b64'),'err'); return; }
    var prevLen = G('bulkInput').value.trim().length;
    decodeSub(); // synchronous — writes to bulkInput and toasts on error
    if(G('bulkInput').value.trim().length === prevLen){ return; } // decode added nothing
  }

  var _bulkRaw = G('bulkInput').value;
  if(_bulkRaw.length > 5_000_000) { toast(t('m_too_large_5'), 'err'); return; }
  var lines=_bulkRaw.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
  if(!lines.length){ toast(t('m_no_links'),'err'); return; }
  var strict = G('strictDedup') && G('strictDedup').checked;
  var seen={}, unique=[], dupes=0;
  lines.forEach(function(l){
    var key;
    if(strict) {
      // Strict: same host+port+uuid = duplicate regardless of SNI/path/remark
      try {
        var u2 = new URL(l.replace(/^vless:\/\//, 'https://'));
        key = u2.username.toLowerCase() + '@' + u2.hostname.toLowerCase() + ':' + (u2.port || '443');
      } catch(e) { key = l.replace(/#[^#]*$/, ''); }
    } else {
      // Default: strip remark but keep all params — different SNI = different config
      key = l.replace(/#[^#]*$/, '');
    }
    if(!seen[key]){ seen[key]=true; unique.push(l); }
    else dupes++;
  });
  G('bTotal').textContent=lines.length;
  G('bUnique').textContent=unique.length;
  G('bDupes').textContent=dupes;
  G('bulkStats').style.display='';
  G('bulkOut').textContent=unique.join('\n');
  G('bulkResultCard').style.display='';
  toast(unique.length+t('toast_unique_removed')+dupes+t('toast_removed_suffix'),'ok');
}
function bulkClear(){ G('bulkInput').value=''; G('bulkOut').textContent=''; G('bulkStats').style.display='none'; G('bulkResultCard').style.display='none'; }
function bulkCopy(){ safeClipboard(G('bulkOut').textContent).then(function(){ toast(t('copied'),'ok'); }).catch(function(){ toast(t('m_copy_failed'),'err'); }); }
function bulkDl(){ dlText('vless_dedup.txt',G('bulkOut').textContent); toast(t('toast_downloaded'),'ok'); }
function bulkDlB64(){ dlText('vless_dedup_b64.txt', toBase64(G('bulkOut').textContent)); toast(t('toast_downloaded'),'ok'); }

// ══════════════════════════════════════════════════════════
// TOOLS
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// CONFIG VALIDATOR
// ══════════════════════════════════════════════════════════
let _validateGen = 0; // incremented on each run; async callbacks check they're still current
function runValidator() { _doValidate(false); }
function runValidatorWithPing() { _doValidate(true); }

async function _doValidate(doPing) {
  var gen = ++_validateGen; // capture generation token
  var raw = G('validateInput').value.trim();
  var el = G('validateResult');
  el.style.display = '';

  function _validatorNotice(msg, color) {
    el.textContent = '';
    var d = document.createElement('div');
    d.className = 'notice';
    d.style.color = color || 'var(--red)';
    d.textContent = msg;
    el.appendChild(d);
  }

  if(!raw){ _validatorNotice(t('m_no_links')); return; }
  if(!raw.startsWith('vless://')){ _validatorNotice(t('toast_must_start_vless')); return; }

  var checks = [];
  var parsed = null;

  function check(label, pass, detail, critical) {
    checks.push({ label: label, pass: pass, detail: detail || '', critical: !!critical });
  }

  var c = parseVless(raw);
  if(!c) {
    _validatorNotice(t('toast_parse_failed'));
    return;
  }
  parsed = {
    uuid: c.uuid, host: c.address, port: c.port,
    security: c.security, sni: c.sni, fp: c.fp, alpn: c.alpn,
    type: c.type, path: c.path, remark: c.remark, insecure: c.insecure,
    pbk: c.pbk
  };

  // UUID
  check(t('v_uuid'), UUID_RE.test(parsed.uuid), parsed.uuid || t('v_empty'), true);
  // Host
  check(t('v_host'), !!parsed.host, parsed.host || t('v_empty'), true);
  // Port
  var portNum = parseInt(parsed.port, 10);
  check(t('v_port'), portNum >= 1 && portNum <= 65535, parsed.port, true);
  // Security
  var knownSecurity = ['tls', 'reality', 'none'];
  check(t('v_security'), knownSecurity.indexOf(parsed.security) > -1, parsed.security);
  // SNI for TLS
  if(parsed.security === 'tls' || parsed.security === 'reality') {
    check(t('v_sni'), !!parsed.sni, parsed.sni || t('v_sni_missing'));
  }
  if(parsed.security === 'reality') {
    check(t('v_pbk'), !!parsed.pbk, parsed.pbk || t('v_pbk_missing'), true);
  }
  if(parsed.security === 'none' && (!c.encryption || c.encryption === 'none') && !_isBlockedHost(parsed.host)) {
    check(t('v_plain'), false, t('v_plain_detail'));
  }
  // Fingerprint
  var knownFps = ['chrome','firefox','safari','edge','ios','android','360','qq','random','randomized',''];
  check(t('v_fp'), knownFps.indexOf(parsed.fp) > -1, parsed.fp || t('v_none'));
  // Insecure warning
  if(parsed.insecure) {
    check(t('v_insecure'), false, t('v_insecure_on'));
  } else {
    check(t('v_insecure'), true, t('v_cert_ok'));
  }
  // Transport
  var knownTypes = ['tcp','ws','xhttp','splithttp','httpupgrade','grpc','h2','http'];
  check(t('v_transport'), knownTypes.indexOf(parsed.type) > -1, parsed.type);
  // Path for non-TCP transports
  if(['ws','xhttp','splithttp','httpupgrade'].indexOf(parsed.type) > -1) {
    check(t('v_path'), !!parsed.path && parsed.path !== '', parsed.path || t('v_empty'));
  }
  // Remark
  check(t('v_remark'), !!parsed.remark, parsed.remark || t('v_no_remark'));

  // Render checks via DOM — no innerHTML
  var passed = checks.filter(function(c){ return c.pass; }).length;
  var failed = checks.length - passed;
  var critical = checks.filter(function(c){ return !c.pass && c.critical; }).length;
  var score = Math.round((passed / checks.length) * 100);

  var frag = document.createDocumentFragment();

  var scoreHeader = document.createElement('div');
  scoreHeader.className = 'score';
  var scoreNum = document.createElement('b');
  scoreNum.className = score >= 90 ? 'ok' : score >= 60 ? 'warn' : 'bad';
  scoreNum.textContent = String(score);
  var scoreInfo = document.createElement('div');
  var scoreTitle = document.createElement('div');
  scoreTitle.textContent = critical > 0 ? t('dyn_critical_issues') : failed > 0 ? t('dyn_minor_issues') : t('dyn_config_looks_good');
  var scoreMeta = document.createElement('small');
  scoreMeta.textContent = passed + t('dyn_passed') + failed + t('dyn_failed');
  scoreInfo.appendChild(scoreTitle);
  scoreInfo.appendChild(scoreMeta);
  scoreHeader.appendChild(scoreNum);
  scoreHeader.appendChild(scoreInfo);
  frag.appendChild(scoreHeader);

  checks.forEach(function(c) {
    var state = c.pass ? 'ok' : (c.critical ? 'bad' : 'warn');
    var row = document.createElement('div');
    row.className = 'check-row';
    var labelSpan = document.createElement('span');
    if(!c.pass) labelSpan.className = state;
    labelSpan.textContent = c.label;
    var detailSpan = document.createElement('span');
    detailSpan.className = 'row-val';
    detailSpan.textContent = c.detail;
    row.appendChild(statusIcon(state));
    row.appendChild(labelSpan);
    row.appendChild(detailSpan);
    frag.appendChild(row);
  });

  // TCPing placeholder row
  if(doPing) {
    var pingRow = document.createElement('div');
    pingRow.id = 'validatorPingRow';
    pingRow.className = 'check-row';
    var pingIcon = document.createElement('span');
    pingIcon.className = 'muted';
    pingIcon.textContent = '…';
    var pingLabel = document.createElement('span');
    pingLabel.textContent = formatHost(parsed.host) + ':' + parsed.port;
    var pingVal = document.createElement('span');
    pingVal.id = 'validatorPingVal';
    pingVal.className = 'row-val';
    pingVal.textContent = t('dyn_testing');
    pingRow.appendChild(pingIcon);
    pingRow.appendChild(pingLabel);
    pingRow.appendChild(pingVal);
    frag.appendChild(pingRow);
  }

  // Generation guard BEFORE writing to DOM
  if(gen !== _validateGen) return;
  el.textContent = '';
  el.appendChild(frag);

  if(doPing) {
    var res = await tcpingHost(parsed.host, parseInt(parsed.port, 10), 5000, 3);
    if(gen !== _validateGen) return; // double-check after async ping
    var pv = G('validatorPingVal');
    var pr = G('validatorPingRow');
    if(pv && pr) {
      if(res.ok) {
        pv.textContent = res.ms + ' ms avg (' + res.times.join('/') + ' ms)';
        pv.style.color = res.ms < 150 ? 'var(--green)' : 'var(--amber)';
        pr.querySelector('span').textContent = '✓';
        pr.querySelector('span').style.color = 'var(--green)';
      } else if(res.inconclusive) {
        pv.textContent = pingFailLabel(res);
        pv.title = t('dyn_unconfirmed_hint');
        pv.style.color = 'var(--amber)';
        pr.querySelector('span').textContent = '?';
        pr.querySelector('span').style.color = 'var(--amber)';
      } else {
        pv.textContent = pingFailLabel(res);
        pv.style.color = 'var(--red)';
        pr.querySelector('span').textContent = '✕';
        pr.querySelector('span').style.color = 'var(--red)';
      }
    }
  }
}

// Config Diff
function parseLink(raw){
  var c=parseVless(raw);
  if(!c) return null;
  return { uuid:c.uuid, address:c.address, port:c.port, security:c.security, sni:c.sni, fp:c.fp, alpn:c.alpn, pbk:c.pbk, sid:c.sid, spx:c.spx, flow:c.flow, type:c.type, host:c.host, path:c.path, mode:c.mode, extra:c.extra, serviceName:c.serviceName, insecure:c.insecure?'1':'0', encryption:c.encryption, other:c.pass.map(function(kv){ return kv.join('='); }).sort().join('&'), remark:c.remark };
}
function runDiff(){
  var a=parseLink(G('diffA').value.trim()), b=parseLink(G('diffB').value.trim());
  if(!a||!b){ toast(t('m_both_links'),'err'); return; }
  var keys=Object.keys(a);
  var diffCount=keys.filter(function(k){ return (a[k]||'—')!==(b[k]||'—'); }).length;
  var diffFrag = document.createDocumentFragment();

  var notice = document.createElement('div');
  notice.className = 'notice ' + (diffCount ? 'bad-note' : 'good');
  notice.textContent = diffCount
    ? diffCount + (diffCount!==1?t('dyn_fields_differ_plural'):t('dyn_fields_differ')) + t('dyn_differ_suffix')
    : t('dyn_links_identical');
  diffFrag.appendChild(notice);

  keys.forEach(function(k) {
    var va = a[k]||'—', vb = b[k]||'—';
    if(!(a[k]||b[k])) return;
    var row = document.createElement('div');
    row.className = 'diff-row' + (va !== vb ? ' changed' : '');
    var keySpan = document.createElement('span');
    keySpan.textContent = k;
    var valSpan = document.createElement('span');
    valSpan.className = 'row-val';
    valSpan.textContent = va !== vb ? va + ' → ' + vb : va;
    row.appendChild(keySpan);
    row.appendChild(valSpan);
    diffFrag.appendChild(row);
  });

  var diffRowsEl = G('diffRows');
  diffRowsEl.textContent = '';
  diffRowsEl.appendChild(diffFrag);
  G('diffResult').style.display='';
}

// Base64 tools
function doEncode(){
  var txt=G('b64Input').value;
  if(!txt){ toast(t('m_nothing_encode'),'err'); return; }
  G('b64Output').value=toBase64(txt);
  toast(t('m_encoded'),'ok');
}
function doDecode(){
  var txt=G('b64Input').value.trim();
  if(!txt){ toast(t('m_nothing_decode'),'err'); return; }
  try{ G('b64Output').value=fromBase64(txt); toast(t('m_decoded'),'ok'); }
  catch(e){ toast(t('m_bad_b64'),'err'); }
}
function copyB64Out(){ safeClipboard(G('b64Output').value).then(function(){ toast(t('copied'),'ok'); }).catch(function(){ toast(t('m_copy_failed'),'err'); }); }

// Remark renamer
function runRenamer(){
  var lines=G('remarkInput').value.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
  if(!lines.length){ toast(t('m_no_links'),'err'); return; }
  var tpl=G('remarkTpl').value.trim()||'{prefix}_{ip}_{idx}';
  var prefix=G('remarkPrefix').value.trim()||'Config';
  var out=lines.map(function(l,i){
    var c=parseVless(l);
    if(!c) return l;
    var remark=applyRemarkTpl(tpl,c.address,c.sni,c.port,i+1,prefix);
    return l.replace(/#[^#]*$/, '')+'#'+encodeURIComponent(remark);
  });
  G('remarkOutput').value=out.join('\n');
  toast(out.length+t('toast_links_renamed'),'ok');
}
function copyRenameOut(){ safeClipboard(G('remarkOutput').value).then(function(){ toast(t('copied'),'ok'); }).catch(function(){ toast(t('m_copy_failed'),'err'); }); }
function dlRenameOut(){ dlText('vless_renamed.txt',G('remarkOutput').value); toast(t('toast_downloaded'),'ok'); }

// ── Save-List Modal (replaces prompt() — works on Android) ──────
let _pendingSaveField = null;
let _pendingSaveType  = null; // 'ip' | 'sni'

function confirmSaveList() {
  var name = G('saveListLabelInput').value.trim();
  if(!name) { toast(t('m_enter_label'),'err'); return; }
  var fieldId = _pendingSaveField;
  var type    = _pendingSaveType;
  closeSaveListModal();
  if(!fieldId || !type) return;
  var val = G(fieldId) ? G(fieldId).value.trim() : '';
  if(!val) { toast(t('m_field_empty'),'err'); return; }
  if(type === 'ip') {
    var lists = lsGetArr('bc_iplists');
    var existing = lists.findIndex(function(l){ return l.name===name; });
    var entry = { name:name, ips:val, time:new Date().toLocaleString() };
    if(existing > -1) lists[existing] = entry; else lists.unshift(entry);
    if(!lsSet('bc_iplists',lists)) return;
    toast(tf('m_list_saved', { n: name }),'ok');
  } else {
    var lists2 = lsGetArr('bc_snilists');
    var existing2 = lists2.findIndex(function(l){ return l.name===name; });
    var entry2 = { name:name, snis:val, time:new Date().toLocaleString() };
    if(existing2 > -1) lists2[existing2] = entry2; else lists2.unshift(entry2);
    if(!lsSet('bc_snilists',lists2)) return;
    toast(tf('m_list_saved', { n: name }),'ok');
  }
}
function closeSaveListModal() {
  G('saveListModal').classList.remove('open');
  _pendingSaveField = null; _pendingSaveType = null;
}
function closeSaveListModalBg(e) { if(e.target===G('saveListModal')) closeSaveListModal(); }

// ── Init ──────────────────────────────────────────────────
aType('xhttp');
renderProfiles();
renderUUIDs();
renderIPLists();
renderSNILists();
// Restore history from localStorage
hist = lsGetArr('bc_hist');
// ══════════════════════════════════════════════════════════
// CLASH EXPORT
// ══════════════════════════════════════════════════════════
// JSON strings are valid YAML double-quoted scalars, so this handles quotes,
// backslashes, newlines and YAML-significant values such as *.example.com.
function yamlStr(s) { return JSON.stringify(String(s)); }

// Clash and sing-box refuse configs containing duplicate names, and a remark template
// without {idx} gives every link the same remark.
function uniqueName(name, seen) {
  var candidate = name, n = 2;
  while(seen[candidate]) candidate = name + ' (' + (n++) + ')';
  seen[candidate] = true;
  return candidate;
}
function nameRegistry(reserved) {
  var seen = Object.create(null);
  reserved.forEach(function(n){ seen[n] = true; });
  return seen;
}

function clashProxyYaml(c, name) {
  var tls = c.security !== 'none';
  var network = c.type;
  if(c.type === 'httpupgrade') network = 'ws';
  if(c.type === 'splithttp') network = 'xhttp';
  var lines = ['  - name: ' + yamlStr(name),
    '    type: vless',
    '    server: ' + yamlStr(c.address),
    '    port: ' + parseInt(c.port, 10),
    '    uuid: ' + yamlStr(c.uuid),
    '    tls: ' + tls];
  if(c.flow) lines.push('    flow: ' + yamlStr(c.flow));
  if(c.encryption && c.encryption !== 'none') lines.push('    encryption: ' + yamlStr(c.encryption));
  if(tls) {
    lines.push('    skip-cert-verify: ' + c.insecure);
    if(c.sni) lines.push('    servername: ' + yamlStr(c.sni));
    lines.push('    client-fingerprint: ' + yamlStr(c.fp || 'chrome'));
    if(c.alpn) lines.push('    alpn: [' + c.alpn.split(',').map(yamlStr).join(', ') + ']');
  }
  if(c.security === 'reality') {
    lines.push('    reality-opts:');
    lines.push('      public-key: ' + yamlStr(c.pbk));
    if(c.sid) lines.push('      short-id: ' + yamlStr(c.sid));
  }
  lines.push('    network: ' + yamlStr(network));
  if(network === 'ws') {
    lines.push('    ws-opts:');
    lines.push('      path: ' + yamlStr(c.path));
    if(c.host) lines.push('      headers:\n        Host: ' + yamlStr(c.host));
    if(c.type === 'httpupgrade') lines.push('      v2ray-http-upgrade: true');
  } else if(network === 'xhttp') {
    lines.push('    xhttp-opts:');
    lines.push('      path: ' + yamlStr(c.path));
    if(c.host) lines.push('      host: ' + yamlStr(c.host));
    if(['stream-one','stream-up','packet-up'].indexOf(c.mode) > -1) lines.push('      mode: ' + yamlStr(c.mode));
    var extra = {};
    try { extra = JSON.parse(c.extra) || {}; } catch(e) {}
    if(extra.xPaddingBytes) lines.push('      x-padding-bytes: ' + yamlStr(extra.xPaddingBytes));
  } else if(network === 'grpc') {
    lines.push('    grpc-opts:\n      grpc-service-name: ' + yamlStr(c.serviceName));
  }
  return lines.join('\n');
}

function clashText(links) {
  var seen = nameRegistry(['DIRECT','REJECT','GLOBAL','Trace']);
  var names = [];
  var proxies = [];
  links.forEach(function(l, i) {
    var c = parseVless(l);
    if(!c) return;
    var name = uniqueName(c.remark || ('VLESS-' + (i+1)), seen);
    names.push(name);
    proxies.push(clashProxyYaml(c, name));
  });

  var yaml = '# Trace: Clash Meta config\n\nproxies:\n';
  yaml += proxies.join('\n\n');

  // A select group starts on its first entry: DIRECT goes last so the exported
  // config proxies traffic unless the user chooses otherwise.
  yaml += '\n\nproxy-groups:\n  - name: "Trace"\n    type: select\n    proxies:\n';
  yaml += names.map(function(n){ return '      - ' + yamlStr(n); }).join('\n');
  yaml += (names.length ? '\n' : '') + '      - DIRECT\n';
  yaml += '\nrules:\n  - MATCH,Trace\n';
  return yaml;
}

// ══════════════════════════════════════════════════════════
// SING-BOX EXPORT
// ══════════════════════════════════════════════════════════
// sing-box outbound for a parsed link, or null when sing-box has no such transport
// (it doesn't implement xhttp/splithttp, and a substitute would fail to connect).
function singboxOutbound(c, tag) {
  if(c.type === 'xhttp' || c.type === 'splithttp') return null;
  var obj = {
    type: 'vless', tag: tag,
    server: c.address, server_port: parseInt(c.port, 10),
    uuid: c.uuid, packet_encoding: 'xudp'
  };
  if(c.flow) obj.flow = c.flow;
  if(c.security === 'tls' || c.security === 'reality') {
    obj.tls = {
      enabled: true, server_name: c.sni || c.address, insecure: c.insecure,
      utls: { enabled: true, fingerprint: c.fp || 'chrome' }
    };
    if(c.alpn) obj.tls.alpn = c.alpn.split(',');
    if(c.security === 'reality') obj.tls.reality = { enabled: true, public_key: c.pbk, short_id: c.sid };
  }
  if(c.type === 'ws') {
    obj.transport = { type: 'ws', path: c.path, headers: c.host ? { Host: c.host } : {} };
  } else if(c.type === 'grpc') {
    obj.transport = { type: 'grpc', service_name: c.serviceName };
  } else if(c.type === 'httpupgrade') {
    obj.transport = { type: 'httpupgrade', path: c.path, host: c.host };
  } else if(c.q.headerType === 'http') {
    obj.transport = { type: 'http', path: c.path, host: [c.host || c.address] };
  }
  return obj;
}

// Shared sing-box skeleton (1.13+: rule actions instead of the removed block outbound,
// inbound sniff fields and geoip rules; typed DNS servers instead of address strings).
function singboxConfig(logLevel, dnsStrategy, listenPort, outbounds, finalTag) {
  return {
    log: { level: logLevel, timestamp: true },
    dns: {
      servers: [
        { type: 'https', tag: 'dns-cloudflare', server: '1.1.1.1' },
        { type: 'https', tag: 'dns-google', server: '8.8.8.8' }
      ],
      strategy: dnsStrategy
    },
    inbounds: [{ type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: listenPort }],
    outbounds: outbounds,
    route: {
      rules: [
        { inbound: 'mixed-in', action: 'sniff' },
        { ip_is_private: true, outbound: 'direct' }
      ],
      final: finalTag,
      default_domain_resolver: { server: 'dns-cloudflare' }
    }
  };
}

function singboxText(links) {
  var seen = nameRegistry(['select','auto','direct']);
  var skipped = 0;
  var outbounds = [];
  links.forEach(function(l, i) {
    var c = parseVless(l);
    if(!c) return;
    var outbound = singboxOutbound(c, '');
    if(!outbound) { skipped++; return; }
    outbound.tag = uniqueName(c.remark || ('vless-' + (i+1)), seen);
    outbounds.push(outbound);
  });
  if(!outbounds.length) return { text: '', skipped: skipped };

  var tags = outbounds.map(function(o){ return o.tag; });
  var config = singboxConfig('info', 'prefer_ipv4', 2080, outbounds.concat([
    { type: 'selector', tag: 'select', outbounds: ['auto'].concat(tags) },
    { type: 'urltest', tag: 'auto', outbounds: tags, url: 'https://www.gstatic.com/generate_204', interval: '3m' },
    { type: 'direct', tag: 'direct' }
  ]), 'select');
  return { text: JSON.stringify(config, null, 2), skipped: skipped };
}

function jsonText(links) {
  return JSON.stringify(links.map(function(l){
    var c = parseVless(l);
    if(!c) return { raw: l };
    return { uuid:c.uuid, address:c.address, port:parseInt(c.port, 10), security:c.security, sni:c.sni, fp:c.fp, alpn:c.alpn, pbk:c.pbk, sid:c.sid, spx:c.spx, flow:c.flow, type:c.type, host:c.host, path:c.path, remark:c.remark, raw:l };
  }), null, 2);
}

// ── Export view ───────────────────────────────────────────
let _fmt = 'clash';
const _FORMATS = {
  clash: { file: 'clash_config.yaml', build: clashText },
  singbox: { file: 'singbox_config.json', build: function(l){ return singboxText(l).text; } },
  links: { file: 'vless_configs.txt', build: function(l){ return l.join('\n'); } },
  base64: { file: 'vless_configs_b64.txt', build: function(l){ return toBase64(l.join('\n')); } },
  json: { file: 'vless_configs.json', build: jsonText }
};

// The links Export works on: the Build output, narrowed by its filter when one is set
function exportLinks() {
  return (G('aOut').dataset.plain || '').split('\n').filter(Boolean);
}

function _highlight(line) {
  var safe = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return safe
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)?/g, function(m, str, colon){ return colon ? '<u>' + str + '</u>' + colon : '<em>' + str + '</em>'; })
    .replace(/^(\s*-?\s*)([a-z-]+:)/, '$1<u>$2</u>');
}

function renderExport() {
  var links = exportLinks();
  var list = G('fmtList');
  list.textContent = '';
  Object.keys(_FORMATS).forEach(function(id) {
    var b = document.createElement('button');
    b.className = 'fmt' + (id === _fmt ? ' active' : '');
    var name = document.createElement('b'); name.textContent = t('fmt_' + id);
    var desc = document.createElement('small'); desc.textContent = t('fmt_' + id + '_d');
    b.appendChild(name); b.appendChild(desc);
    b.addEventListener('click', function(){ _fmt = id; renderExport(); updateRoute(); });
    list.appendChild(b);
  });
  G('fmtName').textContent = _FORMATS[_fmt].file;
  G('exportSub').textContent = links.length ? t('export_sub_n').replace('{n}', links.length) : t('export_empty');

  G('fmtEmpty').hidden = !!links.length;
  G('fmtShell').hidden = !links.length;
  var code = G('fmtCode'), note = G('fmtNote');
  var text = links.length ? _FORMATS[_fmt].build(links) : '';
  code.innerHTML = text.split('\n').slice(0, 500).map(function(l){ return '<span class="ln">' + _highlight(l) + '</span>'; }).join('');
  var skipped = _fmt === 'singbox' ? singboxText(links).skipped : 0;
  note.classList.toggle('warn-text', !!skipped);
  note.textContent = skipped ? t('toast_singbox_skipped').replace('{n}', skipped) : t('export_cred');
}

function exportDownload() {
  var links = exportLinks();
  var text = links.length ? _FORMATS[_fmt].build(links) : '';
  if(!text) { toast(t('toast_nothing_export'), 'err'); return; }
  dlText(_FORMATS[_fmt].file, text);
  toast(t('toast_downloaded'), 'ok');
}
function exportCopy() {
  var links = exportLinks();
  var text = links.length ? _FORMATS[_fmt].build(links) : '';
  if(!text) { toast(t('toast_nothing_copy'), 'err'); return; }
  safeClipboard(text).then(function(){ flashCopied(G('exportCopyBtn')); }).catch(function(){ toast(t('m_copy_failed'),'err'); });
}

// ══════════════════════════════════════════════════════════
// BULK TAB SWITCHER
// ══════════════════════════════════════════════════════════
function bulkSwitchTab(name) {
  ['links','b64','url'].forEach(function(n){
    G('bt-'+n).classList.toggle('active', n===name);
    G('bp-'+n).classList.toggle('active', n===name);
  });
  syncThumbs();
}

// ══════════════════════════════════════════════════════════
// SUBSCRIPTION IMPORT — Base64 decode → move to links tab
// ══════════════════════════════════════════════════════════
function decodeSub() {
  var raw = G('subInput').value.trim();
  if(!raw){ toast(t('m_paste_b64'), 'err'); return; }
  try {
    var decoded = fromBase64(raw);
    var links = decoded.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
    if(!links.length){ toast(t('m_no_links'), 'err'); return; }
    var existing = G('bulkInput').value.trim();
    G('bulkInput').value = (existing ? existing + '\n' : '') + links.join('\n');
    bulkSwitchTab('links');
    toast(tf('m_added_links', { n: links.length }), 'ok');
  } catch(e) {
    toast(t('m_decode_failed'), 'err');
  }
}

// ══════════════════════════════════════════════════════════
// SUBSCRIPTION URL FETCH
// ══════════════════════════════════════════════════════════
async function fetchSubUrl() {
  var url = G('subUrlInput').value.trim();
  if(!url){ toast(t('m_enter_url'), 'err'); return; }
  var statusEl = G('subUrlStatus');
  var btn = G('fetchSubBtn');
  btn.textContent = t('toast_fetching');
  btn.disabled = true;
  statusEl.textContent = t('dyn_fetching_sub_status');
  statusEl.style.color = 'var(--muted)';

  var controller = new AbortController();
  var tid = setTimeout(function(){ controller.abort(); }, 15000);

  try {
    var res = await safeFetch(url, { signal: controller.signal });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    var text = await res.text();
    text = text.trim();
    if(text.length > 2_000_000) {
      statusEl.textContent = t('m_resp_large');
      statusEl.style.color = 'var(--red)';
      toast(t('m_resp_large'), 'err');
      return;
    }
    // Try base64 decode first
    var links = [];
    try {
      var decoded = fromBase64(text);
      links = decoded.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
    } catch(e) {}
    // If not base64, try raw links
    if(!links.length) {
      links = text.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
    }
    if(!links.length){ statusEl.textContent = t('m_sub_empty'); statusEl.style.color='var(--red)'; return; }
    var existing = G('bulkInput').value.trim();
    var existingLinks2 = existing ? existing.split('\n').map(function(x){return x.trim();}).filter(Boolean) : [];
    var existingSet2 = {};
    existingLinks2.forEach(function(l){ existingSet2[l.replace(/#[^#]*$/, '')] = true; });
    var newLinks2 = links.filter(function(l){ return !existingSet2[l.replace(/#[^#]*$/, '')]; });
    G('bulkInput').value = existingLinks2.concat(newLinks2).join('\n');
    bulkSwitchTab('links');
    statusEl.textContent = tf('m_loaded_new', { a: newLinks2.length, b: links.length - newLinks2.length });
    statusEl.style.color = 'var(--green)';
    toast(tf('m_fetched', { n: links.length }), 'ok');
  } catch(e) {
    var msg = e.name === 'AbortError' ? t('m_timeout') : e.message;
    statusEl.textContent = tf('m_fetch_status', { e: msg });
    statusEl.style.color = 'var(--red)';
    toast(t('m_fetch_failed'), 'err');
  } finally {
    clearTimeout(tid);
    btn.textContent = t('toast_fetch_decode_btn');
    btn.disabled = false;
  }
}

// Keep old importSub as alias for compatibility
function importSub() { decodeSub(); }

// ══════════════════════════════════════════════════════════
// LIVE IP/SNI COUNTER
// ══════════════════════════════════════════════════════════
// Debounced live counters — delays recalculation by 120ms so rapid
// keystrokes on large IP/SNI lists don't call linesOf() on every character.
// Checkbox changes (pair mode) fire immediately since they're instant clicks.
let _liveCountTimer = null;

function liveCount() {
  clearTimeout(_liveCountTimer);
  _liveCountTimer = setTimeout(_liveCountNow, 120);
}
function _liveCountNow() {
  var ips  = linesOfExpanded('a_ips').length;
  var snis = linesOf('a_snis').length;
  var paired = G('a_pairMode').checked;
  var total = !ips ? 0 : paired ? Math.max(ips, snis) : ips * (snis || 1);
  rollNumber(G('aCount'), total);
  G('a_liveCount').textContent = ips + t('dyn_ips_x_snis') + (snis || 1) + t('dyn_snis_label') + (paired ? t('dyn_paired') : '');
}

// ════════════════════════════════════════════════════════
// PROFILE SEARCH, EXPORT & IMPORT
// ══════════════════════════════════════════════════════════
function exportProfilesJSON() {
  var profiles = lsGetArr('bc_profiles');
  if(!profiles.length){ toast(t('m_no_profiles'), 'err'); return; }
  dlText('trace_profiles.json', JSON.stringify(profiles, null, 2));
  toast(t('m_exported'), 'ok');
}

function importProfilesJSON(input) {
  var file = input.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      if(!Array.isArray(imported)) throw new Error('bad format');
      // Validate each entry: must have a non-empty string name and a data object
      var valid = imported.filter(function(p) {
        return p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim() && typeof p.data === 'object' && p.data !== null;
      });
      if(!valid.length) { toast(t('m_bad_profiles'), 'err'); input.value = ''; return; }
      var existing = lsGetArr('bc_profiles');
      var merged = valid.concat(existing);
      // dedupe by name, imported wins
      var seen = {};
      merged = merged.filter(function(p) {
        if(seen[p.name]) return false;
        seen[p.name] = true;
        return true;
      });
      if(!lsSet('bc_profiles', merged)) { input.value = ''; return; }
      renderProfiles();
      toast(valid.length < imported.length ? tf('m_imported_skip', { n: valid.length, s: imported.length - valid.length }) : tf('m_imported', { n: valid.length }), 'ok');
    } catch(ex) {
      toast(t('m_bad_profiles'), 'err');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════
document.addEventListener('keydown', function(e) {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  if((e.ctrlKey || e.metaKey) && e.key === 'Enter' && G('tp-gen').classList.contains('active')) {
    e.preventDefault();
    advGen();
  }
  if(e.key === 'Escape') {
    if(G('uuidModal').classList.contains('open')) closeUUIDModalDirect();
    if(G('profileModal').classList.contains('open')) closeProfileModalDirect();
    if(G('ipModal').classList.contains('open')) closeIPModalDirect();
    if(G('sniModal').classList.contains('open')) closeSNIModalDirect();
    if(G('saveListModal').classList.contains('open')) closeSaveListModal();
  }
});

// ── Command menu ──────────────────────────────────────────
let _palIdx = 0;
function _commands() {
  return [
    ['route_build', function(){ navTab('gen'); }],
    ['route_check', function(){ navTab('check'); }],
    ['route_export', function(){ navTab('export'); }],
    ['route_library', function(){ navTab('library'); }],
    ['btn_generate', function(){ navTab('gen'); advGen(); }],
    ['cmd_theme', toggleTheme],
    ['cmd_lang', toggleLang]
  ];
}
function _paletteItems() {
  var q = G('paletteInput').value.toLowerCase();
  return _commands().filter(function(c){ return t(c[0]).toLowerCase().indexOf(q) > -1; });
}
function _renderPalette() {
  var items = _paletteItems(), el = G('paletteList');
  _palIdx = Math.min(_palIdx, Math.max(0, items.length - 1));
  el.textContent = '';
  items.forEach(function(c, i) {
    var b = document.createElement('button');
    b.className = 'pal-item' + (i === _palIdx ? ' on' : '');
    b.textContent = t(c[0]);
    b.addEventListener('click', function(){ G('palette').close(); c[1](); });
    el.appendChild(b);
  });
}
function openPalette() {
  var d = G('palette');
  if(d.open) return;
  G('paletteInput').value = '';
  _palIdx = 0;
  _renderPalette();
  d.showModal();
  G('paletteInput').focus();
}
G('paletteInput').addEventListener('input', _renderPalette);
G('paletteInput').addEventListener('keydown', function(e) {
  var items = _paletteItems();
  if(!items.length) return;
  if(e.key === 'ArrowDown') { _palIdx = (_palIdx + 1) % items.length; _renderPalette(); e.preventDefault(); }
  if(e.key === 'ArrowUp') { _palIdx = (_palIdx - 1 + items.length) % items.length; _renderPalette(); e.preventDefault(); }
  if(e.key === 'Enter' && items[_palIdx]) { G('palette').close(); items[_palIdx][1](); }
});
G('palette').addEventListener('click', function(e){ if(e.target === G('palette')) G('palette').close(); });

// ── Hold to clear ─────────────────────────────────────────
// A hold is deliberate enough for the one action that removes everything, and the
// toast still offers Undo afterwards.
(function() {
  var KEYS = ['bc_profiles','bc_uuids','bc_iplists','bc_snilists','bc_hist'];
  var btn = G('holdClear'), timer = null;
  function start() {
    if(timer) return;
    btn.classList.add('down');
    timer = setTimeout(function() {
      timer = null;
      btn.classList.remove('down');
      var previous = {}, prevHist = hist;
      KEYS.forEach(function(k){ previous[k] = lsGetArr(k); lsSet(k, []); });
      hist = [];
      _refreshLibrary();
      toast(t('toast_all_cleared'), 'ok', { label: t('undo'), run: function() {
        KEYS.forEach(function(k){ lsSet(k, previous[k]); });
        hist = prevHist;
        _refreshLibrary();
      } });
    }, 1200);
  }
  function stop() {
    clearTimeout(timer);
    timer = null;
    btn.classList.remove('down');
  }
  btn.addEventListener('pointerdown', start);
  ['pointerup','pointerleave','pointercancel'].forEach(function(n){ btn.addEventListener(n, stop); });
  btn.addEventListener('keydown', function(e){ if((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
  btn.addEventListener('keyup', stop);
  btn.addEventListener('blur', stop);
})();
function _refreshLibrary() {
  renderProfiles(); renderUUIDs(); renderIPLists(); renderSNILists(); renderHist(); updateRoute();
}

// ══════════════════════════════════════════════════════════
// DARK / LIGHT THEME
// ══════════════════════════════════════════════════════════
function toggleTheme() {
  function flip() {
    var isLight = document.body.classList.toggle('light');
    lsSet('bc_theme', isLight ? 'light' : 'dark');
  }
  if(!document.startViewTransition || _calm() || document.hidden) { flip(); return; }
  // The new theme spreads out from the button
  var r = G('themeToggle').getBoundingClientRect();
  var x = r.left + r.width / 2, y = r.top + r.height / 2;
  var root = document.documentElement;
  root.style.setProperty('--vt-x', x + 'px');
  root.style.setProperty('--vt-y', y + 'px');
  // End exactly at the farthest corner, so the whole duration is visible
  root.style.setProperty('--vt-r', Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 'px');
  var vt = document.startViewTransition(flip);
  // A skipped transition still applies the theme, so its rejection needs no handling
  [vt.ready, vt.finished].forEach(function(p){ p.catch(function(){}); });
}

// An explicit choice wins; otherwise follow the system theme
(function initTheme() {
  var saved = lsGet('bc_theme');
  var light = saved ? saved === 'light' : window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches;
  document.body.classList.toggle('light', !!light);
})();

// ══════════════════════════════════════════════════════════
// PORT PRESETS
// ══════════════════════════════════════════════════════════
function setPort(p) {
  var el = G('a_port');
  if(el) { el.value = p; liveCount(); toast(tf('m_port_set', { p: p }), 'ok'); }
}

// ══════════════════════════════════════════════════════════
// OUTPUT FILTER / SORT / SHUFFLE (Advanced mode)
// ══════════════════════════════════════════════════════════
let _advRawLinks = [];

let _filterTimer = null;
function filterAdvOut() {
  clearTimeout(_filterTimer);
  _filterTimer = setTimeout(function() {
    if(!_advRawLinks.length) return;
    var q = G('aOutFilter').value.trim().toLowerCase();
    var filtered = q ? _advRawLinks.filter(function(l){ return l.toLowerCase().indexOf(q) > -1; }) : _advRawLinks;
    renderAdvOut(filtered);
  }, 180);
}

function sortAdvOut() {
  if(!_advRawLinks.length) return;
  var mode = G('aOutSort').value;
  if(!mode) {
    // no sort selected — render current canonical order
    var q0 = G('aOutFilter').value.trim().toLowerCase();
    renderAdvOut(q0 ? _advRawLinks.filter(function(l){ return l.toLowerCase().indexOf(q0) > -1; }) : _advRawLinks.slice());
    return;
  }
  var arr = _advRawLinks.slice();
  if(mode === 'asc') arr.sort(function(a,b){ return getRemark(a).localeCompare(getRemark(b)); });
  else if(mode === 'desc') arr.sort(function(a,b){ return getRemark(b).localeCompare(getRemark(a)); });
  else if(mode === 'ip') arr.sort(function(a,b){ return getHost(a).localeCompare(getHost(b)); });
  // Mutate _advRawLinks so filter, download, and copy all see the sorted order.
  // This matches shuffleAdvOut's contract: the sorted order becomes canonical.
  _advRawLinks = arr;
  var q = G('aOutFilter').value.trim().toLowerCase();
  renderAdvOut(q ? arr.filter(function(l){ return l.toLowerCase().indexOf(q) > -1; }) : arr);
}

function shuffleAdvOut() {
  if(!_advRawLinks.length) { toast(t('toast_generate_first'), 'err'); return; }
  var arr = _advRawLinks.slice();
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; }
  // Shuffle mutates the canonical list so subsequent filter/sort work on shuffled order
  _advRawLinks = arr;
  // Reset sort dropdown so it doesn't imply a sorted order
  var s = G('aOutSort'); if(s) s.value = '';
  renderAdvOut(arr);
  toast(t('m_shuffled'), 'ok');
}

function _resetAdvFilterSort() {
  var f = G('aOutFilter'); if(f) f.value = '';
  var s = G('aOutSort');   if(s) s.value = '';
}

let _OUT_RENDER_LIMIT = 500;
let _outRenderUnlocked = false; // set true when user clicks "Show all"; reset on new generation

function renderAdvOut(arr) {
  var aOut = G('aOut'); // NB10 fix: declare aOut so strict mode doesn't throw
  if(!arr.length) {
    aOut.textContent = t('adv_output_empty');
    aOut.classList.add('empty');
    G('aBadge').textContent = '0 '+t('dyn_links');
    return;
  }
  aOut.classList.remove('empty');
  G('aBadge').textContent = arr.length + ' ' + t('dyn_link') + (arr.length !== 1&&_currentLang==='en' ? 's' : '');

  // Always store full set for download/copy before applying render cap.
  // Use _advRawLinks as the authoritative source when no filter is active,
  // so dataset.plain and _advRawLinks never diverge (fixes B5).
  var q = G('aOutFilter') ? G('aOutFilter').value.trim().toLowerCase() : '';
  var canonical = q ? arr : _advRawLinks;
  aOut.dataset.plain = canonical.join('\n');

  var capped = !_outRenderUnlocked && arr.length > _OUT_RENDER_LIMIT;
  var renderArr = capped ? arr.slice(0, _OUT_RENDER_LIMIT) : arr;

  var frag = document.createDocumentFragment();
  renderArr.forEach(function(link) {
    var remark = '';
    try { remark = decodeURIComponent((link.split('#')[1]) || ''); } catch(e){}
    var host = '';
    try { var u2 = new URL(link.replace(/^vless:\/\//, 'https://')); host = u2.hostname + ':' + (u2.port||'443'); } catch(e){}

    var row = document.createElement('div');
    row.className = 'out-row';
    row.title = t('m_click_copy');
    row.dataset.link = link;
    row.addEventListener('click', function() { copySingleLink(this); });

    var info = document.createElement('div');
    info.className = 'out-row-info';

    var remarkSpan = document.createElement('span');
    remarkSpan.className = 'out-row-remark';
    remarkSpan.textContent = remark || host;
    info.appendChild(remarkSpan);

    if(remark && remark !== host) {
      var hostSpan = document.createElement('span');
      hostSpan.className = 'out-row-host';
      hostSpan.textContent = host;
      info.appendChild(hostSpan);
    }

    var copySpan = document.createElement('span');
    copySpan.className = 'out-row-copy';
    copySpan.textContent = '⎘';

    row.appendChild(info);
    row.appendChild(copySpan);
    frag.appendChild(row);
  });

  if(capped) {
    var cap = document.createElement('div');
    cap.className = 'out-more';
    cap.appendChild(document.createTextNode(t('dyn_show_first') + _OUT_RENDER_LIMIT + t('dyn_of_links') + arr.length + ' '));
    var showAllBtn = document.createElement('span');
    showAllBtn.textContent = t('dyn_show_all');
    showAllBtn.addEventListener('click', renderAdvOutFull);
    cap.appendChild(showAllBtn);
    frag.appendChild(cap);
  }

  // Single DOM write — one reflow
  aOut.textContent = '';
  aOut.appendChild(frag);
} // end renderAdvOut

function renderAdvOutFull() {
  _outRenderUnlocked = true; // persist — filter/sort won't re-cap until next generation
  var q = G('aOutFilter') ? G('aOutFilter').value.trim().toLowerCase() : '';
  var links = q ? _advRawLinks.filter(function(l){ return l.toLowerCase().indexOf(q) > -1; }) : _advRawLinks.slice();
  renderAdvOut(links);
}
function copySingleLink(row) {
  var link = row.dataset.link;
  if(!link) return;
  safeClipboard(link).then(function(){
    row.classList.add('copied');
    setTimeout(function(){ row.classList.remove('copied'); }, 900);
    toast(t('copied'), 'ok');
  }).catch(function(){ toast(t('m_copy_failed'),'err'); });
}

function getRemark(link) {
  try { return decodeURIComponent((link.split('#')[1]) || ''); } catch(e){ return ''; }
}
function getHost(link) {
  try { var u = new URL(link.replace(/^vless:\/\//, 'https://')); return u.hostname; } catch(e){ return ''; }
}

// ══════════════════════════════════════════════════════════
// PING TESTER — TCPing (v2rayN-style)
//
// Strategy (same as v2rayN's SpeedtestHandler.GetTcpingTime):
//   Open a raw TCP connection to host:port and measure the time
//   until the connection is established (SYN-ACK received).
//   No HTTP, no TLS, no image tricks — pure TCP handshake timing.
//
// In Tauri we call a Rust command `tcping` that does exactly this
// via TcpStream::connect with a timeout.
// If the Tauri command is unavailable (dev/browser mode) we fall
// back to a WebSocket probe. Browsers have no raw sockets, so only
// a completed WS connection confirms the host; see tcpingOnce.
// ══════════════════════════════════════════════════════════
let _pinging = false;

// Detect if we are running inside Tauri (v1 or v2) and cache the invoke function
// once at startup so tcpingOnce doesn't re-resolve on every call.
const _isTauri = typeof window.__TAURI__ !== 'undefined';
let _tauriInvoke = null;
if(_isTauri) {
  if(window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
    _tauriInvoke = window.__TAURI__.core.invoke; // Tauri v2
  } else if(window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
    _tauriInvoke = window.__TAURI__.invoke; // Tauri v1 / compat shim
  }
}

// safeClipboard: use Tauri clipboard-manager plugin when inside Tauri (works on
// Android WebView where navigator.clipboard can silently fail), fall back to
// Web Clipboard API in browser. Returns a Promise<void>.
function safeClipboard(text) {
  if(_isTauri) {
    // Tauri v2: clipboard-manager plugin API
    try {
      var _cm = window.__TAURI__ && (window.__TAURI__['plugin:clipboard-manager'] || window.__TAURI__.clipboardManager);
      if(_cm && typeof _cm.writeText === 'function') return _cm.writeText(text);
    } catch(e) {}
    // Tauri v2 core invoke fallback
    if(_tauriInvoke) return _tauriInvoke('plugin:clipboard-manager|write_text', { label: text });
  }
  if(navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text);
  }
  // Final fallback: execCommand (deprecated but universally supported)
  return new Promise(function(resolve, reject) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand failed'));
    } catch(e) { reject(e); }
  });
}

async function runPing() {
  if(_pinging) return;
  var hosts = G('pingInput').value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
  if(!hosts.length) { toast(t('m_add_hosts'), 'err'); return; }
  var port    = parseInt(G('pingPort').value) || 443;
  var timeout = parseInt(G('pingTimeout').value) || 5000;
  var repeat  = parseInt(G('pingRepeat') ? G('pingRepeat').value : '3') || 3;

  _pinging = true;
  G('pingBtn').textContent = t('dyn_testing');
  G('pingBtn').disabled = true;
  var el = G('pingResults');
  el.textContent = '';
  var progEl = document.createElement('div');
  progEl.className = 'ping-progress';
  progEl.id = 'pingProg';
  progEl.textContent = _progress(0, hosts.length);
  el.appendChild(progEl);

  var results = new Array(hosts.length).fill(null);
  var completed = 0;
  var CONCURRENCY = 8;

  // Run hosts in parallel batches of CONCURRENCY
  async function pingWorker(idx) {
    var res = await tcpingHost(hosts[idx], port, timeout, repeat);
    results[idx] = res;
    completed++;
    var prog = G('pingProg');
    if(prog) prog.textContent = _progress(completed, hosts.length);
    renderPingResults(results.filter(Boolean));
  }

  try {
    // Chunk into batches
    for(var batchStart = 0; batchStart < hosts.length; batchStart += CONCURRENCY) {
      var batch = [];
      for(var bi = batchStart; bi < Math.min(batchStart + CONCURRENCY, hosts.length); bi++) {
        batch.push(pingWorker(bi));
      }
      await Promise.all(batch);
    }
    var ok = results.filter(function(r){ return r && r.ok; }).length;
    var unsure = results.filter(function(r){ return r && r.inconclusive; }).length;
    toast(tf(unsure ? 'm_test_done_u' : 'm_test_done', { a: ok, b: hosts.length, u: unsure }), 'ok');
  } finally {
    G('pingBtn').textContent = t('dyn_tcping_all_btn');
    G('pingBtn').disabled = false;
    _pinging = false;
    var prog2 = G('pingProg'); if(prog2) prog2.remove();
  }
}

// TCPing a host:port N times and return average RTT.
// Mirrors v2rayN's GetTcpingTime: measure TCP SYN-ACK round-trip.
// ok is only true for a confirmed connection. inconclusive means every probe that
// finished ended in an error the browser won't explain, so its timing proves nothing.
async function tcpingHost(host, port, timeout, repeat) {
  // SSRF guard — covers both the Tauri path and the WS fallback
  if(_isBlockedHost(host)) {
    console.warn('tcpingHost: blocked private/loopback host', host);
    return { host: host, ok: false, ms: 0, blocked: true };
  }
  var times = [], unconfirmed = [];
  for(var i = 0; i < repeat; i++) {
    var res = await tcpingOnce(host, port, timeout);
    if(res === null) {
      // Probe failed — skip this sample and keep trying the remaining repeats.
      // We no longer bail on the first attempt: transient network blips (common
      // on mobile / VPN) would wrongly mark a reachable host as unreachable.
      continue;
    }
    (res.confirmed ? times : unconfirmed).push(res.ms);
  }
  var samples = times.length ? times : unconfirmed;
  if(!samples.length) return { host: host, ok: false, ms: 0, timedOut: true };
  var avg = Math.round(samples.reduce(function(a,b){ return a+b; },0) / samples.length);
  var min = Math.min.apply(null, samples);
  return { host: host, ok: !!times.length, inconclusive: !times.length, ms: avg, min: min, times: samples };
}

// Result text for a host with no confirmed connection
function pingFailLabel(r) {
  if(r.blocked) return t('dyn_ping_blocked');
  if(r.inconclusive) return '~' + r.ms + ' ms ' + t('dyn_unconfirmed');
  return r.timedOut ? t('dyn_timeout_label') : t('dyn_unreachable');
}

// Single TCP connect attempt. Returns { ms, confirmed } or null on timeout.
// confirmed means the connection really opened. A WebSocket error is NOT evidence of
// reachability: browsers hide the cause, so a server rejecting the handshake looks the
// same as a DNS failure or a refused connection.
async function tcpingOnce(host, port, timeout) {
  // ── Tauri path: call Rust tcping command (real TCP socket) ──
  // Uses _tauriInvoke cached at startup (handles both Tauri v1 and v2).
  if(_tauriInvoke) {
    try {
      var ms = await _tauriInvoke('tcping', { host: host, port: port, timeoutMs: timeout });
      return typeof ms === 'number' ? { ms: ms, confirmed: true } : null;
    } catch(e) {
      // Command failed — fall through to WebSocket probe
    }
  }

  // ── Fallback: WebSocket probe (browser / dev mode) ──
  return new Promise(function(resolve) {
    var start = Date.now();
    var done  = false;

    var tid = setTimeout(function() {
      if(done) return;
      done = true;
      try { ws.close(); } catch(e){}
      resolve(null); // timeout = unreachable
    }, timeout);

    var ws;
    try {
      // Use wss:// for TLS ports (443, 8443) so the probe reflects real VLESS
      // connection conditions. Use ws:// for plain ports (80, 8080, etc.) —
      // a wss:// probe to a non-TLS port will always fail at TLS handshake,
      // making every non-TLS host appear unreachable.
      // Full Cloudflare TLS port list: 443, 2053, 2083, 2087, 2096, 8443
      var _tlsPort = (port === 443 || port === 8443 || port === 2053 || port === 2083 || port === 2087 || port === 2096);
      ws = new WebSocket((_tlsPort ? 'wss' : 'ws') + '://' + formatHost(host) + ':' + port);
    } catch(e) {
      clearTimeout(tid);
      resolve(null);
      return;
    }

    // onopen = TCP+TLS succeeded (best case — record RTT immediately)
    ws.onopen = function() {
      if(done) return;
      done = true;
      clearTimeout(tid);
      ws.close();
      resolve({ ms: Date.now() - start, confirmed: true });
    };

    // onerror fires for a rejected WS/TLS handshake, but also for DNS failures and
    // refused connections, and the browser doesn't say which. Report it as unconfirmed.
    ws.onerror = function() {
      if(done) return;
      done = true;
      clearTimeout(tid);
      resolve({ ms: Date.now() - start, confirmed: false });
    };

    // onclose after error — ignore, already resolved
    ws.onclose = function() {};
  });
}

const _ICONS = {
  ok: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  warn: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3.2"/></svg>',
  bad: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
};
function statusIcon(state) {
  var s = document.createElement('span');
  s.className = state;
  s.innerHTML = _ICONS[state];
  return s;
}
function _progress(done, total) { return t('progress_n').replace('{a}', done).replace('{b}', total); }
function _pingState(r) { return r.ok ? 'ok' : r.inconclusive ? 'warn' : 'bad'; }

// One result row. Rows that need explaining expand on click.
function resultRow(r, title, sub, open, toggle) {
  var state = _pingState(r);
  var row = document.createElement(toggle ? 'button' : 'div');
  row.className = 'result';
  if(toggle) { row.setAttribute('aria-expanded', open ? 'true' : 'false'); row.addEventListener('click', toggle); }
  row.appendChild(statusIcon(state));
  var main = document.createElement('span');
  main.style.minWidth = '0';
  var b = document.createElement('b'); b.textContent = title;
  main.appendChild(b);
  if(sub) { var small = document.createElement('small'); small.textContent = sub; main.appendChild(small); }
  row.appendChild(main);
  var value = document.createElement('span');
  value.className = 'st ' + state + (r.ok ? '' : ' txt');
  value.textContent = r.ok ? r.ms + ' ms' : pingFailLabel(r);
  row.appendChild(value);
  return row;
}

function renderPingResults(results) {
  var el = G('pingResults');
  var prog = G('pingProg');
  var frag = document.createDocumentFragment();
  if(prog) frag.appendChild(prog.cloneNode(true));
  results.forEach(function(r) { frag.appendChild(resultRow(r, r.host)); });
  el.textContent = '';
  el.appendChild(frag);
}
function clearPing() {
  G('pingInput').value = '';
  G('pingResults').textContent = '';
  toast(t('toast_cleared'), 'ok');
}

// ══════════════════════════════════════════════════════════
// CONFIG TCPING — Test vless:// links by their server:port
// Mirrors v2rayN Ctrl+O (TCPing per config)
// ══════════════════════════════════════════════════════════
let _cfgPinging = false;
let _cfgPingResults = []; // store last results for export

async function runCfgPing() {
  if(_cfgPinging) return;
  if(G('cfgPingInput').value.length > 2_000_000) { toast(t('m_too_large_2'), 'err'); return; }
  var raw = G('cfgPingInput').value.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
  if(!raw.length){ toast(t('m_no_links'),'err'); return; }

  var timeout = parseInt(G('cfgPingTimeout').value) || 5000;
  var repeat  = parseInt(G('cfgPingRepeat').value) || 3;
  var sortByMs = G('cfgPingSortByMs').checked;

  // Parse each link into { remark, host, port, raw }
  var configs = raw.map(function(link) {
    var c = parseVless(link);
    if(!c) return null;
    return { remark: c.remark || (formatHost(c.address) + ':' + c.port), host: c.address, port: parseInt(c.port, 10), raw: link };
  }).filter(Boolean);

  if(!configs.length){ toast(t('m_no_links'),'err'); return; }

  _cfgPinging = true;
  _cfgPingResults = [];
  G('cfgPingBtn').textContent = t('dyn_testing');
  G('cfgPingBtn').disabled = true;
  var cfgEl0 = G('cfgPingResults');
  cfgEl0.textContent = '';
  var cfgProgEl = document.createElement('div');
  cfgProgEl.className = 'ping-progress';
  cfgProgEl.id = 'cfgPingProg';
  cfgProgEl.textContent = _progress(0, configs.length);
  cfgEl0.appendChild(cfgProgEl);

  G('nt-check').classList.add('busy');
  renderCfgPingResults(sortByMs);
  var CFG_CONCURRENCY = 8;
  var cfgCompleted = 0;
  var cfgResultsArr = new Array(configs.length).fill(null);

  async function cfgPingWorker(ci) {
    var cfg = configs[ci];
    var res = await tcpingHost(cfg.host, cfg.port, timeout, repeat);
    cfgResultsArr[ci] = {
      remark: cfg.remark, host: cfg.host, port: cfg.port, raw: cfg.raw,
      ok: res.ok, ms: res.ms, min: res.min || res.ms,
      times: res.times || [], timedOut: res.timedOut || false,
      inconclusive: res.inconclusive || false, blocked: res.blocked || false
    };
    cfgCompleted++;
    var prog = G('cfgPingProg');
    if(prog) prog.textContent = _progress(cfgCompleted, configs.length);
    _cfgPingResults = cfgResultsArr.filter(Boolean);
    renderCfgPingResults(sortByMs);
  }

  try {
    for(var cfgBatch = 0; cfgBatch < configs.length; cfgBatch += CFG_CONCURRENCY) {
      var cfgBatchArr = [];
      for(var cbi = cfgBatch; cbi < Math.min(cfgBatch + CFG_CONCURRENCY, configs.length); cbi++) {
        cfgBatchArr.push(cfgPingWorker(cbi));
      }
      await Promise.all(cfgBatchArr);
    }
    var ok = _cfgPingResults.filter(function(r){ return r.ok; }).length;
    var unsure = _cfgPingResults.filter(function(r){ return r.inconclusive; }).length;
    toast(tf(unsure ? 'm_test_done_u' : 'm_test_done', { a: ok, b: configs.length, u: unsure }), 'ok');
    // Final render with sort applied
    renderCfgPingResults(sortByMs);
  } finally {
    G('cfgPingBtn').textContent = t('dyn_tcping_configs_btn');
    G('cfgPingBtn').disabled = false;
    _cfgPinging = false;
    var prog2 = G('cfgPingProg'); if(prog2) prog2.remove();
    G('nt-check').classList.remove('busy');
    renderCfgPingResults(sortByMs); // final render, now the run is over
    staggerIn(G('cfgPingResults').querySelectorAll('.result'));
    document.querySelectorAll('.tally b').forEach(function(b){ var n = +b.textContent; b.textContent = '0'; rollNumber(b, n); });
  }
}

// Sort order: confirmed, then unconfirmed, then failed; fastest first within each
function cfgPingCompare(a, b) {
  function rank(r) { return r.ok ? 0 : r.inconclusive ? 1 : 2; }
  return rank(a) - rank(b) || (rank(a) < 2 ? a.ms - b.ms : 0);
}

let _cfgOpen = null; // raw link of the expanded row

// Latency map: every server is a tick on a real millisecond scale, and hosts with no
// response sit in their own zone instead of being plotted as a fake time.
function latencyMap(results, final) {
  var count = function(state){ return results.filter(function(r){ return _pingState(r) === state; }).length; };
  var top = Math.max.apply(null, results.map(function(r){ return r.ms; }).concat([400]));
  var max = Math.ceil(top / 200) * 200, zone = 86;
  var x = function(ms){ return ms / max * zone; };

  var shell = document.createElement('div'); shell.className = 'shell';
  var core = document.createElement('div'); core.className = 'core map';
  var tally = document.createElement('div'); tally.className = 'tally';
  [['ok','dyn_confirmed'],['warn','dyn_unconfirmed_cap'],['bad','dyn_timeout_label']].forEach(function(p) {
    var item = document.createElement('span');
    item.className = p[0];
    item.innerHTML = _ICONS[p[0]];
    var n = document.createElement('b'); n.textContent = count(p[0]);
    item.appendChild(n);
    item.appendChild(document.createTextNode(t(p[1])));
    tally.appendChild(item);
  });
  core.appendChild(tally);

  var scale = document.createElement('div');
  scale.className = 'scale' + (final ? ' final' : '');
  scale.setAttribute('aria-hidden', 'true');
  var zoneEl = document.createElement('div'); zoneEl.className = 'void';
  scale.appendChild(zoneEl);
  if(!final) {
    var sweep = document.createElement('div');
    sweep.className = 'sweep';
    // The map is redrawn after each result, so keep the sweep on one continuous clock
    sweep.style.animationDelay = -(performance.now() % 1500) + 'ms';
    scale.appendChild(sweep);
  }
  results.forEach(function(r, i) {
    var tick = document.createElement('i'), state = _pingState(r);
    tick.className = state;
    var at = state === 'bad' ? 87 + (i * 7) % 12 : x(r.ms);
    tick.style.left = at + '%';
    tick.style.animationDelay = Math.round(at * 6) + 'ms'; // lands left to right, fastest first
    scale.appendChild(tick);
  });
  core.appendChild(scale);

  var axis = document.createElement('div');
  axis.className = 'axis';
  axis.setAttribute('aria-hidden', 'true');
  [0, max/4, max/2, max*3/4, max].forEach(function(ms, i) {
    var s = document.createElement('span');
    s.style.left = x(ms) + '%';
    s.textContent = i ? ms : '0 ms';
    axis.appendChild(s);
  });
  var none = document.createElement('span');
  none.style.left = '100%';
  none.textContent = t('dyn_no_response');
  axis.appendChild(none);
  core.appendChild(axis);
  shell.appendChild(core);
  return shell;
}

function renderCfgPingResults(sortByMs) {
  var results = _cfgPingResults.slice();
  if(sortByMs) results.sort(cfgPingCompare);

  var el = G('cfgPingResults');
  var prog = G('cfgPingProg');
  var frag = document.createDocumentFragment();
  if(prog) frag.appendChild(prog.cloneNode(true));

  if(prog) frag.appendChild(latencyMap(results, false));
  else if(results.length) frag.appendChild(latencyMap(results, true));

  if(results.length) {
    var list = document.createElement('div');
    list.className = 'core results';
    results.forEach(function(r) {
      var open = _cfgOpen === r.raw;
      list.appendChild(resultRow(r, r.remark, formatHost(r.host) + ':' + r.port, open, function() {
        _cfgOpen = open ? null : r.raw;
        renderCfgPingResults(sortByMs);
      }));
      if(open) {
        var help = document.createElement('div');
        help.className = 'result-help';
        help.textContent = t(r.ok ? 'help_ok' : r.inconclusive ? 'dyn_unconfirmed_hint' : r.blocked ? 'help_blocked' : 'help_timeout');
        list.appendChild(help);
      }
    });
    frag.appendChild(list);
  }

  el.textContent = '';
  el.appendChild(frag);
  G('cfgActions').hidden = !_cfgPingResults.length || _cfgPinging;
  updateRoute();
}

// Moves the configs that responded into Export, confirmed ones first
function cfgPingKeep() {
  var usable = _cfgPingResults.filter(function(r){ return r.ok || r.inconclusive; }).sort(cfgPingCompare);
  if(!usable.length) { toast(t('toast_nothing_export'), 'err'); return; }
  _advRawLinks = usable.map(function(r){ return r.raw; });
  _resetAdvFilterSort();
  _outRenderUnlocked = false;
  renderAdvOut(_advRawLinks);
  aQrLinks = _advRawLinks.slice(); aQrCur = 0; updateAQr();
  navTab('export');
}

// Load links from Advanced output panel
function cfgPingFromOutput() {
  // Use _advRawLinks — the canonical source of truth (reflects sort/shuffle state)
  var links = _advRawLinks.filter(function(x){ return x.startsWith('vless://'); });
  if(!links.length){ toast(t('export_empty'),'err'); return; }
  G('cfgPingInput').value = links.join('\n');
  toast(tf('m_loaded_n', { n: links.length }), 'ok');
}

// Load links from Bulk input
function cfgPingFromBulk() {
  var txt = G('bulkInput') ? G('bulkInput').value.trim() : '';
  var links = txt.split('\n').filter(function(x){ return x.trim().startsWith('vless://'); });
  if(!links.length){ toast(t('m_no_links'),'err'); return; }
  G('cfgPingInput').value = links.join('\n');
  toast(tf('m_loaded_n', { n: links.length }), 'ok');
}

// Export configs that got a response, confirmed ones first, timeouts excluded. Most VLESS
// servers reject the browser's WebSocket probe, so dropping unconfirmed configs would
// leave nothing to export; the toast says how many of them are unverified.
function cfgPingExportFast() {
  var usable = _cfgPingResults.filter(function(r){ return r.ok || r.inconclusive; });
  if(!usable.length){ toast(t('m_none_reachable'),'err'); return; }
  usable.sort(cfgPingCompare);
  dlText('fastest_configs.txt', usable.map(function(r){ return r.raw; }).join('\n'));
  var unsure = usable.filter(function(r){ return r.inconclusive; }).length;
  toast(tf(unsure ? 'm_exported_nu' : 'm_exported_n', { n: usable.length, u: unsure }), 'ok');
}

function clearCfgPing() {
  G('cfgPingInput').value = '';
  G('cfgPingResults').textContent = '';
  _cfgPingResults = [];
  G('cfgActions').hidden = true;
  updateRoute();
  toast(t('toast_cleared'), 'ok');
}

// ══════════════════════════════════════════════════════════
// BALANCER — Config Balancer Tool
// ══════════════════════════════════════════════════════════
(function () {
  'use strict';

  var BAL_FORMAT = 0; // 0 = Xray, 1 = sing-box
  var BAL_NODES  = [];

  // ── Parser ──────────────────────────────────────────────
  function balExtract(raw) {
    return raw.match(/vless:\/\/[^\s#]+(?:#[^\s]*)?/gi) || [];
  }

  function balParseOne(link, idx) {
    try {
      var c = parseVless(link.replace(/@@/g, ''));
      if (!c) return null;

      // splithttp is the former name of xhttp
      var network  = c.type === 'splithttp' ? 'xhttp' : c.type;
      var security = c.security;
      var sni      = c.sni || c.address;
      var fp       = c.fp  || 'chrome';
      var alpn     = c.alpn ? c.alpn.split(',') : null;
      var host     = c.host;
      var path     = c.path;
      var port     = parseInt(c.port, 10);
      var address  = c.address;
      var remark   = c.remark.trim() || 'Proxy-' + idx;

      // Xray outbound
      var xOut = {
        tag: 'proxy-' + idx,
        protocol: 'vless',
        settings: { vnext: [{ address: address, port: port, users: [{ id: c.uuid, encryption: c.encryption || 'none', flow: c.flow }] }] },
        streamSettings: { network: network, security: security }
      };
      if (network === 'ws') {
        xOut.streamSettings.wsSettings = { path: path, host: host };
      } else if (network === 'grpc') {
        xOut.streamSettings.grpcSettings = { serviceName: c.serviceName, multiMode: c.q.mode === 'multi' };
      } else if (network === 'xhttp') {
        xOut.streamSettings.xhttpSettings = { path: path, host: host, mode: c.mode || 'auto' };
        try { if (c.extra) xOut.streamSettings.xhttpSettings.extra = JSON.parse(c.extra); } catch(e) {}
      } else if (network === 'httpupgrade') {
        xOut.streamSettings.httpupgradeSettings = { path: path, host: host };
      } else if (network === 'tcp' && c.q.headerType === 'http') {
        xOut.streamSettings.tcpSettings = { header: { type: 'http', request: { path: [path], headers: { Host: [host || address] } } } };
      }
      if (security === 'tls') {
        xOut.streamSettings.tlsSettings = { serverName: sni, fingerprint: fp, allowInsecure: c.insecure };
        if (alpn) xOut.streamSettings.tlsSettings.alpn = alpn;
      } else if (security === 'reality') {
        xOut.streamSettings.realitySettings = { serverName: sni, fingerprint: fp, publicKey: c.pbk, shortId: c.sid, spiderX: c.spx || '/' };
      }

      // Xray refuses unencrypted VLESS to anything but private addresses
      var plain = security === 'none' && (!c.encryption || c.encryption === 'none') && !_isBlockedHost(address);

      return { xOut: plain ? null : xOut, sOut: singboxOutbound(c, 'proxy-' + idx), remark: remark, address: address, port: port, network: network, security: security };
    } catch(e) { return null; }
  }

  // ── Live preview ─────────────────────────────────────────
  function balRenderPreview(nodes) {
    BAL_NODES = nodes;
    G('balLiveCount').textContent = tf('m_nodes', { n: nodes.length });
    var prev = G('balNodeList');
    var wrap = G('balNodePreview');
    if (!nodes.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    // FIX BUG: use DOM methods instead of innerHTML to prevent XSS from crafted vless:// remarks
    prev.textContent = '';
    nodes.forEach(function(n) {
      var row = document.createElement('div');
      row.className = 'node';
      var remark = document.createElement('span');
      remark.textContent = n.remark;
      var addr = document.createElement('span');
      addr.textContent = n.network + ' ' + formatHost(n.address) + ':' + n.port;
      row.appendChild(remark);
      row.appendChild(addr);
      prev.appendChild(row);
    });
  }

  // ── Config builders ──────────────────────────────────────
  function balBuildXray(nodes, strategy, probeUrl, probeInterval, socksPort) {
    var outbounds = nodes.map(function(n) { return n.xOut; });
    outbounds.push({ tag: 'direct', protocol: 'freedom', settings: {} });
    outbounds.push({ tag: 'block',  protocol: 'blackhole', settings: { response: { type: 'http' } } });
    var cfg = {
      log: { loglevel: 'warning' },
      inbounds: [
        { port: socksPort,     listen: '127.0.0.1', protocol: 'socks', settings: { udp: true, auth: 'noauth' }, sniffing: { enabled: true, destOverride: ['http','tls','quic','fakedns'], routeOnly: true } },
        { port: socksPort + 1, listen: '127.0.0.1', protocol: 'http' }
      ],
      outbounds: outbounds,
      routing: {
        domainStrategy: 'IPIfNonMatch',
        rules: [
          { type: 'field', outboundTag: 'direct', ip: ['geoip:private','geoip:cn'] },
          { type: 'field', outboundTag: 'direct', domain: ['geosite:cn'] },
          { type: 'field', network: 'tcp,udp', balancerTag: 'core_balancer' }
        ],
        balancers: [{ tag: 'core_balancer', selector: ['proxy-'], strategy: { type: strategy } }]
      }
    };
    if (strategy === 'leastPing') {
      cfg.observatory = { subjectSelector: ['proxy-'], probeUrl: probeUrl, probeInterval: probeInterval, enableConcurrency: true };
    }
    return JSON.stringify(cfg, null, 2);
  }

  function balBuildSingBox(nodes, strategy, probeUrl, probeInterval, socksPort) {
    var outbounds = nodes.map(function(n) { return n.sOut; });
    outbounds.push({ type: 'direct', tag: 'direct' });
    var tags = nodes.map(function(n) { return n.sOut.tag; });
    var balancer = strategy === 'leastPing'
      ? { type: 'urltest', tag: 'core_balancer', outbounds: tags, url: probeUrl, interval: probeInterval, tolerance: 300, idle_timeout: '30m' }
      : { type: 'selector', tag: 'core_balancer', outbounds: tags, default: tags[0] || 'direct' };
    outbounds.push(balancer);
    return JSON.stringify(singboxConfig('warning', 'ipv4_only', socksPort, outbounds, 'core_balancer'), null, 2);
  }

  // ── Public API ───────────────────────────────────────────
  window.balSetFormat = function(mode) {
    BAL_FORMAT = mode;
    G('balFmtXray').classList.toggle('active', mode === 0);
    G('balFmtSing').classList.toggle('active', mode === 1);
    syncThumbs();
    // Auto-regen if output already exists
    if (BAL_NODES.length && G('balOutput').value) window.balGenerate();
  };

  window.balGenerate = function() {
    var raw = G('balInputNodes').value;
    var links = balExtract(raw);
    if (!links.length) { toast(t('m_no_links'), 'err'); return; }
    var nodes = links.map(function(l, i) { return balParseOne(l, i + 1); }).filter(Boolean);
    if (!nodes.length) { toast(t('m_no_nodes'), 'err'); return; }
    balRenderPreview(nodes);

    var parsedCount = nodes.length;
    var outKey = BAL_FORMAT === 1 ? 'sOut' : 'xOut';
    nodes = nodes.filter(function(n) { return n[outKey]; });
    if (!nodes.length) { toast(t(BAL_FORMAT === 1 ? 'toast_singbox_no_transport' : 'toast_xray_no_plain'), 'err'); return; }
    var skipped = parsedCount - nodes.length;

    var strategy = G('balStrategy').value;
    var probeUrl  = G('balProbeUrl').value.trim();
    var interval  = G('balProbeInterval').value.trim();
    var port      = parseInt(G('balSocksPort').value) || 10808;

    var json = BAL_FORMAT === 0
      ? balBuildXray(nodes, strategy, probeUrl, interval, port)
      : balBuildSingBox(nodes, strategy, probeUrl, interval, port);

    G('balOutput').value = json;
    G('balOutWrap').style.display = 'block';
    var label = BAL_FORMAT === 0
      ? 'Xray / v2rayNG · ' + tf('m_nodes', { n: nodes.length })
      : 'sing-box 1.13+ · ' + tf('m_nodes', { n: nodes.length });
    G('balOutLabel').textContent = label;
    var st = G('balStatus');
    st.style.display = 'block';
    st.textContent = '';
    var stBold = document.createElement('strong');
    stBold.textContent = nodes.length;
    var stStrat = document.createElement('span');
    stStrat.textContent = strategy === 'leastPing' ? 'LeastPing' : 'Selector';
    st.appendChild(stBold);
    st.appendChild(document.createTextNode(' ' + t('m_nodes_word') + ' · ' + (BAL_FORMAT === 0 ? 'Xray' : 'sing-box 1.13+') + ' · '));
    st.appendChild(stStrat);
    toast(skipped ? t(BAL_FORMAT === 1 ? 'toast_singbox_skipped' : 'toast_xray_skipped').replace('{n}', skipped) : tf('m_generated_n', { n: nodes.length }), skipped ? 'err' : 'ok');
  };

  window.balCopyOut = function() {
    var v = G('balOutput').value;
    if (!v) { toast(t('toast_nothing_copy'), 'err'); return; }
    // FIX IMPROVE: use safeClipboard() which handles Tauri and Android WebView fallbacks
    safeClipboard(v).then(function() { toast(t('copied'), 'ok'); }).catch(function() { toast(t('m_copy_failed'), 'err'); });
  };

  window.balDownload = function() {
    var v = G('balOutput').value;
    if (!v) { toast(t('toast_generate_first'), 'err'); return; }
    // FIX IMPROVE: use dlText() which handles Telegram WebView's lack of download support
    var fn = (BAL_FORMAT === 0 ? 'xray' : 'singbox') + '-balancer-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.json';
    dlText(fn, v);
  };

  window.balClear = function() {
    G('balInputNodes').value = '';
    G('balOutput').value = '';
    G('balOutWrap').style.display = 'none';
    G('balNodePreview').style.display = 'none';
    G('balStatus').style.display = 'none';
    G('balLiveCount').textContent = tf('m_nodes', { n: 0 });
    BAL_NODES = [];
    toast(t('toast_cleared'), 'ok');
  };

  // ── Live input ───────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    var inp = G('balInputNodes');
    if (!inp) return;
    var timer;
    inp.addEventListener('input', function() {
      clearTimeout(timer);
      timer = setTimeout(function() {
        var links = balExtract(inp.value);
        balRenderPreview(links.map(function(l, i) { return balParseOne(l, i+1); }).filter(Boolean));
      }, 300);
    });
  });

})();

// ── Motion ────────────────────────────────────────────────
function _calm() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

// One shared highlight per group, which slides to the active item
function syncThumbs() {
  document.querySelectorAll('.route, .seg, .subtabs').forEach(function(box) {
    if(!box.offsetWidth) return;
    var on = box.querySelector('.active');
    var thumb = box.querySelector(':scope > .thumb');
    if(!thumb) {
      thumb = document.createElement('i');
      thumb.className = 'thumb';
      box.insertBefore(thumb, box.firstChild);
    }
    thumb.style.opacity = on ? '1' : '0';
    if(!on) return;
    var line = box.classList.contains('subtabs');
    thumb.style.width = on.offsetWidth + 'px';
    thumb.style.height = (line ? 2 : on.offsetHeight) + 'px';
    thumb.style.transform = 'translate(' + on.offsetLeft + 'px,' + (line ? on.offsetTop + on.offsetHeight - 2 : on.offsetTop) + 'px)';
    if(!thumb.classList.contains('ready')) requestAnimationFrame(function(){ thumb.classList.add('ready'); });
  });
}

// Panels enter from the direction of travel, and a signal runs along the trace line
function routeMotion(name, from, at) {
  var rtl = document.documentElement.dir === 'rtl' ? -1 : 1;
  G('tp-'+name).style.setProperty('--from', ((at >= from ? 1 : -1) * rtl * 14) + 'px');
  if(at <= from || at > 2) return;
  [at > 1 && from < 2 ? 'link2' : '', at >= 1 && from < 1 ? 'link1' : ''].forEach(function(id) {
    if(!id) return;
    var link = G(id);
    link.classList.remove('pulse');
    void link.offsetWidth;
    link.classList.add('pulse');
  });
}

function rollNumber(el, to) {
  var from = parseInt((el.textContent || '0').replace(/\D/g, ''), 10) || 0;
  cancelAnimationFrame(el._roll);
  if(from === to || _calm() || document.hidden) { el.textContent = to.toLocaleString('en'); return; }
  var start = performance.now();
  function step(now) {
    var p = Math.min(1, (now - start) / 300), eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString('en');
    if(p < 1) el._roll = requestAnimationFrame(step);
  }
  el._roll = requestAnimationFrame(step);
}

// Rows arrive in sequence. Only the first screenful, so long lists never feel slow.
function staggerIn(rows) {
  Array.prototype.slice.call(rows, 0, 12).forEach(function(row, i) {
    row.style.animationDelay = (i * 32) + 'ms';
    row.classList.remove('fresh');
    void row.offsetWidth;
    row.classList.add('fresh');
  });
}

function once(el, cls, ms) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(function(){ el.classList.remove(cls); }, ms);
}

function flashCopied(btn) {
  if(btn._flash) clearTimeout(btn._flash);
  else btn._label = btn.textContent;
  btn.textContent = t('copied');
  once(btn, 'swap', 260);
  btn._flash = setTimeout(function() {
    btn.textContent = btn._label;
    btn._flash = null;
    once(btn, 'swap', 260);
  }, 1400);
}

// A soft light follows the pointer along panel edges
(function() {
  if(!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var pending = null;
  document.addEventListener('pointermove', function(e) {
    var shell = e.target.closest && e.target.closest('.shell');
    if(!shell || pending) return;
    pending = requestAnimationFrame(function() {
      pending = null;
      var r = shell.getBoundingClientRect();
      shell.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      shell.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }, { passive: true });
})();

window.addEventListener('resize', syncThumbs);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(syncThumbs);

// ── Start ─────────────────────────────────────────────────
_liveCountNow();
updateRoute();
syncThumbs();
_pasteHint();
