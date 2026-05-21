'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import type { MafsGraphAttrs } from '@/components/MafsGraph'
import {
  InlineMath, BlockMath, MathShortcut,
  MafsGraphNode, TerminalNode, CalloutNode,
  ExtendedCodeBlock, PythonLintExtension,
} from './editor/nodes'
import type { LintDiagnostic } from './editor/nodes'
import { Toolbar } from './editor/Toolbar'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

const LatexModal = dynamic(() => import('@/components/LatexModal'), { ssr: false })

// ── JSON → Markdown converter ─────────────────────────────────────────────────
function nodeToMd(node: Record<string, unknown>, indent = '', num?: number): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
  const children = () => content.map((n) => nodeToMd(n, indent)).join('')

  switch (type) {
    case 'doc':           return content.map((n) => nodeToMd(n)).join('\n')
    case 'paragraph':     return children() ? `${children()}\n` : '\n'
    case 'heading':       return `${'#'.repeat((attrs.level as number) ?? 2)} ${children()}\n`
    case 'bulletList':    return content.map((n) => nodeToMd(n, indent)).join('') + '\n'
    case 'orderedList':   return content.map((n, i) => nodeToMd(n, indent, i + 1)).join('') + '\n'
    case 'listItem':
      return num !== undefined
        ? `${indent}${num}. ${content.map((n) => nodeToMd(n, indent + '   ')).join('').trimEnd()}\n`
        : `${indent}- ${content.map((n) => nodeToMd(n, indent + '  ')).join('').trimEnd()}\n`
    case 'blockquote':    return children().split('\n').map((l) => `> ${l}`).join('\n') + '\n'
    case 'codeBlock': {
      const lang = (attrs.language as string) ?? ''
      return `\`\`\`${lang}\n${children()}\n\`\`\`\n`
    }
    case 'table': {
      const rows = content.map((n) => nodeToMd(n, indent))
      // Insert separator row after header
      if (rows.length > 0) {
        const headerCols = (content[0].content as Record<string, unknown>[] | undefined)?.length ?? 1
        rows.splice(1, 0, '|' + ' --- |'.repeat(headerCols))
      }
      return rows.join('\n') + '\n'
    }
    case 'tableRow':    return '| ' + content.map((n) => nodeToMd(n, indent)).join(' | ') + ' |\n'
    case 'tableCell':
    case 'tableHeader': return children().replace(/\n/g, ' ').trim()
    case 'horizontalRule': return '---\n'
    case 'hardBreak':      return '  \n'
    case 'inlineMath':     return `$${attrs.latex ?? ''}$`
    case 'blockMath':      return `$$\n${attrs.latex ?? ''}\n$$\n`
    case 'terminalBlock':  return `\`\`\`bash\n${attrs.content ?? ''}\n\`\`\`\n`
    case 'callout': {
      const label = (attrs.type as string) ?? 'note'
      return `> **${label.toUpperCase()}**: ${attrs.content ?? ''}\n`
    }
    case 'text': {
      const marks = (node.marks as { type: string }[]) ?? []
      let t = (node.text as string) ?? ''
      if (marks.some((m) => m.type === 'bold'))   t = `**${t}**`
      if (marks.some((m) => m.type === 'italic')) t = `*${t}*`
      if (marks.some((m) => m.type === 'code'))   t = `\`${t}\``
      return t
    }
    default: return children()
  }
}

function jsonToMarkdown(doc: Record<string, unknown>): string {
  return nodeToMd(doc).replace(/\n{3,}/g, '\n\n').trim()
}

// Disables all markdown input rules (**, *, #, ---, etc.)
const NoInputRules = Extension.create({
  name: 'noInputRules',
  addInputRules() { return [] },
})

export type EditorPack = 'math' | 'code' | 'graph' | 'python-lint' | 'terminal' | 'lang-select'

interface TipTapEditorProps {
  content?: Record<string, unknown>
  onChange?: (content: Record<string, unknown>) => void
  editable?: boolean
  packs?: EditorPack[]
  onEditorReady?: (insert: (doc: Record<string, unknown>) => void) => void
  onExportReady?: (exportFn: (format: 'html' | 'markdown' | 'txt') => void) => void
  onGraphButtonClick?: () => void
  onInsertGraph?: (insert: (attrs: MafsGraphAttrs) => void) => void
  onLatexButtonClick?: () => void
  onInsertLatex?: (insert: (latex: string, displayMode: boolean) => void) => void
}

