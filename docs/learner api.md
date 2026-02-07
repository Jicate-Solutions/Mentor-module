Learners API
The Learners API module provides comprehensive access to student data including active learner profiles, prospective student enquiries, and alumni records. All endpoints support pagination, filtering, and data expansion for related entities.

Base URL:
https://www.jkkn.ai
Authentication
All Learners API endpoints require Bearer token authentication using an API key. Generate your API key from the API Management dashboard and include it in the Authorization header of every request.

Important Information
•
All list endpoints support pagination with page and limit query parameters
•
Maximum limit per page is 200 items
•
The expand parameter allows including related data (program, semester, section) to reduce API calls
•
Default lifecycle_status for profiles is "active" unless specified otherwise
•
All endpoints return standard error responses (401, 403, 500) as documented
•
Results are ordered by created_at or enquiry_date in descending order (newest first)
•
Learner profiles contain sensitive personal information - ensure proper authorization and data handling
•
Date filters must use YYYY-MM-DD format
Search endpoints by title, description, path, or tags...
Filter by category:
All (5)
Alumni (1)
Enquiries (2)
Profiles (2)
Showing 5 of 5 endpoints
Common Error Responses
These error responses apply to all endpoints in this module

Error Responses
Status	Error Code	Description
401	
UNAUTHORIZED
API key is required in Authorization header
401	
INVALID_API_KEY
Invalid API key
401	
EXPIRED_API_KEY
API key has expired
403	
FORBIDDEN
API key does not have read permission
500	
INTERNAL_SERVER_ERROR
Internal server error
Table of Contents
GET
List Learner Profiles
/api/api-management/learners/profiles
GET
Get Learner Profile by ID
/api/api-management/learners/profiles/[id]
GET
List Learner Enquiries
/api/api-management/learners/enquiries
GET
Get Enquiry by ID
/api/api-management/learners/enquiries/[id]
GET
List Alumni
/api/api-management/learners/alumni
GET
/api/api-management/learners/profiles
profiles
pagination
filtering
students
List Learner Profiles
Retrieve a paginated list of learner profiles with extensive filtering options including lifecycle status, program, semester, section, admission year, gender, and quota.


Bearer Token
Required
API key required in Authorization header. Generate your API key from the API Management dashboard.

Header Name
Authorization
Required Scopes
read
Example Header
Bash

Copy
Authorization: Bearer your_api_key_here
Query Parameters
Name	Type	Required	Description	Example
page	number	Optional	Page number for pagination
Default: 1
1
limit	number	Optional	Number of items per page (max 200)
Default: 50
Max: 200
50
lifecycle_status	string	Optional	Comma-separated lifecycle statuses to filter by. Default: active
Default: active
active,alumni,exited
program_id	string	Optional	Filter by program UUID	880e8400-e29b-41d4-a716-446655440003
semester_id	string	Optional	Filter by semester UUID	aa0e8400-e29b-41d4-a716-446655440005
section_id	string	Optional	Filter by section UUID	bb0e8400-e29b-41d4-a716-446655440006
admission_year	number	Optional	Filter by admission year	2024
gender	string	Optional	Filter by gender
Values: MaleFemaleOther
Male
quota	string	Optional	Filter by admission quota	Government
expand	string	Optional	Comma-separated list of related data to include (e.g., program,semester,section)	program,semester,section
Success Responses

200
Successfully retrieved learner profiles
200
Successfully retrieved learner profiles
Content-Type: json
Example Response
JSON

