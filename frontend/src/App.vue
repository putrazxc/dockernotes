<script setup>
import { ref, onMounted, computed } from 'vue'
import { Copy, Plus, Terminal, FileText, LayoutDashboard, Check, Edit2, Trash2, AlertTriangle } from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const notes = ref([])
const loading = ref(true)
const selectedNote = ref(null)

// Form State
const newTitle = ref('')
const newContent = ref('')
const newCategory = ref('Mikrotik Settings')
const showAddForm = ref(false)
const editNoteId = ref(null)

// Toast notification state
const toastMessage = ref('')
const showToast = ref(false)
let toastTimeout = null

// Delete Modal state
const showDeleteModal = ref(false)
const noteToDelete = ref(null)

const fetchNotes = async () => {
  try {
    const res = await fetch('/api/notes')
    const json = await res.json()
    if (json.data) {
      notes.value = json.data
      if (notes.value.length > 0) {
        selectedNote.value = notes.value[0]
      }
    }
  } catch (err) {
    console.error("Error fetching notes", err)
  } finally {
    loading.value = false
  }
}

const openAddForm = () => {
  newTitle.value = ''
  newContent.value = ''
  newCategory.value = 'General'
  editNoteId.value = null
  showAddForm.value = true
}

const openEditForm = () => {
  if (!selectedNote.value) return
  newTitle.value = selectedNote.value.title
  newContent.value = selectedNote.value.content
  newCategory.value = selectedNote.value.category || 'General'
  editNoteId.value = selectedNote.value.id
  showAddForm.value = true
}

const saveNote = async () => {
  if (!newTitle.value || !newContent.value) return
  
  const isEditing = editNoteId.value !== null;
  const url = isEditing ? `/api/notes/${editNoteId.value}` : '/api/notes';
  const method = isEditing ? 'PUT' : 'POST';
  
  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: newTitle.value, 
        content: newContent.value,
        category: newCategory.value || 'General'
      })
    })
    const json = await res.json()
    if (json.data) {
      if (isEditing) {
        const index = notes.value.findIndex(n => n.id === editNoteId.value)
        if (index !== -1) notes.value[index] = json.data
        triggerToast('Command successfully updated!')
      } else {
        notes.value.push(json.data)
        triggerToast('Command successfully saved!')
      }
      
      selectedNote.value = json.data
      showAddForm.value = false
    }
  } catch (err) {
    console.error("Error saving note", err)
  }
}

const confirmDeleteAction = (id) => {
  noteToDelete.value = id
  showDeleteModal.value = true
}

const cancelDelete = () => {
  showDeleteModal.value = false
  noteToDelete.value = null
}

const executeDelete = async () => {
  const id = noteToDelete.value
  if (!id) return
  
  try {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      notes.value = notes.value.filter(n => n.id !== id)
      if (selectedNote.value?.id === id) {
        selectedNote.value = notes.value.length > 0 ? notes.value[0] : null
      }
      triggerToast('Command successfully deleted!')
    }
  } catch (err) {
    console.error("Error deleting note", err)
  } finally {
    showDeleteModal.value = false
    noteToDelete.value = null
  }
}

const extractCommand = (text) => {
  const match = text.match(/```[a-z]*\n([\s\S]*?)\n```/);
  return match ? match[1].trim() : text;
}

