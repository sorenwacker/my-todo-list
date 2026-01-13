<template>
  <div class="calendar-view" :class="{ 'light-theme': theme === 'light' }">
    <div class="calendar-header">
      <div class="calendar-nav">
        <button class="nav-btn" @click="navigateDate(-1)">&lt;</button>
        <button class="today-btn" @click="goToToday">Today</button>
        <button class="nav-btn" @click="navigateDate(1)">&gt;</button>
        <span class="current-period">{{ periodLabel }}</span>
      </div>
      <div class="view-modes">
        <button :class="{ active: viewMode === 'day' }" @click="viewMode = 'day'">Day</button>
        <button :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">Week</button>
        <button :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">Month</button>
      </div>
    </div>

    <!-- Month View -->
    <div v-if="viewMode === 'month'" class="month-view">
      <div class="weekday-headers">
        <div v-for="day in weekDays" :key="day" class="weekday-header">{{ day }}</div>
      </div>
      <div class="month-grid">
        <div
          v-for="(day, index) in monthDays"
          :key="index"
          class="month-cell"
          :class="{
            'other-month': !day.isCurrentMonth,
            'is-today': day.isToday,
            'is-weekend': day.isWeekend
          }"
          @dblclick="$emit('create-todo', day.date)"
        >
          <div class="cell-date">{{ day.dayNumber }}</div>
          <div class="cell-events">
            <div
              v-for="todo in getTodosForDate(day.date)"
              :key="todo.id"
              class="event-item"
              :class="{ completed: todo.completed }"
              :style="{ borderLeftColor: todo.project_color || '#666' }"
              @click.stop="$emit('select-todo', todo.id)"
            >
              {{ todo.title }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Week View -->
    <div v-if="viewMode === 'week'" class="week-view">
      <div class="week-header">
        <div class="time-gutter-header"></div>
        <div
          v-for="day in weekDays7"
          :key="day.date"
          class="week-day-header"
          :class="{ 'is-today': day.isToday }"
        >
          <span class="day-name">{{ day.dayName }}</span>
          <span class="day-number" :class="{ 'today-circle': day.isToday }">{{ day.dayNumber }}</span>
        </div>
      </div>
      <div class="week-body">
        <div class="time-gutter">
          <div v-for="hour in hours" :key="hour" class="hour-label">
            {{ formatHour(hour) }}
          </div>
        </div>
        <div class="week-columns">
          <div
            v-for="day in weekDays7"
            :key="day.date"
            class="week-column"
            :class="{ 'is-today': day.isToday, 'is-weekend': day.isWeekend }"
          >
            <div class="hour-slots">
              <div v-for="hour in hours" :key="hour" class="hour-slot" @dblclick="$emit('create-todo', day.date)"></div>
            </div>
            <div class="day-events">
              <div
                v-for="todo in getTodosForDate(day.date)"
                :key="todo.id"
                class="week-event"
                :class="{ completed: todo.completed }"
                :style="{ borderLeftColor: todo.project_color || '#666' }"
                @click.stop="$emit('select-todo', todo.id)"
              >
                <span class="event-title">{{ todo.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Day View -->
    <div v-if="viewMode === 'day'" class="day-view">
      <div class="day-header">
        <span class="day-title">{{ dayTitle }}</span>
      </div>
      <div class="day-body">
        <div class="time-gutter">
          <div v-for="hour in hours" :key="hour" class="hour-label">
            {{ formatHour(hour) }}
          </div>
        </div>
        <div class="day-column" :class="{ 'is-today': isCurrentDateToday }">
          <div class="hour-slots">
            <div v-for="hour in hours" :key="hour" class="hour-slot" @dblclick="$emit('create-todo', currentDate)"></div>
          </div>
          <div class="day-events-full">
            <div
              v-for="todo in todosForCurrentDay"
              :key="todo.id"
              class="day-event"
              :class="{ completed: todo.completed }"
              :style="{ borderLeftColor: todo.project_color || '#666' }"
              @click.stop="$emit('select-todo', todo.id)"
            >
              <div class="event-title">{{ todo.title }}</div>
              <div v-if="todo.notes" class="event-notes">{{ truncateNotes(todo.notes) }}</div>
              <div class="event-meta">
                <span v-if="todo.project_name" class="event-project">{{ todo.project_name }}</span>
                <span v-if="todo.category_name" class="event-category">{{ todo.category_name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CalendarView',
  props: {
    todos: {
      type: Array,
      default: () => []
    },
    theme: {
      type: String,
      default: 'dark'
    }
  },
  emits: ['select-todo', 'create-todo'],
  data() {
    return {
      viewMode: 'month',
      currentDate: new Date(),
      weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      hours: Array.from({ length: 24 }, (_, i) => i)
    }
  },
  computed: {
    periodLabel() {
      const opts = { month: 'long', year: 'numeric' }
      if (this.viewMode === 'day') {
        return this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      } else if (this.viewMode === 'week') {
        const start = this.getWeekStart(this.currentDate)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      }
      return this.currentDate.toLocaleDateString('en-US', opts)
    },
    monthDays() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startPadding = firstDay.getDay()
      const days = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Previous month padding
      for (let i = startPadding - 1; i >= 0; i--) {
        const date = new Date(year, month, -i)
        days.push({
          date: this.formatDateKey(date),
          dayNumber: date.getDate(),
          isCurrentMonth: false,
          isToday: date.getTime() === today.getTime(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6
        })
      }

      // Current month days
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d)
        days.push({
          date: this.formatDateKey(date),
          dayNumber: d,
          isCurrentMonth: true,
          isToday: date.getTime() === today.getTime(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6
        })
      }

      // Next month padding to complete the grid (6 rows)
      const remaining = 42 - days.length
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i)
        days.push({
          date: this.formatDateKey(date),
          dayNumber: i,
          isCurrentMonth: false,
          isToday: date.getTime() === today.getTime(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6
        })
      }

      return days
    },
    weekDays7() {
      const start = this.getWeekStart(this.currentDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const days = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        days.push({
          date: this.formatDateKey(date),
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isToday: date.getTime() === today.getTime(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6
        })
      }
      return days
    },
    dayTitle() {
      return this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    },
    isCurrentDateToday() {
      const today = new Date()
      return this.currentDate.toDateString() === today.toDateString()
    },
    todosForCurrentDay() {
      return this.getTodosForDate(this.formatDateKey(this.currentDate))
    }
  },
  methods: {
    formatDateKey(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    getWeekStart(date) {
      const d = new Date(date)
      const day = d.getDay()
      d.setDate(d.getDate() - day)
      d.setHours(0, 0, 0, 0)
      return d
    },
    formatHour(hour) {
      if (hour === 0) return '12 AM'
      if (hour < 12) return `${hour} AM`
      if (hour === 12) return '12 PM'
      return `${hour - 12} PM`
    },
    getTodosForDate(dateKey) {
      return this.todos.filter(t => {
        // Check due_date first
        if (t.due_date && t.due_date === dateKey) return true
        // Check start_date/end_date range
        if (!t.start_date && !t.end_date) return false
        const start = t.start_date || t.end_date
        const end = t.end_date || t.start_date
        return dateKey >= start && dateKey <= end
      })
    },
    truncateNotes(notes) {
      if (!notes) return ''
      return notes.length > 100 ? notes.substring(0, 100) + '...' : notes
    },
    navigateDate(direction) {
      const d = new Date(this.currentDate)
      if (this.viewMode === 'month') {
        d.setMonth(d.getMonth() + direction)
      } else if (this.viewMode === 'week') {
        d.setDate(d.getDate() + direction * 7)
      } else {
        d.setDate(d.getDate() + direction)
      }
      this.currentDate = d
    },
    goToToday() {
      this.currentDate = new Date()
    }
  }
}
</script>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #000;
  color: #e0e0e0;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  background: #000;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn, .today-btn {
  background: #111;
  border: 1px solid #333;
  color: #ccc;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.nav-btn:hover, .today-btn:hover {
  background: #2a2a2a;
  color: #fff;
}

.current-period {
  font-size: 16px;
  font-weight: 500;
  margin-left: 12px;
  color: #fff;
}

.view-modes {
  display: flex;
  gap: 4px;
  background: #111;
  padding: 4px;
  border-radius: 6px;
}

.view-modes button {
  background: transparent;
  border: none;
  color: #888;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.view-modes button:hover {
  color: #fff;
}

.view-modes button.active {
  background: #3498db;
  color: #fff;
}

/* Month View */
.month-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.weekday-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #111;
  border-bottom: 1px solid #333;
}

.weekday-header {
  padding: 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #888;
  text-transform: uppercase;
}

.month-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 1px;
  background: #333;
}

.month-cell {
  background: #000;
  padding: 4px;
  min-height: 80px;
  overflow: hidden;
}

.month-cell.other-month {
  background: #000;
}

.month-cell.other-month .cell-date {
  color: #444;
}

.month-cell.is-today {
  background: #1a2a3a;
}

.month-cell.is-today .cell-date {
  background: #3498db;
  color: #fff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-cell.is-weekend {
  background: #000;
}

.cell-date {
  font-size: 12px;
  font-weight: 500;
  color: #aaa;
  margin-bottom: 4px;
}

.cell-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.event-item {
  font-size: 11px;
  padding: 2px 6px;
  background: #111;
  border-radius: 3px;
  border-left: 3px solid #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background 0.15s;
}

.event-item:hover {
  background: #2a2a2a;
}

.event-item.completed {
  opacity: 0.5;
  text-decoration: line-through;
}

/* Week View */
.week-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.week-header {
  display: flex;
  border-bottom: 1px solid #333;
  background: #000;
}

.time-gutter-header {
  width: 60px;
  flex-shrink: 0;
}

.week-day-header {
  flex: 1;
  padding: 8px;
  text-align: center;
  border-left: 1px solid #333;
}

.week-day-header .day-name {
  display: block;
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
}

.week-day-header .day-number {
  display: inline-block;
  font-size: 20px;
  font-weight: 500;
  color: #ccc;
  margin-top: 4px;
}

.week-day-header.is-today .day-number.today-circle {
  background: #3498db;
  color: #fff;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  line-height: 32px;
}

.week-body {
  flex: 1;
  display: flex;
  overflow-y: auto;
}

.time-gutter {
  width: 60px;
  flex-shrink: 0;
  border-right: 1px solid #333;
}

.hour-label {
  height: 48px;
  padding: 4px 8px;
  font-size: 10px;
  color: #666;
  text-align: right;
}

.week-columns {
  flex: 1;
  display: flex;
}

.week-column {
  flex: 1;
  border-left: 1px solid #333;
  position: relative;
}

.week-column.is-today {
  background: rgba(52, 152, 219, 0.05);
}

.week-column.is-weekend {
  background: #000;
}

.hour-slots {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.hour-slot {
  height: 48px;
  border-bottom: 1px solid #222;
}

.day-events, .day-events-full {
  position: relative;
  padding: 4px;
}

.week-event, .day-event {
  background: #111;
  border-left: 3px solid #666;
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.week-event:hover, .day-event:hover {
  background: #2a2a2a;
}

.week-event.completed, .day-event.completed {
  opacity: 0.5;
}

.week-event .event-title {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Day View */
.day-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.day-header {
  padding: 16px;
  border-bottom: 1px solid #333;
  background: #000;
}

.day-title {
  font-size: 18px;
  font-weight: 500;
}

.day-body {
  flex: 1;
  display: flex;
  overflow-y: auto;
}

.day-column {
  flex: 1;
  position: relative;
  border-left: 1px solid #333;
}

.day-column.is-today {
  background: rgba(52, 152, 219, 0.05);
}

.day-event {
  padding: 8px 12px;
}

.day-event .event-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.day-event .event-notes {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.day-event .event-meta {
  display: flex;
  gap: 8px;
  font-size: 10px;
}

.event-project, .event-category {
  background: #2a2a2a;
  padding: 2px 6px;
  border-radius: 3px;
  color: #aaa;
}

/* Light theme */
.light-theme {
  background: #fff;
  color: #333;
}

.light-theme .calendar-header {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

.light-theme .nav-btn,
.light-theme .today-btn {
  background: #fff;
  border-color: #ddd;
  color: #333;
}

.light-theme .nav-btn:hover,
.light-theme .today-btn:hover {
  background: #f0f0f0;
}

.light-theme .current-period {
  color: #333;
}

.light-theme .view-modes {
  background: #e8e8e8;
}

.light-theme .view-modes button {
  color: #666;
}

.light-theme .view-modes button:hover {
  color: #333;
}

.light-theme .weekday-headers {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

.light-theme .month-grid {
  background: #e0e0e0;
}

.light-theme .month-cell {
  background: #fff;
}

.light-theme .month-cell.other-month {
  background: #f9f9f9;
}

.light-theme .month-cell.is-today {
  background: #e8f4fc;
}

.light-theme .month-cell.is-weekend {
  background: #f5f5f5;
}

.light-theme .cell-date {
  color: #333;
}

.light-theme .event-item {
  background: #f0f0f0;
}

.light-theme .event-item:hover {
  background: #e8e8e8;
}

.light-theme .week-header,
.light-theme .day-header {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

.light-theme .week-day-header .day-number {
  color: #333;
}

.light-theme .time-gutter {
  border-color: #e0e0e0;
}

.light-theme .hour-label {
  color: #999;
}

.light-theme .week-column {
  border-color: #e0e0e0;
}

.light-theme .hour-slot {
  border-color: #f0f0f0;
}

.light-theme .week-event,
.light-theme .day-event {
  background: #f0f0f0;
}

.light-theme .week-event:hover,
.light-theme .day-event:hover {
  background: #e8e8e8;
}
</style>
