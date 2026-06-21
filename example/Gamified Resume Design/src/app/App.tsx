import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2, MapPin,
  Sparkles, Cloud, CloudRain, Sun, CloudSnow, Wind,
  BookOpen, Flame, Circle, X, GripVertical,
  CalendarDays, ListTodo, Repeat2, Bot, Home, Moon
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type Priority = "high" | "medium" | "low";
type Folder = "공부" | "건강" | "일정" | "알바" | "기타";

interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  folder: Folder;
  dueDate?: string;
}

interface Habit {
  id: string;
  name: string;
  emoji: string;
  days: number[];
  streak: number;
  completedDates: string[];
}

interface DiaryEntry {
  date: string;
  emoji: string;
  text: string;
}

interface CalendarEvent {
  date: string;
  title: string;
  color: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr = fmt(new Date());

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "#f87171",
  medium: "#fbbf24",
  low: "#34d399",
};
const PRIORITY_LABEL: Record<Priority, string> = {
  high: "높음", medium: "보통", low: "낮음",
};

const FOLDER_COLORS: Record<Folder, string> = {
  공부: "#7c6ff7",
  건강: "#34d399",
  일정: "#60a5fa",
  알바: "#fbbf24",
  기타: "#a0a4bc",
};

function useLocalStorage<T>(key: string, init: T) {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal] as const;
}

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Mock weather data ──────────────────────────────────────────────────────
const WEATHER = {
  city: "서울",
  temp: 23,
  feels: 21,
  desc: "맑음",
  icon: "sun",
  humidity: 55,
  wind: 3.2,
};

const WeatherIcon = ({ icon, size = 20 }: { icon: string; size?: number }) => {
  if (icon === "rain") return <CloudRain size={size} className="text-blue-400" />;
  if (icon === "snow") return <CloudSnow size={size} className="text-sky-200" />;
  if (icon === "cloud") return <Cloud size={size} className="text-slate-400" />;
  if (icon === "wind") return <Wind size={size} className="text-slate-300" />;
  return <Sun size={size} className="text-yellow-400" />;
};

// ── Initial seed data ──────────────────────────────────────────────────────
const SEED_TODOS: Todo[] = [
  { id: uid(), text: "운영체제 챕터 3 복습", done: false, priority: "high", folder: "공부", dueDate: todayStr },
  { id: uid(), text: "알고리즘 문제 2개 풀기", done: false, priority: "medium", folder: "공부", dueDate: todayStr },
  { id: uid(), text: "편의점 알바 출근 준비", done: true, priority: "low", folder: "알바" },
  { id: uid(), text: "30분 조깅", done: false, priority: "medium", folder: "건강", dueDate: todayStr },
];

const SEED_HABITS: Habit[] = [
  { id: uid(), name: "아침 스트레칭", emoji: "🧘", days: [1,2,3,4,5,6,0], streak: 5, completedDates: [] },
  { id: uid(), name: "물 8잔 마시기", emoji: "💧", days: [1,2,3,4,5,6,0], streak: 12, completedDates: [] },
  { id: uid(), name: "독서 20분", emoji: "📖", days: [1,2,3,4,5], streak: 3, completedDates: [] },
  { id: uid(), name: "영어 단어 10개", emoji: "📚", days: [1,2,3,4,5], streak: 7, completedDates: [] },
];

