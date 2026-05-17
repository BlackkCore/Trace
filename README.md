# ⬡ Trace — VLESS Proxy Configuration Suite

> 🌐 Choose your language — یک زبان انتخاب کنید

<details open>
<summary>🇬🇧 English</summary>

<br>

**Trace** is a fully client-side web app for generating, parsing, managing, and testing VLESS proxy configurations. No backend, no sign-up, no tracking — everything runs in your browser.

> Created by [@Blackkcore](https://t.me/Blackkcore)

---

## ✨ Features

### ⚡ Generate
- **Simple Mode** — paste any `vless://` link to auto-load its settings, then tweak and re-export in seconds
- **Advanced Mode** — full control over every parameter: UUID, port, TLS, transport type (xhttp, ws, grpc, splithttp, tcp), fingerprint, flow, reality settings, and more
- **Batch generation** — provide multiple IPs or SNIs (one per line) and generate an entire list of configs at once; supports IP ranges (`1.2.3.1-50`) and CIDR notation (`104.16.0.0/24`)
- **Pair Mode** — toggle between full matrix (every IP × every SNI) or 1-to-1 pairing
- **Export formats** — copy as `vless://` links, download as `.txt`, export as Clash YAML, or scan as a QR code
- **Save profiles** — save your generator settings as named profiles and reload them instantly

### 📁 Profiles
- Save, search, load, edit, and delete named configuration profiles
- Export all profiles to JSON / import from JSON for backup or sharing

### 📥 Bulk Import
- Paste raw `vless://` links, base64-encoded subscription strings, or fetch from a subscription URL
- Automatic deduplication across all input methods
- Export deduplicated results as `.txt` or base64-encoded

### 🔧 Tools

| Tool | What it does |
|---|---|
| **Config Validator** | Instant health check on any `vless://` link — UUID format, port range, required fields, TLS params |
| **TCPing** | Measures raw TCP SYN-ACK RTT to any list of IPs/hosts, with configurable repeat count and timeout |
| **Config TCPing** | Pings the `host:port` of each `vless://` config and sorts results by RTT; export the fastest ones |
| **Config Balancer** | Generates a ready-to-use load-balanced JSON config for **v2rayNG (Xray)** or **sing-box 1.13+** from any list of links |
| **Config Diff** | Side-by-side comparison of two `vless://` links, highlighting every differing field |
| **Base64 Encoder / Decoder** | Encode or decode subscription strings |
| **Bulk Remark Renamer** | Apply a template (`{prefix}_{ip}_{sni}_{idx}`) to rename the remarks on a batch of links |

### 🗄 Saved Data
- **UUID Manager** — generate, nickname, and store UUIDs; pick them from any UUID field with one click
- **IP Lists** — save named IP lists and load them into any IP field instantly
- **SNI Lists** — same for SNI sets

### 🌍 Other
- **Dark / Light theme** toggle
- **Persian (FA) / English** language switch (full i18n via `i18n.js`)
- All data stored locally in `localStorage` — nothing ever leaves your device

---

## 🚀 Getting Started

Trace is a static site — no build step required.

### Option 1 — Open locally
```
git clone https://github.com/YOUR_USERNAME/trace.git
cd trace
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Option 2 — GitHub Pages
1. Fork this repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your site will be live at `https://YOUR_USERNAME.github.io/trace/`

### Option 3 — Any static host
Drop the five files onto Netlify, Vercel, Cloudflare Pages, or any web server — no configuration needed.

---

## 📁 File Structure

```
trace/
├── index.html       # App shell, all tabs and UI
├── renderer.js      # All logic: generation, parsing, tools, storage
├── style.css        # Themes, layout, components
├── i18n.js          # English / Persian translation strings
└── qrcode.min.js    # QR code generation (bundled, no CDN dependency)
```

---

## 🔒 Privacy

All processing happens in the browser. No data is sent to any server. The only outbound requests are:

- **TCPing / Config TCPing** — TCP connections to the hosts you enter, initiated from your own browser
- **Subscription URL fetch** (Bulk Import) — an HTTP GET to the URL you provide
- **Config Balancer probe URL** — only if you generate and then actually run the resulting config in your proxy client

---

## 🛠 Supported VLESS Parameters

| Field | Values |
|---|---|
| Security | `tls`, `reality`, `none` |
| Transport | `xhttp`, `ws`, `grpc`, `splithttp`, `tcp` |
| Fingerprint | `chrome`, `firefox`, `safari`, `ios`, `android`, `edge`, `360`, `qq`, `random`, `randomized` |
| Flow | `xtls-rprx-vision`, none |
| TLS ALPN | `h2`, `http/1.1`, or custom |

---

## 📄 License

© [@Blackkcore](https://t.me/Blackkcore) — All rights reserved.

You may use this tool for personal, non-commercial purposes only.
Copying, modifying, redistributing, or using this code in other projects is not permitted without explicit written permission from the author.

</details>

---

<details>
<summary>🇮🇷 فارسی</summary>

<div dir="rtl">
<br>

**Trace** یک وب‌اپلیکیشن کاملاً سمت کلاینت برای ساخت، تجزیه، مدیریت و تست کانفیگ‌های VLESS است. بدون سرور، بدون ثبت‌نام، بدون ردیابی — همه چیز در مرورگر شما اجرا می‌شود.

> ساخته شده توسط [@Blackkcore](https://t.me/Blackkcore)

---

## ✨ امکانات

### ⚡ تولید کانفیگ
- **حالت ساده** — هر لینک `vless://` را paste کنید تا تنظیمات آن بارگذاری شود، سپس در چند ثانیه ویرایش و خروجی بگیرید
- **حالت پیشرفته** — کنترل کامل روی تمام پارامترها: UUID، پورت، TLS، نوع ترانسپورت (xhttp، ws، grpc، splithttp، tcp)، fingerprint، flow، تنظیمات reality و بیشتر
- **تولید دسته‌ای** — چند IP یا SNI (هر کدام در یک خط) وارد کنید و یک لیست کامل از کانفیگ‌ها بسازید؛ پشتیبانی از رنج IP (`1.2.3.1-50`) و نماد CIDR (`104.16.0.0/24`)
- **حالت Pair** — انتخاب بین ماتریس کامل (هر IP × هر SNI) یا یک‌به‌یک
- **فرمت‌های خروجی** — کپی به‌صورت لینک `vless://`، دانلود `.txt`، خروجی Clash YAML، یا اسکن QR کد
- **ذخیره پروفایل** — تنظیمات generator را به‌عنوان پروفایل‌های نام‌دار ذخیره و فوری بارگذاری کنید

### 📁 پروفایل‌ها
- ذخیره، جستجو، بارگذاری، ویرایش و حذف پروفایل‌های نام‌دار
- خروجی JSON از تمام پروفایل‌ها / ورودی JSON برای پشتیبان‌گیری یا اشتراک‌گذاری

### 📥 ورودی دسته‌ای
- Paste لینک‌های خام `vless://`، رشته‌های base64 یا دریافت از URL اشتراک
- حذف خودکار موارد تکراری از تمام روش‌های ورودی
- خروجی نتایج به‌صورت `.txt` یا base64

### 🔧 ابزارها

| ابزار | کاربرد |
|---|---|
| **Config Validator** | بررسی فوری سلامت هر لینک `vless://` — فرمت UUID، رنج پورت، فیلدهای لازم، پارامترهای TLS |
| **TCPing** | اندازه‌گیری RTT پاکت TCP به لیستی از IP/host با تعداد تکرار و timeout قابل تنظیم |
| **Config TCPing** | TCPing روی `host:port` هر کانفیگ `vless://` و مرتب‌سازی بر اساس RTT؛ خروجی سریع‌ترین‌ها |
| **Config Balancer** | تولید کانفیگ JSON آماده با load-balancing برای **v2rayNG (Xray)** یا **sing-box 1.13+** |
| **Config Diff** | مقایسه دو لینک `vless://` و نمایش تفاوت هر فیلد |
| **Base64 Encoder / Decoder** | رمزگذاری یا رمزگشایی رشته‌های اشتراک |
| **Bulk Remark Renamer** | اعمال قالب (`{prefix}_{ip}_{sni}_{idx}`) برای تغییر نام remark کانفیگ‌ها به‌صورت دسته‌ای |

### 🗄 داده‌های ذخیره‌شده
- **UUID Manager** — تولید، نام‌گذاری و ذخیره UUID؛ انتخاب فوری از هر فیلد UUID با یک کلیک
- **لیست IP** — ذخیره لیست‌های IP نام‌دار و بارگذاری فوری در هر فیلد IP
- **لیست SNI** — همان قابلیت برای مجموعه‌های SNI

### 🌍 سایر امکانات
- تغییر **تم تاریک / روشن**
- تغییر زبان **فارسی / انگلیسی** (i18n کامل از طریق `i18n.js`)
- تمام داده‌ها به‌صورت محلی در `localStorage` ذخیره می‌شوند — هیچ چیز دستگاه شما را ترک نمی‌کند

---

## 🚀 شروع کار

Trace یک سایت استاتیک است — نیازی به build نیست.

### گزینه ۱ — اجرای محلی
```
git clone https://github.com/YOUR_USERNAME/trace.git
cd trace
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### گزینه ۲ — GitHub Pages
1. این repo را Fork کنید
2. به **Settings → Pages** بروید
3. منبع را روی شاخه `main`، `/ (root)` تنظیم کنید
4. سایت شما در آدرس `https://YOUR_USERNAME.github.io/trace/` فعال خواهد بود

### گزینه ۳ — هر هاست استاتیک
پنج فایل را روی Netlify، Vercel، Cloudflare Pages یا هر وب‌سرور دیگری آپلود کنید — نیازی به تنظیم نیست.

---

## 📁 ساختار فایل‌ها

```
trace/
├── index.html       # پوسته اپ، تمام تب‌ها و رابط کاربری
├── renderer.js      # تمام منطق: تولید، تجزیه، ابزارها، ذخیره‌سازی
├── style.css        # تم‌ها، چیدمان، کامپوننت‌ها
├── i18n.js          # رشته‌های ترجمه فارسی / انگلیسی
└── qrcode.min.js    # تولید QR کد (بسته‌بندی‌شده، بدون وابستگی CDN)
```

---

## 🔒 حریم خصوصی

تمام پردازش‌ها در مرورگر انجام می‌شود. هیچ داده‌ای به هیچ سروری ارسال نمی‌شود. تنها درخواست‌های خارجی عبارتند از:

- **TCPing / Config TCPing** — اتصالات TCP به hostهایی که وارد می‌کنید، از مرورگر خودتان
- **دریافت URL اشتراک** (ورودی دسته‌ای) — یک HTTP GET به URL‌ای که وارد می‌کنید
- **URL probe بالانسر** — فقط اگر کانفیگ تولیدشده را در کلاینت پروکسی اجرا کنید

---

## 🛠 پارامترهای VLESS پشتیبانی‌شده

| فیلد | مقادیر |
|---|---|
| Security | `tls`، `reality`، `none` |
| Transport | `xhttp`، `ws`، `grpc`، `splithttp`، `tcp` |
| Fingerprint | `chrome`، `firefox`، `safari`، `ios`، `android`، `edge`، `360`، `qq`، `random`، `randomized` |
| Flow | `xtls-rprx-vision`، none |
| TLS ALPN | `h2`، `http/1.1`، یا سفارشی |

---

## 📄 مجوز

© [@Blackkcore](https://t.me/Blackkcore) — تمام حقوق محفوظ است.

استفاده از این ابزار فقط برای اهداف شخصی و غیرتجاری مجاز است.
کپی، تغییر، توزیع مجدد یا استفاده از این کد در پروژه‌های دیگر بدون اجازه کتبی صریح از نویسنده مجاز نیست.

</div>
</details>
