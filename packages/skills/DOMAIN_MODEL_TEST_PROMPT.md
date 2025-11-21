# Domain Mapping Test Endpoint - Prompt Instructions

## Purpose
This endpoint generates a complete domain model for testing purposes, bypassing the conversational flow of the main domain mapping skill.

## Expected Behavior
The endpoint should mock the final output of [/Users/dragan/Documents/kirby-gen/packages/skills/src/skills/domain_mapping/skill.py](../skills/src/skills/domain_mapping/skill.py:467-482), specifically the `_build_content_schema()` method which produces a `ContentSchema` object.

## Input
- `description`: Detailed description of the portfolio/website requirements
- `profession` (optional): User's profession to guide entity selection

## Output Format
The endpoint must return a complete `ContentSchema` JSON object with:

### 1. **Entities** (3-7 content types)
Each entity represents a content type and must include:
- `id`: kebab-case unique identifier (e.g., `"gig"`)
- `name`: PascalCase singular name (e.g., `"Gig"`)
- `pluralName`: PascalCase plural (e.g., `"Gigs"`)
- `description`: Clear explanation of what this entity represents
- `displayField`: Which field to use as the title (usually `"title"`)
- `icon`: Icon name suggestion (e.g., `"music"`, `"calendar"`)
- `sortable`: Whether items can be reordered (boolean)
- `timestamps`: Whether to track created/updated dates (boolean)
- `slugSource`: Which field to generate URL slug from (usually `"title"`)
- `fields`: Array of 5-15 field definitions

### 2. **Fields** (per entity)
Each field must have:
- `id`: kebab-case unique ID (e.g., `"venue-name"`)
- `name`: camelCase field name (e.g., `"venueName"`)
- `label`: Human-readable label (e.g., `"Venue Name"`)
- `type`: One of the GenericFieldType enum values:
  - Text: `"text"`, `"textarea"`, `"richtext"`, `"markdown"`, `"code"`
  - Numbers: `"number"`, `"range"`
  - Choices: `"boolean"`, `"select"`, `"multiselect"`, `"radio"`, `"checkbox"`
  - Dates: `"date"`, `"time"`, `"datetime"`
  - Media: `"image"`, `"file"`, `"gallery"`, `"files"`
  - Structured: `"json"`, `"list"`, `"structure"`, `"blocks"`
  - Relations: `"relation"`, `"relations"`
  - Special: `"url"`, `"email"`, `"tel"`, `"color"`, `"location"`, `"tags"`
- `required`: Boolean indicating if field is mandatory
- `helpText`: Optional guidance text for users
- `placeholder`: Optional placeholder text
- `width`: Layout hint (`"full"`, `"half"`, `"third"`, `"quarter"`)
- `options`: Type-specific configuration object (see below)
- `validation`: Optional validation rules object

### 3. **Field Options** (type-specific)
**IMPORTANT**: When using `"select"`, `"multiselect"`, `"radio"`, or `"checkbox"` types, the `choices` array must contain objects with this exact structure:

```json
{
  "choices": [
    {"value": "upcoming", "label": "Upcoming", "disabled": false},
    {"value": "past", "label": "Past Performance", "disabled": false}
  ]
}
```

**DO NOT** use simple string arrays like `["Upcoming", "Past"]` - this will cause validation errors!

Other options examples:
- Text fields: `{"minLength": 3, "maxLength": 200}`
- Number fields: `{"min": 0, "max": 100, "step": 1}`
- Media fields: `{"accept": [".jpg", ".png"], "maxSize": 5242880}`
- Relation fields: `{"targetEntity": "Artist", "multiple": false}`

### 4. **Relationships** (1-5 connections between entities)
Each relationship must have:
- `id`: kebab-case ID (e.g., `"gig-to-photos"`)
- `type`: One of `"one-to-one"`, `"one-to-many"`, `"many-to-many"`
- `from`: Source entity name (PascalCase, e.g., `"Gig"`)
- `to`: Target entity name (PascalCase, e.g., `"Photo"`)
- `label`: Forward relationship description (e.g., `"has photos"`)
- `inversLabel`: Reverse relationship description (e.g., `"belongs to gig"`)
- `required`: Boolean
- `cascadeDelete`: Whether deleting source deletes targets

