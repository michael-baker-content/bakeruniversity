'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent, Node, mergeAttributes, Extension, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import { common, createLowlight } from 'lowlight'
import katex from 'katex'
import dynamic from 'next/dynamic'
import 'katex/dist/katex.min.css'
import type { MafsGraphAttrs } from '@/components/MafsGraph'

const MafsGraph = dynamic(() => import('@/components/MafsGraph'), { ssr: false })

const lowlight = createLowlight(common)

// ── Math nodes ───────────────────────────────────────────────────────────────
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

// ── Mafs graph node ───────────────────────────────────────────────────────────
function MafsGraphNodeView({ node, selected }: { node: { attrs: Record<string, unknown> }; selected: boolean; updateAttributes: (attrs: Record<string, unknown>) => void; deleteNode: () => void }) {
  const attrs = node.attrs as unknown as MafsGraphAttrs
  return (
    <NodeViewWrapper>
      <div style={{
        outline: selected ? '3px solid var(--amber)' : '2px solid transparent',
        borderRadius: 'var(--radius-lg)',
        transition: 'outline 0.1s',
      }}>
        <MafsGraph attrs={attrs} />
      </div>
    </NodeViewWrapper>
  )
}

const MafsGraphNode = Node.create({
  name: 'mafsGraph',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      functions: { default: [] },
      xMin: { default: -5 },
      xMax: { default: 5 },
      yMin: { default: -5 },
      yMax: { default: 5 },
      xStep: { default: null },
      yStep: { default: null },
      showGrid: { default: true },
      label: { default: '' },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-mafs-graph]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-mafs-graph': JSON.stringify(node.attrs),
    })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(MafsGraphNodeView as Parameters<typeof ReactNodeViewRenderer>[0])
  },
})

// ── Math keyboard shortcut extension ─────────────────────────────────────────
const MathShortcut = Extension.create({
  name: 'mathShortcut',
  addKeyboardShortcuts() {
    const handleMath = () => {
      const { state } = this.editor
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 300), from)

      // Block math: $$...$$ — must be at start of paragraph or after whitespace
      const blockMatch = textBefore.match(/\$\$([\s\S]+?)\$\$$/)
      if (blockMatch) {
        const latex = blockMatch[1].trim()
        if (latex) {
          this.editor.chain()
            .deleteRange({ from: from - blockMatch[0].length, to: from })
            .insertContent({ type: 'blockMath', attrs: { latex } })
            .run()
          return true
        }
      }

      // Inline math: $...$ — single dollar signs
      const inlineMatch = textBefore.match(/\$([^$\n]+)\$$/)
      if (inlineMatch) {
        const latex = inlineMatch[1].trim()
        if (latex) {
          this.editor.chain()
            .deleteRange({ from: from - inlineMatch[0].length, to: from })
            .insertContent({ type: 'inlineMath', attrs: { latex } })
            .run()
          return true
        }
      }
      return false
    }
    return {
      Space: handleMath,
      Enter: handleMath,
    }
  },
})

// ── Pack definitions ──────────────────────────────────────────────────────────
export type EditorPack = 'math' | 'code' | 'graph'

