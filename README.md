# IELTS CBT Platform

Professional computer-based IELTS Academic Writing practice platform with examiner feedback.

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **Database**: Neon (PostgreSQL)
- **Authentication**: JWT with httpOnly cookies

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_secret_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── api/              # API routes
├── student/          # Student dashboard & features
├── teacher/          # Teacher dashboard & review system
├── test-room/        # Test environment
└── (auth)/           # Login & registration
components/           # Shared UI components
lib/                  # Utilities, auth, database queries
types/                # TypeScript type definitions
```

## Features

- Role-based authentication (Student/Teacher)
- IELTS Writing Task 1 & Task 2 practice
- Real-time word count & timer
- Examiner feedback with band scores
- Responsive design with dark theme