const SEED_EVENTS: CalendarEvent[] = [
  { date: todayStr, title: "팀 미팅", color: "#7c6ff7" },
  { date: todayStr, title: "알바", color: "#fbbf24" },
  { date: fmt(new Date(Date.now() + 86400000 * 2)), title: "치과 예약", color: "#f87171" },
  { date: fmt(new Date(Date.now() + 86400000 * 5)), title: "기말고사", color: "#60a5fa" },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ icon, title, action }: {
  icon: React.ReactNode; title: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-primary opacity-80">{icon}</span>
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{title}</span>
      </div>
      {action}
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────
function CalendarPanel({
  events, diaryEntries, selectedDate, onSelectDate,
}: {
  events: CalendarEvent[];
  diaryEntries: DiaryEntry[];
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
}) {
  const today = new Date();
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const firstDay = new Date(cur.y, cur.m, 1).getDay();
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getDateStr = (day: number) =>
    `${cur.y}-${String(cur.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const eventsForDay = (day: number) => events.filter(e => e.date === getDateStr(day));
  const diaryForDay = (day: number) => diaryEntries.find(d => d.date === getDateStr(day));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setCur(c => { const d = new Date(c.y, c.m - 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm font-semibold">
          {cur.y}년 {MONTHS[cur.m]}
        </div>
        <button
          onClick={() => setCur(c => { const d = new Date(c.y, c.m + 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-center text-[11px] font-medium py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5 flex-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = getDateStr(day);
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const dayEvents = eventsForDay(day);
          const diary = diaryForDay(day);
          const dow = (firstDay + day - 1) % 7;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(ds)}
              className={`
                relative flex flex-col items-center pt-1 pb-1 rounded-lg transition-all duration-150 group
                ${isSelected ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-secondary"}
                ${isToday && !isSelected ? "ring-1 ring-primary/30" : ""}
              `}
            >
              <span className={`
                text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium
                ${isToday ? "bg-primary text-white font-bold" : ""}
                ${dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-foreground"}
              `}>
                {day}
              </span>
              {/* diary emoji */}
              {diary && (
                <span className="text-[11px] leading-none mt-0.5">{diary.emoji}</span>
              )}
              {/* event dots */}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                  {dayEvents.slice(0, 3).map((ev, ei) => (
                    <span key={ei} className="w-1 h-1 rounded-full" style={{ background: ev.color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Diary Section ─────────────────────────────────────────────────────────
const EMOJIS = ["😊","😢","😤","😴","🥳","😰","🤔","😍","🙂","😔","🤩","😅"];

function DiarySection({ date, entry, onSave }: {
  date: string;
  entry: DiaryEntry | undefined;
  onSave: (e: DiaryEntry) => void;
}) {
  const [emoji, setEmoji] = useState(entry?.emoji ?? "🙂");
  const [text, setText] = useState(entry?.text ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEmoji(entry?.emoji ?? "🙂");
    setText(entry?.text ?? "");
    setSaved(false);
  }, [date]);

  const label = new Date(date + "T00:00:00");
  const displayDate = `${label.getMonth() + 1}월 ${label.getDate()}일`;

  const handleSave = () => {
    onSave({ date, emoji, text });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-primary opacity-80" />
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          {displayDate} 한 줄 일기
        </span>
      </div>
      <div className="flex gap-2 flex-wrap mb-3">
        {EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`text-lg p-1 rounded-lg transition-all ${emoji === e ? "bg-primary/20 scale-110 ring-1 ring-primary/40" : "hover:bg-secondary"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="오늘 하루를 한 줄로 남겨보세요..."
          className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          onKeyDown={e => e.key === "Enter" && handleSave()}
        />
        <button
          onClick={handleSave}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            saved ? "bg-accent text-accent-foreground" : "bg-primary text-white hover:bg-primary/80"
          }`}
        >
          {saved ? "✓ 저장됨" : "저장"}
        </button>
      </div>
    </div>
  );
}

// ── Todo Panel ────────────────────────────────────────────────────────────
const FOLDERS: Folder[] = ["공부", "건강", "일정", "알바", "기타"];

function TodoPanel({ todos, setTodos }: {
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
}) {
  const [activeFolder, setActiveFolder] = useState<Folder | "전체">("전체");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newFolder, setNewFolder] = useState<Folder>("공부");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const filtered = todos.filter(t =>
    activeFolder === "전체" ? true : t.folder === activeFolder
  );
  const todayTodos = filtered.filter(t => !t.dueDate || t.dueDate === todayStr);

  const toggle = (id: string) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) =>
    setTodos(prev => prev.filter(t => t.id !== id));

  const addTodo = () => {
    if (!newText.trim()) return;
    setTodos(prev => [{ id: uid(), text: newText.trim(), done: false, priority: newPriority, folder: newFolder, dueDate: todayStr }, ...prev]);
    setNewText("");
    setAdding(false);
  };

  const done = filtered.filter(t => t.done).length;
  const total = filtered.length;

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        icon={<ListTodo size={14} />}
        title="할 일"
        action={
          <button onClick={() => setAdding(a => !a)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors">
            {adding ? <X size={12} /> : <Plus size={12} />}
          </button>
        }
      />

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">{done}/{total}</span>
      </div>

      {/* Folder tabs */}
      <div className="flex gap-1 flex-wrap">
        {(["전체", ...FOLDERS] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFolder(f)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
              activeFolder === f
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-secondary/50 rounded-xl p-3 flex flex-col gap-2 border border-border animate-in slide-in-from-top-1 duration-150">
          <input
            ref={inputRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTodo()}
            placeholder="할 일 입력..."
            className="bg-input-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as Priority)}
              className="flex-1 bg-input-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <select
              value={newFolder}
              onChange={e => setNewFolder(e.target.value as Folder)}
              className="flex-1 bg-input-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <button onClick={addTodo} className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors">
              추가
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 28rem)" }}>
        {todayTodos.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-6">할 일이 없습니다 🎉</div>
        )}
        {todayTodos.map(todo => (
          <div
            key={todo.id}
            className={`group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/60 transition-all duration-200 ${todo.done ? "opacity-50" : ""}`}
          >
            <button
              onClick={() => toggle(todo.id)}
              className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                todo.done ? "border-accent bg-accent" : "border-border hover:border-primary"
              }`}
              style={{ borderColor: todo.done ? undefined : PRIORITY_COLORS[todo.priority] }}
            >
              {todo.done && <Check size={10} className="text-accent-foreground" />}
            </button>
            <span className={`flex-1 text-xs leading-snug ${todo.done ? "line-through text-muted-foreground" : ""}`}>
              {todo.text}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
              style={{ background: FOLDER_COLORS[todo.folder] + "22", color: FOLDER_COLORS[todo.folder] }}
            >
              {todo.folder}
            </span>
            <button
              onClick={() => remove(todo.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Habit Panel ───────────────────────────────────────────────────────────
function HabitPanel({ habits, setHabits }: {
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}) {
  const todayDow = new Date().getDay();

  const todayHabits = habits.filter(h => h.days.includes(todayDow));
  const doneCount = todayHabits.filter(h => h.completedDates.includes(todayStr)).length;

  const toggle = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const done = h.completedDates.includes(todayStr);
      return {
        ...h,
        completedDates: done
          ? h.completedDates.filter(d => d !== todayStr)
          : [...h.completedDates, todayStr],
        streak: done ? Math.max(0, h.streak - 1) : h.streak + 1,
      };
    }));
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader icon={<Repeat2 size={14} />} title="오늘의 습관" />

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: todayHabits.length ? `${(doneCount / todayHabits.length) * 100}%` : "0%" }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">{doneCount}/{todayHabits.length}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {todayHabits.map(habit => {
          const done = habit.completedDates.includes(todayStr);
          return (
            <button
              key={habit.id}
              onClick={() => toggle(habit.id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-200 text-left ${
                done
                  ? "border-accent/30 bg-accent/10"
                  : "border-border hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              <span className="text-base">{habit.emoji}</span>
              <span className={`flex-1 text-xs font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                {habit.name}
              </span>
              <div className="flex items-center gap-1">
                {habit.streak > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                    <Flame size={10} />
                    {habit.streak}
                  </span>
                )}
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${done ? "bg-accent border-accent" : "border-border"}`}>
                  {done && <Check size={9} className="text-accent-foreground" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Map Placeholder ───────────────────────────────────────────────────────
function MapCard({ events }: { events: CalendarEvent[] }) {
  const todayEvents = events.filter(e => e.date === todayStr);
  return (
    <div className="flex flex-col gap-3">
      <SectionHeader icon={<MapPin size={14} />} title="오늘의 장소" />
      {/* Map mock */}
      <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ height: 140 }}>
        <div className="absolute inset-0 bg-secondary" style={{
          backgroundImage: `
            linear-gradient(rgba(124,111,247,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,111,247,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px"
        }} />
        {/* Fake road lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/4 top-0 bottom-0 w-px bg-primary/10" />
          <div className="absolute left-2/4 top-0 bottom-0 w-px bg-primary/10" />
          <div className="absolute left-3/4 top-0 bottom-0 w-px bg-primary/10" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-primary/10" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-primary/10" />
        </div>
        {/* Center marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/30 animate-pulse" />
          <div className="text-[10px] mt-1 bg-card/90 px-1.5 py-0.5 rounded text-primary font-medium">
            현재 위치
          </div>
        </div>
        <div className="absolute bottom-2 right-2 text-[9px] text-muted-foreground bg-card/60 px-1.5 py-0.5 rounded">
          지도 API 연동 준비 중
        </div>
      </div>

      {/* Today's events with location */}
      {todayEvents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {todayEvents.map((ev, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color }} />
              <span className="text-xs flex-1">{ev.title}</span>
              <MapPin size={11} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      {todayEvents.length === 0 && (
        <div className="text-center text-muted-foreground text-xs py-2">오늘 일정 없음</div>
      )}
    </div>
  );
}

// ── AI Briefing ───────────────────────────────────────────────────────────
function AIBriefing({ todos, habits, events }: {
  todos: Todo[];
  habits: Habit[];
  events: CalendarEvent[];
}) {
  const [expanded, setExpanded] = useState(false);
  const todayEvents = events.filter(e => e.date === todayStr);
  const undone = todos.filter(t => !t.done && t.dueDate === todayStr);
  const highPriority = undone.filter(t => t.priority === "high");

  const tips = [
    WEATHER.icon === "rain"
      ? "비가 예보되어 있어요. 우산 챙기고 실내 일정을 우선 처리하세요."
      : `오늘 ${WEATHER.city} 날씨는 ${WEATHER.temp}°C, ${WEATHER.desc}이에요. 야외 활동하기 좋아요.`,
    highPriority.length > 0
      ? `오늘 우선순위 높은 할 일이 ${highPriority.length}개 있어요: "${highPriority[0].text}"`
      : "오늘 급한 할 일은 없어요. 여유롭게 계획해 보세요.",
    todayEvents.length > 0
      ? `오늘 ${todayEvents.length}개 일정이 있어요. 미리 준비해두는 게 좋을 것 같아요.`
      : "오늘 일정이 비어있어요. 집중 공부 시간으로 활용해보세요.",
  ];

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader icon={<Bot size={14} />} title="AI 브리핑" />

      <div className="bg-secondary/40 border border-primary/20 rounded-xl p-3 flex flex-col gap-3">
        {/* Weather row */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <WeatherIcon icon={WEATHER.icon} size={22} />
          <div>
            <div className="text-sm font-semibold">{WEATHER.temp}°C <span className="text-xs font-normal text-muted-foreground">{WEATHER.desc}</span></div>
            <div className="text-[11px] text-muted-foreground">{WEATHER.city} · 체감 {WEATHER.feels}°C · 습도 {WEATHER.humidity}%</div>
          </div>
        </div>

        {/* Tips */}
        <div className="flex flex-col gap-2">
          {(expanded ? tips : tips.slice(0, 2)).map((tip, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Sparkles size={11} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-secondary-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[11px] text-primary hover:underline self-start transition-all"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: <Home size={16} />, label: "홈" },
  { icon: <CalendarDays size={16} />, label: "캘린더" },
  { icon: <ListTodo size={16} />, label: "투두" },
  { icon: <Repeat2 size={16} />, label: "습관" },
  { icon: <BookOpen size={16} />, label: "일기" },
  { icon: <Bot size={16} />, label: "AI" },
];

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [todos, setTodos] = useLocalStorage<Todo[]>("lc_todos", SEED_TODOS);
  const [habits, setHabits] = useLocalStorage<Habit[]>("lc_habits", SEED_HABITS);
  const [diaryEntries, setDiaryEntries] = useLocalStorage<DiaryEntry[]>("lc_diary", []);
  const [events] = useLocalStorage<CalendarEvent[]>("lc_events", SEED_EVENTS);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState(0);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const today = new Date();

  const todayTodos = todos.filter(t => t.dueDate === todayStr);
  const todayDone = todayTodos.filter(t => t.done).length;
  const todayHabits = habits.filter(h => h.days.includes(today.getDay()));
  const habitDone = todayHabits.filter(h => h.completedDates.includes(todayStr)).length;

  const saveDiary = (entry: DiaryEntry) => {
    setDiaryEntries(prev => {
      const exists = prev.findIndex(d => d.date === entry.date);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = entry;
        return next;
      }
      return [...prev, entry];
    });
  };

  const selectedDiary = selectedDate ? diaryEntries.find(d => d.date === selectedDate) : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Noto Sans KR', 'Inter', sans-serif" }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <span className="font-bold text-xl tracking-tight">LIFE CYCLE</span>
        <button
          onClick={() => setDark(d => !d)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
          aria-label="테마 전환"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      {/* Nav bar */}
      <nav className="flex items-center gap-1 px-6 py-2 border-b border-border bg-card/30 backdrop-blur-sm">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => setActiveNav(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeNav === i
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main 3-column grid */}
      <main className="flex-1 grid grid-cols-[280px_1fr_300px] gap-4 p-4 overflow-hidden" style={{ height: "calc(100vh - 96px)" }}>

        {/* ── LEFT COLUMN ── */}
        <aside className="flex flex-col gap-4 overflow-y-auto pr-1">

          {/* Todo */}
          <div className="bg-card border border-border rounded-xl p-4">
            <TodoPanel todos={todos} setTodos={setTodos} />
          </div>

          {/* Habits */}
          <div className="bg-card border border-border rounded-xl p-4">
            <HabitPanel habits={habits} setHabits={setHabits} />
          </div>
        </aside>

        {/* ── CENTER COLUMN ── */}
        <section className="flex flex-col gap-4 overflow-y-auto">
          {/* Calendar card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <CalendarPanel
              events={events}
              diaryEntries={diaryEntries}
              selectedDate={selectedDate}
              onSelectDate={d => setSelectedDate(prev => prev === d ? null : d)}
            />
          </div>

          {/* Diary section — appears on date click */}
          {selectedDate && (
            <DiarySection
              date={selectedDate}
              entry={selectedDiary}
              onSave={saveDiary}
            />
          )}

          {/* Today's schedule */}
          <div className="bg-card border border-border rounded-xl p-4">
            <SectionHeader icon={<CalendarDays size={14} />} title="오늘의 일정" />
            <div className="flex flex-col gap-2">
              {events.filter(e => e.date === todayStr).length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-4">오늘 등록된 일정이 없습니다</div>
              )}
              {events.filter(e => e.date === todayStr).map((ev, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/40 border border-border">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                  <span className="text-sm flex-1 font-medium">{ev.title}</span>
                  <span className="text-xs text-muted-foreground">오늘</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── RIGHT COLUMN ── */}
        <aside className="flex flex-col gap-4 overflow-y-auto pl-1">

          {/* Map */}
          <div className="bg-card border border-border rounded-xl p-4">
            <MapCard events={events} />
          </div>

          {/* AI Briefing */}
          <div className="bg-card border border-border rounded-xl p-4">
            <AIBriefing todos={todos} habits={habits} events={events} />
          </div>

        </aside>
      </main>
    </div>
  );
}
