import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProjectContext } from '../App.jsx';
import { chatWithMCP } from '../services/aiChat.js';

export const AIChat = () => {
  const context = useContext(ProjectContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input.trim() };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);
    setLoadingStatus('Thinking...');

    try {
      const { updatedHistory, finalMessage } = await chatWithMCP(
        newHistory, 
        context,
        (status) => setLoadingStatus(status)
      );

      // Add the final assistant message from the returned history
      setMessages(updatedHistory);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="flex-col gap-6" style={{ width: '100%', height: 'calc(100vh - 8rem)' }}>
      <header>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>AI Analyst</h2>
        <p className="text-muted">Ask anything. The AI uses the Peec MCP tools to pull live data and answer your questions.</p>
      </header>

      <div className="glass-panel flex-col" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
        
        {/* Chat History area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center text-muted" style={{ height: '100%', fontStyle: 'italic' }}>
              Try asking: "Why is Perplexity not citing us for enterprise queries?"
            </div>
          ) : (
            messages.map((msg, i) => {
              if (msg.role === 'tool') return null; // Don't render raw tool dumps
              if (msg.role === 'assistant' && msg.tool_calls) return null; // Don't render tool requests
              
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
        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
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
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-base)',
                color: 'var(--color-text)',
                outline: 'none'
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
