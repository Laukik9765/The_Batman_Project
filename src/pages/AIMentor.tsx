// AI Mentor Alfred Terminal Page
// Path: src/pages/AIMentor.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { 
  AIMentorIcon, 
  XIcon, 
  BatIcon 
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTED_CHIPS = [
  "How am I doing this week?",
  "What should I focus on today?",
  "Analyze my sleep patterns",
  "Give me a finance breakdown",
  "I feel like giving up — help",
  "What habits should I change?"
];

// Helper function to safely parse basic Markdown text into React elements (avoiding dangerouslySetInnerHTML)
const parseMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // 1. Headings (e.g. ### Header or ## Header)
    if (line.startsWith('### ')) {
      return (
        <h4 key={idx} className="font-bebas text-lg tracking-wider text-bat-gold mt-4 mb-2">
          {line.replace('### ', '')}
        </h4>
      );
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      return (
        <h3 key={idx} className="font-bebas text-xl tracking-wider text-bat-gold mt-6 mb-3 border-b border-bat-border pb-1">
          {line.replace(/^#+\s/, '')}
        </h3>
      );
    }
    
    // 2. Bullet list items (e.g. - list item)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const cleanLine = line.replace(/^[-*]\s/, '');
      // Handle simple bold text inside bullets: **bold**
      const parts = cleanLine.split('**');
      return (
        <li key={idx} className="ml-4 list-disc text-xs text-bat-white mb-1 leading-relaxed">
          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-bat-gold">{part}</strong> : part)}
        </li>
      );
    }

    // 3. Numbered lists (e.g. 1. list item)
    if (/^\d+\.\s/.test(line)) {
      const cleanLine = line.replace(/^\d+\.\s/, '');
      const parts = cleanLine.split('**');
      return (
        <li key={idx} className="ml-4 list-decimal text-xs text-bat-white mb-1 leading-relaxed">
          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-bat-gold">{part}</strong> : part)}
        </li>
      );
    }

    // 4. Blockquotes
    if (line.startsWith('> ')) {
      return (
        <blockquote key={idx} className="border-l-4 border-bat-gold bg-bat-black px-4 py-2 my-3 italic text-xs text-bat-gray rounded-r font-mono">
          {line.replace('> ', '')}
        </blockquote>
      );
    }

    // 5. Empty lines
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }

    // 6. Standard paragraph line
    const parts = line.split('**');
    return (
      <p key={idx} className="text-xs leading-relaxed text-bat-white mb-2">
        {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-bat-gold">{part}</strong> : part)}
      </p>
    );
  });
};

// Custom Typewriter Animation effect for Alfred's replies
// Persistent cache of message IDs that should play the typewriter animation in the current session
const typewriterMessagesToAnimate = new Set<string>();

