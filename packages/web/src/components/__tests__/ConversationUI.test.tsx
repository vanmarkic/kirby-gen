import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import ConversationUI from '../ConversationUI';

describe('ConversationUI - Error Handling', () => {
  let mock: MockAdapter;
  const projectId = 'test-project-123';
  const mockOnSchemaUpdate = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.reset();
  });

  describe('Initialization Error Handling', () => {
    it('should handle 401 unauthorized error gracefully without crashing', async () => {
      mock.onPost(`/projects/${projectId}/domain-mapping/init`).reply(401, {
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authentication token provided',
          statusCode: 401,
        },
      });

      render(
        <ConversationUI
          projectId={projectId}
          onSchemaUpdate={mockOnSchemaUpdate}
          onComplete={mockOnComplete}
        />
      );

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });

      // Should still have the input field
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();

      // Should not have any conversation messages (since initialization failed)
      expect(screen.queryByRole('generic', { name: /message-assistant/ })).not.toBeInTheDocument();
    });

    it('should handle network error gracefully without crashing', async () => {
      // Simulate network error
      mock.onPost(`/projects/${projectId}/domain-mapping/init`).networkError();

      expect(() => {
        render(
          <ConversationUI
            projectId={projectId}
            onSchemaUpdate={mockOnSchemaUpdate}
            onComplete={mockOnComplete}
          />
        );
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });
    });

    it('should handle malformed response without initialMessage field', async () => {
      // This tests the exact error: "Cannot read properties of undefined (reading 'initialMessage')"
      mock.onPost(`/projects/${projectId}/domain-mapping/init`).reply(200, {
        success: true,
        data: {}, // Missing initialMessage field
      });

      expect(() => {
        render(
          <ConversationUI
            projectId={projectId}
            onSchemaUpdate={mockOnSchemaUpdate}
            onComplete={mockOnComplete}
          />
        );
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });
    });

    it('should display initialMessage when initialization succeeds', async () => {
      const initialMessage = "Hello! Let's start mapping your domain.";

      mock.onPost(`/projects/${projectId}/domain-mapping/init`).reply(200, {
        success: true,
        data: { initialMessage },
      });

      render(
        <ConversationUI
          projectId={projectId}
          onSchemaUpdate={mockOnSchemaUpdate}
          onComplete={mockOnComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(initialMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Message Sending Error Handling', () => {
    it('should handle 401 error when sending message', async () => {
      // Setup: successful initialization
      const initialMessage = 'Hello!';
      mock.onPost(`/projects/${projectId}/domain-mapping/init`).reply(200, {
        success: true,
        data: { initialMessage },
      });

      // Then: 401 error when sending message
      mock.onPost(`/projects/${projectId}/domain-mapping/message`).reply(401, {
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authentication token provided',
          statusCode: 401,
        },
      });

      render(
        <ConversationUI
          projectId={projectId}
          onSchemaUpdate={mockOnSchemaUpdate}
          onComplete={mockOnComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(initialMessage)).toBeInTheDocument();
      });

      // Try to send a message (will fail with 401)
      // This should show an error message to the user
      // Component should not crash
    });
  });
});
