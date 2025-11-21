---
name: jkkn-terminology
description: JKKN Framework terminology enforcement for all code, UI text, and documentation. Ensures consistent use of official JKKN educational terms (Learners, Learning Facilitators, Learning Studios) instead of traditional terms (Students, Teachers, Classrooms). Auto-triggers when traditional educational terms are detected. (project)
---

# JKKN Framework Terminology Skill

## Purpose

This skill ensures all code, UI text, comments, and documentation use official JKKN Framework terminology instead of traditional educational terms. JKKN has specific terminology requirements that reflect their learner-centric educational philosophy.

## When to Use This Skill

Use this skill when:

- **Writing user-facing text** - Labels, messages, placeholders, tooltips
- **Creating documentation** - Comments, README files, inline docs
- **Naming code elements** - Variables, functions, components, types
- **Reviewing existing code** - Auditing for terminology compliance
- **Creating database fields** - Schema design and API responses
- **Onboarding new developers** - Establishing terminology standards

## Detection Patterns

Auto-trigger when detecting these traditional terms:

**People Terms**:
- `student`, `students`, `pupil`, `trainee`
- `faculty`, `teacher`, `professor`, `instructor`

**Space Terms**:
- `classroom`, `lecture hall`, `study hall`

**Academic Terms**:
- `syllabus`, `curriculum`, `course outcomes`
- `teaching objectives`

**Assessment Terms**:
- `failed`, `passed` (in assessment context)
- `homework`, `assignment`
- `test`, `exam` (as nouns for assessments)

## Critical Terminology Reference

### People (Zero Tolerance)

| ❌ NEVER Use | ✅ ALWAYS Use |
|-------------|--------------|
| Students, Pupils, Kids, Children, Trainees | **Learners** (or "Young Learners" if age context needed) |
| Faculty, Teachers, Professors, Instructors | **Learning Facilitators** (academic staff) |
| Staff (non-academic) | **Team Members** |

### Physical Spaces

| ❌ NEVER Use | ✅ ALWAYS Use |
|-------------|--------------|
| Classrooms | **Learning Studios** |
| Lecture Halls | **Learning Auditoriums** |
| Labs | **Learning Labs** |
| Study Halls | **Learning Commons** |

### Academic Structures

| ❌ NEVER Use | ✅ ALWAYS Use |
|-------------|--------------|
| Course Outcomes | **Learning Outcomes** |
| Teaching Objectives | **Learning Objectives** |
| Syllabus | **Learning Pathway** |
| Curriculum | **Learning Framework** |
| Grades | **Learning Assessments** |

### Assessment & Evaluation

| ❌ Avoid | ✅ Preferred |
|---------|------------|
| Failed/Failure | **Did not meet learning outcomes** |
| Passed | **Achieved learning outcomes** |
| Test/Exam | **Learning Assessment** |
| Homework | **Independent Learning Activities** |
| Assignment | **Learning Task** |

## How to Use This Skill

### 1. New Code Development

When writing new code, apply JKKN terminology from the start:

**Variable & Type Naming**:
```typescript
// ❌ Wrong
const students = await getStudents();
interface Teacher { name: string; }
type StudentList = Student[];

// ✅ Correct
const learners = await getLearners();
interface LearningFacilitator { name: string; }
type LearnerList = Learner[];
```

**Function Naming**:
```typescript
// ❌ Wrong
function getStudentById(studentId: string) { }
function assignTeacher(teacherId: string) { }

// ✅ Correct
function getLearnerById(learnerId: string) { }
function assignLearningFacilitator(facilitatorId: string) { }
```

### 2. UI Text Implementation

All user-facing text must use JKKN terminology:

**Labels & Headings**:
```tsx
// ❌ Wrong
<Label>Select Student</Label>
<h1>Teacher Dashboard</h1>
<th>Student Name</th>

// ✅ Correct
<Label>Select Learner</Label>
<h1>Learning Facilitator Dashboard</h1>
<th>Learner Name</th>
```

**Messages & Notifications**:
```typescript
// ❌ Wrong
toast.success("Student enrolled successfully");
toast.error("Teacher not found");
alert("The student failed the exam");

// ✅ Correct
toast.success("Learner enrolled successfully");
toast.error("Learning Facilitator not found");
alert("The learner did not meet learning assessment outcomes");
```

