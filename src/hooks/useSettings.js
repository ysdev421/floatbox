import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEFAULTS = {
  autoClearDays: 7,
}

export function useSettings(uid) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setSettings(DEFAULTS)
      setLoading(false)
      return
    }

    const ref = doc(db, 'users', uid)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().settings) {
        setSettings({ ...DEFAULTS, ...snap.data().settings })
      }
      setLoading(false)
    })
    return unsub
  }, [uid])

  async function updateSettings(patch) {
    await setDoc(doc(db, 'users', uid), { settings: { ...settings, ...patch } }, { merge: true })
  }

  return { settings, loading, updateSettings }
}
