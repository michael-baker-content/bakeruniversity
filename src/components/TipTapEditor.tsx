'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import { common, createLowlight } from 'lowlight'
import katex from 'katex'
import LatexModal from '@/components/LatexModal'
import 'katex/dist/katex.min.css'

const lowlight = createLowlight(common)

// ── Inline math node ($...$) ─────────────────────────────────────────────────
const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() { return { latex: { default: '' } } },
  parseHTML() { return [{ tag: 'span[data-inline-math]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-inline-math': node.attrs.latex }), node.attrs.latex]
  },
})

// ── Block math node ($$...$$) ────────────────────────────────────────────────
const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  addAttributes() { return { latex: { default: '' } } },
  parseHTML() { return [{ tag: 'div[data-block-math]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-block-math': node.attrs.latex }), node.attrs.latex]
  },
})

interface TipTapEditorProps {
  content?: Record<string, unknown>
  onChange?: (content: Record<string, unknown>) => void
  editable?: boolean
  onEditorReady?: (insert: (doc: Record<string, unknown>) => void) => void
}

export default function TipTapEditor({
  content,
  onChange,
  editable = true,
  onEditorReady,
}: TipTapEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showLatexModal, setShowLatexModal] = useState(false)

  // ── Editor instance ─────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'python' }),
      Image.configure({ inline: false, allowBase64: false }),
      InlineMath,
      BlockMath,
    ],
    content: content ?? '',
    editable,
    onCreate: ({ editor }) => {
      const doc = editor.state.doc
      const lastNode = doc.lastChild
      if (lastNode && lastNode.type.name !== 'paragraph') {
        editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' })
      }
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
  })

  // ── Expose insert function to parent (for markdown import) ──────────────────
  // Must be after useEditor so `editor` is defined
  useEffect(() => {
    if (!editor || !onEditorReady) return
    onEditorReady((doc: Record<string, unknown>) => {
      const nodes = (doc.content as Record<string, unknown>[] | undefined) ?? []
      nodes.forEach((node) => {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, node).run()
      })
    })
  }, [editor, onEditorReady])

  // ── Render KaTeX after each update ──────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.querySelectorAll<HTMLElement>('[data-inline-math]').forEach((el) => {
      try { katex.render(el.dataset.inlineMath ?? '', el, { throwOnError: false, displayMode: false }) }
      catch { /* ignore */ }
    })
    editorRef.current.querySelectorAll<HTMLElement>('[data-block-math]').forEach((el) => {
      try { katex.render(el.dataset.blockMath ?? '', el, { throwOnError: false, displayMode: true }) }
      catch { /* ignore */ }
    })
  })

  // ── Image upload via server API (bypasses RLS) ───────────────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        alert(`Upload failed: ${data.error}`)
        return
      }
      const { url } = await res.json()
      editor.chain().focus().setImage({ src: url }).run()
    } finally {
      setUploading(false)
    }
  }, [editor])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleImageUpload(file)
    e.target.value = ''
  }

  // ── Insert LaTeX from modal ──────────────────────────────────────────────────
  const insertLatexFormula = useCallback((latex: string, displayMode: boolean) => {
    if (!editor) return
    if (displayMode) {
      editor.chain().focus().insertContent({ type: 'blockMath', attrs: { latex } }).run()
    } else {
      editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex } }).run()
    }
  }, [editor])

  // ── $...$ and $$...$$ keyboard shortcuts ────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editor || (e.key !== ' ' && e.key !== 'Enter')) return
    const { state } = editor
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 200), from)

    const blockMatch = textBefore.match(/\$\$([^$]+)\$\$$/)
    if (blockMatch) {
      e.preventDefault()
      editor.chain()
        .deleteRange({ from: from - blockMatch[0].length, to: from })
        .insertContent({ type: 'blockMath', attrs: { latex: blockMatch[1].trim() } })
        .run()
      return
    }

    const inlineMatch = textBefore.match(/\$([^$]+)\$$/)
    if (inlineMatch) {
      e.preventDefault()
      editor.chain()
        .deleteRange({ from: from - inlineMatch[0].length, to: from })
        .insertContent({ type: 'inlineMath', attrs: { latex: inlineMatch[1].trim() } })
        .run()
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
      {editable && editor && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>I</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>Code</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>" Quote</ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} active={false}>
            {uploading ? 'Uploading...' : '🖼 Image'}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <ToolbarButton onClick={() => setShowLatexModal(true)} active={false}>∑ Formula</ToolbarButton>
          <span style={{ width: 1, background: '#ddd', margin: '0 4px' }} />
          <span style={{ fontSize: 12, color: '#888', alignSelf: 'center' }}>
            Type $x^2$ or $$x^2$$ then Space to render math
          </span>
        </div>
      )}
      <div ref={editorRef} onKeyDown={handleKeyDown}>
        <EditorContent
          editor={editor}
          style={{ padding: '1rem', minHeight: editable ? 400 : undefined, fontSize: 15, lineHeight: 1.7 }}
        />
      </div>
      {showLatexModal && (
        <LatexModal onInsert={insertLatexFormula} onClose={() => setShowLatexModal(false)} showDisplayToggle />
      )}
      <style>{`
        .tiptap:focus { outline: none; }
        .tiptap h2 { font-size: 1.4rem; margin: 1.5rem 0 0.5rem; }
        .tiptap h3 { font-size: 1.15rem; margin: 1.25rem 0 0.5rem; }
        .tiptap p { margin: 0 0 0.75rem; }
        .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin: 0 0 0.75rem; }
        .tiptap blockquote { border-left: 3px solid #ddd; margin: 0 0 0.75rem; padding-left: 1rem; color: #555; }
        .tiptap pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0 0 0.75rem; font-size: 13px; }
        .tiptap code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-size: 13px; }
        .tiptap pre code { background: none; padding: 0; }
        .tiptap [data-block-math] { text-align: center; margin: 1rem 0; cursor: pointer; padding: 4px 8px; border-radius: 4px; border: 2px solid transparent; }
        .tiptap [data-block-math]:hover { border-color: #ddd; }
        .tiptap .ProseMirror-selectednode[data-block-math] { outline: 2px solid #4a90e2; border-radius: 4px; background: #f0f7ff; }
        .tiptap [data-inline-math] { display: inline; cursor: pointer; border-radius: 3px; border: 1px solid transparent; padding: 0 2px; }
        .tiptap [data-inline-math]:hover { border-color: #ddd; }
        .tiptap .ProseMirror-selectednode[data-inline-math] { outline: 2px solid #4a90e2; border-radius: 3px; background: #f0f7ff; }
        .tiptap img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5rem 0; display: block; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid #4a90e2; }
      `}</style>
    </div>
  )
}

function ToolbarButton({ onClick, active, children }: {
  onClick: () => void
  active: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        padding: '3px 8px', fontSize: 12,
        fontWeight: active ? 600 : 400,
        border: '1px solid #ddd', borderRadius: 4,
        background: active ? '#e8e8e8' : 'white',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
