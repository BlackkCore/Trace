<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.svg">
  <img src="./assets/logo-light.svg" alt="Trace" width="300">
</picture>

**Build, check and export VLESS configs in your browser.**

No backend · No sign-up · Nothing leaves your device

[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red?style=flat-square)](#-license)
[![No Backend](https://img.shields.io/badge/backend-none-brightgreen?style=flat-square)](#-privacy)
[![No Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen?style=flat-square)](#-file-structure)
[![Bilingual](https://img.shields.io/badge/i18n-EN%20%2F%20FA-blueviolet?style=flat-square)](#-فارسی)

[🇬🇧 English](#-english) · [🇮🇷 فارسی](#-فارسی)

</div>

---

## 🇬🇧 English

**Trace** is a fully client-side web app for building, checking and exporting VLESS proxy configurations. Everything runs in your browser, in English or Persian, with dark and light themes.

> Built by [@zekk4](https://t.me/zekk4)

---

### 🚀 Quick Start

Trace is a static site, with no build step and nothing to install.

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

---
---

## 🇮🇷 فارسی

**Trace** یک وب‌اپلیکیشن کاملاً سمت کلاینت برای ساخت، بررسی و خروجی گرفتن از کانفیگ‌های VLESS است. همه چیز در مرورگر شما اجرا می‌شود، به فارسی یا انگلیسی و با تم تاریک و روشن.

> ساخته‌شده توسط [@zekk4](https://t.me/zekk4)

---

### 🚀 شروع سریع

Trace یک سایت استاتیک است و به build یا نصب چیزی نیاز ندارد.

**اجرای محلی:**
```bash
git clone https://github.com/BlackkCore/Trace.git
cd Trace
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

**استقرار:**

| پلتفرم | مراحل |
|---|---|
| **GitHub Pages** | Fork → Settings → Pages → شاخه `main`، `/root` |
| **Netlify / Vercel / Cloudflare Pages** | کل پوشه را همراه با `fonts/` و `assets/` آپلود کنید. به هیچ تنظیمی نیاز نیست |

---

### ✨ امکانات

Trace یک مسیر ساده دارد: **ساخت ← بررسی ← خروجی**، به‌علاوه **کتابخانه** برای هر چیزی که ذخیره می‌کنید. با `Ctrl K` از پالت دستورات به هر بخش بروید.

<details open>
<summary><b>⚡ ساخت</b></summary>

- **جای‌گذاری هر ورودی** — لینک `vless://` در فرم بارگذاری و به اجزایش تقسیم می‌شود، چند لینک در بخش بررسی باز می‌شوند و base64 یا URL اشتراک شناسایی می‌شود
- **یک فرم** — UUID، پورت، TLS، ترانسپورت، و در صورت نیاز fingerprint، flow و تنظیمات Reality
- **تولید دسته‌ای** — چند IP یا SNI در هر خط، با پشتیبانی از رنج IP (`1.2.3.1-50`) و CIDR (`104.16.0.0/24`)
- **حالت Pair** — ماتریس کامل یا جفت‌سازی یک‌به‌یک
- **لیست‌های بزرگ** — ده‌ها هزار لینک بدون کندی؛ صفحه ۵۰۰ مورد اول را نشان می‌دهد و خروجی شامل همه آن‌هاست
- **QR کد** برای هر لینک تولیدشده

</details>

<details>
<summary><b>🔍 بررسی</b></summary>

| بخش | کاربرد |
|---|---|
| **سرورها** | پروب `host:port` هر کانفیگ و نمایش کانفیگ‌های تأییدشده در ابتدای لیست |
| **ورودی** | دریافت لینک‌های خام `vless://`، رشته‌های base64 یا URL اشتراک، با حذف موارد تکراری |
| **هاست‌ها** | پروب هر لیستی از IP یا host |
| **اعتبارسنجی** | بررسی فوری UUID، پورت، فیلدهای لازم و تنظیمات TLS، با هشدار برای لینک‌های بدون رمزنگاری |
| **مقایسه** | مقایسه دو لینک `vless://` فیلد به فیلد |

مرورگر نمی‌تواند اتصال ردشده را از اتصال ناموفق تشخیص دهد، پس فقط اتصال کامل‌شده *تأییدشده* حساب می‌شود. بقیه موارد *تأییدنشده* نمایش داده می‌شوند و هرگز در دسترس اعلام نمی‌شوند.

</details>

<details>
<summary><b>📦 خروجی</b></summary>

| بخش | کاربرد |
|---|---|
| **فرمت‌ها** | Clash YAML، JSON برای sing-box، لینک ساده، اشتراک base64 یا JSON، با امکان کپی یا دانلود |
| **بالانسر** | تولید JSON با load-balancing برای **v2rayNG (Xray)** یا **sing-box 1.13+** |
| **تغییر نام** | تغییر نام دسته‌ای remark با قالبی مانند `{prefix}_{ip}_{sni}_{idx}` |

بعضی کانفیگ‌ها روی همه کلاینت‌ها اجرا نمی‌شوند، بنابراین Trace آن‌ها را کنار می‌گذارد و تعدادشان را به شما می‌گوید:
- sing-box از `xhttp` و `splithttp` پشتیبانی نمی‌کند
- Xray کانفیگ VLESS بدون رمزنگاری را برای سرورهای عمومی نمی‌پذیرد

</details>

<details>
<summary><b>🗄 کتابخانه</b></summary>

- **پروفایل‌ها** — ذخیره، جستجو، بارگذاری و ویرایش تنظیمات نام‌دار، با پشتیبان‌گیری JSON
- **UUID** — تولید، نام‌گذاری و ذخیره UUID و انتخاب آن از هر فیلد UUID
- **لیست IP و SNI** — ذخیره لیست‌های نام‌دار و بارگذاری در هر فیلد
- **تاریخچه** — بازگشت به تولیدهای اخیر
- **حذف امن** — حذف قابل بازگردانی است و پاک کردن همه چیز نیاز به نگه داشتن کامل دکمه دارد

</details>

<details>
<summary><b>🌍 پشتیبانی از فارسی</b></summary>

- رابط کامل فارسی و انگلیسی با چیدمان راست‌به‌چپ
- نمایش تاریخ‌ها با تقویم شمسی در حالت فارسی
- فونت‌ها همراه برنامه هستند و چیزی از سرویس‌های دیگر بارگذاری نمی‌شود

</details>

---

### 🛠 پارامترهای VLESS پشتیبانی‌شده

| فیلد | مقادیر |
|---|---|
| Security | `tls` · `reality` · `none` |
| Transport | `xhttp` · `ws` · `grpc` · `splithttp` · `httpupgrade` · `tcp` |
| Fingerprint | `chrome` · `firefox` · `safari` · `ios` · `android` · `edge` · `360` · `qq` · `random` · `randomized` |
| Flow | `xtls-rprx-vision` · none |
| TLS ALPN | `h2` · `http/1.1` · سفارشی |

---

### 📁 ساختار فایل‌ها

```
Trace/
├── index.html       # پوسته اپ و تمام صفحه‌ها
├── renderer.js      # تمام منطق: تولید، تجزیه، ابزارها، ذخیره‌سازی
├── style.css        # تم‌ها، چیدمان، کامپوننت‌ها، انیمیشن
├── i18n.js          # رشته‌های فارسی و انگلیسی
├── qrcode.min.js    # تولید QR کد (بدون CDN)
├── logo.svg         # آیکون برنامه
├── assets/          # فایل‌های لوگو، آیکون‌ها، تصویر پیش‌نمایش
└── fonts/           # فونت‌های Geist و Vazirmatn (مجوز SIL Open Font)
```

---

### 🔒 حریم خصوصی

تمام پردازش‌ها در مرورگر انجام می‌شود و داده‌های شما در `localStorage` روی دستگاه خودتان می‌ماند. هیچ داده‌ای به سرور Trace ارسال نمی‌شود، چون چنین سروری وجود ندارد.

تنها درخواست‌های خارجی:
- **بررسی سرور و هاست** — اتصال به hostهایی که شما وارد می‌کنید، از مرورگر خودتان
- **دریافت URL اشتراک** — یک HTTP GET به URL‌ای که در بخش ورودی وارد می‌کنید
- **probe بالانسر** — فقط اگر کانفیگ تولیدشده را در کلاینت پروکسی اجرا کنید

---

### 📄 مجوز

© [@zekk4](https://t.me/zekk4) — تمام حقوق محفوظ است.

استفاده شخصی و غیرتجاری مجاز است. کپی، تغییر، توزیع مجدد یا استفاده در پروژه‌های دیگر بدون اجازه کتبی صریح از نویسنده مجاز نیست.
