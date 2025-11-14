export interface Mentor {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
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
  submittedAt: string;
  submittedBy: string;
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
