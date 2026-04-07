import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export function useItems(uid) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setItems([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'users', uid, 'items'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, snapshot => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      // orderフィールドがあればそれで、なければcreatedAt順（新しい順）
      docs.sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order
        if (a.order != null) return -1
        if (b.order != null) return 1
        return 0
      })
      setItems(docs)
      setLoading(false)
    })

    return unsub
  }, [uid])

  async function addItem({ text, type }) {
    // 現在の最小order値より小さい値を先頭に
    const minOrder = items.length > 0
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

  async function toggleDone(id, currentDone) {
    await updateDoc(doc(db, 'users', uid, 'items', id), {
      done: !currentDone,
    })
  }

  async function updateMemo(id, memo) {
    await updateDoc(doc(db, 'users', uid, 'items', id), { memo })
  }

  async function updateDueDate(id, dueDate) {
    await updateDoc(doc(db, 'users', uid, 'items', id), { dueDate: dueDate ?? null })
  }

  async function deleteItem(id) {
    await deleteDoc(doc(db, 'users', uid, 'items', id))
  }

  // ドラッグ後の並び順をまとめて書き込む
  async function reorder(orderedIds) {
    const batch = writeBatch(db)
    orderedIds.forEach((id, index) => {
      batch.update(doc(db, 'users', uid, 'items', id), { order: index * 1000 })
    })
    await batch.commit()
  }

  return { items, loading, addItem, toggleDone, updateMemo, updateDueDate, deleteItem, reorder }
}
