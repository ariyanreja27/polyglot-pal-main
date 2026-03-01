<div align="center">
  <img src="https://ui.shadcn.com/og.jpg" alt="NeuroLex Logo" width="120" />
  <h1>NeuroLex</h1>
  <p>The Ultimate, Language-Agnostic Vocabulary Vault.</p>
</div>

---

## 📖 What is NeuroLex?

NeuroLex is not just another gamified language app. It is a highly customizable, language-agnostic vocabulary management system built for serious language learners. Whether you are learning Spanish, mastering Japanese Kanji, or constructing your own fictional language, NeuroLex acts as your personal linguistic vault. 

It leverages the principles of active recall and contextual memory: you manually curate your vocabulary, attach infinite contexts, and track your fluency progression over time. Instead of relying on pre-packaged flashcards, you build a dictionary out of the media you actually consume.

## ✨ Key Features

1. **Language Agnostic Architecture**: Support for any language, including RTL (Right-to-Left) scripts like Arabic and Hebrew, and complex CJK characters.
2. **Deep Word Profiling**: Don't just save a translation. Attach grammatical types, pronunciation guides (IPA/Pinyin/Romaji), multiple meanings, and infinite example sentences for context.
3. **AI Magic Wand ✨**: In a rush? Tap the AI Sparkles icon. NeuroLex uses Groq's LLMs (`llama-3.3-70b-versatile`) to automatically generate accurate meanings, grammatical types, and authentic example sentences tailored to the word's target language.
4. **Universal PDF Export Mechanism**: Compile your entire dynamic database into a stunning, printable PDF dictionary book. The world-class vector PDF generation engine dynamically loads appropriate Unicode fonts (e.g., Noto Serif, Amiri, Shippori Mincho) to ensure flawless offline archival.
5. **Spaced Repetition tracking**: Categorize your vocabulary as "Active" or "Learned" and filter your dashboard to focus your daily studies efficiently.
6. **Robust Authentication**: Secure email and password flows, powered by Supabase Auth with real-time OTP confirmation.

---

## 🛠️ Technology Stack

NeuroLex is built on a modern, high-performance web stack:

- **Frontend Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) for lightning-fast HMR and building.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/) for beautiful, responsive, accessible components.
- **Routing**: [React Router v6](https://reactrouter.com/) for seamless Single Page Application navigation.
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL) for secure Auth, real-time database, and storage.
- **State Management**: [React Query](https://tanstack.com/query/latest) mapping to Supabase client hooks.
- **AI Integration**: [Groq SDK](https://groq.com/) for ultra-low latency language text generation.
- **Export Engine**: [pdfMake](http://pdfmake.org/) highly customized with virtual local font loading for Unicode support.

---

## 🚀 Installation & Setup

### Prerequisites

You must have the following installed on your local machine:
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- A **Supabase** account and project (for the database and Auth).
- A **Groq API Key** (for AI features).

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/polyglot-pal.git
cd polyglot-pal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root of the project using the provided example:

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase and Groq keys:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```

### 4. Database Setup

You will need to run the SQL migrations in your Supabase project to generate the required tables (`words`, `languages`, `meanings`, `examples`, `profiles`, etc.). 

*Note: You can usually run the schemas found in the `supabase/migrations` folder via the Supabase SQL Editor.*

### 5. Download Required Fonts (For PDF Export)

To ensure the PDF exporter can render global languages locally without CORS errors, you must run the font downloader script:

```bash
npm run download-fonts
```
*(This will fetch typography assets like Amiri, Noto Serif, and Merriweather into your `/public/fonts/pdf` directory).*

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080` (or the port specified in your terminal).

---

## 💡 How to Use

1. **Sign Up**: Create an account on the `/auth` page. Verify your email if OTP is required.
2. **Create a Vault**: On the Dashboard, click "Add Language" (e.g., *Spanish*, *Japanese*).
3. **Add Words**: Open your new language vault and click the **+** button.
4. **Enrich Data**: You can manually type the meaning and example sentences, or type the word and click the **✨ AI Generate** button to have Groq fill out the form for you instantly.
5. **Study & Track**: Toggle the status circle on a word card from active (learning) to checkmark (mastered). Use the filter funnel to hide mastered words during a study session.
6. **Export**: Open the side menu (hamburger icon, top left) and click **Export PDF** to download a beautifully typeset physical copy of your dictionary.

---

## 🤝 Contribution Guidelines

We welcome contributions from the community! 

1. **Fork the repository** on GitHub.
2. **Create a new branch** for your feature or bug fix: `git checkout -b feature/my-new-feature`.
3. **Commit your changes** clearly: `git commit -m "feat: added new dark mode toggle"`.
4. **Push to the branch**: `git push origin feature/my-new-feature`.
5. **Submit a Pull Request** against the `main` branch.

Please ensure all new code is rigorously typed with TypeScript and formatted properly.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
