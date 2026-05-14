'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Module {
  id: string
  title: string
  position: number
}

interface ModuleManagerProps {
  courseId: string
  onModulesChange?: (modules: Module[]) => void
}

export default function ModuleManager({ courseId, onModulesChange }: ModuleManagerProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const basePath = `/api/admin/courses/${courseId}/modules`

  const load = useCallback(async () => {
    const res = await fetch(basePath)
    const data = await res.json()
    setModules(data)
    onModulesChange?.(data)
    setLoading(false)
  }, [basePath, onModulesChange])

  useEffect(() => { load() }, [load])

  // Listen for add-module event dispatched by the section header button
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent
      if (ev.detail === courseId) setAdding(true)
    }
    document.addEventListener('add-module', handler)
    return () => document.removeEventListener('add-module', handler)
  }, [courseId])

  const addModule = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    const res = await fetch(basePath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    if (res.ok) {
      setNewTitle('')
      setAdding(false)
      await load()
    }
    setSaving(false)
  }

  const renameModule = async (moduleId: string) => {
    if (!editTitle.trim()) return
    setSaving(true)
    await fetch(`${basePath}/${moduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim() }),
    })
    setEditingId(null)
    await load()
    setSaving(false)
  }

  const deleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!confirm(`Delete "${moduleTitle}"? Lessons in this module will become unassigned.`)) return
    await fetch(`${basePath}/${moduleId}`, { method: 'DELETE' })
    await load()
  }

  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const index = modules.findIndex((m) => m.id === moduleId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= modules.length) return

    const reordered = [...modules]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp

    // Update positions
    await Promise.all(
      reordered.map((m, i) =>
        fetch(`${basePath}/${m.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: i }),
        })
      )
    )
    await load()
  }

  if (loading) return null

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
      {modules.length === 0 && !adding && (
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          No modules yet. Modules let you group lessons into units (e.g. "Unit 1: Linear Equations").
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {modules.map((mod, index) => (
          <div key={mod.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface-2)',
          }}>
            {/* Reorder arrows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <button
                onClick={() => moveModule(mod.id, 'up')}
                disabled={index === 0}
                style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, fontSize: 10, padding: '1px 4px' }}
              >▲</button>
              <button
                onClick={() => moveModule(mod.id, 'down')}
                disabled={index === modules.length - 1}
                style={{ background: 'none', border: 'none', cursor: index === modules.length - 1 ? 'default' : 'pointer', opacity: index === modules.length - 1 ? 0.3 : 1, fontSize: 10, padding: '1px 4px' }}
              >▼</button>
            </div>

            {editingId === mod.id ? (
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') renameModule(mod.id); if (e.key === 'Escape') setEditingId(null) }}
                  autoFocus
                  style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 4 }}
                />
                <button
                  onClick={() => renameModule(mod.id)}
                  disabled={saving}
                  style={{ padding: '4px 10px', fontSize: 12, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >Save</button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ padding: '4px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface)', cursor: 'pointer' }}
                >Cancel</button>
              </div>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{mod.title}</span>
                <button
                  onClick={() => { setEditingId(mod.id); setEditTitle(mod.title) }}
                  style={{ fontSize: 12, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}
                >Rename</button>
                <button
                  onClick={() => deleteModule(mod.id, mod.title)}
                  style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                >Delete</button>
              </>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addModule(); if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            placeholder="e.g. Unit 1: Linear Equations"
            autoFocus
            style={{ flex: 1, padding: '7px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6 }}
          />
          <button
            onClick={addModule}
            disabled={saving || !newTitle.trim()}
            style={{ padding: '7px 14px', fontSize: 13, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >Add</button>
          <button
            onClick={() => { setAdding(false); setNewTitle('') }}
            style={{ padding: '7px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer' }}
          >Cancel</button>
        </div>
      )}
    </div>
  )
}
