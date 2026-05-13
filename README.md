# AI Arena Fighter

Game pertarungan 1v1 berbasis web dengan musuh AI menggunakan **Finite State Machine (FSM)**.

## Struktur File

```
ai-arena-fighter/
├── index.html   — HTML utama, struktur semua layar
├── style.css    — Semua styling & animasi cyberpunk
├── input.js     — Keyboard input handler
├── game.js      — AudioEngine, Save, ITEMS, Settings, Game loop
├── player.js    — Class Player & Particle
├── enemy.js     — Class Enemy (FSM AI)
├── ui.js        — Shop, Notifikasi, Screen management, Settings UI
├── main.js      — MobileInput (joystick), Boot sequence
└── README.md    — Dokumentasi ini
```

## Cara Jalankan

Karena game menggunakan modul JS terpisah, buka dengan server lokal, bukan langsung klik file HTML.

### Opsi 1 — VS Code Live Server (direkomendasikan)
1. Install ekstensi **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**

### Opsi 2 — Python
```bash
# Python 3
python -m http.server 8080

# Buka browser → http://localhost:8080
```

### Opsi 3 — Node.js
```bash
npx serve .
```

## Kontrol

| Key        | Aksi               |
|------------|-------------------|
| W A S D   | Gerak              |
| SPACE      | Serang             |
| SHIFT      | Dash               |
| 1 / 2      | Gunakan item slot  |
| ESC        | Kembali ke menu    |

## AI FSM States

- **IDLE** — Berpatroli saat player jauh
- **CHASE** — Mengejar player yang terdeteksi
- **ATTACK** — Menyerang saat jarak dekat
- **DODGE** — Menghindar adaptif setelah serangan
- **DEAD** — Animasi mati

## Item Shop

| Item          | Tipe      | Efek                              | Harga |
|---------------|-----------|-----------------------------------|-------|
| Azure Blade   | Weapon    | +20% damage                       | 200   |
| Inferno Blade | Weapon    | +40% damage + burn                | 450   |
| HP Vial       | Consumable| Heal 30 HP (3 uses)               | 150   |
| Shield Orb    | Consumable| Blok 1 hit selama 4 detik (2 uses)| 250   |
| Rage Serum    | Consumable| +60% speed, +50% dmg, 6 det (2x) | 350   |
| Cyber Boots   | Passive   | +25% speed permanen               | 300   |
| Nano Armor    | Passive   | -20% damage diterima              | 400   |
| Dual Strike   | Passive   | 30% chance double hit             | 500   |
