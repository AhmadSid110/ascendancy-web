'use client';

import { useState, useEffect } from 'react';
import { storage, databases, DB_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  Book,
  X,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

const BUCKET_ID = 'knowledge';
const COLL_ID = 'library_chunks';

export default function LibraryTab({ user, onClose }: { user: any, onClose: () => void }) {
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const res = await storage.listFiles(BUCKET_ID);
      setFiles(res.files);
    } catch (e) {
      console.error('Failed to load files', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await storage.createFile(BUCKET_ID, ID.unique(), file);
      loadFiles();
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await storage.deleteFile(BUCKET_ID, id);
      const chunks = await databases.listDocuments(DB_ID, COLL_ID, [Query.equal('fileId', id)]);
      for (const chunk of chunks.documents) {
        await databases.deleteDocument(DB_ID, COLL_ID, chunk.$id);
      }
      loadFiles();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="flex flex-col h-[80vh] bg-[var(--card-bg)] border border-[var(--card-border)] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Book className="w-5 h-5 text-[var(--accent)]" />
             <h3 className="font-bold tracking-tight">Library</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--card-border)] rounded-lg transition-colors">
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Upload Zone */}
          <div className="relative group">
            <input 
              type="file" 
              onChange={handleUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isUploading}
            />
            <div className={`border-2 border-dashed border-[var(--card-border)] group-hover:border-[var(--accent)]/50 rounded-2xl p-6 flex flex-col items-center justify-center transition-all ${isUploading ? 'bg-[var(--card-border)]/20' : ''}`}>
               {isUploading ? (
                 <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
               ) : (
                 <Upload className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
               )}
               <p className="text-xs font-medium mt-2 text-[var(--text-muted)]">
                 {isUploading ? 'Processing...' : 'Upload Knowledge'}
               </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* File List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin opacity-20" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-10 opacity-30 italic text-xs">
                No documents found
              </div>
            ) : (
              filteredFiles.map(file => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={file.$id} 
                  className="group flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)] hover:bg-[var(--card-border)]/50 transition-all"
                >
                  <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                     <FileText className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                     <p className="text-xs font-medium truncate">{file.name}</p>
                     <p className="text-[10px] text-[var(--text-muted)]">{(file.sizeOriginal / 1024).toFixed(1)} KB</p>
                  </div>
                  <button 
                    onClick={() => deleteFile(file.$id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--card-border)] bg-[var(--card-border)]/20">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full" />
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Local RAG Active</span>
          </div>
          <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
            The Council will automatically reference these documents when answering your questions.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
