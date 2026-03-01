# 🔌 NeuroLex REST API Documentation

NeuroLex utilizes **Supabase** (built on PostgREST) as its Backend-as-a-Service architecture. Therefore, the "API" exposed to the frontend operates as a set of standardized, auto-generated RESTful endpoints directly mapping to the underlying PostgreSQL database schemas.

Below is documentation for the core interactive data models, their endpoints (via Supabase client or standard `fetch`), expected payload structures, and error codes.

---

## 🔐 Authentication

All secured endpoints require an Authorization header containing the active user's JWT Bearer token, obtained during the Auth flow. 

**Header:**
```http
Authorization: Bearer <user_jwt_token>
apikey: <your_supabase_anon_key>
```

---

## 📚 1. Languages API

Manages the top-level language "vaults" or folders created by users.

### Create a Language
- **Purpose**: Initializes a new language category for the user to store vocabulary in.
- **HTTP Method**: `POST`
- **Endpoint**: `/rest/v1/languages`
- **Authentication**: Required (JWT)

**Request Body (JSON):**
```json
{
  "name": "Spanish",
  "user_id": "uuid-of-the-authenticated-user"
}
```

**Successful Response (201 Created):**
```json
[
  {
    "id": "uuid-of-new-language",
    "name": "Spanish",
    "user_id": "uuid",
    "created_at": "2026-03-01T12:00:00.000Z"
  }
]
```

### Get User Languages
- **Purpose**: Retrieves all language vaults belonging to the current user.
- **HTTP Method**: `GET`
- **Endpoint**: `/rest/v1/languages?select=*`

---

## 📝 2. Words API

Core CRUD operations for individual vocabulary entries.

### Create a Word
- **Purpose**: Creates a new vocabulary base-entry inside a specific language vault.
- **HTTP Method**: `POST`
- **Endpoint**: `/rest/v1/words`

**Request Body (JSON):**
```json
{
  "word": "Gato",
  "language_id": "uuid-of-language",
  "user_id": "uuid-of-user",
  "type": "noun",
  "pronunciation": "/ˈɡa.to/",
  "notes": "Commonly used for domestic house cats.",
  "difficulty": "easy",
  "status": "active"
}
```

### Update a Word (Toggle Status / Edit)
- **Purpose**: Updates properties of an existing word, such as toggling its fluency `status` from 'active' to 'mastered'.
- **HTTP Method**: `PATCH`
- **Endpoint**: `/rest/v1/words?id=eq.<word_uuid>`

**Request Body (JSON):**
```json
{
  "status": "mastered"
}
```

### Delete a Word
- **Purpose**: Removes a word and its cascading dependencies (meanings, examples) from the database.
- **HTTP Method**: `DELETE`
- **Endpoint**: `/rest/v1/words?id=eq.<word_uuid>`

---

## 📖 3. Meanings API

Handles the 1-to-many relationship of definitions belonging to a single word.

### Create Meaning(s)
- **Purpose**: Attaches a new definition to a `word`. Can be sent as a single object or an array for bulk insertion.
- **HTTP Method**: `POST`
- **Endpoint**: `/rest/v1/meanings`

**Request Body (Bulk JSON):**
```json
[
  {
    "word_id": "uuid-of-word",
    "meaning": "Cat",
    "auto_generated": true
  },
  {
    "word_id": "uuid-of-word",
    "meaning": "Feline",
    "auto_generated": false
  }
]
```

**Successful Response (201 Created):** Returns bulk inserted row objects.

---

## ✍️ 4. Examples API

Handles the contextual example sentences tied to a specific word.

### Create Example Sentence
- **Purpose**: Attaches an example sentence and its English translation to a word.
- **HTTP Method**: `POST`
- **Endpoint**: `/rest/v1/examples`

**Request Body (JSON):**
```json
{
  "word_id": "uuid-of-word",
  "sentence": "El gato negro duerme en la silla.",
  "sentence_meaning": "The black cat sleeps on the chair.",
  "auto_generated": true
}
```

---

## 🤖 5. External Integration: Groq AI Generation

While not a direct database endpoint, this is a critical external API consumed by the application (`src/lib/ai-service.ts`).

### Language Prompt Completion
- **Purpose**: Uses Groq LLM to auto-fill Word Form details.
- **HTTP Method**: `POST`
- **Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
- **Authentication**: Bearer `VITE_GROQ_API_KEY`

**Request Body (JSON):**
```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "user",
      "content": "You are a linguistic expert. Generate detailed language learning data for the word 'Gato' which is in the Spanish language..."
    }
  ],
  "temperature": 0.1,
  "response_format": { "type": "json_object" }
}
```

**Successful Response Structure:**
```json
{
  "type": "noun",
  "pronunciation": "[ˈɡa.to]",
  "meaning": "cat",
  "example": {
    "sentence": "El gato corre en el jardín.",
    "translation": "The cat runs in the garden."
  },
  "notes": "Masculine noun, changes to 'gata' for a female cat.",
  "tags": ["animal", "common", "noun"]
}
```

---

## ⚠️ Standard Error Responses (PostgREST / Supabase)

Supabase conforms to standardized REST error outputs.

### `401 Unauthorized`
Occurs when the JWT token is missing or expired.
```json
{
  "code": "PGRST301",
  "details": null,
  "hint": null,
  "message": "JWT expired"
}
```

### `403 Forbidden`
Occurs when Row Level Security (RLS) policies block the user from reading or modifying data they do not own.
```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "new row violates row-level security policy for table"
}
```

### `404 Not Found`
Occurs when attempting to target a `uuid` or relational key that does not exist in the database.
```json
{
  "code": "PGRST116",
  "details": "The result contains 0 rows",
  "hint": null,
  "message": "JSON object requested, multiple (or no) rows returned"
}
```

### `409 Conflict` (Unique Constraint Violation)
Occurs if trying to duplicate uniquely constrained columns.
```json
{
  "code": "23505",
  "details": "Key (name, user_id)=(Spanish, uuid) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint"
}
```
