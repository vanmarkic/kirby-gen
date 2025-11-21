import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import type { DomainSchema, Message } from '@kirby-gen/shared';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize conversation
    initializeConversation();
  }, [projectId]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/domain-mapping/init`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();
      const data = result.data; // Extract from ResponseBuilder wrapper

      if (data.initialMessage) {
        setMessages([
          {
            role: 'assistant',
            content: data.initialMessage,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

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
      const response = await fetch(
        `/api/projects/${projectId}/domain-mapping/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            conversationHistory: messages,
          }),
        }
      );

      const result = await response.json();
      const data = result.data; // Extract from ResponseBuilder wrapper

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
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="conversation-ui">
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
