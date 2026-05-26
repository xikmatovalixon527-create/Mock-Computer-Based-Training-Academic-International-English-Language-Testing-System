import Link from 'next/link';

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-8 bg-neutral-800 p-8 rounded-xl border border-neutral-700">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Configuration Required</h1>
          <p className="text-neutral-400">
            This IELTS CBT Mock Platform uses Supabase for a robust, mock-free database.
            Currently, the database credentials are not configured in your environment.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">1. Create a Supabase Project</h2>
          <p className="text-neutral-400 text-sm">
            Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">supabase.com</a>, create a new project, and go to Project Settings &gt; API.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">2. Configure Environment Variables</h2>
          <p className="text-neutral-400 text-sm">
            Open the <strong>Settings</strong> panel in AI Studio and add these secrets:
          </p>
          <pre className="bg-neutral-950 p-4 rounded text-sm text-green-400 font-mono overflow-auto">
            {`NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
JWT_SECRET="any-random-string-for-auth"`}
          </pre>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">3. Apply Database Schema</h2>
          <p className="text-neutral-400 text-sm">
            In your Supabase dashboard, go to the <strong>SQL Editor</strong> and run the following script (also available in the <code>/supabase-schema.sql</code> file in this project):
          </p>
          <div className="relative">
            <pre className="bg-neutral-950 p-4 rounded text-sm text-blue-300 font-mono overflow-auto max-h-64">
{`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE essays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('task1', 'task2', 'both')),
  topic_text TEXT NOT NULL,
  content_task1 TEXT,
  content_task2 TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  overall_band NUMERIC(3,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  essay_id UUID REFERENCES essays(id) ON DELETE CASCADE UNIQUE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ta_band NUMERIC(3,1) NOT NULL,
  ta_feedback TEXT,
  cc_band NUMERIC(3,1) NOT NULL,
  cc_feedback TEXT,
  lr_band NUMERIC(3,1) NOT NULL,
  lr_feedback TEXT,
  gra_band NUMERIC(3,1) NOT NULL,
  gra_feedback TEXT,
  overall_feedback TEXT,
  corrected_text TEXT,
  sample_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  task_number INTEGER CHECK (task_number IN (1, 2)),
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  comment_text TEXT NOT NULL
);`}
            </pre>
          </div>
        </div>
        
        <div className="pt-4 border-t border-neutral-700">
          <Link href="/login" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors inline-block">
            I have completed setup, go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