**Placeholders & Empty States**:
```tsx
// ❌ Wrong
<Input placeholder="Search students..." />
<p>No teachers assigned to this class</p>

// ✅ Correct
<Input placeholder="Search learners..." />
<p>No learning facilitators assigned to this session</p>
```

### 3. Database & API Design

**Schema Naming**:
```sql
-- ❌ Wrong
CREATE TABLE students (
  student_id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id)
);

-- ✅ Correct
CREATE TABLE learners (
  learner_id UUID PRIMARY KEY,
  facilitator_id UUID REFERENCES learning_facilitators(id)
);
```

**API Response Mapping**:
```typescript
// If database uses legacy terms, map at API boundary
interface APIResponse {
  // Internal: student_id (legacy DB)
  // External: learnerId (JKKN compliant)
  learnerId: string;
  learnerName: string;
  facilitatorId: string;
}
```

### 4. Code Review Process

When reviewing code for terminology compliance:

1. **Search for banned terms**:
   ```bash
   grep -rni "student\|teacher\|classroom\|syllabus" ./src
   ```

2. **Check UI strings in components**:
   - Review all `<Label>`, `<Button>`, `<h1-h6>` text
   - Check toast messages and alerts
   - Verify form placeholders

3. **Validate database queries**:
   - Check table and column references
   - Review API response fields

### 5. Migration Strategy

For existing codebases:

**Priority 1 - User-Facing Text**:
- UI labels and headings
- Toast messages and alerts
- Form placeholders and hints
- Error messages

**Priority 2 - API Responses**:
- JSON field names in responses
- Error message strings
- Documentation strings

**Priority 3 - Internal Code**:
- Variable names
- Function names
- Type definitions
- Comments

## Edge Cases

### Legacy Database Fields

When database uses legacy terms but code must be JKKN compliant:

```typescript
// Map at type level
interface LearnerDB {
  student_id: string;  // Legacy DB field
  student_name: string;
}

interface Learner {
  learnerId: string;   // JKKN compliant
  learnerName: string;
}

// Transform function
function toLearner(db: LearnerDB): Learner {
  return {
    learnerId: db.student_id,
    learnerName: db.student_name,
  };
}
```

### External API Integration

Accept external terms, transform to JKKN at boundary:

```typescript
// External API returns { student: {...} }
// Transform to JKKN before use in UI
const externalData = await fetchExternalAPI();
const learnerData = {
  learner: externalData.student,
};
```

### Compound Terms

Apply terminology to compound terms:

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| student-list | learner-list |
| teacher-dashboard | facilitator-dashboard |
| classroom-schedule | learning-studio-schedule |
| homework-tracker | learning-activity-tracker |

## Best Practices

### Consistency
- Use the same term throughout the codebase
- Don't mix "Learner" and "Student" in same context
- Document any exceptions in code comments

### Readability
- "Learning Facilitator" can be shortened to "Facilitator" in code
- Use full terms in user-facing UI
- Abbreviations: `LF` for Learning Facilitator in comments only

### Documentation
- Always use JKKN terms in README files
- Use JKKN terms in code comments
- API documentation must use JKKN terminology

## Verification Checklist

Before submitting code:

- [ ] No banned terms in UI text (labels, messages, placeholders)
- [ ] No banned terms in variable/function names (where feasible)
- [ ] API responses use JKKN terminology
- [ ] Toast/alert messages use JKKN terms
- [ ] Comments and documentation use JKKN terms
- [ ] New database fields use JKKN naming

## Troubleshooting

**Found legacy terms in database?**
- Don't rename production database columns
- Create mapping layer at API boundary
- Use JKKN terms in all new code

**Third-party library uses "student"?**
- Accept at import, transform immediately
- Wrap with JKKN-compliant interface
- Document the transformation

**Too long for UI space?**
- "Learning Facilitator" → "Facilitator" (OK in tight spaces)
- Never abbreviate "Learner"
- Use tooltip for full term if abbreviated

## Quick Reference Card

```
Students      → Learners
Teachers      → Learning Facilitators
Staff         → Team Members
Classrooms    → Learning Studios
Syllabus      → Learning Pathway
Curriculum    → Learning Framework
Grades        → Learning Assessments
Homework      → Independent Learning Activities
Assignment    → Learning Task
Failed        → Did not meet learning outcomes
Passed        → Achieved learning outcomes
Test/Exam     → Learning Assessment
```

---

**Version**: 1.0.0
**Last Updated**: 2025-05-21
**Applies To**: All JKKN/MyJKKN projects
