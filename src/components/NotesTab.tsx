import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { NoteNode } from '../types'
import { v4 as uuid } from '../uuid'

interface Props {
  noteTree: NoteNode[]
  onChange: (tree: NoteNode[]) => void
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

function insertNode(tree: NoteNode[], parentId: string | null, node: NoteNode): NoteNode[] {
  if (parentId === null) return [...tree, node]
  return tree.map(n => {
    if (n.id === parentId) return { ...n, children: [...n.children, node] }
    return { ...n, children: insertNode(n.children, parentId, node) }
  })
}

function updateNode(tree: NoteNode[], id: string, patch: Partial<NoteNode>): NoteNode[] {
  return tree.map(n => {
    if (n.id === id) return { ...n, ...patch }
    return { ...n, children: updateNode(n.children, id, patch) }
  })
}

function deleteNode(tree: NoteNode[], id: string): NoteNode[] {
  return tree
    .filter(n => n.id !== id)
    .map(n => ({ ...n, children: deleteNode(n.children, id) }))
}

function findNode(tree: NoteNode[], id: string): NoteNode | null {
  for (const n of tree) {
    if (n.id === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return null
}

// ── Sidebar tree ──────────────────────────────────────────────────────────────

function NoteTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
  onRename,
}: {
  node: NoteNode
  depth: number
  selectedId: string | null
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(node.title)
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0

  function commitRename() {
    onRename(node.id, draft.trim() || 'Untitled')
    setRenaming(false)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer text-xs transition-colors ${
          isSelected ? 'bg-amber-800/40 text-amber-100' : 'text-amber-400/70 hover:bg-amber-900/30 hover:text-amber-200'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => !renaming && onSelect(node.id)}
      >
        {/* collapse toggle */}
        <button
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c) }}
          className={`text-[10px] w-3 shrink-0 text-amber-700/50 hover:text-amber-400 ${!hasChildren ? 'invisible' : ''}`}
        >
          {collapsed ? '▶' : '▼'}
        </button>

