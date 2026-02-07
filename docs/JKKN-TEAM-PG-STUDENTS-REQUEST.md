# Request: Add PG Dental Students to JKKN Learner Database

**Date:** February 7, 2026
**From:** Mentor Module Development Team
**To:** JKKN API/Learner Management Team
**Priority:** High

---

## Issue Summary

The **PG (Post Graduate) dental students** from the Academic Year 2024-2025 allotment list are **not appearing** in the Mentor Dashboard because they are **not enrolled** in the JKKN Learner Management System.

### Current State
- **519 Dental students** are currently in the API
- All are **BDS (Undergraduate)** students
- **0 MDS (Postgraduate)** students are enrolled

---

## Students to be Added

Please add the following PG students to the JKKN Learners API:

### Department of Prosthodontics and Crown & Bridge
| SL.NO | Student Name | Year | Mentor |
|-------|-------------|------|--------|
| 1 | DHANA PRASANTHI.S | 1st Year | DR.PRAVEENA.K |
| 2 | SASIKUMAR.S | 1st Year | DR.PRAVEENA.K |
| 3 | SARANYA.M.N | 1st Year | DR.PRAVEENA.K |
| 4 | KETHARINATH | 1st Year | DR.JAGADEESAN |
| 5 | PRIYADHARSHINI.M | 1st Year | DR.JAGADEESAN |
| 6 | RITHANYA.M | 1st Year | DR.JAGADEESAN |
| 7 | DR.SHRI SAHANY S | 2nd Year | DR.SAI SADAN |
| 8 | DR.BHARATHI.M | 3rd Year | DR.SAI SADAN |

### Department of Periodontology
| SL.NO | Student Name | Year | Mentor |
|-------|-------------|------|--------|
| 1 | SONALI.S | 1st Year | DR.DIVYA |
| 2 | MUTHUSAMY.S | 1st Year | DR.DIVYA |
| 3 | LOGESHWARI.M | 1st Year | DR.DIVYA |
| 4 | SANDHYA RK | 1st Year | DR.DIVYA |
| 5 | DR.PRIYADHARSHINI K | 2nd Year | DR.SANTHOSH |
| 6 | DR.AMLESH S | 2nd Year | DR.SANTHOSH |
| 7 | DR.GIRIJA.S | 3rd Year | DR.SANTHOSH |
| 8 | DR.SURYA.A.S | 3rd Year | DR.SANTHOSH |

### Department of Endodontics and Conservative Dentistry
| SL.NO | Student Name | Year | Mentor |
|-------|-------------|------|--------|
| 1 | NITHYASREE A.C | 1st Year | DR.LINDA CRISTABEL |
| 2 | DURGA.S | 1st Year | DR.LINDA CRISTABEL |
| 3 | SHANITHA SALIM | 1st Year | DR.LINDA CRISTABEL |
| 4 | DINESH E | 1st Year | DR.LINDA CRISTABEL |
| 5 | PRINO S.S | 1st Year | DR.CHRIS SUSAN ABRAHAM |
| 6 | ALDRIN JENNIS | 1st Year | DR.CHRIS SUSAN ABRAHAM |
| 7 | KAVIYA.M | 1st Year | DR.RAGAVENDRAN |
| 8 | KRITHIKA S | 1st Year | DR.RAGAVENDRAN |
| 9 | RAKESH MURALI A | 1st Year | DR.RAGAVENDRAN |
| 10 | SANJAY S | 1st Year | DR.RAGAVENDRAN |
| 11 | DR.SRINITHI S | 2nd Year | DR.N.JAYAPRASH |
| 12 | DR.HEMAVARSHINI B | 2nd Year | DR.N.JAYAPRASH |
| 13 | DR.KATHIR V | 3rd Year | DR.N.JAYAPRASH |
| 14 | DR.THIRUMALAISAMY.R.S | 3rd Year | DR.N.JAYAPRASH |

