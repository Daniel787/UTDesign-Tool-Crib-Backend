# API

# Table of Contents
1. [Parts](#parts)
    * [View all parts](#view-all-parts)
    * [Search parts](#search-parts)
    * [Insert part](#insert-part)
    * [Upload sheet of parts](#upload-parts-sheet)
    * [Buy a cart of parts](#buy-parts)
    * [Modify a single part](#modify-part)
2. [Tools](#tools)
    * [View all tools](#view-all-tools)
    * [Search tools](#search-tools)
    * [Insert tool](#insert-tool)
    * [Upload a sheet of tools](#upload-tools-sheet)
    * [Rent a cart of tools](#rent-tools)
    * [Modify a single tool](#modify-tool)
3. [Expense](#expense)
    * [Generate a simple report](#simple)
    * [Generate a medium report](#medium)
    * [Generate a full report](#full)
3. [Groups and Students](#studentsgroups)
    * [View all students and their groups](#view-all-sg)
    * [Search students](#search-students)
    * [View all groups and their students](#view-all-gs)
    * [Search groups](#search-groups)
    * [Insert a single group](#insert-group)
    * [Insert a single student](#insert-student)
    * [Add a student to a group](#add-to-group)
    * [Delete a student to a group](#drop-from-group)
    * [Upload a sheet of students and groups](#upload-gs-sheet)

<a name="parts"></a>
## Parts (Available for purchase)
<a name="view-all-parts"></a>
### View all inventory parts
`GET`, /inventory/parts

Request: no parameters

Success Response : Status `200` and JSON:
```
[
    {
        "part_id": {INT},
        "name": {STRING},
        "quantity_available": {INT},
        "current_cost": {DECIMAL}
    },...
]
```

<a name="search-parts"></a>
### Search part by id or name
`GET`, /inventory/parts/search

Request: ?part_id={INT} or ?name={STRING}

Success Response : Status `200` and JSON:
```
[
    {
        "part_id": {INT},
        "name": {STRING},
        "quantity_available": {INT},
        "current_cost": {DECIMAL}
    },...
]
```
Note that the JSON is always an array, whether zero, one, or many tools match the search criteria.
Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING\_PARAMS' if no correct parameter is given

<a name="insert-part"></a>
### Insert one part
`POST`, /inventory/parts/insert

Request: JSON:
```
{ 
    "part_id" : {INT},
    "name" : {STRING},
    "quantity_available" : {INT},
    "current_cost" : {DECIMAL}
} 
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'ER\_DUP\_ENTRY' when part_id is not unique
* 'NEGATIVE_QUANTITY'
* 'NEGATIVE_COST'

<a name="upload-parts-sheet"></a>
### Upload a sheet of parts
`POST`, /inventory/parts/upload

Request: JSON:
```
[
{"part_id": {INT},"name":{STRING},"current_cost":{DECIMAL},"quantity_available":{INT}},
{"part_id": {INT},"name":{STRING},"current_cost":{DECIMAL},"quantity_available":{INT}},
]
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
{
    "conflictinserts": {
        "old": [
            {
                "part_id": {INT},
                "name": {STRING},
                "quantity_available": {INT},
                "current_cost:": {DECIMAL}
            }
        ],
        "new": [
            {
                "part_id": {INT},
                "name": {STRING},
                "quantity_available": {INT},
                "current_cost:": {DECIMAL}
            }
        ]
    },
    "failedinserts": [
        {
            "part_id": {INT},
            "name": {STRING},
            "quantity_available": {INT},
            "current_cost:": {DECIMAL}
        }
    ],
    "numtotal": {INT},
    "numduplicate": {INT},
    "numsuccess": {INT},
    "numfailed": {INT}
}
```
<a name="buy-parts"></a>
### Buy a cart of parts
`POST`, /inventory/parts/buy

Request: JSON:
```
{
  "customer": {
  "net_id": {STRING},
  "group_id": {INT}
  },
  
  "cart": 
  [
    {
      "item": {
        "part_id": {INT},
        "current_cost": {DECIMAL}
      },
      "quantity": {INT},
      "total": {DECIMAL}
    },...
  ]
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
[
    {
        "part_id": {INT},
        "cost_matches": {1 if database cost matches cart cost, 0 if error},
        "enough_stock": {1 if quantity available in stock is sufficient, 0 if error}
    },...
]
```
or Status `500` Internal Server Error and errcode in response

<a name="modify-part"></a>
### Change a single item
`POST`, /inventory/parts/modify/

Request: JSON:
```
{
  "part_id": {INT},
  "name": {STRING},
  "new_cost": {DECIMAL},
  "new_quantity": {INT}
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'INVALID_ID' when the part to be modified does not exist

or Status `500` Internal Server Error and errcode in response

<a name="tools"></a>
## Tools (Available for rent)

<a name="view-all-tools"></a>
### View all tools with status
`GET`, /inventory/tools
Request: no parameters
Success Response : Status `200` and JSON:
```
[
    {
        "tool_id": {INT},
        "name": {STRING},
        "status": {STRING} in {"Available", "Rented", "Overdue", "Deleted"}
        "group_id": {INT},
        "net_id": {STRING},
        "checkout_date": ex."2021-02-14 04:01:00.000",
        "due_date":      ex."2021-02-14 06:05:00.000"
    },...
]
```
For status == "Available", all columns afterwards have null value.
<a name="search-tools"></a>
### Search tool by id or name
`GET`, /inventory/tools/search

Request: ?tool_id={INT} or ?name={STRING}

Success Response : Status `200` and JSON:
```
[
    {
        "tool_id": {INT},
        "name": {STRING},
        "status": {STRING} in {"Available", "Rented", "Overdue", "Deleted"}
        "group_id": {INT},
        "net_id": {STRING},
        "checkout_date": ex."2021-02-14 04:01:00.000",
        "due_date":      ex."2021-02-14 06:05:00.000"
    },...
]
```
For status == "Available" or "Deleted", all columns afterwards have null value.
Note that searching tool_id "333" will also search for "-333" to find lazy-deleted tools.
Note that the JSON is always an array, whether zero, one or many tools match the search criteria.

Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING\_PARAMS' if no correct parameter is given

<a name="insert-tool"></a>
### Insert one tool
`POST`, /inventory/tools/insert

Request: JSON:
```
{
    "tool_id": {INT},
    "name": {STRING}
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'ER\_DUP\_ENTRY' when tool_id is not unique

<a name="upload-tools-sheet"></a>
### Upload a sheet of tools
`POST`, /inventory/tools/upload

Request: JSON:
```
[
{"tool_id": {INT},"name":{STRING}},
{"tool_id": {INT},"name":{STRING}}
]
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
{
    "conflictinserts": {
        "old": [
            {
                "tool_id": {INT},
                "name": {STRING},
            }
        ],
        "new": [
            {
                "tool_id": {INT},
                "name": {STRING},
            }
        ]
    },
    "failedinserts": [
        {
            "tool_id": {INT},
            "name": {STRING},
        }
    ],
    "numtotal": {INT},
    "numduplicate": {INT},
    "numsuccess": {INT},
    "numfailed": {INT}
}
```

<a name="rent-tools"></a>
### Rent a cart of tools
`POST`, /inventory/tools/rent/

Request: JSON:
```
{
  "customer": {
  "net_id": {STRING},
  "group_id": {INT}
  },
  
  "cart": 
  [
    {
      "item": {
        "tool_id": {INT},
        "tool_name": {STRING}
      }
    },...
  ]
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'STUDENT_HOLD' when the student renting has a hold
* 'PART_ALREADY_OUT' when the tool is rented out already
* 'UNKNOWN_RENTAL_ERROR' when some error prevents the rental
* 'NO_EMAIL' when the student's email is NULL

or Status `500` Internal Server Error and errcode in response

<a name="modify-tool"></a>
### Change a single item
`POST`, /inventory/tools/modify/

Request: JSON:
```
{
  "tool_id": {INT},
  "name": {STRING}"
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'INVALID_ID' when the tool to be modified does not exist

or Status `500` Internal Server Error and errcode in response

<a name="expense"></a>
## Expense
<a name="simple"></a>
### Get simple expense report
`GET`, /expense/simple

Request: 
?start={STRING} as YYYYMMDD
&end={STRING} as YYYYMMDD

Optional:
&csv={STRING} as "true"

Success Response : Status `200` and JSON:
```
[
    {
        "group_id": {INT},
        "total": {DECIMAL} dollars of spending in date range (INCLUSIVE)
    },...
]
```
OR
CSV file with name "YYYYMMDD-YYYYMMDD_simple_report.csv"

Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING_PARAMS' when start or end date missing

<a name="medium"></a>
### Get medium detail expense report
`GET`, /expense/medium

Request: 
?start={STRING} as YYYYMMDD
&end={STRING} as YYYYMMDD

Optional:
&csv={STRING} as "true"

Success Response : Status `200` and JSON:
```
[
    {
        "group_id": {INT},
        "total": {DECIMAL} dollars of group spending in date range (INCLUSIVE),
        "net_id": {STRING},
        "student_total": {DECIMAL} dollars of student spending in date range (INCLUSIVE)
    },...
]
```
OR
CSV file with name "YYYYMMDD-YYYYMMDD_medium_report.csv"

Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING_PARAMS' when start or end date missing

<a name="full"></a>
### Get full detail expense report
`GET`, /expense/full

Request: 
?start={STRING} as YYYYMMDD
&end={STRING} as YYYYMMDD

Optional:
&csv={STRING} as "true"

Success Response : Status `200` and JSON:
```
[
    {
        "group_id": {INT},
        "total": {DECIMAL} dollars of group spending in date range (INCLUSIVE),
        "net_id": {STRING},
        "student_total": {DECIMAL} dollars of student spending in date range (INCLUSIVE),
        "part_id": {INT},
        "quantity_purchased*cost_per_unit": {DECIMAL}},
        "quantity_purchased": {INT},
        "cost_per_unit": {DECIMAL},
        "date": ex"2021-02-02 02:02:02.002"
    }
    },...
]
```
OR
CSV file with name "YYYYMMDD-YYYYMMDD_full_report.csv"

Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING_PARAMS' when start or end date missing

<a name="studentsgroups"></a>
## Students and Groups
<a name="view-all-sg"></a>
### Get a list of students and what group(s) they are in
`GET`, /student/withgroups

Request: none

Optional:
?json={STRING} as "true"

Success Response ?json="true": Status `200` and JSON:
```
[
    {
        "student": {
            "hold": {INT} 0 or 1,
            "name": {STRING},
            "email": {STRING},
            "groups": [
                {
                    "group_id": {INT},
                    "group_name": {STRING},
                    "group_sponsor": {STRING}
                },...
            ],
            "net_id": {STRING},
            "utd_id": {INT}
        }
    },...
]
```
OR
CSV version without ?json="true"

<a name="search-students"></a>
### Get a list of students matching search criteria and what group(s) they are in
`GET`, /student/withgroups/search

Request: ?net_id={STRING} or ?name={STRING}


Optional:
?json={STRING} as "true"


Success Response ?json="true": Status `200` and JSON:
```
[
    {
        "student": {
            "hold": {INT} 0 or 1,
            "name": {STRING},
            "email": {STRING},
            "groups": [
                {
                    "group_id": {INT},
                    "group_name": {STRING},
                    "group_sponsor": {STRING}
                },...
            ],
            "net_id": {STRING},
            "utd_id": {INT}
        }
    },...
]
```
OR
CSV version without ?json="true"

Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING\_PARAMS' when missing net\_id or name  

<a name="view-all-gs"></a>
### Get a list of groups and what student(s)/member(s) they have
`GET`, /groups/withmembers

Request: none

Optional:
?json={STRING} as "true"

Success Response ?json="true": Status `200` and JSON:
```
[
    {
        "group": {
            "group_id": {INT},
            "students": [
                {
                    "hold": {INT} 0 or 1,
                    "name": {STRING},
                    "email": {STRING},
                    "net_id": {STRING},
                    "utd_id": {INT}
                },...
            ],
            "group_name": {STRING},
            "group_sponsor": {STRING}
        }
    },...
]
```
OR
CSV version without ?json="true"

<a name="search-groups"></a>
### Get a list of groups matching search criteria and what student(s)/member(s) they have
`GET`, /groups/withmembers/search

Request:  ?group_id={INT} or ?name={STRING}

Optional:
?json={STRING} as "true"

Success Response ?json="true": Status `200` and JSON:
```
[
    {
        "group": {
            "group_id": {INT},
            "students": [
                {
                    "hold": {INT} 0 or 1,
                    "name": {STRING},
                    "email": {STRING},
                    "net_id": {STRING},
                    "utd_id": {INT}
                },...
            ],
            "group_name": {STRING},
            "group_sponsor": {STRING}
        }
    },...
]
```
OR
CSV version without ?json="true"

Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING\_PARAMS' when missing group\_id or name 

<a name="insert-group"></a>
### Insert a single group
`POST`, /groups/insert

Request: JSON:
```
{
    "group_id":{INT},
    "group_name":{STRING},
    "group_sponsor":{STRING}
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
{
    "conflictinserts": {
        "old": [
            {
                "group_id":{INT},
                "group_name":{STRING},
                "group_sponsor":{STRING}
            }
        ],
        "new": [
            {
                "group_id":{INT},
                "group_name":{STRING},
                "group_sponsor":{STRING}
            }
        ]
    },
    "failedinserts": [
        {
            "group_id":{INT},
            "group_name":{STRING},
            "group_sponsor":{STRING}
        }
    ],
    "numtotal": {INT},
    "numduplicate": {INT},
    "numsuccess": {INT},
    "numfailed": {INT}
}
```

<a name="insert-student"></a>
### Insert a single student
`POST`, /student/insert

Request: JSON:
```
{
    "net_id":{STRING},
    "name":{STRING},
    "email":{STRING}
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
{
    "conflictinserts": {
        "old": [
            {
                "net_id":{STRING},
                "name":{STRING},
                "email":{STRING}
            }
        ],
        "new": [
            {
                "net_id":{STRING},
                "name":{STRING},
                "email":{STRING}
            }
        ]
    },
    "failedinserts": [
        {
            "net_id":{STRING},
            "name":{STRING},
            "email":{STRING}
        }
    ],
    "numtotal": {INT},
    "numduplicate": {INT},
    "numsuccess": {INT},
    "numfailed": {INT}
}
```

<a name="add-to-group"></a>
### Add a student to a group
`POST`, /groups/insertMember

Request: JSON:
```
{
    "net_id":{STRING},
    "group_id":{INT}
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'NONEXISTENT\_STUDENT' when missing net\_id
* 'NONEXISTENT\_GROUP' when missing group\_id
* 'SQL_ERROR' when some unknown SQL error occurs

<a name="drop-from-group"></a>
### Delete a student from a group
`POST`, /groups/deleteMember

Request: JSON:
```
{
    "net_id":{STRING},
    "group_id":{INT}
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'NONEXISTENT\_STUDENT' when missing net\_id
* 'NONEXISTENT\_GROUP' when missing group\_id
* 'NONEXISTENT\_PAIR' when missing group\_id, net\_id pair
* 'SQL_ERROR' when some unknown SQL error occurs

<a name="upload-gs-sheet""></a>
### Upload a sheet of Students and Groups
`POST`, /students/upload

Request: JSON:
```
{
    "groups": [
        {
            "group_id": {INT},
            "group_name": {STRING},
            "group_sponsor": {STRING},
            "students": [
                {
                    "net_id": {STRING},
                    "name": {STRING},
                    "email": {STRING}
                }
            ]
        }
    ]
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
{
    "conflictgroups": [
        {
            "group_id" : {INT},
            "group_name" :{STRING},
            "group_sponsor": {STRING}
        }
    ],
    "failedgroups": [
        {
            "group_id" : {INT},
            "group_name" :{STRING},
            "group_sponsor": {STRING}
        }
    ]
    "conflictinserts": {
        "old": [
            {
               "net_id": {STRING},
                "name": {STRING},
                "email": {STRING}
            }
        ],
        "new": [
            {
               "net_id": {STRING},
                "name": {STRING},
                "email": {STRING}
            }
        ]
    },
    "failedinserts": [
        {
            "net_id": {STRING},
            "name": {STRING},
            "email": {STRING}
        }
    ],
    "numtotal": {INT},
    "numduplicate": {INT},
    "numsuccess": {INT},
    "numfailed": {INT}
}
```