export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

export interface ReportDateRange {
  start: Date;
  end: Date;
}

export interface CounselingReportRow {
  serialNo: number;
  sessionName: string;
  date: string;
  time: string;
  staffCodeAndName: string;
  department: string;
  studentRegnNo: string;
  studentName: string;
  studentCourse: string;
  studentSemester: string;
  academicYear: string;
  studentQuery: string;
  queryDate: string;
  mentorResponse: string;
  responseDate: string;
}

export interface ReportGenerationParams {
  mentorId: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
}
