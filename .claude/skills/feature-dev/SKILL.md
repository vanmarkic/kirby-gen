---
name: feature-dev
description: End-to-end feature development workflow with brainstorming, TDD, implementation, testing, and documentation. Use when adding new features, implementing user stories, or building new capabilities. Enforces test-first development, encourages design exploration, and ensures proper documentation.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TodoWrite
---

# Feature Development Skill

This skill guides you through complete feature development following Neo Provisioning best practices, TDD principles, and proper documentation.

## When to Use This Skill

Use this skill when:
- User requests a new feature or capability
- Implementing a user story or requirement
- Adding new workflows, activities, or integrations
- Building new API endpoints or services
- Extending existing functionality with new capabilities

Do NOT use for:
- Simple bug fixes (use `superpowers:systematic-debugging` instead)
- Refactoring existing code without new functionality
- Documentation-only changes
- Configuration changes

## Feature Development Process

### Phase 1: Discovery & Design (Brainstorming)

**ALWAYS start with brainstorming unless the feature is trivial (<50 lines, single file).**

<function_calls>
<invoke name="Skill">
<parameter name="skill">superpowers:brainstorming