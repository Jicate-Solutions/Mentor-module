Organizations API
The Organizations API module provides comprehensive access to institutional data including institutions, departments, degrees, programs, courses, semesters, and sections. All endpoints require API key authentication and support pagination, filtering, and search capabilities.

Base URL:
https://www.jkkn.ai
Authentication
All Organizations API endpoints require Bearer token authentication using an API key. Generate your API key from the API Management dashboard and include it in the Authorization header of every request.

Important Information
•
All list endpoints support pagination with page and limit query parameters
•
Search parameters perform case-insensitive matching using PostgreSQL ILIKE
•
Results are ordered by created_at in descending order (newest first) unless specified otherwise
•
All endpoints return standard error responses (401, 403, 500) as documented
•
New fields display_name and order fields (degree_order, department_order) are now available for degrees and departments
•
The courses endpoint uses a different response format with "count" and "pagination" instead of "metadata"
•
Rate limiting may apply based on your API key configuration
Search endpoints by title, description, path, or tags...
Filter by category:
All (15)
Courses (2)
Degrees (2)
Departments (2)
Institutions (3)
Programs (2)
Sections (2)
Semesters (2)
Showing 15 of 15 endpoints
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
List All Institutions
/api/api-management/organizations/institutions
GET
Get Institution by ID
/api/api-management/organizations/institutions/[id]
GET
Get Institution Names (Lightweight)
/api/api-management/organizations/institutions/names
GET
List All Departments
/api/api-management/organizations/departments
GET
Get Department by ID
/api/api-management/organizations/departments/[id]
GET
List All Degrees
/api/api-management/organizations/degrees
GET
Get Degree by ID
/api/api-management/organizations/degrees/[id]
GET
List All Programs
/api/api-management/organizations/programs
GET
Get Program by ID
/api/api-management/organizations/programs/[id]
GET
List All Courses
/api/api-management/organizations/courses
GET
Get Course by ID
/api/api-management/organizations/courses/[id]
GET
List All Semesters
/api/api-management/organizations/semesters
GET
Get Semester by ID
/api/api-management/organizations/semesters/[id]
GET
List All Sections
/api/api-management/organizations/sections
GET
Get Section by ID
/api/api-management/organizations/sections/[id]
GET
/api/api-management/organizations/institutions
institutions
pagination
search
List All Institutions
Retrieve a paginated list of all institutions with optional filtering by search term and active status.


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
limit	number	Optional	Number of items per page
Default: 10
10
search	string	Optional	Search by name or code (case-insensitive)	engineering
isActive	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved institutions
200
Successfully retrieved institutions
Content-Type: json
Example Response
JSON

Copy
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "JKKN College of Engineering",
      "counselling_code": "JKKN001",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "metadata": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
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
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/institutions?page=1&limit=10&search=engineering', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of institutions
console.log(data.metadata); // Pagination info
AI Usage Examples
2 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get All Active Institutions
data-retrieval
beginner

Analyze Institution Distribution
analysis
intermediate
Important Notes
•
The search parameter performs case-insensitive matching on both name and counselling_code fields
•
Results are ordered by created_at in descending order (newest first)
•
Maximum limit per page is determined by server configuration
GET
/api/api-management/organizations/institutions/[id]
institutions
by-id
Get Institution by ID
Retrieve detailed information about a specific institution using its unique identifier.


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
id	string	Required	Unique UUID of the institution	550e8400-e29b-41d4-a716-446655440000
Success Responses

200
Successfully retrieved institution
200
Successfully retrieved institution
Content-Type: json
Example Response
JSON

