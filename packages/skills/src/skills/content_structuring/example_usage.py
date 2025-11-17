"""
Example usage of the Content Structuring Skill
Demonstrates how to process uploaded content and map it to a schema
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path

from skills.content_structuring import (
    ContentStructuringSkill,
    ContentStructuringInput,
    UploadedFile,
    ProcessingOptions,
    ContentStatus
)

# Import schema models from domain_mapping
from skills.domain_mapping.models import (
    ContentSchema,
    EntitySchema,
    FieldSchema,
    RelationshipSchema,
    SchemaMetadata,
    GenericFieldType,
    RelationshipType
)


def create_sample_schema() -> ContentSchema:
    """Create a sample portfolio schema for demonstration"""
    return ContentSchema(
        version="1.0.0",
        entities=[
            EntitySchema(
                id="project",
                name="Project",
                pluralName="Projects",
                description="Portfolio projects showcasing work",
                fields=[
                    FieldSchema(
                        id="title",
                        name="title",
                        label="Project Title",
                        type=GenericFieldType.TEXT,
                        required=True
                    ),
                    FieldSchema(
                        id="description",
                        name="description",
                        label="Short Description",
                        type=GenericFieldType.TEXTAREA,
                        required=False
                    ),
                    FieldSchema(
                        id="content",
                        name="content",
                        label="Full Content",
                        type=GenericFieldType.RICHTEXT,
                        required=False
                    ),
                    FieldSchema(
                        id="technologies",
                        name="technologies",
                        label="Technologies Used",
                        type=GenericFieldType.TAGS,
                        required=False
                    ),
                    FieldSchema(
                        id="date_completed",
                        name="date_completed",
                        label="Date Completed",
                        type=GenericFieldType.DATE,
                        required=False
                    ),
                    FieldSchema(
                        id="featured_image",
                        name="featured_image",
                        label="Featured Image",
                        type=GenericFieldType.IMAGE,
                        required=False
                    ),
                    FieldSchema(
                        id="gallery",
                        name="gallery",
                        label="Project Gallery",
                        type=GenericFieldType.GALLERY,
                        required=False
                    ),
                    FieldSchema(
                        id="demo_url",
                        name="demo_url",
                        label="Live Demo URL",
                        type=GenericFieldType.URL,
                        required=False
                    ),
                    FieldSchema(
                        id="github_url",
                        name="github_url",
                        label="GitHub Repository",
                        type=GenericFieldType.URL,
                        required=False
                    )
                ],
                displayField="title",
                slugSource="title",
                timestamps=True,
                sortable=True
            ),
            EntitySchema(
                id="blog_post",
                name="Blog Post",
                pluralName="Blog Posts",
                description="Blog articles and tutorials",
                fields=[
                    FieldSchema(
                        id="title",
                        name="title",
                        label="Title",
                        type=GenericFieldType.TEXT,
                        required=True
                    ),
                    FieldSchema(
                        id="content",
                        name="content",
                        label="Content",
                        type=GenericFieldType.MARKDOWN,
                        required=True
                    ),
                    FieldSchema(
                        id="excerpt",
                        name="excerpt",
                        label="Excerpt",
                        type=GenericFieldType.TEXTAREA,
                        required=False
                    ),
                    FieldSchema(
                        id="author",
                        name="author",
                        label="Author",
                        type=GenericFieldType.TEXT,
                        required=False
                    ),
                    FieldSchema(
                        id="publish_date",
                        name="publish_date",
                        label="Publish Date",
                        type=GenericFieldType.DATETIME,
                        required=False
                    ),
                    FieldSchema(
                        id="tags",
                        name="tags",
                        label="Tags",
                        type=GenericFieldType.TAGS,
                        required=False
                    ),
                    FieldSchema(
                        id="featured_image",
                        name="featured_image",
                        label="Featured Image",
                        type=GenericFieldType.IMAGE,
                        required=False
                    )
                ],
                displayField="title",
                slugSource="title",
                timestamps=True
            ),
            EntitySchema(
                id="skill",
                name="Skill",
                pluralName="Skills",
                description="Technical skills and competencies",
                fields=[
                    FieldSchema(
                        id="name",
                        name="name",
                        label="Skill Name",
                        type=GenericFieldType.TEXT,
                        required=True
                    ),
                    FieldSchema(
                        id="category",
                        name="category",
                        label="Category",
                        type=GenericFieldType.SELECT,
                        required=True,
                        options={
                            "choices": [
                                {"value": "frontend", "label": "Frontend"},
                                {"value": "backend", "label": "Backend"},
                                {"value": "database", "label": "Database"},
                                {"value": "devops", "label": "DevOps"},
                                {"value": "design", "label": "Design"},
                                {"value": "other", "label": "Other"}
                            ]
                        }
                    ),
                    FieldSchema(
                        id="proficiency",
                        name="proficiency",
                        label="Proficiency Level",
                        type=GenericFieldType.RANGE,
                        required=False,
                        options={"min": 1, "max": 10}
                    ),
                    FieldSchema(
                        id="years_experience",
                        name="years_experience",
                        label="Years of Experience",
                        type=GenericFieldType.NUMBER,
                        required=False
                    )
                ],
                displayField="name"
            )
        ],
        relationships=[
            RelationshipSchema(
                id="project_skills",
                type=RelationshipType.MANY_TO_MANY,
                from_entity="project",
                to_entity="skill",
                label="Uses skills",
                inversLabel="Used in projects"
            ),
            RelationshipSchema(
                id="blog_project_reference",
                type=RelationshipType.MANY_TO_MANY,
                from_entity="blog_post",
                to_entity="project",
                label="References projects",
                inversLabel="Referenced in posts"
            )
        ],
        metadata=SchemaMetadata(
            name="Developer Portfolio Schema",
            description="Content schema for a developer portfolio website",
            author="Content Structuring Skill",
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
    )


async def process_sample_files():
    """Example of processing sample content files"""

    # Initialize the skill with your Anthropic API key
    # In production, use environment variable: os.getenv("ANTHROPIC_API_KEY")
    skill = ContentStructuringSkill(api_key="your-api-key-here")

    # Create sample schema
    schema = create_sample_schema()

    # Prepare list of files to process
    # In a real scenario, these would be uploaded files
    sample_files = [
        UploadedFile(
            file_path="./content/project-ecommerce.md",
            original_name="project-ecommerce.md",
            mime_type="text/markdown"
        ),
        UploadedFile(
            file_path="./content/blog-react-hooks.md",
            original_name="blog-react-hooks.md",
            mime_type="text/markdown"
        ),
        UploadedFile(
            file_path="./content/project-mobile-app.pdf",
            original_name="project-mobile-app.pdf",
            mime_type="application/pdf"
        ),
        UploadedFile(
            file_path="./content/skills-list.txt",
            original_name="skills-list.txt",
            mime_type="text/plain"
        )
    ]

    # Configure processing options
    options = ProcessingOptions(
        auto_generate_slugs=True,
        extract_relationships=True,
        extract_metadata=True,
        infer_dates=True,
        use_ai_enhancement=True,
        chunk_large_files=True,
        max_chunk_size=3000,
        default_status=ContentStatus.DRAFT,
        ignore_errors=True  # Continue processing even if some files fail
    )

    # Create input
    input_data = ContentStructuringInput(
        content_schema=schema,
        uploaded_files=sample_files,
        processing_options=options,
        context={
            "portfolio_owner": "John Doe",
            "target_audience": "potential employers and clients",
            "style": "professional but approachable"
        }
    )

    # Process content
    print("Processing content files...")
    result = await skill.process_content(input_data)

    # Display results
    print("\n=== Processing Results ===")
    print(f"Schema: {result.schema.metadata.name}")
    print(f"Generated at: {result.metadata.generatedAt}")

    # Statistics
    stats = result.metadata.processingStats
    print(f"\nProcessing Statistics:")
    print(f"  Total files: {stats.totalFiles}")
    print(f"  Processed: {stats.processedFiles}")
    print(f"  Failed: {stats.failedFiles}")
    print(f"  Total items created: {stats.totalItems}")
    print(f"  Processing time: {stats.processingTimeMs}ms")

    # Items by entity
    print(f"\nItems by Entity Type:")
    for entity_type, count in stats.itemsByEntity.items():
        print(f"  {entity_type}: {count} items")

    # Show sample content
    print("\n=== Sample Content Items ===")
    for entity_type, items in result.content.items():
        if items:
            print(f"\n{entity_type.upper()} Items:")
            for item in items[:2]:  # Show first 2 items of each type
                print(f"\n  ID: {item.id}")
                print(f"  Type: {item.entityType}")
                print(f"  Slug: {item.metadata.slug}")
                print(f"  Status: {item.metadata.status.value}")

                # Show some fields
                if 'title' in item.fields:
                    print(f"  Title: {item.fields['title']}")
                if 'description' in item.fields:
                    desc = item.fields['description'][:100] + "..." if len(item.fields['description']) > 100 else item.fields['description']
                    print(f"  Description: {desc}")

                # Show relationships
                if item.relationships:
                    print(f"  Relationships: {len(item.relationships)}")
                    for rel in item.relationships[:2]:
                        print(f"    - {rel.relationshipId} -> {rel.targetItemId}")

    # Show errors and warnings if any
    if stats.errors:
        print("\n=== Errors ===")
        for error in stats.errors:
            print(f"  - {error}")

    if stats.warnings:
        print("\n=== Warnings ===")
        for warning in stats.warnings:
            print(f"  - {warning}")

    return result


async def validate_and_improve():
    """Example of validating schema and getting AI suggestions"""

    skill = ContentStructuringSkill(api_key="your-api-key-here")
    schema = create_sample_schema()

    # Validate schema
    print("Validating schema...")
    issues = await skill.validate_schema(schema)

    if issues:
        print("\nSchema validation issues:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("Schema is valid!")

    # You could also get AI suggestions for improvement
    # (if implemented in the skill)


def create_sample_content_files():
    """Create sample content files for testing"""

    # Create content directory
    os.makedirs("./content", exist_ok=True)

    # Sample project markdown
    with open("./content/project-ecommerce.md", "w") as f:
        f.write("""---
