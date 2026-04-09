import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  DndContext,
  closestCenter,
  MouseSensor,
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
import { useSettings } from './hooks/useSettings'
import './App.css'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [error, setError] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null), e => {
      setError(e.message)
    })
  }, [])

  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !localStorage.getItem('floatbox_onboarded')) {
      setShowOnboarding(true)
    }
  }, [user])

  function finishOnboarding() {
    localStorage.setItem('floatbox_onboarded', '1')
    setShowOnboarding(false)
  }

  if (error) return <div className="loading error">{error}</div>
  if (user === undefined) return <div className="loading">読み込み中...</div>
  if (!user) return <LoginScreen />
  if (showOnboarding) return <Onboarding onDone={finishOnboarding} />
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
  const { settings, updateSettings } = useSettings(user.uid)
  const { items, loading, addItem, toggleDone, updateMemo, updateDueDate, deleteItem, reorder } = useItems(user.uid, settings.autoClearDays)
  const { permission, subscribe } = usePush(user.uid)
  const [text, setText] = useState('')
  const [type, setType] = useState('must')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'
  const [showDone, setShowDone] = useState(false)
  const [completing, setCompleting] = useState(new Set())
  const [localItems, setLocalItems] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setLocalItems(prev => {
      if (prev.length === 0) return items
      const inSnap = new Map(items.map(i => [i.id, i]))
      const prevIds = new Set(prev.map(i => i.id))
      // 既存アイテムはデータを更新しつつ順序を保持、削除されたものは除く
      const updated = prev
        .filter(i => inSnap.has(i.id))
        .map(i => ({ ...i, ...inSnap.get(i.id) }))
      // Firestore に新しく現れたアイテムを先頭に追加
      const brandNew = items.filter(i => !prevIds.has(i.id))
      return [...brandNew, ...updated]
    })
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
  // MouseSensor のみ → タッチイベントを一切横取りしない
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
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
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="設定">⚙</button>
          <button className="logout-btn" onClick={() => signOut(auth)}>ログアウト</button>
        </div>
      </header>

      <form className="capture" onSubmit={handleAdd}>
        <div className="type-toggle">
          <button type="button" className={`type-btn must ${type === 'must' ? 'active' : ''}`} onClick={() => setType('must')}>
            Must
          </button>
          <button type="button" className={`type-btn want ${type === 'want' ? 'active' : ''}`} onClick={() => setType('want')}>
            Want
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

      <div className="toolbar">
        <div className="filters">
          {['all', 'must', 'want'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'must' ? 'Must' : 'Want'}
            </button>
          ))}
        </div>
        <div className="view-toggle">
          {[
            { key: 'list',     label: '一覧' },
            { key: 'calendar', label: 'カレンダー' },
          ].map(v => (
            <button key={v.key} className={`view-btn ${viewMode === v.key ? 'active' : ''}`} onClick={() => setViewMode(v.key)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <main className="list">
        {loading && <p className="empty">読み込み中...</p>}

        {!loading && viewMode === 'list' && (
          <>
            <TimelineView
              items={activeItems}
              completing={completing}
              onToggle={handleToggle}
              onDelete={deleteItem}
              onMemo={updateMemo}
              onDueDate={updateDueDate}
            />
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
                onDueDate={updateDueDate}
              />
            ))}
          </>
        )}

        {!loading && viewMode === 'calendar' && (
          <CalendarView
            items={activeItems}
            completing={completing}
            onToggle={handleToggle}
            onDelete={deleteItem}
            onMemo={updateMemo}
            onDueDate={updateDueDate}
          />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

// ===== 時間軸グループ =====
const TL_GROUPS = [
  { key: 'overdue', label: '期限切れ' },
  { key: 'today',   label: '今日' },
  { key: 'week',    label: '今週' },
  { key: 'month',   label: '今月' },
  { key: 'later',   label: 'それ以降' },
  { key: 'noDate',  label: '日付なし' },
]

function groupByTimeline(items) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const g = { overdue: [], today: [], week: [], month: [], later: [], noDate: [] }
  items.forEach(item => {
    if (!item.dueDate) { g.noDate.push(item); return }
    const due = new Date(item.dueDate)
    due.setHours(0, 0, 0, 0)
    const diff = Math.round((due - today) / 86400000)
    if (diff < 0)       g.overdue.push(item)
    else if (diff === 0) g.today.push(item)
    else if (diff <= 7)  g.week.push(item)
    else if (diff <= 31) g.month.push(item)
    else                 g.later.push(item)
  })
  return g
}

function TimelineView({ items, completing, onToggle, onDelete, onMemo, onDueDate }) {
  const groups = groupByTimeline(items)
  const hasAny = TL_GROUPS.some(g => groups[g.key].length > 0)
  if (!hasAny) return <p className="empty">タスクがありません</p>
  return (
    <div className="timeline-view">
      {TL_GROUPS.map(({ key, label }) => {
        const list = groups[key]
        if (list.length === 0) return null
        return (
          <div key={key} className={`tl-group tl-${key}`}>
            <div className="tl-header">
              <span className="tl-label">{label}</span>
              <span className="tl-count">{list.length}</span>
            </div>
            {list.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                completing={completing.has(item.id)}
                onToggle={onToggle}
                onDelete={onDelete}
                onMemo={onMemo}
                onDueDate={onDueDate}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ===== カレンダービュー =====
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function CalendarView({ items, completing, onToggle, onDelete, onMemo, onDueDate }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate())

  // 日付→アイテムのマップ
  const byDate = {}
  items.forEach(item => {
    if (item.dueDate) {
      if (!byDate[item.dueDate]) byDate[item.dueDate] = []
      byDate[item.dueDate].push(item)
    }
  })
  const noDateItems = items.filter(i => !i.dueDate)

  // カレンダーグリッド
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : []

  return (
    <div className="calendar-view">
      <div className="cal-nav-bar">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-month">{year}年{month + 1}月</span>
        <button className="cal-nav" onClick={nextMonth}>›</button>
      </div>

      <div className="cal-grid">
        {DOW_LABELS.map((d, i) => (
          <div key={d} className={`cal-dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="cal-cell empty" />
          const ds = toDateStr(year, month, day)
          const dayItems = byDate[ds] ?? []
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate
          const mustCount = dayItems.filter(it => it.type === 'must').length
          const wantCount = dayItems.filter(it => it.type === 'want').length
          const dow = (firstDow + day - 1) % 7
          return (
            <div
              key={day}
              className={[
                'cal-cell',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
                dayItems.length ? 'has-items' : '',
                dow === 0 ? 'sun' : dow === 6 ? 'sat' : '',
              ].filter(Boolean).join(' ')}
              onClick={e => { e.stopPropagation(); setSelectedDate(isSelected ? null : ds) }}
            >
              <span className="cal-day-num">{day}</span>
              {dayItems.length > 0 && (
                <div className="cal-dots">
                  {mustCount > 0 && <span className="cal-dot must" />}
                  {wantCount > 0 && <span className="cal-dot want" />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div className="cal-detail">
          <p className="cal-detail-title">
            {selectedDate.replace(/^\d{4}-(\d{2})-(\d{2})$/, '$1/$2')}
            {selectedItems.length > 0 ? ` · ${selectedItems.length}件` : ''}
          </p>
          {selectedItems.length === 0
            ? <p className="empty" style={{ padding: '12px 0' }}>この日の予定はなし</p>
            : selectedItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  completing={completing.has(item.id)}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onMemo={onMemo}
                  onDueDate={onDueDate}
                />
              ))
          }
        </div>
      )}

      {noDateItems.length > 0 && (
        <div className="cal-no-date">
          <p className="cal-detail-title">日付なし · {noDateItems.length}件</p>
          {noDateItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              completing={completing.has(item.id)}
              onToggle={onToggle}
              onDelete={onDelete}
              onMemo={onMemo}
              onDueDate={onDueDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ===== 設定モーダル =====
const AUTO_CLEAR_OPTIONS = [
  { value: null, label: '削除しない' },
  { value: 1,    label: '1日後' },
  { value: 3,    label: '3日後' },
  { value: 7,    label: '7日後' },
  { value: 30,   label: '30日後' },
]

function SettingsModal({ settings, onUpdate, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">設定</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-section">
          <p className="modal-section-title">完了済みの自動削除</p>
          <p className="modal-section-desc">チェックしてから指定の日数が経つと自動で削除されます</p>
          <div className="settings-options">
            {AUTO_CLEAR_OPTIONS.map(opt => (
              <button
                key={String(opt.value)}
                className={`settings-option ${settings.autoClearDays === opt.value ? 'active' : ''}`}
                onClick={() => onUpdate({ autoClearDays: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// dnd-kit のソータブルラッパー
function SortableCard({ item, completing, onToggle, onDelete, onMemo, onDueDate }) {
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
      onDueDate={onDueDate}
      dragRef={setNodeRef}
      dragStyle={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  )
}

// 期限ラベルのロジック
function getDueDateLabel(dueDate) {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, status: 'overdue' }
  if (diff === 0) return { label: '今日', status: 'today' }
  if (diff <= 3) return { label: `あと${diff}日`, status: 'soon' }
  return { label: `${due.getMonth() + 1}/${due.getDate()}`, status: 'normal' }
}

function ItemCard({ item, completing, onToggle, onDelete, onMemo, onDueDate, dragRef, dragStyle, dragHandleProps }) {
  const [expanded, setExpanded] = useState(false)
  const [memo, setMemo] = useState(item.memo ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const memoRef = useRef(null)

  useEffect(() => { setMemo(item.memo ?? '') }, [item.memo])

  function handleMemoBlur() {
    if (memo !== (item.memo ?? '')) onMemo(item.id, memo)
  }

  function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (!next) setConfirmDelete(false)
    if (next) setTimeout(() => memoRef.current?.focus(), 50)
  }

  const cls = ['card', item.type, item.done ? 'done' : '', completing ? 'completing' : ''].filter(Boolean).join(' ')

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      className={cls}
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
      <div className="card-body">
        <div className="card-top">
          <span className={`tag ${item.type}`}>{item.type === 'must' ? 'Must' : 'Want'}</span>
          <button className="expand-btn" onClick={handleExpand}>
            {expanded ? '▲' : (item.memo || item.dueDate ? '📝' : '···')}
          </button>
        </div>
        <p className="card-text">{item.text}</p>

        {item.dueDate && !expanded && (() => {
          const d = getDueDateLabel(item.dueDate)
          return <span className={`due-badge ${d.status}`}>{d.label}</span>
        })()}

        {expanded && (
          <div className="expand-area">
            <label className="due-label">
              期限
              <input
                type="date"
                className="due-input"
                value={item.dueDate ?? ''}
                onChange={e => onDueDate(item.id, e.target.value || null)}
              />
              {item.dueDate && (
                <button className="due-clear" onClick={() => onDueDate(item.id, null)}>×</button>
              )}
            </label>
            <textarea
              ref={memoRef}
              className="memo-input"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              onBlur={handleMemoBlur}
              placeholder="メモを追加..."
              rows={2}
            />
            {/* 削除（展開時のみ・確認あり） */}
            {!confirmDelete ? (
              <button className="delete-area-btn" onClick={() => setConfirmDelete(true)}>
                削除
              </button>
            ) : (
              <div className="delete-confirm">
                <span className="delete-confirm-text">本当に削除しますか？</span>
                <button className="delete-confirm-yes" onClick={() => onDelete(item.id)}>削除する</button>
                <button className="delete-confirm-no" onClick={() => setConfirmDelete(false)}>キャンセル</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 空状態 =====
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="42" width="48" height="26" rx="6" stroke="#5e6ad2" strokeWidth="3"/>
          <line x1="40" y1="14" x2="40" y2="46" stroke="#5e6ad2" strokeWidth="3" strokeLinecap="round"/>
          <polyline points="28,36 40,48 52,36" stroke="#5e6ad2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="30" cy="56" r="3" fill="#5e6ad2" opacity="0.4"/>
          <circle cx="40" cy="56" r="3" fill="#5e6ad2" opacity="0.65"/>
          <circle cx="50" cy="56" r="3" fill="#5e6ad2"/>
        </svg>
      </div>
      <p className="empty-title">頭の中を吐き出そう</p>
      <p className="empty-desc">
        やらなきゃいけないこと、やりたいこと<br />
        言語化できなくてもOK。<br />
        とにかく入力して外に出す。
      </p>
      <div className="empty-hints">
        <div className="hint"><span className="hint-key">やらなきゃ</span>締め切りや義務感があるもの</div>
        <div className="hint"><span className="hint-key">やりたい</span>興味・やってみたいこと</div>
      </div>
    </div>
  )
}

// ===== オンボーディング =====
const SLIDES = [
  {
    icon: '🌀',
    title: '頭がごちゃごちゃしてる？',
    desc: '未完了のことは脳に居座り続けます。\nやらなきゃ・やりたいが混在して\nモヤモヤが消えない状態、それが「メンタルクラッター」。',
  },
  {
    icon: '📤',
    title: 'まず、全部吐き出す',
    desc: '言語化できなくていい。\nとにかく入力して頭の外に出すことで\n脳の負荷がすっと下がります。',
  },
  {
    icon: '✅',
    title: 'やらなきゃ と やりたい を分ける',
    desc: '2種類のモヤモヤを同じ場所で管理。\n吐き出した後で分類して、\n一つずつ消していこう。',
  },
]

function Onboarding({ onDone }) {
  const [slide, setSlide] = useState(0)
  const current = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  return (
    <div className="onboarding">
      <button className="ob-skip" onClick={onDone}>スキップ</button>

      <div className="ob-content">
        <div className="ob-icon">{current.icon}</div>
        <h2 className="ob-title">{current.title}</h2>
        <p className="ob-desc">{current.desc}</p>
      </div>

      <div className="ob-footer">
        <div className="ob-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`ob-dot ${i === slide ? 'active' : ''}`} />
          ))}
        </div>
        <button
          className="ob-next"
          onClick={() => isLast ? onDone() : setSlide(s => s + 1)}
        >
          {isLast ? 'はじめる' : '次へ'}
        </button>
      </div>
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
