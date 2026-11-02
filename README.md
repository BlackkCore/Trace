<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.svg">
  <img src="./assets/logo-light.svg" alt="Trace" width="300">
</picture>

**Build, check and export VLESS configs in your browser.**

No backend · No sign-up · Nothing leaves your device

**[Open Trace](https://blackkcore.github.io/Trace/)**

[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red?style=flat-square)](#-license)
[![No Backend](https://img.shields.io/badge/backend-none-brightgreen?style=flat-square)](#-privacy)
[![No Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen?style=flat-square)](#-file-structure)
[![Bilingual](https://img.shields.io/badge/i18n-EN%20%2F%20FA-blueviolet?style=flat-square)](./README.fa.md)

**🇬🇧 English** · [🇮🇷 فارسی](./README.fa.md)

</div>

---

**Trace** is a fully client-side web app for building, checking and exporting VLESS proxy configurations. Everything runs in your browser, in English or Persian, with dark and light themes.

> Built by [@zekk4](https://t.me/zekk4)

---

### 🚀 Quick Start

Trace is a static site, with no build step and nothing to install.

**Use it online:** [blackkcore.github.io/Trace](https://blackkcore.github.io/Trace/)

**Run locally:**
```bash
git clone https://github.com/BlackkCore/Trace.git
cd Trace
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

**Deploy:**

| Platform | Steps |
|---|---|
| **GitHub Pages** | Fork → Settings → Pages → `main` branch `/root` |
| **Netlify / Vercel / Cloudflare Pages** | Drop the whole folder, including `fonts/` and `assets/`. No configuration needed |

---

### ✨ Features

Trace follows one route: **Build → Check → Export**, with a **Library** for everything you save. Press `Ctrl K` to jump anywhere from the command palette.

<details open>
<summary><b>⚡ Build</b></summary>

- **Paste anything** — a `vless://` link loads into the form and is split into its parts, many links open in Check, and base64 text or a subscription URL is recognized
- **One form** — UUID, port, TLS, transport, plus fingerprint, flow and Reality settings when you need them
- **Batch generation** — multiple IPs or SNIs, one per line, with IP ranges (`1.2.3.1-50`) and CIDR (`104.16.0.0/24`)
- **Pair mode** — full matrix (every IP × every SNI) or strict 1-to-1 pairing
- **Large lists** — tens of thousands of links stay responsive; the page shows the first 500 and exports all of them
- **QR codes** for any generated link

</details>

<details>
<summary><b>🔍 Check</b></summary>

| Section | What it does |
|---|---|
| **Servers** | Probes each config's `host:port` and sorts confirmed configs first; keep the ones that responded |
| **Import** | Accepts raw `vless://` links, base64 subscription strings or a subscription URL, and removes duplicates |
| **Hosts** | Probes any list of IPs or hosts |
| **Validate** | Instant health check of UUID, port, required fields and TLS settings, with a warning for unencrypted links |
| **Compare** | Side-by-side comparison of two `vless://` links, field by field |

Browsers can't tell a rejected connection from a failed one, so only a completed connection counts as *confirmed*. Anything else shows as *unconfirmed*, never as reachable.

</details>

<details>
<summary><b>📦 Export</b></summary>

| Section | What it does |
|---|---|
| **Formats** | Clash YAML, sing-box JSON, plain links, base64 subscription or JSON, to copy or download |
| **Balancer** | Load-balanced JSON for **v2rayNG (Xray)** or **sing-box 1.13+** |
| **Rename** | Rename remarks in bulk with a template such as `{prefix}_{ip}_{sni}_{idx}` |

Some configs can't run on every client, so Trace leaves them out and tells you how many:
- sing-box has no `xhttp` / `splithttp` support
- Xray refuses unencrypted VLESS to public servers

</details>

<details>
<summary><b>🗄 Library</b></summary>

- **Profiles** — save, search, load and edit named settings, and back them up as JSON
- **UUIDs** — generate, nickname and store UUIDs, and pick one from any UUID field
- **IP and SNI lists** — save named lists and load them into any field
- **History** — return to your recent generations
- **Safe deleting** — deletes can be undone, and clearing everything takes a full press and hold

</details>

<details>
<summary><b>🌍 Persian support</b></summary>

- Full English and Persian interface with right-to-left layout
- Dates shown in the Persian (Jalali) calendar when Persian is selected
- Fonts are bundled, so nothing loads from a third party

</details>

---

### 🛠 Supported VLESS Parameters

| Field | Values |
|---|---|
| Security | `tls` · `reality` · `none` |
| Transport | `xhttp` · `ws` · `grpc` · `splithttp` · `httpupgrade` · `tcp` |
| Fingerprint | `chrome` · `firefox` · `safari` · `ios` · `android` · `edge` · `360` · `qq` · `random` · `randomized` |
| Flow | `xtls-rprx-vision` · none |
| TLS ALPN | `h2` · `http/1.1` · custom |

---

### 📁 File Structure

```
Trace/
├── index.html       # App shell and all screens
├── renderer.js      # All logic: generation, parsing, tools, storage
├── style.css        # Themes, layout, components, motion
├── i18n.js          # English and Persian strings
├── qrcode.min.js    # QR code generation (bundled, no CDN)
├── logo.svg         # App icon
├── assets/          # Logo files, app icons, social preview
└── fonts/           # Geist and Vazirmatn (SIL Open Font License, bundled)
```

---

### 🔒 Privacy

All processing happens in the browser, and your data stays in `localStorage` on your device. No data is sent to any Trace server, because there isn't one.

The only outbound requests are:
- **Server and host checks** — connections to hosts *you* enter, from *your* browser
- **Subscription URL fetch** — an HTTP GET to the URL you provide in Import
- **Balancer probe** — only if you run the generated config in your proxy client

---

### 📄 License

© [@zekk4](https://t.me/zekk4) — All rights reserved.

Personal, non-commercial use only. Copying, modifying, redistributing, or embedding this code in other projects requires explicit written permission from the author.
