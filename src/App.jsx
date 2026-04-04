import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { auth, provider } from './firebase'
import { useItems } from './hooks/useItems'
import { usePush } from './hooks/usePush'
import './App.css'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [error, setError] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null), e => {
      setError(e.message)
    })
  }, [])

  if (error) return <div className="loading error">{error}</div>
  if (user === undefined) return <div className="loading">読み込み中...</div>
  if (!user) return <LoginScreen />
  return <MainApp user={user} />
}

function LoginScreen() {
  const [error, setError] = useState(null)

  async function login() {
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      setError(e.message)
    }
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
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  )
}

function MainApp({ user }) {
  const { items, loading, addItem, toggleDone, updateMemo, deleteItem, reorder } = useItems(user.uid)
  const { permission, subscribe } = usePush(user.uid)
  const [text, setText] = useState('')
  const [type, setType] = useState('must')
  const [filter, setFilter] = useState('all')
  const [showDone, setShowDone] = useState(false)
  const [completing, setCompleting] = useState(new Set())
  const [localItems, setLocalItems] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
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

  // dnd-kit センサー（ドラッグハンドル限定にするため activationConstraint を使う）
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeItems = localItems.filter(i => !i.done)
    const oldIndex = activeItems.findIndex(i => i.id === active.id)
    const newIndex = activeItems.findIndex(i => i.id === over.id)
    const reordered = arrayMove(activeItems, oldIndex, newIndex)

    // 楽観的更新
    setLocalItems([...reordered, ...localItems.filter(i => i.done)])
    reorder(reordered.map(i => i.id))
  }

  const activeItems = localItems.filter(item => {
    if (item.done) return false
    if (filter === 'all') return true
    return item.type === filter
  })

  const doneItems = localItems.filter(item => item.done)

  return (
    <div className="app">
      <header className="header">
        <span className="logo">FloatBox</span>
        <div className="header-right">
          <span className="count">{activeItems.length}件</span>
          {permission !== 'granted' && permission !== 'unsupported' && (
            <button className="notify-btn" onClick={subscribe} title="通知をオンにする">🔔</button>
          )}
          <button className="logout-btn" onClick={() => signOut(auth)}>ログアウト</button>
        </div>
      </header>

      <form className="capture" onSubmit={handleAdd}>
        <div className="type-toggle">
          <button type="button" className={`type-btn must ${type === 'must' ? 'active' : ''}`} onClick={() => setType('must')}>
            やらなきゃ
          </button>
          <button type="button" className={`type-btn want ${type === 'want' ? 'active' : ''}`} onClick={() => setType('want')}>
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
          <button className="submit-btn" type="submit" disabled={!text.trim()}>追加</button>
        </div>
      </form>

      <div className="filters">
        {['all', 'must', 'want'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'すべて' : f === 'must' ? 'やらなきゃ' : 'やりたい'}
          </button>
        ))}
      </div>

      <main className="list">
        {loading && <p className="empty">読み込み中...</p>}
        {!loading && activeItems.length === 0 && (
          <p className="empty">{filter === 'all' ? '頭の中をスッキリさせよう' : 'このカテゴリはクリア！'}</p>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {activeItems.map(item => (
              <SortableCard
                key={item.id}
                item={item}
                completing={completing.has(item.id)}
                onToggle={handleToggle}
                onDelete={deleteItem}
                onMemo={updateMemo}
              />
            ))}
          </SortableContext>
        </DndContext>

        {doneItems.length > 0 && (
          <button className="done-toggle" onClick={() => setShowDone(v => !v)}>
            完了済み {doneItems.length}件 {showDone ? '▲' : '▼'}
          </button>
        )}
        {showDone && doneItems.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            completing={false}
            onToggle={handleToggle}
            onDelete={deleteItem}
            onMemo={updateMemo}
          />
        ))}
      </main>
    </div>
  )
}

// dnd-kit のソータブルラッパー
function SortableCard({ item, completing, onToggle, onDelete, onMemo }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }
  return (
    <ItemCard
      item={item}
      completing={completing}
      onToggle={onToggle}
      onDelete={onDelete}
      onMemo={onMemo}
      dragRef={setNodeRef}
      dragStyle={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  )
}

function ItemCard({ item, completing, onToggle, onDelete, onMemo, dragRef, dragStyle, dragHandleProps }) {
  const [expanded, setExpanded] = useState(false)
  const [memo, setMemo] = useState(item.memo ?? '')
  const [swipeX, setSwipeX] = useState(0)
  const touchStart = useRef(null)
  const memoRef = useRef(null)

  // メモをアイテムが変わったら同期
  useEffect(() => { setMemo(item.memo ?? '') }, [item.memo])

  function handleMemoBlur() {
    if (memo !== (item.memo ?? '')) {
      onMemo(item.id, memo)
    }
  }

  function handleExpandToggle() {
    setExpanded(v => {
      if (!v) setTimeout(() => memoRef.current?.focus(), 50)
      return !v
    })
  }

  // スワイプ処理
  function handleTouchStart(e) {
    touchStart.current = e.touches[0].clientX
  }

  function handleTouchMove(e) {
    if (touchStart.current === null) return
    const dx = e.touches[0].clientX - touchStart.current
    // 左右50pxまでスワイプ
    setSwipeX(Math.max(-80, Math.min(80, dx)))
  }

  function handleTouchEnd() {
    if (swipeX > 60) {
      // 右スワイプ → 完了
      onToggle(item.id, item.done)
    } else if (swipeX < -60) {
      // 左スワイプ → 削除
      onDelete(item.id)
    }
    setSwipeX(0)
    touchStart.current = null
  }

  const cls = ['card', item.type, item.done ? 'done' : '', completing ? 'completing' : ''].filter(Boolean).join(' ')

  return (
    <div
      ref={dragRef}
      style={{
        ...dragStyle,
        transform: `${dragStyle?.transform ?? ''} translateX(${swipeX}px)`,
      }}
      className={cls}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ドラッグハンドル */}
      <button className="drag-handle" {...dragHandleProps} aria-label="並び替え">⠿</button>

      {/* チェックボタン */}
      <button
        className={`check-btn ${completing ? 'popping' : ''}`}
        onClick={() => onToggle(item.id, item.done)}
        disabled={completing}
        aria-label={item.done ? '未完了に戻す' : '完了にする'}
      >
        {(item.done || completing) ? '✓' : ''}
      </button>

      {/* 本文 */}
      <div className="card-body" onClick={handleExpandToggle}>
        <div className="card-top">
          <span className={`tag ${item.type}`}>{item.type === 'must' ? 'やらなきゃ' : 'やりたい'}</span>
          <span className="expand-icon">{expanded ? '▲' : (item.memo ? '📝' : '▼')}</span>
        </div>
        <p className="card-text">{item.text}</p>
        {expanded && (
          <textarea
            ref={memoRef}
            className="memo-input"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            onBlur={handleMemoBlur}
            onClick={e => e.stopPropagation()}
            placeholder="メモを追加..."
            rows={2}
          />
        )}
      </div>

      {/* 削除 */}
      <button className="delete-btn" onClick={() => onDelete(item.id)} aria-label="削除">×</button>
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