const triggerToast = (message) => {
  toastMessage.value = message
  showToast.value = true
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const copyToClipboard = async (text) => {
  try {
    const commandToCopy = extractCommand(text)
    await navigator.clipboard.writeText(commandToCopy)
    triggerToast('Command copied to clipboard')
  } catch (err) {
    console.error("Failed to copy", err)
  }
}

const renderMarkdown = (text) => {
  return DOMPurify.sanitize(marked(text))
}

const notesByCategory = computed(() => {
  const grouped = {}
  notes.value.forEach(note => {
    const cat = note.category || 'General'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(note)
  })
  return grouped
})

onMounted(() => {
  fetchNotes()
})
</script>

<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <Terminal :size="24" />
          <div class="logo-text">
            <span class="logo-title">DevNotes</span>
            <span class="logo-subtitle">Command Center</span>
          </div>
        </div>
      </div>
      
      <div class="sidebar-content">
        <div class="nav-section">
          <h3 class="nav-heading">Main Menu</h3>
          <div class="nav-item" :class="{ active: !showAddForm && notes.length > 0 }" @click="showAddForm = false">
            <LayoutDashboard :size="18" class="nav-icon" />
            <span>Dashboard</span>
          </div>
          <div class="nav-item" :class="{ active: showAddForm && !editNoteId }" @click="openAddForm">
            <Plus :size="18" class="nav-icon" />
            <span>New Command</span>
          </div>
        </div>

        <div v-for="(catNotes, category) in notesByCategory" :key="category" class="nav-section">
          <h3 class="nav-heading">{{ category }}</h3>
          <div class="note-list">
            <div 
              v-for="note in catNotes" 
              :key="note.id" 
              class="nav-item sub-item"
              :class="{ active: selectedNote?.id === note.id && !showAddForm }"
              @click="selectedNote = note; showAddForm = false"
            >
              <FileText :size="16" class="nav-icon muted" />
              <span class="truncate">{{ note.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Content Area -->
      <div class="content-scroll">
        <div class="content-inner">
          <div v-if="loading" class="loading">
            <div class="spinner"></div>
            Loading...
          </div>

          <!-- Add/Edit Note View -->
          <div v-else-if="showAddForm" class="view-container">
            <div class="page-header">
              <h1>{{ editNoteId ? 'Edit Command' : 'Create New Command' }}</h1>
              <p class="text-muted">{{ editNoteId ? 'Modify your command details below.' : 'Save a new terminal command or configuration snippet to your library.' }}</p>
            </div>
            
            <div class="card form-card">
              <div class="form-group">
                <label>Category</label>
                <input v-model="newCategory" placeholder="e.g. Mikrotik Settings" class="input-field" list="categories" />
                <datalist id="categories">
                  <option v-for="cat in Object.keys(notesByCategory)" :key="cat" :value="cat" />
                </datalist>
              </div>
              <div class="form-group">
                <label>Title</label>
                <input v-model="newTitle" placeholder="e.g. Allow ZeroTier to LAN" class="input-field" />
              </div>
              <div class="form-group">
                <label>Content</label>
                <textarea v-model="newContent" placeholder="Enter your markdown or command here. Use ``` for code blocks." rows="10" class="input-field textarea-field"></textarea>
              </div>
              <div class="form-actions">
                <button @click="showAddForm = false" class="btn btn-outline">Cancel</button>
                <button @click="saveNote" class="btn btn-primary">{{ editNoteId ? 'Update Command' : 'Save Command' }}</button>
              </div>
            </div>
          </div>

          <!-- Note Detail View -->
          <div v-else-if="selectedNote" class="view-container">
            <div class="page-header">
              <div class="badge">{{ selectedNote.category || 'General' }}</div>
              <h1>{{ selectedNote.title }}</h1>
            </div>
            
            <div class="card note-card">
              <div class="card-content rendered-markdown" v-html="renderMarkdown(selectedNote.content)"></div>
              
              <div class="card-footer">
                <div class="footer-left">
                  <button @click="confirmDeleteAction(selectedNote.id)" class="btn btn-danger">
                    <Trash2 :size="16" />
                    Delete
                  </button>
                </div>
                <div class="footer-right">
                  <button @click="openEditForm" class="btn btn-outline" style="margin-right: 0.75rem;">
                    <Edit2 :size="16" />
                    Edit
                  </button>
                  <button @click="copyToClipboard(selectedNote.content)" class="btn btn-primary">
                    <Copy :size="16" /> 
                    Copy Command
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <Terminal :size="48" class="empty-icon" />
            <h2>No commands found</h2>
            <p class="text-muted">Get started by creating a new command snippet.</p>
            <button @click="openAddForm" class="btn btn-primary mt-4">
              <Plus :size="16" /> New Command
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <transition name="modal-fade">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-icon-bg">
              <AlertTriangle :size="24" class="modal-icon" />
            </div>
            <div class="modal-title-area">
              <h2>Delete Command</h2>
              <p class="text-muted">Are you sure you want to delete this command? This action cannot be undone.</p>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="cancelDelete" class="btn btn-outline">Cancel</button>
            <button @click="executeDelete" class="btn btn-danger">Delete</button>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- Minimalist Toast Notification -->
    <transition name="toast-fade">
      <div v-if="showToast" class="toast">
        <Check :size="16" class="toast-icon" />
        <span>{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<style>
/* Shadcn UI Dark Mode Variables */
:root {
  --background: #09090b;
  --foreground: #fafafa;
  
  --card: #09090b;
  --card-foreground: #fafafa;
  
  --popover: #09090b;
  --popover-foreground: #fafafa;
  
  --primary: #fafafa;
  --primary-foreground: #18181b;
  
  --secondary: #27272a;
  --secondary-foreground: #fafafa;
  
  --muted: #27272a;
  --muted-foreground: #a1a1aa;
  
  --accent: #27272a;
  --accent-foreground: #fafafa;
  
  --border: #27272a;
  --input: #27272a;
  --ring: #d4d4d8;
  
  --radius: 0.5rem;
  
  --destructive: #7f1d1d;
  --destructive-foreground: #fafafa;
}

* {
  box-sizing: border-box;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

.text-muted {
  color: var(--muted-foreground);
}

.mt-4 { margin-top: 1rem; }
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout {
  display: flex;
  height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background-color: var(--background);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1.5rem 1.25rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.logo-subtitle {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.75rem;
}

.nav-section {
  margin-bottom: 1.5rem;
}

.nav-heading {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  padding: 0 0.75rem;
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  color: var(--muted-foreground);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
  margin-bottom: 0.125rem;
}

.nav-item:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.nav-item.active {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.nav-icon {
  flex-shrink: 0;
}

.nav-icon.muted {
  opacity: 0.7;
}

.sub-item {
  font-weight: 400;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Important for truncating flex children */
}

/* Content Area */
.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 2.5rem;
}

.content-inner {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin: 0 0 0.5rem 0;
}

.badge {
  display: inline-block;
  background-color: var(--accent);
  color: var(--accent-foreground);
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

/* Cards */
.card {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.card-content {
  padding: 1.5rem;
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(255,255,255,0.02);
}

.footer-left, .footer-right {
  display: flex;
  align-items: center;
}

/* Forms */
.form-card {
  padding: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.form-group label {
  font-weight: 500;
  font-size: 0.875rem;
}

.input-field {
  background-color: transparent;
  border: 1px solid var(--input);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: var(--foreground);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input-field:focus {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 1px var(--ring);
}

.textarea-field {
  resize: vertical;
  min-height: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  height: 2.25rem;
  padding: 0 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
}

.btn-primary:hover {
  background-color: #e5e5e5;
}

.btn-outline {
  background-color: transparent;
  color: var(--foreground);
  border: 1px solid var(--input);
}

.btn-outline:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.btn-danger-outline {
  background-color: transparent;
  color: #ef4444;
  border: 1px solid transparent;
  padding: 0 0.5rem;
}

.btn-danger-outline:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.btn-danger {
  background-color: var(--destructive);
  color: var(--destructive-foreground);
  border: none;
}

.btn-danger:hover {
  background-color: #991b1b;
}

/* Markdown Rendering */
.rendered-markdown {
  font-size: 0.95rem;
  line-height: 1.6;
}

.rendered-markdown h1, 
.rendered-markdown h2, 
.rendered-markdown h3 {
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  font-weight: 600;
}

.rendered-markdown p {
  margin-top: 0;
  margin-bottom: 1em;
}

.rendered-markdown pre {
  background-color: #18181b !important;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  overflow-x: auto;
  margin: 1.5rem 0;
}

.rendered-markdown code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875em;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background-color: rgba(255,255,255,0.01);
}

.empty-icon {
  color: var(--muted-foreground);
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

/* Loading */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 50vh;
  color: var(--muted-foreground);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--muted-foreground);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 12px 16px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 50;
}

.toast-icon {
  color: #10b981; /* Green checkmark */
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
}

.modal-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.modal-icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(239, 68, 68, 0.15);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.modal-icon {
  color: #ef4444;
}

.modal-title-area h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.modal-title-area p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content {
  animation: modal-pop 0.2s ease-out;
}

@keyframes modal-pop {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
