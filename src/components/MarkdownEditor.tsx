import { useEffect, useRef } from 'react'
import {
  EditorView, ViewPlugin, ViewUpdate, Decoration, keymap, placeholder as cmPlaceholder,
} from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
export type { EditorView }

// ── Obsidian-style decoration plugin ─────────────────────────────────────────
// Hides markdown syntax marks when the cursor is NOT inside the marked token.
// Token-level: **the** renders as soon as cursor leaves that span, even mid-line.

function buildDecos(view: EditorView): DecorationSet {
  const sel = view.state.selection.main

  // True if cursor/selection overlaps this node's document range
  function onActive(nodeFrom: number, nodeTo: number): boolean {
    return sel.from <= nodeTo && sel.to >= nodeFrom
  }

  const collected: Array<{ from: number; to: number; deco: Decoration }> = []

  syntaxTree(view.state).iterate({
    enter(node) {
      switch (node.name) {
        case 'ATXHeading1':
        case 'ATXHeading2':
        case 'ATXHeading3':
        case 'ATXHeading4':
        case 'ATXHeading5':
        case 'ATXHeading6': {
          // ATXHeading spans the full line — cursor anywhere on that line keeps it raw
          if (onActive(node.from, node.to)) return false
          const level = node.name.charCodeAt(10) - 48
          const headerMark = node.node.firstChild
          if (headerMark?.name === 'HeaderMark') {
            collected.push({ from: headerMark.from, to: headerMark.to, deco: Decoration.replace({}) })
            if (headerMark.to < node.to)
              collected.push({ from: headerMark.to, to: node.to, deco: Decoration.mark({ class: `cm-md-h${level}` }) })
          }
          return false
        }

        case 'StrongEmphasis': {
          if (onActive(node.from, node.to)) return false
          const first = node.node.firstChild
          const last  = node.node.lastChild
          if (first && last && first.from !== last.from) {
            collected.push({ from: first.from, to: first.to, deco: Decoration.replace({}) })
            if (first.to < last.from)
              collected.push({ from: first.to, to: last.from, deco: Decoration.mark({ class: 'cm-md-strong' }) })
            collected.push({ from: last.from, to: last.to, deco: Decoration.replace({}) })
          }
          return false
        }

        case 'Emphasis': {
          if (onActive(node.from, node.to)) return false
          const first = node.node.firstChild
          const last  = node.node.lastChild
          if (first && last && first.from !== last.from) {
            collected.push({ from: first.from, to: first.to, deco: Decoration.replace({}) })
            if (first.to < last.from)
              collected.push({ from: first.to, to: last.from, deco: Decoration.mark({ class: 'cm-md-em' }) })
            collected.push({ from: last.from, to: last.to, deco: Decoration.replace({}) })
          }
          return false
        }

        case 'Strikethrough': {
          if (onActive(node.from, node.to)) return false
          const first = node.node.firstChild
          const last  = node.node.lastChild
          if (first && last && first.from !== last.from) {
            collected.push({ from: first.from, to: first.to, deco: Decoration.replace({}) })
            if (first.to < last.from)
              collected.push({ from: first.to, to: last.from, deco: Decoration.mark({ class: 'cm-md-strike' }) })
            collected.push({ from: last.from, to: last.to, deco: Decoration.replace({}) })
          }
          return false
        }

        case 'InlineCode': {
          if (onActive(node.from, node.to)) return false
          const first = node.node.firstChild
          const last  = node.node.lastChild
          if (first && last && first.from !== last.from) {
            collected.push({ from: first.from, to: first.to, deco: Decoration.replace({}) })
            if (first.to < last.from)
              collected.push({ from: first.to, to: last.from, deco: Decoration.mark({ class: 'cm-md-code' }) })
            collected.push({ from: last.from, to: last.to, deco: Decoration.replace({}) })
          }
          return false
        }

        case 'HorizontalRule':
          if (!onActive(node.from, node.to))
            collected.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: 'cm-md-hr' }) })
          return false

        case 'QuoteMark':
          if (!onActive(node.from, node.to))
            collected.push({ from: node.from, to: node.to, deco: Decoration.replace({}) })
          return false
      }
    },
  })

  collected.sort((a, b) => a.from - b.from)

  try {
    const builder = new RangeSetBuilder<Decoration>()
    for (const { from, to, deco } of collected) builder.add(from, to, deco)
    return builder.finish()
  } catch {
    return Decoration.none
  }
}

const obsidianPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = buildDecos(view) }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged)
        this.decorations = buildDecos(update.view)
    }
  },
  { decorations: v => v.decorations },
)

// ── Amber dark theme ──────────────────────────────────────────────────────────

const amberTheme = EditorView.theme({
  '&': {
    background: 'transparent',
    color: 'rgba(252, 211, 77, 0.75)',
    height: '100%',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
  },
  '.cm-content': {
    padding: '16px',
    caretColor: 'rgb(251, 191, 36)',
    lineHeight: '1.7',
  },
  '.cm-line': { padding: '0' },
  '.cm-cursor': { borderLeftColor: 'rgb(251, 191, 36)', borderLeftWidth: '2px' },
  '.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto' },

  // Selections
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'rgba(180, 120, 20, 0.3)',
  },

  // Markdown rendering classes
  '.cm-md-h1': { fontSize: '1.6em', fontWeight: 'bold', color: '#fef3c7', lineHeight: '1.3' },
  '.cm-md-h2': { fontSize: '1.35em', fontWeight: 'bold', color: '#fde68a', lineHeight: '1.3' },
  '.cm-md-h3': { fontSize: '1.15em', fontWeight: '600', color: '#fcd34d', lineHeight: '1.3' },
  '.cm-md-h4': { fontSize: '1.05em', fontWeight: '600', color: '#f59e0b' },
  '.cm-md-h5': { fontSize: '1em', fontWeight: '600', color: '#d97706' },
  '.cm-md-h6': { fontSize: '0.9em', fontWeight: '600', color: '#b45309' },
  '.cm-md-strong': { fontWeight: 'bold', color: '#fef3c7' },
  '.cm-md-em': { fontStyle: 'italic', color: '#fde68a' },
  '.cm-md-strike': { textDecoration: 'line-through', color: 'rgba(252, 211, 77, 0.4)' },
  '.cm-md-code': {
    background: 'rgba(120, 53, 15, 0.7)',
    padding: '1px 5px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.88em',
    color: '#fcd34d',
  },
  '.cm-md-hr': {
    display: 'block',
    borderBottom: '1px solid rgba(180, 120, 20, 0.4)',
    color: 'transparent',
  },
  '.cm-md-blockquote': {
    borderLeft: '2px solid rgba(180, 120, 20, 0.5)',
    paddingLeft: '12px',
    color: 'rgba(252, 211, 77, 0.5)',
    fontStyle: 'italic',
  },

  // Syntax highlight for raw markdown (on cursor line)
  '.cm-heading': { color: '#fcd34d' },
  '.cm-strong': { color: '#fef3c7' },
  '.cm-emphasis': { color: '#fde68a' },
  '.cm-monospace': { fontFamily: 'monospace', color: '#fcd34d' },
  '.cm-link': { color: '#93c5fd', textDecoration: 'underline' },
  '.cm-url': { color: '#6b7280' },

  // Placeholder
  '.cm-placeholder': { color: 'rgba(180, 120, 20, 0.35)', fontStyle: 'italic' },
}, { dark: true })

// ── React component ───────────────────────────────────────────────────────────

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  onMount?: (view: EditorView) => void
}

export default function MarkdownEditor({ value, onChange, placeholder, className, onMount }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef      = useRef<EditorView | null>(null)
  const onChangeRef  = useRef(onChange)
  const onMountRef   = useRef(onMount)
  onChangeRef.current = onChange
  onMountRef.current  = onMount

  // Create editor once
  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      markdown(),
      obsidianPlugin,
      amberTheme,
      EditorView.lineWrapping,
      history(),
      keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) onChangeRef.current(update.state.doc.toString())
      }),
    ]

    if (placeholder) extensions.push(cmPlaceholder(placeholder))

    const view = new EditorView({
      doc: value,
      extensions,
      parent: containerRef.current,
    })

    viewRef.current = view
    onMountRef.current?.(view)
    return () => { view.destroy(); viewRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value changes (e.g. switching notes)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        // preserve cursor at start to avoid jumping
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={
        'flex-1 min-h-0 overflow-auto rounded-xl border border-amber-800/25 ' +
        'focus-within:border-amber-700/40 transition-colors ' +
        (className ?? '')
      }
    />
  )
}
