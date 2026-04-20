import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signOut, onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '../src/firebase'
import { useItems, Item, ItemType } from '../src/hooks/useItems'
import { useSettings } from '../src/hooks/useSettings'
import DateTimePicker from '@react-native-community/datetimepicker'
import Animated, { FadeInDown, LightSpeedInRight, FadeOut, ZoomIn, ZoomOut, Layout } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

import { ThemeContext, COLORS as THEME_COLORS, ThemeType, useTheme } from '../src/theme'
import { StatusBar } from 'expo-status-bar'

const TYPE_LABELS: Record<string, string> = { must: 'Must', want: 'Want', someday: 'Someday' }

export default function MainScreen() {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [text, setText] = useState('')
  const [type, setType] = useState<ItemType>('must')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [filter, setFilter] = useState<ItemType | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)

  const { settings, loading: settingsLoading, updateSettings } = useSettings(user?.uid ?? '')
  const { items, loading, addItem, toggleDone, deleteItem, updateMemo, updateType, updateText, updateDueDate } = useItems(user?.uid ?? '', settings.autoClearDays, settings.notificationsEnabled)

  const theme: ThemeType = (settings.theme as ThemeType) || 'dark'
  const colors = THEME_COLORS[theme]
  const styles = getStyles(colors)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  if (!user || settingsLoading || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  const activeItems = items.filter(i => {
    if (i.done) return false
    if (!filter) return true
    return i.type === filter
  })
  const doneItems = items.filter(i => i.done)

  async function handleAdd() {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    await addItem({ text: trimmed, type })
  }

  return (
    <ThemeContext.Provider value={{ theme, colors }}>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={styles.container} edges={['top']}>


      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>FloatBox</Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{activeItems.length}件</Text>
          <Pressable style={styles.iconBtn} onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={22} color={colors.textSub} />
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={() => signOut(auth)}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </Pressable>
        </View>
      </View>

      {/* Capture Area */}
      <View style={styles.capture}>
        <View style={styles.typeToggle}>
          {(['must', 'want', 'someday'] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.typeBtn, type === t && { backgroundColor: colors[t], borderColor: colors[t] }]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnActive]}>
                {TYPE_LABELS[t]}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="頭の中にあることを吐き出す..."
            placeholderTextColor="#555"
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <Pressable style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]} onPress={handleAdd} disabled={!text.trim()}>
            <Text style={styles.addBtnText}>追加</Text>
          </Pressable>
        </View>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.filters}>
          <Pressable style={[styles.filterBtn, !filter && styles.filterBtnActive]} onPress={() => setFilter(null)}>
            <Text style={[styles.filterBtnText, !filter && styles.filterBtnTextActive]}>All</Text>
          </Pressable>
          {(['must', 'want', 'someday'] as const).map(f => (
            <Pressable key={f} style={[styles.filterBtn, filter === f && { backgroundColor: colors[f] + '33', borderColor: colors[f] }]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterBtnText, filter === f && { color: colors[f] }]}>{TYPE_LABELS[f]}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.viewToggle}>
          <Pressable style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]} onPress={() => setViewMode('list')}>
            <Text style={[styles.viewBtnText, viewMode === 'list' && styles.viewBtnTextActive]}>一覧</Text>
          </Pressable>
          <Pressable style={[styles.viewBtn, viewMode === 'calendar' && styles.viewBtnActive]} onPress={() => setViewMode('calendar')}>
            <Text style={[styles.viewBtnText, viewMode === 'calendar' && styles.viewBtnTextActive]}>カレンダー</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {viewMode === 'list' ? (
          <ListView 
            items={activeItems} 
            doneItems={doneItems} 
            showDone={showDone}
            setShowDone={setShowDone}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onToggle={toggleDone}
            onDelete={deleteItem}
            onUpdateMemo={updateMemo}
            onUpdateType={updateType}
            onUpdateText={updateText}
            onUpdateDueDate={updateDueDate}
            autoClearDays={settings.autoClearDays}
          />
        ) : (
          <CalendarView 
            items={activeItems}
            onToggle={toggleDone}
            onDelete={deleteItem}
            onUpdateMemo={updateMemo}
            onUpdateType={updateType}
            onUpdateText={updateText}
            onUpdateDueDate={updateDueDate}
          />
        )}
      </View>

      {/* Settings Modal */}
      <SettingsModal 
        visible={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
    </SafeAreaView>
    </ThemeContext.Provider>
  )
}

