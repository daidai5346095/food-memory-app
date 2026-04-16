# Food Memory App

一個適合手機使用的靜態 Web App，用來收藏你喜歡的食物與店家，也方便之後直接從 Google Maps 回去找。

## 功能

- 手動新增 / 編輯 / 刪除資料
- 首頁快速新增，先記店名與必點品項
- 依店名、食物名、地址、備註搜尋
- 依分類篩選
- 依最近更新、最近去吃、評分排序
- Google Maps 一鍵開啟
- JSON / CSV 匯入
- JSON 匯出
- localStorage 本機儲存
- 可安裝成簡易 PWA
- 可直接部署到 GitHub Pages

## 資料欄位

- shopName
- foodName
- category
- address
- googleMapUrl
- rating
- visitedAt
- source
- reason
- note
- revisit

## 本機測試

這是純靜態網站，直接開 `index.html` 就能看。

若要讓 service worker 正常測試，建議用本機靜態伺服器：

### Python

```bash
python -m http.server 5500
```

然後開：

```text
http://localhost:5500
```

## 部署到手機上當 App

這個專案現在是 PWA，所以部署到 HTTPS 網址後，就可以在手機上安裝成接近 App 的形式。

### 最簡單做法：GitHub Pages

這個專案已經有 [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)，直接推到 GitHub 就能部署。

1. 建立一個 GitHub repository
2. 把 `food-memory-app` 資料夾中的檔案放到 repo 根目錄
3. 預設分支使用 `main`
4. push 到 GitHub
5. 到 GitHub repo 的 `Settings > Pages`
6. `Build and deployment` 選 `GitHub Actions`
7. 等待 Actions 跑完，拿到網址後用手機開啟

### Android 安裝方式

1. 用 Chrome 開啟部署後的網址
2. 點選 `加入主畫面` 或 `安裝 App`
3. 安裝後會像獨立 App 一樣從手機桌面打開

### iPhone 安裝方式

1. 用 Safari 開啟部署後的網址
2. 點分享按鈕
3. 選 `加入主畫面`
4. 加到桌面後，就能像 App 一樣全螢幕開啟

### 要注意的事

- 手機安裝版本質上還是 PWA，不是上架到 App Store / Google Play 的原生 App
- 資料目前存在瀏覽器 localStorage，所以同一支手機、同一個瀏覽器裡會保留
- 如果你換手機、清除瀏覽器資料，內容會消失，建議定期匯出 JSON 備份
- 如果你之後想上架到商店，我們可以再把這個 PWA 包成 Capacitor App

## 部署到 GitHub Pages

### 方法 1：直接使用這份 workflow 自動部署

1. 建立一個 GitHub repository
2. 把這個資料夾全部上傳到 repo 根目錄
3. 預設分支使用 `main`
4. 到 GitHub repo：
   - Settings
   - Pages
   - Build and deployment 選 `GitHub Actions`
5. push 到 `main` 後就會自動部署

部署完成後網址通常會是：

```text
https://你的帳號.github.io/你的-repo-name/
```

### 方法 2：不用 Actions，直接 branch 發布

也可以直接把檔案放在 repo，然後在 Pages 裡設定 branch 發布。

## 匯入格式

### JSON

請參考 `sample-food-items.json` 的格式。

### CSV

欄位建議如下：

```csv
shopName,foodName,category,address,googleMapUrl,rating,reason,note,revisit,visitedAt,source
```

## 注意

- 目前資料存在瀏覽器 localStorage，換瀏覽器或清除資料後會消失
- 若未填 `googleMapUrl`，系統會用「店名 + 地址」自動組成 Google Maps 搜尋連結
- 若你之前用舊版本，app 會自動讀取舊的 localStorage 資料
- 這是靜態網站版本，尚未串接雲端資料庫

## 下一步可擴充

- 上傳店家照片
- 收藏標籤系統
- 地區分類
- 雲端同步（Firebase / Supabase）
- 登入功能
- 分享收藏清單
