-- =====================================================
-- SEED SAMPLE COUNSELING SESSIONS FOR TESTING
-- =====================================================
-- This script creates sample counseling sessions with feedback
-- for the mentor: Testing Staff (ID: d6bf36da-d94b-4d19-8e60-f7375115d7df)

-- First, let's ensure we have the mentor ID
DO $$
DECLARE
  v_mentor_id UUID := 'd6bf36da-d94b-4d19-8e60-f7375115d7df';
  v_student_id1 UUID;
  v_student_id2 UUID;
  v_student_id3 UUID;
  v_session_id1 UUID;
  v_session_id2 UUID;
  v_session_id3 UUID;
  v_session_id4 UUID;
  v_session_id5 UUID;
  v_session_id6 UUID;
BEGIN

  -- Check if mentor exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_mentor_id) THEN
    RAISE NOTICE 'Mentor not found! Please update the mentor_id in this script.';
    RETURN;
  END IF;

  RAISE NOTICE 'Creating sample students...';

  -- Create or get sample students
  INSERT INTO students (id, roll_number, name, email, department_id, institution_id, year, section, is_active)
  VALUES
    (gen_random_uuid(), 'CS2021001', 'Rajesh Kumar', 'rajesh.kumar@student.edu', '75808b94-e846-4fc5-9b26-2e62fdb21a92', '9380358f-7020-4c23-89c3-e9538b47cf33', '3', 'A', true),
    (gen_random_uuid(), 'CS2021002', 'Priya Sharma', 'priya.sharma@student.edu', '75808b94-e846-4fc5-9b26-2e62fdb21a92', '9380358f-7020-4c23-89c3-e9538b47cf33', '2', 'B', true),
    (gen_random_uuid(), 'CS2021003', 'Arjun Patel', 'arjun.patel@student.edu', '75808b94-e846-4fc5-9b26-2e62fdb21a92', '9380358f-7020-4c23-89c3-e9538b47cf33', '3', 'A', true)
  ON CONFLICT (roll_number) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_student_id1;

  -- Get the student IDs
  SELECT id INTO v_student_id1 FROM students WHERE roll_number = 'CS2021001';
  SELECT id INTO v_student_id2 FROM students WHERE roll_number = 'CS2021002';
  SELECT id INTO v_student_id3 FROM students WHERE roll_number = 'CS2021003';

  RAISE NOTICE 'Created 3 sample students';

  -- Create sample counseling sessions
  RAISE NOTICE 'Creating sample counseling sessions...';

  -- Session 1 - Recent (this week)
  INSERT INTO counseling_sessions (id, mentor_id, student_id, session_name, date, time, status, notes)
  VALUES (
    gen_random_uuid(),
    v_mentor_id,
    v_student_id1,
    'Academic Performance Discussion',
    CURRENT_DATE - INTERVAL '2 days',
    '10:00',
    'completed',
    'Discussion about semester performance and study habits'
  )
  RETURNING id INTO v_session_id1;

  -- Session 2 - Recent (this week)
  INSERT INTO counseling_sessions (id, mentor_id, student_id, session_name, date, time, status, notes)
  VALUES (
    gen_random_uuid(),
    v_mentor_id,
    v_student_id2,
    'Career Guidance Session',
    CURRENT_DATE - INTERVAL '3 days',
    '14:30',
    'completed',
    'Discussed career options and internship opportunities'
  )
  RETURNING id INTO v_session_id2;

  -- Session 3 - Last week
  INSERT INTO counseling_sessions (id, mentor_id, student_id, session_name, date, time, status, notes)
  VALUES (
    gen_random_uuid(),
    v_mentor_id,
    v_student_id3,
    'Personal Issues Counseling',
    CURRENT_DATE - INTERVAL '7 days',
    '11:00',
    'completed',
    'Student facing personal challenges affecting studies'
  )
  RETURNING id INTO v_session_id3;

  -- Session 4 - Last week
  INSERT INTO counseling_sessions (id, mentor_id, student_id, session_name, date, time, status, notes)
  VALUES (
    gen_random_uuid(),
    v_mentor_id,
    v_student_id1,
    'Project Guidance',
    CURRENT_DATE - INTERVAL '10 days',
    '15:00',
    'completed',
    'Final year project discussion and timeline planning'
  )
  RETURNING id INTO v_session_id4;

  -- Session 5 - Earlier this month
  INSERT INTO counseling_sessions (id, mentor_id, student_id, session_name, date, time, status, notes)
  VALUES (
    gen_random_uuid(),
    v_mentor_id,
    v_student_id2,
    'Attendance and Punctuality',
    CURRENT_DATE - INTERVAL '12 days',
    '09:30',
    'completed',
    'Addressing attendance concerns and time management'
  )
  RETURNING id INTO v_session_id5;

  -- Session 6 - Earlier this month
  INSERT INTO counseling_sessions (id, mentor_id, student_id, session_name, date, time, status, notes)
  VALUES (
    gen_random_uuid(),
    v_mentor_id,
    v_student_id3,
    'Exam Preparation Guidance',
    CURRENT_DATE - INTERVAL '15 days',
    '16:00',
    'completed',
    'Study strategies and exam preparation techniques'
  )
  RETURNING id INTO v_session_id6;

  RAISE NOTICE 'Created 6 sample counseling sessions';

  -- Create feedback for sessions
  RAISE NOTICE 'Creating sample feedback...';

  -- Feedback for Session 1
  INSERT INTO session_feedback (session_id, counseling_queries, action_taken, submitted_by)
  VALUES (
    v_session_id1,
    'Student is struggling with time management and balancing academics with extracurricular activities. Needs guidance on prioritization.',
    'Provided a study schedule template. Recommended using Pomodoro technique. Scheduled follow-up session in 2 weeks to track progress.',
    v_mentor_id
  );

  -- Feedback for Session 2
  INSERT INTO session_feedback (session_id, counseling_queries, action_taken, submitted_by)
  VALUES (
    v_session_id2,
    'Student interested in software development career but unsure about specialization. Wants to know about internship opportunities.',
    'Discussed various software domains (web, mobile, AI/ML). Shared list of companies offering internships. Connected student with alumni working in industry.',
    v_mentor_id
  );

  -- Feedback for Session 3
  INSERT INTO session_feedback (session_id, counseling_queries, action_taken, submitted_by)
  VALUES (
    v_session_id3,
    'Student dealing with family issues affecting academic performance. Feeling overwhelmed and stressed.',
    'Provided emotional support and counseling. Recommended professional counseling services. Arranged for assignment deadline extensions. Will monitor closely.',
    v_mentor_id
  );

  -- Feedback for Session 4
  INSERT INTO session_feedback (session_id, counseling_queries, action_taken, submitted_by)
  VALUES (
    v_session_id4,
    'Student needs help selecting final year project topic and forming team. Concerned about project complexity.',
    'Suggested 3 project ideas aligned with student interests. Helped identify potential team members. Provided project timeline and milestones.',
    v_mentor_id
  );

  -- Feedback for Session 5
  INSERT INTO session_feedback (session_id, counseling_queries, action_taken, submitted_by)
  VALUES (
    v_session_id5,
    'Student has poor attendance record due to health issues and transportation problems. At risk of detention.',
    'Understood genuine reasons for absence. Advised to submit medical certificates. Coordinated with HOD for attendance consideration. Suggested carpooling options.',
    v_mentor_id
  );

  -- Feedback for Session 6
  INSERT INTO session_feedback (session_id, counseling_queries, action_taken, submitted_by)
  VALUES (
    v_session_id6,
    'Student anxious about upcoming exams. Lacks confidence in certain subjects, especially Database Management Systems.',
    'Created subject-wise study plan. Shared additional study materials and previous year papers. Arranged peer tutoring for weak subjects. Boosted confidence.',
    v_mentor_id
  );

  RAISE NOTICE 'Created 6 feedback entries';
  RAISE NOTICE 'Sample data creation complete!';
  RAISE NOTICE 'You can now generate reports for mentor: Testing Staff';

END $$;