title: E-Commerce Platform
date: 2024-01-15
tags: react, node.js, mongodb, stripe
---

# E-Commerce Platform

A full-stack e-commerce solution built with modern technologies.

## Overview

This project is a complete e-commerce platform featuring product catalog, shopping cart,
checkout process, and admin dashboard.

## Technologies Used

- **Frontend**: React, Redux, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB
- **Payment**: Stripe API
- **Deployment**: Docker, AWS

## Key Features

- Product search and filtering
- User authentication
- Shopping cart persistence
- Secure payment processing
- Admin inventory management

## Demo

Live demo: https://demo.example.com
GitHub: https://github.com/example/ecommerce

## Screenshots

![Homepage](./screenshots/homepage.png)
![Product Page](./screenshots/product.png)
""")

    # Sample blog post markdown
    with open("./content/blog-react-hooks.md", "w") as f:
        f.write("""---
title: Understanding React Hooks
author: John Doe
date: 2024-02-01
tags: react, javascript, tutorial
---

# Understanding React Hooks

React Hooks revolutionized how we write React components. Let's explore the most important hooks.

## Introduction

Hooks allow you to use state and other React features in functional components.

## useState Hook

The useState hook lets you add state to functional components:

```javascript
const [count, setCount] = useState(0);
```

## useEffect Hook

