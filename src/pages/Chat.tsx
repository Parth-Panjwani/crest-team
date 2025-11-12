import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/hooks/useStore"
import {
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  Download,
  Check,
  CheckCheck,
  Mic,
  Square,
  Loader2,
  Users,
  Info,
  Edit2,
  ZoomIn,
  ZoomOut,
  Calendar,
  Search,
  Phone,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  ThumbsUp,
  Flame,
  Video,
  Link as LinkIcon,
  Music,
  Trash2,
  Reply,
} from "lucide-react"
import { Layout } from "@/components/Layout"
import {
  store,
  ChatMessage,
  FileAttachment,
  User,
  type Chat,
} from "@/lib/store"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { format, isToday, isYesterday, startOfDay, parseISO } from "date-fns"

const GROUP_CHAT_ID = "group-chat-all"

// Helper function to get presigned URL for a file
async function getPresignedFileUrl(
  fileKey: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const apiBase = import.meta.env.VITE_API_URL || ""
    const url = apiBase
      ? `${apiBase}/api/files/${encodeURIComponent(
          fileKey
        )}?expiresIn=${expiresIn}`
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

// Helper function to get presigned URL for an image (alias for backward compatibility)
async function getPresignedImageUrl(fileKey: string): Promise<string | null> {
  return getPresignedFileUrl(fileKey)
}

// Component for image thumbnail in Group Info modal
function ImageThumbnail({
  photo,
  onImageClick,
}: {
  photo: FileAttachment
  onImageClick: (url: string, fileName: string, fileKey?: string) => void
}) {
  const [imageUrl, setImageUrl] = useState<string>(photo.fileUrl)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      if (!photo.id) {
        // No ID, use direct URL
        return
      }

      // Always get presigned URL for S3 files
      const presignedUrl = await getPresignedImageUrl(photo.id)
      if (presignedUrl) {
        setImageUrl(presignedUrl)
      }
    }

    loadImage()
  }, [photo.id])

  return (
    <div
      className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-secondary/20 border border-glass-border group relative"
      onClick={() => onImageClick(imageUrl, photo.fileName, photo.id)}
    >
      {!imageError ? (
        <img
          src={imageUrl}
          alt={photo.fileName}
          className="w-full h-full object-cover"
          onError={async () => {
            if (photo.id) {
              const presignedUrl = await getPresignedImageUrl(photo.id)
              if (presignedUrl) {
                setImageUrl(presignedUrl)
              } else {
                setImageError(true)
              }
            } else {
              setImageError(true)
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-secondary/30">
          <ImageIcon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

// Component to handle image loading with presigned URL fallback
function ImageDisplay({
  attachment,
  onImageClick,
}: {
  attachment: FileAttachment
  onImageClick: (url: string) => void
}) {
  const [imageUrl, setImageUrl] = useState<string>(attachment.fileUrl)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Always use presigned URL for S3 files
    const loadImage = async () => {
      if (!attachment.id) {
        // If no ID, try direct URL as fallback
        const img = new Image()
        img.onload = () => {
          setLoading(false)
          setError(false)
        }
        img.onerror = () => {
          setError(true)
          setLoading(false)
        }
        img.src = attachment.fileUrl
        return
      }

      // Get presigned URL for S3 file
      const presignedUrl = await getPresignedImageUrl(attachment.id)
      if (presignedUrl) {
        setImageUrl(presignedUrl)

        // Verify the presigned URL works
        const img = new Image()
        img.onload = () => {
          setLoading(false)
          setError(false)
        }
        img.onerror = () => {
          setError(true)
          setLoading(false)
        }
        img.src = presignedUrl
      } else {
        // Fallback to direct URL if presigned URL generation fails
        const img = new Image()
        img.onload = () => {
          setLoading(false)
          setError(false)
        }
        img.onerror = () => {
          setError(true)
          setLoading(false)
        }
        img.src = attachment.fileUrl
      }
    }

    loadImage()
  }, [attachment.fileUrl, attachment.id])

  if (error) {
    return (
      <div className="relative group overflow-hidden rounded-xl max-w-md bg-secondary/20 border border-glass-border p-4 flex items-center justify-center min-h-[100px]">
        <div className="text-center">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Failed to load image</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-xl max-w-md"
      onClick={() => onImageClick(imageUrl)}
    >
      {loading && (
        <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={attachment.fileName}
        className="max-w-full h-auto rounded-xl hover:opacity-90 transition-opacity"
        onLoad={() => setLoading(false)}
        onError={() => {
          console.error("Image load error:", imageUrl)
          setError(true)
        }}
        style={{ display: loading ? "none" : "block" }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

export default function Chat() {
  useStore()
  const user = store.getCurrentUser()
  const { toast } = useToast()

  const [groupChat, setGroupChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState("")
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState("")
  const [showMentions, setShowMentions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    fileName: string
    fileKey?: string
  } | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    photos: true,
    videos: false,
    files: false,
    audio: false,
    links: false,
    voiceMessages: false,
  })
  const [readReceiptDialogOpen, setReadReceiptDialogOpen] = useState(false)
  const [selectedMessageForReceipts, setSelectedMessageForReceipts] =
    useState<ChatMessage | null>(null)
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [showClearMessagesDialog, setShowClearMessagesDialog] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const imageViewerRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const allUsers = store.getAllUsers()

  const loadGroupChat = useCallback(async () => {
    if (!user) return
    try {
      const chats = await store.getChats(user.id)
      if (chats.length > 0) {
        setGroupChat(chats[0])
        setGroupNameInput(chats[0].name || "Group Chat")
      }
    } catch (error) {
      console.error("Failed to load group chat:", error)
    }
  }, [user])

  const loadMessages = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const loadedMessages = await store.getChatMessages(GROUP_CHAT_ID, 200)

      // Smart merge: only add new messages, preserve existing ones
      setMessages((prevMessages) => {
        const prevIds = new Set(prevMessages.map((m) => m.id))
        const newMessages = loadedMessages.filter((m) => !prevIds.has(m.id))

        // If no new messages and count is same, return previous array (no re-render)
        if (
          newMessages.length === 0 &&
          prevMessages.length === loadedMessages.length
        ) {
          return prevMessages
        }

        // If we have new messages, merge them in chronological order
        if (newMessages.length > 0) {
          const merged = [...prevMessages, ...newMessages].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          return merged
        }

        // If count changed but no new messages, it means messages were deleted/updated
        // Return the loaded messages to sync state
        return loadedMessages
      })

      // Mark messages as read will be handled by Intersection Observer
      // No need to mark here - let it happen when visible
    } catch (error) {
      console.error("Failed to load messages:", error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadGroupChat()
      loadMessages()
    }
  }, [user, loadGroupChat, loadMessages])

  // Only auto-scroll if user is near bottom (to prevent jitter when new messages arrive)
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement?.parentElement
    if (!container) return

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      200

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setCursorPosition(cursorPos)
    setMessageText(value)

    const textBeforeCursor = value.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/)

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase()
      setMentionQuery(query)
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = useCallback(
    (selectedUser: User) => {
      const textBeforeCursor = messageText.substring(0, cursorPosition)
      const textAfterCursor = messageText.substring(cursorPosition)
      const mentionStart = textBeforeCursor.lastIndexOf("@")
      const beforeMention = textBeforeCursor.substring(0, mentionStart)
      const newText = `${beforeMention}@${selectedUser.name} ${textAfterCursor}`
      setMessageText(newText)
      setShowMentions(false)
      setMentionQuery("")

      setTimeout(() => {
        messageInputRef.current?.focus()
        const newCursorPos = beforeMention.length + selectedUser.name.length + 2
        messageInputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
        setCursorPosition(newCursorPos)
      }, 50)
    },
    [messageText, cursorPosition]
  )

  const filteredUsers = allUsers.filter((u) => {
    if (u.id === user?.id) return false
    if (mentionQuery === "") return true
    const nameLower = u.name.toLowerCase()
    const firstName = nameLower.split(" ")[0]
    const fullName = nameLower.replace(/\s+/g, "")
    return (
      nameLower.startsWith(mentionQuery) ||
      firstName.startsWith(mentionQuery) ||
      fullName.startsWith(mentionQuery)
    )
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFiles(true)
    const newAttachments: FileAttachment[] = []

    try {
      for (const file of Array.from(files)) {
        const { uploadUrl, key, fileUrl } = await store.getUploadUrl(
          file.name,
          file.type,
          file.size
        )

        await store.uploadFileToS3(uploadUrl, file)

        const attachment: FileAttachment = {
          id: key,
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        }

        newAttachments.push(attachment)
      }

      setAttachments((prev) => [...prev, ...newAttachments])
      toast({
        title: "Files uploaded",
        description: `${newAttachments.length} file(s) ready to send`,
      })
    } catch (error) {
      console.error("Failed to upload files:", error)
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      })
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      let mimeType = "audio/webm;codecs=opus"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm"
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4"
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus"
        } else {
          mimeType = ""
        }
      }

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      )

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blobType = audioChunksRef.current[0]?.type || "audio/webm"
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType })
        await handleVoiceNoteUpload(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Failed to start recording:", error)
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      setRecordingTime(0)
    }
  }

  const handleVoiceNoteUpload = async (audioBlob: Blob) => {
    setUploadingFiles(true)
    try {
      const blobType = audioBlob.type || "audio/webm"
      const extension = blobType.includes("mp4")
        ? "m4a"
        : blobType.includes("ogg")
        ? "ogg"
        : "webm"
      const fileName = `voice-note-${Date.now()}.${extension}`
      const { uploadUrl, key, fileUrl } = await store.getUploadUrl(
        fileName,
        blobType,
        audioBlob.size
      )

      await store.uploadFileToS3(uploadUrl, audioBlob, blobType)

      const attachment: FileAttachment = {
        id: key,
        fileName,
        fileUrl,
        fileType: blobType,
        fileSize: audioBlob.size,
        uploadedAt: new Date().toISOString(),
      }

      setAttachments((prev) => [...prev, attachment])
      toast({
        title: "Voice note recorded",
        description: "Voice note ready to send",
      })
    } catch (error) {
      console.error("Failed to upload voice note:", error)
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload voice note",
        variant: "destructive",
      })
    } finally {
      setUploadingFiles(false)
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatAudioDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getAudioElement = async (
    messageId: string,
    fileUrl: string,
    fileKey?: string
  ): Promise<HTMLAudioElement> => {
    if (audioRefs.current.has(messageId)) {
      const existingAudio = audioRefs.current.get(messageId)!
      if (existingAudio.src && !existingAudio.error) {
        return existingAudio
      }
    }

    let audioUrl = fileUrl
    if (fileKey) {
      try {
        const apiBase = import.meta.env.VITE_API_URL || ""
        const url = apiBase
          ? `${apiBase}/api/files/${encodeURIComponent(fileKey)}?expiresIn=3600`
          : `/api/files/${encodeURIComponent(fileKey)}?expiresIn=3600`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          audioUrl = data.url || fileUrl
        }
      } catch (error) {
        console.warn("Failed to get fresh presigned URL:", error)
      }
    }

    const audio = new Audio()
    audio.addEventListener("error", () => {
      toast({
        title: "Playback failed",
        description: "Could not play voice note",
        variant: "destructive",
      })
      setPlayingAudioId(null)
    })

    audio.src = audioUrl
    audio.preload = "auto"
    audioRefs.current.set(messageId, audio)
    return audio
  }

  const playVoiceNote = async (
    messageId: string,
    fileUrl: string,
    fileKey?: string
  ) => {
    try {
      if (playingAudioId && playingAudioId !== messageId) {
        const currentAudio = audioRefs.current.get(playingAudioId)
        if (currentAudio) {
          currentAudio.pause()
          currentAudio.currentTime = 0
        }
      }

      const audio = await getAudioElement(messageId, fileUrl, fileKey)

      if (audio.paused) {
        await audio.play()
        setPlayingAudioId(messageId)
        audio.onended = () => {
          setPlayingAudioId(null)
        }
      } else {
        audio.pause()
        audio.currentTime = 0
        setPlayingAudioId(null)
      }
    } catch (err) {
      console.error("Failed to play audio:", err)
      toast({
        title: "Playback failed",
        description:
          err instanceof Error ? err.message : "Could not play voice note",
        variant: "destructive",
      })
      setPlayingAudioId(null)
    }
  }

  const handleSendMessage = async () => {
    if (!user || (!messageText.trim() && attachments.length === 0)) {
      return
    }

    try {
      const messageToSend = messageText.trim()

      await store.sendMessage(
        GROUP_CHAT_ID,
        user.id,
        messageToSend,
        attachments.length > 0 ? attachments : undefined,
        replyingTo
          ? {
              messageId: replyingTo.id,
              senderId: replyingTo.senderId,
              senderName:
                allUsers.find((u) => u.id === replyingTo.senderId)?.name ||
                "Unknown",
              message: replyingTo.message || "Media",
            }
          : undefined
      )

      setMessageText("")
      setAttachments([])
      setReplyingTo(null) // Clear reply after sending
      // Don't reload all messages - the store subscription will handle updating the UI
      // This prevents jitter and only shows new messages
    } catch (error) {
      console.error("Failed to send message:", error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleClearAllMessages = async () => {
    if (!user) return

    try {
      await store.clearChatMessages(GROUP_CHAT_ID)
      setMessages([])
      toast({
        title: "Messages Cleared",
        description: "All messages have been deleted from this chat.",
      })
      setShowClearMessagesDialog(false)
    } catch (error) {
      console.error("Failed to clear messages:", error)
      toast({
        title: "Error",
        description: "Failed to clear messages",
        variant: "destructive",
      })
    }
  }

  const handleUpdateGroupName = async () => {
    if (!user || !groupChat || !groupNameInput.trim()) return

    try {
      await store.updateGroupName(GROUP_CHAT_ID, groupNameInput.trim(), user.id)
      setEditingGroupName(false)
      await loadGroupChat()
      toast({
        title: "Group name updated",
        description: "The group name has been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update group name",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return format(date, "h:mm a")
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`
    } else {
      return format(date, "MMM d, h:mm a")
    }
  }

  // Consistent color scheme for all users (except own messages which use primary)
  const getDefaultUserColor = useCallback(() => {
    // Use a consistent purple color that's easy on the eyes and matches the design
    return {
      bg: "bg-purple-500",
      text: "text-white",
      border: "border-purple-600",
    }
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const renderMessageContent = (message: ChatMessage) => {
    let content = message.message
    if (message.mentions && message.mentions.length > 0) {
      const mentionedUsers = allUsers.filter((u) =>
        message.mentions?.includes(u.id)
      )
      mentionedUsers.forEach((mentionedUser) => {
        const regex = new RegExp(
          `@${mentionedUser.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          "g"
        )
        content = content.replace(
          regex,
          `<span class="text-white font-semibold bg-primary/30 px-1.5 py-0.5 rounded">@${mentionedUser.name}</span>`
        )
      })
    }
    return { __html: content }
  }

  const getReadCount = (message: ChatMessage) => {
    const readBy = message.readBy || []
    return readBy.length
  }

  const getReadReceipt = (message: ChatMessage) => {
    if (!user || message.senderId !== user.id) return null

    const readBy = message.readBy || []
    const totalParticipants = allUsers.length - 1 // Exclude sender
    const readCount = readBy.length

    // Single tick = sent (light color)
    // Double tick = delivered (light color, when at least one person has read it)
    if (readCount > 0) {
      return (
        <div
          title={
            readCount === totalParticipants
              ? "Read by all"
              : `Delivered to ${readCount}`
          }
        >
          <CheckCheck className="w-4 h-4 text-white/60" />
        </div>
      )
    } else {
      return (
        <div title="Sent">
          <Check className="w-4 h-4 text-white/60" />
        </div>
      )
    }
  }

  const handleSwipeStart = (
    e: React.TouchEvent | React.MouseEvent,
    message: ChatMessage
  ) => {
    if (!user) return
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    setSwipeStartX(clientX)
    // Store message for reply (works for all messages now)
    setReplyingTo(message)
  }

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (swipeStartX === null) return
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const diff = clientX - swipeStartX
    // Allow left swipe (negative diff) for all messages to reply
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -100))
    }
  }

  const handleSwipeEnd = () => {
    if (swipeOffset < -50 && replyingTo) {
      // Swipe threshold reached, set reply mode
      // Scroll to input area
      setTimeout(() => {
        messageInputRef.current?.focus()
        messageInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        })
      }, 100)
    } else {
      // Reset reply if swipe wasn't far enough
      setReplyingTo(null)
    }
    setSwipeStartX(null)
    setSwipeOffset(0)
  }

  const getReadReceiptDetails = (message: ChatMessage) => {
    const readBy = message.readBy || []
    const readUsers = readBy
      .map((userId) => {
        const user = allUsers.find((u) => u.id === userId)
        return user ? { ...user, readAt: message.createdAt } : null
      })
      .filter(Boolean) as Array<User & { readAt: string }>

    return {
      sentAt: message.createdAt,
      deliveredAt: readUsers.length > 0 ? readUsers[0].readAt : null,
      readBy: readUsers,
      totalParticipants: allUsers.length - 1, // Exclude sender
    }
  }

  // Get all attachments grouped by type
  const getAttachmentsByType = () => {
    const photos: FileAttachment[] = []
    const videos: FileAttachment[] = []
    const files: FileAttachment[] = []
    const audio: FileAttachment[] = []
    const links: FileAttachment[] = []
    const voiceMessages: FileAttachment[] = []

    messages.forEach((msg) => {
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach((att) => {
          if (att.fileType.startsWith("image/")) {
            photos.push(att)
          } else if (att.fileType.startsWith("video/")) {
            videos.push(att)
          } else if (att.fileType.startsWith("audio/")) {
            voiceMessages.push(att)
          } else {
            files.push(att)
          }
        })
      }
    })

    return { photos, videos, files, audio, links, voiceMessages }
  }

  const attachmentsByType = getAttachmentsByType()

  // Close mention dropdown when clicking outside
  useEffect(() => {
    if (!showMentions) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        messageInputRef.current &&
        !messageInputRef.current.contains(target) &&
        !target.closest("[data-mention-dropdown]")
      ) {
        setShowMentions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMentions])

  // Image zoom handlers
  useEffect(() => {
    const viewer = imageViewerRef.current
    if (selectedImage && viewer) {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        setImageZoom((prev) => {
          const delta = e.deltaY > 0 ? -0.1 : 0.1
          return Math.max(0.5, Math.min(3, prev + delta))
        })
      }

      viewer.addEventListener("wheel", handleWheel, { passive: false })
      return () => {
        viewer.removeEventListener("wheel", handleWheel)
      }
    }
  }, [selectedImage])

  // Handle desktop/mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    const mediaRecorder = mediaRecorderRef.current
    const timer = recordingTimerRef.current
    const audioRefsMap = audioRefs.current

    return () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop()
      }
      if (timer) {
        clearInterval(timer)
      }
      audioRefsMap.forEach((audio) => {
        audio.pause()
        audio.src = ""
      })
      audioRefsMap.clear()
    }
  }, [isRecording])

  // Listen for new messages - optimized to prevent jitter
  useEffect(() => {
    if (!user) return

    let isSubscribed = true
    let lastMessageCount = 0

    let updateTimeout: NodeJS.Timeout | null = null

    const handleUpdate = () => {
      if (isSubscribed) {
        // Debounce updates to prevent too many reloads
        if (updateTimeout) {
          clearTimeout(updateTimeout)
        }
        updateTimeout = setTimeout(() => {
          loadMessages()
          loadGroupChat()
        }, 500) // Small delay to batch updates
      }
    }

    const unsubscribe = store.subscribe(handleUpdate)

    // Poll for new messages - only reload if count increased (new messages)
    const interval = setInterval(async () => {
      if (isSubscribed) {
        try {
          const currentMessages = await store.getChatMessages(
            GROUP_CHAT_ID,
            200
          )
          // Only reload if we detect new messages (count increased)
          if (currentMessages.length > lastMessageCount) {
            lastMessageCount = currentMessages.length
            loadMessages()
          }
        } catch (error) {
          console.error("Failed to check for new messages:", error)
        }
      }
    }, 3000) // Check every 3 seconds for new messages

    // Initialize lastMessageCount
    loadMessages().then(() => {
      if (isSubscribed) {
        store.getChatMessages(GROUP_CHAT_ID, 200).then((msgs) => {
          if (isSubscribed) {
            lastMessageCount = msgs.length
          }
        })
      }
    })

    return () => {
      isSubscribed = false
      unsubscribe()
      clearInterval(interval)
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Intersection Observer to mark messages as read when visible
  useEffect(() => {
    if (!user || messageRefs.current.size === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute("data-message-id")
            if (messageId) {
              const message = messages.find((m) => m.id === messageId)
              if (
                message &&
                message.senderId !== user.id &&
                (!message.readBy || !message.readBy.includes(user.id))
              ) {
                // Mark as read without waiting
                store.markMessageAsRead(messageId, user.id).catch((err) => {
                  console.error("Failed to mark message as read:", err)
                })
              }
            }
          }
        })
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.5, // Mark as read when 50% visible
      }
    )

    // Observe all message elements
    messageRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => {
      observer.disconnect()
    }
  }, [messages, user])

  // Handle clicking on reply preview to scroll to original message
  const handleReplyClick = useCallback((replyToMessageId: string) => {
    const originalMessageElement = messageRefs.current.get(replyToMessageId)
    if (originalMessageElement && messagesContainerRef.current) {
      // Highlight the message
      setHighlightedMessageId(replyToMessageId)

      // Scroll to the message
      const container = messagesContainerRef.current
      const containerRect = container.getBoundingClientRect()
      const elementRect = originalMessageElement.getBoundingClientRect()

      // Calculate the scroll position to center the message in the viewport
      const scrollTop = container.scrollTop
      const elementTopRelativeToContainer =
        elementRect.top - containerRect.top + scrollTop
      const containerHeight = container.clientHeight
      const elementHeight = elementRect.height

      // Center the message in the viewport
      const targetScrollTop =
        elementTopRelativeToContainer - containerHeight / 2 + elementHeight / 2

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      })

      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedMessageId(null)
      }, 2000)
    }
  }, [])

  if (!user) {
    return null
  }

  return (
    <>
      <Layout>
        <div className="h-0 w-0" />
      </Layout>
      <div
        className="fixed inset-0 top-0 left-0 md:left-64 right-0 bottom-0 flex flex-col bg-background"
        style={{
          height: "100dvh",
          overflow: "hidden",
          zIndex: 10,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Main Chat Area */}
        <div
          className="flex flex-col min-w-0"
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div className="glass-strong border-b border-glass-border px-4 md:px-4 pt-3 md:pt-3 pb-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Users className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">
                  {groupChat?.name || "Group Chat"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {allUsers.length} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {showSearch ? (
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <Input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full flex items-center justify-center"
                    onClick={() => {
                      setShowSearch(false)
                      setSearchQuery("")
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full flex items-center justify-center"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full flex items-center justify-center"
                    onClick={() => setShowGroupInfo(true)}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto min-h-0 bg-gradient-to-b from-background/50 to-background/30"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "16px",
              paddingBottom: "16px",
              WebkitOverflowScrolling: "touch",
              scrollBehavior: "smooth",
              overscrollBehavior: "contain",
              flex: "1 1 auto",
              minHeight: 0,
              maxHeight: "100%",
            }}
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.senderId === user.id
                const sender =
                  message.sender ||
                  allUsers.find((u) => u.id === message.senderId)
                const readCount = getReadCount(message)

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 mb-4 ${
                      isOwnMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Avatar - on left for others */}
                    {!isOwnMessage &&
                      (() => {
                        const userColor = getDefaultUserColor()
                        return (
                          <Avatar className="w-10 h-10 flex-shrink-0 mt-auto">
                            <AvatarFallback
                              className={`${userColor.bg} ${userColor.text} text-xs font-semibold border-2 ${userColor.border} shadow-sm`}
                            >
                              {getInitials(sender?.name || "U")}
                            </AvatarFallback>
                          </Avatar>
                        )
                      })()}

                    <div
                      className={`flex flex-col max-w-[75%] ${
                        isOwnMessage ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Sender name - shown for all users */}
                      <span className="text-xs font-semibold mb-1.5 px-1 text-white">
                        {sender?.name || "Unknown"}
                      </span>

                      {/* Message bubble */}
                      <div
                        ref={(el) => {
                          if (el) messageRefs.current.set(message.id, el)
                        }}
                        data-message-id={message.id}
                        className={`rounded-2xl px-4 py-3 shadow-md relative transition-all duration-300 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : (() => {
                                const userColor = getDefaultUserColor()
                                return `${userColor.bg} ${userColor.text} rounded-bl-sm border-2 ${userColor.border}`
                              })()
                        } ${
                          highlightedMessageId === message.id
                            ? "ring-4 ring-primary/50 ring-offset-2 scale-[1.02]"
                            : ""
                        }`}
                        style={{
                          transform:
                            replyingTo?.id === message.id
                              ? `translateX(${swipeOffset}px)`
                              : highlightedMessageId === message.id
                              ? "scale(1.02)"
                              : undefined,
                          transition:
                            swipeStartX === null
                              ? "transform 0.2s ease-out, box-shadow 0.3s ease-out"
                              : "none",
                        }}
                        onTouchStart={(e) => handleSwipeStart(e, message)}
                        onTouchMove={handleSwipeMove}
                        onTouchEnd={handleSwipeEnd}
                        onMouseDown={(e) => handleSwipeStart(e, message)}
                        onMouseMove={handleSwipeMove}
                        onMouseUp={handleSwipeEnd}
                        onMouseLeave={handleSwipeEnd}
                      >
                        {/* Reply Preview - Show original message if this is a reply */}
                        {message.replyTo && (
                          <div
                            className="mb-2 flex items-start gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReplyClick(message.replyTo!.messageId)
                            }}
                          >
                            <Reply className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/70" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold mb-1 text-white">
                                {message.replyTo.senderName}
                              </p>
                              <div className="px-2 py-1 rounded-md border border-white/30 bg-transparent">
                                <p className="text-xs font-medium line-clamp-1 break-words text-white/90">
                                  {message.replyTo.message || "Media"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Message text */}
                        {message.message && (
                          <p
                            className="text-sm whitespace-pre-wrap break-words leading-relaxed mb-1 text-white"
                            style={{
                              wordSpacing: "0.05em",
                              letterSpacing: "0.01em",
                              lineHeight: "1.6",
                            }}
                            dangerouslySetInnerHTML={renderMessageContent(
                              message
                            )}
                          />
                        )}

                        {/* Attachments */}
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.attachments.map((attachment) => {
                                const isAudio =
                                  attachment.fileType.startsWith("audio/")
                                const isImage =
                                  attachment.fileType.startsWith("image/")

                                if (isAudio) {
                                  return (
                                    <div
                                      key={attachment.id}
                                      className={`flex items-center gap-3 p-3 rounded-xl min-w-[200px] ${
                                        isOwnMessage
                                          ? "bg-white/20"
                                          : (() => {
                                              const userColor =
                                                getDefaultUserColor()
                                              return `${userColor.bg}/20`
                                            })()
                                      }`}
                                    >
                                      <button
                                        onClick={() =>
                                          playVoiceNote(
                                            message.id,
                                            attachment.fileUrl,
                                            attachment.id
                                          )
                                        }
                                        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all flex-shrink-0 ${
                                          playingAudioId === message.id
                                            ? "bg-primary text-white scale-110"
                                            : "bg-background/70 hover:bg-background"
                                        }`}
                                      >
                                        {playingAudioId === message.id ? (
                                          <Square className="w-5 h-5 text-white" />
                                        ) : (
                                          <Mic className="w-5 h-5 text-white" />
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="flex-1 h-2 bg-background/30 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${
                                                playingAudioId === message.id
                                                  ? "bg-primary animate-pulse"
                                                  : "bg-primary/50"
                                              }`}
                                              style={{ width: "60%" }}
                                            />
                                          </div>
                                          <span className="text-xs font-mono tabular-nums text-white">
                                            00:15
                                          </span>
                                        </div>
                                        <p className="text-xs opacity-75 text-white">
                                          {formatFileSize(attachment.fileSize)}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                }

                                if (isImage) {
                                  return (
                                    <ImageDisplay
                                      key={attachment.id}
                                      attachment={attachment}
                                      onImageClick={(url) =>
                                        setSelectedImage({
                                          url,
                                          fileName: attachment.fileName,
                                          fileKey: attachment.id,
                                        })
                                      }
                                    />
                                  )
                                }

                                return (
                                  <div
                                    key={attachment.id}
                                    className={`flex items-center gap-2 p-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer ${
                                      isOwnMessage
                                        ? "bg-white/20"
                                        : (() => {
                                            const userColor =
                                              getDefaultUserColor()
                                            return `${userColor.bg}/20`
                                          })()
                                    }`}
                                    onClick={async () => {
                                      try {
                                        let downloadUrl = attachment.fileUrl

                                        // Get presigned URL if we have a file key
                                        if (attachment.id) {
                                          const presignedUrl =
                                            await getPresignedFileUrl(
                                              attachment.id,
                                              3600
                                            )
                                          if (presignedUrl) {
                                            downloadUrl = presignedUrl
                                          }
                                        }

                                        // Create download link
                                        const link = document.createElement("a")
                                        link.href = downloadUrl
                                        link.download = attachment.fileName
                                        link.target = "_blank"
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)

                                        toast({
                                          title: "Download started",
                                          description: `Downloading ${attachment.fileName}`,
                                        })
                                      } catch (error) {
                                        console.error("Download error:", error)
                                        toast({
                                          title: "Download failed",
                                          description:
                                            "Could not download file. Please try again.",
                                          variant: "destructive",
                                        })
                                      }
                                    }}
                                  >
                                    <FileText className="w-5 h-5 flex-shrink-0 text-white" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate text-white">
                                        {attachment.fileName}
                                      </p>
                                      <p className="text-xs opacity-75 text-white">
                                        {formatFileSize(attachment.fileSize)}
                                      </p>
                                    </div>
                                    <Download className="w-5 h-5 flex-shrink-0 text-white" />
                                  </div>
                                )
                              })}
                            </div>
                          )}

                        {/* Footer with timestamp, read count, and read receipt */}
                        <div
                          className={`flex items-center gap-2 mt-2 ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span
                            className={`text-[10px] ${
                              isOwnMessage ? "text-white/70" : "text-white/70"
                            }`}
                          >
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {!isOwnMessage && readCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMessageForReceipts(message)
                                setReadReceiptDialogOpen(true)
                              }}
                              className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white/90 transition-colors cursor-pointer"
                              title="View read receipts"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{readCount}</span>
                            </button>
                          )}
                          {isOwnMessage && (
                            <div className="flex items-center gap-1.5">
                              {getReadReceipt(message)}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedMessageForReceipts(message)
                                  setReadReceiptDialogOpen(true)
                                }}
                                className="text-white/70 hover:text-white/90 transition-colors cursor-pointer"
                                title="View read receipts"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Avatar - on right for own messages */}
                    {isOwnMessage && (
                      <Avatar className="w-10 h-10 flex-shrink-0 mt-auto">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold border-2 border-primary shadow-sm">
                          {getInitials(sender?.name || "U")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Always visible at bottom */}
          <div
            id="chat-input-area"
            className="glass-strong border-t border-glass-border flex-shrink-0"
            style={{
              paddingBottom: isDesktop
                ? "12px"
                : "max(80px, calc(12px + env(safe-area-inset-bottom, 12px)))",
              paddingTop: "12px",
              paddingLeft: "16px",
              paddingRight: "16px",
              position: "relative",
              zIndex: 1000,
              backgroundColor: "hsl(var(--background))",
              backdropFilter: "blur(12px)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              minHeight: "auto",
              visibility: "visible",
              opacity: 1,
              flexShrink: 0,
              overflow: "visible",
              marginBottom: 0,
            }}
          >
            {/* Recording indicator */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 bg-destructive/10 border-2 border-destructive/30 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-3 h-3 bg-destructive rounded-full"
                  />
                  <div>
                    <span className="text-sm font-bold text-destructive">
                      Recording
                    </span>
                    <span className="text-xs text-muted-foreground font-mono tabular-nums ml-2">
                      {formatRecordingTime(recordingTime)}
                    </span>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={stopRecording}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </motion.div>
            )}

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment, index) => {
                  const isImage = attachment.fileType.startsWith("image/")
                  return (
                    <div
                      key={index}
                      className="relative group glass-strong rounded-lg border border-glass-border p-2"
                    >
                      {isImage ? (
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="w-20 h-20 object-cover rounded-lg"
                          onError={async (e) => {
                            // Try to get presigned URL if direct URL fails
                            if (attachment.id) {
                              const presignedUrl = await getPresignedImageUrl(
                                attachment.id
                              )
                              if (presignedUrl) {
                                e.currentTarget.src = presignedUrl
                              } else {
                                console.error(
                                  "Preview image error:",
                                  attachment.fileUrl
                                )
                                e.currentTarget.style.display = "none"
                              }
                            } else {
                              console.error(
                                "Preview image error:",
                                attachment.fileUrl
                              )
                              e.currentTarget.style.display = "none"
                            }
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-primary" />
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Input and buttons */}
            <div
              className="flex items-center gap-2 w-full"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                visibility: "visible",
                opacity: 1,
                zIndex: 1001,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles || isRecording}
                className="flex-shrink-0 rounded-full flex items-center justify-center p-0 hover:bg-secondary/50 transition-colors"
                style={{
                  width: "40px",
                  height: "40px",
                  minWidth: "40px",
                  minHeight: "40px",
                }}
              >
                <Paperclip className="w-5 h-5 text-foreground" />
              </Button>

              <div className="flex-1 relative min-w-0">
                {/* Reply Preview */}
                {replyingTo && (
                  <div className="mb-2 p-2 rounded-lg bg-secondary/50 border border-glass-border flex items-start gap-2">
                    <Reply className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {allUsers.find((u) => u.id === replyingTo.senderId)
                          ?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {replyingTo.message || "Media"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <textarea
                  ref={messageInputRef}
                  value={messageText}
                  onChange={handleMessageChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  onFocus={(e) => {
                    // Ensure input area is visible on mobile when keyboard opens
                    const ensureInputVisible = () => {
                      const inputArea =
                        document.getElementById("chat-input-area")
                      const textarea = e.target as HTMLTextAreaElement

                      if (inputArea && textarea) {
                        // Scroll the input area into view
                        inputArea.scrollIntoView({
                          behavior: "smooth",
                          block: "end",
                          inline: "nearest",
                        })

                        // Also scroll the textarea itself
                        setTimeout(() => {
                          textarea.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                            inline: "nearest",
                          })
                        }, 100)

                        // Force viewport update for mobile browsers
                        setTimeout(() => {
                          window.scrollTo({
                            top: document.body.scrollHeight,
                            behavior: "smooth",
                          })
                        }, 300)
                      }
                    }

                    // Try multiple times to handle keyboard animation delays
                    ensureInputVisible()
                    setTimeout(ensureInputVisible, 100)
                    setTimeout(ensureInputVisible, 300)
                    setTimeout(ensureInputVisible, 500)
                    setTimeout(ensureInputVisible, 700)
                  }}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm leading-relaxed"
                  rows={1}
                  style={{
                    minHeight: "40px",
                    maxHeight: "120px",
                    touchAction: "manipulation",
                    WebkitAppearance: "none",
                    fontSize: "16px", // Prevents zoom on iOS
                    lineHeight: "1.5",
                  }}
                />

                {/* Mention dropdown */}
                <AnimatePresence>
                  {showMentions && filteredUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      data-mention-dropdown
                      className="absolute bottom-full left-0 mb-2 rounded-lg shadow-2xl border border-glass-border overflow-hidden z-[100] w-full max-w-[280px]"
                      style={{
                        maxHeight: "200px",
                        backgroundColor: "hsl(var(--background))",
                        backdropFilter: "blur(12px)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="overflow-y-auto max-h-[200px]">
                        {filteredUsers.slice(0, 5).map((u, index) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              insertMention(u)
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault()
                            }}
                            className="w-full px-3 py-2.5 text-left hover:bg-primary/10 active:bg-primary/20 flex items-center gap-2.5 transition-colors border-b border-glass-border/50 last:border-b-0"
                          >
                            <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-primary/30">
                              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {u.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate capitalize">
                                {u.role}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant={isRecording ? "destructive" : "ghost"}
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={uploadingFiles}
                className={`flex-shrink-0 rounded-full flex items-center justify-center p-0 transition-colors ${
                  isRecording
                    ? "animate-pulse bg-destructive hover:bg-destructive/90"
                    : "hover:bg-secondary/50"
                }`}
                style={{
                  width: "40px",
                  height: "40px",
                  minWidth: "40px",
                  minHeight: "40px",
                }}
              >
                {isRecording ? (
                  <Square className="w-5 h-5 text-destructive-foreground" />
                ) : (
                  <Mic className="w-5 h-5 text-foreground" />
                )}
              </Button>

              <Button
                onClick={handleSendMessage}
                disabled={
                  (!messageText.trim() && attachments.length === 0) ||
                  uploadingFiles
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-0 flex-shrink-0 shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{
                  width: "40px",
                  height: "40px",
                  minWidth: "40px",
                  minHeight: "40px",
                }}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Group Info Dialog */}
        <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
          <DialogContent className="max-w-lg max-h-[90vh] glass-strong overflow-hidden flex flex-col p-0 [&>button]:hidden">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-glass-border">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">
                  Group Info
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setShowGroupInfo(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Group Name */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">
                    Group Name
                  </label>
                  {!editingGroupName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        setEditingGroupName(true)
                        setGroupNameInput(groupChat?.name || "Group Chat")
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                  )}
                </div>
                {editingGroupName ? (
                  <div className="flex gap-2">
                    <Input
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateGroupName()
                        } else if (e.key === "Escape") {
                          setEditingGroupName(false)
                          setGroupNameInput(groupChat?.name || "Group Chat")
                        }
                      }}
                      className="flex-1 h-9"
                      autoFocus
                    />
                    <Button
                      onClick={handleUpdateGroupName}
                      size="sm"
                      className="h-9 px-3"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => {
                        setEditingGroupName(false)
                        setGroupNameInput(groupChat?.name || "Group Chat")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="text-base font-semibold text-foreground">
                    {groupChat?.name || "Group Chat"}
                  </p>
                )}
              </div>

              {/* Clear All Messages */}
              <div className="space-y-3 pt-3 border-t border-glass-border">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowClearMessagesDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Messages
                </Button>
              </div>

              {/* Shared Media Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Shared Media
                </h4>

                {/* Photos */}
                <Collapsible
                  open={expandedSections.photos}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      photos: open,
                    }))
                  }
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <ImageIcon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {attachmentsByType.photos.length} photos
                      </span>
                    </div>
                    {expandedSections.photos ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {attachmentsByType.photos.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {attachmentsByType.photos.map((photo) => (
                          <ImageThumbnail
                            key={photo.id}
                            photo={photo}
                            onImageClick={(url, fileName, fileKey) =>
                              setSelectedImage({
                                url,
                                fileName,
                                fileKey,
                              })
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-3 px-3 py-2">
                        No photos yet
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Videos */}
                <Collapsible
                  open={expandedSections.videos}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      videos: open,
                    }))
                  }
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Video className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {attachmentsByType.videos.length} videos
                      </span>
                    </div>
                    {expandedSections.videos ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-xs text-muted-foreground mt-3 px-3 py-2">
                      No videos yet
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                {/* Files */}
                <Collapsible
                  open={expandedSections.files}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      files: open,
                    }))
                  }
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {attachmentsByType.files.length} files
                      </span>
                    </div>
                    {expandedSections.files ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {attachmentsByType.files.length > 0 ? (
                      <div className="space-y-1.5 mt-3">
                        {attachmentsByType.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-glass-border bg-secondary/10 hover:bg-secondary/30 transition-colors group"
                          >
                            <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-foreground">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.fileSize)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={async () => {
                                try {
                                  let downloadUrl = file.fileUrl

                                  // Get presigned URL if we have a file key
                                  if (file.id) {
                                    const presignedUrl =
                                      await getPresignedFileUrl(file.id, 3600)
                                    if (presignedUrl) {
                                      downloadUrl = presignedUrl
                                    }
                                  }

                                  // Create download link
                                  const link = document.createElement("a")
                                  link.href = downloadUrl
                                  link.download = file.fileName
                                  link.target = "_blank"
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)

                                  toast({
                                    title: "Download started",
                                    description: `Downloading ${file.fileName}`,
                                  })
                                } catch (error) {
                                  console.error("Download error:", error)
                                  toast({
                                    title: "Download failed",
                                    description:
                                      "Could not download file. Please try again.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-3 px-3 py-2">
                        No files yet
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Audio Files */}
                <Collapsible
                  open={expandedSections.audio}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      audio: open,
                    }))
                  }
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Music className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {attachmentsByType.audio.length} audio files
                      </span>
                    </div>
                    {expandedSections.audio ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-xs text-muted-foreground mt-3 px-3 py-2">
                      No audio files yet
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                {/* Links */}
                <Collapsible
                  open={expandedSections.links}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      links: open,
                    }))
                  }
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <LinkIcon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {attachmentsByType.links.length} shared links
                      </span>
                    </div>
                    {expandedSections.links ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-xs text-muted-foreground mt-3 px-3 py-2">
                      No links yet
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                {/* Voice Messages */}
                <Collapsible
                  open={expandedSections.voiceMessages}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      voiceMessages: open,
                    }))
                  }
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Mic className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {attachmentsByType.voiceMessages.length} voice messages
                      </span>
                    </div>
                    {expandedSections.voiceMessages ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-xs text-muted-foreground mt-3 px-3 py-2">
                      No voice messages yet
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Members Section */}
              <div className="space-y-3 pt-2 border-t border-glass-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    {allUsers.length} members
                  </h4>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {allUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-glass-border bg-secondary/10 hover:bg-secondary/30 transition-colors"
                    >
                      <Avatar className="w-9 h-9 border-2 border-glass-border">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {u.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {u.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Read Receipts Dialog */}
      <Dialog
        open={readReceiptDialogOpen}
        onOpenChange={setReadReceiptDialogOpen}
      >
        <DialogContent className="max-w-md glass-strong">
          <DialogHeader>
            <DialogTitle>Read Receipts</DialogTitle>
          </DialogHeader>
          {selectedMessageForReceipts &&
            (() => {
              const details = getReadReceiptDetails(selectedMessageForReceipts)
              return (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sent:</span>
                      <span className="font-medium">
                        {format(
                          new Date(details.sentAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                    </div>
                    {details.deliveredAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Delivered:
                        </span>
                        <span className="font-medium">
                          {format(
                            new Date(details.deliveredAt),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-glass-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">
                        Read by ({details.readBy.length}/
                        {details.totalParticipants})
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {details.readBy.length > 0 ? (
                        details.readBy.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-2 glass-strong rounded-lg border border-glass-border"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Read{" "}
                                {format(
                                  new Date(user.readAt),
                                  "MMM d 'at' h:mm a"
                                )}
                              </p>
                            </div>
                            <CheckCheck className="w-4 h-4 text-primary flex-shrink-0" />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No one has read this message yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImage(null)
            setImageZoom(1)
          }
        }}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] p-0 glass-strong overflow-hidden [&>button]:hidden">
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
                  // Try to get presigned URL if direct URL fails
                  if (selectedImage.fileKey) {
                    const presignedUrl = await getPresignedImageUrl(
                      selectedImage.fileKey
                    )
                    if (presignedUrl) {
                      e.currentTarget.src = presignedUrl
                      return
                    }
                  }
                  console.error("Image viewer error:", selectedImage.url)
                  toast({
                    title: "Image load failed",
                    description: "Could not load image",
                    variant: "destructive",
                  })
                }}
              />

              {/* Zoom Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 glass-strong rounded-lg px-4 py-2 border border-glass-border z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex items-center justify-center"
                  onClick={() =>
                    setImageZoom((prev) => Math.max(0.5, prev - 0.25))
                  }
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex items-center justify-center"
                  onClick={() =>
                    setImageZoom((prev) => Math.min(3, prev + 0.25))
                  }
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
                  className="h-9 w-9 glass-strong flex items-center justify-center"
                  onClick={async () => {
                    if (!selectedImage) return

                    try {
                      // Get presigned URL for download if needed
                      let downloadUrl = selectedImage.url
                      if (selectedImage.fileKey) {
                        const presignedUrl = await getPresignedImageUrl(
                          selectedImage.fileKey
                        )
                        if (presignedUrl) {
                          downloadUrl = presignedUrl
                        }
                      }

                      // Create download link
                      const link = document.createElement("a")
                      link.href = downloadUrl
                      link.download = selectedImage.fileName
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)

                      toast({
                        title: "Download started",
                        description: `Downloading ${selectedImage.fileName}`,
                      })
                    } catch (error) {
                      console.error("Download error:", error)
                      toast({
                        title: "Download failed",
                        description: "Could not download image",
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  <Download className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 glass-strong flex items-center justify-center"
                  onClick={() => {
                    setSelectedImage(null)
                    setImageZoom(1)
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear All Messages Dialog */}
      <AlertDialog
        open={showClearMessagesDialog}
        onOpenChange={setShowClearMessagesDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this chat. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllMessages}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