function ListView({ items, doneItems, showDone, setShowDone, expandedId, setExpandedId, onToggle, onDelete, onUpdateMemo, onUpdateType, onUpdateText, onUpdateDueDate, autoClearDays }: any) {
  const { colors } = useTheme()
  const styles = getStyles(colors)
  const groups = groupByTimeline(items)
  const TL_GROUPS = [
    { key: 'overdue', label: '期限切れ', color: colors.must },
    { key: 'today',   label: '今日',     color: colors.must },
    { key: 'week',    label: '今週',     color: colors.want },
    { key: 'month',   label: '今月',     color: colors.someday },
    { key: 'later',   label: 'それ以降', color: colors.textSub },
    { key: 'noDate',  label: '日付なし', color: colors.textSub },
  ] as const

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listScroll}>
      {TL_GROUPS.map(({ key, label, color }) => {
        const list = groups[key]
        if (list.length === 0) return null
        return (
          <View key={key} style={styles.tlGroup}>
            <View style={styles.tlHeader}>
              <Text style={[styles.tlLabel, { color }]}>{label}</Text>
              <Text style={styles.tlCount}>{list.length}</Text>
            </View>
            {list.map((item, idx) => (
              <Animated.View
                key={item.id}
                entering={LightSpeedInRight.delay(Math.min(idx * 50, 500))}
                exiting={FadeOut.duration(200)}
                layout={Layout.springify().mass(0.3).damping(14).stiffness(250)}
              >
                <ItemCard 
                  item={item} 
                  expanded={expandedId === item.id}
                  onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onUpdateMemo={onUpdateMemo}
                  onUpdateType={onUpdateType}
                  onUpdateText={onUpdateText}
                  onUpdateDueDate={onUpdateDueDate}
                />
              </Animated.View>
            ))}
          </View>
        )
      })}
      {doneItems.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <Pressable style={styles.doneToggle} onPress={() => setShowDone(!showDone)}>
            <Text style={styles.doneToggleText}>
              完了済み {doneItems.length}件 {showDone ? '▲' : '▼'}
            </Text>
          </Pressable>
          {showDone && doneItems.map((item: any, idx: number) => (
            <Animated.View
              key={item.id}
              entering={ZoomIn.delay(Math.min(idx * 50, 500))}
              exiting={FadeOut.duration(200)}
              layout={Layout.springify().mass(0.3).damping(14).stiffness(250)}
            >
              <ItemCard 
                item={item} 
                onToggle={onToggle} 
                onDelete={onDelete}
                onUpdateMemo={onUpdateMemo}
                onUpdateType={onUpdateType}
                onUpdateText={onUpdateText}
                onUpdateDueDate={onUpdateDueDate}
                autoClearDays={autoClearDays}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function groupByTimeline(items: Item[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const g: Record<string, Item[]> = { overdue: [], today: [], week: [], month: [], later: [], noDate: [] }
  items.forEach(item => {
    if (!item.dueDate) { g.noDate.push(item); return }
    const due = new Date(item.dueDate)
    due.setHours(0, 0, 0, 0)
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
    if (diff < 0)        g.overdue.push(item)
    else if (diff === 0) g.today.push(item)
    else if (diff <= 7)  g.week.push(item)
    else if (diff <= 31) g.month.push(item)
    else                 g.later.push(item)
  })
  return g
}

function CalendarView({ items, onToggle, onDelete, onUpdateMemo, onUpdateType, onUpdateText, onUpdateDueDate }: any) {
  const { colors } = useTheme()
  const styles = getStyles(colors)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const byDate: Record<string, Item[]> = {}
  items.forEach((item: any) => {
    if (item.dueDate) {
      if (!byDate[item.dueDate]) byDate[item.dueDate] = []
      byDate[item.dueDate].push(item)
    }
  })
  const noDateItems = items.filter((i: any) => !i.dueDate)

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const prevMonth = () => { if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1); setSelectedDate(null) }
  const nextMonth = () => { if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1); setSelectedDate(null) }

  const toDateStr = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : []

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={styles.calNav}>
        <Pressable onPress={prevMonth} style={styles.calNavBtn}><Ionicons name="chevron-back" size={20} color={colors.text} /></Pressable>
        <Text style={styles.calTitle}>{year}年{month + 1}月</Text>
        <Pressable onPress={nextMonth} style={styles.calNavBtn}><Ionicons name="chevron-forward" size={20} color={colors.text} /></Pressable>
      </View>
      <View style={styles.calGrid}>
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <Text key={d} style={[styles.calDow, (i === 0 || i === 6) && { color: colors.textMute }]}>{d}</Text>
        ))}
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={styles.calCell} />
          const ds = toDateStr(year, month, day)
          const isSelected = ds === selectedDate
          const dayItems = byDate[ds] || []
          return (
            <Pressable key={ds} style={[styles.calCell, isSelected && styles.calCellSelected]} onPress={() => setSelectedDate(isSelected ? null : ds)}>
              <Text style={[styles.calDayNum, dayItems.length > 0 && { color: colors.text }]}>{day}</Text>
              {dayItems.length > 0 && (
                <View style={styles.calDots}>
                  {dayItems.some(it => it.type === 'must') && <View style={[styles.calDot, { backgroundColor: colors.must }]} />}
                  {dayItems.some(it => it.type === 'want') && <View style={[styles.calDot, { backgroundColor: colors.want }]} />}
                  {dayItems.some(it => it.type === 'someday') && <View style={[styles.calDot, { backgroundColor: colors.someday }]} />}
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
      {selectedDate && (
        <View style={styles.calDetail}>
          <Text style={styles.calDetailTitle}>{selectedDate.replace(/-/g, '/')} · {selectedItems.length}件</Text>
          {selectedItems.map(item => (
            <ItemCard key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} onUpdateMemo={onUpdateMemo} onUpdateType={onUpdateType} onUpdateText={onUpdateText} onUpdateDueDate={onUpdateDueDate} />
          ))}
        </View>
      )}
      {noDateItems.length > 0 && !selectedDate && (
        <View style={styles.calDetail}>
          <Text style={styles.calDetailTitle}>日付なし · {noDateItems.length}件</Text>
          {noDateItems.map((item: any) => (
            <ItemCard key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} onUpdateMemo={onUpdateMemo} onUpdateType={onUpdateType} onUpdateText={onUpdateText} onUpdateDueDate={onUpdateDueDate} />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function ItemCard({ item, expanded, onToggleExpand, onToggle, onDelete, onUpdateMemo, onUpdateType, onUpdateText, onUpdateDueDate, autoClearDays }: any) {
  const { colors } = useTheme()
  const styles = getStyles(colors)
  const [localMemo, setLocalMemo] = useState(item.memo ?? '')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const color = colors[item.type as keyof typeof colors] || colors.textSub

  useEffect(() => { setLocalMemo(item.memo ?? '') }, [item.memo])

  let daysLeft = null
  if (item.done && autoClearDays != null && item.doneAt) {
    const doneMs = item.doneAt.toMillis?.() ?? 0
    const deleteAt = doneMs + autoClearDays * 86400000
    daysLeft = Math.ceil((deleteAt - Date.now()) / 86400000)
  }

  return (
    <View style={[styles.card, item.done && styles.cardDone]}>
      <View style={styles.cardMain}>
        <Pressable style={[styles.checkbox, { borderColor: color }, item.done && { backgroundColor: color }]} onPress={() => onToggle(item.id, item.done)}>
          {item.done && <Text style={styles.checkMark}>✓</Text>}
        </Pressable>
        <Pressable style={styles.cardContent} onPress={onToggleExpand}>
          <View style={styles.cardTop}>
            <Text style={[styles.tagText, { color, fontSize: 10, fontWeight: '700' }]}>{item.type.toUpperCase()}</Text>
            {item.dueDate && <Text style={styles.dueText}>{item.dueDate.replace(/-/g, '/')}</Text>}
          </View>
          <Text style={[styles.cardText, item.done && styles.cardTextDone]}>{item.text}</Text>
          {daysLeft !== null && <Text style={styles.clearBadge}>{daysLeft <= 0 ? 'まもなく削除' : `${daysLeft}日後に削除`}</Text>}
        </Pressable>
        <Pressable style={styles.expandIconBtn} onPress={onToggleExpand}>
          <Text style={styles.expandIcon}>{expanded ? '▲' : (item.memo || item.dueDate ? '📝' : '···')}</Text>
        </Pressable>
      </View>
      {expanded && (
        <Animated.View entering={FadeInDown} style={styles.expandArea}>
          <View style={styles.expandRow}>
            <Text style={styles.expandLabel}>種別</Text>
            <View style={styles.expandTypes}>
              {(['must', 'want', 'someday'] as const).map(t => (
                <Pressable key={t} style={[styles.typeSmallBtn, item.type === t && { backgroundColor: colors[t] }]} onPress={() => onUpdateType(item.id, t)}>
                  <Text style={[styles.typeSmallBtnText, item.type === t && { color: '#fff' }]}>{TYPE_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.expandRow}>
            <Text style={styles.expandLabel}>期限</Text>
            <Pressable style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.datePickerText}>{item.dueDate ? item.dueDate.replace(/-/g, '/') : '設定なし'}</Text>
            </Pressable>
            {item.dueDate && <Pressable onPress={() => onUpdateDueDate(item.id, null)}><Ionicons name="close-circle" size={16} color={colors.textMute} /></Pressable>}
          </View>
          <TextInput
            style={styles.memoInput}
            value={localMemo}
            onChangeText={setLocalMemo}
            onBlur={() => onUpdateMemo(item.id, localMemo)}
            placeholder="メモを追加..."
            placeholderTextColor="#555"
            multiline
          />
          <Pressable style={styles.cardDeleteBtn} onPress={() => {
            Alert.alert('削除', '本当に削除しますか？', [
              { text: 'キャンセル', style: 'cancel' },
              { text: '削除', style: 'destructive', onPress: () => onDelete(item.id) }
            ])
          }}>
            <Text style={styles.cardDeleteBtnText}>タスクを削除</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={item.dueDate ? new Date(item.dueDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, date) => {
                setShowDatePicker(false)
                if (date) onUpdateDueDate(item.id, date.toISOString().split('T')[0])
              }}
            />
          )}
        </Animated.View>
      )}
    </View>
  )
}

function SettingsModal({ visible, onClose, settings, onUpdate }: any) {
  const { colors, theme } = useTheme()
  const styles = getStyles(colors)
  const OPTIONS = [
    { value: null, label: '削除しない' },
    { value: 1, label: '1日後' },
    { value: 3, label: '3日後' },
    { value: 7, label: '7日後' },
    { value: 30, label: '30日後' },
  ]
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>設定</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.textSub} /></Pressable>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.modalSectionTitle}>外観モード</Text>
              <Text style={styles.modalSectionDesc}>ライト/ダークテーマの切り替え</Text>
            </View>
            <View style={styles.toggleWrap}>
              <Pressable style={[styles.toggleBtn, theme === 'light' && styles.toggleBtnActive]} onPress={() => onUpdate({ theme: 'light' })}>
                <Ionicons name="sunny" size={18} color={theme === 'light' ? '#fff' : colors.textSub} />
              </Pressable>
              <Pressable style={[styles.toggleBtn, theme === 'dark' && styles.toggleBtnActive]} onPress={() => onUpdate({ theme: 'dark' })}>
                <Ionicons name="moon" size={18} color={theme === 'dark' ? '#fff' : colors.textSub} />
              </Pressable>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.modalSectionTitle}>プッシュ通知</Text>
              <Text style={styles.modalSectionDesc}>期限日の朝に自動でお知らせ</Text>
            </View>
            <Pressable style={[styles.switch, settings.notificationsEnabled && styles.switchOn]} onPress={() => onUpdate({ notificationsEnabled: !settings.notificationsEnabled })}>
              <View style={[styles.switchThumb, settings.notificationsEnabled && styles.switchThumbOn]} />
            </Pressable>
          </View>

          <Text style={styles.modalSectionTitle}>完了済みの自動削除</Text>
          <Text style={styles.modalSectionDesc}>チェックしてから指定の日数が経つと自動で削除されます</Text>
          <View style={styles.settingsGrid}>
            {OPTIONS.map(opt => (
              <Pressable key={String(opt.value)} style={[styles.settingsBtn, settings.autoClearDays === opt.value && styles.settingsBtnActive]} onPress={() => onUpdate({ autoClearDays: opt.value })}>
                <Text style={[styles.settingsBtnText, settings.autoClearDays === opt.value && styles.settingsBtnTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  logo: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  count: { color: colors.textSub, fontSize: 13 },
  iconBtn: { padding: 6, backgroundColor: colors.surface2, borderRadius: 10 },
  logoutBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.surface2 },
  logoutText: { color: colors.textSub, fontSize: 11 },
  capture: { padding: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  typeToggle: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeBtn: { flex: 1, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  typeBtnText: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  typeBtnActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 44, backgroundColor: colors.surface2, borderRadius: 10, paddingHorizontal: 14, color: colors.text, fontSize: 15 },
  addBtn: { backgroundColor: colors.accent, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  filters: { flexDirection: 'row', gap: 6 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.surface2, borderColor: colors.textSub },
  filterBtnText: { fontSize: 11, color: colors.textSub, fontWeight: '600' },
  filterBtnTextActive: { color: colors.text },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 6, padding: 2 },
  viewBtn: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  viewBtnActive: { backgroundColor: colors.surface3 },
  viewBtnText: { fontSize: 10, color: colors.textSub, fontWeight: '600' },
  viewBtnTextActive: { color: colors.text },
  listScroll: { paddingBottom: 100 },
  tlGroup: { marginTop: 16, paddingHorizontal: 16 },
  tlHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  tlLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  tlCount: { fontSize: 11, color: colors.textMute },
  card: { backgroundColor: colors.surface, borderRadius: 12, marginBottom: 6, padding: 10, borderWidth: 1, borderColor: colors.border },
  cardDone: { opacity: 0.4 },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  dueText: { fontSize: 10, color: colors.must },
  cardText: { fontSize: 15, color: colors.text2, lineHeight: 20 },
  cardTextDone: { textDecorationLine: 'line-through', color: colors.textMute },
  expandIconBtn: { padding: 4, marginLeft: 6 },
  expandIcon: { fontSize: 14, color: colors.textSub },
  clearBadge: { fontSize: 10, color: colors.textMute, marginTop: 2 },
  expandArea: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expandLabel: { fontSize: 12, color: colors.textSub, width: 30 },
  expandTypes: { flexDirection: 'row', gap: 6, flex: 1 },
  typeSmallBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.surface2 },
  typeSmallBtnText: { fontSize: 11, color: colors.textSub },
  datePickerBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surface2, borderRadius: 6 },
  datePickerText: { fontSize: 12, color: colors.text },
  memoInput: { backgroundColor: colors.surface2, borderRadius: 8, padding: 10, color: colors.text, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  cardDeleteBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  cardDeleteBtnText: { fontSize: 12, color: colors.must },
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  calNavBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: 16 },
  calNavText: { fontSize: 20, color: colors.text },
  calTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  calDow: { width: (width - 16) / 7, textAlign: 'center', fontSize: 12, color: colors.textSub, marginBottom: 8 },
  calCell: { width: (width - 16) / 7, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  calCellSelected: { backgroundColor: colors.surface2, borderRadius: 8 },
  calDayNum: { fontSize: 14, color: colors.textMute },
  calDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calDetail: { marginTop: 20, paddingHorizontal: 16 },
  calDetailTitle: { fontSize: 14, fontWeight: '700', color: colors.textSub, marginBottom: 12, paddingLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalClose: { fontSize: 24, color: colors.textSub },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalSectionDesc: { fontSize: 12, color: colors.textSub, marginBottom: 8 },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settingsBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  settingsBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  settingsBtnText: { fontSize: 13, color: colors.textSub },
  settingsBtnTextActive: { color: '#fff', fontWeight: '700' },
  doneToggle: { alignSelf: 'center', marginTop: 30, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface2, marginBottom: 16 },
  doneToggleText: { color: colors.textSub, fontSize: 13, fontWeight: '600' },
  toggleWrap: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 8, padding: 4 },
  toggleBtn: { padding: 8, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: colors.accent },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.surface3, justifyContent: 'center', padding: 2 },
  switchOn: { backgroundColor: colors.want },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  switchThumbOn: { alignSelf: 'flex-end' },
})
