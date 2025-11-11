import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Check, Edit, Trash2, FileText, List, ListOrdered, Type, Eye, EyeOff } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, Note } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function Notes() {
  const user = store.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'order' | 'general' | 'reminder'>('all');
  const [search, setSearch] = useState('');
  const [showAdminOnly, setShowAdminOnly] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<'order' | 'general' | 'reminder'>('general');
  const [noteAdminOnly, setNoteAdminOnly] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
  }, [filter, showAdminOnly]);

  const loadNotes = () => {
    const allNotes = store.getNotes(filter, showAdminOnly, user?.id);
    let filtered = allNotes;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }
    
    setNotes(filtered);
  };

  useEffect(() => {
    loadNotes();
  }, [categoryFilter]);

  const handleFormat = (command: string, value?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = noteText.substring(start, end);
    let newText = '';

    switch (command) {
      case 'bold':
        newText = noteText.substring(0, start) + `**${selectedText || 'bold text'}**` + noteText.substring(end);
        break;
      case 'italic':
        newText = noteText.substring(0, start) + `*${selectedText || 'italic text'}*` + noteText.substring(end);
        break;
      case 'bullet':
        const lines = noteText.split('\n');
        const currentLine = noteText.substring(0, start).split('\n').length - 1;
        lines[currentLine] = lines[currentLine] ? `• ${lines[currentLine]}` : '• ';
        newText = lines.join('\n');
        break;
      case 'number':
        const numLines = noteText.split('\n');
        const numCurrentLine = noteText.substring(0, start).split('\n').length - 1;
        const lineNum = numCurrentLine + 1;
        numLines[numCurrentLine] = numLines[numCurrentLine] ? `${lineNum}. ${numLines[numCurrentLine]}` : `${lineNum}. `;
        newText = numLines.join('\n');
        break;
      default:
        return;
    }

    setNoteText(newText);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + (newText.length - noteText.length);
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const formatText = (text: string) => {
    // Simple markdown-like formatting
    let formatted = text;
    
    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text*
    formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    
    // Bullet points: • item
    formatted = formatted.split('\n').map(line => {
      if (line.trim().startsWith('•')) {
        return `<li>${line.trim().substring(1).trim()}</li>`;
      }
      if (/^\d+\.\s/.test(line.trim())) {
        return `<li>${line.trim()}</li>`;
      }
      return line ? `<p>${line}</p>` : '<br>';
    }).join('');
    
    return formatted;
  };

  const handleSave = () => {
    if (!noteText.trim()) return;

    if (editingNote) {
      store.updateNote(editingNote.id, { 
        text: noteText,
        category: noteCategory,
        adminOnly: noteAdminOnly
      });
      toast({ title: 'Note Updated', description: 'Changes saved successfully' });
    } else {
      store.addNote(noteText, user?.id || '', noteCategory, noteAdminOnly);
      toast({ title: 'Note Created', description: 'New note added' });
    }

    setNoteText('');
    setNoteCategory('general');
    setNoteAdminOnly(false);
    setEditingNote(null);
    setShowEditor(false);
    loadNotes();
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setNoteText(note.text);
    setNoteCategory(note.category);
    setNoteAdminOnly(note.adminOnly);
    setShowEditor(true);
  };

  const handleDelete = (id: string) => {
    store.deleteNote(id);
    toast({ title: 'Note Deleted', description: 'Note removed' });
    loadNotes();
  };

  const handleToggleStatus = (note: Note) => {
    store.updateNote(note.id, { 
      status: note.status === 'pending' ? 'done' : 'pending' 
    });
    loadNotes();
  };

  const filteredNotes = notes.filter(note =>
    note.text.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'order':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'reminder':
        return 'bg-warning/20 text-warning border-warning/30';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Notes</h1>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => {
                  setEditingNote(null);
                  setNoteText('');
                  setNoteCategory('general');
                  setNoteAdminOnly(false);
                  setShowEditor(true);
                }}
                className="gradient-primary shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </Button>
            </motion.div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 glass-card rounded-2xl bg-card text-foreground border border-glass-border"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Status Filter Card */}
            <div className="glass-card rounded-2xl p-4 border-2 border-transparent hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <h3 className="text-sm font-semibold text-foreground">Status</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'done'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filter === f
                        ? 'gradient-primary text-primary-foreground shadow-md scale-105'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Card */}
            <div className="glass-card rounded-2xl p-4 border-2 border-transparent hover:border-accent/20 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-accent"></div>
                <h3 className="text-sm font-semibold text-foreground">Category</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'order', 'general', 'reminder'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      categoryFilter === c
                        ? 'gradient-primary text-primary-foreground shadow-md scale-105'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Notes Toggle Card */}
            {isAdmin && (
              <div className={`glass-card rounded-2xl p-4 border-2 transition-all ${
                showAdminOnly 
                  ? 'border-primary/30 bg-primary/5' 
                  : 'border-transparent hover:border-primary/20'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    showAdminOnly ? 'bg-primary' : 'bg-muted-foreground'
                  }`}></div>
                  <h3 className="text-sm font-semibold text-foreground">Admin Notes</h3>
                </div>
                <button
                  onClick={() => setShowAdminOnly(!showAdminOnly)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    showAdminOnly
                      ? 'bg-primary/10 border-2 border-primary/30'
                      : 'bg-secondary border-2 border-transparent hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {showAdminOnly ? (
                      <Eye className="w-4 h-4 text-primary" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm font-medium ${
                      showAdminOnly ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {showAdminOnly ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-all relative ${
                    showAdminOnly ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                      showAdminOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle>
              <DialogDescription>
                Create a note with formatting options. Use • for bullet points or numbers for numbered lists.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={noteCategory}
                  onValueChange={(value: 'order' | 'general' | 'reminder') => setNoteCategory(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="admin-only"
                    checked={noteAdminOnly}
                    onCheckedChange={(checked) => setNoteAdminOnly(checked === true)}
                  />
                  <Label htmlFor="admin-only" className="text-sm cursor-pointer">
                    Admin Only (visible only to administrators)
                  </Label>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex gap-2 p-2 border rounded-lg bg-secondary/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormat('bold')}
                    className="h-8"
                    title="Bold"
                  >
                    <Type className="w-4 h-4 font-bold" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormat('italic')}
                    className="h-8"
                    title="Italic"
                  >
                    <Type className="w-4 h-4 italic" />
                  </Button>
                  <div className="w-px bg-border mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormat('bullet')}
                    className="h-8"
                    title="Bullet Point"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormat('number')}
                    className="h-8"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </Button>
                </div>
                <Label>Note Content</Label>
                <textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter note details... Use • for bullet points or numbers for numbered lists."
                  className="w-full h-64 p-4 glass-card rounded-2xl bg-card text-foreground border border-glass-border resize-none font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Use **text** for bold, *text* for italic, • for bullets, or 1. 2. 3. for numbered lists
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!noteText.trim()}
                className="gradient-primary shadow-md hover:shadow-lg"
              >
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Notes</h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Create your first note' 
                  : `No ${filter} notes found`}
              </p>
              <Button
                onClick={() => setShowEditor(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl p-6 hover:shadow-card transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleToggleStatus(note)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        note.status === 'done'
                          ? 'bg-success border-success'
                          : 'border-glass-border hover:border-primary'
                      }`}
                    >
                      {note.status === 'done' && (
                        <Check className="w-4 h-4 text-background" />
                      )}
                    </motion.button>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                      note.status === 'done'
                        ? 'bg-success/20 text-success border-success/30'
                        : 'bg-warning/20 text-warning border-warning/30'
                    }`}>
                      {note.status === 'done' ? 'Done' : 'Pending'}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getCategoryColor(note.category)}`}>
                      {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                    </span>
                    {note.adminOnly && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                        Admin Only
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(note)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(note.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                <div 
                  className={`text-foreground mb-2 whitespace-pre-wrap ${
                    note.status === 'done' ? 'opacity-60 line-through' : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatText(note.text) }}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    By {store.getAllUsers().find(u => u.id === note.createdBy)?.name}
                  </span>
                  <span>
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