The useEffect hook handles side effects:

```javascript
useEffect(() => {
  // Side effect logic
  return () => {
    // Cleanup
  };
}, [dependencies]);
```

## Custom Hooks

You can create your own custom hooks to share logic between components.

## Conclusion

Hooks provide a more direct API to the React concepts you already know.
""")

    # Sample skills text file
    with open("./content/skills-list.txt", "w") as f:
        f.write("""Technical Skills Portfolio

PROGRAMMING LANGUAGES
=====================
- JavaScript (8 years)
- Python (5 years)
- TypeScript (4 years)
- Go (2 years)

FRONTEND TECHNOLOGIES
====================
- React & React Native
- Vue.js
- Angular
- HTML5/CSS3
- Tailwind CSS

BACKEND TECHNOLOGIES
===================
- Node.js & Express
- Django & Flask
- GraphQL
- REST APIs
- Microservices

DATABASES
=========
- PostgreSQL
- MongoDB
- Redis
- Elasticsearch

DEVOPS & TOOLS
=============
- Docker & Kubernetes
- CI/CD (GitHub Actions, Jenkins)
- AWS & Google Cloud
- Git & GitHub
""")

    print("Sample content files created in ./content/")


if __name__ == "__main__":
    # Create sample files for testing
    create_sample_content_files()

    # Run the example
    print("\n" + "="*50)
    print("Content Structuring Skill Example")
    print("="*50 + "\n")

    # Note: Replace 'your-api-key-here' with actual Anthropic API key
    # or set ANTHROPIC_API_KEY environment variable

    try:
        # Run async functions
        asyncio.run(process_sample_files())

        print("\n" + "="*50)
        asyncio.run(validate_and_improve())

    except Exception as e:
        print(f"Error: {e}")
        print("\nNote: Make sure to set your Anthropic API key!")