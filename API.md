# API
## Parts (Available for purchase)
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

### Search part by id or name
`GET`, /inventory/parts/search

Request: ?part_id={INT} or ?name={STRING}

Success Response : Status `200` and JSON:
```
[
    {
        "part_id": {},
        "name": {STRING},
        "quantity_available": {},
        "current_cost": {}
    },...
]
```
Note that the JSON is always an array, whether zero, one, or many tools match the search criteria.
Failure Response : Status `400` Bad Request and errcode in response:
* 'MISSING\_PARAMS' if no correct parameter is given

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

### Upload a sheet of parts
`POST`, /inventory/parts/upload

Request: JSON:
```
[
{"part_id": {},"name":{STRING},"current_cost":{},"quantity_available":{INT}},
{"part_id": {},"name":{STRING},"current_cost":{},"quantity_available":{INT}},
]
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
{
    "conflictinserts": {
        "old": [
            {
                "part_id": {},
                "name": {STRING},
                "quantity_available": {},
                "current_cost:": {}
            }
        ],
        "new": [
            {
                "part_id": {},
                "name": {STRING},
                "quantity_available": {},
                "current_cost:": {}
            }
        ]
    },
    "failedinserts": [
        {
            "part_id": {},
            "name": {STRING},
            "quantity_available": {},
            "current_cost:": {}
        }
    ]
}
```

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

### Change a single item
`POST`, /inventory/parts/modify/

Request: JSON:
```
{
  "part_id": 12345,
  "name": "Changed",
  "new_cost":7,
  "new_quantity":89
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'INVALID_ID' when the part to be modified does not exist

or Status `500` Internal Server Error and errcode in response



## Tools (Available for rent)
### View all tools with status
`GET`, /inventory/tools
Request: no parameters
Success Response : Status `200` and JSON:
```
[
    {
        "tool_id": {INT},
        "name": {STRING},
        "status": {STRING} in {"Available", "Rented", "Overdue"}
        "group_id": {INT},
        "net_id": {STRING},
        "checkout_date": ex."2021-02-14 04:01:00.000",
        "due_date":      ex."2021-02-14 06:05:00.000"
    },...
]
```
Note that "Deleted" tools are omitted from this list and must be searched for manually.
For status == "Available", all columns afterwards have null value.

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

### Upload a sheet of tools
`POST`, /inventory/tools/upload

Request: JSON:
```
[
{"part_id": {},"name":{STRING}},
{"part_id": {},"name":{STRING},"current_cost":{},"quantity_available":{INT}},
]
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and JSON in response:
```
{
    "conflictinserts": {
        "old": [
            {
                "part_id": {},
                "name": {STRING},
            }
        ],
        "new": [
            {
                "part_id": {},
                "name": {STRING},
            }
        ]
    },
    "failedinserts": [
        {
            "part_id": {},
            "name": {STRING},
        }
    ]
}
```

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

### Change a single item
`POST`, /inventory/tools/modify/

Request: JSON:
```
{
  "tool_id": {},
  "name": {STRING}"
}
```
Success Response : Status `200`

Failure Response : Status `400` Bad Request and errcode in response:
* 'INVALID_ID' when the tool to be modified does not exist

or Status `500` Internal Server Error and errcode in response


## Expense
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

## Students and Groups

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

### Upload a sheet of Students and Groups
`POST`, /students/upload

Request: JSON:
```

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
                "part_id": {},
                "name": {STRING},
                "quantity_available": {},
                "current_cost:": {}
            }
        ],
        "new": [
            {
                "part_id": {},
                "name": {STRING},
                "quantity_available": {},
                "current_cost:": {}
            }
        ]
    },
    "failedinserts": [
        {
            "part_id": {},
            "name": {STRING},
            "quantity_available": {},
            "current_cost:": {}
        }
    ]
}
```