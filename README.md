# CivicFix 🇪🇹
### Improving our neighborhood, together.

**CivicFix** is a modern civic engagement web application that enables citizens to report local urban infrastructure problems—such as water leaks, potholes, or streetlight outages—and track resolutions directly with municipal administration teams.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router) & React
- **Language:** TypeScript
- **Styling:** TailwindCSS, Lucide Icons, Framer Motion
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- **Internationalization:** `next-intl` (Amharic `am` & English `en`)

---

## ✨ Live Features

* **📍 Interactive Issue Reporting:** Capture issues, attach photos, and pin locations on interactive maps.
* **🌍 Full Bilingual Support:** Native English and Amharic localization with custom Ethiopic typography (`font-ethiopic`).
* **👥 Community Upvoting:** Upvote reported neighborhood issues to signal community priority.
* **👑 Multi-Role Workspaces:** Role-based dashboards for **Super Admins**, **Department Officers**, and **Citizens**.
* **📁 Sector Dispatch Queues:** Department-level issue filtering, resolution note logging, and status tracking.
* **🔑 Built-in Role Showcase:** Quick 1-click access panel on the sign-in page to test Admin and Department Head features.

---

## 🔮 Roadmap & Upcoming Iterations

* **⚡ n8n Webhook Automation:** Event-driven triggers for automated field officer dispatch alerts.
* **🤖 AI Issue Categorization & Priority Scoring:** Automated image recognition and dynamic priority scoring algorithms.
* **📲 SMS & Telegram Bot Notifications:** Direct notification updates for citizens without active web sessions.
* **📊 Municipal Predictive Analytics:** Spatial heatmaps and infrastructure failure forecasting for city planners.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and `npm`

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/nursu79/Civic-Fix.git
cd Civic-Fix

# Install dependencies
npm install

# Set up environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Run local development server
npm run dev
```

---

*CivicFix — Building a better Ethiopia, one report at a time.* 🇪🇹
