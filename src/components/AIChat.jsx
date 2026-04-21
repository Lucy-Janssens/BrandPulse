import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProjectContext } from '../App.jsx';
import { chatWithMCP } from '../services/aiChat.js';

const ROLE_STARTERS = {
  Marketing: [
    'Which AI model cites us least for our main topic category?',
    'What content should we create to win more Perplexity citations?',
    'Show me our top cited domains — which ones are competitors?',
    'Where are our biggest citation gaps right now?',
  ],
  Sales: [
    'What does ChatGPT actually say about us vs our top competitor?',
    'Which brand has the highest sentiment score and why?',
    'Show me the verbatim AI responses that mention us for pricing queries.',
    'How do we rank against competitors across all AI models?',
  ],
  Leadership: [
    'Give me a week-over-week summary of our AI visibility.',
    'What is our single biggest AI search risk right now?',
    'How does our share of voice compare to the top competitor?',
    'What are the top 3 actions we should take to improve AI visibility?',
  ],
};

export const AIChat = () => {
  const context = useContext(ProjectContext);
  const storageKey = `brandpulse_chat_${context?.projectId || 'default'}`;

  // Restore from localStorage on mount
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [activeRole, setActiveRole] = useState('Marketing');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Persist to localStorage whenever messages change
  useEffect(() => {
    try {
      // Only save user + assistant messages (skip tool dumps)
      const toSave = messages.filter(m => m.role === 'user' || (m.role === 'assistant' && !m.tool_calls));
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch { /* quota exceeded — silently ignore */ }
  }, [messages, storageKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingStatus]);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text.trim() };
    const newHistory = [...messages, userMsg];

    setMessages(newHistory);
    setInput('');
    setIsLoading(true);
    setLoadingStatus('Thinking...');

    try {
      const { updatedHistory } = await chatWithMCP(
        newHistory,
        context,
        (status) => setLoadingStatus(status)
      );
      setMessages(updatedHistory);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  };

  const threatColor = { low: '#4ade80', medium: '#f59e0b', high: '#ef4444' };

  return (
    <div className="flex-col gap-6" style={{ width: '100%', height: 'calc(100vh - 8rem)' }}>
      <header className="flex justify-between items-center">
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>AI Analyst</h2>
          <p className="text-muted">Ask anything. The AI uses live Peec MCP data to answer your questions.</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            style={{ background: 'none', border: '1px solid var(--border-light)', color: 'var(--color-text-muted)', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Clear history
          </button>
        )}
      </header>

      <div className="glass-panel flex-col" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>

        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 ? (
            /* Starter state */
            <div className="flex-col items-center justify-center" style={{ height: '100%', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🤖</div>
                <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>What do you want to know?</p>
                <p className="text-muted text-sm">Pick a role below or type your own question.</p>
              </div>

              {/* Role tabs */}
              <div className="flex gap-2">
                {Object.keys(ROLE_STARTERS).map(role => (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    style={{
                      padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem',
                      background: activeRole === role ? 'var(--color-primary)' : 'transparent',
                      border: `1px solid ${activeRole === role ? 'var(--color-primary)' : 'var(--border-light)'}`,
                      color: activeRole === role ? '#fff' : 'var(--color-text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {/* Starter questions */}
              <div className="flex-col gap-2" style={{ width: '100%', maxWidth: '600px' }}>
                {ROLE_STARTERS[activeRole].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    style={{
                      textAlign: 'left', padding: '0.8rem 1.1rem', borderRadius: '10px', cursor: 'pointer',
                      background: 'var(--color-bg-base)', border: '1px solid var(--border-light)',
                      color: 'var(--color-text-main)', fontSize: '0.9rem', lineHeight: '1.4',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-surface-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--color-bg-base)'; }}
                  >
                    <span style={{ color: 'var(--color-primary)', marginRight: '0.5rem' }}>→</span>{q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              if (msg.role === 'tool') return null;
              if (msg.role === 'assistant' && msg.tool_calls) return null;

              const isUser = msg.role === 'user';
              return (
                <div key={i} className={isUser ? '' : 'markdown-body'} style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  background: isUser ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                  color: isUser ? '#fff' : 'var(--color-text)',
                  padding: '1rem',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  lineHeight: '1.6',
                  overflowX: 'auto',
                }}>
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              );
            })
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--color-bg-elevated)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem' }}>
              <span className="shimmer-text">{loadingStatus}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'var(--color-bg-elevated)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Analyst..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--color-bg-base)',
                color: 'var(--color-text)',
                outline: 'none',
                fontSize: '0.95rem',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

