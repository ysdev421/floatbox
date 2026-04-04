import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { credential } from 'firebase-admin'

// Firebase Admin 初期化（Vercelのサーバーサイド）
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { uid, subscription } = req.body
  if (!uid || !subscription) return res.status(400).json({ error: 'missing params' })

  await db.collection('users').doc(uid).collection('subscriptions').add({
    subscription,
    createdAt: new Date(),
  })

  res.status(200).json({ ok: true })
}