### 5. **Metadata**
- `name`: Schema name (e.g., `"Musician Portfolio Schema"`)
- `description`: Brief description
- `author`: Always `"Domain Mapping Test"`
- `createdAt`: ISO datetime string
- `updatedAt`: ISO datetime string

## Example Request
```json
{
  "description": "I'm a musician playing gigs. I want to showcase both upcoming and past gigs with venue name, location, date/time, ticket links, photos and videos. I also need a bio section, discography with music samples, and band members showcase.",
  "profession": "musician"
}
```

## Example Response (Success)
```json
{
  "success": true,
  "data": {
    "domainModel": {
      "version": "1.0.0",
      "entities": [
        {
          "id": "gig",
          "name": "Gig",
          "pluralName": "Gigs",
          "description": "Live performance events, both upcoming and past",
          "displayField": "title",
          "icon": "calendar-music",
          "sortable": true,
          "timestamps": true,
          "slugSource": "title",
          "fields": [
            {
              "id": "title",
              "name": "title",
              "label": "Event Title",
              "type": "text",
              "required": true,
              "helpText": "Name of the gig or event",
              "placeholder": "e.g., Live at Blue Note",
              "width": "full",
              "options": {"minLength": 3, "maxLength": 200}
            },
            {
              "id": "status",
              "name": "status",
              "label": "Status",
              "type": "select",
              "required": true,
              "helpText": "Is this gig upcoming or already performed?",
              "width": "half",
              "options": {
                "choices": [
                  {"value": "upcoming", "label": "Upcoming", "disabled": false},
                  {"value": "past", "label": "Past Performance", "disabled": false}
                ]
              }
            }
          ]
        }
      ],
      "relationships": [
        {
          "id": "gig-to-artist",
          "type": "many-to-one",
          "from": "Gig",
          "to": "Artist",
          "label": "performed by",
          "inversLabel": "has performed",
          "required": true,
          "cascadeDelete": false
        }
      ],
      "metadata": {
        "name": "Musician Portfolio Schema",
        "description": "Content schema for musician gig showcase",
        "author": "Domain Mapping Test",
        "createdAt": "2025-01-21T10:30:00Z",
        "updatedAt": "2025-01-21T10:30:00Z"
      }
    }
  },
  "metadata": {
    "duration": 12.45,
    "test_mode": true,
    "entities_count": 5,
    "relationships_count": 4
  }
}
```

## Common Validation Errors to Avoid

### ❌ WRONG: String array for choices
```json
{
  "type": "select",
  "options": {
    "choices": ["Upcoming", "Past", "Cancelled"]
  }
}
```

### ✅ CORRECT: Object array for choices
```json
{
  "type": "select",
  "options": {
    "choices": [
      {"value": "upcoming", "label": "Upcoming", "disabled": false},
      {"value": "past", "label": "Past", "disabled": false},
      {"value": "cancelled", "label": "Cancelled", "disabled": true}
    ]
  }
}
```

### ❌ WRONG: Missing required field properties
```json
{
  "id": "title",
  "name": "title",
  "type": "text"
}
```

### ✅ CORRECT: All required properties
```json
{
  "id": "title",
  "name": "title",
  "label": "Title",
  "type": "text",
  "required": true,
  "helpText": "The title of the item",
  "width": "full"
}
```

## Implementation Reference
The conversational skill at `/Users/dragan/Documents/kirby-gen/packages/skills/src/skills/domain_mapping/skill.py` builds this schema through multiple conversation turns. The test endpoint should produce the same quality output in a single call.

Key methods to reference:
- `_build_content_schema()` (lines 467-482): Final schema assembly
- `_update_context_from_response()` (lines 414-465): How entities and relationships are accumulated
- `ConversationContext` model: Tracks discovered entities and relationships

## Expected Entities by Profession

### Musician
- Gig, Artist/Band, Release (Album/Single), AudioSample, BandMember, Venue

### Photographer
- Project, Photo, Gallery, Client, Category

### Developer
- Project, TechStack, Repository, BlogPost, Testimonial

### Designer
- Project, CaseStudy, Client, Testimonial, Service

The test endpoint should intelligently select entities based on the description and profession, producing production-ready schemas that don't require further editing.
