import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Check, Edit, Trash2, FileText } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store, Note } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function OrderPad() {
  const user = store.getCurrentUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [search, setSearch] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
  }, [filter]);

  const loadNotes = () => {
    const allNotes = filter === 'all' ? store.getNotes() : store.getNotes(filter);
    setNotes(allNotes);
  };

  const handleSave = () => {
    if (!noteText.trim()) return;

    if (editingNote) {
      store.updateNote(editingNote.id, { text: noteText });
      toast({ title: 'Note Updated', description: 'Changes saved successfully' });
    } else {
      store.addNote(noteText, user?.id || '');
      toast({ title: 'Note Created', description: 'New order note added' });
    }

    setNoteText('');
    setEditingNote(null);
    setShowEditor(false);
    loadNotes();
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setNoteText(note.text);
    setShowEditor(true);
  };

  const handleDelete = (id: string) => {
    store.deleteNote(id);
    toast({ title: 'Note Deleted', description: 'Order note removed' });
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

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Order Pad</h1>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => {
                  setEditingNote(null);
                  setNoteText('');
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
          <div className="flex gap-2">
            {(['all', 'pending', 'done'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className={filter === f ? 'gradient-primary' : ''}
                size="sm"
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Editor Modal */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowEditor(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-card"
              >
                <h2 className="text-2xl font-bold mb-4">
                  {editingNote ? 'Edit Note' : 'New Note'}
                </h2>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter order details, items to restock, etc..."
                  className="w-full h-64 p-4 glass-card rounded-2xl bg-card text-foreground border border-glass-border resize-none mb-4"
                  autoFocus
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditor(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!noteText.trim()}
                    className="gradient-primary shadow-md hover:shadow-lg"
                  >
                    Save Note
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Notes</h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Create your first order note' 
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
                  <div className="flex items-center gap-3">
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
                    <div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        note.status === 'done'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {note.status === 'done' ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(note)}
                      className="text-primary hover:text-primary-glow"
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
                <p className={`text-foreground mb-2 whitespace-pre-wrap ${
                  note.status === 'done' ? 'opacity-60 line-through' : ''
                }`}>
                  {note.text}
                </p>
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
