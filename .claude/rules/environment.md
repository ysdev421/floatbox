# 環境変数一覧

## .env.local / Vercel 環境変数

Firebase コンソール（プロジェクト設定 → アプリ → SDK 設定）から取得して設定する。

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- ローカル開発: `.env.local` に記載（git 管理外）
- 本番: Vercel の Environment Variables に同じキーで登録