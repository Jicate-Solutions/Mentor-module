export interface MentorInchargeAssignment {
  id: string;
  incharge_id: string;
  scope_type: 'department' | 'institution' | 'multi_department';
  institution_id: string | null;
  department_ids: string[];
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentorInchargeWithUser {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    department_id: string | null;
    institution_id: string | null;
  };
  assignment: MentorInchargeAssignment;
}

export interface InchargeScope {
  scopeType: 'department' | 'institution' | 'multi_department';
  institutionId: string | null;
  departmentIds: string[];
}
