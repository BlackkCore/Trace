// ── Globals ───────────────────────────────────────────────
'use strict';
const G = function(id){ return document.getElementById(id); };
let advType = 'xhttp';
let simType = 'tcp';
let simHasEnc = false;
let hist = [];
let parsedD = null;
let sQrLinks = [], sQrCur = 0;
let aQrLinks = [], aQrCur = 0;
let _saveMode = 'simple';
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
function lsSet(k,v){
  try{
    localStorage.setItem(k, JSON.stringify(v));
  } catch(e) {
    if(e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      // For any array-valued key, trim to half on overflow so adjacent keys are not corrupted.
      if(Array.isArray(v) && v.length > 1) {
        var arr = v.slice(0, Math.max(1, Math.floor(v.length / 2)));
        try {
          localStorage.setItem(k, JSON.stringify(arr));
          toast('Storage full — trimmed "' + k + '" to ' + arr.length + ' entries', 'err');
        } catch(e2) {
          console.error('lsSet: could not recover from quota (' + k + ')', e2);
          toast('Storage full — could not save "' + k + '"', 'err');
        }
      } else {
        toast('Storage full — could not save "' + k + '"', 'err');
        console.error('lsSet failed (quota) for key:', k);
      }
    } else {
      console.error('lsSet failed ('+k+'):', e);
    }
  }
}

// ── Safe fetch — URL allow-list to prevent SSRF ─────────────
// Only http:// and https:// are permitted. file://, data://, ftp://,
// and private/link-local addresses are blocked before the network call.
const _SSRF_BLOCK_RE = /^(0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|::1|\[::1\]|\[::ffff:(127|10)\.\d+\.\d+\.\d+\]|\[::ffff:192\.168\.\d+\.\d+\]|\[::ffff:172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\]|\[fc[0-9a-f][0-9a-f]:[^\]]*\]|\[fd[0-9a-f][0-9a-f]:[^\]]*\]|\[fe80:[^\]]*\]|localhost|.*\.local)$/i;

function _isBlockedHost(hostname) {
  if(!hostname) return true;
  // strip IPv6 brackets for bare-address tests
  var bare = hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;
  return _SSRF_BLOCK_RE.test(hostname) || _SSRF_BLOCK_RE.test(bare);
}