Copy
{
  "count": 250,
  "data": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440007",
      "application_id": "dd0e8400-e29b-41d4-a716-446655440008",
      "lifecycle_status": "active",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "2005-05-15",
      "gender": "Male",
      "student_mobile": "9876543210",
      "student_email": "john.doe@student.jkkn.ac.in",
      "roll_number": "CS2024001",
      "register_number": "711621104001",
      "program_id": "880e8400-e29b-41d4-a716-446655440003",
      "semester_id": "aa0e8400-e29b-41d4-a716-446655440005",
      "section_id": "bb0e8400-e29b-41d4-a716-446655440006",
      "admission_year": 2024,
      "quota": "Government",
      "is_profile_complete": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5
  }
}
Error Responses
Status	Error Code	Description
401	
UNAUTHORIZED
API key is required in Authorization header
401	
INVALID_API_KEY
Invalid API key
401	
EXPIRED_API_KEY
API key has expired
403	
FORBIDDEN
API key does not have read permission
500	
INTERNAL_SERVER_ERROR
Internal server error
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const response = await fetch('https://www.jkkn.ai/api/api-management/learners/profiles?page=1&limit=50&lifecycle_status=active&expand=program,semester,section', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of learner profiles
console.log(data.pagination); // Pagination info
console.log(data.count); // Total count
AI Usage Examples
3 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the learners API.


Get Active Students by Program
data-retrieval
beginner

Analyze Gender Distribution by Program
analysis
intermediate

Generate Student Contact List
automation
intermediate
Important Notes
•
Default lifecycle_status is "active" - use lifecycle_status parameter to include other statuses
•
The expand parameter supports: program, semester, section - use comma-separated values for multiple
•
Maximum limit is 200 items per page
•
Results are ordered by created_at in descending order (newest first)
•
Profile data includes extensive personal, academic, and contact information
GET
/api/api-management/learners/profiles/[id]
profiles
by-id
students
Get Learner Profile by ID
Retrieve detailed information about a specific learner profile using its unique identifier.


Bearer Token
Required
API key required in Authorization header. Generate your API key from the API Management dashboard.

Header Name
Authorization
Required Scopes
read
Example Header
Bash

Copy
Authorization: Bearer your_api_key_here
Path Parameters
Name	Type	Required	Description	Example
id	string	Required	Unique UUID of the learner profile	cc0e8400-e29b-41d4-a716-446655440007
Query Parameters
Name	Type	Required	Description	Example
expand	string	Optional	Comma-separated list of related data to include (e.g., program,semester,section)	program,semester,section
Success Responses

200
Successfully retrieved learner profile
200
Successfully retrieved learner profile
Content-Type: json
Example Response
JSON

Copy
{
  "id": "cc0e8400-e29b-41d4-a716-446655440007",
  "application_id": "dd0e8400-e29b-41d4-a716-446655440008",
  "lifecycle_status": "active",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2005-05-15",
  "gender": "Male",
  "religion": "Hindu",
  "community": "OC",
  "caste": "General",
  "father_name": "Robert Doe",
  "father_occupation": "Engineer",
  "father_mobile": "9876543211",
  "mother_name": "Jane Doe",
  "mother_occupation": "Teacher",
  "mother_mobile": "9876543212",
  "annual_income": 500000,
  "student_mobile": "9876543210",
  "student_email": "john.doe@student.jkkn.ac.in",
  "permanent_address_street": "123 Main Street",
  "permanent_address_taluk": "Komarapalayam",
  "permanent_address_district": "Namakkal",
  "permanent_address_pin_code": "638183",
  "permanent_address_state": "Tamil Nadu",
  "roll_number": "CS2024001",
  "register_number": "711621104001",
  "college_email": "john.doe@jkkn.ac.in",
  "program_id": "880e8400-e29b-41d4-a716-446655440003",
  "semester_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "section_id": "bb0e8400-e29b-41d4-a716-446655440006",
  "admission_year": 2024,
  "quota": "Government",
  "category": "OC",
  "entry_type": "Regular",
  "tenth_marks": 95.5,
  "twelfth_marks": 92.3,
  "blood_group": "O+",
  "is_profile_complete": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
Error Responses
Status	Error Code	Description
401	
UNAUTHORIZED
API key is required in Authorization header
401	
INVALID_API_KEY
Invalid API key
401	
EXPIRED_API_KEY
API key has expired
403	
FORBIDDEN
API key does not have read permission
500	
INTERNAL_SERVER_ERROR
Internal server error
404	
NOT_FOUND
Learner profile not found
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const learnerId = 'cc0e8400-e29b-41d4-a716-446655440007';
const response = await fetch(`https://www.jkkn.ai/api/api-management/learners/profiles/${learnerId}?expand=program,semester,section`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const learner = await response.json();
console.log(learner);
AI Usage Examples
2 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the learners API.


Get Complete Student Profile
data-retrieval
beginner

Verify Student Eligibility for Scholarship
analysis
intermediate
Important Notes
•
Use expand parameter to include related program, semester, and section details
•
Profile includes sensitive personal information - ensure proper authorization
•
All monetary values (annual_income) are in INR
Related Endpoints
learners-profiles-list
GET
/api/api-management/learners/enquiries
enquiries
pagination
date-filtering
List Learner Enquiries
Retrieve a paginated list of learner enquiries with optional filtering by program and enquiry date range.


Bearer Token
Required
API key required in Authorization header. Generate your API key from the API Management dashboard.

Header Name
Authorization
Required Scopes
read
Example Header
Bash

Copy
Authorization: Bearer your_api_key_here
Query Parameters
Name	Type	Required	Description	Example
page	number	Optional	Page number for pagination
Default: 1
1
limit	number	Optional	Number of items per page (max 200)
Default: 50
Max: 200
50
program_id	string	Optional	Filter by program UUID	880e8400-e29b-41d4-a716-446655440003
enquiry_date_from	string	Optional	Filter enquiries from this date (YYYY-MM-DD format)	2024-01-01
enquiry_date_to	string	Optional	Filter enquiries to this date (YYYY-MM-DD format)	2024-12-31
expand	string	Optional	Comma-separated list of related data to include (e.g., program,semester,section)	program,semester,section
Success Responses

200
Successfully retrieved enquiries
200
Successfully retrieved enquiries
Content-Type: json
Example Response
JSON

Copy
{
  "count": 150,
  "data": [
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440009",
      "enquiry_date": "2024-03-15",
      "first_name": "Jane",
      "last_name": "Smith",
      "date_of_birth": "2006-08-20",
      "gender": "Female",
      "student_mobile": "9876543220",
      "student_email": "jane.smith@example.com",
      "father_name": "Michael Smith",
      "father_mobile": "9876543221",
      "mother_name": "Sarah Smith",
      "mother_mobile": "9876543222",
      "program_id": "880e8400-e29b-41d4-a716-446655440003",
      "tenth_marks": 94,
      "twelfth_marks": 90.5,
      "reference_type": "Website",
      "created_at": "2024-03-15T00:00:00Z",
      "updated_at": "2024-03-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
Error Responses
Status	Error Code	Description
401	
UNAUTHORIZED
API key is required in Authorization header
401	
INVALID_API_KEY
Invalid API key
401	
EXPIRED_API_KEY
API key has expired
403	
FORBIDDEN
API key does not have read permission
500	
INTERNAL_SERVER_ERROR
Internal server error
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const response = await fetch('https://www.jkkn.ai/api/api-management/learners/enquiries?page=1&limit=50&enquiry_date_from=2024-01-01&enquiry_date_to=2024-12-31&expand=program', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of enquiries
console.log(data.pagination); // Pagination info
AI Usage Examples
3 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the learners API.


Analyze Enquiry Trends by Month
analysis
intermediate

Generate Follow-up List for Enquiries
automation
beginner

Compare Enquiry Sources
analysis
intermediate
Important Notes
•
Enquiries represent prospective students who have shown interest but not yet enrolled
•
Date filters (enquiry_date_from, enquiry_date_to) must be in YYYY-MM-DD format
•
Use expand=program to include program details in the response
•
Results are ordered by enquiry_date in descending order (newest first)
GET
/api/api-management/learners/enquiries/[id]
enquiries
by-id
Get Enquiry by ID
Retrieve detailed information about a specific enquiry using its unique identifier.


Bearer Token
Required
API key required in Authorization header. Generate your API key from the API Management dashboard.

Header Name
Authorization
Required Scopes
read
Example Header
Bash

Copy
Authorization: Bearer your_api_key_here
Path Parameters
Name	Type	Required	Description	Example
id	string	Required	Unique UUID of the enquiry	ee0e8400-e29b-41d4-a716-446655440009
Query Parameters
Name	Type	Required	Description	Example
expand	string	Optional	Comma-separated list of related data to include (e.g., program,semester,section)	program,semester,section
Success Responses

200
Successfully retrieved enquiry
200
Successfully retrieved enquiry
Content-Type: json
Example Response
JSON

Copy
{
  "id": "ee0e8400-e29b-41d4-a716-446655440009",
  "enquiry_date": "2024-03-15",
  "first_name": "Jane",
  "last_name": "Smith",
  "date_of_birth": "2006-08-20",
  "gender": "Female",
  "student_mobile": "9876543220",
  "student_email": "jane.smith@example.com",
  "father_name": "Michael Smith",
  "father_mobile": "9876543221",
  "mother_name": "Sarah Smith",
  "mother_mobile": "9876543222",
  "program_id": "880e8400-e29b-41d4-a716-446655440003",
  "tenth_marks": 94,
  "twelfth_marks": 90.5,
  "reference_type": "Website",
  "reference_name": "JKKN Website",
  "reference_contact": null,
  "created_at": "2024-03-15T00:00:00Z",
  "updated_at": "2024-03-15T00:00:00Z"
}
Error Responses
Status	Error Code	Description
401	
UNAUTHORIZED
API key is required in Authorization header
401	
INVALID_API_KEY
Invalid API key
401	
EXPIRED_API_KEY
API key has expired
403	
FORBIDDEN
API key does not have read permission
500	
INTERNAL_SERVER_ERROR
Internal server error
404	
NOT_FOUND
Enquiry not found
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const enquiryId = 'ee0e8400-e29b-41d4-a716-446655440009';
const response = await fetch(`https://www.jkkn.ai/api/api-management/learners/enquiries/${enquiryId}?expand=program`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const enquiry = await response.json();
console.log(enquiry);
AI Usage Examples
1 Prompt
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the learners API.


Get Enquiry Details for Follow-up
data-retrieval
beginner
Important Notes
•
Use expand=program to include program details in the response
•
Enquiry data includes prospective student contact and academic information
Related Endpoints
learners-enquiries-list
GET
/api/api-management/learners/alumni
alumni
pagination
filtering
List Alumni
Retrieve a paginated list of alumni and graduated learners with optional filtering by program and admission year.


Bearer Token
Required
API key required in Authorization header. Generate your API key from the API Management dashboard.

Header Name
Authorization
Required Scopes
read
Example Header
Bash

Copy
Authorization: Bearer your_api_key_here
Query Parameters
Name	Type	Required	Description	Example
page	number	Optional	Page number for pagination
Default: 1
1
limit	number	Optional	Number of items per page (max 200)
Default: 50
Max: 200
50
program_id	string	Optional	Filter by program UUID	880e8400-e29b-41d4-a716-446655440003
admission_year	number	Optional	Filter by admission year (e.g., 2020)	2020
expand	string	Optional	Comma-separated list of related data to include (e.g., program,semester,section)	program,semester,section
Success Responses

200
Successfully retrieved alumni
200
Successfully retrieved alumni
Content-Type: json
Example Response
JSON

Copy
{
  "count": 180,
  "data": [
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440010",
      "lifecycle_status": "alumni",
      "first_name": "Alice",
      "last_name": "Johnson",
      "date_of_birth": "2002-03-10",
      "gender": "Female",
      "student_mobile": "9876543230",
      "student_email": "alice.johnson@alumni.jkkn.ac.in",
      "roll_number": "CS2020001",
      "register_number": "711618104001",
      "program_id": "880e8400-e29b-41d4-a716-446655440003",
      "admission_year": 2020,
      "is_profile_complete": true,
      "created_at": "2020-09-01T00:00:00Z",
      "updated_at": "2024-05-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 180,
    "totalPages": 4
  }
}
Error Responses
Status	Error Code	Description
401	
UNAUTHORIZED
API key is required in Authorization header
401	
INVALID_API_KEY
Invalid API key
401	
EXPIRED_API_KEY
API key has expired
403	
FORBIDDEN
API key does not have read permission
500	
INTERNAL_SERVER_ERROR
Internal server error
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const response = await fetch('https://www.jkkn.ai/api/api-management/learners/alumni?page=1&limit=50&admission_year=2020&expand=program,semester', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of alumni
console.log(data.pagination); // Pagination info
AI Usage Examples
3 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the learners API.


Generate Alumni Directory by Batch
data-retrieval
beginner

Analyze Alumni Demographics
analysis
intermediate

Create Alumni Mailing List
automation
beginner
Important Notes
•
Alumni are learners with lifecycle_status = "alumni"
•
Graduated learners who have completed their programs
•
Use admission_year to filter by specific batches
•
The expand parameter supports: program, semester
•
Results are ordered by updated_at in descending order