// ── Props ─────────────────────────────────────────────────────────────────────
interface TipTapEditorProps {
  content?: Record<string, unknown>
  onChange?: (content: Record<string, unknown>) => void
  editable?: boolean
  packs?: EditorPack[]
  onEditorReady?: (insert: (doc: Record<string, unknown>) => void) => void
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
  onGraphButtonClick,
  onInsertGraph,
  onLatexButtonClick,
  onInsertLatex,
}: TipTapEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const hasMath = packs.includes('math')
  const hasCode = packs.includes('code')
  const hasGraph = packs.includes('graph')

  // ── Build extensions list based on packs ──────────────────────────────────
  const extensions = [
    StarterKit.configure({ codeBlock: false }),
    Image.configure({ inline: false, allowBase64: false }),
    ...(hasCode ? [CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'python' })] : []),
    ...(hasMath ? [InlineMath, BlockMath, MathShortcut] : []),
    ...(hasGraph ? [MafsGraphNode] : []),
  ]

  // ── Editor instance ───────────────────────────────────────────────────────
  const editor = useEditor({
    extensions,
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

  // ── Expose insert function for markdown import ────────────────────────────
  useEffect(() => {
    if (!editor || !onEditorReady) return
    onEditorReady((doc: Record<string, unknown>) => {
      const nodes = (doc.content as Record<string, unknown>[] | undefined) ?? []
      nodes.forEach((node) => {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, node).run()
      })
    })
  }, [editor, onEditorReady])

  // ── Render KaTeX ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMath || !editorRef.current) return
    editorRef.current.querySelectorAll<HTMLElement>('[data-inline-math]').forEach((el) => {
      try { katex.render(el.dataset.inlineMath ?? '', el, { throwOnError: false, displayMode: false }) }
      catch { /* ignore */ }
    })
    editorRef.current.querySelectorAll<HTMLElement>('[data-block-math]').forEach((el) => {
      try { katex.render(el.dataset.blockMath ?? '', el, { throwOnError: false, displayMode: true }) }
      catch { /* ignore */ }
    })
  })

  // ── Image upload ──────────────────────────────────────────────────────────
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleImageUpload(file)
    e.target.value = ''
  }

  // ── Insert LaTeX from modal ───────────────────────────────────────────────
  const insertLatexFormula = useCallback((latex: string, displayMode: boolean) => {
    if (!editor) return
    if (displayMode) {
      editor.chain().focus().insertContent({ type: 'blockMath', attrs: { latex } }).run()
    } else {
      editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex } }).run()
    }
  }, [editor])

  // Expose insertLatexFormula to parent
  useEffect(() => {
    onInsertLatex?.(insertLatexFormula)
  }, [insertLatexFormula, onInsertLatex])

  const insertGraph = useCallback((attrs: MafsGraphAttrs) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'mafsGraph', attrs }).run()
  }, [editor])

  // Expose insertGraph to parent via onInsertGraph callback
  useEffect(() => {
    onInsertGraph?.(insertGraph)
  }, [insertGraph, onInsertGraph])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)' }}>
      {editable && editor && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>I</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</ToolbarButton>
          {hasCode && (
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>Code</ToolbarButton>
          )}
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
          {hasMath && (
            <ToolbarButton onClick={() => onLatexButtonClick?.()} active={false}>∑ Formula</ToolbarButton>
          )}
          {hasGraph && (
            <ToolbarButton onClick={() => onGraphButtonClick?.()} active={false}>📈 Graph</ToolbarButton>
          )}
          {hasMath && (
            <>
              <span style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
                $x^2$ or $$x^2$$ then Space
              </span>
            </>
          )}
        </div>
      )}
      <div
        ref={editorRef}
        onClick={() => editor?.commands.focus()}
        style={{ minHeight: editable ? 400 : undefined, cursor: editable ? 'text' : 'default' }}
      >
        <EditorContent
          editor={editor}
          style={{ padding: '1rem', fontSize: 15, lineHeight: 1.7 }}
        />
      </div>
      <style>{`
        .tiptap:focus { outline: none; }
        .tiptap h2 { font-size: 1.4rem; margin: 1.5rem 0 0.5rem; }
        .tiptap h3 { font-size: 1.15rem; margin: 1.25rem 0 0.5rem; }
        .tiptap p { margin: 0 0 0.75rem; }
        .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin: 0 0 0.75rem; }
        .tiptap blockquote { border-left: 3px solid var(--border); margin: 0 0 0.75rem; padding-left: 1rem; color: var(--text-2); }
        .tiptap pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0 0 0.75rem; font-size: 13px; }
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
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: active ? 'var(--surface-3, var(--border))' : 'var(--surface)',
        color: active ? 'var(--text)' : 'var(--text-2)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
