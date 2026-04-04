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
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })

    return unsub
  }, [uid])

  async function addItem({ text, type }) {
    await addDoc(collection(db, 'users', uid, 'items'), {
      text,
      type,
      done: false,
      createdAt: serverTimestamp(),
    })
  }

  async function toggleDone(id, currentDone) {
    await updateDoc(doc(db, 'users', uid, 'items', id), {
      done: !currentDone,
    })
  }

  async function deleteItem(id) {
    await deleteDoc(doc(db, 'users', uid, 'items', id))
  }

  return { items, loading, addItem, toggleDone, deleteItem }
}
