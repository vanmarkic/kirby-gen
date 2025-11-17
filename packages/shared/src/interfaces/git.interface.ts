/**
 * Git Service Interface
 * Abstracts Git operations (local repos, GitHub, GitLab, etc.)
 */
export interface IGitService {
  /**
   * Create a new Git repository
   * @param projectId - Unique project identifier
   * @param initialCommit - Whether to create an initial commit
   * @returns Repository path or URL
   */
  createRepo(projectId: string, initialCommit?: boolean): Promise<string>;

  /**
   * Commit changes to repository
   * @param projectId - Unique project identifier
   * @param message - Commit message
   * @param files - Array of file paths to commit (relative to repo root)
   * @returns Commit SHA
   */
  commit(projectId: string, message: string, files: string[]): Promise<string>;

  /**
   * Push changes to remote
   * @param projectId - Unique project identifier
   * @param remote - Remote name (default: 'origin')
   * @param branch - Branch name (default: 'main')
   */
  push(projectId: string, remote?: string, branch?: string): Promise<void>;

  /**
   * Get repository status
   * @param projectId - Unique project identifier
   * @returns Git status information
   */
  getStatus(projectId: string): Promise<GitStatus>;

  /**
   * Get commit history
   * @param projectId - Unique project identifier
   * @param limit - Maximum number of commits to return
   * @returns Array of commits
   */
  getHistory(projectId: string, limit?: number): Promise<GitCommit[]>;

  /**
   * Delete repository
   * @param projectId - Unique project identifier
   */
  deleteRepo(projectId: string): Promise<void>;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  email: string;
  date: Date;
}
