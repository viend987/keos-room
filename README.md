# Keos Room

> Tactical 2D Pixel-Art Virtual Office & Multi-Harness AI Telemetry Visualizer

Keos Room mengubah eksekusi tugas AI assistant (baca file, ngetik kode, run unit test, browsing, error debugging, panggil subagent) menjadi animasi kantor virtual 2D interaktif bergaya *Kairosoft (Game Dev Story)*.

---

## Fitur Utama

- **Single Process & Single Port (`4040`)**: Frontend (Vite Canvas 2D engine) dan Backend (Express, WebSocket hub, filesystem watcher daemon) berjalan bersamaan dalam 1 perintah (`npm start` atau `npm run dev`).
- **100% Zero-Emoji Policy**: Bebas emoji Unicode. Menggunakan retro pixel sprites, hardware LED status indicator, dan monospace badge seperti `[PLAN]`, `[IO_WRITE]`, `[EXEC_TEST]`, `[ERR_ALERT]`, `[SUB_SPAWN]`.
- **Universal Multi-Harness Auto-Discovery**:
  - **Antigravity (AGY)**: IDE, CLI, Desktop, VS Code Extension (`~/.gemini/antigravity-*/brain/`)
  - **Claude Code**: CLI, VS Code Extension, Desktop (`~/.claude/projects/`)
  - **OpenCode & Codex**: Sessions & CLI (`~/.opencode/`, `~/.codex/`)
  - **Kiro & Kilo**: Sessions & workspaces (`~/.kiro/`, `~/.kilo/`)
  - **Aider**: Chat history (`.aider.chat.history.md`)
  - **Cline & Roo Code**: Global storage tasks (`%APPDATA%/Code/User/globalStorage/`)
- **Native Stdio MCP Server**: Kompatibel dengan semua asisten berkemampuan MCP via `npm run mcp`.
- **REST & WebSocket Ingest**:
  - `POST http://localhost:4040/api/ingest`
  - `ws://localhost:4040`
- **Engine Canvas 2D 60 FPS**:
  - Y-sort depth sorting
  - Smooth camera pan & 2.6x pixel-crisp zoom
  - Animated PC monitors & coffee steam particles
  - Balon dialog RPG typewriter dengan quote lucu bahasa Indonesia
  - Efek suara retro Web Audio API (keyboard klik, steam kopi, buzzer error)

---

## Cara Menjalankan

### Persyaratan
- Node.js v18+
- npm

### 1 Perintah Instan
```powershell
# Install dependencies (hanya pertama kali)
npm install

# Jalankan server & UI visualizer (port 4040)
npm start
# ATAU
npm run dev
```

Buka browser di **[http://localhost:4040](http://localhost:4040)**.

---

## Model Context Protocol (MCP) Setup

Tambahkan ke file konfigurasi MCP asisten Anda (misal Claude Desktop, Cursor, Roo Code, AGY):

```json
{
  "mcpServers": {
    "keos-room": {
      "command": "npx",
      "args": ["-y", "tsx", "D:/github/keos-room/src/server/mcp/KeosMcpServer.ts", "--mcp"]
    }
  }
}
```

---

## REST Ingest API Contoh

```bash
curl -X POST http://localhost:4040/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "harness": "KIRO",
    "account": "developer@local",
    "project": "core-backend",
    "tool": "edit_file",
    "target": "src/auth.ts",
    "message": "Memperbaiki token authentication"
  }'
```

---

## Pengujian & Build

```powershell
# Jalankan unit tests
npm test

# Jalankan automated visual Playwright test
npm run test:visual

# Build bundle client production
npm run build
```
