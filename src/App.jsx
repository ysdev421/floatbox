import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, provider } from './firebase'
import { useItems } from './hooks/useItems'
import './App.css'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null))
  }, [])

  if (user === undefined) return <div className="loading">読み込み中...</div>
  if (!user) return <LoginScreen />
  return <MainApp user={user} />
}

function LoginScreen() {
  function login() {
    signInWithPopup(auth, provider).catch(console.error)
  }
  return (
    <div className="login-screen">
      <div className="login-box">
        <h1 className="logo">FloatBox</h1>
        <p className="login-desc">頭の中のモヤモヤを吐き出そう</p>
        <button className="google-btn" onClick={login}>
          <GoogleIcon />
          Google でログイン
        </button>
      </div>
    </div>
  )
}

function MainApp({ user }) {
  const { items, loading, addItem, toggleDone, deleteItem } = useItems(user.uid)
  const [text, setText] = useState('')
  const [type, setType] = useState('must')
  const [filter, setFilter] = useState('all')
  const [showDone, setShowDone] = useState(false)
  const [completing, setCompleting] = useState(new Set())
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [loading])

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    inputRef.current?.focus()
    await addItem({ text: trimmed, type })
  }

  async function handleToggle(id, currentDone) {
    if (currentDone) {
      await toggleDone(id, true)
      return
    }
    setCompleting(prev => new Set(prev).add(id))
    setTimeout(async () => {
      await toggleDone(id, false)
      setCompleting(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 500)
  }

  const activeItems = items.filter(item => {
    if (item.done) return false
    if (filter === 'all') return true
    return item.type === filter
  })

  const doneItems = items.filter(item => item.done)

  return (
    <div className="app">
      <header className="header">
        <span className="logo">FloatBox</span>
        <div className="header-right">
          <span className="count">{activeItems.length}件</span>
          <button className="avatar-btn" onClick={() => signOut(auth)} title="ログアウト">
            <img src={user.photoURL} alt={user.displayName} className="avatar" />
          </button>
        </div>
      </header>

      <form className="capture" onSubmit={handleAdd}>
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

      <main className="list">
        {loading && <p className="empty">読み込み中...</p>}

        {!loading && activeItems.length === 0 && (
          <p className="empty">
            {filter === 'all' ? '頭の中をスッキリさせよう' : 'このカテゴリはクリア！'}
          </p>
        )}

        {activeItems.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            completing={completing.has(item.id)}
            onToggle={handleToggle}
            onDelete={deleteItem}
          />
        ))}

        {doneItems.length > 0 && (
          <button className="done-toggle" onClick={() => setShowDone(v => !v)}>
            完了済み {doneItems.length}件 {showDone ? '▲' : '▼'}
          </button>
        )}
        {showDone &&
          doneItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              completing={false}
              onToggle={handleToggle}
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
        onClick={() => onToggle(item.id, item.done)}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