Copy
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "JKKN College of Engineering",
  "counselling_code": "JKKN001",
  "is_active": true,
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
Institution not found
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const institutionId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`https://www.jkkn.ai/api/api-management/organizations/institutions/${institutionId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const institution = await response.json();
console.log(institution);
AI Usage Examples
1 Prompt
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get Institution Details
data-retrieval
beginner
Related Endpoints
organizations-institutions-list
GET
/api/api-management/organizations/institutions/names
institutions
lightweight
dropdown
Get Institution Names (Lightweight)
Retrieve a lightweight list of institution IDs and names, optimized for dropdowns and selection lists.


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
isActive	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved institution names
200
Successfully retrieved institution names
Content-Type: json
Example Response
JSON

Copy
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "JKKN College of Engineering"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "JKKN Dental College"
  }
]
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
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/institutions/names?isActive=true', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const institutions = await response.json();
// Use for dropdown options
const options = institutions.map(inst => ({
  value: inst.id,
  label: inst.name
}));
AI Usage Examples
1 Prompt
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Populate Institution Dropdown
integration
beginner
Important Notes
•
This endpoint is optimized for UI components like dropdowns and select lists
•
Returns only id and name fields to minimize payload size
•
No pagination - returns all matching institutions
Related Endpoints
organizations-institutions-list
GET
/api/api-management/organizations/departments
departments
pagination
search
filtering
List All Departments
Retrieve a paginated list of all departments with optional filtering by search term, institution, and active status. Includes new display_name and department_order fields.


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
limit	number	Optional	Number of items per page
Default: 10
10
search	string	Optional	Search by name or code (case-insensitive)	engineering
institution_id	string	Optional	Filter by institution UUID	550e8400-e29b-41d4-a716-446655440000
isActive	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved departments
200
Successfully retrieved departments
Content-Type: json
Example Response
JSON

Copy
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "institution_id": "660e8400-e29b-41d4-a716-446655440001",
      "degree_id": "770e8400-e29b-41d4-a716-446655440002",
      "department_code": "CS",
      "department_name": "Computer Science",
      "display_name": "Department of Computer Science & Engineering",
      "department_order": 1,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "institution": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "JKKN College of Engineering",
        "counselling_code": "JKKN001"
      },
      "degree": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "degree_id": "BTECH",
        "degree_name": "Bachelor of Technology"
      }
    }
  ],
  "metadata": {
    "total": 50,
    "page": 1,
    "limit": 10,
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
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/departments?page=1&limit=10&institution_id=660e8400-e29b-41d4-a716-446655440001', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of departments
console.log(data.metadata); // Pagination info
AI Usage Examples
2 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get Departments for Institution
data-retrieval
beginner

Sort Departments by Custom Order
analysis
intermediate
Important Notes
•
New fields: display_name allows for longer, more descriptive department names (e.g., "Department of Computer Science & Engineering")
•
New fields: department_order enables custom sorting of departments independent of alphabetical order
•
The search parameter matches department_code and department_name fields
•
Results include nested institution and degree details
GET
/api/api-management/organizations/departments/[id]
departments
by-id
Get Department by ID
Retrieve detailed information about a specific department using its unique identifier.


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
id	string	Required	Unique UUID of the department	550e8400-e29b-41d4-a716-446655440000
Success Responses

200
Successfully retrieved department
200
Successfully retrieved department
Content-Type: json
Example Response
JSON

Copy
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "institution_id": "660e8400-e29b-41d4-a716-446655440001",
  "degree_id": "770e8400-e29b-41d4-a716-446655440002",
  "department_code": "CS",
  "department_name": "Computer Science",
  "display_name": "Department of Computer Science & Engineering",
  "department_order": 1,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "institution": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "JKKN College of Engineering",
    "counselling_code": "JKKN001"
  },
  "degree": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "degree_id": "BTECH",
    "degree_name": "Bachelor of Technology"
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
404	
NOT_FOUND
Department not found
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const departmentId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`https://www.jkkn.ai/api/api-management/organizations/departments/${departmentId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const department = await response.json();
console.log(department);
AI Usage Examples
1 Prompt
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get Department Details with Relations
data-retrieval
beginner
Related Endpoints
organizations-departments-list
GET
/api/api-management/organizations/degrees
degrees
pagination
search
filtering
List All Degrees
Retrieve a paginated list of all degrees with optional filtering by search term, institution, degree type, and active status. Includes new display_name and degree_order fields.


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
limit	number	Optional	Number of items per page
Default: 10
10
search	string	Optional	Search by name or code (case-insensitive)	engineering
institution_id	string	Optional	Filter by institution UUID	550e8400-e29b-41d4-a716-446655440000
degree_type	string	Optional	Filter by degree type (ug, pg, etc.)
Values: ugpg
ug
isActive	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved degrees
200
Successfully retrieved degrees
Content-Type: json
Example Response
JSON

