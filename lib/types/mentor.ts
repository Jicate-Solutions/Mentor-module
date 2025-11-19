export interface Mentor {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  institution?: string;
  program?: string;
  avatar?: string;
  phone?: string;
  totalStudents?: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  avatar?: string;
  isActive?: boolean;
  institution?: string;
  departmentName?: string;
  programName?: string;
}

export interface CounselingSession {
  id: string;
  mentorId: string;
  studentId: string;
  studentName: string;
  student?: Student;  // Complete student information
  sessionName: string;
  date: string;
  time: string;
  notes?: string;
  attachment?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: CounselingFeedback;
  createdAt: string;
  updatedAt?: string;
}

export interface CounselingFeedback {
  counselingQueries: string;
  actionTaken: string;
  attachmentUrl?: string;
  submittedAt: string;
  submittedBy: string;
}

export interface StudentFeedback {
  id: string;
  session_id: string;
  student_id: string;
  mentor_id: string;
  
  // Ratings
  session_helpfulness_rating: number | null;
  mentor_approachability_rating: number | null;
  concerns_addressed: boolean | null;
  
  // Text feedback
  what_helped: string | null;
  what_could_improve: string | null;
  additional_comments: string | null;
  
  // Token info
  feedback_token: string;
  token_expires_at: string;
  
  // Email tracking
  email_sent_at: string | null;
  email_opened_at: string | null;
  
  // Submission
  submitted_at: string | null;
  is_anonymous: boolean;
  
  created_at: string;
  updated_at: string;
  
  // Relations (when populated)
  student?: Student;
  session?: CounselingSession;
}

export interface StudentFeedbackStats {
  total_responses: number;
  response_rate: number;
  avg_helpfulness: number;
  avg_approachability: number;
  concerns_addressed_count: number;
  concerns_addressed_percentage: number;
}

export interface StudentFeedbackSubmission {
  session_helpfulness_rating: number;
  mentor_approachability_rating: number;
  concerns_addressed: boolean;
  what_helped?: string;
  what_could_improve?: string;
  additional_comments?: string;
  is_anonymous?: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface ExamResult {
  id: string;
  studentId: string;
  examName: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  date: string;
}