        {/* title / rename input */}
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-amber-900/40 border border-amber-600/40 rounded px-1 focus:outline-none text-amber-100"
          />
        ) : (
          <span
            className="flex-1 truncate"
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true); setDraft(node.title) }}
          >
            {node.title || 'Untitled'}
          </span>
        )}

        {/* action buttons — visible on hover */}
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            title="Add child note"
            onClick={e => { e.stopPropagation(); onAddChild(node.id) }}
            className="px-1 hover:text-amber-200"
          >＋</button>
          <button
            title="Rename"
            onClick={e => { e.stopPropagation(); setRenaming(true); setDraft(node.title) }}
            className="px-1 hover:text-amber-200"
          >✎</button>
          <button
            title="Delete"
            onClick={e => { e.stopPropagation(); onDelete(node.id) }}
            className="px-1 hover:text-red-400"
          >✕</button>
        </span>
      </div>

      {/* children */}
      {!collapsed && hasChildren && (
        <div>
          {node.children.map(child => (
            <NoteTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Markdown toolbar ──────────────────────────────────────────────────────────

type ToolbarAction = {
  label: string
  title: string
  wrap?: [string, string]   // wrap selection: [before, after]
  prefix?: string           // prefix each line
  block?: string            // insert a block at cursor
}

const TOOLBAR: ToolbarAction[] = [
  { label: 'B',   title: 'Bold',          wrap: ['**', '**'] },
  { label: 'I',   title: 'Italic',        wrap: ['*', '*'] },
  { label: 'S',   title: 'Strikethrough', wrap: ['~~', '~~'] },
  { label: '`',   title: 'Inline code',   wrap: ['`', '`'] },
  { label: 'H1',  title: 'Heading 1',     prefix: '# ' },
  { label: 'H2',  title: 'Heading 2',     prefix: '## ' },
  { label: 'H3',  title: 'Heading 3',     prefix: '### ' },
  { label: '—',   title: 'Divider',       block: '\n\n---\n\n' },
  { label: '• ',  title: 'Bullet list',   prefix: '- ' },
  { label: '1.',  title: 'Ordered list',  prefix: '1. ' },
  { label: '[ ]', title: 'Task item',     prefix: '- [ ] ' },
  { label: '❝',   title: 'Blockquote',    prefix: '> ' },
]

function applyAction(
  textarea: HTMLTextAreaElement,
  action: ToolbarAction,
  value: string,
  onChange: (v: string) => void,
) {
  const start = textarea.selectionStart
  const end   = textarea.selectionEnd
  const sel   = value.slice(start, end)

  let next = value
  let newStart = start
  let newEnd   = end

  if (action.wrap) {
    const [before, after] = action.wrap
    next = value.slice(0, start) + before + sel + after + value.slice(end)
    newStart = start + before.length
    newEnd   = newStart + sel.length
  } else if (action.prefix) {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    next = value.slice(0, lineStart) + action.prefix + value.slice(lineStart)
    newStart = newEnd = start + action.prefix.length
  } else if (action.block) {
    next = value.slice(0, start) + action.block + value.slice(end)
    newStart = newEnd = start + action.block.length
  }

  onChange(next)
  // restore selection after state update
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(newStart, newEnd)
  })
}

// ── Editor pane ───────────────────────────────────────────────────────────────

function NoteEditor({
  note,
  onChange,
}: {
  note: NoteNode
  onChange: (patch: Partial<NoteNode>) => void
}) {
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Note title */}
      <input
        value={note.title}
        onChange={e => onChange({ title: e.target.value })}
        placeholder="Note title…"
        className="text-xl font-bold bg-transparent text-amber-100 focus:outline-none border-b border-amber-800/30 pb-2 mb-3 placeholder:text-amber-800/40"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 mb-2">
        {TOOLBAR.map(action => (
          <button
            key={action.label}
            title={action.title}
            onMouseDown={e => {
              e.preventDefault() // keep textarea focus
              if (textareaRef.current) {
                applyAction(textareaRef.current, action, note.content, content => onChange({ content }))
              }
            }}
            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-900/40 border border-amber-800/30 text-amber-400 hover:bg-amber-800/50 hover:text-amber-200 transition-colors"
          >
            {action.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setPreview(p => !p)}
          className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
            preview
              ? 'bg-amber-700/40 border-amber-600/50 text-amber-200'
              : 'border-amber-800/30 text-amber-600/60 hover:text-amber-400'
          }`}
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Edit / Preview */}
      {preview ? (
        <div className="flex-1 overflow-y-auto prose prose-invert prose-amber prose-sm max-w-none bg-amber-950/40 rounded-xl border border-amber-800/25 p-4 text-amber-200/80 [&_h1]:text-amber-100 [&_h2]:text-amber-200 [&_h3]:text-amber-300 [&_strong]:text-amber-100 [&_code]:bg-amber-900/60 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-amber-700 [&_hr]:border-amber-800/40 [&_li]:marker:text-amber-600">
          {note.content
            ? <ReactMarkdown>{note.content}</ReactMarkdown>
            : <span className="text-amber-800/40 italic text-xs">Nothing to preview yet.</span>
          }
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={note.content}
          onChange={e => onChange({ content: e.target.value })}
          placeholder="Write in markdown…"
          className="flex-1 min-h-0 resize-none bg-amber-950/40 border border-amber-800/25 rounded-xl p-4 text-sm text-amber-200/80 placeholder:text-amber-800/40 focus:outline-none focus:border-amber-700/40 font-mono leading-relaxed"
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotesTab({ noteTree, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    noteTree.length > 0 ? noteTree[0].id : null
  )

  const selectedNote = selectedId ? findNode(noteTree, selectedId) : null

  function addNote(parentId: string | null) {
    const node: NoteNode = { id: uuid(), title: 'New note', content: '', children: [] }
    const next = insertNode(noteTree, parentId, node)
    onChange(next)
    setSelectedId(node.id)
  }

  function handleDelete(id: string) {
    const next = deleteNode(noteTree, id)
    onChange(next)
    if (selectedId === id) setSelectedId(next.length > 0 ? next[0].id : null)
  }

  function handleNoteChange(patch: Partial<NoteNode>) {
    if (!selectedId) return
    onChange(updateNode(noteTree, selectedId, patch))
  }

  function handleRename(id: string, title: string) {
    onChange(updateNode(noteTree, id, { title }))
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-160px)] min-h-0">
      {/* ── Sidebar ── */}
      <div className="w-52 shrink-0 flex flex-col border-r border-amber-800/25 pr-2 mr-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-700/50">Notes</span>
          <button
            onClick={() => addNote(null)}
            title="New root note"
            className="text-amber-600/60 hover:text-amber-400 text-sm px-1"
          >＋</button>
        </div>

        {noteTree.length === 0 ? (
          <p className="text-[10px] text-amber-800/40 italic text-center mt-8">No notes yet.<br />Press ＋ to create one.</p>
        ) : (
          noteTree.map(node => (
            <NoteTreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={addNote}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))
        )}
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 min-w-0">
        {selectedNote ? (
          <NoteEditor note={selectedNote} onChange={handleNoteChange} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-amber-800/40">
            <span className="text-3xl mb-3">📝</span>
            <p className="text-sm">Select a note or create one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
