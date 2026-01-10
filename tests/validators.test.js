import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  validateId,
  validateOptionalId,
  validateString,
  validateOptionalString,
  validateColor,
  validateOptionalColor,
  validateIdArray,
  validateOptionalDate,
  validateOptionalImportance,
  validateBoolean,
  validateTodo,
  validateProject,
  validatePerson,
  validateSubtask,
  validateSearchQuery,
  validateImportMode,
  validateUrl,
  validateTodoType,
  validateSettingKey,
  validateSettingValue
} from '../src/main/validators.js'

describe('Validators', () => {
  describe('validateId', () => {
    it('should accept positive integers', () => {
      expect(validateId(1)).toBe(1)
      expect(validateId(100)).toBe(100)
      expect(validateId('5')).toBe(5)
    })

    it('should reject invalid ids', () => {
      expect(() => validateId(0)).toThrow(ValidationError)
      expect(() => validateId(-1)).toThrow(ValidationError)
      expect(() => validateId(null)).toThrow(ValidationError)
      expect(() => validateId(undefined)).toThrow(ValidationError)
      expect(() => validateId('abc')).toThrow(ValidationError)
      expect(() => validateId(1.5)).toThrow(ValidationError)
    })
  })

  describe('validateOptionalId', () => {
    it('should accept null/undefined', () => {
      expect(validateOptionalId(null)).toBeNull()
      expect(validateOptionalId(undefined)).toBeNull()
    })

    it('should validate non-null values', () => {
      expect(validateOptionalId(1)).toBe(1)
      expect(() => validateOptionalId(-1)).toThrow(ValidationError)
    })
  })

  describe('validateString', () => {
    it('should accept valid strings', () => {
      expect(validateString('hello')).toBe('hello')
      expect(validateString('a')).toBe('a')
    })

    it('should reject invalid strings', () => {
      expect(() => validateString('')).toThrow(ValidationError)
      expect(() => validateString(123)).toThrow(ValidationError)
      expect(() => validateString(null)).toThrow(ValidationError)
    })

    it('should enforce max length', () => {
      expect(() => validateString('a'.repeat(1001))).toThrow(ValidationError)
      expect(validateString('a'.repeat(100), 'test', 100)).toBe('a'.repeat(100))
    })
  })

  describe('validateOptionalString', () => {
    it('should accept null/undefined/empty', () => {
      expect(validateOptionalString(null)).toBe('')
      expect(validateOptionalString(undefined)).toBe('')
      expect(validateOptionalString('')).toBe('')
    })

    it('should accept valid strings', () => {
      expect(validateOptionalString('hello')).toBe('hello')
    })
  })

  describe('validateColor', () => {
    it('should accept valid hex colors', () => {
      expect(validateColor('#ffffff')).toBe('#ffffff')
      expect(validateColor('#AABBCC')).toBe('#aabbcc')
      expect(validateColor('#123456')).toBe('#123456')
    })

    it('should reject invalid colors', () => {
      expect(() => validateColor('red')).toThrow(ValidationError)
      expect(() => validateColor('#fff')).toThrow(ValidationError)
      expect(() => validateColor('#gggggg')).toThrow(ValidationError)
      expect(() => validateColor(123)).toThrow(ValidationError)
    })
  })

  describe('validateOptionalColor', () => {
    it('should return default for null/undefined', () => {
      expect(validateOptionalColor(null)).toBe('#0f4c75')
      expect(validateOptionalColor(undefined)).toBe('#0f4c75')
      expect(validateOptionalColor('')).toBe('#0f4c75')
    })

    it('should validate non-null colors', () => {
      expect(validateOptionalColor('#ff0000')).toBe('#ff0000')
    })
  })

  describe('validateIdArray', () => {
    it('should accept valid arrays', () => {
      expect(validateIdArray([1, 2, 3])).toEqual([1, 2, 3])
      expect(validateIdArray([])).toEqual([])
    })

    it('should reject invalid arrays', () => {
      expect(() => validateIdArray('not array')).toThrow(ValidationError)
      expect(() => validateIdArray([1, -1, 3])).toThrow(ValidationError)
      expect(() => validateIdArray([1, 'a', 3])).toThrow(ValidationError)
    })
  })

  describe('validateOptionalDate', () => {
    it('should accept valid dates', () => {
      expect(validateOptionalDate('2024-01-15')).toBe('2024-01-15')
      expect(validateOptionalDate('2023-12-31')).toBe('2023-12-31')
    })

    it('should accept null/undefined/empty', () => {
      expect(validateOptionalDate(null)).toBeNull()
      expect(validateOptionalDate(undefined)).toBeNull()
      expect(validateOptionalDate('')).toBeNull()
    })

    it('should reject invalid formats', () => {
      expect(() => validateOptionalDate('01-15-2024')).toThrow(ValidationError)
      expect(() => validateOptionalDate('2024/01/15')).toThrow(ValidationError)
      expect(() => validateOptionalDate('Jan 15 2024')).toThrow(ValidationError)
    })
  })

  describe('validateOptionalImportance', () => {
    it('should accept 1-5', () => {
      expect(validateOptionalImportance(1)).toBe(1)
      expect(validateOptionalImportance(5)).toBe(5)
      expect(validateOptionalImportance(3)).toBe(3)
    })

    it('should accept null/undefined', () => {
      expect(validateOptionalImportance(null)).toBeNull()
      expect(validateOptionalImportance(undefined)).toBeNull()
    })

    it('should reject invalid values', () => {
      expect(() => validateOptionalImportance(0)).toThrow(ValidationError)
      expect(() => validateOptionalImportance(6)).toThrow(ValidationError)
      expect(() => validateOptionalImportance(-1)).toThrow(ValidationError)
    })
  })

  describe('validateBoolean', () => {
    it('should accept boolean values', () => {
      expect(validateBoolean(true)).toBe(true)
      expect(validateBoolean(false)).toBe(false)
    })

    it('should accept 0/1', () => {
      expect(validateBoolean(0)).toBe(false)
      expect(validateBoolean(1)).toBe(true)
    })

    it('should return default for null/undefined', () => {
      expect(validateBoolean(null)).toBe(false)
      expect(validateBoolean(undefined)).toBe(false)
      expect(validateBoolean(null, 'test', true)).toBe(true)
    })

    it('should reject invalid values', () => {
      expect(() => validateBoolean('true')).toThrow(ValidationError)
      expect(() => validateBoolean(2)).toThrow(ValidationError)
    })
  })

  describe('validateTodo', () => {
    it('should validate complete todo', () => {
      const todo = {
        id: 1,
        title: 'Test todo',
        notes: 'Some notes',
        start_date: '2024-01-01',
        end_date: '2024-01-15',
        completed: false,
        project_id: 1,
        category_id: null,
        status_id: 2,
        importance: 3,
        recurrence_type: 'weekly',
        recurrence_interval: 2,
        recurrence_end_date: '2024-12-31',
        notes_sensitive: false
      }

      const result = validateTodo(todo)
      expect(result.id).toBe(1)
      expect(result.title).toBe('Test todo')
      expect(result.importance).toBe(3)
    })

    it('should reject invalid todo', () => {
      expect(() => validateTodo(null)).toThrow(ValidationError)
      expect(() => validateTodo({ title: 'no id' })).toThrow(ValidationError)
      expect(() => validateTodo({ id: 1 })).toThrow(ValidationError)
    })
  })

  describe('validateProject', () => {
    it('should validate project', () => {
      const project = { id: 1, name: 'Test', color: '#ff0000' }
      const result = validateProject(project)
      expect(result.id).toBe(1)
      expect(result.name).toBe('Test')
      expect(result.color).toBe('#ff0000')
    })

    it('should reject invalid project', () => {
      expect(() => validateProject(null)).toThrow(ValidationError)
      expect(() => validateProject({ id: 1 })).toThrow(ValidationError)
    })
  })

  describe('validatePerson', () => {
    it('should validate person without id (create)', () => {
      const person = { name: 'John Doe', email: 'john@example.com' }
      const result = validatePerson(person)
      expect(result.name).toBe('John Doe')
      expect(result.email).toBe('john@example.com')
      expect(result.id).toBeUndefined()
    })

    it('should validate person with id (update)', () => {
      const person = { id: 1, name: 'John Doe' }
      const result = validatePerson(person)
      expect(result.id).toBe(1)
      expect(result.name).toBe('John Doe')
    })
  })

  describe('validateSubtask', () => {
    it('should validate subtask', () => {
      const subtask = { id: 1, title: 'Subtask', completed: true }
      const result = validateSubtask(subtask)
      expect(result.id).toBe(1)
      expect(result.title).toBe('Subtask')
      expect(result.completed).toBe(true)
    })
  })

  describe('validateSearchQuery', () => {
    it('should accept valid queries', () => {
      expect(validateSearchQuery('test')).toBe('test')
      expect(validateSearchQuery('')).toBe('')
    })

    it('should reject too long queries', () => {
      expect(() => validateSearchQuery('a'.repeat(501))).toThrow(ValidationError)
    })

    it('should reject non-strings', () => {
      expect(() => validateSearchQuery(123)).toThrow(ValidationError)
    })
  })

  describe('validateImportMode', () => {
    it('should accept valid modes', () => {
      expect(validateImportMode('merge')).toBe('merge')
      expect(validateImportMode('replace')).toBe('replace')
    })

    it('should default to merge for invalid modes', () => {
      expect(validateImportMode('invalid')).toBe('merge')
      expect(validateImportMode(null)).toBe('merge')
    })
  })

  describe('validateUrl', () => {
    it('should accept valid http/https URLs', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com')
      expect(validateUrl('http://localhost:3000')).toBe('http://localhost:3000')
    })

    it('should reject non-http protocols', () => {
      expect(() => validateUrl('file:///etc/passwd')).toThrow(ValidationError)
      expect(() => validateUrl('javascript:alert(1)')).toThrow(ValidationError)
    })

    it('should reject invalid URLs', () => {
      expect(() => validateUrl('not a url')).toThrow(ValidationError)
      expect(() => validateUrl('')).toThrow(ValidationError)
    })
  })

  describe('validateTodoType', () => {
    it('should accept valid types', () => {
      expect(validateTodoType('todo')).toBe('todo')
      expect(validateTodoType('note')).toBe('note')
    })

    it('should default to todo for null/undefined', () => {
      expect(validateTodoType(null)).toBe('todo')
      expect(validateTodoType(undefined)).toBe('todo')
      expect(validateTodoType('')).toBe('todo')
    })

    it('should reject invalid types', () => {
      expect(() => validateTodoType('invalid')).toThrow(ValidationError)
      expect(() => validateTodoType('task')).toThrow(ValidationError)
      expect(() => validateTodoType(123)).toThrow(ValidationError)
    })
  })

  describe('validateSettingKey', () => {
    it('should accept valid setting keys', () => {
      expect(validateSettingKey('markdown_mode')).toBe('markdown_mode')
      expect(validateSettingKey('theme')).toBe('theme')
      expect(validateSettingKey('default_view')).toBe('default_view')
      expect(validateSettingKey('card_size')).toBe('card_size')
      expect(validateSettingKey('hide_completed')).toBe('hide_completed')
    })

    it('should reject invalid setting keys', () => {
      expect(() => validateSettingKey('invalid_key')).toThrow(ValidationError)
      expect(() => validateSettingKey('')).toThrow(ValidationError)
      expect(() => validateSettingKey(null)).toThrow(ValidationError)
    })
  })

  describe('validateSettingValue', () => {
    it('should validate markdown_mode values', () => {
      expect(validateSettingValue('markdown_mode', 'markdown')).toBe('markdown')
      expect(validateSettingValue('markdown_mode', 'plain')).toBe('plain')
      expect(() => validateSettingValue('markdown_mode', 'invalid')).toThrow(ValidationError)
    })

    it('should validate theme values', () => {
      expect(validateSettingValue('theme', 'dark')).toBe('dark')
      expect(validateSettingValue('theme', 'light')).toBe('light')
      expect(() => validateSettingValue('theme', 'blue')).toThrow(ValidationError)
    })

    it('should validate default_view values', () => {
      expect(validateSettingValue('default_view', 'cards')).toBe('cards')
      expect(validateSettingValue('default_view', 'table')).toBe('table')
      expect(validateSettingValue('default_view', 'kanban')).toBe('kanban')
      expect(validateSettingValue('default_view', 'timeline')).toBe('timeline')
      expect(validateSettingValue('default_view', 'graph')).toBe('graph')
      expect(() => validateSettingValue('default_view', 'list')).toThrow(ValidationError)
    })

    it('should validate card_size as positive integer', () => {
      expect(validateSettingValue('card_size', 280)).toBe(280)
      expect(validateSettingValue('card_size', 600)).toBe(600)
      expect(() => validateSettingValue('card_size', -1)).toThrow(ValidationError)
      expect(() => validateSettingValue('card_size', 0)).toThrow(ValidationError)
    })

    it('should validate hide_completed as boolean', () => {
      expect(validateSettingValue('hide_completed', true)).toBe(true)
      expect(validateSettingValue('hide_completed', false)).toBe(false)
      expect(() => validateSettingValue('hide_completed', 'yes')).toThrow(ValidationError)
    })
  })
})
