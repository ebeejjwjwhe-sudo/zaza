# CloudNexus Deployer & Thinking Copilot

Firebase canlı explorer + Gemini / xAI Grok Thinking Copilot + **tek tıkla GitHub → Vercel deploy**.

## Ne yaptım / Ne değişti

1. **Firebase online**  
   Settings → Firebase config alanlarını doldur → "Bağlantıyı Kaydet ve Aktive Et".  
   Artık gerçek Firestore'a live `onSnapshot` + CRUD çalışır (sandbox da hâlâ duruyor).

2. **Google API veya benim (xAI Grok) API**  
   - Settings veya Copilot banner'ından API key yapıştır.  
   - Copilot sekmesinde **Provider** seç: `Google Gemini` veya `xAI Grok (benim API)`.  
   - Model listesi provider'a göre değişir.

3. **Site üzerinden yazı yazıp diğer siteyi Vercel'den güncelle**  
   - Settings → **GitHub → Vercel Otomatik Deploy** bölümüne:
     - GitHub PAT (`repo` scope)
     - Owner (kullanıcı adın)
     - Repo adı (güncellemek istediğin site / TTRPG app)
   - Sol taraftaki **"GitHub Push ve Vercel Build Başlat"** butonuna bas.
   - Sistem `deploy-trigger.txt` dosyasını o repoda günceller → Vercel otomatik rebuild alır.
   - **Sen hiçbir git / terminal / Vercel CLI açmazsın.**

4. **ZIP / TAR indir**  
   Settings altındaki butonlar artık **anlık** çalışan zip üretir (eski public/workspace.zip bağımlılığı kalktı).

## Hızlı başlangıç

```bash
npm install
# .env içine istersen GEMINI_API_KEY=... veya XAI_API_KEY=... koy (opsiyonel, UI'dan da girilir)
npm run dev
```

Tarayıcıda http://localhost:3000

1. Settings → Firebase config + Save  
2. Settings → API key (Gemini veya xAI) + Save  
3. Settings → GitHub PAT + owner + repo + (otomatik kaydedilir)  
4. Sol buton → gerçek deploy trigger  
5. Copilot'tan "TTRPG character death effect nasıl yaparım?" diye sor

## Notlar

- PAT ve API key'ler sadece **localStorage**'da durur, sunucuya yazılmaz.  
- Gerçek push için Vercel projenin o GitHub reposuna bağlı olması gerekir.  
- Model isimleri 2026'ya göre (gemini-2.5-*, grok-3). Çalışmayan isim görürsen Settings'ten değiştir.