Copy
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "institution_id": "660e8400-e29b-41d4-a716-446655440001",
      "degree_id": "BTECH",
      "degree_name": "Bachelor of Technology",
      "degree_type": "ug",
      "display_name": "Bachelor of Technology (Engineering)",
      "degree_order": 1,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "institution": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "JKKN College of Engineering",
        "counselling_code": "JKKN001"
      }
    }
  ],
  "metadata": {
    "total": 30,
    "page": 1,
    "limit": 10,
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
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/degrees?page=1&limit=10&degree_type=ug', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of degrees
AI Usage Examples
2 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get All Undergraduate Degrees
data-retrieval
beginner

Compare Degree Types Across Institutions
analysis
intermediate
Important Notes
•
New fields: display_name allows for longer, more descriptive degree names
•
New fields: degree_order enables custom sorting of degrees
•
degree_type accepts "ug" (undergraduate) or "pg" (postgraduate) values
•
Search parameter matches both degree_id and degree_name fields
GET
/api/api-management/organizations/degrees/[id]
degrees
by-id
Get Degree by ID
Retrieve detailed information about a specific degree using its unique identifier.


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
id	string	Required	Unique UUID of the degree	770e8400-e29b-41d4-a716-446655440002
Success Responses

200
Successfully retrieved degree
200
Successfully retrieved degree
Content-Type: json
Example Response
JSON

Copy
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "institution_id": "660e8400-e29b-41d4-a716-446655440001",
  "degree_id": "BTECH",
  "degree_name": "Bachelor of Technology",
  "degree_type": "ug",
  "display_name": "Bachelor of Technology (Engineering)",
  "degree_order": 1,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "institution": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "JKKN College of Engineering",
    "counselling_code": "JKKN001"
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
404	
NOT_FOUND
Degree not found
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const degreeId = '770e8400-e29b-41d4-a716-446655440002';
const response = await fetch(`https://www.jkkn.ai/api/api-management/organizations/degrees/${degreeId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const degree = await response.json();
console.log(degree);
AI Usage Examples
1 Prompt
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get Degree with Institution Info
data-retrieval
beginner
Related Endpoints
organizations-degrees-list
GET
/api/api-management/organizations/programs
programs
pagination
search
filtering
List All Programs
Retrieve a paginated list of all programs with optional filtering by search term, institution, degree, department, and active status.


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
limit	number	Optional	Number of items per page
Default: 10
10
search	string	Optional	Search by name or code (case-insensitive)	engineering
institution_id	string	Optional	Filter by institution UUID	550e8400-e29b-41d4-a716-446655440000
degree_id	string	Optional	Filter by degree UUID	770e8400-e29b-41d4-a716-446655440002
department_id	string	Optional	Filter by department UUID	550e8400-e29b-41d4-a716-446655440000
isActive	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved programs
200
Successfully retrieved programs
Content-Type: json
Example Response
JSON

Copy
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "institution_id": "660e8400-e29b-41d4-a716-446655440001",
      "degree_id": "770e8400-e29b-41d4-a716-446655440002",
      "department_id": "550e8400-e29b-41d4-a716-446655440000",
      "program_id": "BTECH-CS",
      "program_name": "B.Tech Computer Science",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "institution": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "JKKN College of Engineering",
        "counselling_code": "JKKN001"
      },
      "degree": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "degree_id": "BTECH",
        "degree_name": "Bachelor of Technology"
      },
      "department": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "department_code": "CS",
        "department_name": "Computer Science"
      }
    }
  ],
  "metadata": {
    "total": 40,
    "page": 1,
    "limit": 10,
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
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/programs?page=1&limit=10&department_id=550e8400-e29b-41d4-a716-446655440000', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of programs
AI Usage Examples
2 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get Programs by Department
data-retrieval
beginner

Analyze Program Distribution
analysis
intermediate
Important Notes
•
Programs represent the combination of degree, department, and institution
•
Results include nested details for institution, degree, and department
•
Search parameter matches both program_id and program_name fields
GET
/api/api-management/organizations/programs/[id]
programs
by-id
Get Program by ID
Retrieve detailed information about a specific program using its unique identifier.


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
id	string	Required	Unique UUID of the program	880e8400-e29b-41d4-a716-446655440003
Success Responses

200
Successfully retrieved program
200
Successfully retrieved program
Content-Type: json
Example Response
JSON

Copy
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "institution_id": "660e8400-e29b-41d4-a716-446655440001",
  "degree_id": "770e8400-e29b-41d4-a716-446655440002",
  "department_id": "550e8400-e29b-41d4-a716-446655440000",
  "program_id": "BTECH-CS",
  "program_name": "B.Tech Computer Science",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "institution": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "JKKN College of Engineering",
    "counselling_code": "JKKN001"
  },
  "degree": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "degree_id": "BTECH",
    "degree_name": "Bachelor of Technology"
  },
  "department": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "department_code": "CS",
    "department_name": "Computer Science"
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
404	
NOT_FOUND
Program not found
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const programId = '880e8400-e29b-41d4-a716-446655440003';
const response = await fetch(`https://www.jkkn.ai/api/api-management/organizations/programs/${programId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const program = await response.json();
console.log(program);
AI Usage Examples
1 Prompt
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get Complete Program Hierarchy
data-retrieval
beginner
Related Endpoints
organizations-programs-list
GET
/api/api-management/organizations/courses
courses
pagination
filtering
List All Courses
Retrieve a paginated list of all courses with optional filtering by active status. Note: This endpoint uses a different response format with "count" and "pagination" fields instead of "metadata".


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
is_active	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved courses
200
Successfully retrieved courses
Content-Type: json
Example Response
JSON

Copy
{
  "count": 120,
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "course_code": "CS101",
      "course_name": "Introduction to Programming",
      "credits": 4,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
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
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/courses?page=1&limit=50&is_active=true', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(result.data); // Array of courses
console.log(result.pagination); // Pagination info
console.log(result.count); // Total count
AI Usage Examples
2 Prompts
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get All Active Courses
data-retrieval
beginner

Calculate Total Credits
analysis
intermediate
Important Notes
•
This endpoint uses a different response format: "count" and "pagination" instead of "metadata"
•
Default limit is 50 items per page (higher than other endpoints)
•
Maximum limit is capped at 200 items per page
•
Results are ordered by created_at in descending order
GET
/api/api-management/organizations/courses/[id]
courses
by-id
Get Course by ID
Retrieve detailed information about a specific course using its unique identifier.


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
id	string	Required	Unique UUID of the course	990e8400-e29b-41d4-a716-446655440004
Success Responses

200
Successfully retrieved course
200
Successfully retrieved course
Content-Type: json
Example Response
JSON

Copy
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "course_code": "CS101",
  "course_name": "Introduction to Programming",
  "credits": 4,
  "is_active": true,
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
Course not found
Code Examples
JavaScript (Fetch)
cURL
Python (Requests)
JavaScript

Copy
const courseId = '990e8400-e29b-41d4-a716-446655440004';
const response = await fetch(`https://www.jkkn.ai/api/api-management/organizations/courses/${courseId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const course = await response.json();
console.log(course);
AI Usage Examples
1 Prompt
Use these prompts with AI assistants like Claude, ChatGPT, or Copilot to interact with the organizations API.


Get Course Details
data-retrieval
beginner
Related Endpoints
organizations-courses-list
GET
/api/api-management/organizations/semesters
semesters
pagination
List All Semesters
Retrieve a paginated list of all semesters with optional filtering.


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
limit	number	Optional	Number of items per page
Default: 10
10
institution_id	string	Optional	Filter by institution UUID	550e8400-e29b-41d4-a716-446655440000
isActive	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved semesters
200
Successfully retrieved semesters
Content-Type: json
Example Response
JSON

Copy
{
  "data": [],
  "metadata": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
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
JavaScript

Copy
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/semesters?page=1&limit=10', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data);
Important Notes
•
This endpoint is available but specific response schema may vary based on implementation
GET
/api/api-management/organizations/semesters/[id]
semesters
by-id
Get Semester by ID
Retrieve detailed information about a specific semester.


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
id	string	Required	Unique UUID of the semester	aa0e8400-e29b-41d4-a716-446655440005
Success Responses

200
Successfully retrieved semester
200
Successfully retrieved semester
Content-Type: json
Example Response
JSON

Copy
{}
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
JavaScript

Copy
const semesterId = 'aa0e8400-e29b-41d4-a716-446655440005';
const response = await fetch(`https://www.jkkn.ai/api/api-management/organizations/semesters/${semesterId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const semester = await response.json();
console.log(semester);
Related Endpoints
organizations-semesters-list
GET
/api/api-management/organizations/sections
sections
pagination
List All Sections
Retrieve a paginated list of all sections with optional filtering.


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
limit	number	Optional	Number of items per page
Default: 10
10
institution_id	string	Optional	Filter by institution UUID	550e8400-e29b-41d4-a716-446655440000
isActive	boolean	Optional	Filter by active status	true
Success Responses

200
Successfully retrieved sections
200
Successfully retrieved sections
Content-Type: json
Example Response
JSON

Copy
{
  "data": [],
  "metadata": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
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
JavaScript

Copy
const response = await fetch('https://www.jkkn.ai/api/api-management/organizations/sections?page=1&limit=10', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data);
Important Notes
•
This endpoint is available but specific response schema may vary based on implementation
GET
/api/api-management/organizations/sections/[id]
sections
by-id
Get Section by ID
Retrieve detailed information about a specific section.


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
id	string	Required	Unique UUID of the section	bb0e8400-e29b-41d4-a716-446655440006
Success Responses

200
Successfully retrieved section
200
Successfully retrieved section
Content-Type: json
Example Response
JSON

Copy
{}
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
JavaScript

Copy
const sectionId = 'bb0e8400-e29b-41d4-a716-446655440006';
const response = await fetch(`https://www.jkkn.ai/api/api-management/organizations/sections/${sectionId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const section = await response.json();
console.log(section);
Related Endpoints
organizations-sections-list