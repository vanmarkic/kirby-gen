# Kirby Blueprints - Generated from Domain Model

**Source:** 01-domain-model.json
**Generated:** 2025-11-21T05:45:15.145Z
**Entities:** 5

## Files Generated

- `gig.yml`
- `artist.yml`
- `release.yml`
- `audio-sample.yml`
- `band-member.yml`

## Domain Model Summary

**Name:** Musician Portfolio Schema
**Description:** Content schema for musician portfolio showcasing gigs, music, and band members
**Version:** 1.0.0

### Entities


#### 1. Gig (`gig.yml`)
- **Plural:** Gigs
- **Description:** Live performance events, both upcoming and past
- **Fields:** 10
- **Icon:** calendar
- **Sortable:** Yes


#### 2. Artist (`artist.yml`)
- **Plural:** Artists
- **Description:** Artist profile with bio and information
- **Fields:** 5
- **Icon:** user
- **Sortable:** No


#### 3. Release (`release.yml`)
- **Plural:** Releases
- **Description:** Albums, EPs, and singles in your discography
- **Fields:** 7
- **Icon:** disc
- **Sortable:** Yes


#### 4. AudioSample (`audio-sample.yml`)
- **Plural:** AudioSamples
- **Description:** Music clips and audio samples
- **Fields:** 5
- **Icon:** music
- **Sortable:** Yes


#### 5. BandMember (`band-member.yml`)
- **Plural:** BandMembers
- **Description:** Members of the band or collaborators
- **Fields:** 4
- **Icon:** users
- **Sortable:** Yes


### Relationships


1. **Gig** performed by **Artist** (many-to-one)


2. **Release** released by **Artist** (many-to-one)


3. **AudioSample** from **Release** (many-to-one)


4. **BandMember** member of **Artist** (many-to-one)


## Installation

To use these blueprints in a Kirby installation:

1. Copy all `.yml` files to your Kirby `site/blueprints/pages/` directory
2. Update the panel to see the new page types
3. Adjust field options and validation as needed

## Field Types Used

This blueprint uses the following Kirby field types:
- text
- textarea
- richtext
- date
- time
- select
- url
- gallery
- files
- image
- tags
- structure
- list

## Notes

- All fields have help text and placeholders
- Required fields are marked as required
- Field widths are optimized for the panel layout
- Relationships are defined but may need manual configuration in Kirby
