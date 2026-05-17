<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=32&pause=1000&color=6E56CF&center=true&vCenter=true&width=435&lines=⬡+Trace" alt="Trace" />

**A client-side VLESS proxy configuration suite.**

Generate · Parse · Validate · TCPing — all in your browser.

[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red?style=flat-square)](./README.md#license)
[![HTML](https://img.shields.io/badge/HTML-19%25-orange?style=flat-square&logo=html5&logoColor=white)](https://github.com/BlackkCore/Trace)
[![JavaScript](https://img.shields.io/badge/JavaScript-65%25-yellow?style=flat-square&logo=javascript&logoColor=black)](https://github.com/BlackkCore/Trace)
[![CSS](https://img.shields.io/badge/CSS-16%25-blue?style=flat-square&logo=css3&logoColor=white)](https://github.com/BlackkCore/Trace)
[![No Backend](https://img.shields.io/badge/backend-none-brightgreen?style=flat-square)](#privacy)
[![Bilingual](https://img.shields.io/badge/i18n-EN%20%2F%20FA-blueviolet?style=flat-square)](#)

[🇬🇧 English](#-english) · [🇮🇷 فارسی](#-فارسی)

</div>

---

## 🇬🇧 English

**Trace** is a fully client-side web app for generating, parsing, managing, and testing VLESS proxy configurations. No backend, no sign-up, no tracking — everything runs in your browser.

> Built by [@Blackkcore](https://t.me/Blackkcore)

---

### 🚀 Quick Start

Trace is a static site — no build step, no dependencies to install.

**Run locally:**
```bash
git clone https://github.com/BlackkCore/Trace.git
cd Trace
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

**Deploy in one click:**

| Platform | Steps |
|---|---|
| **GitHub Pages** | Fork → Settings → Pages → `main` branch `/root` |
| **Netlify / Vercel / Cloudflare Pages** | Drop the 5 files — zero config needed |

---

### ✨ Features

<details>
<summary><b>⚡ Generate</b></summary>

- **Simple Mode** — paste any `vless://` link to auto-load its fields, tweak, and re-export in seconds
- **Advanced Mode** — full control: UUID, port, TLS, transport (`xhttp`, `ws`, `grpc`, `splithttp`, `tcp`), fingerprint, flow, Reality settings
- **Batch Generation** — provide multiple IPs or SNIs (one per line); supports IP ranges (`1.2.3.1–50`) and CIDR (`104.16.0.0/24`)
- **Pair Mode** — full matrix (every IP × every SNI) or strict 1-to-1 pairing
- **Export Formats** — `vless://` links, `.txt` download, Clash YAML, or QR code
- **Saved Profiles** — save generator settings as named profiles and reload instantly

</details>

<details>
<summary><b>📁 Profiles</b></summary>

- Save, search, load, edit, and delete named configuration profiles
- Export all profiles to JSON / import from JSON for backup or sharing

</details>

<details>
<summary><b>📥 Bulk Import</b></summary>

- Accepts raw `vless://` links, base64-encoded subscription strings, or a subscription URL
- Automatic deduplication across all input methods
- Export results as `.txt` or base64-encoded

</details>

<details>
<summary><b>🔧 Tools</b></summary>

| Tool | What it does |
|---|---|
| **Config Validator** | Instant health check — UUID format, port range, required fields, TLS params |
| **TCPing** | Measures raw TCP SYN-ACK RTT to any list of IPs/hosts |
| **Config TCPing** | Pings each `vless://` config's `host:port` and sorts by RTT; export the fastest |
| **Config Balancer** | Generates load-balanced JSON for **v2rayNG (Xray)** or **sing-box 1.13+** |
| **Config Diff** | Side-by-side comparison of two `vless://` links, highlighting every differing field |
| **Base64 Encoder/Decoder** | Encode or decode subscription strings |
| **Bulk Remark Renamer** | Apply a template (`{prefix}_{ip}_{sni}_{idx}`) to rename remarks in bulk |

</details>

<details>
<summary><b>🗄 Saved Data</b></summary>

- **UUID Manager** — generate, nickname, and store UUIDs; pick from any UUID field with one click
- **IP Lists** — save named IP lists, load into any IP field instantly
- **SNI Lists** — same for SNI sets

</details>

<details>
<summary><b>🌍 Other</b></summary>

- Dark / Light theme toggle
- Persian (FA) / English language switch (full i18n via `i18n.js`)
- All data stored locally in `localStorage` — nothing ever leaves your device

</details>

---

### 🛠 Supported VLESS Parameters

| Field | Values |
|---|---|
| Security | `tls` · `reality` · `none` |
| Transport | `xhttp` · `ws` · `grpc` · `splithttp` · `tcp` |
| Fingerprint | `chrome` · `firefox` · `safari` · `ios` · `android` · `edge` · `360` · `qq` · `random` · `randomized` |
| Flow | `xtls-rprx-vision` · none |
| TLS ALPN | `h2` · `http/1.1` · custom |

---

### 📁 File Structure

```
Trace/
├── index.html       # App shell — all tabs and UI
├── renderer.js      # All logic: generation, parsing, tools, storage
├── style.css        # Themes, layout, components
├── i18n.js          # English / Persian translation strings
└── qrcode.min.js    # QR code generation (bundled, no CDN dependency)
```

---

### 🔒 Privacy

All processing happens in the browser. No data is sent to any server.

The only outbound requests are:
- **TCPing / Config TCPing** — TCP connections to hosts *you* enter, from *your* browser
- **Subscription URL fetch** — an HTTP GET to the URL you provide in Bulk Import
- **Config Balancer probe** — only if you actually run the generated config in your proxy client

---

### 📄 License

© [@Blackkcore](https://t.me/Blackkcore) — All rights reserved.

Personal, non-commercial use only. Copying, modifying, redistributing, or embedding this code in other projects requires explicit written permission from the author.

---
---

## 🇮🇷 فارسی

**Trace** یک وب‌اپلیکیشن کاملاً سمت کلاینت برای ساخت، تجزیه، مدیریت و تست کانفیگ‌های VLESS است. بدون سرور، بدون ثبت‌نام، بدون ردیابی — همه چیز در مرورگر شما اجرا می‌شود.

> ساخته‌شده توسط [@Blackkcore](https://t.me/Blackkcore)

---

### 🚀 شروع سریع

Trace یک سایت استاتیک است — نیازی به build یا نصب وابستگی نیست.

**اجرای محلی:**
```bash
git clone https://github.com/BlackkCore/Trace.git
cd Trace
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

**استقرار با یک کلیک:**

| پلتفرم | مراحل |
|---|---|
| **GitHub Pages** | Fork → Settings → Pages → شاخه `main`، `/root` |
| **Netlify / Vercel / Cloudflare Pages** | پنج فایل را آپلود کنید — بدون هیچ تنظیمی |

---

### ✨ امکانات

<details>
<summary><b>⚡ تولید کانفیگ</b></summary>

- **حالت ساده** — هر لینک `vless://` را paste کنید، ویرایش کنید و در چند ثانیه خروجی بگیرید
- **حالت پیشرفته** — کنترل کامل: UUID، پورت، TLS، نوع ترانسپورت، fingerprint، flow، تنظیمات Reality
- **تولید دسته‌ای** — چند IP یا SNI وارد کنید؛ پشتیبانی از رنج IP و CIDR
- **حالت Pair** — ماتریس کامل یا یک‌به‌یک
- **فرمت‌های خروجی** — لینک `vless://`، دانلود `.txt`، Clash YAML، یا QR کد
- **پروفایل‌های ذخیره‌شده** — تنظیمات generator را به‌عنوان پروفایل ذخیره و بارگذاری کنید

</details>

<details>
<summary><b>📁 پروفایل‌ها</b></summary>

- ذخیره، جستجو، بارگذاری، ویرایش و حذف پروفایل‌های نام‌دار
- خروجی / ورودی JSON برای پشتیبان‌گیری یا اشتراک‌گذاری

</details>

<details>
<summary><b>📥 ورودی دسته‌ای</b></summary>

- دریافت لینک‌های خام `vless://`، رشته‌های base64 یا URL اشتراک
- حذف خودکار موارد تکراری
- خروجی به‌صورت `.txt` یا base64

</details>

<details>
<summary><b>🔧 ابزارها</b></summary>

| ابزار | کاربرد |
|---|---|
| **Config Validator** | بررسی فوری سلامت کانفیگ — UUID، پورت، فیلدهای لازم، TLS |
| **TCPing** | اندازه‌گیری RTT به لیستی از IP/host |
| **Config TCPing** | TCPing روی هر کانفیگ و مرتب‌سازی بر اساس RTT |
| **Config Balancer** | تولید کانفیگ JSON با load-balancing برای v2rayNG یا sing-box |
| **Config Diff** | مقایسه دو لینک `vless://` فیلد به فیلد |
| **Base64 Encoder/Decoder** | رمزگذاری و رمزگشایی رشته‌های اشتراک |
| **Bulk Remark Renamer** | تغییر نام remark کانفیگ‌ها به‌صورت دسته‌ای با قالب دلخواه |

</details>

<details>
<summary><b>🗄 داده‌های ذخیره‌شده</b></summary>

- **UUID Manager** — تولید، نام‌گذاری و ذخیره UUID
- **لیست IP** — ذخیره و بارگذاری فوری در هر فیلد IP
- **لیست SNI** — همان قابلیت برای SNI

</details>

<details>
<summary><b>🌍 سایر امکانات</b></summary>

- تغییر تم تاریک / روشن
- تغییر زبان فارسی / انگلیسی (i18n کامل)
- تمام داده‌ها در `localStorage` ذخیره می‌شوند — هیچ چیز دستگاه شما را ترک نمی‌کند

</details>

---

### 🛠 پارامترهای VLESS پشتیبانی‌شده

| فیلد | مقادیر |
|---|---|
| Security | `tls` · `reality` · `none` |
| Transport | `xhttp` · `ws` · `grpc` · `splithttp` · `tcp` |
| Fingerprint | `chrome` · `firefox` · `safari` · `ios` · `android` · `edge` · `360` · `qq` · `random` · `randomized` |
| Flow | `xtls-rprx-vision` · none |
| TLS ALPN | `h2` · `http/1.1` · سفارشی |

---

### 📁 ساختار فایل‌ها

```
Trace/
├── index.html       # پوسته اپ — تمام تب‌ها و رابط کاربری
├── renderer.js      # تمام منطق: تولید، تجزیه، ابزارها، ذخیره‌سازی
├── style.css        # تم‌ها، چیدمان، کامپوننت‌ها
├── i18n.js          # رشته‌های ترجمه فارسی / انگلیسی
└── qrcode.min.js    # تولید QR کد (بدون وابستگی CDN)
```

---

### 🔒 حریم خصوصی

تمام پردازش‌ها در مرورگر انجام می‌شود. هیچ داده‌ای به هیچ سروری ارسال نمی‌شود.

تنها درخواست‌های خارجی:
- **TCPing / Config TCPing** — اتصالات TCP به hostهایی که شما وارد می‌کنید
- **دریافت URL اشتراک** — یک HTTP GET به URL‌ای که شما وارد می‌کنید
- **URL probe بالانسر** — فقط اگر کانفیگ تولیدشده را در کلاینت پروکسی اجرا کنید

---

### 📄 مجوز

© [@Blackkcore](https://t.me/Blackkcore) — تمام حقوق محفوظ است.

استفاده شخصی و غیرتجاری مجاز است. کپی، تغییر، توزیع مجدد یا استفاده در پروژه‌های دیگر بدون اجازه کتبی صریح از نویسنده مجاز نیست.
