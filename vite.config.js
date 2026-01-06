import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // 1. 引入套件

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 2. 加入 PWA 設定 (依照您的截圖改寫)
    VitePWA({
      registerType: 'autoUpdate', // 自動更新，使用者不用手動清除快取
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'], // 確保這些圖案有被打包
      manifest: {
        name: '營養翻譯機', // 安裝後的完整名稱
        short_name: '營養翻譯', // 桌面下方顯示的名稱
        description: 'AI 驅動的營養標示分析工具，一眼看穿熱量陷阱。',
        theme_color: '#10b981', // 狀態列顏色 (配合您的綠色 Primary 色)
        background_color: '#ffffff', // 啟動畫面背景色
        display: 'standalone', // 關鍵：隱藏瀏覽器網址列，看起來像原生 App
        icons: [
          {
            src: 'logo.png', // 請確保 public 資料夾有這張圖
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png', // 請確保 public 資料夾有這張圖
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})