function safeFetch(url, opts) {
  var parsed;
  try { parsed = new URL(url); } catch(e) { return Promise.reject(new Error('Invalid URL')); }
  if(parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return Promise.reject(new Error('Only https:// and http:// URLs are permitted'));
  }
  var host = parsed.hostname;
  if(_isBlockedHost(host)) {
    return Promise.reject(new Error('Private/loopback addresses are not permitted'));
  }
  return fetch(url, opts);
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
  toast(typeof t==='function'?t('toast_new_uuid'):'New UUID generated','ok');
}
function validateUUID(id) {
  var val = G(id).value.trim(), valid = UUID_RE.test(val);
  G(id).classList.toggle('invalid',!valid);
  var e = G('err_'+id); if(e) e.classList.toggle('show',!valid);
  return valid;
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg,t) {
  var el = G('toast');
  if(!el) return;
  el.textContent = msg;
  el.className = 'show '+(t||'ok');
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ el.className=''; }, 2400);
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
    if(count > 65536) { toast('CIDR /' + prefix + ' would expand to ' + count + ' IPs — max is /16', 'err'); return [entry]; }
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
    var startN = ipToInt(fullRangeMatch[1]), endN = ipToInt(fullRangeMatch[2]);
    if(endN < startN) { toast('IP range end is before start', 'err'); return [entry]; }
    if(endN - startN > 65535) { toast('Range too large — max 65536 IPs', 'err'); return [entry]; }
    for(var rangeN = startN; rangeN <= endN; rangeN++) result.push(intToIp(rangeN));
    return result;
  }

  // Short range: last-octet only — e.g. 192.168.1.1-50
  var shortRangeMatch = entry.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)(\d{1,3})-(\d{1,3})$/);
  if(shortRangeMatch) {
    var prefix3 = shortRangeMatch[1];
    var from = parseInt(shortRangeMatch[2], 10), to = parseInt(shortRangeMatch[3], 10);
    if(to < from || from < 0 || to > 255) { toast('Invalid last-octet range: ' + entry, 'err'); return [entry]; }
    for(var i = from; i <= to; i++) result.push(prefix3 + i);
    return result;
  }

  // Plain IP or hostname — return as-is
  return [entry];
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
  if(!hasRange) { toast('No ranges found to expand','ok'); return; }
  G(id).value = expanded.join('\n');
  // Do NOT call liveCount() here — callers are responsible for updating their own
  // live counter (simpleLiveCount vs liveCount) after expansion completes.
  toast('Expanded to ' + expanded.length + ' IPs','ok');
}
function expandSimpleIPs() { expandIPsInField('s_ip'); simpleLiveCount(); }
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
    ? (typeof t === 'function' ? t('pair_mode_on') : 'ON — IP[1]↔SNI[1], IP[2]↔SNI[2], … (same index paired)')
    : (offText || (typeof t === 'function' ? t('pair_mode_off_adv') : 'OFF — full IP × SNI matrix'));
}
function setOptVal(sel,val) {
  var opt = sel.querySelector('option[value="'+val+'"]');
  if(opt) sel.value = val;
}
function togPanel(fieldId,chk) {
  var tf = G('tf-'+fieldId);
  if(tf) tf.classList.toggle('open', chk.checked);
}
function dlText(filename, content) {
  // Inside Telegram Mini App: file downloads are not supported in WebView.
  // Copy the content to clipboard and notify the user.
  var tg = window._tg;
  if (tg) {
    navigator.clipboard.writeText(content).then(function() {
      toast('Copied to clipboard ✓ — paste into any app to save as ' + filename, 'ok');
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
      btn.textContent = '✕ Close';
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

// ── Navigation tabs ───────────────────────────────────────
function navTab(name) {
  ['gen','profiles','bulk','tools','uuids'].forEach(function(n){
    G('nt-'+n).classList.toggle('active', n===name);
    G('tp-'+n).classList.toggle('active', n===name);
  });
  if(name==='profiles') renderProfiles();
  if(name==='uuids') { renderUUIDs(); renderIPLists(); renderSNILists(); }
}

function setMode(m) {
  G('btnSimple').classList.toggle('active', m==='simple');
  G('btnAdv').classList.toggle('active', m==='advanced');
  G('pSimple').style.display = m==='simple' ? '' : 'none';
  G('pAdv').style.display   = m==='advanced' ? '' : 'none';
}
function advTab(name) {
  ['gen','imp','hist'].forEach(function(n){
    G('ap-'+n).classList.toggle('active',n===name);
  });
  document.querySelectorAll('.tab2').forEach(function(t){
    var m = (t.getAttribute('onclick')||'').match(/advTab\('(\w+)'\)/);
    t.classList.toggle('active', !!(m && m[1]===name));
  });
  if(name==='hist') renderHist();
}

// ── Build query params ────────────────────────────────────
function buildParams(opts) {
  var q = [];
  var sec = opts.security||'tls';
  if(opts.useEnc) q.push('encryption=none');
  q.push('security='+sec);
  if(sec!=='none'){
    if(opts.sni)  q.push('sni='+encodeURIComponent(opts.sni));
    if(opts.fp)   q.push('fp='+opts.fp);
    if(opts.alpn) q.push('alpn='+encodeURIComponent(opts.alpn));
    q.push('insecure='+(opts.insecure?'1':'0'));
    q.push('allowInsecure='+(opts.insecure?'1':'0'));
  }
  var type = opts.type||'tcp';
  if(type!=='tcp') q.push('type='+type);
  if(opts.host) q.push('host='+encodeURIComponent(opts.host));
  var showPath = ['xhttp','ws','httpupgrade','splithttp'].indexOf(type)>-1;
  if(showPath && opts.path) q.push('path='+encodeURIComponent(opts.path||'/'));
  var isX = type==='xhttp'||type==='splithttp';
  if(isX && opts.mode && opts.mode!=='auto') q.push('mode='+opts.mode);
  if(isX && opts.extra) q.push('extra='+encodeURIComponent(opts.extra));
  if(type==='grpc' && opts.grpc) q.push('serviceName='+encodeURIComponent(opts.grpc));
  return q;
}

// ── QR helpers ────────────────────────────────────────────
function renderQR(canvasId,link) {
  QRCode.toCanvas(G(canvasId),link,{width:160,margin:1,color:{dark:'#000',light:'#fff'}});
}
function updateSQr() {
  if(!sQrLinks.length) return;
  renderQR('sQr',sQrLinks[sQrCur]);
  G('sQrIdx').textContent=(sQrCur+1)+' / '+sQrLinks.length;
  G('sQrNav').style.display=sQrLinks.length>1?'flex':'none';
}
function sQrPrev(){ if(sQrCur>0){ sQrCur--; updateSQr(); } }
function sQrNext(){ if(sQrCur<sQrLinks.length-1){ sQrCur++; updateSQr(); } }
function updateAQr() {
  if(!aQrLinks.length) return;
  renderQR('aQr',aQrLinks[aQrCur]);
  G('aQrIdx').textContent=(aQrCur+1)+' / '+aQrLinks.length;
  G('aQrNav').style.display=aQrLinks.length>1?'flex':'none';
}
function aQrPrev(){ if(aQrCur>0){ aQrCur--; updateAQr(); } }
function aQrNext(){ if(aQrCur<aQrLinks.length-1){ aQrCur++; updateAQr(); } }

// ── SIMPLE: Parse ─────────────────────────────────────────
function simpleParse() {
  var raw = G('sUri').value.trim();
  G('sEditor').style.display='none';
  G('sStatus').textContent='';
  simType='tcp'; simHasEnc=false;
  if(!raw) return;
  if(raw.length > 8000){ toast('Input too large to parse','err'); return; }
  if(!raw.startsWith('vless://')){
  G('sStatus').textContent = '';
  var errSpan = document.createElement('span');
  errSpan.style.color = 'var(--red)';
  errSpan.textContent = (typeof t==='function'?t('dyn_uri_must_vless'):'✕ URI must start with vless://');
  G('sStatus').appendChild(errSpan);
  return;
  }
  try {
    var u = new URL(raw.replace(/^vless:\/\//,'https://'));
    var p = new URLSearchParams(u.search);
    simType   = p.get('type')||'tcp';
    simHasEnc = !!(p.get('encryption'));
    G('s_uuid').value = u.username||'';
    G('s_port').value = u.port||'443';
    G('s_ip').value   = u.hostname||'';
    G('s_sni').value  = p.get('sni')  ? decodeURIComponent(p.get('sni'))  : '';
    G('s_host').value = p.get('host') ? decodeURIComponent(p.get('host')) : '';
    G('s_path').value = p.get('path') ? decodeURIComponent(p.get('path')) : '/';
    setOptVal(G('s_security'), p.get('security')||'tls');
    setOptVal(G('s_fp'),       p.get('fp')||'');
    setOptVal(G('s_alpn'),     p.get('alpn') ? decodeURIComponent(p.get('alpn')) : '');
    G('s_insecure').checked = (p.get('allowInsecure')||p.get('insecure'))==='1';
    G('s_remark').value = decodeURIComponent(u.hash.slice(1)||'');
    var isX = simType==='xhttp'||simType==='splithttp';
    G('sw_mode').style.display  = isX ? '' : 'none';
    G('sw_extra').style.display = isX ? '' : 'none';
    G('sw_grpc').style.display  = simType==='grpc' ? '' : 'none';
    if(isX){ setOptVal(G('s_mode'),p.get('mode')||'auto'); G('s_extra').value=p.get('extra')?decodeURIComponent(p.get('extra')):''; }
    if(simType==='grpc') G('s_grpc').value=p.get('serviceName')||'';
    G('sTypeBadge').textContent = simType.toUpperCase()+(typeof t==='function'?t('dyn_transport_badge'):' transport');
    G('sEditor').style.display  = '';
    G('sStatus').textContent = '';
    var okSpan = document.createElement('span');
    okSpan.style.color = 'var(--green)';
    okSpan.textContent = (typeof t==='function'?t('dyn_loaded_type'):'✓ Loaded — type: ')+simType;
    G('sStatus').appendChild(okSpan);
    toast(typeof t==='function'?t('toast_loaded_successfully'):'Loaded successfully','ok');
  } catch(e) {
    G('sStatus').textContent = '';
    var failSpan = document.createElement('span');
    failSpan.style.color = 'var(--red)';
    failSpan.textContent = (typeof t==='function'?t('dyn_parse_failed'):'✕ Failed to parse URI');
    G('sStatus').appendChild(failSpan);
  }
}

// ── SIMPLE: Generate ──────────────────────────────────────
function simpleRegen() {
  var uuid = G('s_uuid').value.trim();
  if(!uuid){ toast(typeof t==='function'?t('toast_uuid_required'):'UUID is required','err'); return; }
  if(!validateUUID('s_uuid')){ toast(typeof t==='function'?t('toast_invalid_uuid'):'Invalid UUID format','err'); return; }
  var portVal = parseInt(G('s_port').value.trim(),10);
  if(!portVal||portVal<1||portVal>65535){ toast(typeof t==='function'?t('toast_port_invalid'):'Port must be 1–65535','err'); G('s_port').classList.add('invalid'); return; }
  G('s_port').classList.remove('invalid');
  var port     = String(portVal);
  var ips      = linesOfExpanded('s_ip');
  var snis     = linesOf('s_sni');
  if(ips.length===0){ toast(typeof t==='function'?t('toast_add_ip'):'Add at least one IP / Host','err'); return; }
  var host     = G('s_host').value.trim();
  var path     = G('s_path').value.trim()||'/';
  var security = G('s_security').value;
  var fp       = G('s_fp').value;
  var alpn     = G('s_alpn').value;
  var insecure = G('s_insecure').checked;
  var tpl      = G('s_remark').value.trim();
  var mode     = G('s_mode').value;
  var extra    = G('s_extra').value.trim();
  var grpc     = G('s_grpc').value.trim();
  var sniList  = snis.length ? snis : [''];
  var paired = G('s_pairMode').checked;
  var estimatedCount = paired ? Math.max(ips.length, sniList.length) : ips.length * sniList.length;
  if(estimatedCount > 50000) {
    toast((typeof t==='function'?t('toast_generating_too_many'):'Cannot generate more than 50,000 links at once — reduce your IP or SNI list.'), 'err');
    return;
  }
  if(estimatedCount > 15000) {
    if(!confirm(estimatedCount.toLocaleString() + (typeof t==='function'?t('dyn_confirm_large'):' links will be generated.\nThis may take a moment and use significant memory.\n\nContinue?'))) return;
  }
  var out=[],idx=1;
  if(paired && snis.some(function(s){ return s !== ''; })){
    ips.forEach(function(ip,i){
      var sni=sniList[i%sniList.length]||'';
      var q=buildParams({useEnc:simHasEnc,security:security,sni:sni,fp:fp,alpn:alpn,insecure:insecure,type:simType,host:host,path:path,mode:mode,extra:extra,grpc:grpc});
      var remark=applyRemarkTpl(tpl,ip,sni,port,idx,G('s_prefix')?G('s_prefix').value.trim():'');
      out.push('vless://'+uuid+'@'+ip+':'+port+'?'+q.join('&')+'#'+encodeURIComponent(remark));
      idx++;
    });
  } else {
    ips.forEach(function(ip){
      sniList.forEach(function(sni){
        var q=buildParams({useEnc:simHasEnc,security:security,sni:sni,fp:fp,alpn:alpn,insecure:insecure,type:simType,host:host,path:path,mode:mode,extra:extra,grpc:grpc});
        var remark=applyRemarkTpl(tpl,ip,sni,port,idx,G('s_prefix')?G('s_prefix').value.trim():'');
        out.push('vless://'+uuid+'@'+ip+':'+port+'?'+q.join('&')+'#'+encodeURIComponent(remark));
        idx++;
      });
    });
  }
  var txt=out.join('\n');
  var sOut = G('sOut');
  sOut.textContent = '';
  var frag = document.createDocumentFragment();
  out.forEach(function(link) {
    var row = document.createElement('div');
    row.className = 'out-row';
    var textSpan = document.createElement('span');
    textSpan.className = 'out-row-text';
    textSpan.textContent = link;
    var copySpan = document.createElement('span');
    copySpan.className = 'out-row-copy';
    copySpan.textContent = '⎘';
    copySpan.addEventListener('click', function(e) {
      e.stopPropagation();
      safeClipboard(textSpan.textContent).then(function(){ toast('Copied!','ok'); }).catch(function(){ toast('Copy failed','err'); });
    });
    row.appendChild(textSpan);
    row.appendChild(copySpan);
    frag.appendChild(row);
  });
  sOut.classList.remove('empty');
  sOut.appendChild(frag);
  G('sBadge').textContent=out.length+' '+(typeof t==='function'?t('dyn_link'):'link')+(out.length!==1&&_currentLang==='en'?'s':'');
  G('sStats').style.display='';
  G('sLinks').textContent=out.length; G('sIPs').textContent=ips.length; G('sSNIs').textContent=snis.length||1;
  sQrLinks=out; sQrCur=0; updateSQr();
  G('sQrW').classList.remove('open');
  toast(out.length+' '+(typeof t==='function'?t('dyn_link'):'link')+(out.length!==1&&_currentLang==='en'?'s':'')+(typeof t==='function'?t('toast_generated'):' generated'),'ok');
}

function sCopy() {
  if(G('sOut').classList.contains('empty')){ toast(typeof t==='function'?t('toast_nothing_copy'):'Nothing to copy','err'); return; }
  safeClipboard(Array.from(G('sOut').querySelectorAll('.out-row-text')).map(function(el){ return el.textContent; }).join('\n')).then(function(){ toast('Copied!','ok'); }).catch(function(){ toast('Copy failed','err'); });
}
function sDl() {
  if(G('sOut').classList.contains('empty')){ toast(typeof t==='function'?t('toast_nothing_download'):'Nothing to download','err'); return; }
  dlText('vless_configs.txt', Array.from(G('sOut').querySelectorAll('.out-row-text')).map(function(el){ return el.textContent; }).join('\n'));
  toast('Downloading...','ok');
}
function sDlB64() {
  if(G('sOut').classList.contains('empty')){ toast(typeof t==='function'?t('toast_nothing_export'):'Nothing to export','err'); return; }
  dlText('vless_configs_b64.txt', toBase64(Array.from(G('sOut').querySelectorAll('.out-row-text')).map(function(el){ return el.textContent; }).join('\n')));
  toast('Base64 downloaded','ok');
}
function sQR() {
  if(G('sOut').classList.contains('empty')){ toast(typeof t==='function'?t('toast_generate_first'):'Generate first','err'); return; }
  G('sQrW').classList.toggle('open');
}
function clearSimple() {
  G('sUri').value=''; G('sEditor').style.display='none'; G('sStatus').textContent='';
  G('sOut').textContent=typeof t==='function'?t('output_empty'):'Your generated links will appear here.'; G('sOut').classList.add('empty');
  G('sBadge').textContent='0 '+(typeof t==='function'?t('dyn_links'):'links'); G('sStats').style.display='none'; G('sQrW').classList.remove('open');
  simType='tcp'; simHasEnc=false; sQrLinks=[]; sQrCur=0;
  toast(typeof t==='function'?t('toast_cleared'):'Cleared','ok');
}

// ── ADVANCED: Transport type ──────────────────────────────
function aType(type) {
  advType=type;
  document.querySelectorAll('.pill').forEach(function(p){ p.classList.toggle('active',p.textContent===type); });
  var showPath=['xhttp','ws','httpupgrade','splithttp'].indexOf(type)>-1;
  var showHost=['xhttp','ws','httpupgrade','splithttp','grpc'].indexOf(type)>-1;
  var showX=type==='xhttp'||type==='splithttp';
  G('a_xhttpF').style.display   = showX          ? '':'none';
  G('a_grpcF').style.display    = type==='grpc'  ? '':'none';
  G('a_pathRow').style.display  = showPath       ? '':'none';
  G('tf-a_path').style.display  = showPath       ? '':'none';
  G('a_hostRow').style.display  = showHost       ? '':'none';
  G('tf-a_host').style.display  = showHost       ? '':'none';
}

// ── ADVANCED: Generate ────────────────────────────────────
function advGen() {
  var uuid = G('a_uuid').value.trim();
  if(!uuid){ toast('UUID is required','err'); return; }
  if(!validateUUID('a_uuid')){ toast('Invalid UUID format','err'); return; }
  var portVal=parseInt(G('a_port').value.trim(),10);
  if(!portVal||portVal<1||portVal>65535){ toast('Port must be 1–65535','err'); return; }
  var port=String(portVal);
  var useIps=G('a_useIps').checked, useSnis=G('a_useSnis').checked;
  var ips=useIps?linesOfExpanded('a_ips'):[], snis=useSnis?linesOf('a_snis'):[];
  if(useIps&&ips.length===0){ toast('IPs list is empty','err'); return; }
  if(useSnis&&snis.length===0){ toast('SNI list is empty','err'); return; }
  var tpl      = G('a_prefix').value.trim();
  var prefixVal = G('a_prefix_val') ? G('a_prefix_val').value.trim() : '';
  var security = G('a_security').value;
  var fp       = G('a_fp').value;
  var alpn     = G('a_alpn').value;
  var insecure = G('a_insecure').checked;
  var useEnc   = G('a_encryption').checked;
  var host     = G('a_useHost').checked ? G('a_host').value.trim() : '';
  var path     = G('a_usePath').checked ? (G('a_path').value.trim()||'/') : '';
  var mode     = G('a_mode').value;
  var extra    = G('a_useExtra').checked ? G('a_extra').value.trim() : '';
  var grpc     = G('a_grpc').value.trim();
  var ipList   = ips.length ? ips : [''];
  var sniList  = snis.length ? snis : [''];
  // Warn before generating very large outputs — matrix mode can produce
  // thousands of links that slow down the browser's text rendering.
  var paired=G('a_pairMode').checked;
  var estimatedCount = paired ? Math.max(ipList.length, sniList.length) : ipList.filter(Boolean).length * sniList.length;
  if(estimatedCount > 50000) {
    toast((typeof t==='function'?t('toast_generating_too_many'):'Cannot generate more than 50,000 links at once — reduce your IP or SNI list.'), 'err');
    return;
  }
  if(estimatedCount > 15000) {
    if(!confirm(estimatedCount.toLocaleString() + (typeof t==='function'?t('dyn_confirm_large'):' links will be generated.\nThis may take a moment and use significant memory.\n\nContinue?'))) return;
  }
  var out=[],idx=1;
  if(paired && snis.some(function(s){ return s !== ''; })){
    ipList.forEach(function(ip,i){
      if(!ip) return;
      var addr=ip+':'+port;
      var sni=sniList[i%sniList.length]||'';
      var q=buildParams({useEnc:useEnc,security:security,sni:sni,fp:fp,alpn:alpn,insecure:insecure,type:advType,host:host,path:path,mode:mode,extra:extra,grpc:grpc});
      var remark=applyRemarkTpl(tpl,ip,sni,port,idx,prefixVal);
      out.push('vless://'+uuid+'@'+addr+'?'+q.join('&')+'#'+encodeURIComponent(remark));
      idx++;
    });
  } else {
    ipList.forEach(function(ip){
      if(!ip) return;
      var addr=ip+':'+port;
      sniList.forEach(function(sni){
        var q=buildParams({useEnc:useEnc,security:security,sni:sni,fp:fp,alpn:alpn,insecure:insecure,type:advType,host:host,path:path,mode:mode,extra:extra,grpc:grpc});
        var remark=applyRemarkTpl(tpl,ip,sni,port,idx,prefixVal);
        out.push('vless://'+uuid+'@'+addr+'?'+q.join('&')+'#'+encodeURIComponent(remark));
        idx++;
      });
    });
  }
  var txt=out.join('\n');
  G('aLinks').textContent=out.length;
  G('aIPs').textContent=ipList.filter(Boolean).length;
  G('aSNIs').textContent=sniList.filter(Boolean).length;
  aQrLinks=out; aQrCur=0; updateAQr();
  G('aQrW').classList.remove('open'); G('aQrBtn').textContent='⬛ QR';
  // Store canonical link list for filter/sort/shuffle; reset UI controls
  _advRawLinks = out.slice();
  _outRenderUnlocked = false; // reset "Show all" state for the new result set
  _resetAdvFilterSort();
  // Use renderAdvOut so dataset.plain is always set (required for Clash/Singbox/download/filter)
  renderAdvOut(out);
  hist.unshift({time:new Date().toLocaleTimeString(),count:out.length,first:out[0]||'',all:txt});
  if(hist.length>20) hist.pop();
  lsSet('bc_hist', hist);
  toast(out.length+' '+(typeof t==='function'?t('dyn_config'):'config')+(out.length!==1&&_currentLang==='en'?'s':'')+(typeof t==='function'?t('toast_generated'):' generated'),'ok');
}

function advQR(){ if(G('aOut').classList.contains('empty')){ toast(typeof t==='function'?t('toast_generate_first'):'Generate first','err'); return; } G('aQrW').classList.toggle('open'); G('aQrBtn').textContent=G('aQrW').classList.contains('open')?(typeof t==='function'?t('dyn_hide_qr'):'✕ Hide QR'):(typeof t==='function'?t('dyn_show_qr'):'⬛ QR'); }
function advCopyOut() {
  if(G('aOut').classList.contains('empty')){ toast('Nothing to copy','err'); return; }

  // Always use _advRawLinks — the canonical source (reflects shuffle/sort order).
  // Filter reduces to the visible subset when a filter query is active.
  var q = G('aOutFilter').value.trim().toLowerCase();
  var txt = q
    ? _advRawLinks.filter(function(l){ return l.toLowerCase().indexOf(q) > -1; }).join('\n')
    : _advRawLinks.join('\n');

  safeClipboard(txt)
    .then(function(){ toast('Copied!','ok'); })
    .catch(function(){ toast('Copy failed','err'); });
}
function advDl(){
  if(G('aOut').classList.contains('empty')){ toast('Nothing to download','err'); return; }
  var q = G('aOutFilter').value.trim().toLowerCase();
  var content = q
    ? _advRawLinks.filter(function(l){ return l.toLowerCase().indexOf(q) > -1; }).join('\n')
    : (G('aOut').dataset.plain || '');
  var isFiltered = q !== '';
  var filename = isFiltered ? 'vless_filtered.txt' : 'vless_configs.txt';
  var count = content.split('\n').filter(Boolean).length;
  dlText(filename, content);
  toast((typeof t==='function'?t('toast_downloaded'):'Downloaded') + ' ' + count + ' ' + (typeof t==='function'?t('dyn_link'):'link') + (count !== 1 && _currentLang === 'en' ? 's' : '') + (isFiltered ? (typeof t==='function'?t('dyn_filtered'):' (filtered)') : ''), 'ok');
}
// Download only what's currently visible — respects active filter/sort/shuffle
function advDlFiltered() {
  if(G('aOut').classList.contains('empty')){ toast('Nothing to download','err'); return; }
  
  var q = G('aOutFilter').value.trim().toLowerCase();
  var visible = _advRawLinks.filter(function(l){
    return q ? l.toLowerCase().indexOf(q) > -1 : true;
  });
  
  if(!visible.length){ toast('Nothing visible to download','err'); return; }
  var isFiltered = q !== '';
  var filename = isFiltered ? 'vless_filtered.txt' : 'vless_configs.txt';
  dlText(filename, visible.join('\n'));
  toast((typeof t==='function'?t('toast_downloaded'):'Downloaded') + ' ' + visible.length + ' ' + (typeof t==='function'?t('dyn_link'):'link') + (visible.length !== 1 && _currentLang === 'en' ? 's' : '') + (isFiltered ? (typeof t==='function'?t('dyn_filtered'):' (filtered)') : ''), 'ok');
}
function advDlB64(){
  if(G('aOut').classList.contains('empty')){ toast('Nothing to export','err'); return; }
  dlText('vless_configs_b64.txt', toBase64(G('aOut').dataset.plain || ''));
  toast('Base64 downloaded','ok');
}
function advDlJSON(){
  if(G('aOut').classList.contains('empty')){ toast('Nothing to export','err'); return; }
  var links = (G('aOut').dataset.plain || '').split('\n').filter(Boolean);
  var arr = links.map(function(l){
    try{
      var u=new URL(l.replace(/^vless:\/\//,'https://'));
      var p=new URLSearchParams(u.search);
      return { uuid:u.username, address:u.hostname, port:parseInt(u.port||'443', 10), security:p.get('security')||'tls', sni:p.get('sni')||'', fp:p.get('fp')||'', alpn:p.get('alpn')||'', type:p.get('type')||'tcp', host:p.get('host')||'', path:p.get('path')||'/', remark:decodeURIComponent(u.hash.slice(1)||''), raw:l };
    }catch(e){ return {raw:l}; }
  });
  dlText('vless_configs.json', JSON.stringify(arr,null,2));
  toast('JSON downloaded','ok');
}
function advClear(){
  ['a_uuid','a_ips','a_snis','a_host','a_prefix','a_prefix_val','a_grpc'].forEach(function(id){ var e=G(id); if(e) e.value=''; });
  G('a_port').value='443'; G('a_path').value='/'; G('a_extra').value='{"xPaddingBytes":"100-1000"}';
  G('aOut').textContent=typeof t==='function'?t('adv_output_empty'):'Nothing generated yet.'; G('aOut').classList.add('empty'); G('aOut').dataset.plain='';
  G('aBadge').textContent='0 '+(typeof t==='function'?t('dyn_links'):'links'); G('aLinks').textContent=G('aIPs').textContent=G('aSNIs').textContent='0';
  G('aQrW').classList.remove('open'); G('aQrBtn').textContent='⬛ QR';
  aQrLinks=[]; aQrCur=0;
  _advRawLinks=[]; _outRenderUnlocked=false; _resetAdvFilterSort();
  toast(typeof t==='function'?t('toast_cleared'):'Cleared','ok');
}

// ── ADVANCED: Parse ───────────────────────────────────────
function advParse(){
  var raw=G('impUri').value.trim();
  if(!raw){ toast(typeof t==='function'?t('toast_parse_uri_first'):'Paste a URI first','err'); return; }
  if(raw.length > 8000){ toast(typeof t==='function'?t('toast_input_too_large'):'Input too large to parse','err'); return; }
  if(!raw.startsWith('vless://')){ toast(typeof t==='function'?t('toast_must_start_vless'):'Must start with vless://','err'); return; }
  try{
    var u=new URL(raw.replace(/^vless:\/\//,'https://'));
    var p=new URLSearchParams(u.search);
    parsedD={ uuid:u.username||'', ip:u.hostname||'', port:u.port||'443', encryption:p.get('encryption')||'', security:p.get('security')||'tls', sni:p.get('sni')?decodeURIComponent(p.get('sni')):'', fp:p.get('fp')||'', alpn:p.get('alpn')?decodeURIComponent(p.get('alpn')):'', insecure:p.get('allowInsecure')||p.get('insecure')||'0', type:p.get('type')||'tcp', host:p.get('host')?decodeURIComponent(p.get('host')):'', path:p.get('path')?decodeURIComponent(p.get('path')):'/', mode:p.get('mode')||'', extra:p.get('extra')?decodeURIComponent(p.get('extra')):'', serviceName:p.get('serviceName')||'', remark:decodeURIComponent(u.hash.slice(1)||'') };
    var parseRows = G('parseRows');
    parseRows.textContent = '';
    var parseFrag = document.createDocumentFragment();
    Object.entries(parsedD).forEach(function(kv) {
      var row = document.createElement('div');
      row.className = 'parse-row';
      var keySpan = document.createElement('span');
      keySpan.className = 'parse-key';
      keySpan.textContent = kv[0];
      var valSpan = document.createElement('span');
      valSpan.className = 'parse-val';
      if(kv[1]) {
        valSpan.textContent = String(kv[1]);
      } else {
        valSpan.style.color = 'var(--muted)';
        valSpan.textContent = '—';
      }
      row.appendChild(keySpan);
      row.appendChild(valSpan);
      parseFrag.appendChild(row);
    });
    parseRows.appendChild(parseFrag);
    G('parsePrev').style.display='';
    toast(typeof t==='function'?t('toast_parsed_ok'):'Parsed successfully','ok');
  }catch(e){ toast(typeof t==='function'?t('toast_parse_failed'):'Failed to parse URI','err'); parsedD=null; }
}
function applyParsed(){
  if(!parsedD){ toast(typeof t==='function'?t('toast_nothing_parsed'):'Nothing parsed','err'); return; }
  G('a_uuid').value=parsedD.uuid; G('a_ips').value=parsedD.ip; G('a_port').value=parsedD.port;
  G('a_prefix').value=parsedD.remark||'';
  G('a_snis').value=parsedD.sni; G('a_host').value=parsedD.host; G('a_path').value=parsedD.path||'/';
  setOptVal(G('a_security'),parsedD.security||'tls'); setOptVal(G('a_fp'),parsedD.fp); setOptVal(G('a_alpn'),parsedD.alpn);
  G('a_insecure').checked=parsedD.insecure==='1'; G('a_encryption').checked=!!parsedD.encryption;
  var hasIp=!!parsedD.ip; G('a_useIps').checked=hasIp; G('tf-a_ips').classList.toggle('open',hasIp);
  var hasSni=!!parsedD.sni; G('a_useSnis').checked=hasSni; G('tf-a_snis').classList.toggle('open',hasSni);
  var hasHost=!!parsedD.host; G('a_useHost').checked=hasHost; G('tf-a_host').classList.toggle('open',hasHost);
  var hasPath=!!parsedD.path; G('a_usePath').checked=hasPath; G('tf-a_path').classList.toggle('open',hasPath);
  aType(parsedD.type||'tcp');
  if((parsedD.type==='xhttp'||parsedD.type==='splithttp')&&parsedD.mode) setOptVal(G('a_mode'),parsedD.mode);
  if(parsedD.extra){ G('a_extra').value=parsedD.extra; G('a_useExtra').checked=true; G('tf-a_extra').classList.add('open'); }
  if(parsedD.serviceName) G('a_grpc').value=parsedD.serviceName;
  advTab('gen');
  toast(typeof t==='function'?t('toast_applied'):'Applied — ready to generate','ok');
}

// ── History ───────────────────────────────────────────────
function renderHist(){
  var el=G('histList');
  el.textContent = '';
  if(!hist.length){
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--muted);padding:32px;font-size:13px;';
    empty.innerHTML = typeof t==='function'?t('dyn_no_history'):'No history yet. Generate some configs to see them here.';
    el.appendChild(empty);
    return;
  }
  var frag = document.createDocumentFragment();
  hist.forEach(function(h, i) {
    var item = document.createElement('div');
    item.className = 'hist-item';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    var firstLine = document.createElement('div');
    firstLine.style.cssText = 'font-size:11px;font-family:\'JetBrains Mono\',monospace;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    firstLine.textContent = h.first || '—';

    var meta = document.createElement('div');
    meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:3px;';
    meta.textContent = h.time + ' · ' + h.count + ' ' + (typeof t==='function'?t('dyn_link'):'link') + (h.count!==1&&_currentLang==='en'?'s':'');

    info.appendChild(firstLine);
    info.appendChild(meta);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'icn sm';
    copyBtn.textContent = '⎘';
    (function(idx){ copyBtn.addEventListener('click', function(){ copyH(idx); }); })(i);

    var loadBtn = document.createElement('button');
    loadBtn.className = 'icn sm';
    loadBtn.textContent = typeof t==='function'?t('dyn_load_btn'):'Load';
    (function(idx){ loadBtn.addEventListener('click', function(){ loadH(idx); }); })(i);

    item.appendChild(info);
    item.appendChild(copyBtn);
    item.appendChild(loadBtn);
    frag.appendChild(item);
  });
  el.appendChild(frag);
}
function copyH(i){ safeClipboard(hist[i].all||hist[i].first).then(function(){ toast('Copied','ok'); }).catch(function(){ toast('Failed','err'); }); }
function loadH(i) {
  var h = hist[i]; if(!h) return;
  var raw = h.all || h.first || '';
  if(!raw){ toast('History entry is empty','err'); return; }
  var links = raw.split('\n').filter(Boolean);
  _advRawLinks = links;
  _outRenderUnlocked = false; // reset render cap so large history entries don't freeze the browser
  renderAdvOut(links);
  _resetAdvFilterSort();
  var count = h.count || links.length;
  G('aBadge').textContent = count + ' ' + (typeof t==='function'?t('dyn_link'):'link') + (count !== 1 && _currentLang==='en' ? 's' : '');
  G('aLinks').textContent = count;
  G('aIPs').textContent   = '—';
  G('aSNIs').textContent  = '—';
  aQrLinks = links; aQrCur = 0; updateAQr();
  advTab('gen');
  toast('Loaded','ok');
}
function clearHist(){ hist=[]; lsSet('bc_hist',[]); renderHist(); toast('History cleared','ok'); }
function exportHist(){
  if(!hist.length){ toast('No history to export','err'); return; }
  dlText('vless_history.txt', hist.map(function(h){ return '# '+h.time+' ('+h.count+' links)\n'+h.all; }).join('\n\n'));
  toast('Exported','ok');
}

// ══════════════════════════════════════════════════════════
// PROFILES
// ══════════════════════════════════════════════════════════
function saveProfile(mode){
  _saveMode=mode;
  G('profileName').value='';
  G('profileModal').classList.add('open');
  setTimeout(function(){ G('profileName').focus(); },100);
}
function confirmSaveProfile(){
  var name=G('profileName').value.trim();
  if(!name){ toast('Enter a profile name','err'); return; }
  var profiles=lsGetArr('bc_profiles');
  var data = _saveMode==='simple' ? captureSimple() : captureAdvanced();
  data._mode=_saveMode;
  data._subUrl = G('profileSubUrl') ? G('profileSubUrl').value.trim() : '';
  var existing=profiles.findIndex(function(p){ return p.name===name; });
  if(existing>-1) profiles[existing]={name:name,data:data,time:new Date().toLocaleString(),subUrl:data._subUrl};
  else profiles.unshift({name:name,data:data,time:new Date().toLocaleString(),subUrl:data._subUrl});
  lsSet('bc_profiles',profiles);
  closeProfileModalDirect();
  toast('Profile "'+name+'" saved','ok');
  renderProfiles();
}
function captureSimple(){
  return { uuid:G('s_uuid').value, port:G('s_port').value, ips:G('s_ip').value, snis:G('s_sni').value, host:G('s_host').value, path:G('s_path').value, security:G('s_security').value, fp:G('s_fp').value, alpn:G('s_alpn').value, remark:G('s_remark').value, prefix:G('s_prefix')?G('s_prefix').value:'', insecure:G('s_insecure').checked, pairMode:G('s_pairMode').checked, simType:simType, simHasEnc:simHasEnc, mode:G('s_mode')?G('s_mode').value:'auto', extra:G('s_extra')?G('s_extra').value:'', grpc:G('s_grpc')?G('s_grpc').value:'' };
}
function captureAdvanced(){
  return { uuid:G('a_uuid').value, port:G('a_port').value, ips:G('a_ips').value, snis:G('a_snis').value, host:G('a_host').value, path:G('a_path').value, security:G('a_security').value, fp:G('a_fp').value, alpn:G('a_alpn').value, prefix:G('a_prefix').value, prefixVal:G('a_prefix_val')?G('a_prefix_val').value:'', insecure:G('a_insecure').checked, pairMode:G('a_pairMode').checked, type:advType, useIps:G('a_useIps').checked, useSnis:G('a_useSnis').checked, useHost:G('a_useHost').checked, usePath:G('a_usePath').checked, useExtra:G('a_useExtra').checked, extra:G('a_extra').value, grpc:G('a_grpc').value, encryption:G('a_encryption').checked, mode:G('a_mode').value };
}
function renderProfiles(){
  var profiles=lsGetArr('bc_profiles');
  var el=G('profileList');
  var searchEl=G('profileSearch');
  var q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  var filtered = q ? profiles.filter(function(p){ return p.name.toLowerCase().indexOf(q) > -1; }) : profiles;
  el.textContent = '';
  if(!profiles.length){
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--muted);padding:32px;font-size:13px;';
    empty.innerHTML = typeof t==='function'?t('dyn_no_profiles'):'No profiles saved yet. Hit 💾 Save Profile in the Generate tab.';
    el.appendChild(empty);
    return;
  }
  if(!filtered.length){
    var noMatch = document.createElement('div');
    noMatch.style.cssText = 'text-align:center;color:var(--muted);padding:20px;font-size:13px;';
    noMatch.textContent = (typeof t==='function'?t('dyn_no_profiles_match'):'No profiles match') + ' "' + q + '"';
    el.appendChild(noMatch);
    return;
  }
  var frag = document.createDocumentFragment();
  filtered.forEach(function(p) {
    var realIdx = profiles.indexOf(p);
    var pinned = p.pinned;
    var hasSubUrl = !!(p.subUrl || (p.data && p.data._subUrl));

    var item = document.createElement('div');
    item.className = 'hist-item';
    if(pinned) item.style.borderColor = 'rgba(0,245,255,0.3)';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    var nameRow = document.createElement('div');
    nameRow.style.cssText = 'font-size:12px;font-weight:700;color:var(--text);';
    if(pinned) nameRow.appendChild(document.createTextNode('📌 '));
    nameRow.appendChild(document.createTextNode(p.name));
    if(hasSubUrl) {
      var subBadge = document.createElement('span');
      subBadge.style.cssText = 'font-size:9px;color:var(--accent);background:rgba(0,245,255,0.1);padding:1px 5px;border-radius:4px;margin-left:4px;';
      subBadge.textContent = (typeof t==='function'?t('dyn_sub_label'):'SUB');
      nameRow.appendChild(subBadge);
    }

    var meta = document.createElement('div');
    meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
    meta.textContent = p.time + ' · ' + ((p.data&&p.data._mode)||'simple') + ' mode';

    info.appendChild(nameRow);
    info.appendChild(meta);
    item.appendChild(info);

    if(hasSubUrl) {
      var refreshBtn = document.createElement('button');
      refreshBtn.className = 'icn sm';
      refreshBtn.title = 'Refresh subscription';
      refreshBtn.textContent = '🔄';
      (function(idx){ refreshBtn.addEventListener('click', function(){ refreshProfileSub(idx); }); })(realIdx);
      item.appendChild(refreshBtn);
    }

    var pinBtn = document.createElement('button');
    pinBtn.className = 'icn sm';
    pinBtn.title = pinned ? (typeof t==='function'?t('dyn_unpin_title'):'Unpin') : (typeof t==='function'?t('dyn_pin_title'):'Pin');
    pinBtn.textContent = pinned ? '📌' : '📎';
    (function(idx){ pinBtn.addEventListener('click', function(){ togglePin(idx); }); })(realIdx);

    var loadBtn = document.createElement('button');
    loadBtn.className = 'icn sm';
    loadBtn.textContent = typeof t==='function'?t('dyn_load_btn'):'Load';
    (function(idx){ loadBtn.addEventListener('click', function(){ loadProfile(idx); }); })(realIdx);

    var delBtn = document.createElement('button');
    delBtn.className = 'icn sm';
    delBtn.style.color = 'var(--red)';
    delBtn.textContent = '✕';
    (function(idx){ delBtn.addEventListener('click', function(){ deleteProfile(idx); }); })(realIdx);

    item.appendChild(pinBtn);
    item.appendChild(loadBtn);
    item.appendChild(delBtn);
    frag.appendChild(item);
  });
  el.appendChild(frag);
}

function togglePin(i){
  var profiles=lsGetArr('bc_profiles');
  if(!profiles[i]) return;
  profiles[i].pinned = !profiles[i].pinned;
  var nowPinned = profiles[i].pinned;
  // sort pinned to top — stable sort by name within each group
  profiles.sort(function(a,b){
    var ap = a.pinned ? 1 : 0, bp = b.pinned ? 1 : 0;
    return bp - ap;
  });
  lsSet('bc_profiles',profiles);
  renderProfiles();
  toast(nowPinned ? (typeof t==='function'?t('toast_pinned'):'Pinned') : (typeof t==='function'?t('toast_unpinned'):'Unpinned'),'ok');
}
function loadProfile(i){
  var profiles=lsGetArr('bc_profiles');
  var p=profiles[i]; if(!p) return;
  var d=p.data;
  if(d._mode==='simple'){
    setMode('simple');
    G('s_uuid').value=d.uuid||''; G('s_port').value=d.port||'443';
    G('s_ip').value=d.ips||''; G('s_sni').value=d.snis||'';
    G('s_host').value=d.host||''; G('s_path').value=d.path||'/';
    setOptVal(G('s_security'),d.security||'tls'); setOptVal(G('s_fp'),d.fp||''); setOptVal(G('s_alpn'),d.alpn||'');
    G('s_remark').value=d.remark||'';
    if(G('s_prefix')) G('s_prefix').value=d.prefix||'';
    G('s_insecure').checked=!!d.insecure; G('s_pairMode').checked=!!d.pairMode;
    togglePairHint('s_pairMode','s_pairHint','OFF — every IP × every SNI (full matrix)');
    // Restore transport type and transport-specific fields
    simType = d.simType || 'tcp';
    simHasEnc = !!d.simHasEnc;
    var isX = simType==='xhttp'||simType==='splithttp';
    if(G('sw_mode'))  G('sw_mode').style.display  = isX ? '' : 'none';
    if(G('sw_extra')) G('sw_extra').style.display = isX ? '' : 'none';
    if(G('sw_grpc'))  G('sw_grpc').style.display  = simType==='grpc' ? '' : 'none';
    if(isX && G('s_mode'))  setOptVal(G('s_mode'), d.mode||'auto');
    if(isX && G('s_extra')) G('s_extra').value = d.extra||'';
    if(simType==='grpc' && G('s_grpc')) G('s_grpc').value = d.grpc||'';
    if(G('sTypeBadge')) G('sTypeBadge').textContent = simType.toUpperCase()+(typeof t==='function'?t('dyn_transport_badge'):' transport');
    G('sEditor').style.display='';
    simpleLiveCount();
  } else {
    setMode('advanced');
    G('a_uuid').value=d.uuid||''; G('a_port').value=d.port||'443';
    G('a_ips').value=d.ips||''; G('a_snis').value=d.snis||'';
    G('a_host').value=d.host||''; G('a_path').value=d.path||'/';
    setOptVal(G('a_security'),d.security||'tls'); setOptVal(G('a_fp'),d.fp||''); setOptVal(G('a_alpn'),d.alpn||'');
    G('a_prefix').value=d.prefix||''; if(G('a_prefix_val')) G('a_prefix_val').value=d.prefixVal||''; G('a_insecure').checked=!!d.insecure; G('a_pairMode').checked=!!d.pairMode;
    togglePairHint('a_pairMode','a_pairHint');
    if(d.type) aType(d.type);
    G('a_useIps').checked=d.useIps!==false; togPanel('a_ips',G('a_useIps'));
    G('a_useSnis').checked=d.useSnis!==false; togPanel('a_snis',G('a_useSnis'));
    // Restore additional advanced fields
    G('a_useHost').checked=d.useHost!==false; togPanel('a_host',G('a_useHost'));
    G('a_usePath').checked=d.usePath!==false; togPanel('a_path',G('a_usePath'));
    G('a_encryption').checked=!!d.encryption;
    if(G('a_extra')) G('a_extra').value=d.extra||'{"xPaddingBytes":"100-1000"}';
    if(G('a_useExtra')){ G('a_useExtra').checked=d.useExtra!==false; togPanel('a_extra',G('a_useExtra')); }
    if(G('a_grpc')) G('a_grpc').value=d.grpc||'';
    if(d.mode && G('a_mode')) setOptVal(G('a_mode'),d.mode);
    liveCount();
  }
  navTab('gen');
  toast('Profile "'+p.name+'" loaded','ok');
}
function deleteProfile(i){
  var profiles=lsGetArr('bc_profiles');
  profiles.splice(i,1);
  lsSet('bc_profiles',profiles);
  renderProfiles();
  toast('Profile deleted','ok');
}
function clearAllProfiles(){
  lsSet('bc_profiles',[]);
  renderProfiles();
  toast('All profiles cleared','ok');
}
function closeProfileModal(e){ if(e.target===G('profileModal')) closeProfileModalDirect(); }
function closeProfileModalDirect(){ G('profileModal').classList.remove('open'); G('profileName').value=''; if(G('profileSubUrl')) G('profileSubUrl').value=''; }

async function refreshProfileSub(i) {
  var profiles = lsGetArr('bc_profiles');
  var p = profiles[i]; if(!p) return;
  var url = p.subUrl || (p.data && p.data._subUrl) || '';
  if(!url){ toast('No subscription URL saved for this profile','err'); return; }
  toast('Refreshing subscription...','ok');

  var controller = new AbortController();
  var tid = setTimeout(function(){ controller.abort(); }, 15000);

  try {
    var res = await safeFetch(url, { signal: controller.signal });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    var text = (await res.text()).trim();
    var links = [];
    try { var decoded = fromBase64(text); links = decoded.split('\n').map(function(x){return x.trim();}).filter(function(x){return x.startsWith('vless://');});} catch(e){}
    if(!links.length) links = text.split('\n').map(function(x){return x.trim();}).filter(function(x){return x.startsWith('vless://');});
    if(!links.length){ toast('No vless:// links found in subscription','err'); return; }
    var existing = G('bulkInput').value.trim();
    var existingLinks = existing ? existing.split('\n').map(function(x){return x.trim();}).filter(Boolean) : [];
    var existingSet = {};
    existingLinks.forEach(function(l){ existingSet[l.replace(/#[^#]*$/, '')] = true; });
    var newLinks = links.filter(function(l){ return !existingSet[l.replace(/#[^#]*$/, '')]; });
    G('bulkInput').value = existingLinks.concat(newLinks).join('\n');
    navTab('bulk');
    bulkSwitchTab('links');
    toast('✓ ' + newLinks.length + ' new links added (' + (links.length - newLinks.length) + ' duplicates skipped)', 'ok');
  } catch(e) {
    var msg = e.name === 'AbortError' ? 'Timed out after 15s' : e.message;
    toast('Refresh failed: ' + msg, 'err');
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
  lsSet('bc_uuids',uuids);
  renderUUIDs();
  toast('UUID added','ok');
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
  if(!val){ toast('Enter a UUID','err'); return; }
  if(!UUID_RE.test(val)){ toast('Invalid UUID format','err'); return; }
  var name=G('customUUIDName').value.trim()||'Custom UUID';
  var uuids=lsGetArr('bc_uuids');
  if(uuids.find(function(u){ return u.uuid===val; })){ toast('UUID already saved','err'); return; }
  uuids.unshift({uuid:val,name:name});
  lsSet('bc_uuids',uuids);
  G('customUUIDInput').value='';
  G('customUUIDName').value='';
  G('customUUIDRow').style.display='none';
  renderUUIDs();
  toast('Custom UUID added','ok');
}
function renderUUIDs(){
  var uuids=lsGetArr('bc_uuids');
  var el=G('uuidList');
  el.textContent = '';
  if(!uuids.length){
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--muted);padding:32px;font-size:13px;';
    empty.textContent = typeof t==='function'?t('dyn_no_uuids'):'No UUIDs saved. Click "+ Generate & Add".';
    el.appendChild(empty);
    return;
  }
  var frag = document.createDocumentFragment();
  uuids.forEach(function(u, i) {
    var item = document.createElement('div');
    item.className = 'hist-item';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    var nameInput = document.createElement('input');
    nameInput.style.cssText = 'background:transparent;border:none;color:var(--text);font-size:11px;font-family:\'JetBrains Mono\',monospace;width:100%;padding:0;';
    nameInput.value = u.name;
    nameInput.placeholder = 'Nickname';
    (function(idx){ nameInput.addEventListener('change', function(){ renameUUID(idx, this.value); }); })(i);

    var uuidLine = document.createElement('div');
    uuidLine.style.cssText = 'font-size:10px;color:var(--accent);margin-top:2px;word-break:break-all;';
    uuidLine.textContent = u.uuid;

    info.appendChild(nameInput);
    info.appendChild(uuidLine);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'icn sm';
    copyBtn.textContent = '⎘';
    (function(uuid){ copyBtn.addEventListener('click', function(){ copyUUIDItem(uuid); }); })(u.uuid);

    var delBtn = document.createElement('button');
    delBtn.className = 'icn sm';
    delBtn.style.color = 'var(--red)';
    delBtn.textContent = '✕';
    (function(idx){ delBtn.addEventListener('click', function(){ deleteUUID(idx); }); })(i);

    item.appendChild(info);
    item.appendChild(copyBtn);
    item.appendChild(delBtn);
    frag.appendChild(item);
  });
  el.appendChild(frag);
}
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function renameUUID(i,name){
  var uuids=lsGetArr('bc_uuids');
  if(uuids[i]) uuids[i].name=name;
  lsSet('bc_uuids',uuids);
}
function deleteUUID(i){
  var uuids=lsGetArr('bc_uuids');
  uuids.splice(i,1);
  lsSet('bc_uuids',uuids);
  renderUUIDs();
  toast('UUID deleted','ok');
}
function copyUUIDItem(uuid){
  safeClipboard(uuid).then(function(){ toast('Copied','ok'); }).catch(function(){ toast('Failed','err'); });
}
function pickUUID(targetId){
  _uuidTarget=targetId;
  var uuids=lsGetArr('bc_uuids');
  var el=G('uuidPickList');
  if(!uuids.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'color:var(--muted);text-align:center;padding:20px;font-size:12px;';
    empty.innerHTML = typeof t==='function'?t('dyn_no_saved_uuids'):'No saved UUIDs. Add some in the 🗄 Saved Data tab.';
    el.appendChild(empty);
  } else {
    var frag = document.createDocumentFragment();
    uuids.forEach(function(u) {
      var item = document.createElement('div');
      item.className = 'hist-item';
      item.style.cursor = 'pointer';
      (function(uuid){ item.addEventListener('click', function(){ selectUUID(uuid); }); })(u.uuid);

      var inner = document.createElement('div');
      var nameLine = document.createElement('div');
      nameLine.style.cssText = 'font-size:12px;font-weight:700;color:var(--text);';
      nameLine.textContent = u.name;
      var uuidLine = document.createElement('div');
      uuidLine.style.cssText = 'font-size:10px;color:var(--accent);margin-top:2px;';
      uuidLine.textContent = u.uuid;
      inner.appendChild(nameLine);
      inner.appendChild(uuidLine);
      item.appendChild(inner);
      frag.appendChild(item);
    });
    el.appendChild(frag);
  }
  G('uuidModal').classList.add('open');
}
function selectUUID(uuid){
  if(_uuidTarget){ G(_uuidTarget).value=uuid; G(_uuidTarget).classList.remove('invalid'); }
  closeUUIDModalDirect();
  toast('UUID applied','ok');
}
function closeUUIDModal(e){ if(e.target===G('uuidModal')) closeUUIDModalDirect(); }
function closeUUIDModalDirect(){ G('uuidModal').classList.remove('open'); _uuidTarget=null; }

// ══════════════════════════════════════════════════════════
// SAVED DATA TAB — sub-tab switcher
// ══════════════════════════════════════════════════════════
function savedDataTab(name) {
  ['uuids','ips','snis'].forEach(function(n) {
    var panel = G('sdp-'+n);
    if(panel) panel.classList.toggle('active', n===name);
  });
  var tabs = document.querySelectorAll('#savedDataTabs .tab2');
  tabs.forEach(function(t) {
    var m = (t.getAttribute('onclick')||'').match(/savedDataTab\('(\w+)'\)/);
    t.classList.toggle('active', !!(m && m[1]===name));
  });
  if(name==='ips')   renderIPLists();
  if(name==='snis')  renderSNILists();
  if(name==='uuids') renderUUIDs();
}

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
  if(!name) { toast('Enter a label for this IP list','err'); return; }
  if(!ips)  { toast('Enter at least one IP / host','err'); return; }
  var lists = lsGetArr('bc_iplists');
  var existing = lists.findIndex(function(l){ return l.name===name; });
  var entry = { name:name, ips:ips, time:new Date().toLocaleString() };
  if(existing > -1) lists[existing] = entry;
  else lists.unshift(entry);
  lsSet('bc_iplists', lists);
  G('ipListName').value=''; G('ipListInput').value='';
  G('addIPListRow').style.display='none';
  renderIPLists();
  toast('IP list "'+name+'" saved','ok');
}

function renderIPLists() {
  var lists = lsGetArr('bc_iplists');
  var el = G('ipSavedList');
  if(!el) return;
  el.textContent = '';
  if(!lists.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--muted);padding:32px;font-size:13px;';
    empty.innerHTML = typeof t==='function'?t('dyn_no_ip_lists'):'No IP lists saved. Use ★ Save IPs next to any IP field, or click ✎ Add New above.';
    el.appendChild(empty);
    return;
  }
  var frag = document.createDocumentFragment();
  lists.forEach(function(l, i) {
    var preview = l.ips.split('\n').slice(0,3).join(', ') + (l.ips.split('\n').length > 3 ? '…' : '');
    var count   = l.ips.split('\n').filter(function(x){ return x.trim(); }).length;

    var item = document.createElement('div');
    item.className = 'hist-item';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    var nameLine = document.createElement('div');
    nameLine.style.cssText = 'font-size:12px;font-weight:700;color:var(--text);';
    nameLine.textContent = l.name;

    var metaLine = document.createElement('div');
    metaLine.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
    metaLine.textContent = l.time + ' · ' + count + ' entr' + (count!==1?'ies':'y');

    var previewLine = document.createElement('div');
    previewLine.style.cssText = 'font-size:10px;color:var(--accent);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    previewLine.textContent = preview;

    info.appendChild(nameLine);
    info.appendChild(metaLine);
    info.appendChild(previewLine);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'icn sm';
    copyBtn.title = 'Copy IPs';
    copyBtn.textContent = '⎘';
    (function(idx){ copyBtn.addEventListener('click', function(){ copyIPListItem(idx); }); })(i);

    var delBtn = document.createElement('button');
    delBtn.className = 'icn sm';
    delBtn.title = 'Delete';
    delBtn.style.color = 'var(--red)';
    delBtn.textContent = '✕';
    (function(idx){ delBtn.addEventListener('click', function(){ deleteIPList(idx); }); })(i);

    item.appendChild(info);
    item.appendChild(copyBtn);
    item.appendChild(delBtn);
    frag.appendChild(item);
  });
  el.appendChild(frag);
}

function deleteIPList(i) {
  var lists = lsGetArr('bc_iplists');
  lists.splice(i,1);
  lsSet('bc_iplists',lists);
  renderIPLists();
  toast('IP list deleted','ok');
}

function copyIPListItem(i) {
  var lists = lsGetArr('bc_iplists');
  if(!lists[i]) return;
  safeClipboard(lists[i].ips).then(function(){ toast('Copied','ok'); }).catch(function(){ toast('Failed','err'); });
}

// Save IPs from a textarea field into the saved lists
function saveIPList(fieldId) {
  var val = G(fieldId) ? G(fieldId).value.trim() : '';
  if(!val) { toast('IP field is empty — nothing to save','err'); return; }
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
  el.textContent = '';
  if(!lists.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'color:var(--muted);text-align:center;padding:20px;font-size:12px;';
    empty.innerHTML = typeof t==='function'?t('dyn_no_saved_ips'):'No saved IP lists. Use ★ Save IPs to save one, or go to the 🗄 Saved Data tab.';
    el.appendChild(empty);
  } else {
    var frag = document.createDocumentFragment();
    lists.forEach(function(l, i) {
      var count = l.ips.split('\n').filter(function(x){ return x.trim(); }).length;
      var item = document.createElement('div');
      item.className = 'hist-item';
      item.style.cursor = 'pointer';
      (function(idx){ item.addEventListener('click', function(){ selectIPList(idx); }); })(i);

      var inner = document.createElement('div');
      var nameLine = document.createElement('div');
      nameLine.style.cssText = 'font-size:12px;font-weight:700;color:var(--text);';
      nameLine.textContent = l.name;
      var metaLine = document.createElement('div');
      metaLine.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
      metaLine.textContent = count + ' entr' + (count!==1?'ies':'y') + ' · ' + l.time;
      inner.appendChild(nameLine);
      inner.appendChild(metaLine);
      item.appendChild(inner);
      frag.appendChild(item);
    });
    el.appendChild(frag);
  }
  G('ipModal').classList.add('open');
}

function selectIPList(i) {
  var lists = lsGetArr('bc_iplists');
  if(!lists[i]) return;
  if(_ipTarget && G(_ipTarget)) {
    G(_ipTarget).value = lists[i].ips;
    // Trigger live count update for whichever field was targeted
    if(_ipTarget === 's_ip') simpleLiveCount();
    else if(_ipTarget === 'a_ips') liveCount();
  }
  closeIPModalDirect();
  toast('IP list "'+lists[i].name+'" loaded','ok');
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
  if(!name) { toast('Enter a label for this SNI list','err'); return; }
  if(!snis) { toast('Enter at least one SNI','err'); return; }
  var lists = lsGetArr('bc_snilists');
  var existing = lists.findIndex(function(l){ return l.name===name; });
  var entry = { name:name, snis:snis, time:new Date().toLocaleString() };
  if(existing > -1) lists[existing] = entry;
  else lists.unshift(entry);
  lsSet('bc_snilists', lists);
  G('sniListName').value=''; G('sniListInput').value='';
  G('addSNIListRow').style.display='none';
  renderSNILists();
  toast('SNI list "'+name+'" saved','ok');
}

function renderSNILists() {
  var lists = lsGetArr('bc_snilists');
  var el = G('sniSavedList');
  if(!el) return;
  el.textContent = '';
  if(!lists.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--muted);padding:32px;font-size:13px;';
    empty.innerHTML = typeof t==='function'?t('dyn_no_sni_lists'):'No SNI lists saved. Use ★ Save SNIs next to any SNI field, or click ✎ Add New above.';
    el.appendChild(empty);
    return;
  }
  var frag = document.createDocumentFragment();
  lists.forEach(function(l, i) {
    var preview = l.snis.split('\n').slice(0,3).join(', ') + (l.snis.split('\n').length > 3 ? '…' : '');
    var count   = l.snis.split('\n').filter(function(x){ return x.trim(); }).length;

    var item = document.createElement('div');
    item.className = 'hist-item';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    var nameLine = document.createElement('div');
    nameLine.style.cssText = 'font-size:12px;font-weight:700;color:var(--text);';
    nameLine.textContent = l.name;

    var metaLine = document.createElement('div');
    metaLine.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
    metaLine.textContent = l.time + ' · ' + count + ' SNI' + (count!==1?'s':'');

    var previewLine = document.createElement('div');
    previewLine.style.cssText = 'font-size:10px;color:var(--accent);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    previewLine.textContent = preview;

    info.appendChild(nameLine);
    info.appendChild(metaLine);
    info.appendChild(previewLine);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'icn sm';
    copyBtn.title = 'Copy SNIs';
    copyBtn.textContent = '⎘';
    (function(idx){ copyBtn.addEventListener('click', function(){ copySNIListItem(idx); }); })(i);

    var delBtn = document.createElement('button');
    delBtn.className = 'icn sm';
    delBtn.title = 'Delete';
    delBtn.style.color = 'var(--red)';
    delBtn.textContent = '✕';
    (function(idx){ delBtn.addEventListener('click', function(){ deleteSNIList(idx); }); })(i);

    item.appendChild(info);
    item.appendChild(copyBtn);
    item.appendChild(delBtn);
    frag.appendChild(item);
  });
  el.appendChild(frag);
}

function deleteSNIList(i) {
  var lists = lsGetArr('bc_snilists');
  lists.splice(i,1);
  lsSet('bc_snilists',lists);
  renderSNILists();
  toast('SNI list deleted','ok');
}

function copySNIListItem(i) {
  var lists = lsGetArr('bc_snilists');
  if(!lists[i]) return;
  safeClipboard(lists[i].snis).then(function(){ toast('Copied','ok'); }).catch(function(){ toast('Failed','err'); });
}

// Save SNIs from a textarea field into the saved lists
function saveSNIList(fieldId) {
  var val = G(fieldId) ? G(fieldId).value.trim() : '';
  if(!val) { toast('SNI field is empty — nothing to save','err'); return; }
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
  el.textContent = '';
  if(!lists.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'color:var(--muted);text-align:center;padding:20px;font-size:12px;';
    empty.innerHTML = typeof t==='function'?t('dyn_no_saved_snis'):'No saved SNI lists. Use ★ Save SNIs to save one, or go to the 🗄 Saved Data tab.';
    el.appendChild(empty);
  } else {
    var frag = document.createDocumentFragment();
    lists.forEach(function(l, i) {
      var count = l.snis.split('\n').filter(function(x){ return x.trim(); }).length;
      var item = document.createElement('div');
      item.className = 'hist-item';
      item.style.cursor = 'pointer';
      (function(idx){ item.addEventListener('click', function(){ selectSNIList(idx); }); })(i);

      var inner = document.createElement('div');
      var nameLine = document.createElement('div');
      nameLine.style.cssText = 'font-size:12px;font-weight:700;color:var(--text);';
      nameLine.textContent = l.name;
      var metaLine = document.createElement('div');
      metaLine.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
      metaLine.textContent = count + ' SNI' + (count!==1?'s':'') + ' · ' + l.time;
      inner.appendChild(nameLine);
      inner.appendChild(metaLine);
      item.appendChild(inner);
      frag.appendChild(item);
    });
    el.appendChild(frag);
  }
  G('sniModal').classList.add('open');
}

function selectSNIList(i) {
  var lists = lsGetArr('bc_snilists');
  if(!lists[i]) return;
  if(_sniTarget && G(_sniTarget)) {
    G(_sniTarget).value = lists[i].snis;
    // Trigger live count update for whichever field was targeted
    if(_sniTarget === 's_sni') simpleLiveCount();
    else if(_sniTarget === 'a_snis') liveCount();
  }
  closeSNIModalDirect();
  toast('SNI list "'+lists[i].name+'" loaded','ok');
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
    if(!raw){ toast('Paste a base64 string first','err'); return; }
    var prevLen = G('bulkInput').value.trim().length;
    decodeSub(); // synchronous — writes to bulkInput and toasts on error
    if(G('bulkInput').value.trim().length === prevLen){ return; } // decode added nothing
  }

  var _bulkRaw = G('bulkInput').value;
  if(_bulkRaw.length > 5_000_000) { toast('Input too large — max 5 MB', 'err'); return; }
  var lines=_bulkRaw.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
  if(!lines.length){ toast('No valid vless:// links found — decode or paste links first','err'); return; }
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
  toast(unique.length+(typeof t==='function'?t('toast_unique_removed'):' unique links, ')+dupes+(typeof t==='function'?t('toast_removed_suffix'):' removed'),'ok');
}
function bulkClear(){ G('bulkInput').value=''; G('bulkOut').textContent=''; G('bulkStats').style.display='none'; G('bulkResultCard').style.display='none'; }
function bulkCopy(){ safeClipboard(G('bulkOut').textContent).then(function(){ toast('Copied','ok'); }).catch(function(){ toast('Copy failed','err'); }); }
function bulkDl(){ dlText('vless_dedup.txt',G('bulkOut').textContent); toast('Downloaded','ok'); }
function bulkDlB64(){ dlText('vless_dedup_b64.txt', toBase64(G('bulkOut').textContent)); toast('Base64 downloaded','ok'); }

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

  if(!raw){ _validatorNotice('Paste a vless:// link first.'); return; }
  if(!raw.startsWith('vless://')){ _validatorNotice('✕ Must start with vless://'); return; }

  var checks = [];
  var parsed = null;

  function check(label, pass, detail, critical) {
    checks.push({ label: label, pass: pass, detail: detail || '', critical: !!critical });
  }

  try {
    var u = new URL(raw.replace(/^vless:\/\//, 'https://'));
    var p = new URLSearchParams(u.search);
    parsed = {
      uuid: u.username, host: u.hostname, port: u.port || '443',
      security: p.get('security') || 'tls', sni: p.get('sni') || '',
      fp: p.get('fp') || '', alpn: p.get('alpn') || '',
      type: p.get('type') || 'tcp', path: p.get('path') || '/',
      remark: decodeURIComponent(u.hash.slice(1) || ''),
      insecure: (p.get('allowInsecure') || p.get('insecure')) === '1'
    };
  } catch(e) {
    _validatorNotice('✕ Failed to parse URI — malformed link');
    return;
  }

  // UUID
  check('UUID format', UUID_RE.test(parsed.uuid), parsed.uuid || '(empty)', true);
  // Host
  check('Host / IP present', !!parsed.host, parsed.host || '(empty)', true);
  // Port
  var portNum = parseInt(parsed.port, 10);
  check('Port valid (1–65535)', portNum >= 1 && portNum <= 65535, 'port: ' + parsed.port, true);
  // Security
  var knownSecurity = ['tls', 'reality', 'none'];
  check('Security field known', knownSecurity.indexOf(parsed.security) > -1, parsed.security);
  // SNI for TLS
  if(parsed.security === 'tls' || parsed.security === 'reality') {
    check('SNI present (TLS/Reality)', !!parsed.sni, parsed.sni || '⚠ Missing — may cause TLS failure');
  }
  // Fingerprint
  var knownFps = ['chrome','firefox','safari','edge','ios','android','random',''];
  check('Fingerprint known', knownFps.indexOf(parsed.fp) > -1, parsed.fp || '(none)');
  // Insecure warning
  if(parsed.insecure) {
    check('Allow-insecure OFF', false, '⚠ allowInsecure=1 — TLS cert not verified');
  } else {
    check('Allow-insecure OFF', true, 'Certificate verification enabled');
  }
  // Transport
  var knownTypes = ['tcp','ws','xhttp','splithttp','httpupgrade','grpc','h2','http'];
  check('Transport type known', knownTypes.indexOf(parsed.type) > -1, parsed.type);
  // Path for non-TCP transports
  if(['ws','xhttp','splithttp','httpupgrade'].indexOf(parsed.type) > -1) {
    check('Path set', !!parsed.path && parsed.path !== '', parsed.path || '(empty)');
  }
  // Remark
  check('Has remark', !!parsed.remark, parsed.remark || '(none — links will be unnamed)');

  // Render checks via DOM — no innerHTML
  var passed = checks.filter(function(c){ return c.pass; }).length;
  var failed = checks.filter(function(c){ return !c.pass; }).length;
  var critical = checks.filter(function(c){ return !c.pass && c.critical; }).length;
  var score = Math.round((passed / checks.length) * 100);
  var scoreColor = score >= 90 ? 'var(--green)' : score >= 60 ? '#f59e0b' : 'var(--red)';

  // Build score header
  var frag = document.createDocumentFragment();

  var scoreHeader = document.createElement('div');
  scoreHeader.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:8px;';

  var scoreNum = document.createElement('div');
  scoreNum.style.cssText = 'font-size:28px;font-weight:800;font-family:\'JetBrains Mono\',monospace;';
  scoreNum.style.color = scoreColor;
  scoreNum.textContent = String(score);

  var scoreInfo = document.createElement('div');
  var scoreTitle = document.createElement('div');
  scoreTitle.style.cssText = 'font-size:11px;font-weight:700;color:var(--text);';
  scoreTitle.textContent = critical > 0
    ? (typeof t==='function'?t('dyn_critical_issues'):'✕ Critical issues found')
    : failed > 0
      ? (typeof t==='function'?t('dyn_minor_issues'):'⚠ Minor issues')
      : (typeof t==='function'?t('dyn_config_looks_good'):'✓ Config looks good');
  var scoreMeta = document.createElement('div');
  scoreMeta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
  scoreMeta.textContent = passed + (typeof t==='function'?t('dyn_passed'):' passed · ') + failed + (typeof t==='function'?t('dyn_failed'):' failed');
  scoreInfo.appendChild(scoreTitle);
  scoreInfo.appendChild(scoreMeta);
  scoreHeader.appendChild(scoreNum);
  scoreHeader.appendChild(scoreInfo);
  frag.appendChild(scoreHeader);

  // Build check rows
  checks.forEach(function(c) {
    var icon = c.pass ? '✓' : (c.critical ? '✕' : '⚠');
    var color = c.pass ? 'var(--green)' : (c.critical ? 'var(--red)' : '#f59e0b');

    var row = document.createElement('div');
    row.className = 'parse-row';
    if(!c.pass) row.style.cssText = 'background:rgba(244,63,94,0.05);border-radius:6px;padding:5px 8px;';

    var iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-weight:700;min-width:16px;';
    iconSpan.style.color = color;
    iconSpan.textContent = icon;

    var labelSpan = document.createElement('span');
    labelSpan.className = 'parse-key';
    if(!c.pass) labelSpan.style.color = color;
    labelSpan.textContent = c.label;

    var detailSpan = document.createElement('span');
    detailSpan.className = 'parse-val';
    detailSpan.style.cssText = 'font-size:10px;color:var(--muted);';
    detailSpan.textContent = c.detail;

    row.appendChild(iconSpan);
    row.appendChild(labelSpan);
    row.appendChild(detailSpan);
    frag.appendChild(row);
  });

  // TCPing placeholder row
  var pingRow = null, pingVal = null;
  if(doPing) {
    pingRow = document.createElement('div');
    pingRow.id = 'validatorPingRow';
    pingRow.className = 'parse-row';
    pingRow.style.cssText = 'margin-top:6px;background:rgba(0,0,0,0.15);border-radius:6px;padding:5px 8px;';

    var pingIcon = document.createElement('span');
    pingIcon.style.color = 'var(--muted)';
    pingIcon.textContent = '⏳';

    var pingLabel = document.createElement('span');
    pingLabel.className = 'parse-key';
    pingLabel.textContent = 'TCPing ' + parsed.host + ':' + parsed.port;

    pingVal = document.createElement('span');
    pingVal.id = 'validatorPingVal';
    pingVal.className = 'parse-val';
    pingVal.style.cssText = 'font-size:10px;color:var(--muted);';
    pingVal.textContent = 'testing...';

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
        pv.style.color = res.ms < 150 ? 'var(--green)' : '#f59e0b';
        pr.querySelector('span').textContent = '✓';
        pr.querySelector('span').style.color = 'var(--green)';
      } else {
        pv.textContent = 'Unreachable / timeout';
        pv.style.color = 'var(--red)';
        pr.querySelector('span').textContent = '✕';
        pr.querySelector('span').style.color = 'var(--red)';
      }
    }
  }
}

// Config Diff
function parseLink(raw){
  if(!raw||!raw.startsWith('vless://')) return null;
  try{
    var u=new URL(raw.replace(/^vless:\/\//,'https://'));
    var p=new URLSearchParams(u.search);
    return { uuid:u.username, address:u.hostname, port:u.port||'443', security:p.get('security')||'tls', sni:p.get('sni')||'', fp:p.get('fp')||'', alpn:p.get('alpn')||'', type:p.get('type')||'tcp', host:p.get('host')||'', path:p.get('path')||'/', mode:p.get('mode')||'', insecure:p.get('allowInsecure')||p.get('insecure')||'0', encryption:p.get('encryption')||'', remark:decodeURIComponent(u.hash.slice(1)||'') };
  }catch(e){ return null; }
}
function runDiff(){
  var a=parseLink(G('diffA').value.trim()), b=parseLink(G('diffB').value.trim());
  if(!a||!b){ toast('Both links must be valid vless:// URIs','err'); return; }
  var keys=Object.keys(a);
  var diffCount=keys.filter(function(k){ return (a[k]||'—')!==(b[k]||'—'); }).length;
  var diffFrag = document.createDocumentFragment();

  var notice = document.createElement('div');
  notice.className = 'notice';
  notice.style.marginBottom = '10px';
  if(diffCount) {
    notice.textContent = '⚠ ' + diffCount + (typeof t==='function'?(diffCount!==1?t('dyn_fields_differ_plural'):t('dyn_fields_differ')):(diffCount!==1?' fields':' field')) + (typeof t==='function'?t('dyn_differ_suffix'):' differ');
  } else {
    notice.style.cssText = 'margin-bottom:10px;background:rgba(34,197,94,0.06);border-color:rgba(34,197,94,0.2);color:rgba(34,197,94,0.8);';
    notice.textContent = typeof t==='function'?t('dyn_links_identical'):'✓ Links are identical';
  }
  diffFrag.appendChild(notice);

  keys.forEach(function(k) {
    var va = a[k]||'—', vb = b[k]||'—';
    var diff = va !== vb;

    var row = document.createElement('div');
    row.className = 'parse-row';
    if(diff) row.style.cssText = 'background:rgba(244,63,94,0.06);border-radius:6px;padding:5px 8px;';

    var keySpan = document.createElement('span');
    keySpan.className = 'parse-key';
    if(diff) keySpan.style.color = 'var(--red)';
    keySpan.textContent = k;
    row.appendChild(keySpan);

    if(diff) {
      var valSpan = document.createElement('span');
      valSpan.style.cssText = 'flex:1;color:var(--red);word-break:break-all;';
      valSpan.textContent = va + ' → ' + vb;
      row.appendChild(valSpan);
    } else {
      var valSpan = document.createElement('span');
      valSpan.className = 'parse-val';
      valSpan.textContent = va;
      row.appendChild(valSpan);
    }
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
  if(!txt){ toast('Nothing to encode','err'); return; }
  G('b64Output').value=toBase64(txt);
  toast('Encoded','ok');
}
function doDecode(){
  var txt=G('b64Input').value.trim();
  if(!txt){ toast('Nothing to decode','err'); return; }
  try{ G('b64Output').value=fromBase64(txt); toast('Decoded','ok'); }
  catch(e){ toast('Invalid Base64','err'); }
}
function copyB64Out(){ safeClipboard(G('b64Output').value).then(function(){ toast('Copied','ok'); }).catch(function(){ toast('Copy failed','err'); }); }

// Remark renamer
function runRenamer(){
  var lines=G('remarkInput').value.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
  if(!lines.length){ toast('No valid vless:// links found','err'); return; }
  var tpl=G('remarkTpl').value.trim()||'{prefix}_{ip}_{idx}';
  var prefix=G('remarkPrefix').value.trim()||'Config';
  var out=lines.map(function(l,i){
    try{
      var u=new URL(l.replace(/^vless:\/\//,'https://'));
      var p=new URLSearchParams(u.search);
      var ip=u.hostname, sni=p.get('sni')||'', port=u.port||'443';
      var remark=applyRemarkTpl(tpl,ip,sni,port,i+1,prefix);
      return l.replace(/#[^#]*$/, '')+'#'+encodeURIComponent(remark);
    }catch(e){ return l; }
  });
  G('remarkOutput').value=out.join('\n');
  toast(out.length+(typeof t==='function'?t('toast_links_renamed'):' links renamed'),'ok');
}
function copyRenameOut(){ safeClipboard(G('remarkOutput').value).then(function(){ toast('Copied','ok'); }).catch(function(){ toast('Copy failed','err'); }); }
function dlRenameOut(){ dlText('vless_renamed.txt',G('remarkOutput').value); toast('Downloaded','ok'); }

// ── Save-List Modal (replaces prompt() — works on Android) ──────
let _pendingSaveField = null;
let _pendingSaveType  = null; // 'ip' | 'sni'

function confirmSaveList() {
  var name = G('saveListLabelInput').value.trim();
  if(!name) { toast('Enter a label','err'); return; }
  var fieldId = _pendingSaveField;
  var type    = _pendingSaveType;
  closeSaveListModal();
  if(!fieldId || !type) return;
  var val = G(fieldId) ? G(fieldId).value.trim() : '';
  if(!val) { toast('Field is empty','err'); return; }
  if(type === 'ip') {
    var lists = lsGetArr('bc_iplists');
    var existing = lists.findIndex(function(l){ return l.name===name; });
    var entry = { name:name, ips:val, time:new Date().toLocaleString() };
    if(existing > -1) lists[existing] = entry; else lists.unshift(entry);
    lsSet('bc_iplists',lists);
    toast('IP list "'+name+'" saved','ok');
  } else {
    var lists2 = lsGetArr('bc_snilists');
    var existing2 = lists2.findIndex(function(l){ return l.name===name; });
    var entry2 = { name:name, snis:val, time:new Date().toLocaleString() };
    if(existing2 > -1) lists2[existing2] = entry2; else lists2.unshift(entry2);
    lsSet('bc_snilists',lists2);
    toast('SNI list "'+name+'" saved','ok');
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
function advDlClash() {
  if(G('aOut').classList.contains('empty')){ toast('Nothing to export','err'); return; }
  var links = (G('aOut').dataset.plain || '').split('\n').filter(Boolean);
  var proxies = links.map(function(l, i) {
    try {
      var u = new URL(l.replace(/^vless:\/\//, 'https://'));
      var p = new URLSearchParams(u.search);
      var name = decodeURIComponent(u.hash.slice(1) || ('VLESS-' + (i+1)));
      var obj = {
        name: name,
        type: 'vless',
        server: u.hostname,
        port: parseInt(u.port || '443', 10),
        uuid: u.username,
        tls: (p.get('security') || 'tls') !== 'none',
        'skip-cert-verify': (p.get('allowInsecure') || p.get('insecure')) === '1',
        servername: p.get('sni') || '',
        network: p.get('type') || 'tcp',
        'client-fingerprint': p.get('fp') || 'chrome'
      };
      var net = p.get('type') || 'tcp';
      if(net === 'ws') {
        obj['ws-opts'] = {
          path: p.get('path') || '/',
          headers: { Host: p.get('host') || '' }
        };
      } else if(net === 'httpupgrade') {
        obj['httpupgrade-opts'] = {
          path: p.get('path') || '/',
          host: p.get('host') || ''
        };
      } else if(net === 'splithttp' || net === 'xhttp') {
        obj['splithttp-opts'] = {
          path: p.get('path') || '/',
          headers: { Host: p.get('host') || '' }
        };
      }
      if(net === 'grpc') obj['grpc-opts'] = { 'grpc-service-name': p.get('serviceName') || '' };
      var alpn = p.get('alpn') ? decodeURIComponent(p.get('alpn')).split(',') : [];
      if(alpn.length) obj.alpn = alpn;
      return obj;
    } catch(e) { return null; }
  }).filter(Boolean);

  var names = proxies.map(function(p){ return p.name; });
  var yaml = '# Trace — Clash Meta config\n# Generated: ' + new Date().toLocaleString() + '\n\nproxies:\n';
  yaml += proxies.map(function(pr) {
    var lines = ['  - name: "' + pr.name + '"',
      '    type: ' + pr.type,
      '    server: ' + pr.server,
      '    port: ' + pr.port,
      '    uuid: ' + pr.uuid,
      '    tls: ' + pr.tls,
      '    skip-cert-verify: ' + pr['skip-cert-verify']];
    if(pr.servername) lines.push('    servername: ' + pr.servername);
    lines.push('    network: ' + pr.network);
    if(pr['client-fingerprint']) lines.push('    client-fingerprint: ' + pr['client-fingerprint']);
    if(pr['ws-opts']) {
      lines.push('    ws-opts:');
      lines.push('      path: "' + pr['ws-opts'].path + '"');
      if(pr['ws-opts'].headers.Host) lines.push('      headers:\n        Host: ' + pr['ws-opts'].headers.Host);
    }
    if(pr['httpupgrade-opts']) {
      lines.push('    httpupgrade-opts:');
      lines.push('      path: "' + pr['httpupgrade-opts'].path + '"');
      if(pr['httpupgrade-opts'].host) lines.push('      host: ' + pr['httpupgrade-opts'].host);
    }
    if(pr['splithttp-opts']) {
      lines.push('    splithttp-opts:');
      lines.push('      path: "' + pr['splithttp-opts'].path + '"');
      if(pr['splithttp-opts'].headers && pr['splithttp-opts'].headers.Host) lines.push('      headers:\n        Host: ' + pr['splithttp-opts'].headers.Host);
    }
    if(pr['grpc-opts']) lines.push('    grpc-opts:\n      grpc-service-name: "' + pr['grpc-opts']['grpc-service-name'] + '"');
    if(pr.alpn && pr.alpn.length) lines.push('    alpn: [' + pr.alpn.join(', ') + ']');
    return lines.join('\n');
  }).join('\n\n');

  yaml += '\n\nproxy-groups:\n  - name: "Trace"\n    type: select\n    proxies:\n      - DIRECT\n';
  yaml += names.map(function(n){ return '      - "' + n + '"'; }).join('\n');
  yaml += '\n\nrules:\n  - MATCH,Trace\n';

  dlText('clash_config.yaml', yaml);
  toast('Clash YAML downloaded', 'ok');
}

// ══════════════════════════════════════════════════════════
// SING-BOX EXPORT
// ══════════════════════════════════════════════════════════
function advDlSingbox() {
  if(G('aOut').classList.contains('empty')){ toast('Nothing to export','err'); return; }
  var links = (G('aOut').dataset.plain || '').split('\n').filter(Boolean);
  var outbounds = links.map(function(l, i) {
    try {
      var u = new URL(l.replace(/^vless:\/\//, 'https://'));
      var p = new URLSearchParams(u.search);
      var tag = decodeURIComponent(u.hash.slice(1) || ('vless-' + (i+1)));
      var net = p.get('type') || 'tcp';
      var sec = p.get('security') || 'tls';
      var obj = {
        type: 'vless',
        tag: tag,
        server: u.hostname,
        server_port: parseInt(u.port || '443', 10),
        uuid: u.username,
        packet_encoding: 'xudp'
      };
      if(sec !== 'none') {
        obj.tls = {
          enabled: true,
          insecure: (p.get('allowInsecure') || p.get('insecure')) === '1',
          server_name: p.get('sni') || ''
        };
        var fp = p.get('fp');
        if(fp) obj.tls.utls = { enabled: true, fingerprint: fp };
        var alpn = p.get('alpn') ? decodeURIComponent(p.get('alpn')).split(',') : [];
        if(alpn.length) obj.tls.alpn = alpn;
      }
      if(net === 'ws') {
        obj.transport = { type: 'ws', path: p.get('path') || '/', headers: { Host: p.get('host') || '' } };
      } else if(net === 'grpc') {
        obj.transport = { type: 'grpc', service_name: p.get('serviceName') || '' };
      } else if(net === 'httpupgrade' || net === 'splithttp' || net === 'xhttp') {
        obj.transport = { type: 'http', path: p.get('path') || '/', headers: { Host: [p.get('host') || ''] } };
      }
      return obj;
    } catch(e) { return null; }
  }).filter(Boolean);

  var tags = outbounds.map(function(o){ return o.tag; });
  var config = {
    log: { level: 'info', timestamp: true },
    dns: { servers: [{ address: 'https://1.1.1.1/dns-query', strategy: 'prefer_ipv4' }] },
    inbounds: [
      { type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 2080 }
    ],
    outbounds: outbounds.concat([
      { type: 'selector', tag: 'select', outbounds: ['auto'].concat(tags) },
      { type: 'urltest', tag: 'auto', outbounds: tags, url: 'https://www.gstatic.com/generate_204', interval: '3m' },
      { type: 'direct', tag: 'direct' },
      { type: 'block', tag: 'block' }
    ]),
    route: { rules: [{ outbound: 'direct', geoip: ['private'] }], final: 'select' }
  };

  dlText('singbox_config.json', JSON.stringify(config, null, 2));
  toast('Sing-box config downloaded', 'ok');
}

// ══════════════════════════════════════════════════════════
// BULK TAB SWITCHER
// ══════════════════════════════════════════════════════════
function bulkSwitchTab(name) {
  ['links','b64','url'].forEach(function(n){
    G('bt-'+n).classList.toggle('active', n===name);
    G('bp-'+n).classList.toggle('active', n===name);
  });
}

// ══════════════════════════════════════════════════════════
// SUBSCRIPTION IMPORT — Base64 decode → move to links tab
// ══════════════════════════════════════════════════════════
function decodeSub() {
  var raw = G('subInput').value.trim();
  if(!raw){ toast('Paste a base64 string first', 'err'); return; }
  try {
    var decoded = fromBase64(raw);
    var links = decoded.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
    if(!links.length){ toast('No vless:// links found in decoded content', 'err'); return; }
    var existing = G('bulkInput').value.trim();
    G('bulkInput').value = (existing ? existing + '\n' : '') + links.join('\n');
    bulkSwitchTab('links');
    toast('Added ' + links.length + ' links to Links tab', 'ok');
  } catch(e) {
    toast('Failed to decode — is this valid base64?', 'err');
  }
}

// ══════════════════════════════════════════════════════════
// SUBSCRIPTION URL FETCH
// ══════════════════════════════════════════════════════════
async function fetchSubUrl() {
  var url = G('subUrlInput').value.trim();
  if(!url){ toast('Enter a subscription URL', 'err'); return; }
  var statusEl = G('subUrlStatus');
  var btn = G('fetchSubBtn');
  btn.textContent = typeof t==='function'?t('toast_fetching'):'⏳ Fetching...';
  btn.disabled = true;
  statusEl.textContent = typeof t==='function'?t('dyn_fetching_sub_status'):'Fetching subscription...';
  statusEl.style.color = 'var(--muted)';

  var controller = new AbortController();
  var tid = setTimeout(function(){ controller.abort(); }, 15000);

  try {
    var res = await safeFetch(url, { signal: controller.signal });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    var text = await res.text();
    text = text.trim();
    if(text.length > 2_000_000) {
      statusEl.textContent = '✕ Response too large (max 2 MB)';
      statusEl.style.color = 'var(--red)';
      toast('Subscription response too large', 'err');
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
    if(!links.length){ statusEl.textContent = '✕ No vless:// links found in response'; statusEl.style.color='var(--red)'; return; }
    var existing = G('bulkInput').value.trim();
    var existingLinks2 = existing ? existing.split('\n').map(function(x){return x.trim();}).filter(Boolean) : [];
    var existingSet2 = {};
    existingLinks2.forEach(function(l){ existingSet2[l.replace(/#[^#]*$/, '')] = true; });
    var newLinks2 = links.filter(function(l){ return !existingSet2[l.replace(/#[^#]*$/, '')]; });
    G('bulkInput').value = existingLinks2.concat(newLinks2).join('\n');
    bulkSwitchTab('links');
    statusEl.textContent = '✓ Loaded ' + newLinks2.length + ' new links (' + (links.length - newLinks2.length) + ' duplicates skipped)';
    statusEl.style.color = 'var(--green)';
    toast('Fetched ' + links.length + ' links', 'ok');
  } catch(e) {
    var msg = e.name === 'AbortError' ? 'Timed out after 15s' : e.message;
    statusEl.textContent = '✕ Fetch failed: ' + msg;
    statusEl.style.color = 'var(--red)';
    toast('Fetch failed', 'err');
  } finally {
    clearTimeout(tid);
    btn.textContent = typeof t==='function'?t('toast_fetch_decode_btn'):'🌐 Fetch & Decode';
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
let _simpleLiveCountTimer = null;

function liveCount() {
  clearTimeout(_liveCountTimer);
  _liveCountTimer = setTimeout(_liveCountNow, 120);
}
function _liveCountNow() {
  var ips  = G('a_ips')  ? linesOfExpanded('a_ips').length  : 0;  // ← was linesOf
  var snis = G('a_snis') ? linesOf('a_snis').length : 0;
  var el = G('a_liveCount');
  if(!el) return;
  if(!ips && !snis) { el.textContent = ''; return; }
  var paired = G('a_pairMode') && G('a_pairMode').checked;
  var total = paired ? Math.max(ips, snis) : (ips || 1) * (snis || 1);
  el.textContent = ips + (typeof t==='function'?t('dyn_ips_x_snis'):' IPs × ') + (snis || 1) + (typeof t==='function'?t('dyn_snis_eq'):' SNIs = ') + total + ' ' + (typeof t==='function'?t('dyn_link'):'link') + (total !== 1&&_currentLang==='en' ? 's' : '') + (paired ? (typeof t==='function'?t('dyn_paired'):' (paired)') : '');
}

function simpleLiveCount() {
  clearTimeout(_simpleLiveCountTimer);
  _simpleLiveCountTimer = setTimeout(_simpleLiveCountNow, 120);
}
function _simpleLiveCountNow() {
  var ips = G('s_ip') ? linesOfExpanded('s_ip').length : 0;
  var snis = G('s_sni') ? linesOf('s_sni').length : 0;
  var el = G('s_liveCount');
  if(!el) return;
  if(!ips && !snis) { el.textContent = ''; return; }
  var paired = G('s_pairMode') && G('s_pairMode').checked;
  var total = paired ? Math.max(ips, snis) : (ips || 1) * (snis || 1);
  el.textContent = ips + (typeof t==='function'?t('dyn_ips_x_snis'):' IPs × ') + (snis || 1) + (typeof t==='function'?t('dyn_snis_eq'):' SNIs = ') + total + ' ' + (typeof t==='function'?t('dyn_link'):'link') + (total !== 1&&_currentLang==='en' ? 's' : '') + (paired ? (typeof t==='function'?t('dyn_paired'):' (paired)') : '');
}

// ════════════════════════════════════════════════════════
// PROFILE SEARCH, EXPORT & IMPORT
// ══════════════════════════════════════════════════════════
function exportProfilesJSON() {
  var profiles = lsGetArr('bc_profiles');
  if(!profiles.length){ toast('No profiles to export', 'err'); return; }
  dlText('trace_profiles.json', JSON.stringify(profiles, null, 2));
  toast('Profiles exported', 'ok');
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
      if(!valid.length) { toast('No valid profile entries found in file', 'err'); input.value = ''; return; }
      var existing = lsGetArr('bc_profiles');
      var merged = valid.concat(existing);
      // dedupe by name, imported wins
      var seen = {};
      merged = merged.filter(function(p) {
        if(seen[p.name]) return false;
        seen[p.name] = true;
        return true;
      });
      lsSet('bc_profiles', merged);
      renderProfiles();
      toast('Imported ' + valid.length + ' profile(s)' + (valid.length < imported.length ? ' (' + (imported.length - valid.length) + ' invalid skipped)' : ''), 'ok');
    } catch(ex) {
      toast('Invalid profiles file', 'err');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════
document.addEventListener('keydown', function(e) {
  if(e.ctrlKey && e.key === 'Enter') {
    // Ctrl+Enter = generate in current mode
    // Use getComputedStyle so we don't rely on inline style being set
    var inSimple = G('pSimple') && getComputedStyle(G('pSimple')).display !== 'none';
    var inAdv    = G('pAdv') && getComputedStyle(G('pAdv')).display !== 'none';
    if(inSimple) { e.preventDefault(); simpleRegen(); }
    else if(inAdv) { e.preventDefault(); advGen(); }
  }
  if(e.key === 'Escape') {
    // Escape closes any open modal
    if(G('uuidModal').classList.contains('open')) closeUUIDModalDirect();
    if(G('profileModal').classList.contains('open')) closeProfileModalDirect();
    if(G('ipModal') && G('ipModal').classList.contains('open')) closeIPModalDirect();
    if(G('sniModal') && G('sniModal').classList.contains('open')) closeSNIModalDirect();
  }
});

// ══════════════════════════════════════════════════════════
// DARK / LIGHT THEME
// ══════════════════════════════════════════════════════════
function toggleTheme() {
  var isLight = document.body.classList.toggle('light');
  G('themeToggle').textContent = isLight ? '🌙' : '☀';
  lsSet('bc_theme', isLight ? 'light' : 'dark');
}

// Apply saved theme immediately on load (runs when script loads, body already exists)
(function initTheme() {
  var saved = lsGet('bc_theme');
  if(saved === 'light') {
    document.body.classList.add('light');
    // Set icon immediately to avoid flash — button already exists in DOM at this point
    var btn = G('themeToggle');
    if(btn) btn.textContent = '🌙';
  }
})();
// Ensure theme button icon is correct after full load (catches any edge cases)
window.addEventListener('load', function() {
  var btn = G('themeToggle');
  if(btn) btn.textContent = document.body.classList.contains('light') ? '🌙' : '☀';
});

// ══════════════════════════════════════════════════════════
// PORT PRESETS
// ══════════════════════════════════════════════════════════
function setPort(p) {
  var el = G('a_port');
  if(el) { el.value = p; liveCount(); toast('Port set to ' + p, 'ok'); }
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
  if(!_advRawLinks.length) { toast('Generate first', 'err'); return; }
  var arr = _advRawLinks.slice();
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; }
  // Shuffle mutates the canonical list so subsequent filter/sort work on shuffled order
  _advRawLinks = arr;
  // Reset sort dropdown so it doesn't imply a sorted order
  var s = G('aOutSort'); if(s) s.value = '';
  renderAdvOut(arr);
  toast('Shuffled!', 'ok');
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
    aOut.textContent = '';
    aOut.classList.add('empty');
    G('aBadge').textContent = '0 '+(typeof t==='function'?t('dyn_links'):'links');
    return;
  }
  aOut.classList.remove('empty');
  G('aBadge').textContent = arr.length + ' ' + (typeof t==='function'?t('dyn_link'):'link') + (arr.length !== 1&&_currentLang==='en' ? 's' : '');

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
    row.title = 'Click to copy this link';
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
    cap.style.cssText = 'text-align:center;padding:12px 0;color:var(--muted);font-size:11px;border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;';
    var capText = document.createTextNode(
      (typeof t==='function'?t('dyn_show_first'):'Showing first ') + _OUT_RENDER_LIMIT +
      (typeof t==='function'?t('dyn_of_links'):' of ') + arr.length +
      (typeof t==='function'?t('dyn_links_dot'):' links · ')
    );
    cap.appendChild(capText);
    var showAllBtn = document.createElement('span');
    showAllBtn.style.cssText = 'color:var(--accent);cursor:pointer;';
    showAllBtn.textContent = typeof t==='function'?t('dyn_show_all'):'Show all (may be slow)';
    showAllBtn.addEventListener('click', renderAdvOutFull);
    cap.appendChild(showAllBtn);
    var capText2 = document.createTextNode(typeof t==='function'?t('dyn_use_dl'):' · Use ↓ TXT to get the full list');
    cap.appendChild(capText2);
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
    toast('Copied!', 'ok');
  }).catch(function(){ toast('Copy failed','err'); });
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
// back to a WebSocket probe which gets us to the TCP layer before
// the WS handshake fails, giving a good RTT approximation.
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
  if(!hosts.length) { toast('Add hosts to test', 'err'); return; }
  var port    = parseInt(G('pingPort').value) || 443;
  var timeout = parseInt(G('pingTimeout').value) || 5000;
  var repeat  = parseInt(G('pingRepeat') ? G('pingRepeat').value : '3') || 3;

  _pinging = true;
  G('pingBtn').textContent = typeof t==='function'?t('dyn_testing'):'⏳ Testing...';
  G('pingBtn').disabled = true;
  var el = G('pingResults');
  el.textContent = '';
  var progEl = document.createElement('div');
  progEl.className = 'ping-progress';
  progEl.id = 'pingProg';
  progEl.textContent = 'Testing 0 / ' + hosts.length + '...';
  el.appendChild(progEl);

  var results = new Array(hosts.length).fill(null);
  var completed = 0;
  var CONCURRENCY = 8;

  // Run hosts in parallel batches of CONCURRENCY
  async function pingWorker(idx) {
    var prog = G('pingProg');
    if(prog) prog.textContent = 'TCPing ' + (completed+1) + ' / ' + hosts.length + ' — ' + hosts[idx] + ':' + port;
    var res = await tcpingHost(hosts[idx], port, timeout, repeat);
    results[idx] = res;
    completed++;
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
    toast('TCPing done — ' + ok + '/' + hosts.length + ' reachable', 'ok');
  } finally {
    G('pingBtn').textContent = typeof t==='function'?t('dyn_tcping_all_btn'):'⚡ TCPing All';
    G('pingBtn').disabled = false;
    _pinging = false;
    var prog2 = G('pingProg'); if(prog2) prog2.remove();
  }
}

// TCPing a host:port N times and return average RTT.
// Mirrors v2rayN's GetTcpingTime: measure TCP SYN-ACK round-trip.
async function tcpingHost(host, port, timeout, repeat) {
  var times = [];
  for(var i = 0; i < repeat; i++) {
    var ms = await tcpingOnce(host, port, timeout);
    if(ms === null) {
      // Probe failed — skip this sample and keep trying the remaining repeats.
      // We no longer bail on the first attempt: transient network blips (common
      // on mobile / VPN) would wrongly mark a reachable host as unreachable.
      continue;
    }
    times.push(ms);
  }
  if(!times.length) return { host: host, ok: false, ms: 0, timedOut: true };
  var avg = Math.round(times.reduce(function(a,b){ return a+b; },0) / times.length);
  var min = Math.min.apply(null, times);
  return { host: host, ok: true, ms: avg, min: min, times: times };
}

// Single TCP connect attempt. Returns RTT in ms or null on failure.
async function tcpingOnce(host, port, timeout) {
  // ── SSRF guard — must run before BOTH the Tauri path and the WS fallback ──
  if(_isBlockedHost(host)) {
    console.warn('tcpingOnce: blocked private/loopback host', host);
    return null;
  }
  // ── Tauri path: call Rust tcping command (real TCP socket) ──
  // Uses _tauriInvoke cached at startup (handles both Tauri v1 and v2).
  if(_tauriInvoke) {
    try {
      var ms = await _tauriInvoke('tcping', { host: host, port: port, timeoutMs: timeout });
      return typeof ms === 'number' ? ms : null;
    } catch(e) {
      // Command failed — fall through to WebSocket probe
    }
  }

  // ── Fallback: WebSocket probe (browser / dev mode) ──
  // Opening a WebSocket reaches the TCP layer before the WS handshake.
  // The server will refuse/close the WS but we've already measured TCP RTT.
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
      // Full Cloudflare TLS port list: 443, 2053, 2082, 2083, 2087, 2095, 2096, 8443
      var _tlsPort = (port === 443 || port === 8443 || port === 2053 || port === 2082 || port === 2083 || port === 2087 || port === 2095 || port === 2096);
      ws = new WebSocket((_tlsPort ? 'wss' : 'ws') + '://' + host + ':' + port);
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
      resolve(Date.now() - start);
    };

    // onerror fires when TCP connects but WS/TLS is rejected.
    // We still record the elapsed time as an RTT approximation, but only if
    // enough time has passed to rule out:
    //  - Local refusals (< 5 ms): connection refused before hitting the network
    //  - Fast TLS cert errors (< 50 ms): browser rejects cert client-side
    //    without a real round-trip, producing a falsely low/fast RTT.
    // Using 50 ms as the lower bound keeps legitimate fast connections (e.g.
    // LAN) while discarding local-only errors.
    ws.onerror = function() {
      if(done) return;
      done = true;
      clearTimeout(tid);
      var elapsed = Date.now() - start;
      resolve(elapsed >= 50 ? elapsed : null);
    };

    // onclose after error — ignore, already resolved
    ws.onclose = function() {};
  });
}

function renderPingResults(results) {
  var el = G('pingResults');
  var prog = G('pingProg');
  var frag = document.createDocumentFragment();
  if(prog) frag.appendChild(prog.cloneNode(true));
  results.forEach(function(r) {
    var row = document.createElement('div');
    row.className = 'ping-row';

    var hostSpan = document.createElement('span');
    hostSpan.className = 'ping-host';
    hostSpan.textContent = r.host;
    row.appendChild(hostSpan);

    var msSpan = document.createElement('span');
    if(r.ok) {
      msSpan.className = 'ping-ms ' + (r.ms < 150 ? 'ping-ok' : r.ms < 400 ? 'ping-slow' : 'ping-bad');
      msSpan.textContent = r.ms + ' ms avg';
      if(r.times && r.times.length > 1) {
        var sub = document.createElement('span');
        sub.style.cssText = 'color:var(--muted);font-size:10px;';
        sub.textContent = ' (' + r.times.join('/') + ' ms)';
        msSpan.appendChild(sub);
      }
    } else {
      msSpan.className = 'ping-ms ping-err';
      msSpan.textContent = r.timedOut ? (typeof t==='function'?t('dyn_timeout_label'):'Timeout') : (typeof t==='function'?t('dyn_unreachable'):'Unreachable');
    }
    row.appendChild(msSpan);
    frag.appendChild(row);
  });
  el.textContent = '';
  el.appendChild(frag);
}
function clearPing() {
  G('pingInput').value = '';
  G('pingResults').textContent = '';
  toast('Cleared', 'ok');
}

// ══════════════════════════════════════════════════════════
// CONFIG TCPING — Test vless:// links by their server:port
// Mirrors v2rayN Ctrl+O (TCPing per config)
// ══════════════════════════════════════════════════════════
let _cfgPinging = false;
let _cfgPingResults = []; // store last results for export

async function runCfgPing() {
  if(_cfgPinging) return;
  if(G('cfgPingInput').value.length > 2_000_000) { toast('Input too large — max 2 MB', 'err'); return; }
  var raw = G('cfgPingInput').value.split('\n').map(function(x){ return x.trim(); }).filter(function(x){ return x.startsWith('vless://'); });
  if(!raw.length){ toast('Paste vless:// links first','err'); return; }

  var timeout = parseInt(G('cfgPingTimeout').value) || 5000;
  var repeat  = parseInt(G('cfgPingRepeat').value) || 3;
  var sortByMs = G('cfgPingSortByMs').checked;

  // Parse each link into { remark, host, port, raw }
  var configs = raw.map(function(link) {
    try {
      var u = new URL(link.replace(/^vless:\/\//, 'https://'));
      var remark = decodeURIComponent(u.hash.slice(1) || '') || (u.hostname + ':' + (u.port || '443'));
      return { remark: remark, host: u.hostname, port: parseInt(u.port || '443', 10), raw: link };
    } catch(e) { return null; }
  }).filter(Boolean);

  if(!configs.length){ toast('No valid vless:// links found','err'); return; }

  _cfgPinging = true;
  _cfgPingResults = [];
  G('cfgPingBtn').textContent = typeof t==='function'?t('dyn_testing'):'⏳ Testing...';
  G('cfgPingBtn').disabled = true;
  var cfgEl0 = G('cfgPingResults');
  cfgEl0.textContent = '';
  var cfgProgEl = document.createElement('div');
  cfgProgEl.className = 'ping-progress';
  cfgProgEl.id = 'cfgPingProg';
  cfgProgEl.textContent = 'Testing 0 / ' + configs.length + '...';
  cfgEl0.appendChild(cfgProgEl);

  var CFG_CONCURRENCY = 8;
  var cfgCompleted = 0;
  var cfgResultsArr = new Array(configs.length).fill(null);

  async function cfgPingWorker(ci) {
    var cfg = configs[ci];
    var prog = G('cfgPingProg');
    if(prog) prog.textContent = 'TCPing ' + (cfgCompleted+1) + '/' + configs.length + ' — ' + cfg.remark;
    var res = await tcpingHost(cfg.host, cfg.port, timeout, repeat);
    cfgResultsArr[ci] = {
      remark: cfg.remark, host: cfg.host, port: cfg.port, raw: cfg.raw,
      ok: res.ok, ms: res.ms, min: res.min || res.ms,
      times: res.times || [], timedOut: res.timedOut || false
    };
    cfgCompleted++;
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
    toast('Done — ' + ok + '/' + configs.length + ' reachable', 'ok');
    // Final render with sort applied
    renderCfgPingResults(sortByMs);
  } finally {
    G('cfgPingBtn').textContent = typeof t==='function'?t('dyn_tcping_configs_btn'):'⚡ TCPing Configs';
    G('cfgPingBtn').disabled = false;
    _cfgPinging = false;
    var prog2 = G('cfgPingProg'); if(prog2) prog2.remove();
  }
}

function renderCfgPingResults(sortByMs) {
  var results = _cfgPingResults.slice();
  if(sortByMs) {
    results.sort(function(a,b){
      if(!a.ok && !b.ok) return 0;
      if(!a.ok) return 1;
      if(!b.ok) return -1;
      return a.ms - b.ms;
    });
  }

  var el = G('cfgPingResults');
  var prog = G('cfgPingProg');
  var frag = document.createDocumentFragment();
  if(prog) frag.appendChild(prog.cloneNode(true));

  if(results.length) {
    var ok = results.filter(function(r){ return r.ok; }).length;
    var summary = document.createElement('div');
    summary.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;padding:6px 8px;background:rgba(0,0,0,0.2);border-radius:6px;';
    var summaryText = '✅ ' + ok + (typeof t==='function'?t('dyn_reachable_count'):' reachable') + ' · ❌ ' + (results.length - ok) + (typeof t==='function'?t('dyn_unreachable_count'):' unreachable');
    if(ok > 0) {
      var fastest = Math.min.apply(null, results.filter(function(r){ return r.ok; }).map(function(r){ return r.ms; }));
      summaryText += ' · ' + (typeof t==='function'?t('dyn_fastest'):'fastest: ');
      summary.textContent = summaryText;
      var fastSpan = document.createElement('strong');
      fastSpan.style.color = 'var(--green)';
      fastSpan.textContent = fastest + ' ms';
      summary.appendChild(fastSpan);
    } else {
      summary.textContent = summaryText;
    }
    frag.appendChild(summary);
  }

  results.forEach(function(r) {
    var row = document.createElement('div');
    row.className = 'ping-row';
    row.style.cssText = 'flex-direction:column;align-items:flex-start;gap:2px;padding:7px 10px;';

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;width:100%;align-items:center;';

    var remarkSpan = document.createElement('span');
    remarkSpan.className = 'ping-host';
    remarkSpan.style.cssText = 'font-weight:600;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    remarkSpan.title = r.remark;
    remarkSpan.textContent = r.remark;

    var msSpan = document.createElement('span');
    if(r.ok) {
      msSpan.className = 'ping-ms ' + (r.ms < 150 ? 'ping-ok' : r.ms < 400 ? 'ping-slow' : 'ping-bad');
      msSpan.textContent = r.ms + ' ms';
      if(r.times && r.times.length > 1) {
        var sub = document.createElement('span');
        sub.style.cssText = 'color:var(--muted);font-size:10px;';
        sub.textContent = ' (' + r.times.join('/') + ')';
        msSpan.appendChild(sub);
      }
    } else {
      msSpan.className = 'ping-ms ping-err';
      msSpan.textContent = r.timedOut ? (typeof t==='function'?t('dyn_timeout_label'):'Timeout') : (typeof t==='function'?t('dyn_unreachable'):'Unreachable');
    }

    top.appendChild(remarkSpan);
    top.appendChild(msSpan);

    var hostLine = document.createElement('span');
    hostLine.style.cssText = 'font-size:10px;color:var(--muted);font-family:\'JetBrains Mono\',monospace;';
    hostLine.textContent = r.host + ':' + r.port;

    row.appendChild(top);
    row.appendChild(hostLine);
    frag.appendChild(row);
  });

  el.textContent = '';
  el.appendChild(frag);
}
// Load links from Advanced output panel
function cfgPingFromOutput() {
  // Use _advRawLinks — the canonical source of truth (reflects sort/shuffle state)
  var links = _advRawLinks.filter(function(x){ return x.startsWith('vless://'); });
  if(!links.length){ toast('No links in Advanced output — generate first','err'); return; }
  G('cfgPingInput').value = links.join('\n');
  toast('Loaded ' + links.length + ' configs', 'ok');
}

// Load links from Bulk input
function cfgPingFromBulk() {
  var txt = G('bulkInput') ? G('bulkInput').value.trim() : '';
  var links = txt.split('\n').filter(function(x){ return x.trim().startsWith('vless://'); });
  if(!links.length){ toast('No vless:// links in Bulk tab','err'); return; }
  G('cfgPingInput').value = links.join('\n');
  toast('Loaded ' + links.length + ' configs', 'ok');
}

// Export configs that got a result, sorted fastest first, unreachable excluded
function cfgPingExportFast() {
  var ok = _cfgPingResults.filter(function(r){ return r.ok; });
  if(!ok.length){ toast('No reachable configs to export','err'); return; }
  ok.sort(function(a,b){ return a.ms - b.ms; });
  dlText('fastest_configs.txt', ok.map(function(r){ return r.raw; }).join('\n'));
  toast('Exported ' + ok.length + ' fastest configs', 'ok');
}

function clearCfgPing() {
  G('cfgPingInput').value = '';
  G('cfgPingResults').textContent = '';
  _cfgPingResults = [];
  toast('Cleared', 'ok');
}

// ── Splash screen removal ─────────────────────────────────
// Fades out and removes #appSplash once JS is ready and the UI is painted.
// Safe to call even if no splash exists (guard checks for null).
(function(){
  var s = document.getElementById('appSplash');
  if(s){
    s.style.transition = 'opacity 0.25s';
    s.style.opacity = '0';
    setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); }, 260);
  }
})();
// showToast removed — duplicate of toast(). CSS animations should be in style.css.
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
      var clean = link.replace(/@@/g, '');
      var url   = new URL(clean.replace(/^vless:\/\//i, 'http://'));
      var p     = url.searchParams;

      var network  = p.get('type')     || 'tcp';
      var security = p.get('security') || 'none';
      var sni      = p.get('sni')      || url.hostname;
      var fp       = p.get('fp')       || 'chrome';
      var alpn     = p.get('alpn')     ? p.get('alpn').split(',') : null;
      var pbk      = p.get('pbk')      || '';
      var sid      = p.get('sid')      || '';
      var host     = p.get('host')     || '';
      var path     = decodeURIComponent(p.get('path') || '/');
      var mode     = p.get('mode')     || '';
      var svcName  = p.get('serviceName') || '';
      var flow     = p.get('flow')     || '';
      var headerType = p.get('headerType') || '';
      var port     = parseInt(url.port) || 443;
      var address  = url.hostname;
      var id       = url.username || '';
      var remark   = url.hash ? decodeURIComponent(url.hash.slice(1)).trim() : 'Proxy-' + idx;
      if (!remark) remark = 'Proxy-' + idx;

      var icon = security === 'reality' ? '🔮' : security === 'tls' ? '🔒' : '🔓';

      // Xray outbound
      var xOut = {
        tag: 'proxy-' + idx,
        protocol: 'vless',
        settings: { vnext: [{ address: address, port: port, users: [{ id: id, encryption: 'none', flow: flow }] }] },
        streamSettings: { network: network, security: security }
      };
      if (network === 'ws') {
        xOut.streamSettings.wsSettings = { path: path, headers: host ? { Host: host } : {} };
      } else if (network === 'grpc') {
        xOut.streamSettings.grpcSettings = { serviceName: svcName, multiMode: mode === 'multi' };
      } else if (network === 'xhttp' || network === 'httpupgrade') {
        xOut.streamSettings.xhttpSettings = { path: path, host: host, mode: mode || 'auto' };
      } else if (network === 'tcp' && headerType === 'http') {
        xOut.streamSettings.tcpSettings = { header: { type: 'http', request: { path: [path], headers: { Host: [host || address] } } } };
      }
      if (security === 'tls') {
        xOut.streamSettings.tlsSettings = { serverName: sni, fingerprint: fp, allowInsecure: false };
        if (alpn) xOut.streamSettings.tlsSettings.alpn = alpn;
      } else if (security === 'reality') {
        xOut.streamSettings.realitySettings = { serverName: sni, fingerprint: fp, publicKey: pbk, shortId: sid, spiderX: p.get('spx') || '/' };
      }

      // sing-box outbound
      var sOut = {
        type: 'vless', tag: 'proxy-' + idx,
        server: address, server_port: port,
        uuid: id, flow: flow, packet_encoding: 'xudp'
      };
      if (network === 'ws') {
        sOut.transport = { type: 'ws', path: path, headers: host ? { Host: host } : {} };
      } else if (network === 'grpc') {
        sOut.transport = { type: 'grpc', service_name: svcName };
      } else if (network === 'xhttp' || network === 'httpupgrade') {
        sOut.transport = { type: 'http', path: path, host: host, method: 'GET' };
      } else if (network === 'tcp' && headerType === 'http') {
        sOut.transport = { type: 'http', path: path, headers: { Host: host || address } };
      }
      if (security === 'tls' || security === 'reality') {
        sOut.tls = { enabled: true, server_name: sni, utls: { enabled: true, fingerprint: fp } };
        if (alpn) sOut.tls.alpn = alpn;
        if (security === 'reality') sOut.tls.reality = { enabled: true, public_key: pbk, short_id: sid };
      }

      return { xOut: xOut, sOut: sOut, remark: remark, address: address, port: port, network: network, security: security, icon: icon };
    } catch(e) { return null; }
  }

  // ── Live preview ─────────────────────────────────────────
  function balRenderPreview(nodes) {
    BAL_NODES = nodes;
    G('balLiveCount').textContent = nodes.length + ' node' + (nodes.length !== 1 ? 's' : '');
    var prev = G('balNodeList');
    var wrap = G('balNodePreview');
    if (!nodes.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    // FIX BUG: use DOM methods instead of innerHTML to prevent XSS from crafted vless:// remarks
    prev.textContent = '';
    nodes.forEach(function(n) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--card3);border:1px solid var(--border2);border-radius:8px;padding:7px 10px;';

      var icon = document.createElement('span');
      icon.style.fontSize = '1.1rem';
      icon.textContent = n.icon;

      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';

      var remark = document.createElement('div');
      remark.style.cssText = 'font-size:11px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      remark.textContent = n.remark;

      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:10px;color:var(--muted);display:flex;gap:6px;margin-top:2px;';

      var badge = document.createElement('span');
      badge.style.cssText = 'background:var(--accent-lo);color:var(--accent);padding:1px 5px;border-radius:3px;';
      badge.textContent = n.network.toUpperCase() + '/' + n.security.toUpperCase();

      var addr = document.createElement('span');
      addr.textContent = n.address + ':' + n.port;

      meta.appendChild(badge);
      meta.appendChild(addr);
      info.appendChild(remark);
      info.appendChild(meta);
      row.appendChild(icon);
      row.appendChild(info);
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
    outbounds.push({ type: 'block',  tag: 'block'  });
    var tags = nodes.map(function(n) { return n.sOut.tag; });
    var balancer = strategy === 'leastPing'
      ? { type: 'urltest', tag: 'core_balancer', outbounds: tags, url: probeUrl, interval: probeInterval, tolerance: 300, idle_timeout: '30m' }
      : { type: 'selector', tag: 'core_balancer', outbounds: tags, default: tags[0] || 'direct' };
    outbounds.push(balancer);
    return JSON.stringify({
      log: { level: 'warning', timestamp: true },
      dns: { servers: [{ address: 'https://1.1.1.1/dns-query', detour: 'direct' },{ address: 'https://8.8.8.8/dns-query', detour: 'direct' }], strategy: 'ipv4_only' },
      inbounds: [{ type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: socksPort, sniff: true, sniff_override_destination: true }],
      outbounds: outbounds,
      route: { rules: [{ ip_is_private: true, outbound: 'direct' },{ ip_cidr: ['geoip:cn'], outbound: 'direct' },{ domain: ['geosite:cn'], outbound: 'direct' }], final: 'core_balancer' }
    }, null, 2);
  }

  // ── Public API ───────────────────────────────────────────
  window.balSetFormat = function(mode) {
    BAL_FORMAT = mode;
    G('balFmtXray').classList.toggle('active', mode === 0);
    G('balFmtSing').classList.toggle('active', mode === 1);
    // Auto-regen if output already exists
    if (BAL_NODES.length && G('balOutput').value) window.balGenerate();
  };

  window.balGenerate = function() {
    var raw = G('balInputNodes').value;
    var links = balExtract(raw);
    if (!links.length) { toast('No vless:// links found', 'err'); return; }
    var nodes = links.map(function(l, i) { return balParseOne(l, i + 1); }).filter(Boolean);
    if (!nodes.length) { toast('Could not parse any node', 'err'); return; }
    balRenderPreview(nodes);

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
      ? 'Xray / v2rayNG JSON — ' + nodes.length + ' nodes — ' + (strategy === 'leastPing' ? 'LeastPing' : 'Selector')
      : 'sing-box 1.13+ JSON — ' + nodes.length + ' nodes — ' + (strategy === 'leastPing' ? 'URLTest' : 'Selector');
    G('balOutLabel').textContent = label;
    var st = G('balStatus');
    st.style.display = 'block';
    st.textContent = '';
    var stBold = document.createElement('strong');
    stBold.textContent = nodes.length;
    var stStrat = document.createElement('span');
    stStrat.style.color = 'var(--accent3)';
    stStrat.textContent = strategy === 'leastPing' ? 'LeastPing' : 'Selector';
    st.appendChild(document.createTextNode('✅ '));
    st.appendChild(stBold);
    st.appendChild(document.createTextNode(' nodes · ' + (BAL_FORMAT === 0 ? 'Xray' : 'sing-box 1.13+') + ' · '));
    st.appendChild(stStrat);
    toast('Config generated — ' + nodes.length + ' nodes', 'ok');
  };

  window.balCopyOut = function() {
    var v = G('balOutput').value;
    if (!v) { toast('Nothing to copy', 'err'); return; }
    // FIX IMPROVE: use safeClipboard() which handles Tauri and Android WebView fallbacks
    safeClipboard(v).then(function() { toast('JSON copied!', 'ok'); }).catch(function() { toast('Copy failed', 'err'); });
  };

  window.balDownload = function() {
    var v = G('balOutput').value;
    if (!v) { toast('Generate first', 'err'); return; }
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
    G('balLiveCount').textContent = '0 nodes';
    BAL_NODES = [];
    toast('Cleared', 'ok');
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
    // Format button active style fix
    [G('balFmtXray'), G('balFmtSing')].forEach(function(btn) {
      if (btn) btn.addEventListener('click', function() {
        [G('balFmtXray'), G('balFmtSing')].forEach(function(b){ if(b) b.style.background=''; });
      });
    });
  });

})();