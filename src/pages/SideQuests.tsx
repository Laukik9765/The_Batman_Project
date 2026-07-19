// Side Quests (Daily logs / journal) module
// Path: src/pages/SideQuests.tsx

import React, { useState } from 'react';
import { useAppStore, SideQuestEntry } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { 
  PlusIcon, 
  TrashIcon, 
  XIcon,
  AIMentorIcon,
  SideQuestsIcon
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

const AVAILABLE_TAGS = ['Productive', 'Social', 'Health', 'Learning', 'Entertainment', 'Other'];

export const SideQuests: React.FC = () => {
  const { 
    sideQuests, 
    addSideQuest, 
    deleteSideQuest, 
    addToast 
  } = useAppStore();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // AI analysis states, mapped by entry ID
  const [analyses, setAnalyses] = useState<Record<string, string>>({});
  const [loadingAnalyses, setLoadingAnalyses] = useState<Record<string, boolean>>({});

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      addToast('Cannot save an empty journal entry.', 'danger');
      return;
    }
    setSubmitting(true);
    await addSideQuest(content, selectedTags, date);
    setContent('');
    setSelectedTags([]);
    setSubmitting(false);
  };

  const handleAnalyzeEntry = async (entry: SideQuestEntry) => {
    setLoadingAnalyses(prev => ({ ...prev, [entry.id]: true }));
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          message: "Provide a quick, concise 3-bullet-point psychological and productivity analysis of this journal entry. Focus on habits, mindset, and advice.",
          customContext: `Journal Date: ${entry.date}. Tags: [${entry.tags.join(', ')}]. Content: "${entry.content}"`
        }),
      });

      const result = await response.json();
      if (response.ok && result.reply) {
        setAnalyses(prev => ({ ...prev, [entry.id]: result.reply }));
        addToast('Alfred analysis completed.', 'success');
      } else {
        addToast('Unable to connect to Alfred.', 'danger');
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to process request with Alfred.', 'danger');
    } finally {
      setLoadingAnalyses(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Entry Form (Left side) */}
        <div className="lg:col-span-1">
          <div className="bat-glass p-6 rounded sticky top-20">
            <div className="flex items-center gap-2 text-bat-gold mb-6 border-b border-bat-border pb-3">
              <SideQuestsIcon size={24} />
              <h3 className="font-bebas text-2xl tracking-wider">ADD JOURNAL ENTRY</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Journal Entry Details
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs transition-colors h-40 resize-none font-mono leading-relaxed"
                  placeholder="Record your thoughts, experiences, daily accomplishments, or notes..."
                  required
                />
                <div className="text-[10px] text-bat-gray font-mono text-right mt-1">
                  {content.length} CHARS
                </div>
              </div>

              {/* Tag Selector Chips */}
              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-2">
                  Entry Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border transition-all ${
                          isSelected 
                            ? 'bg-bat-gold text-bat-black border-bat-gold shadow-[0_0_8px_rgba(245,197,24,0.2)]' 
                            : 'bg-bat-black border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-gray'
                        }`}
                      >
                        {tag.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded uppercase"
              >
                {submitting ? 'SAVING ENTRY...' : 'SAVE JOURNAL ENTRY'}
              </button>
            </form>
          </div>
        </div>

        {/* Scrollable Log Feed (Right side) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bat-glass p-6 rounded">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-6">JOURNAL ENTRIES</h3>
            
            {sideQuests.length === 0 ? (
              <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase border border-dashed border-bat-border rounded">
                NO JOURNAL ENTRIES FOUND. ADD YOUR FIRST NOTE USING THE FORM.
              </div>
            ) : (
              <div className="space-y-6">
                {sideQuests.map((entry) => {
                  const hasAnalysis = analyses[entry.id];
                  const isLoadingAnalysis = loadingAnalyses[entry.id];

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-bat-black border border-bat-border rounded relative group transition-all"
                    >
                      {/* Delete button */}
                      <button
                        onClick={() => deleteSideQuest(entry.id)}
                        className="absolute right-4 top-4 text-bat-gray hover:text-bat-danger transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Entry"
                      >
                        <TrashIcon size={16} />
                      </button>

                      {/* Header info */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-bat-border pb-3 mb-4">
                        <span className="font-mono text-xs font-bold text-bat-gold bg-bat-dark border border-bat-border px-2 py-0.5 rounded">
                          {entry.date}
                        </span>
                        
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag) => (
                            <span 
                              key={tag} 
                              className="text-[9px] font-mono px-2 py-0.5 rounded bg-bat-surface text-bat-white border border-bat-border border-opacity-35"
                            >
                              {tag.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Log text content */}
                      <p className="text-sm font-mono text-bat-white leading-relaxed whitespace-pre-wrap mb-4">
                        {entry.content}
                      </p>

                      {/* AI Action Trigger */}
                      <div className="border-t border-bat-border pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                        <span className="text-[10px] font-mono text-bat-gray uppercase">
                          SAVED ON {new Date(entry.created_at || entry.date).toLocaleDateString()}
                        </span>
                        
                        <button
                          onClick={() => handleAnalyzeEntry(entry)}
                          disabled={isLoadingAnalysis}
                          className="flex items-center gap-2 bg-bat-dark border border-bat-border hover:border-bat-gold text-bat-gold text-xs font-mono px-3.5 py-1.5 rounded transition-all"
                        >
                          <AIMentorIcon size={14} />
                          {isLoadingAnalysis ? 'ANALYZING ENTRY...' : "GET ALFRED'S INSIGHTS"}
                        </button>
                      </div>

                      {/* Expandable AI analysis */}
                      <AnimatePresence>
                        {hasAnalysis && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 overflow-hidden"
                          >
                            <div className="bg-bat-dark p-4 border border-bat-gold border-opacity-30 rounded relative mt-2">
                              <span className="text-[10px] font-mono text-bat-gold uppercase block mb-1">
                                ALFRED'S JOURNAL INSIGHTS
                              </span>
                              <div className="text-xs font-mono leading-relaxed text-bat-white whitespace-pre-wrap">
                                {analyses[entry.id]}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
