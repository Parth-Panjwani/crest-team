import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useStore } from '@/hooks/useStore';
import { Plus, Search, Check, Edit, Trash2, FileText, List, ListOrdered, Type, Eye, EyeOff, RotateCcw, Trash, Filter, Package, PackageX, PackageCheck, ChevronRight, Image as ImageIcon, X, Upload, Loader2, ZoomIn, ZoomOut, Download } from 'lucide-react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshButton } from '@/components/RefreshButton';

// Helper function to get presigned URL for a file
async function getPresignedFileUrl(fileKey: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/files/${encodeURIComponent(fileKey)}?expiresIn=${expiresIn}`
      : `/api/files/${encodeURIComponent(fileKey)}?expiresIn=${expiresIn}`
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      return data.url
    }
    return null
  } catch (err) {
    console.error("Failed to get presigned URL:", err)
    return null
  }
}

// Helper to extract S3 key from URL or return as-is if already a key
function extractS3Key(imageUrl: string): string {
  // If it's already a key (starts with "uploads/"), return as-is
  if (imageUrl.startsWith('uploads/')) {
    return imageUrl
  }
  
  // Try to extract key from S3 URL
  // Pattern: https://bucket.s3.region.amazonaws.com/uploads/...
  // or: https://s3.region.amazonaws.com/bucket/uploads/...
  const s3KeyMatch = imageUrl.match(/uploads\/[^?]+/)
  if (s3KeyMatch) {
    return s3KeyMatch[0]
  }
  
  // If we can't extract, assume it's already a key or return as-is
  return imageUrl
}

// Component to display note image with presigned URL
function NoteImage({ 
  imageUrl: imageUrlOrKey, 
  onClick 
}: { 
  imageUrl: string
  onClick?: () => void
}) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      setLoading(true)
      setError(false)
      
      // Check if it's an S3 key (starts with "uploads/")
      const isS3Key = imageUrlOrKey.startsWith('uploads/')
      
      if (isS3Key) {
        // For S3 keys, always get presigned URL (required for mobile/CORS)
        const presignedUrl = await getPresignedFileUrl(imageUrlOrKey, 3600)
        if (presignedUrl) {
          // Verify presigned URL works
          const img = new Image()
          img.onload = () => {
            setDisplayUrl(presignedUrl)
            setLoading(false)
            setError(false)
          }
          img.onerror = () => {
            console.error('Failed to load presigned URL for key:', imageUrlOrKey)
            setError(true)
            setLoading(false)
          }
          img.src = presignedUrl
        } else {
          console.error('Failed to get presigned URL for key:', imageUrlOrKey)
          setError(true)
          setLoading(false)
        }
      } else {
        // For direct URLs, try direct first, then presigned if it fails
        const img = new Image()
        img.onload = () => {
          setDisplayUrl(imageUrlOrKey)
          setLoading(false)
          setError(false)
        }
        img.onerror = async () => {
          // If direct URL fails, try to get presigned URL
          const key = extractS3Key(imageUrlOrKey)
          const presignedUrl = await getPresignedFileUrl(key, 3600)
          if (presignedUrl) {
            const presignedImg = new Image()
            presignedImg.onload = () => {
              setDisplayUrl(presignedUrl)
              setLoading(false)
              setError(false)
            }
            presignedImg.onerror = () => {
              console.error('Failed to load presigned URL:', presignedUrl)
              setError(true)
              setLoading(false)
            }
            presignedImg.src = presignedUrl
          } else {
            setError(true)
            setLoading(false)
          }
        }
        img.src = imageUrlOrKey
      }
    }

    loadImage()
  }, [imageUrlOrKey])

  if (error) {
    return (
      <div className="w-full max-h-64 flex items-center justify-center bg-secondary/20 border border-glass-border rounded-lg p-4">
        <div className="text-center">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Failed to load image</p>
        </div>
      </div>
    )
  }

  if (!displayUrl && loading) {
    return (
      <div className="w-full max-h-64 flex items-center justify-center bg-secondary/20 border border-glass-border rounded-lg p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!displayUrl) {
    return null
  }

  return (
    <div 
      className={`mb-2 relative ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center rounded-lg z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div className="relative">
        <img
          src={displayUrl || ''}
          alt="Note attachment"
          className="w-full max-h-64 object-contain rounded-lg border border-glass-border"
          style={{ display: loading ? "none" : "block" }}
          onLoad={() => {
            setLoading(false)
            setError(false)
          }}
          onError={async () => {
            // Retry with presigned URL if direct load fails
            if (displayUrl && !displayUrl.includes('X-Amz-Signature')) {
              const key = extractS3Key(imageUrlOrKey)
              const presignedUrl = await getPresignedFileUrl(key, 3600)
              if (presignedUrl) {
                setDisplayUrl(presignedUrl)
              } else {
                setError(true)
                setLoading(false)
              }
            } else {
              setError(true)
              setLoading(false)
            }
          }}
        />
        {onClick && !loading && !error && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded-lg">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Notes() {
  // Subscribe to store updates to force re-renders when data changes
  useStore();
  const user = store.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [notes, setNotes] = useState<Note[]>([]);
  const [deletedNotes, setDeletedNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'order' | 'general' | 'reminder'>('all');
  const [search, setSearch] = useState('');
  const [showAdminOnly, setShowAdminOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'recycle'>('notes');
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [noteToPermanentDelete, setNoteToPermanentDelete] = useState<string | null>(null);
  const [recycleBinEmployeeFilter, setRecycleBinEmployeeFilter] = useState<string>('all');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<'order' | 'general' | 'reminder'>('general');
  const [noteSubCategory, setNoteSubCategory] = useState<'refill-stock' | 'remove-from-stock' | 'out-of-stock' | undefined>(undefined);
  const [noteAdminOnly, setNoteAdminOnly] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [noteImageUrl, setNoteImageUrl] = useState<string | undefined>(undefined);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    fileName: string
    fileKey?: string
  } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const imageViewerRef = useRef<HTMLDivElement>(null);

  const loadNotes = useCallback(() => {
    const statusFilter = filter === 'all' ? undefined : filter;
    const allNotes = store.getNotes(statusFilter, showAdminOnly, user?.id);
    let filtered = allNotes;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }
    
    setNotes(filtered);
    
    // Load deleted notes for current user
    setDeletedNotes(store.getDeletedNotes(user?.id));
  }, [filter, showAdminOnly, categoryFilter, user?.id]);

  // Get current notes count to detect store changes
  const notesCount = store.getNotes().length;
  const deletedNotesCount = store.getDeletedNotes(user?.id).length;

  useEffect(() => {
    loadNotes();
  }, [loadNotes, notesCount, deletedNotesCount]); // Re-run when store data changes

  // Auto-refresh every 2 seconds
  useAutoRefresh(loadNotes, 2000);

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
      case 'bullet': {
        const lines = noteText.split('\n');
        const currentLine = noteText.substring(0, start).split('\n').length - 1;
        lines[currentLine] = lines[currentLine] ? `• ${lines[currentLine]}` : '• ';
        newText = lines.join('\n');
        break;
      }
      case 'number': {
        const numLines = noteText.split('\n');
        const numCurrentLine = noteText.substring(0, start).split('\n').length - 1;
        const lineNum = numCurrentLine + 1;
        numLines[numCurrentLine] = numLines[numCurrentLine] ? `${lineNum}. ${numLines[numCurrentLine]}` : `${lineNum}. `;
        newText = numLines.join('\n');
        break;
      }
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

  const handleSave = async () => {
    if (!noteText.trim() && !noteImageUrl) return;

    try {
      if (editingNote) {
        await store.updateNote(editingNote.id, { 
          text: noteText,
          category: noteCategory,
          subCategory: noteCategory === 'reminder' ? noteSubCategory : undefined,
          adminOnly: noteAdminOnly,
          imageUrl: noteImageUrl
        });
        toast({ title: 'Note Updated', description: 'Changes saved successfully' });
      } else {
        await store.addNote(noteText, user?.id || '', noteCategory, noteAdminOnly, noteCategory === 'reminder' ? noteSubCategory : undefined, noteImageUrl);
        toast({ title: 'Note Created', description: 'New note added' });
      }

      setNoteText('');
      setNoteCategory('general');
      setNoteSubCategory(undefined);
      setNoteAdminOnly(false);
      setNoteImageUrl(undefined);
      setEditingNote(null);
      setShowEditor(false);
      loadNotes();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save note',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setNoteText(note.text);
    setNoteCategory(note.category);
    setNoteSubCategory(note.subCategory);
    setNoteAdminOnly(note.adminOnly);
    setNoteImageUrl(note.imageUrl);
    setShowEditor(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images only for notes)
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      // Get upload URL
      const { uploadUrl, key, fileUrl } = await store.getUploadUrl(
        file.name,
        file.type,
        file.size
      );
      
      // Upload to S3
      await store.uploadFileToS3(uploadUrl, file);
      
      // Store the S3 key instead of the full URL for presigned URL generation
      // The key is what we need to generate presigned URLs later
      setNoteImageUrl(key);
      toast({
        title: 'Image uploaded',
        description: 'Image ready to attach',
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    if (noteImageUrl) {
      // Extract key from URL if possible, or just clear the URL
      setNoteImageUrl(undefined);
    }
  };

  const handleDelete = (id: string) => {
    store.deleteNote(id, user?.id);
    toast({ title: 'Note Deleted', description: 'Note moved to recycle bin' });
    loadNotes();
  };

  const handleRestore = (id: string) => {
    store.restoreNote(id);
    toast({ title: 'Note Restored', description: 'Note has been restored' });
    loadNotes();
  };

  const handlePermanentDelete = (id: string) => {
    setNoteToPermanentDelete(id);
    setShowPermanentDeleteDialog(true);
  };

  const confirmPermanentDelete = async () => {
    if (noteToPermanentDelete) {
      try {
        await store.permanentDeleteNote(noteToPermanentDelete);
        toast({ title: 'Note Permanently Deleted', description: 'Note has been permanently removed', variant: 'destructive' });
        setNoteToPermanentDelete(null);
        setShowPermanentDeleteDialog(false);
        // refreshData() is already called in permanentDeleteNote, which triggers notifyListeners()
        // Force a reload to ensure the UI updates immediately
        loadNotes();
      } catch (error) {
        toast({ 
          title: 'Error', 
          description: error instanceof Error ? error.message : 'Failed to permanently delete note', 
          variant: 'destructive' 
        });
      }
    }
  };

  const handleToggleStatus = (note: Note) => {
    const newStatus = note.status === 'pending' ? 'done' : 'pending';
    if (newStatus === 'done') {
      // When marking as complete, move to recycle bin
      store.deleteNote(note.id, user?.id);
      toast({ title: 'Note Completed', description: 'Note has been moved to recycle bin' });
    } else {
      // If restoring from done, just update status
      store.updateNote(note.id, { 
        status: newStatus,
        completedBy: undefined,
        completedAt: undefined,
      });
    }
    loadNotes();
  };

  const filteredNotes = notes.filter(note =>
    note.text.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryColor = (category: string, subCategory?: string) => {
    if (category === 'reminder' && subCategory) {
      switch (subCategory) {
        case 'refill-stock':
          return 'bg-primary/20 text-primary border-primary/30';
        case 'remove-from-stock':
          return 'bg-warning/20 text-warning border-warning/30';
        case 'out-of-stock':
          return 'bg-destructive/20 text-destructive border-destructive/30';
        default:
          return 'bg-warning/20 text-warning border-warning/30';
      }
    }
    switch (category) {
      case 'order':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'reminder':
        return 'bg-warning/20 text-warning border-warning/30';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const getSubCategoryLabel = (subCategory?: string) => {
    switch (subCategory) {
      case 'refill-stock':
        return 'Refill Stock';
      case 'remove-from-stock':
        return 'Remove from Stock';
      case 'out-of-stock':
        return 'Out of Stock';
      default:
        return null;
    }
  };

  const getSubCategoryIcon = (subCategory?: string) => {
    switch (subCategory) {
      case 'refill-stock':
        return <PackageCheck className="w-3 h-3" />;
      case 'remove-from-stock':
        return <PackageX className="w-3 h-3" />;
      case 'out-of-stock':
        return <Package className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col gap-4 mb-4">
            {/* Title and New Note Button Row */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Notes</h1>
              </div>
              <RefreshButton onRefresh={loadNotes} />
            </div>
            <div className="flex justify-between items-center mt-4">
              <div>
                <p className="text-sm text-muted-foreground mt-1">Track and manage your notes</p>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => {
                  setEditingNote(null);
                  setNoteText('');
                  setNoteCategory('general');
                  setNoteSubCategory(undefined);
                  setNoteAdminOnly(false);
                  setNoteImageUrl(undefined);
                  setShowEditor(true);
                }}
                  className="gradient-primary shadow-md hover:shadow-lg text-sm md:text-base"
                  size="sm"
                >
                  <Plus className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">New Note</span>
                </Button>
              </motion.div>
            </div>
            
            {/* Segmented Control - Same as Attendance */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notes' | 'recycle')} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="notes">Active Notes</TabsTrigger>
                <TabsTrigger value="recycle" className="relative">
                  Recycle Bin
                  {deletedNotes.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {deletedNotes.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="notes" className="space-y-4">
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

                {/* Notes List */}
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
                      className="glass-card rounded-2xl p-6 hover:shadow-card transition-all cursor-pointer"
                      whileHover={{ scale: 1.01, y: -2 }}
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(note);
                            }}
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getCategoryColor(note.category, note.subCategory)} flex items-center gap-1`}>
                              {note.category === 'reminder' && note.subCategory && getSubCategoryIcon(note.subCategory)}
                              {note.category === 'reminder' && note.subCategory 
                                ? getSubCategoryLabel(note.subCategory)
                                : note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                            </span>
                            {note.category === 'reminder' && !note.subCategory && (
                              <span className="text-xs text-muted-foreground italic">(No type selected)</span>
                            )}
                          </div>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(note);
                            }}
                            className="text-primary hover:text-primary/80"
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(note.id);
                            }}
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
                      {note.imageUrl && (
                        <NoteImage 
                          imageUrl={note.imageUrl} 
                          onClick={(e) => {
                            e.stopPropagation();
                            const key = extractS3Key(note.imageUrl);
                            getPresignedFileUrl(key, 3600).then((url) => {
                              if (url) {
                                setSelectedImage({
                                  url,
                                  fileName: key.split('/').pop() || 'image',
                                  fileKey: key,
                                });
                              }
                            });
                          }}
                        />
                      )}
                      {note.status === 'done' && note.completedBy && note.completedAt && (
                        <div className="mb-2 p-2 bg-success/10 rounded-lg border border-success/20">
                          <p className="text-xs text-success font-medium">
                            Completed by {store.getUserById(note.completedBy)?.name || 'Unknown'} on {new Date(note.completedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
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
              </TabsContent>

              <TabsContent value="recycle" className="space-y-4">
                {/* Employee Filter for Recycle Bin */}
                {isAdmin && deletedNotes.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 border border-glass-border">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold">Filter by Employee:</span>
                      </div>
                      <Select
                        value={recycleBinEmployeeFilter}
                        onValueChange={setRecycleBinEmployeeFilter}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="All Employees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          {store.getAllUsers().filter(u => u.role === 'employee' || u.role === 'admin').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {(() => {
                  const filteredDeletedNotes = recycleBinEmployeeFilter === 'all' || !isAdmin
                    ? deletedNotes
                    : deletedNotes.filter(note => 
                        note.createdBy === recycleBinEmployeeFilter || 
                        note.deletedBy === recycleBinEmployeeFilter
                      );

                  return filteredDeletedNotes.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                      <Trash className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">
                        {recycleBinEmployeeFilter !== 'all' && isAdmin 
                          ? 'No deleted notes for this employee' 
                          : 'Recycle Bin is Empty'}
                      </h3>
                      <p className="text-muted-foreground">
                        {recycleBinEmployeeFilter !== 'all' && isAdmin
                          ? 'Try selecting a different employee'
                          : 'Deleted notes will appear here'}
                      </p>
                    </div>
                  ) : (
                    filteredDeletedNotes.map((note, index) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card rounded-2xl p-6 border-2 border-destructive/20 bg-destructive/5"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getCategoryColor(note.category, note.subCategory)} flex items-center gap-1`}>
                              {note.category === 'reminder' && note.subCategory && getSubCategoryIcon(note.subCategory)}
                              {note.category === 'reminder' && note.subCategory 
                                ? getSubCategoryLabel(note.subCategory)
                                : note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                            </span>
                            {note.adminOnly && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-primary/20 text-primary border-primary/30">
                                Admin Only
                              </span>
                            )}
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                              note.status === 'done'
                                ? 'bg-success/20 text-success border-success/30'
                                : 'bg-warning/20 text-warning border-warning/30'
                            }`}>
                              {note.status === 'done' ? 'Done' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleRestore(note.id)}
                              className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-all"
                              title="Restore Note"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </motion.button>
                            {isAdmin && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handlePermanentDelete(note.id)}
                                className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                                title="Permanently Delete"
                              >
                                <Trash className="w-4 h-4" />
                              </motion.button>
                            )}
                          </div>
                        </div>
                        <div 
                          className="text-foreground mb-2 whitespace-pre-wrap opacity-60 line-through"
                          dangerouslySetInnerHTML={{ __html: formatText(note.text) }}
                        />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <span>
                              Created by {store.getAllUsers().find(u => u.id === note.createdBy)?.name} on {new Date(note.createdAt).toLocaleString()}
                            </span>
                            {note.deletedBy && note.deletedAt && (
                              <span className="text-destructive">
                                Deleted by {store.getUserById(note.deletedBy)?.name || 'Unknown'} on {new Date(note.deletedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-visible">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle>
              <DialogDescription>
                Create a note with formatting options. Use • for bullet points or numbers for numbered lists.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-visible">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={noteCategory}
                  onValueChange={(value: 'order' | 'general' | 'reminder') => {
                    setNoteCategory(value);
                    // Reset subCategory when changing category
                    if (value !== 'reminder') {
                      setNoteSubCategory(undefined);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">
                      <div className="flex items-center gap-2">
                        <ListOrdered className="w-4 h-4" />
                        <span>Order</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>General</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="reminder">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>Reminder</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-Category Selector (only for Reminder) */}
              {noteCategory === 'reminder' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-visible"
                >
                  <Label className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span>Reminder Type</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 overflow-visible">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setNoteSubCategory('refill-stock')}
                      className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                        noteSubCategory === 'refill-stock'
                          ? 'border-primary bg-primary/10 shadow-lg z-10'
                          : 'border-glass-border bg-card hover:border-primary/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <PackageCheck className={`w-5 h-5 ${
                          noteSubCategory === 'refill-stock' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <span className={`font-semibold text-sm ${
                          noteSubCategory === 'refill-stock' ? 'text-primary' : 'text-foreground'
                        }`}>
                          Refill Stock
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Items need to be restocked</p>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setNoteSubCategory('remove-from-stock')}
                      className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                        noteSubCategory === 'remove-from-stock'
                          ? 'border-warning bg-warning/10 shadow-lg z-10'
                          : 'border-glass-border bg-card hover:border-warning/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <PackageX className={`w-5 h-5 ${
                          noteSubCategory === 'remove-from-stock' ? 'text-warning' : 'text-muted-foreground'
                        }`} />
                        <span className={`font-semibold text-sm ${
                          noteSubCategory === 'remove-from-stock' ? 'text-warning' : 'text-foreground'
                        }`}>
                          Remove from Stock
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Items to be removed</p>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setNoteSubCategory('out-of-stock')}
                      className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                        noteSubCategory === 'out-of-stock'
                          ? 'border-destructive bg-destructive/10 shadow-lg z-10'
                          : 'border-glass-border bg-card hover:border-destructive/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Package className={`w-5 h-5 ${
                          noteSubCategory === 'out-of-stock' ? 'text-destructive' : 'text-muted-foreground'
                        }`} />
                        <span className={`font-semibold text-sm ${
                          noteSubCategory === 'out-of-stock' ? 'text-destructive' : 'text-foreground'
                        }`}>
                          Out of Stock
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Items currently unavailable</p>
                    </motion.button>
                  </div>
                </motion.div>
              )}

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

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Image (Optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {noteImageUrl ? (
                  <div className="relative">
                    <NoteImage imageUrl={noteImageUrl} />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={(!noteText.trim() && !noteImageUrl) || uploadingImage}
                className="gradient-primary shadow-md hover:shadow-lg"
              >
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Note Detail Dialog */}
        <Dialog open={!!selectedNote} onOpenChange={(open) => {
          if (!open) setSelectedNote(null);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedNote && (
              <>
                <DialogHeader>
                  <DialogTitle>Note Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Status and Category */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                      selectedNote.status === 'done'
                        ? 'bg-success/20 text-success border-success/30'
                        : 'bg-warning/20 text-warning border-warning/30'
                    }`}>
                      {selectedNote.status === 'done' ? 'Done' : 'Pending'}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getCategoryColor(selectedNote.category, selectedNote.subCategory)} flex items-center gap-1`}>
                      {selectedNote.category === 'reminder' && selectedNote.subCategory && getSubCategoryIcon(selectedNote.subCategory)}
                      {selectedNote.category === 'reminder' && selectedNote.subCategory 
                        ? getSubCategoryLabel(selectedNote.subCategory)
                        : selectedNote.category.charAt(0).toUpperCase() + selectedNote.category.slice(1)}
                    </span>
                    {selectedNote.adminOnly && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                        Admin Only
                      </span>
                    )}
                  </div>

                  {/* Note Text */}
                  <div 
                    className="text-foreground whitespace-pre-wrap p-4 bg-secondary/10 rounded-lg border border-glass-border"
                    dangerouslySetInnerHTML={{ __html: formatText(selectedNote.text) }}
                  />

                  {/* Note Image */}
                  {selectedNote.imageUrl && (
                    <div>
                      <NoteImage 
                        imageUrl={selectedNote.imageUrl}
                        onClick={() => {
                          const key = extractS3Key(selectedNote.imageUrl);
                          getPresignedFileUrl(key, 3600).then((url) => {
                            if (url) {
                              setSelectedImage({
                                url,
                                fileName: key.split('/').pop() || 'image',
                                fileKey: key,
                              });
                            }
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Completion Info */}
                  {selectedNote.status === 'done' && selectedNote.completedBy && selectedNote.completedAt && (
                    <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                      <p className="text-sm text-success font-medium">
                        Completed by {store.getUserById(selectedNote.completedBy)?.name || 'Unknown'} on {new Date(selectedNote.completedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Created Info */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-glass-border">
                    <p>Created by: {store.getUserById(selectedNote.createdBy)?.name || 'Unknown'}</p>
                    <p>Created at: {new Date(selectedNote.createdAt).toLocaleString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-glass-border">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleEdit(selectedNote);
                        setSelectedNote(null);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleToggleStatus(selectedNote);
                        setSelectedNote(null);
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {selectedNote.status === 'done' ? 'Mark Pending' : 'Mark Done'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleDelete(selectedNote.id);
                        setSelectedNote(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Viewer Dialog */}
        <Dialog
          open={!!selectedImage}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedImage(null);
              setImageZoom(1);
            }
          }}
        >
          <DialogContent className="max-w-7xl max-h-[90vh] p-0 glass-strong overflow-hidden [&>button]:hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>{selectedImage?.fileName || 'Image Viewer'}</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div
                className="relative w-full h-[80vh] flex items-center justify-center bg-black/50"
                ref={imageViewerRef}
              >
                <img
                  src={selectedImage.url}
                  alt={selectedImage.fileName}
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{ transform: `scale(${imageZoom})` }}
                  onError={async (e) => {
                    if (selectedImage.fileKey) {
                      const presignedUrl = await getPresignedFileUrl(selectedImage.fileKey, 3600);
                      if (presignedUrl) {
                        e.currentTarget.src = presignedUrl;
                        return;
                      }
                    }
                    console.error("Image viewer error:", selectedImage.url);
                    toast({
                      title: "Image load failed",
                      description: "Could not load image",
                      variant: "destructive",
                    });
                  }}
                />

                {/* Zoom Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 glass-strong rounded-lg px-4 py-2 border border-glass-border z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[60px] text-center">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageZoom(1)}
                    className="ml-2 h-9"
                  >
                    Reset
                  </Button>
                </div>

                {/* Top Right Controls */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 glass-strong"
                    onClick={async () => {
                      if (!selectedImage) return;

                      try {
                        let downloadUrl = selectedImage.url;
                        if (selectedImage.fileKey) {
                          const presignedUrl = await getPresignedFileUrl(selectedImage.fileKey, 3600);
                          if (presignedUrl) {
                            downloadUrl = presignedUrl;
                          }
                        }

                        const link = document.createElement("a");
                        link.href = downloadUrl;
                        link.download = selectedImage.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        toast({
                          title: "Download started",
                          description: `Downloading ${selectedImage.fileName}`,
                        });
                      } catch (error) {
                        console.error("Download error:", error);
                        toast({
                          title: "Download failed",
                          description: "Could not download image",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 glass-strong"
                    onClick={() => {
                      setSelectedImage(null);
                      setImageZoom(1);
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Permanent Delete Confirmation Dialog */}
        <AlertDialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete Note?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the note from the recycle bin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmPermanentDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