const TypewriterText: React.FC<{ 
  text: string; 
  isStopped?: boolean;
  onComplete?: () => void; 
  onStop?: (currentText: string) => void;
}> = ({ text, isStopped, onComplete, onStop }) => {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(text);
  const onCompleteRef = useRef(onComplete);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onStopRef.current = onStop;
  }, [onComplete, onStop]);

  useEffect(() => {
    if (isStopped) {
      if (onStopRef.current) {
        onStopRef.current(displayedText);
      }
    }
  }, [isStopped, displayedText]);

  useEffect(() => {
    if (isStopped) return;

    textRef.current = text;
    let i = 0;
    setDisplayedText('');
    
    // Typewriter speed: 15ms per character
    const interval = setInterval(() => {
      if (i < textRef.current.length) {
        setDisplayedText((prev) => prev + textRef.current.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text, isStopped]);

  return <div className="whitespace-pre-wrap">{parseMarkdown(displayedText)}</div>;
};

export const AIMentor: React.FC = () => {
  const { 
    chatMessages, 
    weeklyReports, 
    addChatMessage, 
    updateChatMessage,
    addToast,
    profile,
    dailyTasks,
    taskCompletions,
    goals,
    sleepLogs,
    financeTransactions,
    failureReasons,
    sideQuests
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat');
  
  // Chat state
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stopResponseRequested, setStopResponseRequested] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Selected report state
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Auto scroll to bottom of chat when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, loading]);

  const handleStopResponse = () => {
    if (loading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setLoading(false);
      setIsGenerating(false);
    } else if (isGenerating) {
      setStopResponseRequested(true);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isGenerating) return;
    
    // 1. Add user message locally
    addChatMessage('user', textToSend);
    setInputValue('');
    setLoading(true);
    setIsGenerating(true);
    setStopResponseRequested(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 2. Call Edge Function AI chat proxy
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        signal: controller.signal,
        body: JSON.stringify({ 
          message: textToSend
        }),
      });

      const result = await response.json();
      
      if (controller.signal.aborted) return;

      if (response.ok && result.reply) {
        // 3. Add Alfred response locally
        const assistantMsg = addChatMessage('assistant', result.reply);
        typewriterMessagesToAnimate.add(assistantMsg.id);
      } else {
        const assistantMsg = addChatMessage('assistant', `My apologies, sir. The server returned an error: ${result.error || 'Connection disrupted.'}. Please try again later.`);
        typewriterMessagesToAnimate.add(assistantMsg.id);
        addToast(result.error || 'Connection disrupted.', 'danger');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('AI response fetch aborted by user.');
        addChatMessage('assistant', '*Transmission terminated.*');
        setIsGenerating(false);
        setLoading(false);
        return;
      }
      console.error('Edge Function unreachable:', err);
      const assistantMsg = addChatMessage('assistant', "My apologies, sir. Connection to Alfred has been lost. Please verify your internet connection.");
      typewriterMessagesToAnimate.add(assistantMsg.id);
      addToast('Unable to connect to AI server.', 'danger');
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bat-black border border-bat-border rounded shadow-2xl relative overflow-hidden">
      
      {/* Tab Selector Headers */}
      <div className="flex bg-bat-dark border-b border-bat-border h-12 flex-shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 h-12 flex items-center justify-center gap-2 font-bebas text-lg tracking-wider transition-colors ${
            activeTab === 'chat' 
              ? 'bg-bat-surface text-bat-gold shadow-[inset_0_-2px_0_var(--bat-gold)]' 
              : 'text-bat-gray hover:text-bat-white'
          }`}
        >
          <AIMentorIcon size={16} />
          AI ASSISTANT (ALFRED)
        </button>
        
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 h-12 flex items-center justify-center gap-2 font-bebas text-lg tracking-wider transition-colors ${
            activeTab === 'reports' 
              ? 'bg-bat-surface text-bat-gold shadow-[inset_0_-2px_0_var(--bat-gold)]' 
              : 'text-bat-gray hover:text-bat-white'
          }`}
        >
          <BatIcon size={16} />
          WEEKLY REPORTS ({weeklyReports.length})
        </button>
      </div>

      {/* Main panel container */}
      <div className="flex-grow flex min-h-0">
        
        {/* Chat Terminal panel */}
        {activeTab === 'chat' && (() => {
          // Filter out daily motivation prompts and their corresponding replies
          const filteredMessages = [];
          for (let i = 0; i < chatMessages.length; i++) {
            const msg = chatMessages[i];
            if (
              msg.role === 'user' &&
              msg.content === "Generate a brief, 3-sentence daily motivation transmission starting with 'Good day, Master Bruce.' or similar, tailored to my stats."
            ) {
              if (i + 1 < chatMessages.length && chatMessages[i + 1].role === 'assistant') {
                i++;
              }
              continue;
            }
            filteredMessages.push(msg);
          }

          return (
            <div className="flex-1 flex flex-col min-h-0 bg-black bg-opacity-40">
              {/* Scrollable messages log */}
              <div 
                ref={scrollRef}
                className="flex-grow p-6 overflow-y-auto no-scrollbar space-y-4"
              >
                {filteredMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="text-bat-gold mb-3 animate-pulse">
                      <AIMentorIcon size={48} />
                    </div>
                    <h4 className="font-bebas text-xl text-bat-gold tracking-widest uppercase">
                      Welcome to Alfred AI
                    </h4>
                    <p className="text-xs font-mono text-bat-gray max-w-sm mt-1 leading-relaxed">
                      Good day, sir. I have compiled your data from all logs. Ask me any questions regarding your habits, sleep logs, goals, or finances.
                    </p>
                  </div>
                )}

                {filteredMessages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  const isLatest = index === filteredMessages.length - 1;
                  
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-xl p-4 rounded font-mono border ${
                          isUser 
                            ? 'bg-bat-dark border-bat-gold text-bat-gold shadow-[0_0_10px_rgba(245,197,24,0.1)]' 
                            : 'bg-bat-surface border-bat-border text-bat-white shadow-lg'
                        }`}
                      >
                        <div className="text-[9px] uppercase font-bold text-bat-gray mb-1.5 flex items-center justify-between">
                          <span>{isUser ? 'YOU' : 'ALFRED'}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {/* Typwriter text animation for Alfred's latest reply */}
                        {!isUser && isLatest && typewriterMessagesToAnimate.has(msg.id) ? (
                          <TypewriterText 
                            text={msg.content} 
                            isStopped={stopResponseRequested}
                            onComplete={() => {
                              typewriterMessagesToAnimate.delete(msg.id);
                              setIsGenerating(false);
                            }}
                            onStop={(finalText) => {
                              typewriterMessagesToAnimate.delete(msg.id);
                              updateChatMessage(msg.id, finalText);
                              setIsGenerating(false);
                              setStopResponseRequested(false);
                            }}
                          />
                        ) : (
                          <div className="text-xs leading-relaxed whitespace-pre-wrap">
                            {parseMarkdown(msg.content)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pulsing Loading dots */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-bat-surface border border-bat-border p-4 rounded shadow-lg flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-bat-gray font-mono">ALFRED_THINKING</span>
                      <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 bg-bat-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-bat-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-bat-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick-action suggested chip prompts */}
              <div className="px-6 py-2 border-t border-bat-border flex gap-1.5 overflow-x-auto no-scrollbar bg-bat-black bg-opacity-30">
                {SUGGESTED_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isGenerating}
                    className="flex-shrink-0 text-[10px] font-mono font-bold bg-bat-dark border border-bat-border text-bat-gold hover:border-bat-gold px-3 py-1 rounded transition-colors uppercase disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form 
                onSubmit={handleSubmitForm}
                className="p-4 bg-bat-dark border-t border-bat-border flex gap-3 h-16 flex-shrink-0"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={loading}
                  className="flex-grow bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded px-4 py-2 font-mono text-xs disabled:opacity-70"
                  placeholder={loading ? "Alfred is thinking..." : isGenerating ? "Alfred is replying..." : "Ask Alfred anything..."}
                />
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={handleStopResponse}
                    className="bg-bat-danger hover:opacity-90 text-bat-white font-bebas px-6 rounded text-md tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="w-2.5 h-2.5 bg-bat-white rounded-sm" />
                    STOP
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="bg-bat-gold hover:bg-bat-gold-dim disabled:opacity-50 text-bat-black font-bebas px-6 rounded text-md tracking-wider transition-colors"
                  >
                    SEND
                  </button>
                )}
              </form>
            </div>
          );
        })()}

        {/* Weekly reports history view */}
        {activeTab === 'reports' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-black bg-opacity-40 divide-y md:divide-y-0 md:divide-x divide-bat-border">
            
            {/* Left list pane */}
            <div className={`w-full md:w-80 overflow-y-auto no-scrollbar p-4 divide-y divide-bat-border flex-shrink-0 ${selectedReport ? 'hidden md:block' : ''}`}>
              <h3 className="font-bebas text-lg text-bat-gold tracking-wider mb-4 px-2 uppercase">WEEKLY REPORTS</h3>
              
              {weeklyReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase">
                  NO REPORTS FOUND YET. Reports automatically generate every Sunday.
                </div>
              ) : (
                weeklyReports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-4 cursor-pointer rounded transition-all ${
                        isSelected 
                          ? 'bg-bat-surface text-bat-gold border border-bat-gold border-opacity-30 shadow-md' 
                          : 'hover:bg-bat-dark text-bat-white'
                      }`}
                    >
                      <div className="font-mono text-xs font-bold text-bat-gold">WEEK START: {report.week_start}</div>
                      <p className="text-[10px] text-bat-gray mt-1 truncate">
                        {report.content.substring(0, 50)}...
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right details reader pane */}
            <div className={`flex-grow overflow-y-auto no-scrollbar p-6 bg-bat-dark bg-opacity-10 ${!selectedReport ? 'hidden md:block' : ''}`}>
              {selectedReport ? (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="flex justify-between items-center border-b border-bat-border pb-4">
                    <div>
                      <span className="text-[9px] font-mono text-bat-gold uppercase">WEEKLY SUMMARY</span>
                      <h2 className="font-bebas text-2xl text-bat-white tracking-widest mt-1">
                        WEEKLY REPORT — {selectedReport.week_start}
                      </h2>
                    </div>
                    <button 
                      onClick={() => setSelectedReport(null)}
                      className="text-bat-gray hover:text-bat-white md:hidden"
                    >
                      <XIcon size={18} />
                    </button>
                  </div>
                  
                  {/* Safely render reports using safe markdown parser */}
                  <div className="font-mono bg-bat-dark p-6 border border-bat-border rounded leading-relaxed shadow-lg">
                    {parseMarkdown(selectedReport.content)}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="text-bat-gold opacity-15 mb-3">
                    <BatIcon size={72} />
                  </div>
                  <h4 className="font-bebas text-xl text-bat-gold tracking-widest uppercase">
                    Select Report
                  </h4>
                  <p className="text-xs font-mono text-bat-gray max-w-sm mt-1">
                    Select a weekly report from the history log to inspect your past insights.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