export default function TipTapEditor({
  content,
  onChange,
  editable = true,
  packs = ['math', 'code'],
  onEditorReady,
  onExportReady,
  onGraphButtonClick,
  onInsertGraph,
  onLatexButtonClick,
  onInsertLatex,
}: TipTapEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading]               = useState(false)
  const [lintDiagnostics, setLintDiagnostics]   = useState<LintDiagnostic[]>([])
  const [showTerminalModal, setShowTerminalModal] = useState(false)
  const [terminalContent, setTerminalContent]   = useState('$ ')
  const [filenameInput, setFilenameInput]        = useState('')
  const [showCalloutPicker, setShowCalloutPicker] = useState(false)
  // Latex editing — null = inserting new, object = editing existing node
  const [editingLatex, setEditingLatex] = useState<{ latex: string; displayMode: boolean; pos: number } | null>(null)

  const hasMath       = packs.includes('math')
  const hasCode       = packs.includes('code')
  const hasGraph      = packs.includes('graph')
  const hasPythonLint = packs.includes('python-lint')
  const hasTerminal   = packs.includes('terminal')

  // ── Extensions ─────────────────────────────────────────────────────────────
  const extensions = [
    StarterKit.configure({ codeBlock: false }),
    NoInputRules,
    Image.configure({ inline: false, allowBase64: false }),
    CalloutNode,
    Table.configure({ resizable: false, HTMLAttributes: { style: 'width: auto; min-width: 0;' } }),
    TableRow,
    TableCell,
    TableHeader,
    ...(hasCode       ? [ExtendedCodeBlock]                  : []),
    ...(hasMath       ? [InlineMath, BlockMath, MathShortcut] : []),
    ...(hasGraph      ? [MafsGraphNode]                      : []),
    ...(hasTerminal   ? [TerminalNode]                       : []),
    ...(hasPythonLint ? [PythonLintExtension]                : []),
  ]

  // ── Editor ─────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions,
    content: content ?? '',
    editable,
    onCreate: ({ editor }) => {
      const doc = editor.state.doc
      if (doc.lastChild?.type.name !== 'paragraph') {
        editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' })
      }
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
    editorProps: {
      handleDOMEvents: {
        dblclick: (view, event) => {
          if (!hasMath) return false
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (!pos) return false
          const node = view.state.doc.nodeAt(pos.pos)
          if (!node) {
            // Try one position back (cursor may be after the node)
            const nodeBefore = view.state.doc.nodeAt(pos.pos - 1)
            if (nodeBefore && (nodeBefore.type.name === 'inlineMath' || nodeBefore.type.name === 'blockMath')) {
              setEditingLatex({ latex: nodeBefore.attrs.latex, displayMode: nodeBefore.type.name === 'blockMath', pos: pos.pos - 1 })
              return true
            }
            return false
          }
          if (node.type.name === 'inlineMath' || node.type.name === 'blockMath') {
            setEditingLatex({ latex: node.attrs.latex, displayMode: node.type.name === 'blockMath', pos: pos.pos })
            return true
          }
          return false
        },
      },
    },
  })

  // ── Expose insert-content to parent ────────────────────────────────────────
  useEffect(() => {
    if (!editor || !onEditorReady) return
    onEditorReady((doc: Record<string, unknown>) => {
      const nodes = (doc.content as Record<string, unknown>[] | undefined) ?? []
      nodes.forEach((node) => {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, node).run()
      })
    })
  }, [editor, onEditorReady])

  // ── Listen for editingLatex meta from math node views ─────────────────────
  useEffect(() => {
    if (!editor || !hasMath) return
    const update = () => {
      const meta = editor.state.tr.getMeta('editingLatex')
      if (meta) setEditingLatex(meta)
    }
    editor.on('transaction', ({ transaction }) => {
      const meta = transaction.getMeta('editingLatex')
      if (meta) setEditingLatex(meta)
    })
  }, [editor, hasMath])

  // ── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) { const d = await res.json(); alert(`Upload failed: ${d.error}`); return }
      const { url } = await res.json()
      editor.chain().focus().setImage({ src: url }).run()
    } finally { setUploading(false) }
  }, [editor])

  // ── LaTeX insert ───────────────────────────────────────────────────────────
  const insertLatexFormula = useCallback((latex: string, displayMode: boolean) => {
    if (!editor) return
    if (displayMode) {
      editor.chain().focus().insertContent({ type: 'blockMath', attrs: { latex } }).run()
    } else {
      editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex } }).run()
    }
  }, [editor])

  useEffect(() => { onInsertLatex?.(insertLatexFormula) }, [insertLatexFormula, onInsertLatex])

  // ── Terminal insert ────────────────────────────────────────────────────────
  const insertTerminal = useCallback((content: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'terminalBlock', attrs: { content } }).run()
    setShowTerminalModal(false)
  }, [editor])

  // ── Filename sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return
    const update = () => {
      if (editor.isActive('codeBlock')) {
        setFilenameInput(editor.getAttributes('codeBlock').filename ?? '')
      }
    }
    editor.on('selectionUpdate', update)
    editor.on('update', update)
    return () => { editor.off('selectionUpdate', update); editor.off('update', update) }
  }, [editor])

  // ── Lint diagnostics sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (!editor || !hasPythonLint) return
    const update = () => {
      const storage = (editor.extensionStorage as Record<string, unknown>).pythonLint as { diagnostics: LintDiagnostic[] } | undefined
      setLintDiagnostics(storage?.diagnostics ?? [])
    }
    editor.on('update', update)
    return () => { editor.off('update', update) }
  }, [editor, hasPythonLint])

  // ── Graph insert ──────────────────────────────────────────────────────────
  const insertGraph = useCallback((attrs: MafsGraphAttrs) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'mafsGraph', attrs }).run()
  }, [editor])

  useEffect(() => { onInsertGraph?.(insertGraph) }, [insertGraph, onInsertGraph])

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAs = useCallback((format: 'html' | 'markdown' | 'txt') => {
    if (!editor) return
    let content: string
    if (format === 'html') content = editor.getHTML()
    else if (format === 'txt') content = editor.getText()
    else content = jsonToMarkdown(editor.getJSON() as Record<string, unknown>)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = format === 'html' ? 'lesson.html' : format === 'txt' ? 'lesson.txt' : 'lesson.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [editor])

  useEffect(() => { onExportReady?.(exportAs) }, [exportAs, onExportReady])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'visible', background: 'var(--surface)', position: 'relative' }}>
      {editable && editor && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              await handleImageUpload(file)
              e.target.value = ''
            }}
          />
          <div style={{ position: 'sticky', top: 52, zIndex: 10, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
            <Toolbar
              editor={editor}
              packs={packs}
              uploading={uploading}
              showCalloutPicker={showCalloutPicker}
              showTerminalModal={showTerminalModal}
              terminalContent={terminalContent}
              filenameInput={filenameInput}
              lintDiagnostics={lintDiagnostics}
              onFileClick={() => fileInputRef.current?.click()}
              onLatexButtonClick={onLatexButtonClick}
              onGraphButtonClick={onGraphButtonClick}
              onInsertTerminal={insertTerminal}
              setShowCalloutPicker={setShowCalloutPicker}
              setShowTerminalModal={setShowTerminalModal}
              setTerminalContent={setTerminalContent}
              setFilenameInput={setFilenameInput}
            />
          </div>
        </>
      )}
      <div
        ref={editorRef}
        onClick={() => editor?.commands.focus()}
        style={{ minHeight: editable ? 400 : undefined, cursor: editable ? 'text' : 'default' }}
      >
        <EditorContent editor={editor} style={{ padding: '1rem', fontSize: 15, lineHeight: 1.7 }} />
      </div>

      {/* LaTeX edit modal — triggered by double-clicking a formula */}
      {editingLatex && (
        <LatexModal
          initialLatex={editingLatex.latex}
          initialDisplayMode={editingLatex.displayMode}
          showDisplayToggle
          onInsert={(latex, displayMode) => {
            if (!editor) return
            const pos = editingLatex.pos
            const node = editor.state.doc.nodeAt(pos)
            if (node) {
              editor.chain()
                .deleteRange({ from: pos, to: pos + node.nodeSize })
                .insertContentAt(pos, {
                  type: displayMode ? 'blockMath' : 'inlineMath',
                  attrs: { latex },
                })
                .run()
            }
            setEditingLatex(null)
          }}
          onClose={() => setEditingLatex(null)}
        />
      )}

      <style>{`
        .tiptap:focus { outline: none; }
        .tiptap h2 { font-size: 1.4rem; margin: 1.5rem 0 0.5rem; }
        .tiptap h3 { font-size: 1.15rem; margin: 1.25rem 0 0.5rem; }
        .tiptap p { margin: 0 0 0.75rem; }
        .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin: 0 0 0.75rem; }
        .tiptap blockquote { border-left: 3px solid var(--border); margin: 0 0 0.75rem; padding-left: 1rem; color: var(--text-2); }
        .tiptap code { background: var(--surface-2); padding: 2px 5px; border-radius: 3px; font-size: 13px; }
        .tiptap pre code { background: none; padding: 0; }
        .tiptap [data-block-math] { text-align: center; margin: 1rem 0; cursor: pointer; padding: 4px 8px; border-radius: 4px; border: 2px solid transparent; }
        .tiptap [data-block-math]:hover { border-color: var(--border); }
        .tiptap .ProseMirror-selectednode[data-block-math] { outline: 3px solid var(--amber); border-radius: 4px; }
        .tiptap [data-inline-math] { display: inline; cursor: pointer; border-radius: 3px; border: 1px solid transparent; padding: 0 2px; }
        .tiptap [data-inline-math]:hover { border-color: var(--border); }
        .tiptap .ProseMirror-selectednode[data-inline-math] { outline: 3px solid var(--amber); border-radius: 3px; }
        .tiptap img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5rem 0; display: block; }
        .tiptap img.ProseMirror-selectednode { outline: 3px solid var(--amber); }
        .tiptap [data-terminal] { font-family: monospace; }
        .tiptap table { border-collapse: collapse; width: auto; min-width: 120px; margin: 1rem 0; }
        .tiptap th, .tiptap td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; font-size: 14px; }
        .tiptap th { background: var(--surface-2); font-weight: 600; }
        .tiptap .selectedCell { background: var(--indigo-muted); }
        .tiptap pre[data-terminal-pre] { color: #e6edf3 !important; background: none !important; border: none !important; padding: 0 !important; }
        .tiptap .ProseMirror-selectednode [data-terminal-inner] { outline: 3px solid var(--amber); }
      `}</style>
    </div>
  )
}
