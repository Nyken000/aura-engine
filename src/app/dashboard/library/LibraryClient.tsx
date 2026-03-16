'use client'

import { useState, useRef, useTransition } from 'react'
import { uploadRuleBook, deleteRuleBook } from './actions'
import { 
  BookOpen, Upload, Trash2, CheckCircle, Clock, 
  AlertCircle, FileText, Plus, X, Loader2 
} from 'lucide-react'

type RuleBook = {
  id: string
  title: string
  description: string | null
  file_name: string
  file_size: number | null
  gemini_state: string
  created_at: string
}

const STATE_CONFIG = {
  ACTIVE:      { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Listo' },
  PROCESSING:  { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   label: 'Procesando...' },
  FAILED:      { icon: AlertCircle, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',       label: 'Error' },
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibraryClient({ initialBooks }: { initialBooks: RuleBook[] }) {
  const [books, setBooks] = useState(initialBooks)
  const [showUpload, setShowUpload] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.pdf')) { setError('Solo se aceptan archivos PDF.'); return }
    if (file.size > 50 * 1024 * 1024) { setError('El archivo no puede superar 50MB.'); return }
    setError('')
    setSelectedFile(file)
    if (!title) setTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) { setError('Selecciona un archivo PDF.'); return }
    if (!title.trim()) { setError('Escribe un título.'); return }
    
    setError('')
    const fd = new FormData()
    fd.append('file', selectedFile)
    fd.append('title', title)
    fd.append('description', description)

    startTransition(async () => {
      const res = await uploadRuleBook(fd)
      if (res.error) {
        setError(res.error)
      } else {
        // Optimistically add with PROCESSING state
        setBooks(prev => [{
          id: crypto.randomUUID(),
          title: title.trim(),
          description: description.trim() || null,
          file_name: selectedFile!.name,
          file_size: selectedFile!.size,
          gemini_state: res.state ?? 'PROCESSING',
          created_at: new Date().toISOString()
        }, ...prev])
        setShowUpload(false)
        setSelectedFile(null)
        setTitle('')
        setDescription('')
      }
    })
  }

  const handleDelete = async (bookId: string) => {
    if (!confirm('¿Eliminar este libro de reglas? Esto también lo borrará del contexto del Oracle.')) return
    setBooks(prev => prev.filter(b => b.id !== bookId))
    startTransition(async () => { await deleteRuleBook(bookId) })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-amber-500/60 text-xs font-display tracking-[0.15em] uppercase mb-1">Biblioteca de Reglas</p>
          <h2 className="font-display text-2xl font-bold text-parchment-100">
            Manuales D&D
          </h2>
          <p className="text-sm text-foreground/50 mt-1 max-w-md">
            Sube manuales en PDF (PHB, DMG, etc.) para que el Oracle y el Game Master apliquen las reglas oficiales de D&D.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 hover:border-amber-500/50 text-amber-400 font-medium text-sm transition-all duration-200 cursor-pointer"
        >
          {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showUpload ? 'Cancelar' : 'Subir manual'}
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="p-6 rounded-2xl border border-amber-900/30 bg-stone-950/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragging
                  ? 'border-amber-400/60 bg-amber-500/10'
                  : selectedFile
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-amber-900/40 hover:border-amber-500/40 hover:bg-amber-500/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-emerald-400" />
                  <p className="font-medium text-emerald-300">{selectedFile.name}</p>
                  <p className="text-xs text-foreground/40">{formatBytes(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-amber-400/60" />
                  </div>
                  <div>
                    <p className="text-parchment-300 font-medium">Arrastra tu PDF aquí</p>
                    <p className="text-xs text-foreground/40 mt-1">o haz clic para seleccionar · Máx 50MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1.5 block">Título del manual</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Player's Handbook 5E"
                className="w-full bg-stone-900/60 border border-amber-900/30 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-parchment-200 placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1.5 block">Descripción (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ej. Reglas de clases, razas y hechizos"
                className="w-full bg-stone-900/60 border border-amber-900/30 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-parchment-200 placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !selectedFile}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-sm transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-torch-sm hover:shadow-torch"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo y procesando...</>
              ) : (
                <><Upload className="w-4 h-4" /> Subir manual al Oracle</>
              )}
            </button>
          </form>

          <div className="text-xs text-foreground/30 text-center space-y-1">
            <p>El PDF se sube a Gemini File API y puede tardar 1-2 minutos en estar listo.</p>
            <p>Una vez activo, el Oracle y el GM lo usarán como referencia automáticamente.</p>
          </div>
        </div>
      )}

      {/* Book List */}
      {books.length === 0 && !showUpload ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-60">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-amber-500/40" />
          </div>
          <div className="text-center">
            <p className="font-display text-parchment-300 font-bold">La biblioteca está vacía</p>
            <p className="text-sm text-foreground/40 mt-1">Sube el Player&apos;s Handbook para empezar</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => {
            const cfg = STATE_CONFIG[book.gemini_state as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.PROCESSING
            const Icon = cfg.icon
            return (
              <div
                key={book.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-amber-900/20 bg-stone-950/50 hover:bg-stone-900/60 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-amber-500/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-parchment-200 text-sm truncate">{book.title}</p>
                  {book.description && (
                    <p className="text-xs text-foreground/40 mt-0.5 truncate">{book.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-foreground/30">{book.file_name}</span>
                    <span className="text-[10px] text-foreground/20">·</span>
                    <span className="text-[10px] text-foreground/30">{formatBytes(book.file_size)}</span>
                  </div>
                </div>

                {/* State Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.bg} ${cfg.color} shrink-0`}>
                  <Icon className={`w-3 h-3 ${book.gemini_state === 'PROCESSING' ? 'animate-spin' : ''}`} />
                  {cfg.label}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(book.id)}
                  className="p-2 text-foreground/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  title="Eliminar manual"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
