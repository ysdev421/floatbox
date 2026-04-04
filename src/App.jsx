import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const STORAGE_KEY = 'floatbox_items'

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function App() {
  const [items, setItems] = useState(loadItems)
  const [text, setText] = useState('')
  const [type, setType] = useState('must') // 'must' | 'want'
  const [filter, setFilter] = useState('all') // 'all' | 'must' | 'want'
  const [showDone, setShowDone] = useState(false)
  const [completing, setCompleting] = useState(new Set()) // アニメーション中のID
  const inputRef = useRef(null)

  useEffect(() => {
    saveItems(items)
  }, [items])

  // アプリ起動時に即フォーカス
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function addItem(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const newItem = {
      id: Date.now(),
      text: trimmed,
      type,
      done: false,
      createdAt: new Date().toISOString(),
    }
    setItems(prev => [newItem, ...prev])
    setText('')
    inputRef.current?.focus()
  }

  function toggleDone(id) {
    const item = items.find(i => i.id === id)
    if (!item) return

    if (!item.done) {
      // 完了にする：アニメーションを挟んでからdone=trueに
      setCompleting(prev => new Set(prev).add(id))
      setTimeout(() => {
        setItems(prev =>
          prev.map(i => i.id === id ? { ...i, done: true } : i)
        )
        setCompleting(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 500)
    } else {
      // 未完了に戻す：即座に
      setItems(prev =>
        prev.map(i => i.id === id ? { ...i, done: false } : i)
      )
    }
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const activeItems = items.filter(item => {
    if (item.done) return false
    if (filter === 'all') return true
    return item.type === filter
  })

  const doneItems = items.filter(item => item.done)

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="header">
        <span className="logo">FloatBox</span>
        <span className="count">{activeItems.length}件</span>
      </header>

      {/* 入力エリア */}
      <form className="capture" onSubmit={addItem}>
        <div className="type-toggle">
          <button
            type="button"
            className={`type-btn must ${type === 'must' ? 'active' : ''}`}
            onClick={() => setType('must')}
          >
            やらなきゃ
          </button>
          <button
            type="button"
            className={`type-btn want ${type === 'want' ? 'active' : ''}`}
            onClick={() => setType('want')}
          >
            やりたい
          </button>
        </div>
        <div className="input-row">
          <input
            ref={inputRef}
            className="input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="頭の中にあることを吐き出す..."
            autoComplete="off"
          />
          <button className="submit-btn" type="submit" disabled={!text.trim()}>
            追加
          </button>
        </div>
      </form>

      {/* フィルター */}
      <div className="filters">
        {['all', 'must', 'want'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'すべて' : f === 'must' ? 'やらなきゃ' : 'やりたい'}
          </button>
        ))}
      </div>

      {/* リスト */}
      <main className="list">
        {activeItems.length === 0 && (
          <p className="empty">
            {filter === 'all'
              ? '頭の中をスッキリさせよう'
              : 'このカテゴリはクリア！'}
          </p>
        )}
        {activeItems.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            completing={completing.has(item.id)}
            onToggle={toggleDone}
            onDelete={deleteItem}
          />
        ))}

        {/* 完了済み */}
        {doneItems.length > 0 && (
          <button
            className="done-toggle"
            onClick={() => setShowDone(v => !v)}
          >
            完了済み {doneItems.length}件 {showDone ? '▲' : '▼'}
          </button>
        )}
        {showDone &&
          doneItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onToggle={toggleDone}
              onDelete={deleteItem}
            />
          ))}
      </main>
    </div>
  )
}

function ItemCard({ item, completing, onToggle, onDelete }) {
  const cls = [
    'card',
    item.type,
    item.done ? 'done' : '',
    completing ? 'completing' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <button
        className={`check-btn ${completing ? 'popping' : ''}`}
        onClick={() => onToggle(item.id)}
        aria-label={item.done ? '未完了に戻す' : '完了にする'}
        disabled={completing}
      >
        {(item.done || completing) ? '✓' : ''}
      </button>
      <div className="card-body">
        <span className={`tag ${item.type}`}>
          {item.type === 'must' ? 'やらなきゃ' : 'やりたい'}
        </span>
        <p className="card-text">{item.text}</p>
      </div>
      <button
        className="delete-btn"
        onClick={() => onDelete(item.id)}
        aria-label="削除"
      >
        ×
      </button>
    </div>
  )
}
