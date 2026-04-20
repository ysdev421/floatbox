import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEFAULTS = {
  autoClearDays: 7 as number | null,
  theme: 'dark' as 'dark' | 'light',
  notificationsEnabled: true as boolean,
}

export function useSettings(uid: string) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setSettings(DEFAULTS)
      setOnboarded(true)
      setLoading(false)
      return
    }

    const ref = doc(db, 'users', uid)
    const unsub = onSnapshot(ref, snap => {
      const data = snap.exists() ? snap.data() : {}
      if (data.settings) setSettings({ ...DEFAULTS, ...data.settings })
      setOnboarded(data.onboarded === true)
      setLoading(false)
    })
    return unsub
  }, [uid])

  async function updateSettings(patch: Partial<typeof DEFAULTS>) {
    await setDoc(doc(db, 'users', uid), { settings: { ...settings, ...patch } }, { merge: true })
  }

  async function completeOnboarding() {
    await setDoc(doc(db, 'users', uid), { onboarded: true }, { merge: true })
  }

  return { settings, loading, onboarded, updateSettings, completeOnboarding }
}
