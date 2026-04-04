import webpush from 'web-push'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { credential } from 'firebase-admin'

if (!getApps().length) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

export default async function handler(req, res) {
  // Vercel Cron からの呼び出しを検証
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end()
  }

  const hour = new Date().getUTCHours() // UTC時間
  // JST 朝8時 = UTC 23時、夜21時 = UTC 12時
  const isMorning = hour === 23
  const isEvening = hour === 12
  if (!isMorning && !isEvening) return res.status(200).json({ skipped: true })

  const payload = JSON.stringify({
    title: 'FloatBox',
    body: isMorning
      ? '今日のモヤモヤを吐き出しておこう ☀️'
      : '今日のモヤモヤ、整理できた？ 🌙',
  })

  // 全ユーザーのサブスクリプションを取得して送信
  const usersSnap = await db.collection('users').listDocuments()
  const results = await Promise.allSettled(
    usersSnap.map(async userRef => {
      const subsSnap = await userRef.collection('subscriptions').get()
      return Promise.allSettled(
        subsSnap.docs.map(doc => {
          const { subscription } = doc.data()
          return webpush.sendNotification(subscription, payload).catch(async e => {
            // 無効なサブスクリプションは削除
            if (e.statusCode === 410) await doc.ref.delete()
          })
        })
      )
    })
  )

  res.status(200).json({ ok: true, users: results.length })
}
