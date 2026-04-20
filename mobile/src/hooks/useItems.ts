import { useState, useEffect } from 'react'
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export type ItemType = 'must' | 'want' | 'someday'

export interface Item {
  id: string
  text: string
  type: ItemType
  done: boolean
  memo: string
  dueDate?: string | null
  order?: number
  createdAt?: any
  doneAt?: any
}

import { useNotifications } from './useNotifications'

export function useItems(uid: string, autoClearDays: number | null, notificationsEnabled: boolean = true) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const { scheduleTaskNotification, cancelTaskNotification } = useNotifications(notificationsEnabled)

  useEffect(() => {
    if (!uid) {
      setItems([])
      setLoading(false)
      return
    }

    const q = query(collection(db, 'users', uid, 'items'))

    const unsub = onSnapshot(
      q,
      snapshot => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Item[]

        if (autoClearDays != null) {
          const cutoff = Date.now() - autoClearDays * 86400000
          docs.forEach(item => {
            if (item.done && item.doneAt) {
              const doneMs = item.doneAt.toMillis?.() ?? 0
              if (doneMs < cutoff) {
                deleteDoc(doc(db, 'users', uid, 'items', item.id))
              }
            }
          })
        }

        docs.sort((a, b) => {
          const aHasOrder = a.order != null
          const bHasOrder = b.order != null
          if (aHasOrder && bHasOrder) return (a.order ?? 0) - (b.order ?? 0)
          if (aHasOrder) return -1
          if (bHasOrder) return 1
          const aTime = a.createdAt?.toMillis?.() ?? 0
          const bTime = b.createdAt?.toMillis?.() ?? 0
          return bTime - aTime
        })
        setItems(docs)
        setLoading(false)
      },
      err => console.error('[useItems] snapshot error:', err)
    )

    return unsub
  }, [uid, autoClearDays])

  async function addItem({ text, type }: { text: string; type: ItemType }) {
    const minOrder =
      items.length > 0
        ? Math.min(...items.filter(i => !i.done).map(i => i.order ?? 0))
        : 0
    await addDoc(collection(db, 'users', uid, 'items'), {
      text,
      type,
      done: false,
      memo: '',
      order: minOrder - 1000,
      createdAt: serverTimestamp(),
    })
  }

  async function toggleDone(id: string, currentDone: boolean) {
    const patch: any = { done: !currentDone }
    if (currentDone) {
      patch.doneAt = null
    } else {
      patch.doneAt = serverTimestamp()
      cancelTaskNotification(id)
    }
    await updateDoc(doc(db, 'users', uid, 'items', id), patch)
  }

  async function updateMemo(id: string, memo: string) {
    await updateDoc(doc(db, 'users', uid, 'items', id), { memo })
  }

  async function updateType(id: string, type: ItemType) {
    await updateDoc(doc(db, 'users', uid, 'items', id), { type })
  }

  async function updateText(id: string, text: string) {
    await updateDoc(doc(db, 'users', uid, 'items', id), { text })
  }

  async function updateDueDate(id: string, dueDate: string | null) {
    await updateDoc(doc(db, 'users', uid, 'items', id), { dueDate: dueDate ?? null })
    const item = items.find(i => i.id === id)
    if (dueDate) {
      scheduleTaskNotification(id, item?.text ?? 'タスク', dueDate)
    } else {
      cancelTaskNotification(id)
    }
  }

  async function deleteItem(id: string) {
    await deleteDoc(doc(db, 'users', uid, 'items', id))
    cancelTaskNotification(id)
  }

  async function reorder(orderedIds: string[]) {
    const batch = writeBatch(db)
    orderedIds.forEach((id, index) => {
      batch.update(doc(db, 'users', uid, 'items', id), { order: index * 1000 })
    })
    await batch.commit()
  }

  return { items, loading, addItem, toggleDone, updateMemo, updateType, updateText, updateDueDate, deleteItem, reorder }
}
