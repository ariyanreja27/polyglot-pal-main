

# Personal Multi-Language Vocabulary Learning Web App

## Overview
A web app where users can create languages, add vocabulary words with meanings and examples, track learning progress, and auto-generate missing word information. Built with React + Lovable Cloud (Supabase) for authentication, database, and AI features.

---

## Phase 1: Authentication & Database Setup

### User Authentication
- Email/password signup and login
- Each user only sees their own data
- Simple, clean login/signup pages

### Database Tables
- **profiles** – user profile info
- **languages** – user's languages (name, user_id)
- **words** – vocabulary entries (word, type, pronunciation, status, difficulty, notes, favorite, review_count, last_reviewed)
- **meanings** – multiple meanings per word (with auto_generated flag)
- **examples** – sentences + translations per word (with auto_generated flag)
- **tags** and **word_tags** – tagging system
- Row-level security so users only access their own data

---

## Phase 2: Language Dashboard

- Grid of language cards after login
- Each card shows: language name, total words, mastered/learning/new counts
- "Add New Language" button
- Click a card → opens that language's word list

---

## Phase 3: Word List Page

- Language title + statistics bar (total, mastered, learning, new)
- **Search** by word or meaning
- **Filters**: by type (noun/verb/adjective/pronoun), by status (new/learning/mastered), favorites only
- **Sort**: A–Z, date added, recently reviewed, difficulty
- Word table with columns: word, first meaning, type, status indicator, favorite star toggle
- "Add Word" button
- Click a row → opens word details

---

## Phase 4: Word Details Page

- Large word title with type, pronunciation, status, difficulty, review count, last reviewed, favorite toggle
- **Meanings section**: numbered list, auto-generated labels, "Add Meaning" button
- **Examples section**: sentence + translation pairs, auto-generated labels, "Add Example" button
- **Notes section**: editable text block
- **Tags section**: tag chips with add/remove
- **Learning controls**: change status, change difficulty, "Review This Word" button (increments count, updates date)
- Edit Word and Delete Word actions

---

## Phase 5: Add/Edit Word Page

- Form with fields: word, type, pronunciation, meaning, example sentence, example translation, notes, tags, status, difficulty
- All fields optional except word
- "Save Word" button

---

## Phase 6: Auto-Generate Missing Fields

- "Auto Generate Missing Fields" button on the add/edit form
- Uses **Lovable AI** to fill empty fields only (meaning, pronunciation, example sentence, translation, word type)
- Does NOT overwrite user-entered data
- Generated content marked as `auto_generated = true`
- Works before saving so user can review

---

## Phase 7: Polish & Responsiveness

- Soft, modern color palette (soft blue/indigo tones)
- Fully responsive and mobile-optimized layout
- Smooth transitions and clean section separation
- Minimal, uncluttered design throughout