### Department of Orthodontics and Dentofacial Orthopaedics
| SL.NO | Student Name | Year | Mentor |
|-------|-------------|------|--------|
| 1 | VASHNAVI.G | 1st Year | DR.VIGNESH KUMAR.V |
| 2 | KEERTHIRAJA.S | 1st Year | DR.VIGNESH KUMAR.V |
| 3 | HARINI.S | 1st Year | DR.VIGNESH KUMAR.V |
| 4 | SREELAKSHMI | 1st Year | DR.VIGNESH KUMAR.V |
| 5 | SNEHA.S | 1st Year | DR.VIGNESH KUMAR.V |
| 6 | GRACIA KAREN R A | 1st Year | DR.KUMARAN.V |
| 7 | SINDHU A | 1st Year | DR.KUMARAN.V |
| 8 | PRIYA SRIRAM | 1st Year | DR.KUMARAN.V |
| 9 | KIRUPASHINI T | 1st Year | DR.KUMARAN.V |
| 10 | PRANESH GI | 1st Year | DR.AISHWARYA.K |
| 11 | DR.KAVYASHREE K K | 2nd Year | DR.AISHWARYA.K |
| 12 | DR.MARUTHAM G | 2nd Year | DR.AISHWARYA.K |
| 13 | DR.HARIPRASAATH.M | 3rd Year | DR.AISHWARYA.K |
| 14 | DR.ANGAPPAN K | 3rd Year | DR.AISHWARYA.K |

### Department of Oral Medicine and Radiology
| SL.NO | Student Name | Year | Mentor |
|-------|-------------|------|--------|
| 1 | FANISHA TRISHY.F | 1st Year | DR.SHAKTHI SARANYA DEVI |
| 2 | UTHIRA.B | 1st Year | DR.MEENA PRIYA |
| 3 | SIVAROOBINI.E | 1st Year | - |

---

## Required Data Fields

For each student, please ensure the following fields are populated:

| Field | Value |
|-------|-------|
| `institution_id` | `e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5` (JKKN Dental College and Hospital) |
| `degree_id` | MDS (Master of Dental Surgery) degree ID |
| `department_id` | Corresponding department UUID |
| `lifecycle_status` | `active` |
| `first_name` | Student first name |
| `last_name` | Student last name |
| `student_email` | @jkkn.ac.in email |
| `roll_number` | PG roll number |

---

## API Endpoint Reference

Once enrolled, students should be accessible via:
```
GET https://www.jkkn.ai/api/api-management/learners/profiles?institution_id=e8fbe8aa-c44e-41aa-a44b-39dab2c8b9a5&lifecycle_status=active
```

---

## Impact

Once PG students are added to the learner database:
- They will automatically appear in the Mentor Dashboard student search
- Mentors can assign them using the existing "Add Learner" flow
- All mentor-mentee tracking features will work

---

## Contact

For any questions about this request, please contact the Mentor Module development team.

**Thank you!**

---

## Appendix: Mentor Verification (Staff API Check)

All 14 PG mentors from the allotment list were verified in the JKKN Staff database.

### Mentors Found (90 Dental Staff Total)

| Allotment List Name | Staff API Name | Designation | Dept |
|---------------------|----------------|-------------|------|
| DR.PRAVEENA.K | DR. PRAVEENA K | Senior Lecturer | Dentistry |
| DR.JAGADEESAN | DR. JAGADESAN N | Reader | Dentistry |
| DR.SAI SADAN | DR. SAI SADAN D | Professor | Dentistry |
| DR.DIVYA | DR. DHIVYA R | Reader | Dentistry |
| DR.SANTHOSH | DR. SANTHOSH S | Reader | Dentistry |
| DR.LINDA CRISTABEL | DR. LINDA CHRISTABLE S | Reader | Dentistry |
| DR.CHRIS SUSAN ABRAHAM | DR. CHRIS SUSAN A | Reader | Dentistry |
| DR.RAGAVENDRAN | DR. RAGAVENDRAN N | Lecturer | Dentistry |
| DR.N.JAYAPRASH | MR. JAYAPRAKASH N | Professor | Dentistry |
| DR.VIGNESH KUMAR.V | DR. VIGNESH KUMAR V | Professor | Dentistry |
| DR.KUMARAN.V | DR. KUMARAN V | Reader | Dentistry |
| DR.AISHWARYA.K | MRS. AISHWARYA K | Reader | Dentistry |
| DR.SHAKTHI SARANYA DEVI | DR. SAKTHISARANYADEVI K | Senior Lecturer | Dentistry |
| DR.MEENA PRIYA | DR. MEENAPRIYA P.K | Professor | Dentistry |

### Note on Spelling Variations

Some names have minor spelling differences between the allotment list and the API:
- JAGADEESAN → JAGADESAN
- JAYAPRASH → JAYAPRAKASH
- SHAKTHI → SAKTHI
- DIVYA → DHIVYA
- CRISTABEL → CHRISTABLE

**Conclusion:** All mentors exist in the staff database. Only the **47 PG students** need to be added.
