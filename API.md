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
    },...
]
```

### Search tool by id
`GET`, /inventory/tools/search

Request: ?id={INT}
Success Response : Status `200` and JSON:
```
[
    {
        "tool_id": {INT},
        "name": {STRING},
        "status": {STRING} in {"Available", "Rented", "Overdue"}
    },...
]
```

### Search tool by name
`GET`, /inventory/tools/searchname

Request: ?name={STRING}
Success Response : Status `200` and JSON:
```
[
    {
        "tool_id": {INT},
        "name": {STRING},
        "status": {STRING} in {"Available", "Rented", "Overdue"}
    },...
]
```

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




