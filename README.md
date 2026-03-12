# RestoGenie 🍽️✨

A next-generation, Multi-Tenant SaaS platform tailored for restaurant franchise owners and administrators. Seamlessly integrate multiple POS (Point of Sale) systems, delivery platforms, and external APIs to gain deep, actionable insights into your business.

## 🚀 Key Features

- **Multi-Tenant Architecture**: Robust data isolation ensuring each user controls and views only their respective stores (`store_id` based schema).
- **Universal POS Integration**: Connect dynamically to major POS providers (Payhere, Smartro, Easypos) and Delivery apps (Baemin, etc.) via a user-friendly 3-step Wizard.
- **Background Syncing**: Intelligent background cron jobs fetching up to 30 days of historical sales data concurrently without hitting serverless timeout limits.
- **AI Menu Mapping**: Automatically normalize thousands of disparate menu items into standard names using Gemini AI (`@google/generative-ai`).
- **Deep Analytics Dashboard**: Track daily sales, funnel conversions, and matrix heatmaps for Peak-time and ABC (Activity-Based Costing) analysis via Recharts.
- **CCTV Foot Traffic & Funnel**: Integration with the May-I API to analyze store foot traffic vs. actual POS orders.
- **Multi-LLM Business Chatbot**: A contextual floating AI assistant offering ChatGPT, Gemini, and Claude options. Owners can securely input their own API keys to query daily sales and RAG-injected business insights.
- **Automated Weekly Reports**: Generate clean, aesthetic Weekly Reports in HTML/PDF format based on your store's performance.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, Serverless Edge API Routes)
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Styling**: Tailwind CSS + `shadcn/ui` + Lucide Icons
- **Auth**: Custom JWT-based Edge Authentication + `jose`
- **Charts**: Recharts
- **AI Integration**: Vercel AI SDK (`ai`), `@google/generative-ai`

## 🏃 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/restogenie.co.kr.git
   cd restogenie.co.kr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Duplicate `.env.example` to `.env` and fill in necessary keys (Supabase URL, Smartro Auth, etc.)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## ☁️ Deployment

This project is optimized for deployment on **Vercel**. Pushing to the `main` branch will automatically trigger a production build. PostgreSQL is managed via **Supabase**.
