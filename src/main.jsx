import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Firebase 初期化エラーなどモジュールレベルの例外を画面に表示
window.addEventListener('error', e => {
  document.getElementById('root').innerHTML =
    `<div style="padding:24px;color:#ef4444;font-family:monospace;font-size:13px;white-space:pre-wrap">[ERROR] ${e.message}\n${e.filename}:${e.lineno}</div>`
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
