import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User } from 'lucide-react';
import type { DomainSchema, Message } from '@kirby-gen/shared';
import { domainMappingEndpoints } from '../api/endpoints';

interface ConversationUIProps {
  projectId: string;
  onSchemaUpdate: (schema: DomainSchema) => void;
  onComplete: () => void;
}

export default function ConversationUI({
  projectId,
  onSchemaUpdate,
  onComplete,
}: ConversationUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initializeConversation = useCallback(async () => {
    try {
      setError(null);
      const data = await domainMappingEndpoints.initialize(projectId);

      if (data?.initialMessage) {
        setMessages([
          {
            role: 'assistant',
            content: data.initialMessage,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error: unknown) {
      console.error('Failed to initialize conversation:', error);

      // Set user-friendly error message
      const axiosError = error as { response?: { status: number }; message?: string };
      if (axiosError?.response?.status === 401) {
        setError('Authentication required. Please log in to continue.');
      } else if (axiosError?.message === 'Network Error') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to initialize conversation. Please refresh the page.');
      }
    }
  }, [projectId]);

  useEffect(() => {
    // Initialize conversation
    initializeConversation();
  }, [initializeConversation]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      setError(null);
      const data = await domainMappingEndpoints.sendMessage(projectId, {
        message: input,
        conversationHistory: messages,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update schema if provided
      if (data.schema) {
        onSchemaUpdate(data.schema);
      }

      // Mark as complete if the conversation is done
      if (data.isComplete) {
        onComplete();
      }
    } catch (error: unknown) {
      console.error('Failed to send message:', error);

      // Provide user-friendly error messages
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      const err = error as { response?: { status?: number }; message?: string };

      if (err?.response?.status === 401) {
        errorContent = 'Your session has expired. Please log in again.';
        setError('Authentication required. Please log in to continue.');
      } else if (err?.message === 'Network Error') {
        errorContent = 'Network error. Please check your connection.';
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="conversation-ui">
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <div className="messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message message-${message.role}`}
          >
            <div className="message-avatar">
              {message.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <span className="message-time">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="conversation-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="input"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn-primary btn-icon"
          disabled={!input.trim() || isLoading}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
