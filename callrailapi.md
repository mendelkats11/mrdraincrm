Welcome to CallRail API v3
Welcome to the documentation for v3 of the CallRail API.

CallRail helps data-driven marketers measure the performance of their campaigns by providing multi-channel call attribution. These call analytics give users the insight they need to optimize their advertising campaigns, increase sales effectiveness, and improve customer retention.

The CallRail REST API provides a method to programmatically access and modify the data within your CallRail account. It is intended for developers and customers looking to integrate custom software directly with CallRail. Getting started is simple, and with this guide you can make your first API request in a matter of minutes!

Before continuing, you should create a CallRail account in order to create your API key so you can make API calls.
Terminology
CallRail has its own nomenclature that is used to describe our call tracking technology. This section is a brief glossary of terms that are useful in understanding our platform. For a more thorough overview of CallRail, check out the articles in the Getting Started section of our support site.

Dynamic Number Insertion (DNI) - CallRail can dynamically change the telephone number your website visitors see based on how they came to the site. When a visitor navigates to your website through one of the sources you’re tracking, CallRail’s JavaScript will detect the phone numbers on your web page and swap them with the correct tracking number. We’ll then store the visitor’s source in a cookie so they’ll continue to see the same tracking number each time they return to your website (unless our JavaScript is removed).

Source Tracker - Source trackers associate a single tracking number to a certain set of your customers based on how they found the number. For example, a single source tracker might be used to identify website visitors who came from facebook.com, who found your site from a paid Google search, or via an offline source such as a billboard or TV advertisement.

Keyword (Session) Tracker - Session trackers serve one number from a pool of tracking numbers to website visitors, allowing you to associate calls to individual visitors. You can also see the keywords they searched for before arriving via search engine, as well as their browsing history on your site.

Destination Number - The destination number is where the phone will ring when customers dial your tracking number. This is typically your primary business phone number.

Tracker - This is a generic term applied to any source tracker or keyword pool.

Swap Target - The swap target is the telephone number CallRail looks for on your website to dynamically replace with a tracking number. By default, the swap target is the destination number, but you can specify a different swap target for each tracker on the number configuration page.

Source Type - The online or offline source the tracking number(s) is configured to track. Our company-specific dynamic number insertion script displays tracking numbers based on the source type of the tracker in question.

Authorization
CallRail uses API keys to authenticate and authorize requests being made to the API. These API keys are scoped to individual users, and have access to the same data as the user who created the key. API responses will only include data pertaining to the user’s API key. For example, a request to retrieve a list of tracked phone calls will only return calls the user could see in CallRail’s interface. Calls placed to accounts or companies where the user has no access will not be returned. Similarly, anyone who has your API key can use that key to access or modify any data you have control over.

Treat your API key as you would your password. API keys should be kept private and should not be displayed publicly.
The CallRail API authenticates via the HTTP Authorization header: Authorization: Token token="YOUR_API_KEY". All requests to all API endpoints require an API key to be provided.

Identifying your integration
If you’re a third-party platform using our API to offer an integration between your system and CallRail, we recommend that you identify yourself using a special HTTP header in your requests.

The Header name is Request-From, and it should be in JSON format. The standard convention is to send your lowercased software name, with an underscore in place of any spaces, for ex: Request-From: hanks_hotdogs

If you’re a CallRail customer using the API to consume your own data for custom integrations and/or reporting, you do not need to supply this header. It is specifically for third-party integrations.

Conventions
The CallRail API adheres to REST architectural principles. REST (Representational State Transfer) takes advantage of HTTP methods to create, read, update, and delete (CRUD) resources on cloud applications like CallRail.

The CallRail API sends and receives data in JSON format. JSON (JavaScript Object Notation) is completely language independent and uses human-readable text to send data objects consisting of key-value pairs.

Supported HTTP Methods
HTTP Method	Description
GET	Requests data from a target resource. Requests using GET always retrieve data.
POST	Submits data to create a resource. Requests using POST always create data.
PUT	Submits data to update a target resource. Requests using PUT always update data.
DELETE	Deletes the target resource. Requests using DELETE always delete data.
Each API endpoint in this guide is documented with the correct HTTP method, endpoint URL, end-point specific request parameters, and sample requests and responses. Additional tables that describe the response in detail are also provided.

Additional Resources
More information on HTTP.

More information on REST.

More information on JSON.

Offset Pagination
A paginated JSON response using offset pagination will include these fields in the response metadata:

{
  "page": 3,
  "per_page": 25,
  "total_pages": 5,
  "total_records": 111
}
All requests to the CallRail API that return more than one object will be paginated. For requests to the Listing All Calls endpoint, we recommend using Relative Pagination. For all other endpoints, you can paginate through results with the following attributes:

Pagination Parameters
Name	Type	Required?	Description
page	integer	optional	Page number that should be returned for this request (The first page is 1. If no page number is specified the first page will be returned.)
per_page	integer	optional	How many objects to return per page to return (The default is 100. Most endpoints support a maximum of 250.)
Example Queries That Include Pagination Parameters
Specifying a Page:

GET /v3/a/{account_id}/users.json?page=3
This request will return page 3 from the Users index endpoint.

Specifying the Number of Records Per Page:

GET /v3/a/{account_id}/users.json?per_page=25
This request will return 25 objects per page from the Users index endpoint.

Paginated Response Fields
The fields listed below will be included in the paginated JSON response for endpoints that return a collection of objects.

Field	Description
page	The page returned in this response.
per_page	The number of records being returned per page.
total_pages	The total number of pages that fit your query parameters.
total_records	The total number of objects that fit your query parameters.
Relative Pagination
A paginated JSON response using relative pagination will include these fields in the response metadata:

{
  "next_page": "https://api.callrail.com/v3/a/227799611/calls?action=index&agency_id=227799611&api_sort%5B%5D%5Bstart_time%5D=desc&api_sort%5B%5D=start_time&controller=api%2Fv3%2Fcalls&format=json&no_one_to_many_associations=true&offset=1&page=1&per_page=100&relative_pagination=true",
  "has_next_page": true
}
All requests to the CallRail API that return more than one object will be paginated. When calling the Listing All Calls endpoint for larger data sets, we recommend the use of relative pagination for better performance. Relative pagination separates the results of your query across multiple pages, without explicitly defining the number of pages in the response or numbering individual pages. Instead, relative pagination provides the endpoint to query the next page of results, and a has_next_page parameter to indicate when you’ve reached the final page of results for your query.

Note that with relative pagination, there is a small possibility that page n+1 might not start exactly at the end of page n, if a new call occurs before page n+1 is fetched.

You should not attempt to use a mix of relative and offset pagination across requests for the same dataset. Use a consistent pagination method to fetch all results for your query.

You can use relative pagination by specifying the following attributes:

Relative Pagination Parameters
Name	Type	Required?	Description
relative_pagination	boolean	optional	Enables the use of relative pagination. A value of true enables relative pagination. A value of false disables relative pagination (and enables Offset Pagination). The default value is false.
per_page	integer	optional	How many objects to return per page to return (The default is 100. The Listing All Calls endpoint supports a maximum of 250.)
offset	integer	optional	Allows you to navigate directly to a specific page of results. With relative pagination, the first page is offset=0 so to navigate to the 10th page of results, you would specify offset=9.
Note that Relative Pagination is currently only supported on the Listing All Calls endpoint. All other endpoints must use Offset Pagination.

Relative Pagination Metadata
Name	Type	Description
next_page	string	Returns the URL for the next page of results. Use this value to call the endpoint for the next page of results. Do not modify the URL value.
has_next_page	boolean	Indicates if there is at least 1 more page of results. When you’ve reached the last page of results, the value will be false.
Example Queries That Include Pagination Parameters
Specifying a Page:

GET /v3/a/{account_id}/calls.json?relative_pagination=true&offset=4
This request will return page 5 from the Calls index endpoint.

Specifying the Number of Records Per Page:

GET /v3/a/{account_id}/calls.json?relative_pagination=true&per_page=25
This request will return 25 objects per page from the Calls index endpoint.

Sorting
A sorted JSON response might look like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 3,
  "users": [
    {
      "email": "bob@example.com",
      "id": 223166018,
      "created_at": "2016-01-29T12:43:10.286-05:00",
      "role": "admin",
      "first_name": "Bob",
      "last_name": "Belcher",
      "name": "Bob Belcher"
    },
    {
      "email": "linda@example.com",
      "id": 159539165,
      "created_at": "2016-04-08T10:55:38.632-04:00",
      "role": "manager",
      "first_name": "Linda",
      "last_name": "Belcher",
      "name": "Linda Belcher"
    },
    {
      "email": "teddy@example.com",
      "id": 330833311,
      "created_at": "2015-03-03T12:15:22.954-05:00",
      "role": "reporting",
      "first_name": "Teddy",
      "last_name": "Francisco",
      "name": "Teddy Francisco"
    }
  ]
}
Most endpoints that return a list of objects also support sorting. Depending on the endpoint, you will find various fields enabled for sorting. Sorting is always either alphabetical, or reverse chronological (newest first).

Name	Type	Required?	Description
sort	text	optional	The field by which the returned response will be sorted by. Refer to individual endpoints to determine acceptable sorting fields.
order	text	optional	The order of the returned sort field. If provided, sort is required. Value can be one of asc or desc.
Example Query That Includes The Sorting Parameter
Sorting the Results: Users Index Endpoint

GET /v3/a/{account_id}/users.json?sort=email
Will return a list of user objects for the target account, sorted by email address in alphabetical order.

Ordering: Users Index Endpoint

GET /v3/a/{account_id}/users.json?sort=email&order=desc
Will return a list of user objects for the target account, sorted by email address in reverse alphabetical order.

Field Selection
A JSON response which returns user-selected fields might look like this:

{
    "answered": false,
    "business_phone_number": null,
    "customer_city": "Seattle",
    "customer_country": "US",
    "customer_name": "Jovani Osinski",
    "customer_phone_number": "+15896836609",
    "customer_state": "WA",
    "direction": "inbound",
    "duration": null,
    "id": 444941612,
    "recording": "http://cdn.callrail.com/v3/a/297251749/calls/444941612/recording",
    "recording_duration": null,
    "start_time": "2017-06-04T13:36:24.000Z",
    "tracking_phone_number": "+14045555466",
    "voicemail": true,
    "company_id": "COM37221d54e80c4216898d2f857fc69fa0",
    "company_name": "Grand Symphony Resort"
}
Field selection allows for control of the fields included in a response. Field selection is available for endpoints that return a list of objects and endpoints that return a single object. Depending on the endpoint, additional fields can be included with the default response fields. Each endpoint will describe the possible fields for selection.

Name	Type	Required?	Description
fields	text	optional	Specified field(s) that will be returned in the response. Requested field names are are separated by commas.
Example Query That Includes Additional User Requested Fields
Selecting Specific Fields: Calls Show Endpoint

GET /v3/a/{account_id}/calls/444941612.json?fields=company_id,company_name
Will return the additional user requested fields for the target call.

Filtering
{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 1,
  "companies": [
    {
      "id": 196207137,
      "name": "Bob's Burgers",
      "status": "disabled",
      "created_at": "2016-02-23T20:16:38.389Z",
      "disabled_at": "2016-04-13T15:35:29.040Z"
    },
    {
      "id": 635837866,
      "name": "Falafel on a Waffle",
      "status": "disabled",
      "created_at": "2017-02-13T15:10:42.742Z",
      "disabled_at": "2017-02-13T15:39:23.149Z"
    },
    {
      "id": 289003184,
      "name": "Jimmy Pesto's Pizzeria",
      "status": "disabled",
      "created_at": "2015-11-24T17:51:34.908Z",
      "disabled_at": "2015-11-24T17:51:55.133Z"
    }
  ]
}
Filtering allows the list of objects returned for a specific endpoint to be filtered by specific parameters. Filtering is available for many endpoints that return a list of objects. Each endpoint that supports filtering will describe the possible filters.

Name	Type	Required?	Description
parameter	text	optional	The field by which the returned response will be filtered.
Example Query That Includes The Filtering Parameter
Filter the Response: Companies Index Endpoint

GET /v3/a/{account_id}/companies.json?status=disabled
Will return a list of company objects in the target account, where the companies are disabled companies.

Filtering Data by Date
Please note that according to our Data Retention Policy, Communication Records (which include phone calls, call recordings, text messages, chat logs, form submissions, web visitor sessions, and other types of data) are retained for 25 months, after which they are automatically deleted.

If you make a request to an endpoint for Communication Records that are outside of the retention period, you will receive an error directing you to revise your date range. This includes requests using the all_time date parameter.

The CallRail API accepts date filters in one of two formats: either a standardized date range, or specific start and end dates. In addition, a time zone can be specified to align dates as expected. The following endpoints accept these parameters:

Listing All Calls
Call Data Summary
Listing All Conversations
Filtering by Standard Date Range
To choose a standardized date range (such as those seen in the CallRail UI), provide a date_range parameter. This is the default for API requests that don’t specify date parameters. Date interpretation according to the table below will be done according to the specified or default time zone.

ex. date_range=recent

Value	Description
recent	default Select data from the previous 7 days, including the current date.*
today	Select data from today only
yesterday	Select data from yesterday only
last_7_days	Select data from the previous 7 days, not including the current date
last_30_days	Select data from the previous 30 days, not including the current date
this_month	Select data from the current month, including the current date
last_month	Select data from the previous month
this_year	Select data from the this year up to and including the current date
last_year	Select data from last year
all_time	Select all data, including the current date
*recent is the default view in the CallRail UI, and is the API default when no other date range parameters are specified.

Filtering by Specific Dates
To select data from a specific date range, provide the start_date and end_date parameters with the request. These parameters should be formatted according to ISO 8601. (ex. “2016-10-17”) Specific times of day are also acceptable in ISO 8601 format. (ex. “2015-09-05T14:00”)

Dates and times provided in this manner are inclusive. For example, listing all calls with start_date=2016-10-17 will be interpreted as beginning at midnight on that date, so all calls that occurred on that date will be included. Specifying end_date=2016-10-17 will be interpreted as calls up to 11:59:59pm on that date. To obtain all calls on a specific date, specify the same date for both start_date and end_date.

Date interpretation will be done according to the specified or default time zone.

ex. start_date=2016-10-01&end_date=2016-10-17

Parameter	Description
start_date	Provide data starting from provided date and time.
ex: “2015-09-05” for all calls after and including September 9, 2015
ex: “2015-09-05T10:00” for all calls after 10 AM September 5, 2015
end_date	Provide data before provided date and time.
ex: “2015-10-05” for all calls before and including October 9, 2015
ex: “2015-09-05T10:00” for all calls before 10 AM September 5, 2015
Searching
A JSON response based on a user-specified search term might look like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 2,
  "users": [
    {
      "email": "bob@example.com",
      "id": 223166018,
      "created_at": "2016-01-29T12:43:10.286-05:00",
      "role": "admin",
      "first_name": "Bob",
      "last_name": "Belcher",
      "name": "Bob Belcher"
    },
    {
      "email": "linda@example.com",
      "id": 159539165,
      "created_at": "2016-04-08T10:55:38.632-04:00",
      "role": "manager",
      "first_name": "Linda",
      "last_name": "Belcher",
      "name": "Linda Belcher"
    }
  ]
}
Searching is available for many collection endpoints that return a list of objects. Depending on the endpoint, various parameters will be enabled for searching.

Name	Type	Required?	Description
search	text	optional	Results returned will include only objects that match the search term. Multiple search terms are not supported.
Example Query That Searches The Endpoint
Searching for Records: Users Index Endpoint

GET /v3/a/{account_id}/users.json?search=belcher
Will return a list of user objects in the target account that match the name given.

Time Zones
The CallRail API aligns all dates to the time zone specified within the account. This can be overridden for specified API requests by including a time_zone parameter. This parameter accepts any standard time zone from the list of common names below.

ex. time_zone=America/New_York

Value	Description
user	default
Use the default time zone for the user indicated by the current API key. This setting is configured within the application.
America/New_York	Eastern Time Zone
America/Indiana/Indianapolis	Indiana Time Zone
America/Chicago	Central Time Zone
America/Denver	Mountain Time Zone
America/Phoenix	Arizona Time Zone
America/Los_Angeles	Pacific Time Zone
Time Zone	GMT Hourly Offset
Pacific/Pago_Pago	-11:00
Pacific/Midway	-11:00
Pacific/Apia	-11:00
Pacific/Honolulu	-10:00
America/Juneau	-09:00
America/Los_Angeles	-08:00
America/Tijuana	-08:00
America/Phoenix	-07:00
America/Chihuahua	-07:00
America/Mazatlan	-07:00
America/Denver	-07:00
America/Guatemala	-06:00
America/Chicago	-06:00
America/Mexico_City	-06:00
America/Monterrey	-06:00
America/Regina	-06:00
America/Bogota	-05:00
America/New_York	-05:00
America/Indiana/Indianapolis	-05:00
America/Lima	-05:00
America/Halifax	-04:00
America/Caracas	-04:00
America/Guyana	-04:00
America/La_Paz	-04:00
America/Santiago	-04:00
America/St_Johns	-03:30
America/Sao_Paulo	-03:00
America/Argentina/Buenos_Aires	-03:00
America/Godthab	-03:00
America/Montevideo	-03:00
Atlantic/South_Georgia	-02:00
Atlantic/Azores	-01:00
Atlantic/Cape_Verde	-01:00
Africa/Casablanca	+00:00
Europe/Dublin	+00:00
Europe/London	+00:00
Europe/Lisbon	+00:00
Europe/London	+00:00
Africa/Monrovia	+00:00
Etc/UTC	+00:00
Europe/Amsterdam	+01:00
Europe/Belgrade	+01:00
Europe/Berlin	+01:00
Europe/Bratislava	+01:00
Europe/Brussels	+01:00
Europe/Budapest	+01:00
Europe/Copenhagen	+01:00
Europe/Ljubljana	+01:00
Europe/Madrid	+01:00
Europe/Paris	+01:00
Europe/Prague	+01:00
Europe/Rome	+01:00
Europe/Sarajevo	+01:00
Europe/Skopje	+01:00
Europe/Stockholm	+01:00
Europe/Vienna	+01:00
Europe/Warsaw	+01:00
Africa/Algiers	+01:00
Europe/Zagreb	+01:00
Europe/Athens	+02:00
Europe/Bucharest	+02:00
Africa/Cairo	+02:00
Africa/Harare	+02:00
Europe/Helsinki	+02:00
Asia/Jerusalem	+02:00
Europe/Kaliningrad	+02:00
Europe/Kiev	+02:00
Africa/Johannesburg	+02:00
Europe/Riga	+02:00
Europe/Sofia	+02:00
Europe/Tallinn	+02:00
Europe/Vilnius	+02:00
Asia/Baghdad	+03:00
Europe/Istanbul	+03:00
Asia/Kuwait	+03:00
Europe/Minsk	+03:00
Europe/Moscow	+03:00
Africa/Nairobi	+03:00
Asia/Riyadh	+03:00
Europe/Moscow	+03:00
Europe/Volgograd	+03:00
Asia/Tehran	+03:30
Asia/Muscat	+04:00
Asia/Baku	+04:00
Asia/Muscat	+04:00
Europe/Samara	+04:00
Asia/Tbilisi	+04:00
Asia/Yerevan	+04:00
Asia/Kabul	+04:30
Asia/Yekaterinburg	+05:00
Asia/Karachi	+05:00
Asia/Tashkent	+05:00
Asia/Kolkata	+05:30
Asia/Colombo	+05:30
Asia/Kathmandu	+05:45
Asia/Almaty	+06:00
Asia/Dhaka	+06:00
Asia/Urumqi	+06:00
Asia/Rangoon	+06:30
Asia/Bangkok	+07:00
Asia/Jakarta	+07:00
Asia/Krasnoyarsk	+07:00
Asia/Novosibirsk	+07:00
Asia/Shanghai	+08:00
Asia/Chongqing	+08:00
Asia/Hong_Kong	+08:00
Asia/Irkutsk	+08:00
Asia/Kuala_Lumpur	+08:00
Australia/Perth	+08:00
Asia/Singapore	+08:00
Asia/Taipei	+08:00
Asia/Ulaanbaatar	+08:00
Asia/Tokyo	+09:00
Asia/Seoul	+09:00
Asia/Yakutsk	+09:00
Australia/Adelaide	+09:30
Australia/Darwin	+09:30
Australia/Brisbane	+10:00
Australia/Melbourne	+10:00
Pacific/Guam	+10:00
Australia/Hobart	+10:00
Australia/Melbourne	+10:00
Pacific/Port_Moresby	+10:00
Australia/Sydney	+10:00
Asia/Vladivostok	+10:00
Asia/Magadan	+11:00
Pacific/Noumea	+11:00
Pacific/Guadalcanal	+11:00
Asia/Srednekolymsk	+11:00
Pacific/Auckland	+12:00
Pacific/Fiji	+12:00
Asia/Kamchatka	+12:00
Pacific/Majuro	+12:00
Pacific/Auckland	+12:00
Pacific/Chatham	+12:45
Pacific/Tongatapu	+13:00
Pacific/Fakaofo	+13:00
HTTP Response Codes
The CallRail API returns standard HTTP success or error status codes. For errors, extra information about what went wrong will be encoded in the response as JSON.

The various HTTP status codes that may be returned are listed below.

Error Code	Meaning
200	OK – The request has succeeded.
201	Created – The request has been fulfilled and has resulted in a new resource being created.
204	No Content – The server successfully processed the request and is not returning any content.
400	Bad Request – The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, or invalid request parameters)
401	Unauthorized – The request has not been processed because it lacks a valid API key for the target resource.
403	Forbidden – The server understood the request but refuses to authorize it.
404	Not Found – The server did not find the target resource or endpoint.
405	Method Not Allowed – The HTTP method received in the request is known by the origin server but not supported by the target resource.
406	Not Acceptable – Request parameters were supplied in an unacceptable format. For GET requests, verify that parameters are sent as part of the URL. For other requests, verify that parameters are sent as JSON.
422	Unprocessable Entity – The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, or invalid request parameters)
429	Too Many Requests – The User or Agency has sent too many requests in a given amount of time (See Rate Limiting.)
500	Internal Server Error – The server encountered an unexpected condition that prevented it from fulfilling the request. If this error persists, please contact support.
503	Service Unavailable – The CallRail API is temporarily offline for maintenance, or the server is overloaded. Please try again later.
Rate Limiting
CallRail limits the number of requests to the API made by an account on an hourly and daily basis.

The default rate limits are described below. If you expect that your application will require more requests, please contact our support team.

If your application exceeds the rate limit, all endpoints will return the HTTP 429 response code. Applications should detect this code and react by pausing or slowing requests until the 429 clears.

Default Rate Limits
API Type	Hourly Limit	Daily Limit
General API Requests	1,000/hour	10,000/day
SMS Send	150/hour	1,000/day
Outbound Call	100/hour	2,000/day
Your First API Request
A simple way to learn the CallRail API is to make an API request with Postman, a powerful HTTP client to help easily test web services.

For a more detailed overview of Postman, see the Postman Documentation.

Configuring Postman to Make CallRail API Requests
1. Set the correct HTTP verb and URL endpoint

For this example, set the request method to GET
Enter the endpoint URL: https://api.callrail.com/v3/a/{account_id}/companies.json
Replace {account_id} with your account ID. If you don’t know your account ID, you can find it in the CallRail web UI. Find the nine digit number following /a/ in the URL displayed in your browser when viewing the CallRail dashboard.
2. Set the Authorization header

Click the Headers tab and add a header key for “Authorization”. In the value field, enter Token token="YouAuthTokenHere"
Be sure to replace YourAuthTokenHere with your API key.
Postman Image 1 (Right click on image and select View Image/Open Image In New Tab to expand the image.)

3. Click “Send” to execute your API request.

A successful response will return something similar to the following image.

Postman Image 2 (Right click on image and select View Image/Open Image In New Tab to expand the image.)

Congratulations! You’ve made your first request against the CallRail API. The remaining sections provide documentation for the available endpoints of the API.

Changelog
January 30, 2020
We have made changes to the API to more closely mirror the data that is displayed in the activity logs and in our reports. For marketing attribution data like Source, Medium, Campaign, Referrer, and Landing Page data, this will represent the lead’s first touch milestone. gclid and fbclid fields will return the most value associated with the call, even if the first touch milestone is a source other than Google Ads or Facebook Ads.

May 24, 2022
The Updating a Call endpoint has been enhanced to allow for edits to Customer Name, and setting Spam status to “true” to mark a call as spam.

June 9, 2022
We have added support for updating form submission data via the Updating a Form Submission endpoint.

June 14, 2022
We have added a milestones object to the Listing All Calls and Retrieving a Single Call endpoints. It describes the attribution for each of the lead’s milestones.

September 20, 2022
We have added a timeline_url field to the Listing All Calls, Retrieving a Single Call, and Listing All Form Submissions endpoints. It contains a link to the lead’s timeline.

March 3, 2023
We have added support for Relative Pagination to the Listing All Calls endpoint. This improves performance when fetching larger data sets from that endpoint.

March 22, 2023
We have added last_touch milestone data to the milestones object in the Listing All Calls and Retrieving a Single Call endpoints.

April 5, 2023
We have added a milestones object to the Listing All Form Submissions endpoint. It describes the attribution for each of the lead’s milestones.

April 13, 2023
Please note that according to our Data Retention Policy, Communication Records (which include phone calls, call recordings, text messages, chat logs, form submissions, web visitor sessions, and other types of data) are retained for 25 months, after which they are automatically deleted.

If you make a request to an endpoint for Communication Records that are outside of the retention period, you will receive an error directing you to revise your date range. This includes requests using the all_time date parameter.

July 19, 2023
New texting compliance rules driven by mobile carriers will require every business sending text messages to register with The Campaign Registry via CallRail.

Learn more about registration and fees and find a link to the registration form on our Text Messaging Compliance Registration support document.

Register by July 31, 2023 to prevent service disruptions to outbound texting, replying to messages, or using automated text responses.

October 26, 2023
Please note that passwords can no longer be managed via the API, regardless of the user making the request. Passwords can only be reset or changed in the app UI. Please refer to our support articles for instructions on how to change or reset your password.

May 10, 2024
The swap_cookie_duration value in the Companies endpoints now supports a swap_cookie_duration_unit to allow more flexibility when specifying a custom cookie duration.

May 16, 2024
The Listing All Calls and Retrieving a Single Call endpoints now include the person_id field, when requested using field selection. person_id helps you identify a particular lead across all their tracked interactions.

May 31, 2024
The Listing All Users endpoint now includes the companies object. This will list all the companies the user is currently associated with.

August 27, 2024
The Listing All Calls and Retrieving a Single Call endpoints now include the sentiment field, when requested using field selection. sentiment gives you the overall sentiment of the call and is available to customers who are using Premium Conversation Intelligence. The Listing All Calls endpoint also now includes the transcription when requested using field selection, which is a transcribed copy of the the conversation or voicemail message. Phone call transcription requires a subscription to a Conversational Intelligence plan.

September 10, 2024
When sending text messages, you are required to identify who you are and use at least one approved keyword to inform the recipient they can end communication at any time. The first time you text a lead (including when using the Send a Text Message endpoint), we will automatically include opt out instructions if none were included in the message. Approved examples: STOP, CANCEL, UNSUBSCRIBE, QUIT, or END

October 15, 2024
The Listing All Calls and Retrieving a Single Call endpoints now include the zip_code field, when requested using field selection. zip_code returns all zip codes that were entered by a caller in a geo-routing step of a call flow.

December 9, 2024
We have added support for Convert Assist Complete webhooks and have provided documentation for it.

January 27, 2025
The Listing All Conversations and Retrieving a Single Text Conversation endpoints now include the source field, when requested using field selection.

April 8, 2025
The Listing All Conversations and Retrieving a Single Text Conversation endpoints now include a type field to indicate whether a message was an sms or mms and a media_urls attribute that can be used to retrieve any media attached to the text message.

April 28, 2025
The id field in the Listing All Companies and Retrieving a Single Company endpoints now returns the company’s masked identifier, consistent with how other CallRail resources are identified across the API.

The Text Message Sent webhook now includes message_type (one of sms or mms) and media_urls (an array of media URLs for MMS messages) fields.

May 5, 2026
The Send a Text Message endpoint now supports MMS. Attach a media file by providing either a media_url (a publicly accessible URL) or media_file (a multipart/form-data upload) in your request. The Text Message Received webhook now also includes message_type and media_urls fields.

May 21, 2026
Access to transcript fields via the API and webhooks now requires a Premium Conversation Intelligence subscription. The transcription field on the Listing All Calls and Retrieving a Single Call endpoints, and the conversational_transcript field on the Retrieving a Single Call endpoint, will return null for accounts that do not have API transcript access.

API
Accounts
Within CallRail, accounts are the top level object. Once an account has been created, companies can then be created within a given account and relevant actions like creating tracking numbers and adding users can then be accomplished. The Accounts endpoints retrieve data about which CallRail accounts can be accessed by the given API key. For more information on scoped API keys, see the Authorization section.

Listing All Accounts
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a.json"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 2,
  "accounts": [
    {
      "id": "ACC8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Last Mile Metrics",
      "outbound_recording_enabled": true,
      "hipaa_account": false
    },
    {
      "id": "ACC8154748ae6bd4e278a7cddd38a662d4d",
      "name": "CallRail",
      "outbound_recording_enabled": true,
      "hipaa_account": false
    }
  ]
}
This endpoint returns a paginated array of all accounts scoped to the provided API key.

API Endpoint
Method	URL
GET	/v3/a.json
Request Parameters
This endpoint supports Offset Pagination, Sorting, and Filtering.

Sorting is available for the following fields:

name
Filtering is available for the following:

hipaa_account: true or false
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the account.
name	string	Name of the account.
outbound_recording_enabled	boolean	Whether or not the account has recording enabled for outbound calls placed via the CallRail web application.
hipaa_account	boolean	Whether or not the account is a HIPAA account.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
numeric_id	integer	The numeric identifier for the account, ex. “123456789”
Retrieving A Single Account
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}.json"
The above command returns a JSON structured object like this:

{
  "id": "ACC8154748ae6bd4e278a7cddd38a662f4f",
  "name": "Last Mile Metrics",
  "outbound_recording_enabled": true,
  "hipaa_account": false
}
This endpoint returns a single account object scoped to the provided API key.

API Endpoint
Method	URL
GET	/v3/a/{account_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the account.
name	string	Name of the account.
outbound_recording_enabled	boolean	Whether or not the account has recording enabled for outbound calls placed via the CallRail web application.
hipaa_account	boolean	Whether or not the account is a HIPAA account.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
numeric_id	integer	The numeric identifier for the account, ex. “123456789”
Calls
Listing All Calls
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/calls.json"
The above command returns JSON structured like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 9,
  "calls": [
    {
      "answered": false,
      "business_phone_number": null,
      "customer_city": "Denver",
      "customer_country": "US",
      "customer_name": "RUEGSEGGER SIMO",
      "customer_phone_number": "+13036231131",
      "customer_state": "CO",
      "direction": "inbound",
      "duration": 4,
      "id": "CAL8154748ae6bd4e278a7cddd38a662f4f",
      "recording": "https://api.callrail.com/v3/a/227799611/calls/111222333/recording.json",
      "recording_duration": "27",
      "recording_player": "https://app.callrail.com/calls/111222333/recording?access_key=3b91eb7f7cc08a4d01ed",
      "start_time": "2017-01-24T11:27:48.119-05:00",
      "tracking_phone_number": "+13038163491",
      "voicemail": false,
      "agent_email": "gil@televised.com"
    },
    {
      "answered": false,
      "business_phone_number": null,
      "customer_city": "Blue Ridge",
      "customer_country": "US",
      "customer_name": "BLUE RIDGE, GA",
      "customer_phone_number": "+17064558047",
      "customer_state": "GA",
      "direction": "inbound",
      "duration": 16,
      "id": "CAL8154748ae6bd4e278a7cddd38a662f4f",
      "recording": null,
      "recording_duration": null,
      "recording_player": null,
      "start_time": "2017-01-24T19:50:03.456-05:00",
      "tracking_phone_number": "+17708243899",
      "voicemail": false,
      "agent_email": "elbert@bpp.com"
    }
  ]
}
This endpoint returns a paginated list of all calls in the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/calls.json
Request Parameters
This endpoint supports Offset Pagination, Sorting, Filtering, Field Selection, and Searching. Please use Relative Pagination when querying larger data sets.

Name	Type	Required?	Description
company_id	string	optional	If provided, only return calls to tracking numbers belonging to this company.
tracker_id	string	optional	If provided, only return calls to this specific tracking number.
Sorting is available for the following fields:

customer_name

customer_phone_number

duration

start_time

source*

customer_city

customer_country

landing_page_url*

device_type*

answered

first_call*

source_name

lead_status

tags*

Note: fields marked with * must be selected to be visible in the response payload as they are not part of the default set of fields.

Filtering is available for the following:

date_range: See Filtering by Date for more info.

call_type: first_call, missed, voicemails, inbound, or outbound

answer_status: answered, missed, or voicemail

device: desktop or mobile

direction: inbound or outbound

lead_status: good_lead, not_a_lead, or not_scored

tags: This parameter can be provided as tags=A for a single tag, or tags[]=A&tags[]=B to return calls tagged with either tag A or tag B.

Searching is available for the following fields:

business_phone_number

customer_name

customer_number

note

source

tracking_phone_number

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
answered	boolean	Whether the call was answered (true) or not answered (false).
business_phone_number	string	The phone number of the person or business who answered the call from the dialed tracking number.
customer_city	string	The customer’s city, based on the original assigned location of their phone number.
customer_country	string	The customer’s country, based on the area code of their phone number.
customer_name	string	The customer’s name, as reported by Caller ID.
customer_phone_number	string	The customer’s phone number (in E.164 format).
customer_state	string	The 2-character abbreviation for the customer’s state, based on the original assigned location of their phone number.
direction	string	Whether the call was inbound (from a customer to you) or outbound (from you to a customer).
duration	integer	The duration of the call in seconds.
id	string	Unique identifier for the call.
recording	string	A URL pointing to the calls/recording api endpoint.
recording_duration	string	The length in seconds of the recording, if available.
recording_player	string	The URL for a stand-alone recording player for this call, if available.
start_time	string	The date and time the call started in the current timezone (ISO 8601 format) with an offset.
tracking_phone_number	string	The business’ tracking phone number for this call (in E.164 format).
voicemail	boolean	Whether the call ended with a voicemail (true) or not (false).
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
agent_email	string	Email address for the user who answered the call, when applicable.
call_highlights	array	A list of relevant keywords automatically found in the call transcription.
call_summary	string	Three to five sentences that summarizes the contents of the call. This is available to customers with a subscription to a Premium Conversation Intelligence plan. For more information, see our support article on Call summaries.
call_type	string	The type of call. One of abandonded, answered, in_progress, missed, outbound, voicemail, or voicemail_transcription.
campaign	string	The name of the campaign the call belongs to.
company_id	string	The string id of the company the call belongs to.
company_name	string	The name of the company the source belongs to .
company_time_zone	string	The configure time zone of the company in CallRail.
created_at	string	The date and time the call was created in the current timezone (ISO 8601 format) with an offset.
custom	object	A list of key-value pairs of custom cookies captured by the Custom Cookie Capture integration, for calls placed to Website (Session) trackers.
device_type	string	Either mobile or desktop, available for calls placed to Website (Session) trackers.
fbclid	string	fbclid as captured from the landing page parameter, available for calls placed to Website (Session) trackers.
first_call	boolean	Whether or not the call is the caller’s first call to this company.
formatted_call_type	string	The type of call, formatted for display.
formatted_customer_location	string	The customer’s city and state formatted for display.
formatted_business_phone_number	string	The phone number of the person or business who answered the call from the dialed tracking number, formatted for display.
formatted_customer_name	string	The customer’s name with certain values stylized for display.
formatted_customer_name_or_phone_number	string	The name or phone number of the customer as reported by Caller ID, formatted for display.
formatted_customer_phone_number	string	The customer’s phone number formatted for display.
formatted_duration	string	The duration of the call formatted for display.
formatted_tracking_phone_number	string	The business’ tracking phone number for this call formatted for display.
formatted_tracking_source	string	The name of the call source formatted for display.
formatted_value	string	The value of the call assigned via the CallRail dashboard, formatted as currency or “–” if not set.
ga	string	Google Universal Analytics _ga value, available for calls placed to Website (Session) trackers.
gclid	string	gclid as captured from the landing page parameter, available for calls placed to Website (Session) trackers. This is also available for calls from Google Ads call assets (formerly called extensions) and call-only ads through the use of our Google Ads Call Details Forwarding integration.
good_lead_call_id	integer	If provided, the id of the call that was originally scored as a good lead.
good_lead_call_time	string	If provided, the time of the call that was originally scored as a good lead.
keypad_entries	object	A list of key-value pairs containing each number entered by the caller as part of a call flow. Each item includes the name given to the keypad entry step in the call flow and the numbers entered by the caller in the keypad entry step of the call flow. { "name": "Account Number", "value": "1234" }
keywords	string	The keywords the visitor searched for, if available for calls placed to Website (Session) trackers. Keywords only provided from paid ad sources.
keywords_spotted	array	Array of keywords spotted, each containing keyword with locations in seconds offset from beginning of recording.
landing_page_url	string	The URL the caller first landed on, available for calls placed to Website (Session) trackers.
last_requested_url	string	The URL of the active page at the time the call was placed, available for calls placed to Website (Session) trackers.
lead_status	string	The current lead status of this caller (as of this call). One of good_lead, not_a_lead, previously_marked_good_lead, or null.
medium	string	The medium associated with the call. Most commonly “PPC”, “direct”, or “Organic”.
milestones	object	An object describing the attribution data associated with the lead’s milestones. For more information, see our support article on Attribution Modeling.
milestones: first_touch	object	Automatically included when you request the milestones object. The First Touch milestone is the first time a customer engages with your company. For example, if they click a PPC ad that takes them to a landing page or they are called by a sales representative on your team. This is the first time a customer interacts with your company.
milestones: lead_created	object	Automatically included when you request the milestones object. The Lead Creation milestone is the last source before a customer calls, texts, or submits a form and becomes known to your business as a new lead. For example, if a customer clicks on one of your Google Ads PPC ads and then calls the tracking number on your landing page, their Lead Creation milestone would be that PPC ad because it caused them to call.
milestones: qualified	object	Automatically included when you request the milestones object. The Qualified milestone is the last source before a customer becomes scored as a qualified lead.
milestones: last_touch	object	Automatically included when you request the milestones object. The Last Touch milestone is the last source before the current call. For example, if a customer clicks on a Google PPC add and then calls the tracking number on your website, and then later navigates back to your website via the Google search results page and calls one of your tracking numbers again, their First Touch source would be Google Ads and the Last Touch source for the 2nd call would be Google Organic.
msclkid	string	msclkid as captured from the landing page parameter, available for calls placed to Website (Session) Trackers.
note	string	Any text notes to associate with this call.
person_id	string	Unique identifier for the lead associated with the phone call.
prior_calls	integer	The number of times this company received a call from this customer prior to this call. If this is the first call from the customer, prior_calls will be 0.
referrer_domain	string	The domain that referred the caller to your website, available for calls placed to Website (Session) trackers.
referring_url	string	The URL that referred the caller to your website, available for calls placed to Website (Session) trackers.
sentiment	string	The assigned sentiment of the conversation. This is available to customers with a subscription to a Premium Conversation Intelligence plan. For more information, see our support article on call sentiments.
session_uuid	string	The unique identifier for the session associated with the call, available for calls placed to Website (Session) trackers.
source	string	The marketing source that led to the phone call.
source_name	string	The name of the tracking number within CallRail.
speaker_percent	object	A JSON object containing the values of the percentage of time spent talking by the Agent and Customer on a call.
tags	array	Any tags which have been applied to this call.
timeline_url	string	A link to the lead’s timeline, which displays the web sessions and touchpoints a caller had on your website before, during, and after calling your business. For more information, see our support article on Caller Timelines.
total_calls	integer	The total number of calls received from a customer phone number.
tracker_id	string	The unique identifier for the tracking number of this call.
transcription	string	A transcribed copy of the conversation or voicemail message, if available. Access to transcripts via the API requires a subscription to a Premium Conversation Intelligence plan; accounts on other plans will see this field returned as null even when a transcript exists on the call. Call recording must be enabled on tracking numbers where you’d like to transcribe calls. See our support article for details.
utm_campaign	string	utm_campaign as captured from the landing page parameter, or as specified in the configuration for Source Trackers.
utm_content	string	utm_content as captured from the landing page parameter, available for calls placed to Website (Session) trackers.
utm_medium	string	utm_medium as captured from the landing page parameter for Website (Session) Trackers, or as specified in the configuration for Source Trackers.
utm_source	string	utm_source as captured from the landing page parameter for Website (Session) Trackers, or as specified in the configuration for Source Trackers.
utm_term	string	utm_term as captured from the landing page parameter, available for calls placed to Website (Session) trackers.
value	integer	A number representing the monetary value of this call.
voice_assist_message	object	The data collected during a Voice Assistant call. See our support article for more information.
voice_assist_message: contents	object	A JSON object containing "question": "answer" mappings of collected data.
voice_assist_message: overrides	object	A JSON object containing "question": "override" if a user has overridden an AI answer. Defaults to null.
voice_assist_message: recorded_at	string	An ISO8601 timestamp of when the assistant recorded this message.
voice_assist_message: urgency	string	The detected urgency level of the call.
waveforms	array	Only present if the call was recorded. Contains the URLs of two images representing the volume of the call over time.
zip_code	array	A list of each zip code entered by the caller as part of the geo-routing step of a call flow. See our support article for more information.
lead_score	string	AI-based lead grading from “very poor” to “very good”.
lead_explanation	string	Explanation of AI-based lead score.
Retrieving a Single Call
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/calls/{call_id}.json"
The above command returns JSON structured like this:

 {
  "answered": false,
  "business_phone_number": null,
  "customer_city": "New York City",
  "customer_country": "US",
  "customer_name": "Jimmy Pesto, Sr.",
  "customer_phone_number": "+13036231131",
  "customer_state": "NY",
  "direction": "inbound",
  "duration": 4,
  "id": "CAL8154748ae6bd4e278a7cddd38a662f4f",
  "recording": "https://api.callrail.com/v3/a/227799611/calls/111222333/recording.json",
  "recording_duration": "27",
  "recording_player": "https://app.callrail.com/calls/111222333/recording?access_key=3b91eb7f7cc08a4d01ed",
  "start_time": "2017-01-24T11:27:48.119-05:00",
  "tracking_phone_number": "+13038163491",
  "voicemail": false,
  "agent_email": "gil@televised.com"
}
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/calls/{call_id}.json?fields=keywords_spotted,milestones"
The above command returns JSON structured like this:

 {
  "answered": false,
  "business_phone_number": null,
  "customer_city": "New York City",
  "customer_country": "US",
  "customer_name": "Jimmy Pesto, Sr.",
  "customer_phone_number": "+13036231131",
  "customer_state": "NY",
  "direction": "inbound",
  "duration": 4,
  "id": "CAL8154748ae6bd4e278a7cddd38a662f4f",
  "recording": "https://api.callrail.com/v3/a/227799611/calls/111222333/recording.json",
  "recording_duration": "27",
  "recording_player": "https://app.callrail.com/calls/111222333/recording?access_key=3b91eb7f7cc08a4d01ed",
  "start_time": "2017-01-24T11:27:48.119-05:00",
  "tracking_phone_number": "+13038163491",
  "voicemail": false,
  "agent_email": "gil@televised.com",
  "milestones": {
     "first_touch": {
          "event_date": "2017-01-22T19:41:45.183-04:00",
          "ad_position": null,
          "campaign": "US_branded",
          "device": "desktop",
          "keywords": "peststoppers",
          "landing": "https://www.example.com/peststoppers/?campaign=US_branded&keywords=peststoppers&gclid=12345abgdef",
          "landing_page_url_params": {
               "campaign": "US_branded",
               "keywords": "peststoppers",
               "gclid": "12345abgdef"
          },
          "match_type": null,
          "medium": "cpc",
          "referrer": "https://www.google.com/",
          "referrer_url_params": {},
          "session_browser": "Chrome",
          "url_utm_params": {},
          "source": "Google Ads"
      },
     "lead_created": {
          "event_date": "2017-01-22T19:41:45.183-04:00",
          "ad_position": null,
          "campaign": "US_branded",
          "device": "desktop",
          "keywords": "peststoppers",
          "landing": "https://www.example.com/peststoppers/?campaign=US_branded&keywords=peststoppers&gclid=12345abgdef",
          "landing_page_url_params": {
               "campaign": "US_branded",
               "keywords": "peststoppers",
               "gclid": "12345abgdef"
          },
          "match_type": null,
          "medium": "cpc",
          "referrer": "https://www.google.com/",
          "referrer_url_params": {},
          "session_browser": "Chrome",
          "url_utm_params": {},
          "source": "Google Ads"
      },
      "qualified": {
          "event_date": "2017-01-22T19:41:45.183-04:00",
          "ad_position": null,
          "campaign": "US_branded",
          "device": "desktop",
          "keywords": "peststoppers",
          "landing": "https://www.example.com/peststoppers/?campaign=US_branded&keywords=peststoppers&gclid=12345abgdef",
          "landing_page_url_params": {
               "campaign": "US_branded",
               "keywords": "peststoppers",
               "gclid": "12345abgdef"
          },
          "match_type": null,
          "medium": "cpc",
          "referrer": "https://www.google.com/",
          "referrer_url_params": {},
          "session_browser": "Chrome",
          "url_utm_params": {},
          "source": "Google Ads"
       },
     "last_touch": {
          "event_date": "2017-01-24T11:27:48.119-05:00",
          "ad_position": null,
          "campaign": null,
          "device": "desktop",
          "keywords": null,
          "landing": "https://www.example.com/",
          "landing_page_url_params": {},
          "match_type": null,
          "medium": "organic",
          "referrer": "https://www.google.com/",
          "referrer_url_params": {},
          "session_browser": "Chrome",
          "url_utm_params": {},
          "source": "Google Organic"
      }
  },
  "keywords_spotted": [
    {
      "keyword": "test phrase one",
      "locations": [
        {
          "speaker": "caller",
          "start": 7.71
        },
        {
          "speaker": "agent",
          "start": 13.38
        },
        {
          "speaker": "caller",
          "start": 17.96
        }
      ]
    },
    {
      "keyword": "test phrase two",
      "locations": [
        {
          "speaker": "caller",
          "start": 8.44
        }
      ]
    }
  ]
}
This endpoint returns a single call object associated with the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/calls/{call_id}.json
Request Parameters
This endpoint supports Field Selection.

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
answered	boolean	Whether the call was answered (true) or not answered (false).
business_phone_number	string	The phone number of the person or business who answered the call from the dialed tracking number.
customer_city	string	The customer’s city, based on the original assigned location of their phone number.
customer_country	string	The customer’s country, based on the area code of their phone number.
customer_name	string	The customer’s name, as reported by Caller ID.
customer_phone_number	string	The customer’s phone number (in E.164 format).
customer_state	string	The 2-character abbreviation for the customer’s state, based on the original assigned location of their phone number.
direction	string	Whether the call was inbound (from a customer to you) or outbound (from you to a customer).
duration	integer	The duration of the call in seconds.
id	string	Unique identifier for the call.
recording	string	A URL pointing to the recording of the call, if available. This URL redirects to the actual audio file of the recording in MP3 format.
recording_duration	string	The length in seconds of the recording, if available.
recording_player	string	The URL for a stand-alone recording player for this call, if available.
start_time	string	The date and time the call started in the current timezone (ISO 8601 format) with an offset.
tracking_phone_number	string	The business’ tracking phone number for this call (in E.164 format).
voicemail	boolean	Whether the call ended with a voicemail (true) or not (false).
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
agent_email	string	Email address for the user who answered the call, when applicable.
call_highlights	array	A list of relevant keywords automatically found in the call transcription.
call_summary	array	Three to five sentences that summarizes the contents of the call. This is available to customers with a subscription to a Premium Conversation Intelligence plan. For more information, see our support article on Call summaries.
call_type	string	The type of call. One of abandonded, answered, in_progress, missed, outbound, voicemail, or voicemail_transcription.
campaign	string	The name of the campaign the call belongs to.
company_id	string	The unique string id of the company the call belongs to.
company_name	string	The name of the company the source belongs to.
company_time_zone	string	The configure time zone of the company in CallRail.
conversational_transcript	array	A formatted version of the transcription of the phone call conversation, if available. The conversation is broken into objects containing the speaker (either caller or agent), the phrase (what was said by the speaker), and the start, indicating the timestamp (in seconds) when the speaker began that phrase. Access via the API requires a subscription to a Premium Conversation Intelligence plan; accounts on other plans will see this field returned as null.
created_at	string	The date and time the call was created in the current timezone (ISO 8601 format) with an offset.
custom	object	A list of key-value pairs of custom cookies captured by the Custom Cookie Capture integration, for calls placed to Website (Session) trackers.
device_type	string	Either mobile or desktop, available for calls placed to Website (Session) trackers.
fbclid	string	fbclid as captured from the landing page parameter, available for calls placed to Website (Session) trackers.
first_call	boolean	Whether or not the call is the caller’s first call to this company.
formatted_call_type	string	The type of call, formatted for display.
formatted_customer_location	string	The customer’s city and state formatted for display.
formatted_business_phone_number	string	The phone number of the person or business who answered the call from the dialed tracking number, formatted for display.
formatted_customer_name	string	The customer’s name with certain values stylized for display.
formatted_customer_name_or_phone_number	string	The name or phone number of the customer as reported by Caller ID, formatted for display.
formatted_customer_phone_number	string	The customer’s phone number formatted for display.
formatted_duration	string	The duration of the call formatted for display.
formatted_tracking_phone_number	string	The business’ tracking phone number for this call formatted for display.
formatted_tracking_source	string	The name of the call source formatted for display.
formatted_value	string	The value of the call assigned via the CallRail dashboard, formatted as currency or “–” if not set.
ga	string	Google Universal Analytics _ga value, available for calls placed to Website (Session) trackers.
gclid	string	gclid as captured from the landing page parameter, available for calls placed to Website (Session) trackers. This is also available for calls from Google Ads call assets (formerly called extensions) and call-only ads through the use of our Google Ads Call Details Forwarding integration.
good_lead_call_id	integer	If provided, the id of the call that was originally scored as a good lead.
good_lead_call_time	string	If provided, the time of the call that was originally scored as a good lead.
integration_data	array	Company integration data collected for a given call, available for calls placed to Website (Session) trackers.
keypad_entries	object	A list of key-value pairs containing each number entered by the caller as part of a call flow. Each item includes the name given to the keypad entry step in the call flow and the numbers entered by the caller in the keypad entry step of the call flow. { "name": "Account Number", "value": "1234" }
keywords	string	The keywords the visitor searched for, if available for calls placed to Website (Session) trackers. Keywords only provided from paid ad sources.
keywords_spotted	array	Array of keywords spotted, each containing keyword with locations in seconds offset from beginning of recording.
landing_page_url	string	The URL the caller first landed on, available for calls placed to Website (Session) trackers.
last_requested_url	string	The URL of the active page at the time the call was placed, available for calls placed to Website (Session) trackers.
lead_status	string	The current lead status of this caller (as of this call). One of good_lead, not_a_lead, previously_marked_good_lead, or null.
medium	string	The medium associated with the call. Most commonly “PPC”, “direct”, or “Organic”.
milestones	object	An object describing the attribution data associated with the lead’s milestones. For more information, see our support article on Attribution Modeling.
milestones: first_touch	object	Automatically included when you request the milestones object. The First Touch milestone is the first time a customer engages with your company. For example, if they click a PPC ad that takes them to a landing page or they are called by a sales representative on your team. This is the first time a customer interacts with your company.
milestones: lead_created	object	Automatically included when you request the milestones object. The Lead Creation milestone is the last source before a customer calls, texts, or submits a form and becomes known to your business as a new lead. For example, if a customer clicks on one of your Google Ads PPC ads and then calls the tracking number on your landing page, their Lead Creation milestone would be that PPC ad because it caused them to call.
milestones: qualified	object	Automatically included when you request the milestones object. The Qualified milestone is the last source before a customer becomes scored as a qualified lead.
milestones: last_touch	object	Automatically included when you request the milestones object. The Last Touch milestone is the last source before the current call. For example, if a customer clicks on a Google PPC add and then calls the tracking number on your website, and then later navigates back to your website via the Google search results page and calls one of your tracking numbers again, their First Touch source would be Google Ads and the Last Touch source for the 2nd call would be Google Organic.
msclkid	string	msclkid as captured from the landing page parameter, available for calls placed to Website (Session) Trackers.
note	string	Any text notes to associate with this call.
person_id	string	Unique identifier for the lead associated with the phone call.
prior_calls	integer	The number of times this company received a call from this customer prior to this call. If this is the first call from the customer, prior_calls will be 0.
referrer_domain	string	The domain that referred the caller to your website, available for calls placed to Website (Session) trackers.
referring_url	string	The URL that referred the caller to your website, available for calls placed to Website (Session) trackers.
sentiment	string	The assigned sentiment of the conversation. This is available to customers with a subscription to a Premium Conversation Intelligence plan. For more information, see our support article on call sentiments.
session_uuid	string	The unique identifier for the session associated with the call, available for calls placed to Website (Session) trackers.
source	string	The marketing source that led to the phone call.
source_name	string	The name of the tracking number within CallRail.
speaker_percent	object	A JSON object containing the values of the percentage of time spent talking by the Agent and Customer on a call.
tags	array	Any tags which have been applied to this call.
timeline_url	string	A link to the lead’s timeline, which displays the web sessions and touchpoints a caller had on your website before, during, and after calling your business. For more information, see our support article on Caller Timelines.
total_calls	integer	The total number of calls received from a customer phone number.
tracker_id	string	The unique ID for the tracking number of this call.
transcription	string	A transcribed copy of the conversation or voicemail message, if available. Access to transcripts via the API requires a subscription to a Premium Conversation Intelligence plan; accounts on other plans will see this field returned as null even when a transcript exists on the call. Call recording must be enabled on tracking numbers where you’d like to transcribe calls. See our support article for details.
utm_campaign	string	utm_campaign as captured from the landing page parameter for Website (Session) Trackers, or as specified in the configuration for Source Trackers.
utm_content	string	utm_content as captured from the landing page parameter, available for calls placed to Website (Session) trackers.
utm_medium	string	utm_medium as captured from the landing page parameter for Website (Session) Trackers, or as specified in the configuration for Source Trackers.
utm_source	string	utm_source as captured from the landing page parameter for Website (Session) Trackers, or as specified in the configuration for Source Trackers.
utm_term	string	utm_term as captured from the landing page parameter, available for calls placed to Website (Session) trackers.
value	integer	A number representing the monetary value of this call.
voice_assist_message	object	The data collected during a Voice Assistant call. See our support article for more information.
voice_assist_message: contents	object	A JSON object containing "question": "answer" mappings of collected data.
voice_assist_message: overrides	object	A JSON object containing "question": "override" if a user has overridden an AI answer. Defaults to null.
voice_assist_message: recorded_at	string	An ISO8601 timestamp of when the assistant recorded this message.
voice_assist_message: urgency	string	The detected urgency level of the call.
waveforms	array	Only present if the call was recorded. Contains the URLs of two images representing the volume of the call over time.
zip_code	array	A list of each zip code entered by the caller as part of the geo-routing step of a call flow. See our support article for more information.
lead_score	string	AI-based lead grading from “very poor” to “very good”.
lead_explanation	string	Explanation of AI-based lead score.
Creating an Outbound Phone Call
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "caller_id": "+17703334455",
          "business_phone_number": "+14045556666",
          "customer_phone_number": "+14044442233",
          "recording_enabled": true,
          "outbound_greeting_recording_url": "http://www.test.com/greeting.mp3",
          "outbound_greeting_text": "These are not the droids you are looking for."
         }' \
         "https://api.callrail.com/v3/a/{account_id}/calls.json"
This endpoint initiates an outbound call from the target account. It can only be used to place calls to and from US and Canadian numbers. It cannot be used to place calls to the United Kingdom and Australia.

The above command initiates an outbound phone call between a customer and a business. The API call should specify a valid tracking number or verified external number, Outbound Caller ID, as the caller_id. Upon making the request, the first leg of the call is placed to the supplied business_phone_number to iniatate the outbound phone call. Once this call is answered by the business, another outbound dial is made to the customer_phone_number and connected to the initial business phone call.

 {
  "answered": null,
  "business_phone_number": "+19044567899",
  "customer_city": "Atlanta",
  "customer_country": "US",
  "customer_name": null,
  "customer_phone_number": "+14703444700",
  "customer_state": "GA",
  "direction": "outbound",
  "duration": null,
  "id": "CAL8154748ae6bd4e278a7cddd38a662f4f",
  "recording": null,
  "recording_duration": null,
  "start_time": "2017-02-22T15:02:24.916-05:00",
  "tracking_phone_number": "+19044567899",
  "voicemail": false
}
This endpoint is rate limited, see Rate Limiting.
API Endpoint
Method	URL
POST	/v3/a/{account_id}/calls.json
Request Body
Name	Type	Required?	Description
caller_id	integer	required	Tracking phone number or verified external phone number used to make an outbound call to the customer. Must be a valid 10 digit US or Canadian number.
customer_phone_number	string	required	The customer’s phone number that will receive the outbound phone call once the business is connected. Must be a valid 10 digit US or Canadian number.
business_phone_number	string	required	The phone number belonging to the business that is initially connected to the call before dialing the customer. Must be a valid 10 digit US or Canadian number.
recording_enabled	boolean	optional	Specifies whether or not to record the call being created.
outbound_greeting_recording_url	string	optional	A URL referencing an audio file that will be played for the customer when the call is answered.
outbound_greeting_text	string	optional	A string of text that will be read to the customer when the call is answered.
agent_id	string	optional	The user ID of the agent to be assigned to the call.
Response Fields
When successful, the HTTP response code will indicate 201 CREATED.

Name	Type	Description
answered	boolean	Whether the call was answered (true) or not answered (false).
business_phone_number	string	The phone number of the person or business who answered the call from the dialed tracking number.
customer_city	string	The customer’s city, based on the original assigned location of their phone number.
customer_country	string	The customer’s country, based on the area code of their phone number.
customer_name	string	The customer’s name, as reported by Caller ID.
customer_phone_number	string	The customer’s phone number (in E.164 format).
customer_state	string	The 2-character abbreviation for the customer’s state, based on the original assigned location of their phone number.
direction	string	Whether the call was inbound (from a customer to you) or outbound (from you to a customer).
duration	integer	The duration of the call in seconds.
id	string	Unique identifier for the call.
recording	string	A URL pointing to the recording of the call, if available. This URL redirects to the actual audio file of the recording in MP3 format.
recording_duration	string	The length in seconds of the recording, if available.
start_time	string	The date and time the call started in the current timezone (ISO 8601 format) with an offset.
tracking_phone_number	string	The business’ tracking phone number for this call (in E.164 format).
voicemail	boolean	Whether the call ended with a voicemail (true) or not (false).
Updating a Call
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -v \
     -d '{
           "note": "Call customer back tomorrow",
           "tags": ["New Client"],
           "lead_status": "good_lead",
           "value": "$1.00",
           "append_tags": true,
           "customer_name": "James Smith"
         }' \
        "https://api.callrail.com/v3/a/{account_id}/calls/{call_id}.json"
The above command returns JSON structured object like this:

 {
  "answered": false,
  "business_phone_number": null,
  "customer_city": "Denver",
  "customer_country": "US",
  "customer_name": "James Smith",
  "customer_phone_number": "+13036231131",
  "customer_state": "CO",
  "direction": "inbound",
  "duration": 4,
  "id": "CAL8154748ae6bd4e278a7cddd38a662f4f",
  "recording": "https://api.callrail.com/v3/a/227799611/calls/213472384/recording.json",
  "recording_duration": "27",
  "start_time": "2017-01-24T11:27:48.119-05:00",
  "tracking_phone_number": "+13038163491",
  "voicemail": false
}
This endpoint updates a call object in the target account. You can use the API to add a Tag or a Note to a call, to set the call’s lead status, or to update the name of the lead associated with the call.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/calls/{call_id}.json
Request Body
When updating a call, the following fields may be included in the request body. If a field is not included, its value will not be changed. If it is included but is null or a blank string, the field will be cleared.

Name	Type	Required?	Description
tags	array	optional	Array of tag names to associate with this call. See the documentation for Tag. New tags will be created if the request contains a tag that doesn’t exist in the company currently.
note	string	optional	Any text notes to associate with this call.
value	string	optional	A number representing the monetary value of this call. This can be formatted with or without a dollar sign. Both “$1.00” and “1.00” are acceptable.
lead_status	string	optional	A string representing a valid lead status. One of "good_lead", "not_a_lead", or null. If a call has a lead status of "previously_marked_good_lead", attempting to set the lead_status to "good_lead" will result in a 400 error.
append_tags	boolean	optional	When set to true, any tags passed in the parameters will be added to the tags already present on the call. When set to false or not specified, any tags passed in the parameters will replace tags already present on the call.
customer_name	string	optional	Updates the name of the lead associated with the call.
spam	boolean	optional	When set to true, this marks the specified call as spam. If the call is in the current billing cycle, it will remove the call from your call log, and also from your reports and billing. It will also “challenge” the caller in the future. You cannot remove spam status via the API. You can remove the caller from the Challenge list by visiting the Blocked Numbers page.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
answered	boolean	Whether the call was answered (true) or not answered (false).
business_phone_number	string	The phone number of the person or business who answered the call from the dialed tracking number.
customer_city	string	The customer’s city, based on the original assigned location of their phone number.
customer_country	string	The customer’s country, based on the area code of their phone number.
customer_name	string	The customer’s name, as reported by Caller ID.
customer_phone_number	string	The customer’s phone number (in E.164 format).
customer_state	string	The 2-character abbreviation for the customer’s state, based on the original assigned location of their phone number.
direction	string	Whether the call was inbound (from a customer to you) or outbound (from you to a customer).
duration	integer	The duration of the call in seconds.
id	string	Unique identifier for the call.
recording	string	A URL pointing to the recording of the call, if available. This URL redirects to the actual audio file of the recording in MP3 format.
recording_duration	string	The length in seconds of the recording, if available.
start_time	string	The date and time the call started in the current timezone (ISO 8601 format) with an offset.
tracking_phone_number	string	The business’ tracking phone number for this call (in E.164 format).
voicemail	boolean	Whether the call ended with a voicemail (true) or not (false).
Summarizing Call Data
curl -H "Authorization: Token token=abc1234" \
  https://api.callrail.com/v3/a/{account_id}/calls/summary.json?group_by=source
The above command returns JSON structured like this:

{
  "start_date": "2016-10-10T00:00:00-0000",
  "end_date": "2016-11-09T23:59:59-0000",
  "time_zone": "UTC",
  "total_results": {
    "total_calls": 160
  },
  "grouped_by": "source",
  "grouped_results": [
    {
      "key": "Bing",
      "total_calls": 130,
      "missed_calls": 20,
      "answered_calls": 110,
      "first_time_callers": 15,
      "average_duration": 179,
      "formatted_average_duration": "2m 59s",
      "leads": 40
    },
    {
      "key": "Billboard Ad",
      "total_calls": 30,
      "missed_calls": 4,
      "answered_calls": 26,
      "first_time_callers": 4,
      "average_duration": 45,
      "formatted_average_duration": "45s",
      "leads": 6
    }
  ]
}
Return summarized Call data for an Agency or for a Company. This Call Summary data can be limited to a specific date range, can be filtered based on a variety of criteria, and can be grouped by source, keywords, campaign, referrer, landing_page, or company. Grouping by company is only available when using the account-level endpoint.

API Endpoints
Method	URL
GET	/v3/a/{account_id}/calls/summary.json
Request Parameters
Name	Type	Required?	Description
company_id	string	optional	Accepts a Company ID. If provided, show results for calls to a single Company.
group_by	string	optional	If provided, group call summary data by specific characteristic. One of source, keywords, campaign, referrer, landing_page, company or company_id.
fields	string	optional	Specify which data to return in request. Comma-separated list of the following: total_calls, missed_calls, answered_calls, first_time_callers, average_duration, formatted_average_duration, leads. Defaults to total_calls
device	string	optional	If provided, show results for a specific device type. One of desktop, mobile or all.
min_duration	number	optional	If provided, only include summary data for calls over the specified duration. An integer representing seconds should be passed.
max_duration	number	optional	If provided, only include summary data for calls under the specified duration. An integer representing seconds should be passed.
tags	string	optional	If provided, only return calls that have had the given tag applied. This parameter can be provided as one or more comma-separated values tags=A,B for a single tag, or one or more array parameters tags[]=A&tags[]=B.
tracker_ids	string	optional	If provided, only return calls made to specific Trackers. This parameter must be provided as one or more array parameters. For example, tracker_ids[]=TRK8154748ae6bd4e278a7cddd38a662f4f&tracker_ids[]=TRK8154748ae6bd4e278a7cddd38a662d5d.
direction	string	optional	If provided, show results for a specific call direction. One of inbound, outbound or all.
answer_status	string	optional	If provided, show results for a specific answer status. One of answered, missed, voicemail, or all.
first_time_callers	boolean	optional	If provided, show results for either all first time callers, or for all non-first time callers.
lead_status	string	optional	Specify results that match a specific Lead Status. One of good_lead, not_a_lead, not_scored.
agent	number	optional	Accepts a User ID. If provided, show results for calls to a specific Agent.
Date Request Parameters
See Filtering by Date for more info

Searching is available for the following fields:

source
Response Fields
Name	Type	Description
total_results	object	A JSON object containing total counts of requested summary data. Summary count fields are listed below in the “Summary Data Response Fields” table.
grouped_by	string	If provided, this field contains the group_by value passed into the initial request for summary data.
grouped_results	array	An array of JSON objects containing total counts of requested summary data, grouped by the group_by parameter. Summary count fields are listed below in the “Summary Data Response Fields” table.
Summary Data Response Fields
Name	Type	Description
total_calls	number	Total number of calls in summary criteria range.
missed_calls	number	Total number of calls that were missed in summary criteria range.
answered_calls	number	Total number of calls that were answered in summary criteria range.
first_time_callers	number	Total number of calls that were from first time callers in summary criteria range.
average_duration	number	Average duration of all calls in summary criteria range, integer.
formatted_average_duration	string	Average duration of all calls in summary criteria range, formatted.
leads	number	Total number of calls that were marked as ‘leads’ in summary criteria range.
Summarizing Call Data by Time Series
curl -H "Authorization: Token token=abc1234" \
  https://api.callrail.com/v3/a/{account_id}/calls/timeseries.json?start_date=2016-10-01&end_date=2016-10-04&fields=missed_calls,answered_calls,first_time_callers,average_duration,formatted_average_duration,leads
The above command returns JSON structured like this:

{
  "start_date": "2016-10-01T00:00:00-0000",
  "end_date": "2016-10-04T23:59:59-0000",
  "time_zone": "UTC",
  "total_results": {
    "total_calls": 180,
    "missed_calls": 20,
    "answered_calls": 160,
    "first_time_callers": 54,
    "average_duration": 27,
    "formatted_average_duration": "27s",
    "leads": 12
  },
  "data": [
    {
      "date": "2016-10-01",
      "total_calls": 130,
      "missed_calls": 4,
      "answered_calls": 26,
      "first_time_callers": 4,
      "average_duration": 45,
      "formatted_average_duration": "45s",
      "leads": 6
    },
    {
      "date": "2016-10-02",
      "total_calls": 30,
      "missed_calls": 4,
      "answered_calls": 26,
      "first_time_callers": 4,
      "average_duration": 45,
      "formatted_average_duration": "45s",
      "leads": 6
    },
    {
      "date": "2016-10-03",
      "total_calls": 0,
      "missed_calls": 0,
      "answered_calls": 0,
      "first_time_callers": 0,
      "average_duration": 0,
      "formatted_average_duration": "0s",
      "leads": 0
    },
    {
      "date": "2016-10-04",
      "total_calls": 20,
      "missed_calls": 10,
      "answered_calls": 10,
      "first_time_callers": 1,
      "average_duration": 15,
      "formatted_average_duration": "15s",
      "leads": 0
    }
  ]
}
curl -H "Authorization: Token token=abc1234" \
  https://api.callrail.com/v3/a/{account_id}/calls/timeseries.json?start_date=2016-10-01&end_date=2016-10-04&interval=hour&time_zone=EST
The above command returns JSON structured like this: *Note that this returned list is a formatting example only; it is not a full representation of the returned results for a full 24 hour data set.

{
  "start_date": "2016-10-01T00:00:00-0500",
  "end_date": "2016-10-02T23:59:59-0500",
  "time_zone": "EST",
  "total_results": {
    "total_calls": 130
  },
  "data": [
    {
      "date": "2016-10-01T00:00:00-0500",
      "total_calls": 0
    },
    {
      "date": "2016-10-01T01:00:00-0500",
      "total_calls": 0
    },
    {
      "date": "2016-10-01T02:00:00-0500",
      "total_calls": 0
    },
    {
      "date": "2016-10-01T03:00:00-0500",
      "total_calls": 0
    },
    {
      "date": "2016-10-01T04:00:00-0500",
      "total_calls": 0
    },
    {
      "date": "2016-10-01T05:00:00-0500",
      "total_calls": 0
    },
    {
      "date": "2016-10-01T06:00:00-0500",
      "total_calls": 5
    },
    {
      "date": "2016-10-01T07:00:00-0500",
      "total_calls": 20
    }
  ]
}
Retrieve aggregate call data for an account or company, grouped by date. This call data can be limited to a specific date range, filtered based on a variety of criteria, and summarized in several ways.

Time series response data is intended to be displayed as a chart, and is limited to 200 data points. For larger time spans (for example: longer than 3 months), it is recommended to specify a larger interval such as week, month, or year. If hourly or daily data is needed for a longer time period, the query must be broken into multiple requests.

API Endpoints
Method	URL
GET	/v3/a/{account_id}/calls/timeseries.json
Request Parameters
Name	Type	Required?	Description
company_id	string	optional	Accepts a Company ID. If provided, show results for calls to a single Company.
fields	string	optional	Specify which data to return in request. Comma-separated list of the following: total_calls, missed_calls, answered_calls, first_time_callers, formatted_average_duration, leads. Defaults to total_calls.
device	string	optional	If provided, show results for a specific device type. One of desktop, mobile or all.
interval	string	optional	Specify the time interval to group response data. Should be one of hour, day, week, month, or year. Defaults to day.
min_duration	number	optional	If provided, only include time series data for calls over the specified duration. An integer representing seconds should be passed.
max_duration	number	optional	If provided, only include time series data for calls under the specified duration. An integer representing seconds should be passed.
tags	string	optional	If provided, only return calls that have had the given tag applied. This parameter can be provided as one or more comma-separated values tags=A,B for a single tag, or one or more array parameters tags[]=A&tags[]=B.
tracker_ids	string	optional	If provided, only return calls made to specific Trackers. This parameter must be provided as one or more array parameters. For example, tracker_ids[]=TRK8154748ae6bd4e278a7cddd38a662f4f&tracker_ids[]=TRK8154748ae6bd4e278a7cddd38a662d5d.
direction	string	optional	If provided, show results for a specific call direction. One of inbound, outbound or all.
answer_status	string	optional	If provided, show results for a specific answer status. One of answered, missed, voicemail, or all.
first_time_callers	boolean	optional	If provided, show results for either all first time callers, or for all non-first time callers.
lead_status	string	optional	Specify results that match a specific Lead Status. One of good_lead, not_a_lead, not_scored.
agent	number	optional	Accepts a User ID. If provided, show results for calls to a specific Agent.
Date Request Parameters
See Filtering by Date for more info

Searching is available for the following fields:

source
Response Fields
Name	Type	Description
total_results	object	A JSON object containing total counts of requested time series data. Summary count fields are listed below in the “Summary Data Response Fields” table.
data	array	An array of JSON objects containing total counts of requested time series data, ordered and grouped by date. The dates are displayed in ISO 8601 format. All time series intervals represent dates as YYYY-MM-DD, except the hour interval which includes the hour, minutes, seconds and timezone as YYYY-MM-DDThh:mm:ssTZD. Summary count fields are listed below in the “Summary Data Response Fields” table.
Additional User Requested Response Fields
Field Selection is available for the following Summary Data Response fields in the table below.

To choose any or all of the below fields, provide a fields parameter. Please refer Field Selection to see an example.

ex. fields=missed_calls,answered_calls,first_time_callers,average_duration,formatted_average_duration,leads

Name	Type	Description
total_calls	number	Total number of calls in summary date range. This Summary Data response field is available by default.
missed_calls	number	Total number of calls that were missed in summary date range.
answered_calls	number	Total number of calls that were answered in summary date range.
first_time_callers	number	Total number of calls that were from first time callers in summary date range.
average_duration	number	Average duration of all calls in time series date range, integer.
formatted_average_duration	string	Average duration of all calls in time series date range, formatted.
leads	number	Total number of calls that were marked as ‘leads’ in time series date range.
Retrieving a Single Call Recording
curl -H "Authorization: Token token=abc1234" \
  https://api.callrail.com/v3/a/{account_id}/calls/{call_id}/recording.json
The above command returns JSON structured like this:

{
  "url": "http://app.callrail.com/calls/CAL11df32690b7d46123456789123456789/recording/redirect?access_key=241sa242sadqwerty123"
}
This endpoint returns a CallRail URL pointing to an MP3 recording of the specified call. The link returned does not expire in 24 hours but this does not guarantee the link will be good forever. The link is intended for playback in a client browser or downloading the file to your own storage mechanism.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/calls/{call_id}/recording.json
Request Parameters
None

Response Fields
Includes the following:

Name	Type	Description
url	string	A link CallRail URL to the audio file of the recording in MP3 format.
For HIPAA agencies
The above command returns JSON structured like this for HIPAA agencies:

{
  "url": "https://calltrk-production.s3.amazonaws.com/calls/recordings/000/000/700/test.mp3"
}
This endpoint returns a temporary URL pointing to an MP3 recording of the specified call. Because of HIPAA restrictions, the URL returned in the response is not a link. It is intended for immediate use: either playback in a client browser or downloading the file to your own storage mechanism. The URL returned will expire in about 24 hours.

You should never store the URL returned in this response. Instead, you should make a request to this endpoint whenever you need to obtain current location of this MP3. Because the underlying file may move in the future, the permanent reference to this recording is this API endpoint itself.

Response Fields
Includes the following:

Name	Type	Description
url	string	A temporary URL or permalinkpointing to the audio file of the recording in MP3 format.
Tags
Tags are labels that can be applied to help sort and categorize your calls, form submissions, and text messages. Some tags are company-dependent within your account and there’s no limit on the number of tags a company can have.

If you’re an administrator for your CallRail account, you can create a set of tags that apply to every single company in your account. These tags can only be created and edited by administrators since these tag settings apply to all companies. More than one tag can be assigned to a single call/form submission/text message and these tags will be available on your activity dashboard when a call is received.

Tags can also be applied in the following ways:

manually added by a CallRail user via the CallRail web application
added with a Tag step in a Call Flow
through an Automation Rule
See our Call Flow feature and Tag Step for more information. For example, you can create a call tag named “Sales Call” to be applied when a caller presses option 1 to speak to Sales. Advanced Call Flows must be configured only within the CallRail web application.

Our Automation Rules feature is available to customers who subscribe to our Conversation Intelligence product. For example, you can create a call tag named “Online Ad Campaign Confirmed Appointment” and automatically apply it to calls with a source of Google Ads, when the caller says the phrase “make an appointment.”

Retrieving All Tags
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/tags.json"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 3,
  "tags": [
    {
      "id": 993186,
      "name": "Conversion",
      "tag_level": "company",
      "color": "gray1",
      "background_color": "green2",
      "company_id": "COM37221d54e80c4216898d2f857fc69fa0",
      "status": "enabled",
      "created_at": "2017-07-24T11:13:47.366-04:00"
    },
    {
      "id": 1932597,
      "name": "Sales",
      "tag_level": "company",
      "color": "gray1",
      "background_color": "blue2",
      "company_id": "COM37221d54e80c4216898d2f857fc69fa0",
      "status": "enabled",
      "created_at": "2019-04-05T13:38:36.258-04:00"
    },
    {
      "id": 2672419,
      "name": "Unanswered",
      "tag_level": "company",
      "color": "gray1",
      "background_color": "yellow1",
      "company_id": "COM37221d54e80c4216898d2f857fc69fa0",
      "status": "enabled",
      "created_at": "2020-10-16T16:07:35.554-04:00"
    }
  ]
}
This endpoint returns a paginated array of tags within the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/tags.json
Request Parameters
This endpoint supports Offset Pagination and Sorting.

Name	Type	Required?	Description
company_id	string	optional	If provided, only return tags belonging to this company.
status	string	optional	If provided, only return tags that are enabled or disabled.
tag_level	string	optional	If provided, only return tags at the specified level (company or account). You cannot use a filter of tag_level=account and a company_id filter in the same request.
Sorting is available for the following fields:

name
Response Field
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the Tag object.
name	string	The name of the tag formatted for display.
tag_level	string	Indicates whether the tag is at the account level or the company level.
color	string	The name reference from the available colors. See Available Colors.
background_color	string	The name reference from the available colors. See Available Colors.
company_id	string	Unique identifier for the company associated with the tag.
status	string	Indicates whether the tag is currently “enabled” or “disabled”.
created_at	string	The date and time the tag was created in the current timezone (ISO 8601 format) with an offset.
Creating a Tag
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Existing Customer",
           "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
           "color": "gray1"
        }' \
        "https://api.callrail.com/v3/a/{account_id}/tags.json"
The above command returns a JSON structured object like this:

{
  "id": "1234569",
  "name": "Existing Customer",
  "tag_level": "company",
  "color": "gray1",
  "background_color": "gray1",
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "status": "enabled",
  "created_at": "2014-06-06T12:11:02.964-04:00"
}
This endpoint creates a single tag object in the target company or account.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/tags.json
Request Body
Name	Type	Required?	Description
name	string	required	The name of the tag formatted for display.
company_id	string	optional	Unique identifier for the company. Required if tag_level=company or if tag_level is left blank.
color	string	optional	The name reference from the available colors. See Available Colors.
tag_level	string	optional	If tag_level=account, creates a tag that applies to all companies in the target account. These tags can only be created and edited by administrators since these tag settings apply to all companies. If left blank, a company-level tag will be created.
Response Fields
Name	Type	Description
id	integer	Unique identifier for the Tag object.
name	string	The name of the tag formatted for display.
tag_level	string	Indicates whether the tag is at the account level or the company level.
color	string	The name reference from the available colors. See Available Colors.
background_color	string	The name reference from the available colors. See Available Colors.
company_id	string	Unique identifier for the company associated with the tag.
status	string	Indicates whether the tag is currently “enabled” or “disabled”.
created_at	string	The date and time the tag was created in the current timezone (ISO 8601 format) with an offset.
Updating a Tag
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Existing Customer",
           "color": "gray1"
        }' \
        "https://api.callrail.com/v3/a/{account_id}/tags/{tag_id}.json"
The above command returns a JSON structured object like this:

{
  "id": "1234569",
  "name": "Existing Customer",
  "tag_level": "company",
  "color": "gray1",
  "background_color": "gray1",
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "status": "enabled",
  "created_at": "2014-06-06T12:11:02.964-04:00"
}
This endpoint updates a tag object in the target account. You can use the API to change the name or color of the tag, or change its status.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/tags/{tag_id}.json
Request Body
Name	Type	Required?	Description
name	string	optional	The name of the tag formatted for display. Editing a tag will change the tag in every place it’s currently assigned.
color	string	optional	The name reference from the available colors. See Available Colors.
disabled	string	optional	Indicates whether the tag should be available for use (false) or not (true). Once you disable a tag, it can’t be applied to any new interactions. It will not be removed from any interactions it’s already been applied to.
Response Fields
Name	Type	Description
id	integer	Unique identifier for the Tag object.
name	string	The name of the tag formatted for display.
tag_level	string	Indicates whether the tag is at the account level or the company level.
color	string	The name reference from the available colors. See Available Colors.
background_color	string	The name reference from the available colors. See Available Colors.
company_id	string	Unique identifier for the company associated with the tag.
status	string	Indicates whether the tag is currently enabled or disabled.
created_at	string	The date and time the tag was created in the current timezone (ISO 8601 format) with an offset.
Removing a Tag
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/tags/{tag_id}.json"
The above command does not return any response data.

This endpoint will delete a tag. Removing a tag will remove it automatically from any call flow and interaction it’s been assigned to. You can use the Updating a Tag endpoint to disable the tag from being applied to new interactions without removing it from any interactions it was previously applied to.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/tags/{tag_id}.json
Response
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

If the specified notification is not managed by the current authorized user, the response will be 403 Forbidden with the following error message.

{ "error" => "You do not have permission to perform the requested action" }

Available Colors
The Tag Color object represents the color and background color of the tag to be created.

// Create a Tag that is the color gray.
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Existing Customer",
           "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
           "color": "gray1"
        }' \
        "https://api.callrail.com/v3/a/{account_id}/tags.json"
Selecting a Color
To assign a color to a Tag, you’ll select one of the color names from the table below to set as the value of the color object.

Below is a list of all acceptable color names along with their corresponding color and background color hex codes.

Name	Color	Background Color	Example
gray1	#464646	#e7e7e7	gray1
gray2	#ffffff	#c2c2c2	gray2
blue1	#0f3778	#b5cef7	blue1
blue2	#ffffff	#4583ea	blue2
cyan1	#0d404a	#96d7e5	cyan1
cyan2	#ffffff	#23a2bd	cyan2
purple1	#3d0d90	#e3d6ff	purple1
purple2	#ffffff	#b997ff	purple2
pink1	#761e3a	#fcd3e0	pink1
pink2	#9a4964	#f890b2	pink2
pink3	#6b323b	#ebdbde	pink3
pink4	#ffffff	#cda6ac	pink4
red1	#8c1b00	#f3b2a7	red1
red2	#ffffff	#fe4a22	red2
orange1	#7f3306	#ffc8ad	orange1
orange2	#ffffff	#ff7529	orange2
orange3	#7d4900	#ffdfb2	orange3
orange4	#ffffff	#ffae38	orange4
yellow1	#594d00	#fcea7c	yellow1
yellow2	#694f00	#fdeebf	yellow2
green1	#054f2f	#b1f0d2	green1
green2	#044227	#38d790	green2
green3	#015531	#a0ddc0	green3
green4	#ffffff	#00a863	green4
Companies
A company in CallRail is a separate entity within your account. Companies are where you create tracking phone numbers, configure integrations, enable email notifications, and handle specific company settings. Calls and other activities are tracked within the context of a company, and reports can be aggregated across all tracking numbers within a company. You can also restrict users’ access to specific companies to limit the data they can interact with or modify.

For example, if you’re a marketing agency looking to keep separate reports for each client you manage, you’d create a separate company for each client. Or, if you’re overseeing calls to a franchise, you can create separate companies for each franchise location.

Listing All Companies
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/companies.json"
The above command returns JSON structured object like this:

{
  "page": 1,
  "per_page": 250,
  "total_pages": 1,
  "total_records": 3,
  "companies": [
    {
        "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "name": "Widget Shop",
        "status": "active",
        "time_zone": "America/New_York",
        "created_at": "2016-06-06T07:06:01.000Z",
        "disabled_at": null,
        "dni_active": true,
        "script_url": "//cdn.callrail.com/companies/183570817/5706dbe6dc972c634a65/12/swap.js",
        "callscribe_enabled": false,
        "lead_scoring_enabled": true,
        "swap_exclude_jquery": null,
        "swap_ppc_override": null,
        "swap_landing_override": null,
        "swap_cookie_duration": 6,
        "swap_cookie_duration_unit": "months",
        "callscore_enabled": false,
        "keyword_spotting_enabled": false,
        "form_capture": true
    },
    {
        "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "name": "Bob's Burger",
        "status": "active",
        "time_zone": "America/New_York",
        "created_at": "2017-06-20T09:30:08.676Z",
        "disabled_at": null,
        "dni_active": false,
        "script_url": "//cdn.callrail.com/companies/411892629/1dbf0fc11eabdc04483a/12/swap.js",
        "callscribe_enabled": false,
        "lead_scoring_enabled": true,
        "swap_exclude_jquery": null,
        "swap_ppc_override": null,
        "swap_landing_override": null,
        "swap_cookie_duration": 30,
        "swap_cookie_duration_unit": "days", 
        "callscore_enabled": false,
        "keyword_spotting_enabled": false,
        "form_capture": true
    },
    {
        "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "name": "Joe's Icecream",
        "status": "active",
        "time_zone": "America/New_York",
        "created_at": "2016-06-06T07:06:01.000Z",
        "disabled_at": null,
        "dni_active": null,
        "script_url": "//cdn.callrail.com/companies/785622206/81fbf538633804b8dea6/12/swap.js",
        "callscribe_enabled": false,
        "lead_scoring_enabled": true,
        "swap_exclude_jquery": null,
        "swap_ppc_override": null,
        "swap_landing_override": null,
         "swap_cookie_duration": 6,
        "swap_cookie_duration_unit": "months",
        "callscore_enabled": false,
        "keyword_spotting_enabled": false,
        "form_capture": false
    }
  ]
}
This endpoint returns a paginated array of all companies associated with the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/companies.json
Request Parameters
This endpoint supports Offset Pagination, Sorting, and Filtering.

Sorting is available for the following fields:

name
Filtering is available for the following:

status: active or disabled
Searching is available for the following fields:

name
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the company.
name	string	Name of the company.
status	string	Indicates whether the company is currently “active” or “disabled”.
time_zone	string	Time Zone configured for this company.
created_at	string	The date and time the company was created in UTC (ISO 8601 format).
disabled_at	string	The date and time the company was disabled in UTC (ISO 8601 format). If the company is still enabled, this value will be null.
dni_active	boolean	Whether or not the company has the Javascript Snippet enabled. This field will be null if the Javascript Snippet has never been installed. See Installing the JavaScript Snippet.
script_url	string	The URL for the CallRail tracking script for this company. See Installing the JavaScript Snippet.
callscore_enabled	boolean	Whether or not the company has CallScore enabled. See CallScore.
lead_scoring_enabled	boolean	Whether or not the company has manual lead scoring enabled.
swap_exclude_jquery	boolean	(Deprecated) CallRail’s DNI script no longer requires jQuery; this field is returned for compatibility purposes but has no effect.
swap_ppc_override	boolean	Option to override the original source when a visitor arrives via PPC.
swap_landing_override	string/null	Option to override the original source when a visitor arrives on a landing page containing a given param.
swap_cookie_duration	integer	Maximum cookie duration length. Each time a visitor browses the website, their cookie expiration dates will be updated according to this value. Visitors who clear their cookies, return after the cookie expires, or use a different web browser will be treated as new visitors. A maximum duration of 6 months is allowed.
swap_cookie_duration_unit	string	Unit of time for swap_cookie_duration. Can be months, weeks, or days. A maximum of 6 months is allowed.
callscribe_enabled	boolean	Whether or not the company has Transcripts and Call Highlights enabled. See Transcripts and Call Highlights.
keyword_spotting_enabled	boolean	(Deprecated) Indicates whether the company had the Keyword Spotting feature enabled. This field is returned for compatibility purposes but has no effect. It’s been replaced, see Automation Rules.
form_capture	boolean	Indicates whether the company has the external form capture feature enabled.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
verified_caller_ids	array	An array containing JSON objects of all verified Outbound Caller IDs for this company. Each object has a name and phone_number key/value.
Retrieving a Single Company
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/companies/{company_id}.json"
The above command returns JSON structured object like this:

{
    "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Widget Shop",
    "status": "active",
    "time_zone": "America/New_York",
    "created_at": "2016-06-06T07:06:01.000Z",
    "disabled_at": null,
    "dni_active": true,
    "script_url": "//cdn.callrail.com/companies/183570817/5706dbe6dc972c634a65/12/swap.js",
    "callscore_enabled": false,
    "lead_scoring_enabled": true,
    "swap_exclude_jquery": null,
    "swap_ppc_override": null,
    "swap_landing_override": null,
    "swap_cookie_duration": 6,
    "swap_cookie_duration_unit": "months",
    "callscribe_enabled": false,
    "keyword_spotting_enabled": false,
    "form_capture": true
}
This endpoint returns a single company object associated with the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/companies/{company_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the company.
name	string	Name of the company.
status	string	Indicates whether the company is currently “active” or “disabled”.
time_zone	string	Time Zone configured for this company.
created_at	string	The date and time the company was created in UTC (ISO 8601 format).
disabled_at	string	The date and time the company was disabled in UTC (ISO 8601 format). If the company is still enabled, this value will be null.
dni_active	boolean	Whether or not the company has the Javascript Snippet enabled. This field will be null if the Javascript Snippet has never been installed. See Installing the JavaScript Snippet.
script_url	string	The URL for the CallRail tracking script for this company. See Installing the JavaScript Snippet.
callscore_enabled	boolean	Whether or not the company has CallScore enabled. See CallScore.
lead_scoring_enabled	boolean	Whether or not the company has manual lead scoring enabled.
swap_exclude_jquery	boolean	(Deprecated) CallRail’s DNI script no longer requires jQuery; this field is returned for compatibility purposes but has no effect.
swap_ppc_override	boolean	Option to override the original source when a visitor arrives via PPC.
swap_landing_override	string/null	Option to override the original source when a visitor arrives on a landing page containing a given param.
swap_cookie_duration	integer	Maximum cookie duration length. Each time a visitor browses the website, their cookie expiration dates will be updated according to this value. Visitors who clear their cookies, return after the cookie expires, or use a different web browser will be treated as new visitors. A maximum duration of 6 months is allowed.
swap_cookie_duration_unit	string	Unit of time for swap_cookie_duration. Can be months, weeks, or days. A maximum of 6 months is allowed.
callscribe_enabled	boolean	Whether or not the company has Transcripts and Call Highlights enabled. See Transcripts and Call Highlights.
keyword_spotting_enabled	boolean	(Deprecated) Indicates whether the company had the Keyword Spotting feature enabled. This field is returned for compatibility purposes but has no effect. It’s been replaced, see Automation Rules.
form_capture	boolean	Indicates whether the company has the external form capture feature enabled.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
verified_caller_ids	array	An array containing JSON objects of all verified Outbound Caller IDs for this company. Each object has a name and phone_number key/value.
Creating a Company
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "name": "Widget Shop",
          "time_zone": "America/New_York"
         }' \
         "https://api.callrail.com/v3/a/{account_id}/companies.json"
The above command returns JSON structured object like this:

{
  "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "name": "Widget Shop",
  "status": "active",
  "time_zone": "America/New_York",
  "created_at": "2017-01-26T22:58:04.184Z",
  "disabled_at": null,
  "dni_active": null,
  "script_url": "//cdn.callrail.com/companies/279054151/a74c824140d67442debd/12/swap.js",
  "callscribe_enabled": false,
  "lead_scoring_enabled": false,
  "swap_exclude_jquery": null,
  "swap_ppc_override": null,
  "swap_landing_override": null,
  "swap_cookie_duration": 6,
  "swap_cookie_duration_unit": "months",
  "callscore_enabled": false,
  "keyword_spotting_enabled": false
}
This endpoint creates a company object within the target account.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/companies.json
Request Body
Name	Type	Required?	Description
name	string	required	Company name.
time_zone	string	optional	Time Zone configured for this company. See List of Timezones.
Response Fields
When successful, the HTTP response code will indicate 201 CREATED.

Name	Type	Description
id	string	Unique identifier for the company.
name	string	Name of the company.
status	string	Indicates whether the company is currently “active” or “disabled”.
time_zone	string	Time Zone configured for this company.
created_at	string	The date and time the company was created in UTC (ISO 8601 format).
disabled_at	string	The date and time the company was disabled in UTC (ISO 8601 format). If the company is still enabled, this value will be null.
dni_active	boolean	Whether or not the company has the Javascript Snippet enabled. This field will be null if the Javascript Snippet has never been installed. See Installing the JavaScript Snippet.
script_url	string	The URL for the CallRail tracking script for this company. See Installing the JavaScript Snippet.
callscore_enabled	boolean	Whether or not the company has CallScore enabled. See CallScore.
lead_scoring_enabled	boolean	Whether or not the company has manual lead scoring enabled.
swap_exclude_jquery	boolean	(Deprecated) CallRail’s DNI script no longer requires jQuery; this field is returned for compatibility purposes but has no effect.
swap_ppc_override	boolean	Option to override the original source when a visitor arrives via PPC.
swap_landing_override	string/null	Option to override the original source when a visitor arrives on a landing page containing a given param.
swap_cookie_duration	integer	Maximum cookie duration length. Each time a visitor browses the website, their cookie expiration dates will be updated according to this value. Visitors who clear their cookies, return after the cookie expires, or use a different web browser will be treated as new visitors. A maximum duration of 6 months is allowed.
swap_cookie_duration_unit	string	Unit of time for swap_cookie_duration. Can be months, weeks, or days. A maximum of 6 months is allowed.
callscribe_enabled	boolean	Whether or not the company has Transcripts and Call Highlights enabled. See Transcripts and Call Highlights.
keyword_spotting_enabled	boolean	(Deprecated) Indicates whether the company had the Keyword Spotting feature enabled. This field is returned for compatibility purposes but has no effect. It’s been replaced, see Automation Rules.
Updating a Company
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
          "swap_ppc_override": "true",
          "swap_landing_override": "utm_source",
          "callscribe_enabled": true,
          "external_form_capture": true
         }' \
         "https://api.callrail.com/v3/a/{account_id}/companies/{company_id}.json"
The above command returns JSON structured object like this:

{
  "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "name": "Widget Shop",
  "status": "active",
  "time_zone": "America/New_York",
  "created_at": "2017-01-26T22:58:04.184Z",
  "disabled_at": null,
  "dni_active": true,
  "script_url": "//cdn.callrail.com/companies/279054151/a74c824140d67442debd/12/swap.js",
  "callscribe_enabled": true,
  "lead_scoring_enabled": false,
  "swap_exclude_jquery": null,
  "swap_ppc_override": true,
  "swap_landing_override": "utm_source",
  "swap_cookie_duration": 6,
  "swap_cookie_duration_unit": "months", 
  "callscore_enabled": false,
  "keyword_spotting_enabled": false,
  "form_capture": true
}
This endpoint updates a company object within the target account.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/companies/{company_id}.json
Request Body
Name	Type	Required?	Description
name	string	optional	Company name.
callscore_enabled	boolean	optional	Turns the CallScore feature on or off for this company. See CallScore.
keyword_spotting_enabled	boolean	optional	(Deprecated) Indicates whether the company had the Keyword Spotting feature enabled. This field is available for compatibility purposes but has no effect.
callscribe_enabled	boolean	optional	Turns the CallScribe feature on or off for this company. See CallScribe
time_zone	string	optional	Time Zone configured for this company. See List of Timezones.
swap_exclude_jquery	boolean	optional	(Deprecated) CallRail’s DNI script no longer requires jQuery; this field is accepted for compatibility purposes but has no effect.
swap_ppc_override	boolean	optional	Option to override the original source when a visitor arrives via PPC.
swap_landing_override	string/null	optional	Option to override the original source when a visitor arrives on a landing page containing a given param. To enable, pass a string with the dersired landing page parameter as the value. To disable, pass null as the value.
swap_cookie_duration	integer	optional	Maximum cookie duration length. Each time a visitor browses the website, their cookie expiration dates will be updated according to this value. Visitors who clear their cookies, return after the cookie expires, or use a different web browser will be treated as new visitors. A maximum duration of 6 months is allowed.
swap_cookie_duration_unit	string	optional	Unit of time for swap_cookie_duration. Can be months, weeks, or days. A maximum of 6 months is allowed.
external_form_capture	boolean	optional	Turns external form capture feature on or off for this company.
 What’ a landing page parameter? This is the URL parameter CallRail looks for on the landing page to determine whether to override the previous source. If your landing page URL is http://www.example.com/?utm_source=facebook, then you would enter “utm_source” in the `swap_landing_override` field to set this override.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the company.
name	string	Name of the company.
status	string	Indicates whether the company is currently “active” or “disabled”.
time_zone	string	Time Zone configured for this company.
created_at	string	The date and time the company was created in UTC (ISO 8601 format).
disabled_at	string	The date and time the company was disabled in UTC (ISO 8601 format). If the company is still enabled, this value will be null.
dni_active	boolean	Whether or not the company has the Javascript Snippet enabled. This field will be null if the Javascript Snippet has never been installed. See Installing the JavaScript Snippet.
script_url	string	The URL for the CallRail tracking script for this company. See Installing the JavaScript Snippet.
callscore_enabled	boolean	Whether or not the company has CallScore enabled. See CallScore.
lead_scoring_enabled	boolean	Whether or not the company has manual lead scoring enabled.
swap_exclude_jquery	boolean	(Deprecated) CallRail’s DNI script no longer requires jQuery; this field is returned for compatibility purposes but has no effect.
swap_ppc_override	boolean	Option to override the original source when a visitor arrives via PPC.
swap_landing_override	string/null	Option to override the original source when a visitor arrives on a landing page containing a given param.
swap_cookie_duration	integer	Maximum cookie duration length. Each time a visitor browses the website, their cookie expiration dates will be updated according to this value. Visitors who clear their cookies, return after the cookie expires, or use a different web browser will be treated as new visitors. A maximum duration of 6 months is allowed.
swap_cookie_duration_unit	string	Unit of time for swap_cookie_duration. Can be months, weeks, or days. A maximum of 6 months is allowed.
callscribe_enabled	boolean	Whether or not the company has Transcripts and Call Highlights enabled. See Transcripts and Call Highlights.
keyword_spotting_enabled	boolean	(Deprecated) Indicates whether the company had the Keyword Spotting feature enabled. This field is returned for compatibility purposes but has no effect. It’s been replaced, see Automation Rules.
form_capture	boolean	Indicates whether the company has the external form capture feature enabled.
Update Multiple Companies
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -d '{
          "company_ids": ["COM8154748ae6bd4e278a7cddd38a662f4f", "COM0392748ae6bd4e278a7cddd38b254a2a"],
          "external_form_capture": true
         }' \     
     "https://api.callrail.com/v3/a/{account_id}/companies/bulk_update.json"
The above command returns JSON structured object like this:

{
    "updated_records": 2
}
CallRail’s Form Tracking product will only capture external forms if external form tracking is enabled at the company level.

If you have a need to enable or disable external form tracking in bulk, either for all or multiple companies, this endpoint allows you to do that.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/companies/bulk_update.json
Request Body
Name	Type	Required?	Description
company_ids	array	required	List of string company ids to configure the ignored fields for. Passing ["all"] instead of ids will apply the ignored fields to all companies in the target account
external_form_capture	boolean	optional	Turns external form capture feature on or off for this company.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
updated_records	integer	Number of affected records.
Disabling a Company
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/companies/{company_id}.json"
The above command does not return any response data.

This endpoint disables a Company object in the target company. If you disable a company all the tracking phone numbers will be disabled and the swap.js script will be deactivated.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/companies/{company_id}.json
Response
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

If an Account has only one company, then that company cannot be disabled. Attempting to do this will return the following error message.

{ error: 'You must have at least one active company.' }

Form Submissions
If you’ve included the dynamic number insertion script in your website and have form tracking enabled for your company in the CallRail application, this endpoint allows you programmatic access to those form submissions.

Listing All Form Submissions
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/form_submissions.json?fields=milestones"
The above command return JSON structured object like this:

{
    "page": 1,
    "per_page": 2,
    "total_pages": 75,
    "total_records": 150,
    "form_submissions": [
        {
            "id": "FOR8154748ae6bd4e278a7cddd38a662f4f",
            "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
            "person_id": "anonymous",
            "form_data": {
                "name": "Graham Armstrong",
                "email": "graham@example.com",
                "phone": "(999) 999-9999",
                "contact_method": "call",
                "best_time_to_call": "evening"
            },
            "form_url": "http://www.uptowndental.com/appointment",
            "landing_page_url": "http://www.uptowndental.com/appointment?campaign=back_to_school&keywords=pediatric%20dentist&gclid=12345abgdef",
            "referrer": "www.google.com",
            "referring_url": "www.google.com",
            "submitted_at": "2017-11-17T07:46:28.000Z",
            "first_form": false,
            "customer_phone_number": "+19999999999",
            "customer_name": "Graham Armstrong",
            "customer_email": "graham@example.com",
            "formatted_customer_phone_number": "999-999-9999",
            "formatted_customer_name": "Graham Armstrong",
            "source": "Google Ads",
            "keywords": "pediatric dentist",
            "campaign": "back_to_school",
            "medium": "CPC",
            "milestones": {
               "first_touch": {
                    "event_date": "2017-10-22T19:41:45.183-04:00",
                    "ad_position": null,
                    "campaign": "back_to_school",
                    "device": "desktop",
                    "keywords": "pediatric dentist",
                    "landing": "http://www.uptowndental.com/appointment?campaign=back_to_school&keywords=pediatric%20dentist&gclid=12345abgdef",
                    "landing_page_url_params": {
                         "campaign": "back_to_school",
                         "keywords": "pediatric dentist",
                         "gclid": "12345abgdef"
                    },
                    "match_type": null,
                    "medium": "cpc",
                    "referrer": "https://www.google.com/",
                    "referrer_url_params": {},
                    "session_browser": "Chrome",
                    "url_utm_params": {},
                    "source": "Google Ads"
               },
               "lead_created": {
                    "event_date": "2017-10-22T19:41:45.183-04:00",
                    "ad_position": null,
                    "campaign": "back_to_school",
                    "device": "desktop",
                    "keywords": "pediatric dentist",
                    "landing": "http://www.uptowndental.com/appointment?campaign=back_to_school&keywords=pediatric%20dentist&gclid=12345abgdef",
                    "landing_page_url_params": {
                         "campaign": "back_to_school",
                         "keywords": "pediatric dentist",
                         "gclid": "12345abgdef"
                    },
                    "match_type": null,
                    "medium": "cpc",
                    "referrer": "https://www.google.com/",
                    "referrer_url_params": {},
                    "session_browser": "Chrome",
                    "url_utm_params": {},
                    "source": "Google Ads"
                },
                "qualified": {
                    "event_date": "2017-10-22T19:41:45.183-04:00",
                    "ad_position": null,
                    "campaign": "back_to_school",
                    "device": "desktop",
                    "keywords": "pediatric dentist",
                    "landing": "http://www.uptowndental.com/appointment?campaign=back_to_school&keywords=pediatric%20dentist&gclid=12345abgdef",
                    "landing_page_url_params": {
                         "campaign": "back_to_school",
                         "keywords": "pediatric dentist",
                         "gclid": "12345abgdef"
                    },
                    "match_type": null,
                    "medium": "cpc",
                    "referrer": "https://www.google.com/",
                    "referrer_url_params": {},
                    "session_browser": "Chrome",
                    "url_utm_params": {},
                    "source": "Google Ads"
               },
               "last_touch": {
               "event_date": "2017-11-17T07:46:28.000-04:00",
               "ad_position": null,
               "campaign": null,
               "device": "desktop",
               "keywords": null,
               "landing": "https://www.example.com/",
               "landing_page_url_params": {},
               "match_type": null,
               "medium": "organic",
               "referrer": "https://www.google.com/",
               "referrer_url_params": {},
               "session_browser": "Chrome",
               "url_utm_params": {},
               "source": "Google Organic"
               }
          }
        },
        {
            "id": "FOR8154748ae6bd4e278a7cddd38a662f4f",
            "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
            "person_id": "PER8154748ae6bd4e278a7cddd38a662f4f",
            "form_data": {
                "name": "Veronica Auer",
                "email": "veronica.auer@example.com",
                "phone": "888-888-8888",
                "contact_method": "email",
                "best_time_to_call": "evening"
            },
            "form_url": "http://www.uptowndental.com/contact?network=g",
            "landing_page_url": "http://www.uptowndental.com/pricing?network=g",
            "referrer": "google_organic",
            "referring_url": "http://www.google.com/url",
            "submitted_at": "2017-12-02T12:30:09.000Z",
            "first_form": false,
            "customer_phone_number": "+18888888888",
            "customer_name": "Veronica Auer",
            "customer_email": "veronica.auer@example.com",
            "formatted_customer_phone_number": "888-888-8888",
            "formatted_customer_name": "Veronica Auer",
            "source": "Google Organic",
            "keywords": null,
            "campaign": null,
            "medium": "organic",
            "milestones": {
               "first_touch": {
                    "event_date": "2017-10-22T19:41:45.183-04:00",
                    "ad_position": null,
                    "campaign": null,
                    "device": "desktop",
                    "keywords": null,
                    "landing": "http://www.uptowndental.com/pricing?network=g",
                    "landing_page_url_params": {
                         "network": "g"
                    },
                    "match_type": null,
                    "medium": "organic",
                    "referrer": "https://www.google.com/",
                    "referrer_url_params": {},
                    "session_browser": "Chrome",
                    "url_utm_params": {},
                    "source": "Google Organic"
               },
               "lead_created": {
                    "event_date": "2017-10-22T19:41:45.183-04:00",
                    "ad_position": null,
                    "campaign": null,
                    "device": "desktop",
                    "keywords": null,
                    "landing": "http://www.uptowndental.com/pricing?network=g",
                    "landing_page_url_params": {
                         "network": "g"
                    },
                    "match_type": null,
                    "medium": "organic",
                    "referrer": "https://www.google.com/",
                    "referrer_url_params": {},
                    "session_browser": "Chrome",
                    "url_utm_params": {},
                    "source": "Google Organic"
                },
                "qualified": {
                    "event_date": null,
                    "ad_position": null,
                    "campaign": null,
                    "device": null,
                    "keywords": null,
                    "landing": null,
                    "landing_page_url_params": {},
                    "match_type": null,
                    "medium": null,
                    "referrer": null,
                    "referrer_url_params": {},
                    "session_browser": null,
                    "url_utm_params": {},
                    "source": null
               },
               "last_touch": {
               "event_date": "2017-12-02T12:30:09.000-04:00",
               "ad_position": null,
                    "campaign": null,
                    "device": "desktop",
                    "keywords": null,
                    "landing": "http://www.uptowndental.com/pricing?network=g",
                    "landing_page_url_params": {
                         "network": "g"
                    },
                    "match_type": null,
                    "medium": "organic",
                    "referrer": "https://www.google.com/",
                    "referrer_url_params": {},
                    "session_browser": "Chrome",
                    "url_utm_params": {},
                    "source": "Google Organic"
               }
          }
        }
    ]
}
This endpoint returns a paginated array of all form submissions associated with the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/form_submissions.json
Request Parameters
This endpoint supports Offset Pagination, Sorting, Filtering, and Field Selection

Sorting is available for the following fields:

created_at: NOTE this field will be deprecated as a sortable field in the future. We recommend migrating to use the ‘submitted_at’ field.

submitted_at

form_url

Filtering is available for the following categories:

date_range: See Filtering by Date for more info.

company_id: any valid company id for which you have access

person_lead: set this to true to return only form submissions that have a lead associated with them

lead_status: good_lead, not_a_lead, or not_scored

tags: This parameter can be provided as tags=A for a single tag, or tags[]=A&tags[]=B to return forms tagged with either tag A or tag B.

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the form submission.
company_id	string	Unique identifier for the company associated with the form submission.
person_id	string	Unique identifier for the person associated with the form submission.
form_data	object	Object that captures all of the form fields and values
form_url	string	The URL that the form was submitted to
landing_page_url	string	The URL that the user landed on from the referring entity
referrer	string	Name of the referring entity, e.g. google_paid.
referring_url	string	URL for the referring entity
submitted_at	timestamp	Server time when the form was submitted. This is assigned by the CallRail app.
first_form	boolean	Indicates whether this is the first form submitted from a person.
customer_phone_number	string	The customer’s phone number (in E.164 format).
customer_name	string	The customer’s name.
customer_email	string	The customer’s email.
formatted_customer_phone_number	string	The customer’s phone number formatted for display.
formatted_customer_name	string	The customer’s name with certain values stylized for display.
source	string	The marketing source that led to the form submission.
keywords	string	The keywords the visitor searched for. Keywords only provided from paid ad sources.
campaign	string	The name of the campaign the form submission belongs to.
medium	string	“PPC” or “Organic”.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
company_name	string	The name of the company the form submission belongs to.
lead_status	string	The current lead status for the form submission. One of good_lead, not_a_lead, previously_marked_good_lead, or null.
value	integer	A number representing the monetary value of this form.
note	string	Note associated with the form submission.
tags	array	Array of tags that have been applied to the form submission.
utm_source	string	utm_source as captured from the landing page parameter.
utm_medium	string	utm_medium as captured from the landing page parameter.
utm_campaign	string	utm_campaign as captured from the landing page parameter.
form_name	string	The name of the Custom Form responsible for the form capture, where applicable.
timeline_url	string	A link to the lead’s timeline, which displays the web sessions and touchpoints a lead had on your website before, during, and after submitting a form. For more information, see our support article on Caller Timelines.
milestones	object	An object describing the attribution data associated with the lead’s milestones. For more information, see our support article on Attribution Modeling.
milestones: first_touch	object	Automatically included when you request the milestones object. The First Touch milestone is the first time a customer engages with your company. For example, if they click a PPC ad that takes them to a landing page or they are called by a sales representative on your team. This is the first time a customer interacts with your company.
milestones: lead_created	object	Automatically included when you request the milestones object. The Lead Creation milestone is the last source before a customer calls, texts, or submits a form and becomes known to your business as a new lead. For example, if a customer clicks on one of your Google Ads PPC ads and then submits a form on your landing page, their Lead Creation milestone would be that PPC ad because it caused them to submit a form.
milestones: qualified	object	Automatically included when you request the milestones object. The Qualified milestone is the last source before a customer becomes scored as a qualified lead.
milestones: last_touch	object	Automatically included when you request the milestones object. The Last Touch milestone is the last source before the current action. For example, if a customer clicks on a Google PPC add and then calls the tracking number on your website, and then later navigates back to your website via the Google search results page and submits a form, their First Touch source would be Google Ads and the Last Touch source for their form submission would be Google Organic.
Creating a form submission
curl -H "Authorization: Token token={api_token}" \
       -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "form_submission": {
            "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
            "referrer": "wikipedia_link",
            "referring_url": "wikipedia.org/wiki/Carmen_Sandiego",
            "landing_page_url": "missingmonuments.com/info",
            "form_url": "missingmonuments.com/report/new",
            "session_id": "SES8154748ae6bd4e278a7cddd38a662f4f",
            "form_data": {
              "phone_number": "5555555555",
              "report": "Carmen stole the Liberty Bell.",
              "last_sighting": "Near Washington D.C."
            }
          }
        }' \
        "https://api.callrail.com/v3/a/{account_id}/form_submissions.json"
The above command returns JSON structured object like this:

{
        "id": "FOR8154748ae6bd4e278a7cddd38a662f4f",
        "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "person_id": "PER8154748ae6bd4e278a7cddd38a662f4f",
    "form_data": {
        "phone_number": "5555555555",
        "report": "Carmen stole the Liberty Bell.",
        "last_sighting": "Near Washington D.C."
    },
    "form_url": "missingmonuments.com/report/new",
    "landing_page_url": "missingmonuments.com/info",
    "referrer": "wikipedia_link",
    "referring_url": "wikipedia.org/wiki/Carmen_Sandiego",
    "submitted_at": "2018-02-13T17:03:33.018Z",
    "first_form": false
}
You can use the API to create form submissions for a given company. The app will attempt to parse out any phone numbers in the form data, and use that phone number to create or find a customer to associate with the form submission.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/form_submissions.json
Request Body
Name	Type	Required?	Description
company_id	string	required	Unique identifier for the company associated with the form submission.
referrer	string	required	Name of the referring entity, e.g. google_paid.
referring_url	string	required	URL for the referring entity
landing_page_url	string	required	The page that user landed on from the referring entity
form_url	string	required	The URL that the form was submitted to
form_data	object	required	Object that captures all of the form fields and values
session_id	string	optional	Unique identifier for the session related to the form submission. A session_id can be provided instead of the referrer, referring_url, and landing_page_url
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	string	Unique identifier for the form submission.
company_id	string	Unique identifier for the company associated with the form submission.
person_id	string	Unique identifier for the person associated with the form submission.
form_data	object	Object that captures all of the form fields and values
form_url	string	The URL that the form was submitted to
landing_page_url	string	The page that user landed on from the referring entity
referrer	string	Name of the referring entity, e.g. google_paid.
referring_url	string	URL for the referring entity
submitted_at	timestamp	Server time when the form was submitted. This is assigned by the CallRail app.
first_form	boolean	Indicates whether this is the first form submitted from a person.
Updating a Form Submission
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -v \
     -d '{
           "note": "Call customer back tomorrow",
           "tags": ["New Client"],
           "lead_status": "good_lead",
           "value": "$1.00",
           "append_tags": true
           }' \
        "https://api.callrail.com/v3/a/{account_id}/form_submissions/{form_submission_id}.json"
The above command returns JSON structured object like this:

{
        "id": "FOR8154748ae6bd4e278a7cddd38a662f4f",
        "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "person_id": "PER8154748ae6bd4e278a7cddd38a662f4f",
    "form_data": {
        "phone_number": "5555555555",
        "report": "Carmen stole the Liberty Bell.",
        "last_sighting": "Near Washington D.C."
    },
    "form_url": "missingmonuments.com/report/new",
    "landing_page_url": "missingmonuments.com/info",
    "referrer": "wikipedia_link",
    "referring_url": "wikipedia.org/wiki/Carmen_Sandiego",
    "submitted_at": "2018-02-13T17:03:33.018Z",
    "first_form": false
}
This endpoint updates a form submission object in the target account. You can use the API to add a Tag or a Note to a form submission, to set the form submission’s lead status, or to add a monetary value to the form submission.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/form_submissions/{form_submission_id}.json
Request Body
When updating a form submission, the following fields may be included in the request body. If a field is not included, its value will not be changed. If it is included but is null or a blank string, the field will be cleared.

Name	Type	Required?	Description
tags	array	optional	Array of tag names to associate with this form submission. See the documentation for Tag. New tags will be created if the request contains a tag that doesn’t exist in the company currently.
note	string	optional	Any text notes to associate with this form submission.
value	string	optional	A number representing the monetary value of this form submission. This can be formatted with or without a dollar sign. Both “$1.00” and “1.00” are acceptable.
lead_status	string	optional	A string representing a valid lead status. One of "good_lead", "not_a_lead", or null. If a form submission has a lead status of "previously_marked_good_lead", attempting to set the lead_status to "good_lead" will result in a 400 error.
append_tags	boolean	optional	When set to true, any tags passed in the parameters will be added to the tags already present on the form submission. When set to false or not specified, any tags passed in the parameters will replace tags already present on the form submission.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the form submission.
company_id	string	Unique identifier for the company associated with the form submission.
person_id	string	Unique identifier for the person associated with the form submission.
form_data	object	Object that captures all of the form fields and values
form_url	string	The URL that the form was submitted to
landing_page_url	string	The page that user landed on from the referring entity
referrer	string	Name of the referring entity, e.g. google_paid.
referring_url	string	URL for the referring entity
submitted_at	timestamp	Server time when the form was submitted. This is assigned by the CallRail app.
first_form	boolean	Indicates whether this is the first form submitted from a person.
customer_phone_number	string	The customer’s phone number (in E.164 format).
customer_name	string	The customer’s name, as reported by Caller ID.
formatted_customer_phone_number	string	The customer’s phone number formatted for display.
formatted_customer_name	string	The customer’s name with certain values stylized for display.
source	string	The marketing source that led to the form submission.
keywords	string	The keywords the visitor searched for. Keywords only provided from paid ad sources.
campaign	string	The name of the campaign the form submission belongs to.
medium	string	The medium associated with the form submission. Most commonly “PPC”, “direct”, or “Organic”.
Ignoring Form Fields
CallRail’s Form Tracking product will automatically exclude sensitive information, and we don’t capture or store passwords or credit card information in your form submissions or our database.

If there are other specific fields on your form that you’d like us to exclude, this endpoint allows you to create form fields that will be ignored for future form submissions, as well as retroactively removing the ignored fields from previous form submissions.

 After creating an ignored field, removing the field from past form submissions is processed as a background job. It may take a few mintues to update all past form submissions for all companies affected.
curl -H "Authorization: Token token={api_token}" \
       -X POST \
     -H "Content-Type: application/json" \
     -d '{
           "company_ids": ["COM8154748ae6bd4e278a7cddd38a662f4f", "COM0392748ae6bd4e278a7cddd38b254a2a"],
           "field_names": ["field_1", "field_2"]
        }' \
        "https://api.callrail.com/v3/a/{account_id}/form_submissions/ignored_fields.json"
The above command returns JSON structured object like this:

{
  "message": "Ingored form fields created"
}
API Endpoint
Method	URL
POST	/v3/a/{account_id}/form_submissions/ignored_fields.json
Request Body
Name	Type	Required?	Description
company_ids	array	required	List of string company ids to configure the ignored fields for. Passing ["all"] instead of ids will apply the ignored fields to all companies in the target account
field_names	array	required	List of field names to ignore when capturing form submissions
Summarizing Form Data
curl -H "Authorization: Token token=abc1234" \
  https://api.callrail.com/v3/a/{account_id}/forms/summary.json?fields=total_forms,first_forms,leads&group_by=source
The above command returns JSON structured like this:

{
   "start_date":"2019-10-23T00:00:00+0000",
   "end_date":"2019-11-22T23:59:59+0000",
   "time_zone":"UTC",
   "total_results":{
      "total_forms":160,
      "first_forms":19,
      "leads":46
   },
   "grouped_by":"source",
   "grouped_results":[
      {
         "key":"direct",
         "total_forms":130,
         "first_forms":15,
         "leads":40
      },
      {
         "key":"google_paid",
         "total_forms":30,
         "first_forms":4,
         "leads":6
      }
   ]
}
Return summarized Form data for an Agency or for a Company. This Form Summary data can be limited to a specific date range, can be filtered based on a variety of criteria, and can be grouped by source, keywords, campaign, referrer, landing_page, form_name or company. Grouping by company is only available when using the account-level endpoint.

API Endpoints
Method	URL
GET	/v3/a/{account_id}/forms/summary.json
Request Parameters
Name	Type	Required?	Description
company_id	string	optional	Accepts a Company ID. If provided, show results for forms to a single Company.
group_by	string	optional	If provided, group call summary data by specific characteristic. One of source, keywords, campaign, referrer, landing_page, form_name or company (Note: company is only available for the Agency-level endpoint)
fields	string	optional	Specify which data to return in request. Comma-separated list of the following: total_forms, first_forms, leads. Defaults to total_forms
tags	string	optional	If provided, only return forms that have had the given tag applied. This parameter can be provided as one or more comma-separated values tags=A,B for a single tag, or one or more array parameters tags[]=A&tags[]=B.
custom_form_ids	string	optional	If provided, only return forms made to specific custom forms. This parameter can be provided as one or more comma-separated values custom_form_ids=FORca9e613babbb48b5b984a8732a25d1f8,FORca0e724babbb59b5b984a8733a36d2f0, or one or more array parameters custom_form_ids[]=FORca9e613babbb48b5b984a8732a25d1f8&custom_form_ids[]=FORca0e724babbb59b5b984a8733a36d2f0.
form_URL	string	optional	The URL the form was submitted to.
lead_status	string	optional	Specify results that match a specific Lead Status. One of good_lead, not_a_lead, not_scored.
Date Request Parameters
See Filtering by Date for more info

Response Fields
Name	Type	Description
total_results	object	A JSON object containing total counts of requested summary data. Summary count fields are listed below in the “Summary Data Response Fields” table.
grouped_by	string	If provided, this field contains the group_by value passed into the initial request for summary data.
grouped_results	array	An array of JSON objects containing total counts of requested summary data, grouped by the group_by parameter. Summary count fields are listed below in the “Summary Data Response Fields” table.
Summary Data Response Fields
Name	Type	Description
total_forms	number	Total number of forms in summary criteria range.
first_forms	number	Total number of form submissions that were first time form submissions in summary criteria range.
leads	number	Total number of forms that were marked as ‘leads’ in summary criteria range.
Integrations
An integration in CallRail is a resource that can be used to facilitate communication between CallRail and third-party services.
The Listing All Integrations and Retrieving a Single integration endpoints will return all relevant integrations. When creating and/or updating an integration using the Creating an integration and/or Updating an Integration endpoints, the only 2 types that are supported are webhooks and custom. Other integration types require authorization via OAuth/login and/or the population of configuration data that is best collected in the application UI.

Customers can utilize ‘Webhook’ integrations to send data from CallRail to outside sources, and ‘Custom’ integrations to capture custom cookie data from web visitors and associate it with calls in CallRail. You can learn more in our support documentation for Webhooks and Custom Cookie Capture. A single company in CallRail can have one of each integration type.

Listing All Integrations
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/integrations.json?company_id=213472384"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 3,
  "integrations": [
    {
      "id": 5,
      "config": {
        "api_key": "12345"
      },
      "state": "disabled",
      "type": "GoogleAnalytics"
    },
    {
      "id": 10,
      "config": {
        "api_key": "12345"
      },
      "state": "active",
      "type": "Slack"
    },
    {
      "id": 4,
      "config": {
        "pre_call_webhook": ["http://example.com/webhook.php"]
      },
      "state": "active",
      "type": "Webhooks"
    }
  ]
}
This endpoint returns a paginated array of all Integrations within the target company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/integrations.json
Request Parameters
This endpoint supports Offset Pagination.

Name	Type	Required?	Description
company_id	string	required	Ensures results contain integrations belonging to a single company.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the integration object.
type	string	The type of integration represented by the object.
state	string	The current state of the integrations. One of “active”, “disabled”, “pending”, or “failed”.
config	object	An object containing specific information about the configuration for the integration. The contents of this object will vary depending on the integration type.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
signing_key	string	If the integration type is Webhooks, the signing_key field will be included in the payload. This contains the secret token to be used in validating payloads as described in Webhooks Security.
Retrieving a Single Integration
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/integrations/{integration_id}.json"
The above command returns JSON structured object like this:

{
  "id": 4,
  "config": {
    "pre_call_webhook": ["http://example.com/webhook.php"]
  },
  "state": "active",
  "type": "Webhooks"
}
This endpoint returns a single Integration object in the target company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/integrations/{integration_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the integration object.
type	string	The type of integration represented by the object.
state	string	The current state of the integrations. One of “active”, “disabled”, “pending”, or “failed”.
config	object	An object containing specific information about the configuration for the integration. The contents of this object will vary depending on the integration type.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
signing_key	string	If the integration type is Webhooks, the signing_key field will be included in the payload. This contains the secret token to be used in validating payloads as described in Webhooks Security.
Creating an Integration
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "type": "Webhooks",
          "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
          "config": {
            "pre_call_webhook": ["http://example.com/webhook.php"]
          }
        }' \
         "https://api.callrail.com/v3/a/{account_id}/integrations.json"
The above command returns JSON structured object like this:

{
  "id": 4,
  "type": "Webhooks",
  "state": "active",
  "config": {
    "pre_call_webhook": ["http://example.com/webhook.php"]
  },
  "signing_key": "5f3d3ebe065cd800b8c154347437e958"
}
You can use the API to create and activate a new instance of an integration for a company. A company may only have a single integration of a given type. Currently the only types that can be created via the API are ‘Webhooks’ and ‘Custom’ integrations. Other integration types require authorization via OAuth/login and/or the population of configuration data that is best collected in the application UI, so they are not supported in this endpoint.

Customers can utilize ‘Webhook’ integrations to send data from CallRail to outside sources, and ‘Custom’ integrations to capture custom cookie data from web visitors and associate it with calls in CallRail. You can learn more in our support documentation for Webhooks and Custom Cookie Capture. A single company in CallRail can have one of each integration type.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/integrations.json
Request Body
Name	Type	Description
company_id	string	Unique identifier for the integration object.
type	string	The type of integration represented by the object. One of “Webhooks” or “Custom”.
config	object	An object containing specific information about the configuration for the integration. The contents of this object will vary depending on the integration type. See the documentation for Integration Configuration.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	integer	Unique identifier for the integration object.
type	string	The type of integration represented by the object.
state	string	The current state of the integrations. One of “active”, “disabled”, “pending”, or “failed”.
config	object	An object containing specific information about the configuration for the integration. The contents of this object will vary depending on the integration type.
signing_key	string	If the integration type is Webhooks, the signing_key field will be included in the payload. This contains the secret token to be used in validating payloads as described in Webhooks Security. Please store this value for future use.
Updating an Integration
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
          "state": "active",
          "config": {
            "pre_call_webhook": ["http://example.com/webhook.php"]
          }
         }' \
         "https://api.callrail.com/v3/a/{account_id}/integrations/{integration_id}.json"
The above command activates an existing integration and updates the configuration.

{
  "id": 4,
  "config": {
    "pre_call_webhook": ["http://example.com/webhook.php"]
  },
  "state": "active",
  "type": "Webhooks"
}
You can use the API to update an instance of an integration for a company. A company may only have a single integration of a given type. Currently, the only types that can be created and updated via the API are ‘Webhooks’ and ‘Custom’ integrations. Other integration types require authorization via OAuth/login and/or the population of configuration data that is best collected in the application UI, so they are not supported in this endpoint.

Customers can utilize ‘Webhook’ integrations to send data from CallRail to outside sources, and ‘Custom’ integrations to capture custom cookie data from web visitors and associate it with calls in CallRail. You can learn more in our support documentation for Webhooks and Custom Cookie Capture. A single company in CallRail can have one of each integration type.

API Endpoint
Method	URL
PUT	v3/a/{account_id}/integrations/{integration_id}.json
Request Body
Name	Type	Description
state	string	A valid integration state. One of “active”, or “disabled”.
config	object	An object containing specific information about the configuration for the integration. The contents of this object will vary depending on the integration type. See the documentation for Integration Configuration.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the integration object.
type	string	The type of integration represented by the object.
state	string	The current state of the integrations. One of “active”, “disabled”, “pending”, or “failed”.
config	object	An object containing specific information about the configuration for the integration. The contents of this object will vary depending on the integration type.
Disabling an Integration
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/integrations/{integration_id}.json"
The above command does not return any response data.

This endpoint disables an Integration object in the target company.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/integrations/{integration_id}.json
Response Fields
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

Configuring Integrations
Integration Configuration Object
Each Integration type has it’s own specific configuration format. When creating or updating an integration via the API, you should provide the appropriate configuration format for that integration type.

Webhook Configuration Object
When creating a Webhooks Integration, the fields below may be provided in the config object. Each field accepts an array of valid URLs.

Example: [“https://example.com/pre-call.php”, “http://zapier.com/zaps/123”]

Name	Type	Required?	Description
pre_call_webhook	array	optional	List of URLs to be notified for the Pre-Call event.
answered_call_webhook	array	optional	List of URLs to be notified for the Call Routing Complete event.
post_call_webhook	array	optional	List of URLs to be notified for the Post-Call event.
updated_call_webhook	array	optional	List of URLs to be notified for the Call Modified event.
sms_received_webhook	array	optional	List of URLs to be notified for the Text Message Received event.
sms_sent_webhook	array	optional	List of URLs to be notified for the Text Message Sent event.
form_captured_webhook	array	optional	List of URLs to be notified for the Form Submission event.
post_outbound_call_webhook	array	optional	List of URLs to be notified for the Outbound Post-Call event.
updated_outbound_call_webhook	array	optional	List of URLs to be notified for the Outbound Call Modified event.
Custom Cookie Capture Object
When creating a Custom Cookie Capture Integration, the field below should be provided in the config object. This field accepts an array of cookie names.

Example: [“_ga”, “mycookie31”]

Name	Type	Required?	Description
grab_cookies	array	required	List of cookie names to associate with user sessions.
Integration Filters
Integration filters are criteria that can be applied to integrations to limit the kinds of data or events that are shipped to third-party services. For more details, see our support documentation.

For more details on the integrations we offer and how they work, see the API docs or our support documentation.

Each integration can have a single associated integration filter. Since integration filters reduce or scope the data for external integrations, they must be associated with an existing active integration. Accordingly, the integration will be sideloaded when displaying the integration filters as JSON.

An optional default integration filter can be defined for a company. This default filter applies to all integrations that do not have a specific integration filter defined. If an integration filter is specified for an integration, it will override the default filter settings for that integration.

The individual attributes of integration filter are additive. Creating a filter for first calls longer than 10s will only trigger integrations for calls that match both attributes. A null value on an integration filter attribute indicates that attribute is not being used as a filter criteria.

Listing All Integration Filters
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/integration_triggers.json?company_id=213472384"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 3,
  "integration_criteria": [
    {
      "id": 2,
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "integration_id": null,
      "tracker_ids": [],
      "call_type": null,
      "min_duration": null,
      "max_duration": null,
      "lead_status": 1,
      "integration": {
        "id": null,
        "type": "All (Default Integration Trigger)"
      }
    },
    {
      "id": 26,
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "integration_id": 219,
      "tracker_ids": ["TRK8154748ae6bd4e278a7cddd38a662d5d"],
      "call_type": null,
      "min_duration": 1,
      "max_duration": 11,
      "lead_status": null,
      "integration": {
        "id": 219,
        "type": "Custom"
      }
    },
    {
      "id": 34,
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "integration_id": 247,
      "tracker_ids": ["TRK8154748ae6bd4e278a7cddd38a662f4f"],
      "call_type": "first_call",
      "min_duration": 3,
      "max_duration": null,
      "lead_status": null,
      "integration": {
        "id": 247,
        "type": "Webhooks"
      }
    }
  ]
}
This endpoint returns a paginated array of all the integration filters and their associated integrations.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/integration_triggers.json
Request Parameters
This endpoint supports Offset Pagination.

Name	Type	Required?	Description
company_id	string	required	Ensures results contain integration filters and integrations belonging to a single company.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the integration filter object.
company_id	string	The unique ID for the company associated with the integration filter.
integration_id	integer	The unique ID for the integration associated with the integration filter.
tracker_ids	array(strings)	The list of tracker IDs the integration filter is scoped to, if applicable.
call_type	string	The type of calls which will activate the integration filter. Can be one of: null, first_call, vm, missed_and_vm, where vm indicates voicemail.
min_duration	integer	The minimum duration in seconds that will activate the integration filter.
max_duration	integer	The maximum duration in seconds that will activate the integration filter.
lead_status	integer	The lead status that will activate the integration filter. Can be either good_lead or not_a_lead.
integration	object	An object describing the attributes of the integration associated with the integration filter.
Creating an Integration Filter
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
          "integration_id": 219,
          "tracker_ids": ["TRK8154748ae6bd4e278a7cddd38a662d5d"],
          "call_type": null,
          "min_duration": 1,
          "max_duration": 11,
          "lead_status": null,
          }
        }' \
         "https://api.callrail.com/v3/a/{account_id}/integration_triggers.json"
The above command returns a JSON object like this:

{
  "id": 34,
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "integration_id": 219,
  "tracker_ids": ["TRK8154748ae6bd4e278a7cddd38a662d5d"],
  "call_type": "first_call",
  "min_duration": 3,
  "max_duration": null,
  "lead_status": null,
  "integration": {
    "id": 219,
    "type": "Webhooks"
  }
}
You can use the API to create a single integration filter for each integration. Not every type of integration can be configured with a filter; the API will return a helpful error in those cases indicating the incompatibility.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/integration_triggers.json
Request Body
Name	Type	Description
company_id	string	The unique ID for the company associated with the integration filter.
integration_id	integer	The unique ID for the integration associated with the integration filter.
tracker_ids	array(strings)	The list of tracker IDs the integration filter is scoped to, if applicable.
call_type	string	The type of calls which will activate the integration filter. Can be one of: null, first_call, vm, missed_and_vm. (vm => voicemail)
min_duration	integer	The minimum duration in seconds that will activate the integration filter.
max_duration	integer	The maximum duration in seconds that will activate the integration filter.
lead_status	integer	The lead status that will activate the integration filter. Can be either good_lead or not_a_lead.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	string	Unique identifier for the integration filter object.
company_id	string	The unique ID for the company associated with the integration filter.
integration_id	integer	The unique ID for the integration associated with the integration filter.
tracker_ids	array(strings)	The list of tracker IDs the integration filter is scoped to, if applicable.
call_type	string	The type of calls which will activate the integration filter. Can be one of: null, first_call, vm, missed_and_vm, where vm indicates voicemail.
min_duration	integer	The minimum duration in seconds that will activate the integration filter.
max_duration	integer	The maximum duration in seconds that will activate the integration filter.
lead_status	integer	The lead status that will activate the integration filter. Can be either good_lead or not_a_lead.
integration	object	An object describing the attributes of the integration associated with the integration filter.
The API will return 400 Bad Request with a helpful message if a integration filter already exists when attempting to create a new filter for a given integration.

Retrieving a Single Integration Filter
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/integration_triggers/{integration_trigger_id}.json"
The above command returns JSON structured object like this:

{
      "id": 34,
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "integration_id": 247,
      "tracker_ids": ["TRK8154748ae6bd4e278a7cddd38a662d5d"],
      "call_type": "first_call",
      "min_duration": 3,
      "max_duration": null,
      "lead_status": null,
      "integration": {
        "id": 247,
        "type": "Webhooks"
      }
    }
This endpoint returns a single integration filter object in the target company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/integration_triggers/{integration_triggers_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the integration filter object.
company_id	string	The unique ID for the company associated with the integration filter.
integration_id	integer	The unique ID for the integration associated with the integration filter.
tracker_ids	array(strings)	The list of tracker IDs the integration filter is scoped to, if applicable.
call_type	string	The type of calls which will activate the integration filter. Can be one of: null, first_call, vm, missed_and_vm, where vm indicates voicemail.
min_duration	integer	The minimum duration in seconds that will activate the integration filter.
max_duration	integer	The maximum duration in seconds that will activate the integration filter.
lead_status	integer	The lead status that will activate the integration filter. Can be either good_lead or not_a_lead.
integration	object	An object describing the attributes of the integration associated with the integration filter.
Updating an Integration Filter
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
          "call_type": "vm",
          "min_duration": 10
         }' \
         "https://api.callrail.com/v3/a/{account_id}/integration_triggers/{integration_trigger_id}.json"
The above command updates an existing integration filter

{
  "id": 34,
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "integration_id": 219,
  "tracker_ids": ["TRK8154748ae6bd4e278a7cddd38a662d5d"],
  "call_type": "vm",
  "min_duration": 10,
  "max_duration": null,
  "lead_status": null,
  "integration": {
    "id": 219,
    "type": "Webhooks"
  }
}
API Endpoint
Method	URL
PUT	v3/a/{account_id}/integration_triggers/{integration_trigger_id}.json
Request Body
Name	Type	Description
tracker_ids	array(strings)	The integration filter is scoped to the tracker ids present in this array.
call_type	string	The type of calls which will activate the integration filter. Can be one of: null, first_call, vm, missed_and_vm. (vm => voicemail)
min_duration	string	The minimum duration in seconds that will activate the integration filter.
max_duration	string	The maximum duration in seconds that will activate the integration filter.
lead_status	integer	The lead status that will activate the integration filter. Can be either good_lead or not_a_lead.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the integration filter object.
company_id	string	The unique ID for the company associated with the integration filter.
integration_id	integer	The unique ID for the integration associated with the integration filter.
tracker_ids	array(strings)	The list of tracker IDs the integration filter is scoped to, if applicable.
call_type	string	The type of calls which will activate the integration filter. Can be one of: null, first_call, vm, missed_and_vm, where vm indicates voicemail.
min_duration	integer	The minimum duration in seconds that will activate the integration filter.
max_duration	integer	The maximum duration in seconds that will activate the integration filter.
lead_status	integer	The lead status that will activate the integration filter. Can be either good_lead or not_a_lead.
integration	object	An object describing the attributes of the integration associated with the integration filter.
Deleting an Integration Filter
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/integration_triggers/{integration_trigger_id}.json"
The above command does not return any response data.

This endpoint deletes an integration filter object in the target company. The integration will continue to function as configured, without any filtering of call records.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/integration_triggers/{integration_triggers_id}.json
Response Fields
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

Notifications
The notifications endpoint configures user alerts sent on incoming calls and text messages. Each notification record is set for a specific user, and is limited to either a specific tracker, all trackers in a company, or all trackers in the target account. Each record indicates if it is active for calls, text messages, or both. Finally, each record indicates one or more notification channels: email, push notifications to mobile devices, or browser-based desktop notifications.

For notification records configured for calls, the alerts can be further filtered by type of call. Users can opt to receive notifications for all calls, only for first-time callers, only for voicemails, or for voicemails and missed calls.

Listing All Notifications
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     -d '{
          "user_id" : "USR8154748ae6bd4e278a7cddd38a662f4f"
        }' \
        "https://api.callrail.com/v3/a/{account_id}/notifications.json"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 2,
  "notifications": [
    {
      "id": 100,
      "user_id": "USR8154748ae6bd4e278a7cddd38a662f4f",
      "alert_type": "all",
      "call_enabled": true,
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "name": "All Calls and All Texts for Katherine's Ice Cream",
      "send_desktop": false,
      "send_email": true,
      "send_push": false,
      "sms_enabled": true,
      "tracker_id": null
    },
    {
      "id": 101,
      "user_id": "USR8154748ae6bd4e278a7cddd38a662f4f",
      "alert_type": "all",
      "call_enabled": true,
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "name": "All Calls and All Texts for Google Organic",
      "send_desktop": false,
      "send_email": true,
      "send_push": true,
      "sms_enabled": true,
      "tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f"
    }
  ]
}
This endpoint returns a paginated array of notifications within the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/notifications.json
Request Parameters
This endpoint supports Offset Pagination.

Filtering is available for the following:

notification_type: send_desktop, send_email, or send_push
Request Body
Name	Type	Required?	Description
user_id	string	optional	List notifications for the specified user.
email	string	optional	List notifications for the specified email-only user.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	number	Unique identifier for the notification.
user_id	string	Unique identifier for the user configured to receive these notifications.
email	string	Email address for the email-only user configured to receive these notifications.
alert_type	string	When call alerts are enabled, applies a filter for alerts based on call type. One of “all”, “first_call”, “missed_and_vm”, “vm_only”.
call_enabled	boolean	Whether or not call alerts are enabled.
company_id	string	This notification is limited to this specific company. If null, this notification applies for all companies within the account.
name	string	Describes the configuration setup of the notification.
send_desktop	boolean	Whether or not the notifications will be sent via the desktop web application.
send_email	boolean	Whether or not the notifications will be sent via email.
send_push	boolean	Whether or not the notifications will be sent via mobile push notification.
sms_enabled	boolean	Whether or not alerts are enabled for incoming text messages.
tracker_id	string	This notification is limited to this specific tracker. If null, this notification applies for all trackers.
Creating a Notification
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "user_id": "USR8154748ae6bd4e278a7cddd38a662f4f",
          "tracker_id" : "TRK8154748ae6bd4e278a7cddd38a662f4f",
          "send_email" : true,
          "send_push" : true,
          "send_desktop" : true,
          "alert_type" : "vm_only",
          "sms_enabled" : true,
          "call_enabled" : true
        }' \
        "https://api.callrail.com/v3/a/{account_id}/notifications.json"
The above command returns JSON structured object like this:

{
  "id": 127,
  "user_id": "USR8154748ae6bd4e278a7cddd38a662f4f",
  "alert_type": "vm_only",
  "call_enabled": true,
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "company_name": "Katherine's Ice Cream",
  "send_desktop": true,
  "send_email": true,
  "send_push": true,
  "sms_enabled": true,
  "tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "tracker_name": "Google Organic"
}
Creating a notification configures an alert to be sent to the specified user for specific events within CallRail. Users can configure as many notifications as necessary using the available filtering and configuration options provided.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/notifications.json
Request Body
Name	Type	Required?	Description
user_id	string	Optional	Indicates the user to receive these notifications. If neither an email or user_id is specified in the request, the notification will be assigned to the authorized user.
email	string	Optional	Indicates the email-only user to receive these notifications. If the notification is being created for an email-only user, a company_id or tracker_id must also be specified and only a type of send_email is allowed. If neither an email or user_id is specified in the request, the notification will be assigned to the authorized user.
agent_id	string	Optional	Limit this notification to calls/sms to the specified agent. If not specified, this notification is not limited by agent. This field does not assign the notification to the agent. To assign a notification to a specific user, use the user_id field.
company_id	string	Optional	Limit this notification to the specified company. If not specified, this notification is not limited by company.
tracker_id	string	Optional	Limit this notification to the specified tracker. If not specified, this notification is not limited by tracker.
call_enabled	boolean	Optional	Whether or not notifications are enabled for incoming calls. When enabled, alert_type becomes required.
sms_enabled	boolean	Optional	Whether or not notifications are enabled for incoming text messages.
alert_type	string	Optional	Selects the type of call that triggers this notification. One of “all”, “first_call”, “missed_and_vm”, “vm_only”. Required when call_enabled is true.
send_desktop	boolean	Optional	Whether or not notifications will be sent via the desktop web application.
send_email	boolean	Optional	Whether or not notifications will be sent via email.
send_push	boolean	Optional	Whether or not notifications will be sent via mobile push notification.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	number	Unique identifier for the notification.
user_id	string	Unique identifier for the user configured to receive these notifications.
email	string	Email address for the email-only user configured to receive these notifications.
agent_id	string	This notification is limited to calls/sms to this specific agent. If null, this notification applies for all agents.
agent_name	string	Name of the agent, if specified.
alert_type	string	When call alerts are enabled, applies a filter for alerts based on call type. One of “all”, “first_call”, “missed_and_vm”, “vm_only”.
call_enabled	boolean	Whether or not call alerts are enabled.
company_id	string	This notification is limited to this specific company. If null, this notification applies for all companies within the account.
company_name	string	Name of the configured company, if specified.
name	string	Describes the configuration setup of the notification.
send_desktop	boolean	Whether or not the notifications will be sent via the desktop web application.
send_email	boolean	Whether or not the notifications will be sent via email.
send_push	boolean	Whether or not the notifications will be sent via mobile push notification.
sms_enabled	boolean	Whether or not alerts are enabled for incoming text messages.
tracker_id	string	This notification is limited to this specific tracker. If null, this notification applies for all trackers.
tracker_name	string	Name of the configured tracker, if specified.
Updating a Notification
This endpoint allows you to update a user’s notification. Only the certain settings may be modified. To change the scope or user, delete the record and create a new one.

curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
          call_enabled: false,
          sms_enabled: true
        }' \
        "https://api.callrail.com/v3/a/{account_id}/notifications/{notification_id}.json"
The above command returns JSON structured object like this:

{
  "id": 127,
  "user_id": "USR8154748ae6bd4e278a7cddd38a662f4f",
  "alert_type": "vm_only",
  "call_enabled": false,
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "company_name": "Katherine's Ice Cream",
  "send_desktop": true,
  "send_email": true,
  "send_push": true,
  "sms_enabled": true,
  "tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "tracker_name": "Google Organic"
}
API Endpoint
Method	URL
PUT	/v3/a/{account_id}/notifications/{notification_id}.json
Request Body
Name	Type	Required?	Description
company_id	string	Optional	Limit this notification to the specified company. If not specified, this notification is not limited by company.
tracker_id	string	Optional	Limit this notification to the specified tracker. If not specified, this notification is not limited by tracker.
call_enabled	boolean	Optional	Whether or not notifications are enabled for incoming calls. When enabled, “alert_type” becomes required.
sms_enabled	boolean	Optional	Whether or not notifications are enabled for incoming text messages.
alert_type	string	Optional	Selects the type of call that triggers this notification. One of “all”, “first_call”, “missed_and_vm”, “vm_only”. Required when call_enabled is true.
send_desktop	boolean	Optional	Whether or not notifications will be sent via the desktop web application.
send_email	boolean	Optional	Whether or not notifications will be sent via email.
send_push	boolean	Optional	Whether or not notifications will be sent via mobile push notification.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	number	Unique identifier for the notification.
user_id	string	Unique identifier for the user configured to receive these notifications.
email	string	Email address for the email-only user configured to receive these notifications.
agent_id	string	This notification is limited to calls/sms to this specific agent. If null, this notification applies for all agents.
agent_name	string	Name of the agent, if specified.
alert_type	string	When call alerts are enabled, applies a filter for alerts based on call type. One of “all”, “first_call”, “missed_and_vm”, “vm_only”.
call_enabled	boolean	Whether or not call alerts are enabled.
company_id	string	This notification is limited to this specific company. If null, this notification applies for all companies within the account.
company_name	string	Name of the configured company, if specified.
name	string	Describes the configuration setup of the notification.
send_desktop	boolean	Whether or not the notifications will be sent via the desktop web application.
send_email	boolean	Whether or not the notifications will be sent via email.
send_push	boolean	Whether or not the notifications will be sent via mobile push notification.
sms_enabled	boolean	Whether or not alerts are enabled for incoming text messages.
tracker_id	string	This notification is limited to this specific tracker. If null, this notification applies for all trackers.
tracker_name	string	Name of the configured tracker, if specified.
Removing a Notification
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/notifications/{notification_id}.json"
The above command does not return any response data.

This endpoint will delete a notification.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/notifications/{notification_id}.json
Response
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

If the specified notification is not managed by the current authorized user, the response will be 403 Forbidden with the following error message.

{ "error" => "You do not have permission to perform the requested action" }

Outbound Caller IDs
When you make an outbound call through CallRail, you can choose any of your active tracking numbers to appear on the recipient’s caller ID. We also provide an option to show non-CallRail tracking numbers for caller ID. Before another number can be used for caller ID, you must verify that you own that phone number. This endpoint allows you to register external phone numbers and trigger verification calls to confirm ownership.

Listing All Outbound Caller ID’s
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/caller_ids.json?company_id=213472384"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 2,
  "caller_ids": [
    {
      "id": 13,
      "phone_number": "+14043334455",
      "name": "Bob's Cell",
      "verified": true,
      "created_at": "2016-08-26T09:29:00.198-04:00",
      "validation_code": "906053"
    },
    {
      "id": 14,
      "phone_number": "+14043345566",
      "name": "Gene's Cell",
      "verified": true,
      "created_at": "2016-08-26T09:29:00.198-04:00",
      "validation_code": "916054"
    }
  ]
}
This endpoint returns a paginated array of all Outbound Caller ID’s within the target company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/caller_ids.json
Request Parameters
This endpoint supports Offset Pagination.

Name	Type	Required?	Description
company_id	string	required	If provided, only the caller IDs to belonging to this company will be returned.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the Outbound Caller ID object.
phone_number	string	The telephone number (in e.164 format) of the Outbound Caller ID object.
name	string	A descriptive name of the Caller ID formatted for display.
company_id	string	Unique identifier for the company.
verified	boolean	Whether or not the phone number has been verified in CallRail.
created_at	string	The date and time the Outbound Caller ID was created in UTC (ISO 8601 format).
validation_code	string	Code needed to verify ownership of the phone number to be used with the Outbound Caller ID feature.
Retrieving a Single Outbound Caller ID
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/caller_ids/{caller_ids_id}.json
The above command returns JSON structured object like this:

{
  "id": 10,
  "phone_number": "+17704445555",
  "name": "Bob's Cell",
  "verified": true,
  "created_at": "2015-04-17T11:02:36.461-04:00",
  "validation_code": "332377"
}
This endpoint returns a single Outbound Caller ID object in the target company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/caller_ids/{caller_ids_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	integer	Unique identifier for the Outbound Caller ID object.
phone_number	string	The telephone number (in e.164 format) of the Outbound Caller ID object.
name	string	A descriptive name of the Caller ID formatted for display.
company_id	string	Unique identifier for the company.
verified	boolean	Whether or not the phone number has been verified in CallRail.
created_at	string	The date and time the Outbound Caller ID was created in UTC (ISO 8601 format).
validation_code	string	Code needed to verify ownership of the phone number to be used with the Outbound Caller ID feature.
Creating an Outbound Caller ID
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "phone_number": "+14047704070",
          "name": "Widget Shop",
          "company_id": 213472384
         }' \
         "https://api.callrail.com/v3/a/{account_id}/caller_ids.json"
The above command returns JSON structured object like this:

{
  "id": 15,
  "phone_number": "19042223344",
  "name": "Bob's Cell",
  "verified": false,
  "created_at": "2017-01-18T11:43:30.188-05:00",
  "validation_code": "688107"
}
This endpoint creates a single Outbound Caller ID object within the target company. After a successful request to this endpoint, the specified phone number will ring and prompt for a code to be entered in order to verify the phone number. The recipient of the call will need to enter the returned validation_code on the phone’s numeric keypad. If the verification phone call is missed for any reason, a new POST request will need to be made in order to initiate the verification process again.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/caller_ids.json
Request Body
Name	Type	Required?	Description
company_id	string	required	Unique identifier for the company.
phone_number	string	required	The telephone number to be verified with the Outbound Caller ID feature.
name	string	required	A descriptive name for the Outbound Caller ID being created.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	integer	Unique identifier for the Outbound Caller ID object.
phone_number	string	The telephone number (in e.164 format) of the Outbound Caller ID object.
name	string	A descriptive name of the Caller ID formatted for display.
company_id	string	Unique identifier for the company.
verified	boolean	Whether or not the phone number has been verified in CallRail.
created_at	string	The date and time the Outbound Caller ID was created in UTC (ISO 8601 format).
validation_code	string	Code needed to verify ownership of the phone number to be used with the Outbound Caller ID feature.
Deleting an Outbound Caller ID
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/caller_ids/{caller_ids_id}.json
The above command does not return any response data.

This endpoint deletes a Outbound Caller ID object in the target company.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/caller_ids/{caller_ids_id}.json
Response Fields
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

Page Views
The call page views endpoint provides the browsing history associated with a given call. This endpoint returns web session data, like the referring URL and landing page URL associated with a call to a session tracker. These endpoints return in reverse chronological order, with the newest displaying first.

Responses will list all page views that happen before a caller dials your tracking number, regardless of whether or not the caller is a first-time caller. We won’t return the page views that occurred after the call took place.

Only available for calls placed to session trackers. See the Terminology section for more info about session trackers.
Retrieving All Page Views For A Call
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/calls/{call_id}/page_views.json?time_zone=America/Los_Angeles"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 5,
  "page_views": [
    {
      "referrer_url": "https://www.grandsymphonyresort.com/available-suites/",
      "page_url": "https://www.grandsymphonyresort.com/book-now/",
      "created_at": "2017-03-09T10:17:29-08:00"
    },
    {
      "referrer_url": "https://www.grandsymphonyresort.com/things-to-do",
      "page_url": "https://www.grandsymphonyresort.com/available-suites/",
      "created_at": "2017-03-09T10:17:21-08:00"
    },
    {
      "referrer_url": "https://www.grandsymphonyresort.com/attractions/",
      "page_url": "https://www.grandsymphonyresort.com/things-to-do",
      "created_at": "2017-03-09T10:17:19-08:00"
    },
    {
      "referrer_url": "https://www.grandsymphonyresort.com/?utm_source=google&utm_medium=cpc&utm_campaign=Non-Brand&matchtype=b&device=c&position=1t1&keyword=%2Bvacation%20%2Bresort%20%2Brelax&gclid=DjwKCBjwcdbLBRALEiwFn8pA5QgnviLjpiYy9fY3hcwHxrpIhUj7WbkYGFDhVy-LL2WA9HsQ_KcA_RoCpPgQAvD_BwE",
      "page_url": "https://www.grandsymphonyresort.com/attractions/",
      "created_at": "2017-03-09T10:17:09-08:00"
    },
    {
      "referrer_url": "https://www.google.com/",
      "page_url": "https://www.grandsymphonyresort.com/?utm_source=google&utm_medium=cpc&utm_campaign=Non-Brand&matchtype=b&device=c&position=1t1&keyword=%2Bvacation%20%2Bresort%20%2Brelax&gclid=DjwKCBjwcdbLBRALEiwFn8pA5QgnviLjpiYy9fY3hcwHxrpIhUj7WbkYGFDhVy-LL2WA9HsQ_KcA_RoCpPgQAvD_BwE",
      "created_at": "2017-03-09T10:17:00-08:00"
    }
  ]
}
This endpoint returns a paginated array of page views for a given call within the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/calls/{call_id}/page_views.json
Request Parameters
This endpoint supports Offset Pagination.

Response Field
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
referrer_url	string	The url of the referring source or website the caller was previously viewing.
page_url	string	The url the caller was viewing before navigating to new portion of a website or the last url visited before calling the tracking number displayed on a website.
created_at	string	The date and time the page view was created in ISO 8601 format.
Working with Time Zones
The CallRail API aligns all dates to the time zone specified within the account. This can be overridden for specified API requests by including a time_zone parameter. This parameter accepts any standard time zone as defined by the IANA’s TZ Database, or using the common names from the examples below.

See an additional list of Time Zones in the Getting Started section.

ex. time_zone=America/New_York

Value	Description
user	default
Use the default time zone for the user indicated by the current API key. This setting is configured within the application.
America/New_York	Eastern Time Zone
America/Indiana/Indianapolis	Indiana Time Zone
America/Chicago	Central Time Zone
America/Denver	Mountain Time Zone
America/Phoenix	Arizona Time Zone
America/Los_Angeles	Pacific Time Zone
SMS Threads
Listing All SMS Threads
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/sms-threads.json"
The above command returns a JSON structured object that includes a paginated list of all SMS threads for a given account.

{
  "page": 1,
  "per_page": 100,
  "total_pages": 4,
  "total_records": 312,
  "sms_threads": [
    {
      "id": "KZaGR",
      "notes": null,
      "tags": ["Urgent"],
      "value": 5.0,
      "lead_qualification": "good_lead",
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f5f",
      "customer_name": "MANN KEVIN",
      "customer_phone_number": "+14042223333",
      "initial_tracking_number": "+14045556677",
      "current_tracking_number": "+17703334455",
      "state": "active",
      "company_time_zone": "America/New_York"
    },
    {
      "id": "KZaGY",
      "notes": "Follow up needed",
      "tags": ["Follow-up"],
      "value": null,
      "lead_qualification": null,
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "customer_name": "POWELL ANDY",
      "customer_phone_number": "+14042223333",
      "initial_tracking_number": "+14045556677",
      "current_tracking_number": "+17703334455",
      "state": "active",
      "company_time_zone": "America/New_York"
    }
  ]
}
SMS threads are ordered by their most recent message (last_item_at), and the newest threads are returned first.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/sms-threads.json
Request Parameters
This endpoint supports Offset Pagination, Filtering, Searching and Field Selection

Name	Type	Required?	Description
company_id	string	optional	Limit response to threads belonging to a single company.
date_range	string	optional	Filter threads by date range. Valid values: recent, today, yesterday, last_7_days, last_30_days, this_month, last_month, this_year, last_year, all_time.
start_date	string	optional	Filter threads starting from this date (YYYY-MM-DD format). Must be used with end_date.
end_date	string	optional	Filter threads up to this date (YYYY-MM-DD format). Must be used with start_date.
search	string	optional	Search threads by customer phone number, customer name, or tag name.
Filtering is available for the following:

date_range: See Filtering by Date for more info.
start_date and end_date: Filter threads by a custom date range.
Searching is available for the following fields:

customer_phone_number
customer_name
tags (tag names)
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
page	number	Current page number.
per_page	number	Number of threads per page.
total_pages	number	Total number of pages.
total_records	number	Total number of SMS threads.
sms_threads	array	JSON array of SMS threads (fields described below).
SMS Thread Fields
Name	Type	Description
id	string	Unique alphanumeric identifier for the SMS thread.
notes	string	Notes associated with the SMS thread.
tags	array	Array of tag names associated with the SMS thread.
value	number	Value associated with the SMS thread.
lead_qualification	string	Lead qualification status for the SMS thread. One of “good_lead”, “not_a_lead”, or null.
company_id	string	An ID indicating which company the thread belongs to.
initial_tracker_id	string	Unique identifier for the tracking number used to start the conversation.
current_tracker_id	string	Unique identifier for the tracking number used most recently in the conversation.
customer_name	string	The customer’s name.
customer_phone_number	string	The customer’s phone number (in E.164 format).
initial_tracking_number	string	The tracking phone number used to start the conversation (in E.164 format).
current_tracking_number	string	The tracking phone number used in the most recent conversation (in E.164 format).
state	string	Whether or not the conversation is active or archived in CallRail. One of “active” or “archived”.
company_time_zone	string	The timezone of the company associated with the conversation.
Field Selection is available for the following additional fields:

Name	Type	Description
last_message_at	string	The date and time the last message was received or sent in UTC, in ISO 8601 format.
formatted_customer_phone_number	string	The phone number of the customer, formatted for display.
formatted_initial_tracking_number	string	The initial_tracking_number formatted for display.
formatted_current_tracking_number	string	The current_tracking_number formatted for display.
formatted_customer_name	string	The name of the customer, formatted for display.
Retrieving A Single SMS Thread
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/sms-threads/{thread_id}.json"
The above command returns a single paginated JSON SMS thread object with its messages.

{
  "id": "KkMhr",
  "notes": null,
  "tags": ["Urgent"],
  "value": 5.0,
  "lead_qualification": "good_lead",
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "customer_name": "MANN KEVIN",
  "customer_phone_number": "+14042223333",
  "initial_tracking_number": "+14045556677",
  "current_tracking_number": "+17703334455",
  "last_message_at": "2016-07-28T19:26:43.578Z",
  "state": "active",
  "company_time_zone": "America/New_York",
  "formatted_customer_phone_number": "404-222-3333",
  "formatted_initial_tracking_number": "404-555-6677",
  "formatted_current_tracking_number": "770-333-4455",
  "formatted_customer_name": "Mann Kevin",
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 1,
  "messages": [
    {
      "id": "SCIdef84068eb9a6679b40abc9bd1718a2c",
      "content": "These aren't the droids you're looking for.",
      "created_at": "2016-07-28T19:28:21.578Z",
      "status": null,
      "direction": "incoming",
      "message_type": "mms",
      "media_urls": [
        "https://api.callrail.com/v3/a/ACC8154748ae6bd4e278a7cddd38a662f4f/text-messages/SCIdef84068eb9a6679b40abc9bd1718a2c/media/0"
      ]
    }
  ]
}
This endpoint retrieves an SMS thread with its messages. Messages in the thread are ordered by the most recent message first.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/sms-threads/{thread_id}.json
Request Parameters
This endpoint supports Offset Pagination and Field Selection

Name	Type	Required?	Description
page	number	optional	Page number to retrieve (default: 1).
per_page	number	optional	Number of messages per page (default: 100, max: 100).
with_msg_errors	boolean	optional	If true, includes error details for messages that failed.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique alphanumeric identifier for the SMS thread.
company_id	string	An ID indicating which company the thread belongs to.
initial_tracker_id	string	Unique identifier for the tracking number used to start the conversation.
current_tracker_id	string	Unique identifier for the tracking number used most recently in the conversation.
customer_name	string	The customer’s name.
customer_phone_number	string	The customer’s phone number (in E.164 format).
initial_tracking_number	string	The tracking phone number used to start the conversation (in E.164 format).
current_tracking_number	string	The tracking phone number used in the most recent conversation (in E.164 format).
last_message_at	string	The date and time the last message was received or sent in UTC, in ISO 8601 format.
state	string	Whether or not the conversation is active or archived in CallRail. One of “active” or “archived”.
company_time_zone	string	The timezone of the company associated with the conversation.
formatted_customer_phone_number	string	The phone number of the customer, formatted for display.
formatted_initial_tracking_number	string	The initial_tracking_number formatted for display.
formatted_current_tracking_number	string	The current_tracking_number formatted for display.
formatted_customer_name	string	The name of the customer, formatted for display.
page	number	Current page number of the paginated messages.
per_page	number	Number of messages per page.
total_pages	number	Total number of pages of messages.
total_records	number	Total number of messages in the thread.
messages	array	JSON array of text messages returned by the query (fields described in table below).
Message Fields
Name	Type	Description
id	string	Unique identifier for a specific message.
content	string	The content body of the text message.
created_at	string	The date and time the message was created in UTC, in ISO 8601 format.
status	string	For outgoing messages, whether the message was successfully sent (sent), or failed to be delivered (failed). For incoming messages, this field will be null. One of “sent”, “failed”, or null.
direction	string	The direction of the text message sent to or received from the customer. One of “incoming” or “outgoing”.
message_type	string	One of either sms or mms.
media_urls	array	Array of links to media items attached to the message. To retrieve the media, make a GET request to the endpoint(s) provided in this array using your API key. These links are not long-lived and are intended for immediate use to download the media to your own storage mechanism. You should never store the URL returned in this response. Instead, you should make a request to this endpoint whenever you need to obtain the current location of the media.
error	object	Error details for messages that failed (only included when with_msg_errors=true is set).
Update an SMS Thread
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
          "notes": "Updated note",
          "value": "$5.00",
          "tags": ["Urgent", "Follow-up"],
          "lead_qualification": "good_lead"
         }' \
         "https://api.callrail.com/v3/a/{account_id}/sms-threads/{thread_id}.json"
This endpoint updates an SMS thread in the target company.

The above command updates an SMS thread and returns a JSON structured object containing the updated thread details.

{
  "id": "FyzZ6",
  "notes": "Updated note",
  "tags": ["Follow-up", "Urgent"],
  "value": 5.0,
  "lead_qualification": "good_lead",
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662d4d",
  "customer_name": "MANN KEVIN",
  "customer_phone_number": "+14044442233",
  "initial_tracking_number": "+14045556677",
  "current_tracking_number": "+17703334455",
  "state": "active",
  "company_time_zone": "America/New_York"
}
API Endpoint
Method	URL
PUT	/v3/a/{account_id}/sms-threads/{thread_id}.json
Request Body
Name	Type	Required?	Description
notes	string	optional	Notes associated with the SMS thread.
value	string	optional	Value associated with the SMS thread (e.g., “$5.00”).
tags	array	optional	Array of tag names to assign to the SMS thread. If append_tags is not set, this will replace all existing tags.
append_tags	boolean	optional	If true, the tags provided will be appended to existing tags. If false or not provided, tags will replace existing tags.
lead_qualification	string	optional	Lead qualification status. One of “good_lead”, “not_a_lead”, or null.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique alphanumeric identifier for the SMS thread.
notes	string	Notes associated with the SMS thread.
tags	array	Array of tag names associated with the SMS thread.
value	number	Value associated with the SMS thread.
lead_qualification	string	Lead qualification status for the SMS thread.
company_id	string	An ID indicating which company the thread belongs to.
initial_tracker_id	string	Unique identifier for the tracking number used to start the conversation.
current_tracker_id	string	Unique identifier for the tracking number used in the most recent conversation. If null, initial_tracker_id is the current tracker_id used in the conversation.
customer_name	string	The customer’s name.
customer_phone_number	string	The customer’s phone number (in E.164 format).
initial_tracking_number	string	The tracking phone number used to start the conversation (in E.164 format).
current_tracking_number	string	The tracking phone number used in the most recent conversation (in E.164 format).
state	string	Whether or not the conversation is active or archived in CallRail. One of “active” or “archived”.
company_time_zone	string	The timezone of the company associated with the conversation.
Summary Emails
Users in your CallRail account can be configured to receive periodic activity emails. These emails include a summary of the calls received in the selected period, and can be scheduled on a daily, weekly, or monthly basis. It is also possible to configure which sections are included in the email, as well as opt to send a CSV of calls received. This series of endpoints allows these summary emails to be configured within your account.

Listing All Summary Email Subscriptions
This endpoint lists all summary emails visible to this user. Note that only Administrator users can manage summary emails for other users. If the API Key being used does not belong to an Administrator, only the owner’s summary emails will be returned.

curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/summary_emails"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 2,
  "summary_emails": [
    {
      "id": "CSS8154748ae6bd4e278a7cddd38a662f4f",
      "scope": {
        "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "type": "Company",
        "name": "C1"
      },
      "frequency": ["daily", "weekly"],
      "config": {
         "summary_statistics": true,
         "top_sources": true,
         "top_keywords": true,
         "call_log": true
      },
      "user": {
        "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
        "name": "Bob Smith",
        "email": "bob.smith@example.com"
      }
    },
    {
      "id": "CSS8154748ae6bd4e278a7cddd38a662f4f",
      "scope": {
        "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "type": "Company",
        "name": "C1"
      },
      "frequency": ["daily"],
      "config": {
         "summary_statistics": true,
         "top_sources": true,
         "top_keywords": true,
         "call_log": true
      },
      "user": {
        "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
        "name": "Bob Smith",
        "email": "bob.smith@example.com"
      }
    }
  ]
}
This endpoint returns a paginated array of summary emails within the target account or company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/summary_emails
Request Parameters
This endpoint supports Offset Pagination and Filtering.

Name	Type	Required?	Description
frequency	array	optional	If provided, only return summary email records configured for the specified frequency. (“daily”, “weekly”, or “monthly”)
company_id	string	optional	Unique identifier for the company. If left blank, Account summary email settings will be fetched.
user_id	string	optional	If provided, only return summary email records configured for the specified email-only user.
email	string	optional	If provided, only return summary email records configured for the specified user.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for this summary email record.
scope	object	A short representation of the scope (either Company or Account) for which this email is configured.
frequency	array	The frequency at which the emails are sent. An array that can include any value of “daily”, “weekly”, or “monthly”.
config	object	An object that indicates which sections are included in this summary email. Keys are boolean switches for summary_statistics, top_sources, top_keywords, and call_log.
user	object	A short representation of the user referenced by user_id.
email	object	Email address for the email-only user configured to receive these notifications.
Create a Summary Email Subscription
This endpoint allows creation of a new summary email subscription. A summary email subscription represents a periodic email sent to a user with information about recent activity within a CallRail account. It can be configured for either a specific company (when company_id is present), or for all companies to which the user has access (account_id is used when company_id is absent). Summary email subscriptions for email-only users are required to define a company_id for a specific company. The frequency defines how often to send the summary email. Daily emails are sent every morning, while weekly emails are sent every Monday, and monthly emails are sent on the first of every month.

Only administrators can create summary email subscriptions for other users.

curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "user_id": "USR8154748ae6bd4e278a7cddd38a662f4f",
          "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
          "frequency": ["weekly", "daily"],
          "filters": {
            "lead_status": "Not a Lead"
          },
          "config": {
             "summary_statistics": true,
             "top_sources": true,
             "top_keywords": true,
             "call_log": true
          }
        }' \
        "https://api.callrail.com/v3/a/{account_id}/summary_emails.json"
The above command returns JSON structured object like this:

{
  "id": "CSS8154748ae6bd4e278a7cddd38a662f4f",
  "scope": {
    "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "type": "Company",
    "name": "C1"
  },
  "frequency": ["weekly", "daily"],
  "filters": {
    "lead_status": "Not a Lead"
  },
  "config": {
     "summary_statistics": true,
     "top_sources": true,
     "top_keywords": true,
     "call_log": true
  },
  "user": {
    "id":"USR8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Bob Smith",
    "email": "bob.smith@example.com"
  }
}
API Endpoint
Method	URL
POST	/v3/a/{account_id}/summary_emails.json
Request Body
Name	Type	Required?	Description
company_id	string	optional	Unique identifier for the company. If left blank for a email only user, an error will be returned; otherwise, the summary email settings will be assigned to the Account for the specified account’s/company’s summary emails.
frequency	array	required	The frequency at which the emails are sent. Can be one of “daily”, “weekly”, or “monthly”.
config	object	required	An object that contains further configuration for the specified companies summary emails. This object has keys for at least one of summary_statistics, top_sources, top_keywords, and call_log, with boolean values set to true or false.
user_id	string	optional	Indicates the user to receive these summary emails.
email	string	optional	Indicates the email-only user to receive these summary emails. Either an email or user_id is required.
filters	object	optional	Lead status can be one of ‘Lead’, ‘Not a Lead’, ‘Not Scored’, or ‘All’.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	string	Unique identifier for this summary email record.
scope	object	A short representation of the scope (either Company or Account) for which this email is configured.
frequency	string	The frequency at which the emails are sent. Can be one of “daily”, “weekly”, or “monthly”.
config	object	An object that indicates which sections are included in this summary email. Keys are boolean switches for summary_statistics, top_sources, top_keywords, and call_log.
user	object	A short representation of the user referenced by user_id.
email	string	Email address for the email-only user configured to receive these summary emails.
Retrieving a Summary Email Subscription
This endpoint retrieves a single summary email record.

Only records that the authenticated user has access to will be returned. Administrators may access records for all users on the account, but other user types may only access their own records.

curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/summary_emails/{summary_email_id}.json"
The above command returns a JSON structured object like this:

  {
    "id": "CSS8154748ae6bd4e278a7cddd38a662f4f",
    "scope": {
      "id": "ACC8154748ae6bd4e278a7cddd38a662f4f",
      "type": "Account",
      "name": "A1"
    },
    "frequency": ["daily", "weekly"],
    "config": {
       "summary_statistics": true,
       "top_sources": true,
       "top_keywords": true,
       "call_log": true
    },
    "user": {
      "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Bob Smith",
      "email": "bob.smith@example.com"
    }
  }
API Endpoint
Method	URL
GET	/v3/a/{account_id}/summary_emails/{summary_email_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for this summary email record.
scope	object	A short representation of the scope (either Company or Account) for which this email is configured.
frequency	string	The frequency at which the emails are sent. An array that can include any value of “daily”, “weekly”, or “monthly”.
config	object	An object that indicates which sections are included in this summary email. Keys are boolean switches for summary_statistics, top_sources, top_keywords, and call_log.
user	object	A short representation of the user referenced by user_id.
email	string	Email address for the email-only user configured to receive these summary emails.
Update a Summary Email Subscription
This endpoint allows you to update a user’s summary email subscription. Only the frequency and configuration settings may be modified. To change the scope or user, delete the record and create a new one.

curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
          "frequency": ["monthly", "weekly"],
          "config": {
             "call_log": false
          }
        }' \
        "https://api.callrail.com//v3/a/{account_id}/summary_emails/{summary_email_id}.json"
The above command returns JSON structured object like this:

  {
    "id": "CSS8154748ae6bd4e278a7cddd38a662f4f",
    "scope": {
      "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "type": "Company",
      "name": "C1"
    },
    "frequency": ["monthly", "weekly"],
    "filters": {
      "lead_status": "Lead"
    },
    "config": {
       "summary_statistics": true,
       "top_sources": true,
       "top_keywords": true,
       "call_log": false
    },
    "user": {
      "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Bob Smith",
      "email": "bob.smith@example.com"
    }
  }
API Endpoint
Method	URL
PUT	/v3/a/{account_id}/summary_emails/{summary_email_id}.json
Request Body
Name	Type	Required?	Description
frequency	array	optional	The frequency at which the emails are sent. An array that can include any value of “daily”, “weekly”, or “monthly”. If present, only the frequencies listed in the call will be subscribed to, other frequencies will be unsubscribed from. If omitted, the update parameters will apply to the current summary email frequencies.
config	object	required	An object that contains further configuration for the specified companies summary emails. This object has keys for at least one of summary_statistics, top_sources, top_keywords, and call_log, with boolean values set to true or false.
filters	object	optional	Lead status can be one of ‘Lead’, ‘Not a Lead’, ‘Not Scored’, or ‘All’.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for this summary email record.
scope	object	A short representation of the scope (either Company or Account) for which this email is configured.
frequency	string	The frequency at which the emails are sent. An array that can include any value of “daily”, “weekly”, or “monthly”.
config	object	An object that indicates which sections are included in this summary email. Keys are boolean switches for summary_statistics, top_sources, top_keywords, and call_log.
user	object	A short representation of the user referenced by user_id.
email	string	Email address for the email-only user configured to receive these summary emails.
Delete a Summary Email Subscription
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/summary_emails/{summary_email_id}.json"
The above command does not return any response data.

This endpoint will remove the specified summary email, which unsubscribes the user from future deliveries.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/summary_emails/{summary_email_id}.json
Response
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

If the authorized user tries to unsubscribe from a summary email that they don’t have permission to access, the server will return code 403 Forbidden with the following error message:

{ "error" => "You do not have permission to perform the requested action" }

Text Messages
Please note that compliance rules around text messaging go into effect in the fall of 2023. All businesses using numbers for outbound text messaging are required to register their business. To register, click here to fill out the initial registration form.

Check out our Text Message Complaince Registration support article to learn more and find links to additional resources.

Listing All Conversations
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/text-messages.json"
The above command returns a JSON structured object that includes a paginated list of all text message conversations for a given account.

{
  "page": 1,
  "per_page": 100,
  "total_pages": 4,
  "total_records": 312,
  "conversations": [
    {
      "id": "KZaGR",
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f5f",
      "customer_name": "MANN KEVIN",
      "customer_phone_number": "+14042223333",
      "initial_tracking_number": "+14045556677",
      "current_tracking_number": "+17703334455",
      "last_message_at": "2016-07-28T19:26:43.578Z",
      "state": "active",
      "company_time_zone": "America/New_York",
      "formatted_customer_phone_number": "404-222-3333",
      "formatted_initial_tracking_number": "404-555-6677",
      "formatted_current_tracking_number": "770-333-4455",
      "formatted_customer_name": "Mann Kevin",
      "recent_messages": [
        {
          "direction": "outgoing",
          "content": "Awww! But I was going into Tosche Station to pick up some power converters!",
          "created_at": "2016-07-28T19:28:21.578Z",
          "type": "sms",
          "media_urls": []
        },
        {
          "direction": "incoming",
          "content": "Take these two over to the garage, will you?  I want them cleaned up before dinner.",
          "created_at": "2016-07-28T19:26:43.578Z",
          "type": "mms",
          "media_urls": [
               "https://api.callrail.com/v3/a/ACC8154748ae6bd4e278a7cddd38a662f4f/text-messages/SCIdef84068eb9a6679b40abc9bd1718a2c/media/0"
          ]
        }
      ]
    },
    {
      "id": "KZaGY",
      "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "customer_name": "POWELL ANDY",
      "customer_phone_number": "+14042223333",
      "initial_tracking_number": "+14045556677",
      "current_tracking_number": "+17703334455",
      "last_message_at": "2016-07-28T19:26:43.578Z",
      "state": "active",
      "company_time_zone": "America/New_York",
      "formatted_customer_phone_number": "404-222-3333",
      "formatted_initial_tracking_number": "404-555-6677",
      "formatted_current_tracking_number": "770-333-4455",
      "formatted_customer_name": "Powell Andy",
      "recent_messages": [
        {
          "direction": "outgoing",
          "content": "It’s not impossible. I used to bullseye womp rats in my T-16 back home, they’re not much bigger than two meters.",
          "created_at": "2016-07-28T19:28:21.578Z",
          "type": "sms",
          "media_urls": []
        },
        {
          "direction": "incoming",
          "content": "That's impossible, even for a computer!",
          "created_at": "2016-07-28T19:26:43.578Z",
          "type": "sms",
          "media_urls": []
        }
      ]
    }
  ]
}
Conversations are ordered by their most recent message, and the newest conversations are returned first. Recent messages objects include the two most recent messages.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/text-messages.json
Request Parameters
This endpoint supports Offset Pagination, Filtering, Searching and Field Selection

Name	Type	Required?	Description
company_id	string	optional	Limit response to conversations belonging to a single company.
Filtering is available for the following:

date_range: See Filtering by Date for more info.
Searching is available for the following fields:

customer_phone_number

customer_name

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique alphanumeric identifier for the text conversation.
company_id	string	An ID indicating which company the message belongs to.
initial_tracker_id	string	Unique identifier for the tracking number used to start the conversation.
current_tracker_id	string	Unique identifier for the tracking number used most recently in the conversation.
customer_name	string	The customer’s name
customer_phone_number	string	The customer’s phone number (in E.164 format).
initial_tracking_number	string	The tracking phone number used to start the conversation (in E.164 format).
current_tracking_number	string	The tracking phone number used in the most recent conversation (in E.164 format).
last_message_at	string	The date and time the text was received or sent in UTC, in ISO 8601 format.
state	string	Whether or not the conversation is active or archived in CallRail. One of “active” or “archived”.
company_time_zone	string	The timezone of the company associated with the conversation.
formatted_customer_phone_number	string	The phone number of the customer, formatted for display.
formatted_initial_tracking_number	string	The initial_tracking_number formatted for display.
formatted_current_tracking_number	string	The current_tracking_number formatted for display.
formatted_customer_name	string	The name or the customer, formatted for display.
recent_messages	array	JSON array containing up to two previous text messages in the current conversation (fields described below.)
Message Fields
Name	Type	Description
direction	string	The direction of the text message sent to or received from the customer. One of “incoming” or “outgoing”.
content	string	The content body of the text message.
created_at	string	The date and time the text was created in UTC, in ISO 8601 format.
type	string	One of either sms or mms.
media_urls	array	1 link per media item attached to the text message. To retrieve the media, make a GET request to the endpoint(s) provided in this array using your API key. These links are not long-lived and are intended for immediate use to download the media to your own storage mechanism. You should never store the URL returned in this response. Instead, you should make a request to this endpoint whenever you need to obtain current location of the media.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
lead_status	string	The current lead status for the text conversation. One of previously_marked_good_lead, or null.
source	string	The marketing source that led to the text conversation.
Retrieving A Single Text Conversation
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/text-messages/{conversation_id}.json"
The above command returns a single paginated JSON conversation object.

  {
    "id": "KkMhr",
    "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
    "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
    "customer_name": "MANN KEVIN",
    "customer_phone_number": "+14042223333",
    "initial_tracking_number": "+14045556677",
    "current_tracking_number": "+17703334455",
    "last_message_at": "2016-07-28T19:26:43.578Z",
    "state": "active",
    "company_time_zone": "America/New_York",
    "formatted_customer_phone_number": "404-222-3333",
    "formatted_initial_tracking_number": "404-555-6677",
    "formatted_current_tracking_number": "770-333-4455",
    "formatted_customer_name": "Mann Kevin",
    "page": 1,
    "per_page": 100,
    "total_pages": 1,
    "total_records": 1,
    "messages": [
      {
        "id": 23456,
        "content": "These aren't the droids you're looking for.",
        "created_at": "2016-07-28T19:28:21.578Z",
        "status": null,
        "direction": "incoming",
        "type": "MMS",
        "media_urls": [
           "https://api.callrail.com/v3/a/ACC8154748ae6bd4e278a7cddd38a662f4f/text-messages/SCIdef84068eb9a6679b40abc9bd1718a2c/media/0"
        ]
        "user": {
          "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
          "name": "Bob Smith"
        }
      }
    ]
  }
This endpoint retrieves a text message conversation. Text messages in the conversation are ordered by the most recent message first.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/text-messages/{conversation_id}.json
Request Parameters
This endpoint supports Field Selection

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique alphanumeric identifier for the text conversation.
company_id	string	An ID indicating which company the message belongs to.
initial_tracker_id	string	Unique identifier for the tracking number used to start the conversation.
current_tracker_id	string	Unique identifier for the tracking number used most recently in the conversation.
customer_name	string	The customer’s name.
customer_phone_number	string	The customer’s phone number (in E.164 format).
initial_tracking_number	string	The tracking phone number used to start the conversation (in E.164 format).
current_tracking_number	string	The tracking phone number used in the most recent conversation (in E.164 format).
last_message_at	string	The date and time the text was received or sent in UTC, in ISO 8601 format.
state	string	Whether or not the conversation is active or archived in CallRail. One of “active” or “archived”.
company_time_zone	string	The timezone of the company associated with the conversation.
formatted_customer_phone_number	string	The phone number of the customer, formatted for display.
formatted_initial_tracking_number	string	The initial_tracking_number formatted for display.
formatted_current_tracking_number	string	The current_tracking_number formatted for display.
formatted_customer_name	string	The name of the customer, formatted for display.
page	number	Specific page number of the paginated messages in this conversation.
per_page	number	Total number of messages per page.
total_pages	number	Total number of paginated messages returned in each page.
total_records	number	Total number of messages returned in the conversation.
messages	string	JSON array of text messages returned by the query (fields described in table below).
Message Fields
Name	Type	Description
id	number	Unique identifier for a specific text.
content	string	The content body of the text message.
created_at	string	The date and time the text was created in UTC, in ISO 8601 format.
status	string	For outgoing messages, whether the message was successfully sent (sent), or failed to be delivered (failed). For incoming messages, this field will be null. One of “sent” or “error”
direction	string	The direction of the text message sent to or received from the customer. One of “incoming” or “outgoing”.
type	string	One of either sms or mms.
media_urls	array	1 link per media item attached to the text message. To retrieve the media, make a GET request to the endpoint(s) provided in this array using your API key. These links are not long-lived and are intended for immediate use to download the media to your own storage mechanism. You should never store the URL returned in this response. Instead, you should make a request to this endpoint whenever you need to obtain current location of the media.
user	resource	The CallRail user who sent the text message
id
number	The ID of the CallRail user who sent the text message.
name
string	The name of the CallRail user who sent the text message.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
lead_status	string	The current lead status for the text conversation. One of previously_marked_good_lead, or null.
source	string	The marketing source that led to the text conversation.
Send a Text Message
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "customer_phone_number": "+14044442233",
          "tracking_number": "+17703334455",
          "content": "These are not the droids you are looking for.",
          "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f"
         }' \
         "https://api.callrail.com/v3/a/{account_id}/text-messages.json"
To send an MMS by referencing a publicly accessible media URL:

curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "customer_phone_number": "+14044442233",
          "tracking_number": "+17703334455",
          "content": "Check out this image!",
          "media_url": "https://example.com/image.jpg",
          "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f"
         }' \
         "https://api.callrail.com/v3/a/{account_id}/text-messages.json"
To send an MMS by uploading a media file directly (multipart form):

curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -F "company_id=COM8154748ae6bd4e278a7cddd38a662f4f" \
     -F "customer_phone_number=+14044442233" \
     -F "tracking_number=+17703334455" \
     -F "content=Check out this image!" \
     -F "media_file=@/path/to/image.jpg;type=image/jpeg" \
     "https://api.callrail.com/v3/a/{account_id}/text-messages.json"
This endpoint creates a SMS text message in the target company.

Please note that compliance rules around text messaging go into effect in the fall of 2023. All businesses using numbers for outbound text messaging are required to register their business. To register, click here to fill out the initial registration form.

Check out our Text Message Complaince Registration support article to learn more and find links to additional resources.

You are required to identify who you are and use at least one approved keyword to inform the recipient they can end communication at any time. The first time you text a lead, we will automatically include opt-out instructions if none were included in the message. Approved examples: STOP, CANCEL, UNSUBSCRIBE, QUIT, or END.

You may only use this endpoint to enable person-to-person communication within your own application. Automated messaging of any kind, including bulk messaging or text blasts, is strictly prohibited by the CallRail Terms and Conditions.
This endpoint is also rate limited, see Rate Limiting.
The above command creates a single outbound text message that can be part of an existing conversation or the start of a new conversation. The response is a JSON structured object containing message details, and may include the two most recent messages for an existing conversation.

{
  "id": "FyzZ6",
  "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
  "initial_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "current_tracker_id": "TRK8154748ae6bd4e278a7cddd38a662d4d",
  "customer_name": "MANN KEVIN",
  "customer_phone_number": "+14044442233",
  "initial_tracking_number": "+14045556677",
  "current_tracking_number": "+17703334455",
  "last_message_at": null,
  "state": "archived",
  "company_time_zone": "America/New_York",
  "formatted_customer_phone_number": "404-444-2233",
  "formatted_initial_tracking_number": "404-555-6677",
  "formatted_current_tracking_number": "770-333-4455",
  "formatted_customer_name": "Mann Kevin",
  "recent_messages": [
    {
      "direction": "outgoing",
      "content": "These are not the droids you are looking for.",
      "created_at": "2016-10-12T11:57:57.337-04:00",
      "type": "sms",
      "media_urls": []
    }
  ]
}
API Endpoint
Method	URL
POST	/v3/a/{account_id}/text-messages.json
Request Body
Name	Type	Required?	Description
company_id	string	required	An ID indicating which company the message belongs to.
tracking_number	string	required	Tracking phone number used to send this message to the customer. Must be a valid 10 digit US or Canadian number. Note: tracking_number is optional if there is an existing conversation with the customer_phone_number specified in the request.
customer_phone_number	string	required	The customer’s phone number this message will be delivered to. Must be a valid 10 digit US or Canadian number.
content	string	required	Message body being sent to the customer. This string must be limited to 140 characters.
media_url	string	optional	A publicly accessible URL pointing to the media file to attach to the message. When provided, the message will be sent as MMS. Supported media types are JPEG, PNG, and GIF. Maximum file size is 5MB.
media_file	file	optional	A media file uploaded via multipart/form-data to attach to the message. When provided, the message will be sent as MMS. Supported media types are JPEG, PNG, and GIF. Maximum file size is 5MB.
Provide either media_url or media_file, not both. Requests that include both will receive a 422 Unprocessable Entity response.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	string	Unique alphanumeric identifier for the text conversation.
company_id	string	An ID indicating which company the message belongs to.
initial_tracker_id	string	Unique identifier for the tracking number used to start the conversation.
current_tracker_id	string	Unique identifier for the tracking number used in the most recent conversation. If null, initial_tracker_id is the current tracker_id used in the conversation.
customer_name	string	The customer’s name.
customer_phone_number	string	The customer’s phone number (in E.164 format).
initial_tracking_number	string	The tracking phone number used to start the conversation (in E.164 format).
current_tracking_number	string	The tracking phone number used in the most recent conversation (in E.164 format).
last_message_at	string	The date and time the text was received or sent in UTC, in ISO 8601 format.
state	string	Whether or not the conversation is active or archived in CallRail.
company_time_zone	string	The timezone of the company associated with the conversation.
formatted_customer_phone_number	string	The phone number of the customer, formatted for display.
formatted_initial_tracking_number	string	The initial_tracking_number formatted for display.
formatted_current_tracking_number	string	The current_tracking_number formatted for display.
formatted_customer_name	string	The name or the customer, formatted for display.
recent_messages	array	JSON array containing up to two previous text messages in the current conversation (fields described below.)
Message Fields
Name	Type	Description
direction	string	The direction of the text message sent to or received from the customer. One of “incoming” or “outgoing”.
content	string	The content body of the text message.
created_at	string	The date and time the text was created in UTC, in ISO 8601 format.
type	string	One of either sms or mms.
media_urls	array	1 link per media item attached to the text message. To retrieve the media, make a GET request to the endpoint(s) provided in this array using your API key. These links are not long-lived and are intended for immediate use to download the media to your own storage mechanism. You should never store the URL returned in this response. Instead, you should make a request to this endpoint whenever you need to obtain current location of the media.
Message flows
Message flows allow CallRail customers with a registered 10DLC tracking number to orchestrate the text messaging experience for inbound texts, including an automated text reply. For more information, see support documentation.

All businesses using numbers for outbound text messaging are required to register their business. To register, click here to fill out the initial registration form.

Check out our Text Message Complaince Registration support article to learn more and find links to additional resources.

Listing all message flows
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/message-flows.json?company_id=213472384"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 2,
  "message-flows": [
      {
        "id": "MFL1e9075f25b1949928b0db7323d775064",
        "name": "After-hours and weekend response",
        "updated_at": "2025-02-26T11:11:53.353-05:00",
        "tracker_ids": [
            "TRK4d1b8f7c9e3a42fdb625c0f94a17e380"
        ]
      },
      {
        "id": "MFL3e7a12c9f84e43e79a6a1b55c1c3405b",
        "name": "Message flow 2025-03-06 10:39am",
        "updated_at": "2025-03-06T11:27:09.800-05:00",
        "tracker_ids": [
            "TRKbd74f20e8a6148c3a3b5dc9287cf9f6e",
            "TRK99dd0f21f13314b4900a02185014a6yay"
        ]
      }
    ]
  }
This endpoint returns a paginated array of all the message flows in a given company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/message-flows.json
Request Parameters
This endpoint supports Offset Pagination.

Name	Type	Required?	Description
company_id	string	optional	Unique identifier for the company that owns the message flows.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the message flow object.
name	string	The name assigned to the message flow.
updated_at	string	The date and time the message flow was last updated in the current timezone (ISO 8601 format) with an offset.
tracker_ids	array(strings)	The list of tracker IDs the message flow is assigned to, if applicable.
Retrieving a single message flow
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/message-flows/MFL1e9075f25b1949928b0db7323d775064.json"
The above command returns a JSON structured object like this:

{
  "id": "MFL1e9075f25b1949928b0db7323d775064",
  "name": "After-hours and weekend response",
  "updated_at": "2025-02-26T11:11:53.353-05:00",
  "tracker_ids": [
      "TRK4d1b8f7c9e3a42fdb625c0f94a17e380"
  ],
  "initial_step_id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
  "steps": {
      "MFS6fa29e4c8b1347fcbf2e8d9731b7061d": {
            "id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
            "type": "schedule",
            "initial_step": true,
            "next_step_id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7",
            "branches": [
                {
                    "times": [
                        {
                            "day": "weekdays",
                            "end_time": "2359",
                            "start_time": "1800"
                        },
                        {
                            "day": "weekdays",
                            "end_time": "0800",
                            "start_time": "0000"
                        },
                        {
                            "day": "weekends",
                            "end_time": "2300",
                            "start_time": "0000"
                        }
                    ],
                    "next_step_id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7"
                }
            ]
        },
      "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7": {
            "id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7",
            "type": "sms_response",
            "initial_step": false,
            "next_step_id": "MFSab81c45d290947e1b6ec18f0cd3a9b23",
            "message": "Thank you for messaging Joe’s Plumbing. We stepped away for lunch right now but will respond to your message as we return.",
            "first_text": false
        },
        "MFSab81c45d290947e1b6ec18f0cd3a9b23": {
            "id": "MFSab81c45d290947e1b6ec18f0cd3a9b23",
            "type": "tag",
            "initial_step": false,
            "next_step_id": null,
            "tag_ids": [
                1236698
            ]
        }
    }
  }
This endpoint returns a paginated array of all the message flows in a given company.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/message-flows/{message_flow_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the message flow object.
name	string	The name assigned to the message flow.
updated_at	string	The date and time the message flow was last updated in the current timezone (ISO 8601 format) with an offset.
tracker_ids	array(strings)	The list of tracker IDs the message flow is assigned to, if applicable.
initial_step_id	string	The string ID of the first step in the message flow.
steps	object	An object where the key of each object attribute is the same value as the id of the step. Each step object will contain up to 1 next_step_id entry indicating which step follows it. Terminal steps will not have a next_step_id. Each step type has its own distinct format.
Creating a message flow
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
          "name": "Intake number message flow",
          "initial_step_id": "tag-01",
          "steps": {
              {
              "id": "tag-01",
              "type": "tag",
              "next_step_id": "response-01",
              "tag_ids": [993186]
              },
              {
              "id": "response-01", 
              "type": "sms_response",
              "next_step_id": null,
              "message": "Thanks for reaching out to our business! Someone will respond to you shortly.",
              "first_text": true
              }
            }
          }' \
         "https://api.callrail.com/v3/a/{account_id}/message-flows.json"
The above command returns JSON structured object like this:

{
  "id": "MFL1e9075f25b1949928b0db7323d775064",
  "name": "Intake number message flow",
  "updated_at": "2025-02-26T11:11:53.353-05:00",
  "tracker_ids": [],
  "initial_step_id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
  "steps": {
      "MFS6fa29e4c8b1347fcbf2e8d9731b7061d": {
            "id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
            "type": "tag",
            "initial_step": true,
            "next_step_id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7",
            "tag_ids": [993186]
        },
      "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7": {
            "id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7",
            "type": "sms_response",
            "initial_step": false,
            "next_step_id": null,
            "message": "Thanks for reaching out to our business! Someone will respond to you shortly.",
            "first_text": true
        }
    }
  }
You can use the API to create a new message flow. Each message flow must have a unique name. Each step type requires a specific configuration. See Configuring message flows for details on how to construct your request.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/message-flows.json
Request Body
Name	Type	Required?	Description
company_id	string	required	Unique identifier for the company that owns the message flow.
name	string	required	The name of the message flow. Must be unique.
initial_step_id	string	required	A string ID of the first step in the message flow.
steps	object	required	An object where the key of each object attribute is the same value as the id of the step. Each step type has its own distinct format. See the documentation for Configuring message flows for more details.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	string	Unique identifier for the message flow object.
name	string	The name assigned to the message flow.
updated_at	string	The date and time the message flow was last updated in the current timezone (ISO 8601 format) with an offset.
tracker_ids	array(strings)	The list of tracker IDs the message flow is assigned to, if applicable.
initial_step_id	string	The string ID of the first step in the message flow.
steps	object	An object where the key of each object attribute is the same value as the id of the step. Each step object will contain up to 1 next_step_id entry indicating which step follows it. Terminal steps will not have a next_step_id. Each step type has its own distinct format.
Updating a message flow
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "initial_step_id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
          "steps": {
              {
              "id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
              "type": "tag",
              "next_step_id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7",
              "tag_ids": [993186, 2672419]
              },
              {
              "id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7", 
              "type": "sms_response",
              "next_step_id": null,
              "message": "Thanks for reaching out to our business! Someone will respond to you during business hours. We are available Monday-Friday, 8am-5pm.",
              "first_text": true
              }
            }
          }' \
         "https://api.callrail.com/v3/a/{account_id}/message-flows.json"
The above command returns JSON structured object like this:

{
  "id": "MFL1e9075f25b1949928b0db7323d775064",
  "name": "Intake number message flow",
  "updated_at": "2025-04-14T21:11:53.353-05:00",
  "tracker_ids": [],
  "initial_step_id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
  "steps": {
      "MFS6fa29e4c8b1347fcbf2e8d9731b7061d": {
            "id": "MFS6fa29e4c8b1347fcbf2e8d9731b7061d",
            "type": "tag",
            "initial_step": true,
            "next_step_id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7",
            "tag_ids": [993186, 2672419]
        },
      "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7": {
            "id": "MFS0dcb13a29ae64f14a8c9eaf4e932b5d7",
            "type": "sms_response",
            "initial_step": false,
            "next_step_id": null,
            "message": "Thanks for reaching out to our business! Someone will respond to you during business hours. We are available Monday-Friday, 8am-5pm.",
            "first_text": true
        }
    }
  }
You can use the API to update an existing message flow. Each message flow must have a unique name. Each step type requires a specific configuration. See Configuring message flows for more information on how to structure your request.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/message-flows/{message_flow_id}.json
Request Body
Name	Type	Required?	Description
name	string	optional	The name of the message flow. Must be unique.
initial_step_id	string	optional	A string ID of the first step in the message flow.
steps	object	optional	An object where the key of each object attribute is the same value as the id of the step. Each step type has its own distinct format. See the documentation for Configuring message flows.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the message flow object.
name	string	The name assigned to the message flow.
updated_at	string	The date and time the message flow was last updated in the current timezone (ISO 8601 format) with an offset.
tracker_ids	array(strings)	The list of tracker IDs the message flow is assigned to, if applicable.
initial_step_id	string	The string ID of the first step in the message flow.
steps	object	An object where the key of each object attribute is the same value as the id of the step. Each step object will contain up to 1 next_step_id entry indicating which step follows it. Terminal steps will not have a next_step_id. Each step type has its own distinct format.
Deleting a message flow
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/message-flows/MFL3e7a12c9f84e43e79a6a1b55c1c3405b.json"
The above command does not return any response data.

This endpoint deletes a message flow object in the target company. You cannot delete a message flow if it is assigned to a tracker.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/message-flows/{message_flow_id}.json
Response Fields
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

Configuring message flows
A message flow describes what happens when a tracking number receives a new inbound text message. This can involve multiple steps, including sending a reply to the lead. Each lead will only receive a text response from a message flow step up to once per 24-hour period. If they send a text, receive a response from the message flow, and then text again within that same 24-hour window, they will not receive that same text response again. If they waited until the next day to respond, they would receive the text response from the message flow, provided the other conditions of the flow are met.

There are a few requirements for message flows. - The tracking number must be a United States or Canadian local number. You cannot apply a message flow to a tracking number that is toll-free or from a country other than the USA or Canada. - This number must be fully registered for 10DLC. All businesses using numbers for outbound text messaging are required to register their business. To register, click here to fill out the initial registration form. - The number must have text messaging turned on in CallRail. You can verify this by checking the sms_enabled field on the Retrieving a single tracker endpoint. - Your account can not have Lead Center enabled.

API Representation
A distinction is made between an “auto-reply” and an “advanced” message flow, which can be found in the type field of a message flow array in any of the Trackers endpoints. An auto-reply sends the configured automated text reply to any lead who sends a text message to the tracking number.
An advanced message flow may have multiple steps, including day and time-of-day based replies, tags, and more. For an overview of message flows and an explanation of each step type, refer to our support documentation.

Auto-reply
{
  "message_flow": {
    "type": "auto-reply",
    "message": "Thanks for contacting our business! Someone will reach out to you shortly."
  }
}
An auto-reply can be configured directly in the Creating a tracker and Updating a tracker.

type: always auto-reply
message: The message body to be sent to the customer. Can be up to 1550 characters, but be aware that messages over 160 characters may be split into multiple texts. If the automated reply is the first outbound text to a lead, we will automatically include opt-out instructions if none were included in the message. Approved opt-out keywords are STOP, CANCEL, UNSUBSCRIBE, QUIT, or END.
Advanced message flow - existing
/* Use an existing advanced message flow with ID MFL0ff8f768fed24a428895dd617042c6db*/

{
  "message_flow": {
    "type": "advanced",
    "id": "MFL0ff8f768fed24a428895dd617042c6db"
  }
}

/* Remove a message flow or auto-reply from a tracking number*/

{
    "message_flow": null
}
Advanced message flows can only be configured in the Creating a message flow and Updating a message flow endpoints. However, you can assign existing message flows to your new and existing tracking numbers via the tracking number endpoints.

type: always advanced
id: the unique ID for the message flow, which can be retrieved through the Message flow endpoints in the id field
Advanced message flow - new
/* Create a message flow containing a schedule step with multiple branches*/
{
    "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Non-holiday message flow",
    "initial_step_id": "schedule-01",
        "schedule-01": {
            "id": "schedule-01",
            "type": "schedule",
            "initial_step": true,
            "next_step_id": "response-01",
            "branches": [
                {
                    "times": [
                        {
                            "day": "weekdays",
                            "end_time": "2359",
                            "start_time": "1700"
                        },
                        {
                            "day": "weekdays",
                            "end_time": "0800",
                            "start_time": "0000"
                        },
                        {
                            "day": "weekends",
                            "end_time": "2359",
                            "start_time": "0000"
                        }
                    ],
                    "next_step_id": "response-01"
                },
                {
                    "times": [
                        {
                            "day": "weekdays",
                            "end_time": "1700",
                            "start_time": "0800"
                        }
                    ],
                    "next_step_id": "no-response-01"
                }
            ]
        },
        "response-01": {
            "id": "response-01",
            "type": "sms_response",
            "initial_step": false,
            "next_step_id": null,
            "message": "Hi, thanks for reaching out to Hank's Hotdogs! You've reached us outside of our business hours. Someone will contact you when we're back in the office. We're open Monday-Friday, 8am-5pm. Reply STOP to opt out.",
            "first_text": true
        },
        "no-response-01": {
            "id": "no-response-01",
            "type": "no_response",
            "initial_step": false,
            "next_step_id": null
        }
    }
}
/* Create a message flow containing a tag step*/
{
    "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Tag as opportunity",
    "initial_step_id": "tag-01",
    "steps": {
        "tag-01": {
            "id": "tag-01",
            "type": "tag",
            "initial_step": true,
            "next_step_id": null,
            "tag_ids": [
                7079761
            ]
        }
    }
}
/* Create a message flow containing a response step*/
{
    "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Hank auto-responder",
    "initial_step_id": "response-01",
    "steps": {
        "response-01": {
            "id": "response-01",
            "type": "sms_response",
            "initial_step": true,
            "next_step_id": null,
            "message": "Thanks for contacting Hank's Hot Dogs! We actively monitor this line but can sometimes take a few hours to respond if we're onsite grillin dogs for another customer. Please be patient and we'll get back to you as soon as possible. If this is urgent, please give us a call.",
            "first_text": false
        }
    }
}
/* Create a message flow containing a forward message step*/
{
    "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Forward to main line",
    "initial_step_id": "forward-01",
    "steps": {
        "forward-01": {
            "id": "forward-01",
            "type": "forward_message",
            "initial_step": true,
            "next_step_id": null,
            "destination_number": "+15558675309"
        }
    }
}
Request Body - all message flows & step types
Name	Type	Required?	Description
company_id	string	required	Unique identifier for the company that owns the message flow.
name	string	required	The name of the message flow. Must be unique.
initial_step_id	string	required	A string ID of the first step in the message flow. You can generate your own unique ID, which will be replaced with a system-generated ID when the message flow is created. We recommend a convention of “step type-nn”, for example schedule-01, response-01, response-02
steps	object	required	An object where the key of each object attribute is the same value as the id of the step. Each step type has its own distinct format. All step types require id, type, initial_step, and next_step_id. Refer to the tables below for specific step type requirements.
id	string	required	A string ID identifying the step. You can generate your own unique ID, which will be replaced with a system-generated ID when the message flow is created.
type	string	required	One of schedule, sms_response, no_response, tag, or forward_message
initial_step	boolean	required	Indicates whether this is the initial step in the flow. This must be true for the step matching initial_step_id and false for all other steps
next_step_id	string	required	The unique ID of the next step in the flow. If this is the final step, this should be null
Request Body - schedule steps
Name	Type	Required?	Description
branches	array	required	An array of schedule branches. Each schedule step must have at least 1 branch. Days and times cannot overlap across branches.
times	array	required	An array of times in a schedule branch. Each branch must have at least 1 time defined. Days and times cannot overlap within times.
day	string	required	One of any_day, weekdays, weekends, monday, tuesday, wednesday, thursday, friday, saturday, sunday
start_time	string	required	The start time expressed in military time. It must be before the end_time. If you need to wrap a schedule over midnight, use 2 times arrays. One will have the desired start time and an end_time of 2359, and the other will have a start_time of 0000 and end at the desired time.
end_time	string	required	The end time expressed in military time. It must be after the start_time.
Request Body - response steps
Name	Type	Required?	Description
message	string	required	The message body to be sent to the customer. It can be up to 1550 characters, but be aware that messages over 160 characters may be split into multiple texts. If the automated reply is the first outbound text to a lead, we will automatically include opt-out instructions if none were included in the message. Approved opt-out keywords are STOP, CANCEL, UNSUBSCRIBE, QUIT, or END.
first_text	boolean	required	Allows you to only send the text to a lead if it is their first ever text to the business. true means the message will only be sent to first-time texters, false means the message will be sent to all texters.
Request Body - tag steps
Name	Type	Required?	Description
tag_ids	array	required	An array of tag IDs to apply to the text conversation. Tag IDs can be retrieved from the Retrieving all tags endpoint.
Request Body - no response steps
None

Request Body - forward message steps
The forward_message step type is not available for HIPAA or white label accounts.
Name	Type	Required?	Description
destination_number	string	required	The phone number to forward the text message to. Must be a valid phone number capable of receiving text messages, in E.164 format (e.g., +15558675309).
Trackers
Trackers are phone numbers that can be used to route phone calls to a business. CallRail provides two different types of trackers.

Source trackers associate a single tracking number to a certain set of customers based on how they found the number. For example, a single source tracker might be used to identify website visitors who came from facebook.com, or all visitors who found your site from a paid Google search. Or it may attribute to an offline source such as a billboard or TV advertisement. When used online, a single source tracking phone number may be shown to multiple visitors simultaneously, and as such cannot be used to capture full session details for individual visitors.

Session trackers serve one number from a pool of tracking numbers to website visitors, allowing you to associate calls to individual visitors, the keywords they searched for before arriving via search engine, and their browsing history on your site.

Listing All Trackers
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/trackers.json"
The above command returns JSON structured object like this:

{
  "page": 1,
  "per_page": 250,
  "total_pages": 1,
  "total_records": 3,
  "trackers": [
    {
      "id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "name": "My Billboard",
      "type": "source",
      "status": "active",
      "destination_number": "+15553104554",
      "tracking_numbers": ["+14045559999"],
      "whisper_message": null,
      "sms_enabled": false,
      "sms_supported": true,
      "company": {
        "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "name": "Bob's Auto Shop"
      },
      "call_flow": {
        "type": "basic",
        "recording_enabled": true,
        "destination_number": "+15553104554",
        "greeting_text": "This call will be recorded for quality assurance"
      },
      "source": {
        "type": "search",
        "search_engine": "google",
        "search_type": "organic"
      },
      "created_at": "2011-07-05T19:06:10Z",
      "disabled_at": null
    },
    {
      "id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Widget Shop",
      "type": "session",
      "status": "active",
      "destination_number": "+15553104554",
      "tracking_numbers": ["+14045551111","+14045552222", "+14045553333", "+14045554444"],
      "whisper_message": "Call from [source].",
      "sms_enabled": true,
      "sms_supported": true,
      "company": {
        "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
        "name": "Bob's Auto Shop"
      },
      "call_flow": {
        "type": "basic",
        "recording_enabled": true,
        "destination_number": "+15553104554",
        "greeting_text": "This call will be recorded for quality assurance"
      },
      "source": {
        "google": ["paid", "organic"],
        "bing": ["paid", "organic"],
        "yahoo": ["paid", "organic"]
      },
      "created_at": "2011-07-05T19:06:10Z",
      "disabled_at": null
    }
  ]
}
This endpoint returns a paginated array of all companies associated with the target account.

Method	URL
GET	/v3/a/{account_id}/trackers.json
Request Parameters
This endpoint supports Offest Pagination, Field Selection, Sorting, Filtering, and Searching.

Name	Type	Required?	Description
company_id	string	optional	Limit response to trackers belonging to a single company.
Sorting is available for the following fields:

name
Filtering is available for the following:

type: session or source

status: active or disabled

Searching is available for the following fields:

name
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for this Tracker.
name	string	Descriptive Name for this Tracker.
type	string	Type of tracker. One of “source” or “session”.
destination_number	string	The destination phone number that rings when calls are placed to a tracker.
status	string	Current status of the tracker. Returns “active” or “disabled”.
tracking_numbers	array	List of tracking phone numbers for this Tracker.
whisper_message	string	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message. If the whisper message contains [source], it will whisper the detected source of the caller.
sms_enabled	boolean	Whether or not this tracker is configured to send and receive text messages. This setting is currently only supported for local phone numbers in the US and Canada.
sms_supported	boolean	Indicates whether or not this tracker can support text messages. (i.e., whether or not sms_enabled could be set to true)
company	object	Basic information on which company owns this Tracker.
call_flow	object	An object describing how calls are routed for this Tracker.
source	object	An object describing the source of the calls that this tracker will handle.
created_at	string	The date and time the Tracker was created in UTC (ISO 8601 format).
disabled_at	string	If the tracker has been disabled, this will be the date and time at which it was disabled (UTC, ISO 8601 format). If the tracker is still enabled, this value will be null.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
campaign_name	string	If set, the campaign name assigned to your source tracking number in CallRail. The campaign name is associated with all calls to that tracking number and can be used as a filtering option for that number in the call log and in your reports.
swap_targets	array	A list of telephone numbers configured to dynamically replace with a tracking number. See Swap Targets.
Retrieving a Single Tracker
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/trackers/{tracker_id}.json"
The above command returns JSON structured object like this:

{
  "id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "name": "My Billboard",
  "type": "source",
  "status": "active",
  "destination_number": "+15553104554",
  "tracking_numbers": ["+14045554444"],
  "whisper_message": "Call from [source].",
  "sms_enabled": true,
  "sms_supported": true,
  "company": {
    "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Bob's Auto Shop"
  },
  "call_flow": {
    "type": "basic",
    "recording_enabled": true,
    "destination_number": "+15553104554",
    "greeting_text": "This call will be recorded for quality assurance"
  },
  "source": {
    "type": "search",
    "search_engine": "google",
    "search_type": "organic"
  },
  "created_at": "2011-07-05T19:06:10Z",
  "disabled_at": null
}
This endpoint returns a single tracker object associated with the target account.

Method	URL
GET	/v3/a/{account_id}/trackers/{tracker_id}.json
Request Parameters
This endpoint supports Field Selection.

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	sring	Unique identifier for this Tracker.
name	string	Descriptive Name for this Tracker.
type	string	Type of tracker. One of “source” or “session”.
destination_number	string	The destination phone number that rings when calls are placed to a tracker.
status	string	Current status of the tracker. Returns “active” or “disabled”.
tracking_numbers	array	List of tracking phone numbers for this Tracker.
whisper_message	string	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message. If the whisper message contains [source], it will whisper the detected source of the caller.
sms_enabled	boolean	Whether or not this tracker is configured to send and receive text messages. This setting is currently only supported for local phone numbers in the US and Canada.
sms_supported	boolean	Indicates whether or not this tracker can support text messages. (i.e., whether or not sms_enabled could be set to true)
company	object	Basic information on which company owns this Tracker.
call_flow	object	An object describing how calls are routed for this Tracker.
source	object	An object describing the source of the calls that this tracker will handle.
created_at	string	The date and time the Tracker was created in UTC (ISO 8601 format).
disabled_at	string	If the tracker has been disabled, this will be the date and time at which it was disabled (UTC, ISO 8601 format). If the tracker is still enabled, this value will be null.
Additional User Requested Response Fields
Field Selection is available for the following fields.

Name	Type	Description
campaign_name	string	If set, the campaign name assigned to your source tracking number in CallRail. The campaign name is associated with all calls to that tracking number and can be used as a filtering option for that number in the call log and in your reports.
swap_targets	array	A list of telephone numbers configured to dynamically replace with a tracking number. See Swap Targets.
Creating a Session Tracker
curl  -H "Authorization: Token token=\"{api_token}\"" \
      -X POST \
      -H "Content-Type: application/json" \
      -d '{
            "type": "session",
            "name": "Website Call Tracker",
            "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
            "swap_targets": ["7704761456", "7705551234"],
            "whisper_message": "Call from [source]",
            "sms_enabled": true,
            "pool_size": 10,
            "call_flow": {
              "type": "basic",
              "recording_enabled": true,
              "destination_number": "+15553104554",
              "greeting_text": "This call will be recorded for quality assurance"
            },
            "pool_numbers": {
              "area_code": "555",
              "local": "+15553104554"
            },
            "source": {
              "google": ["paid", "organic"],
              "bing": ["paid", "organic"],
              "yahoo": ["paid", "organic"]
            }
          }' \
      "https://api.callrail.com/v3/a/{account_id}/trackers.json"
This endpoint creates a session tracker within the target company. See the Terminology section for more info about session trackers.

The above command returns JSON structured object like this:

{
  "id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "name": "Website Call Tracker",
  "type": "session",
  "status": "active",
  "destination_number": "+15553104554",
  "tracking_numbers": ["+14045551111","+14045552222", "+14045553333", "+14045554444"],
  "whisper_message": "Call from [source]",
  "sms_supported": true,
  "sms_enabled": true,  
  "company": {
    "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Bob's Auto Shop"
  },
  "call_flow": {
    "type": "basic",
    "recording_enabled": true,
    "destination_number": "+15553104554",
    "greeting_text": "This call will be recorded for quality assurance"
  },
  "source": {
    "google": ["paid", "organic"],
    "bing": ["paid", "organic"],
    "yahoo": ["paid", "organic"]
  },
  "created_at": "2011-07-05T19:06:10Z",
  "disabled_at": null
}
API Endpoint
Method	URL
POST	/v3/a/{account_id}/trackers.json
Request Body
Name	Type	Required?	Description
name	string	required	Name of the tracker.
type	string	required	Type of tracker to create. Use “session” to create a session tracker.
company_id	string	required	An ID indicating which company the tracker belongs to.
call_flow	object	required	An object describing what happens to the customer’s call. See Configuring Call Flows.
message_flow	object	optional	An object describing what happens when a tracking number receives a new inbound text message. sms_enabled must be true to use a message flow. See Configuring message flows for more information.
pool_size	number	required	How many phone numbers to allocate to this tracker. Must be between 4 and 50.
pool_numbers	object	required	An object describing constraints for provisioning tracking phone numbers. See Requesting a Number.
source	string or object	required	An object describing which visitors will be served this tracker. See Session Tracker Call Sources.
swap_targets	array	optional	The telephone number(s) to target for replacement on your website. When this Tracker applies, this number will be replaced with a tracking phone number. No formatting is required, as the script will search for all possible formats. If no swap targets are provided, the destination number will be used.
whisper_message	string	optional	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message.
If the whisper message contains [source], it will whisper the name of the tracker.
sms_enabled	boolean	optional	Allows text messages to be sent and received by this tracker. This setting is currently only supported for local phone numbers in the US and Canada.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	string	Unique identifier for this Tracker.
name	string	Descriptive Name for this Tracker.
type	string	Type of tracker. One of “source” or “session”.
status	string	Current status of the tracker. Returns “active” or “disabled”.
destination_number	string	The destination phone number that rings when calls are placed to a tracker.
tracking_numbers	array	List of tracking phone numbers for this Tracker.
whisper_message	string	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message.
sms_supported	boolean	Indicates whether or not this tracker can support text messages. (i.e., whether or not sms_enabled could be set to true)
sms_enabled	boolean	Whether or not this tracker is configured to send and receive text messages. This setting is currently only supported for local phone numbers in the US and Canada.
company	object	Basic information on which company owns this Tracker.
call_flow	object	An object describing how calls are routed for this Tracker.
message_flow	array	An array describing what happens when a tracking number receives a new inbound text message.
source	object	An object describing the source of the calls that this tracker will handle.
created_at	string	The date and time the Tracker was created in UTC (ISO 8601 format).
disabled_at	string	If the tracker has been disabled, this will be the date and time at which it was disabled (UTC, ISO 8601 format). If the tracker is still enabled, this value will be null.
Creating a Source Tracker
curl  -H "Authorization: Token token=\"{api_token}\"" \
      -H "Content-Type: application/json" \
      -X POST
      -d '{
            "name": "My Billboard",
            "company_id": "COM8154748ae6bd4e278a7cddd38a662f4f",
            "call_flow": {
              "type": "basic",
              "recording_enabled": false,
              "destination_number": "+15553104554",
              "greeting_text": "This call will be recorded for quality assurance"
            },
            "tracking_number": {
              "area_code": "555",
              "local": "+15553104554"
            },
            "sms_enabled": true,
            "source": {
              "type": "search",
              "search_engine": "google",
              "search_type": "organic"
            },
            "type": "source",
            "swap_targets": ["7704761456", "7705551234"],
            "whisper_message": "Call from My Billboard",
            "campaign_name": "Summer billboard campaign"
          }' \
      "https://api.callrail.com/v3/a/{agency_id}/trackers.json"
The above command returns JSON structured object like this:

{
  "id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "name": "My Billboard",
  "type": "source",
  "status": "active",
  "destination_number": "+15553104554",
  "tracking_numbers": ["+14045554444"],
  "whisper_message": "Call from My Billboard",
  "sms_supported": true,
  "sms_enabled": true,
  "company": {
    "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Bob's Auto Shop"
  },
  "call_flow": {
    "type": "basic",
    "recording_enabled": true,
    "destination_number": "+15553104554",
    "greeting_text": "This call will be recorded for quality assurance"
  },
  "source": {
    "type": "search",
    "search_engine": "google",
    "search_type": "organic"
  },
  "created_at": "2011-07-05T19:06:10Z",
  "disabled_at": null
}
This endpoint creates a source tracker in the target company. See the Terminology section for more info about source trackers.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/trackers.json
Request Body
Name	Type	Required?	Description
name	string	required	A descriptive name for this tracker.
type	string	required	Type of tracker to create. Use “source” to create a source tracker.
company_id	string	required	An ID indicating which company the tracker belongs to.
call_flow	object	required	An object describing what happens to the customer’s call. See Configuring Call Flow.
message_flow	object	optional	An object describing what happens when a tracking number receives a new inbound text message. sms_enabled must be true to use a message flow. See Configuring message flows for more information.
tracking_number	object	required	An object describing what constraints the tracking phone number should have. See Requesting a Number.
source	object	required	An object describing how the visitor will be routed to this tracker. See Source Tracker Call Sources.
campaign_name	string	optional	A campaign name for this tracker.
sms_enabled	boolean	optional	Allows text messages to be sent and received by this tracker. This setting is currently only supported for local phone numbers in the US and Canada.
swap_targets	array	optional	The telephone number(s) to target for replacement on your website. When this Tracker applies, this number will be replaced with a tracking phone number. No formatting is required, as the script will search for all possible formats. If no swap targets are provided, the destination number will be used.
whisper_message	string	optional	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message.
campaign_name	string	optional	The Campaign Name for this tracker. This can only be set for source trackers.
Response Fields
When successful, the HTTP response code will indicate 201 Created.

Name	Type	Description
id	string	Unique identifier for this Tracker.
name	string	Descriptive Name for this Tracker.
type	string	Type of tracker. One of “source” or “session”.
status	string	Current status of the tracker. Returns “active” or “disabled”.
destination_number	string	The destination phone number that rings when calls are placed to a tracker.
tracking_numbers	array	List of tracking phone numbers for this Tracker.
whisper_message	string	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message.
sms_supported	boolean	Indicates whether or not this tracker can support text messages. (i.e., whether or not sms_enabled could be set to true)
sms_enabled	boolean	Whether or not this tracker is configured to send and receive text messages. This setting is currently only supported for local phone numbers in the US and Canada.
company	object	Basic information on which company owns this Tracker.
call_flow	object	An object describing how calls are routed for this Tracker.
message_flow	array	An array describing what happens when a tracking number receives a new inbound text message.
source	object	An object describing the source of the calls that this tracker will handle.
created_at	string	The date and time the Tracker was created in UTC (ISO 8601 format).
disabled_at	string	If the tracker has been disabled, this will be the date and time at which it was disabled (UTC, ISO 8601 format). If the tracker is still enabled, this value will be null.
Updating a Session Tracker
curl  -H "Authorization: Token token=\"{api_token}\"" \
      -H "Content-Type: application/json" \
      -X PUT
      -d '{
            "name": "My Website Tracker",
            "swap_targets": ["7704761456", "7705551234"],
            "whisper_message": "Call from [source]",
            "pool_size": 4,
            "sms_enabled": true,
            "call_flow": {
              "type": "basic",
              "recording_enabled": true,
              "destination_number": "+14044554321",
              "greeting_text": "This call will be recorded for quality assurance"
            },
            "source": {
              "google": ["paid", "organic"],
              "bing": ["paid", "local"]
            },
            "replace_tracking_number": "+14044556789"
          }' \
      "https://api.callrail.com/v3/a/{account_id}/trackers/{tracker_id}.json"
The above command returns JSON structured object like this:

{
  "id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "name": "My Website Tracker",
  "type": "session",
  "status": "active",
  "destination_number": "+14044554321",
  "tracking_numbers": ["+14045551111", "+14045552222", "+14045553333", "+14045554444"],
  "whisper_message": "Call from [source]",
  "sms_supported": true,
  "sms_enabled": true,
  "company": {
    "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Bob's Auto Shop"
  },
  "call_flow": {
    "type": "basic",
    "recording_enabled": true,
    "destination_number": "+14044554321",
    "greeting_text": "This call will be recorded for quality assurance"
  },
  "source": {
    "google": ["paid", "organic"],
    "bing": ["paid", "local"]
  },
  "created_at": "2011-07-05T19:06:10Z",
  "disabled_at": null
}
This endpoint updates an existing session tracker within the target company. See the Terminology section for more info about session trackers.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/trackers/{tracker_id}.json
Request Body
Name	Type	Required?	Description
name	string	optional	Name of the tracker.
pool_size	number	optional	The count of phone numbers to allocate to this pool. To prevent unexpected loss of live phone numbers, this size can only be increased.
*Numbers may not be available immediately after updating pool size.
whisper_message	string	optional	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message. If the whisper message contains [source], it will whisper the detected source of the caller.
swap_targets	array	optional	The telephone number(s) to target for replacement on your website. When this Tracker applies, this number will be replaced with a tracking phone number. No formatting is required, as the script will search for all possible formats. If no swap targets are provided, the destination number will be used.
call_flow	object	optional	An object describing what happens to the customer’s call. See Configuring Call Flows.
message_flow	object	optional	An object describing what happens when a tracking number receives a new inbound text message. sms_enabled must be true to use a message flow. See Configuring message flows for more information.
source	string or object	optional	An object describing which visitors will be served this tracker. See Configuring Call Sources.
sms_enabled	boolean	optional	Allows text messages to be sent and received by this tracker. This setting is currently only supported for local phone numbers in the US and Canada.
replace_tracking_number	string	optional	A single number in the website pool that should be replaced due to a high number of wrong-number, robodialer, or spam calls. Must be a number in the pool, in e164 format. Each number you replace will be automatically replaced with the same type of tracking number within the same area code. For more information, please see our support article.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for this Tracker.
name	string	Descriptive Name for this Tracker.
type	string	Type of tracker is “session”.
status	string	Current status of the tracker. Returns “active” or “disabled”.
destination_number	string	The destination phone number that rings when calls are placed to a tracker.
tracking_numbers	array	List of tracking phone numbers for this Tracker.
whisper_message	string	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message.
sms_supported	boolean	Indicates whether or not this tracker can support text messages. (i.e., whether or not sms_enabled could be set to true)
sms_enabled	boolean	Whether or not this tracker is configured to send and receive text messages. This setting is currently only supported for local phone numbers in the US and Canada.
company	object	Basic information on which company owns this Tracker.
call_flow	object	An object describing how calls are routed for this Tracker.
message_flow	array	An array describing what happens when a tracking number receives a new inbound text message.
source	object	An object describing the source of the calls that this tracker will handle.
created_at	string	The date and time the Tracker was created in UTC (ISO 8601 format).
disabled_at	string	If the tracker has been disabled, this will be the date and time at which it was disabled (UTC, ISO 8601 format). If the tracker is still enabled, this value will be null.
Updating a Source Tracker
curl  -H "Authorization: Token token=\"{api_token}\"" \
      -H "Content-Type: application/json" \
      -X PUT
      -d '{
            "call_flow": {
              "type": "basic",
              "recording_enabled": false,
            },
            "source": {
              "type": "search",
              "search_engine": "google",
              "search_type": "organic"
            },
            "sms_enabled": true,
            "swap_targets": ["7705551234", "7705554567"],
            "whisper_message": "",
            "replace_tracking_number": "+14044556789",
            "campaign_name": "Summer billboard campaign"
          }' \
      "https://api.callrail.com/v3/a/{account_id}/trackers/{tracker_id}.json"
The above command returns JSON structured object like this:

{
  "id": "TRK8154748ae6bd4e278a7cddd38a662f4f",
  "name": "My Billboard",
  "type": "source",
  "status": "active",
  "destination_number": "+15553104554",
  "tracking_numbers": ["+14045551114"],
  "whisper_message": null,
  "sms_supported": true,
  "sms_enabled": true,
  "company": {
    "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
    "name": "Bob's Auto Shop"
  },
  "call_flow": {
    "type": "basic",
    "recording_enabled": false,
    "destination_number": "+15553104554",
    "greeting_text": "This call will be recorded for quality assurance",
    "greeting_recording_url": null
  },
  "source": {
    "type": "search",
    "search_engine": "google",
    "search_type": "organic"
  },
  "created_at": "2011-07-05T19:06:10Z",
  "disabled_at": null
}
This endpoint updates an existing source tracker within the target company. See the Terminology section for more info about source trackers.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/trackers/{tracker_id}.json
Request Body
Name	Type	Required?	Description
name	string	optional	Name of the tracker.
whisper_message	string	optional	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message. If the whisper message contains [source], it will whisper the detected source of the caller.
swap_targets	array	optional	The telephone number(s) to target for replacement on your website. When this Tracker applies, this number will be replaced with a tracking phone number. No formatting is required, as the script will search for all possible formats. If no swap targets are provided, the destination number will be used.
sms_enabled	boolean	optional	Allows text messages to be sent and received by this tracker. This setting is currently only supported for local phone numbers in the US and Canada.
call_flow	object	optional	An object describing what happens to the customer’s call. See Configuring Call Flows.
message_flow	object	optional	An object describing what happens when a tracking number receives a new inbound text message. sms_enabled must be true to use a message flow. See Configuring message flows for more information.
source	object	optional	An object describing which visitors will be served this tracker. See Source Tracker Call Sources.
replace_tracking_number	string	optional	To be used if the the tracking number associated with the source tracker must be replaced due to a high number of wrong-number, robodialer, or spam calls. Must be in e164 format. Each number you replace will be automatically replaced with the same type of tracking number within the same area code. For more information, please see our support article.
campaign_name	string	optional	The Campaign Name for this tracker. This can only be set for source trackers.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for this Tracker.
name	string	Descriptive Name for this Tracker.
type	string	Type of tracker is “source”.
status	string	Current status of the tracker. Returns “active” or “disabled”.
destination_number	string	The destination phone number that rings when calls are placed to a tracker.
tracking_numbers	array	List of tracking phone numbers for this Tracker.
whisper_message	string	A ‘Whisper Message’ is a short message that plays to the call recipient before the call is connected. The caller does not hear this message.
sms_supported	boolean	Indicates whether or not this tracker can support text messages. (i.e., whether or not sms_enabled could be set to true)
sms_enabled	boolean	Whether or not this tracker is configured to send and receive text messages. This setting is currently only supported for local phone numbers in the US and Canada.
company	object	Basic information on which company owns this Tracker.
call_flow	object	An object describing how calls are routed for this Tracker.
message_flow	array	An array describing what happens when a tracking number receives a new inbound text message.
source	object	An object describing the source of the calls that this tracker will handle.
created_at	string	The date and time the Tracker was created in UTC (ISO 8601 format).
disabled_at	string	If the tracker has been disabled, this will be the date and time at which it was disabled (UTC, ISO 8601 format). If the tracker is still enabled, this value will be null.
Disabling a Tracker
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/trackers/{tracker_id}.json"
The above command does not return any response data.

This endpoint disables an Tracker object in the target company.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/trackers/{tracker_id}.json
Response
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

If the Tracker is used as an Outbound Number for form submissions, a 400 error with the following response will be returned.

{ error: 'You must select a different number for outbound Form Submission calls before disabling this tracker.' }

Requesting a Number
When creating a Source or Session Tracker, you are given the opportunity to request what kind of phone number(s) you would like to use for the tracker.

At least one parameter must be provided to obtain number(s).

The options you can provide are as follows:

Name	Type	Description
area_code	string	The phone number should be located in the provided area code.
local	string	The phone number should be “local” to another phone number (for example, your main business number).
toll_free	boolean	If true, the phone number should be toll free.
Examples:
{
  "local": "+14045558769"
}
Request a phone number local to a given business phone number.

This is the most common use case for local numbers. CallRail will attempt to obtain a phone number in the same area code as the provided number. If no inventory is available in that area code, the search will fall back to other local area codes when available.

{
  "area_code": "404",
  "local": "+14045558769"
}
Request a phone number local to a given business phone number, but require in the 404 area code.

A number in the same area code is required in this example. If no inventory is available in 404, the Tracker will not be created and an error will be returned.

{
  "area_code": "303"
}
Request any phone number in the 303 area code.

{
  "toll_free": true
}
Request a toll free number in any area code.

This is the most common use case for toll free numbers. This may be an 888, 877, 866, or 855 number. CallRail will prefer area codes in that order.

{
  "area_code": "888",
  "toll_free": true
}
Request a toll free number in the 888 area code.

A number in the 888 area code is required in this example. If no 888 numbers are available, the Tracker will not be created and an error will be returned.

Configuring Call Flows
Call Flows are analogous to traditional telephone interactive voice response (IVR) systems. Call Flows allow for custom prompts and dynamic call routing to take place on a per call basis. At this time, only touch tone responses via the caller’s phone keypad are able to interact with a Call Flow.

The Call Flow Object describes what happens to an incoming phone call to a tracking number. This can involve multiple steps before ultimately routing a call to the destination number or voicemail.

API Representation
A distinction is made between a “basic” call flow and an “advanced” call flow. A basic call flow may play either a text or recorded greeting before routing the call to the destination number. An advanced call flow may have multiple steps including menus, time of day based routing, voicemail, or more.

At this time, you can create new Basic Call Flow Objects or assign existing Advanced Call Flow Objects when when creating or updating a Source Tracker or Session Tracker via the API. When assigning an existing Advanced Call Flow to a Tracker, you must reference its UUID, which can be retrieved through the CallRail application interface. After opening the desired call flow, you can retrieve the UUID in the page URL. You will find the UUID after the call-flow/ portion of the URL.

Advanced Call Flow Objects can only be configured or updated through the CallRail application interface. However, when retrieving Trackers with Advanced Call Flows the format described below will be used.

Basic Call Flow Object
/* no greeting */
{
  "type": "basic",
  "recording_enabled": false,
  "destination_number": "+15558675309",
  "greeting_text": null,
  "greeting_recording_url": null
}

/* recorded greeting */
{
  "type": "basic",
  "recording_enabled": true,
  "destination_number": "+15558675309",
  "greeting_text": null,
  "greeting_recording_url": "https://s3.aws.com/.../recording.mp3"
}

/* text greeting */
{
  "type": "basic",
  "recording_enabled": true,
  "destination_number": "+15558675309",
  "greeting_text": "This call will be recorded for quality assurance",
  "greeting_recording_url": null
}

/* text greeting (will default to text greeting only) */
{
  "type": "basic",
  "recording_enabled": true,
  "destination_number": "+15558675309",
  "greeting_text": "This call will be recorded for quality assurance",
  "greeting_recording_url": "https://s3.aws.com/.../recording.mp3"
}
type: Always the word “basic”.
recording_enabled: Whether or not this Call Flow records calls. Note that in some jurisdictions you may be obligated to inform the caller that the call is being recorded. If this applies to you, use the greeting options below when creating a Call Flow in order to play a greeting message that informs the caller about call recording.
destination_number: where incoming calls should ring.
greeting_text: Text, if any, that should be read to the caller prior to connecting to the destination number.
greeting_recording_url: The web address of a recording to be played to the caller prior to connecting to the destination number. This can be either a .wav or .mp3 file.
When setting a greeting_recording_url during create or update, greeting_textmust be set to null to ensure greeting_recording_url to be set up. Providing both greeting_text and greeting_recording_url will result in greeting_text being set up by default.
When specifying a greeting_recording_url during create or update, CallRail will retrieve the specified file once and store it within the application. (This is necessary to ensure availability and playback compatibility.) The URL returned in the response will be the location of the copy stored by CallRail, and any future changes with the original recording will not be reflected within CallRail.
Advanced Call Flow Object - Existing
/* Use an existing Advanced Call Flow with ID 4d28a8d3-0137-4c9f-9c1f-a5505cef0674*/

{
  "type": "advanced",
  "uuid": "4d28a8d3-0137-4c9f-9c1f-a5505cef0674"
}
Advanced Call Flow Objects can only be configured or updated through the CallRail application interface. However, you can assign existing Advanced Call Flows to your new and existing tracking numbers via the API.

When assigning an existing Advanced Call Flow to a Tracker, you must reference its UUID, which can be retrieved through the CallRail application interface. After opening the desired call flow, you can retrieve the UUID in the page URL. You will find the UUID after the call-flow/ portion of the URL.

Advanced Call Flow Object - New
/* route to voicemail or dial a number based on a menu */

{
  "type": "advanced",
  "recording_enabled": false,
  "initial_step_id": "CRS8154748ae6bd4e278a7cddd38a662f4f",
  "steps": [
    {
      "destination_number": "+15551234567",
      "timeout": 60,
      "timeout_step_id": null,
      "id": 344126405,
      "type": "dial"
    },
    {
      "prompt_type": "text",
      "prompt_recording_id": null,
      "prompt_text": "Thank you for your support call. Please leave a message.",
      "transcribe": false,
      "id": 250778404,
      "type": "voicemail"
    },
    {
      "prompt_type": "text",
      "prompt_recording_id": null,
      "prompt_text": "Press 1 for Sales, press 2 for Support.",
      "menu_options": [
        {
          "key": "1",
          "description": "Forward to Sales",
          "next_step_id": 344126405
        },
        {
          "key": "2",
          "description": "Forward to Support",
          "next_step_id": 250778404
        }
      ],
      "id": 210884509,
      "type": "menu"
    }
  ]
}
The format for more advanced call flows is necessarily more complex:

type: Always the word “advanced”
recording_enabled: Whether or not this Call Flow records calls. Note that in some jurisdictions you may be obligated to inform the caller that the call is being recorded. If this applies to you, use the greeting options below when creating a Call Flow in order to play a greeting message that informs the caller about call recording.
initial_step_id: The string id of the first step in the call flow.
steps: An array of step objects. Each step object will contain one or more next_step_id entries indicating which step follows it. Terminal steps (e.g. “Ring a phone”, “Send to Voicemail”) will not have a next_step_id. Each step has its own distinct format.
Session Tracker Call Sources
The Call Source object describes the type of website visitor that will be tracked by a Session Tracker, and therefore see numbers from the pool.

// Track all website visitors, regardless of source
"source": "all"

// Note that the API will return a structured object
"source": {
  "type": "all"
}
Tracking All Visitors
To track all website visitors regardless of source, specify the string "all" in place of the object. This is the most common usage scenario.

// To track only visitors from Google Ads:
"source": {
  "google": ["paid"]
}

// To track all PPC visitors:
"source": {
  "google": [ "paid" ],
  "yahoo": [ "paid" ],
  "bing": [ "paid" ]
}

// To track Google Ads visitors and visitors with
// specific landing page parameters:
"source": {
  "google": [ "paid" ],
  "landing": [ "facebook_landing", "email_landing" ]
}

// To track all visitors except direct visitors and
// those coming from organic search results:
"source": {
  "inverted": true,
  "type": "direct",
  "google": [ "organic" ],
  "yahoo": [ "organic" ],
  "bing": [ "organic" ]
}
Advanced Session Tracking Options
Session Trackers can also be used to only track visitors from specific search engines, or based on other attributes from the referring URL or landing page. To configure using this option, pass a JSON object with any of the keys described below.

Name	Type	Description
type	string	Specify “direct” to include direct visitors.
google	array	An array of types of Google Search to be handled by this tracker. Possible values are “paid” and “organic”.
bing	array	An array of types of Bing Search to be handled by this tracker. Possible values are “paid” and “organic”.
yahoo	array	An array of types of Yahoo Search to be handled by this tracker. Possible values are “paid” and “organic”.
landing	array	An array of values to look for in the landing page URL. These values are used for simple string matching and can match path names, file names, URL parameter names, and URL parameter values.
referrer	array	An array of values to look for in the referring page. These values are used for simple string matching and are most commonly used as a list of domain names to match.
inverted	boolean	Set to true to invert the matching rules. Default is false. When set as true, visitors not matching the previously defined rules will see a tracking number from this Session Tracker pool.
Source Tracker Call Sources
The Call Source object describes the type of website visitor who will see this tracking number. (Source Trackers can alternatively be configured as “offline” trackers for use in offline media such as billboards or TV ads.) Depending on the source type configured, different fields may be present in the Call Source object.

All Call Source objects will have the following:

Name	Type	Description
type	string	Indicates the traffic source assigned for this tracking number. One of “all”, “landing_url”, “landing_params”, “offline”, “web_referrer”, “direct”, “search”, “google_ad_extension”, “mobile_ad_extension”, or “google_my_business”.
// Show this number to all website visitors
"source": {
  "type": "all"
}
All Visitors
A value of "all" indicates that all online traffic will see the number associated with this tracker. There are no other fields in the object.

Note that this can also be used as a catch-all setting. If any other Source Tracker or Session Tracker would match a given visitor, that number will take precedence over this configuration.

// Show this number to any visitor who first lands on "www.example.com/promo1"
"source": {
  "type": "landing_url"
  "landing": "www.example.com/promo1"
}
Landing URL
A value of "landing_url" indicates that online visitors who first land on a specific webpage will be shown the tracking number. The tracking number will persist for the visitor even as they navigate to other pages on the site.

Name	Type	Description
type	string	“landing_url”
landing	string	The landing page URL that will trigger this number to be served.
Example “www.example.com/promo1”
// Show this number to any visitor who first lands on a page with
// "promo=1" in the URL parameters
"source": {
  "type": "landing_params"
  "landing": "promo=1"
}
Landing Parameters
A value of "landing_params" indicates that online visitors who first land on a page with the specified query parameters will be served the tracking number. The tracking number will persist for the visitor as they navigate to other pages on the site, even without the landing parameter present.

Name	Type	Description
type	string	“landing_params”
landing	string	The query parameters that will trigger this number to be served.
Example “promo=1”
// Never swap this number on the website. This number is reserved for
// offline use, or non-webpage online use.
"source": {
  "type": "offline"
}
Offline
A value of "offline" means that this Source Tracker is associated with an offline campaign such as a TV or Print advertisement. The tracking phone number will not be served to any web traffic.

// Show this number to any visitor who arrives with a referrer matching "facebook.com".
"source": {
  "type": "web_referrer"
  "referrer": "facebook.com"
}
Web Referrer
A value of "web_referrer" indicates that this phone number will be served when a visitor arrives from a specific referring website.

Name	Type	Description
type	string	“web_referrer”
referrer	string	The referring website that will trigger this number to be served.
Example “facebook.com”
// Show this number to any visitor who visits the site directly.
"source": {
  "type": "direct"
}
Direct
A value of "direct" indicates that this tracking number will be served to web visitors who visit the page directly, without being referred from another site.

// Show this number to all Google Ads visitors
"source": {
  "type": "search",
  "search_engine": "google",
  "search_type": "paid"
}

// Show this number to all PPC visitors
"source": {
  "type": "search",
  "search_engine": "all",
  "search_type": "paid"
}

// Show this number to visitors from Google search
"source": {
  "type": "search",
  "search_engine": "google",
  "search_type": "all"
}
Search
A value of "search" indicates that this number should be served to visitors who arrived on the page from a given search engine and search type.

Name	Type	Description
type	string	“search”
search_engine	string	The name of the search engine. One of “google”, “yahoo”, “bing”, or “all”.
Example: “google”
search_type	string	The type of search traffic. One of “paid”, “organic”, or “all”.
Example: “paid”
// Show this number in a Google Ads Call Extension for campaigns
// targeting desktop and mobile devices.
"source": {
  "type": "google_ad_extension"
}


// Show this number in a Google Ads Call Extension for call-only campaigns
// or campaigns targeting mobile devices.
"source": {
  "type": "mobile_ad_extension"
}


Google Ad Extension
A value of "google_ad_extension" means that this number will be shown in a Google Ads Call Extension for campaigns targeting desktop and mobile devices. This number must be added to the Call Extension in Google Ads.

Mobile Ad Extension
A value of “mobile_ad_extension" means that this number will be shown in a Google Ads Call Extension for call-only campaigns or campaigns targeting mobile devices. This number must be added to the Call Extension or Call-Only Ad in Google Ads.

Google My Business
A value of “google_my_business" means that this number will be shown in a Google My Business listing. These numbers should be added to the Google My Business listing manually, or using the Google My Business integration. For more information, please refer to our support documentation.

Users
A user represents a specific person with access to your account who can view and interact with your call data. Users are identified by an email address, and have an assigned role that controls the privileges they have within your account.

User Roles
Administrators have complete access to every company in your account. They can add companies, users, and tracking numbers. They also have access to all configurations, including creating call flows, adding call tags, company customizations, and billing and invoice information. These users are identified by the role admin.

The remaining two roles are limited to one or more companies within your account. They cannot see or modify data outside of the companies to which they are assigned by an Administrator.
Managers can manage numbers, forms, and integrations within their companies. They’ll also have the same permissions as Reporting users as outlined below. These users are identified by the role manager.

Reporting users can view calls, text messages, and reports about the data associated with their companies. They can make notes on calls, listen to recorded calls, and tag and score calls. They’ll also have the same notification configuration options as the users outlined below. These users cannot create or modify tracking numbers or other settings. These users are identified by the role reporting.

Please note that only Administrators can create new users, delete users, and perform limited updates to other users. Managers and Reporting users cannot create, delete, or update users other than making updates to their own user profile information.

Listing All Users
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/users.json"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 3,
  "users": [
    {
      "email": "kevin@example.com",
      "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
      "created_at": "2011-04-06T16:38:27.505-04:00",
      "role": "admin",
      "first_name": "Kevin",
      "last_name": "Mann",
      "name": "Kevin Mann",
      "companies": [
         {
           "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
           "name": "Widget Shop"
         },
         {
           "id": "COM8154748ae6bd4e278a7cddd38a662e4e",
           "name": "Bob's Burgers"
         },
         {
           "id": "COM8154748ae6bd4e278a7cddd38a662z4z",
           "name": "Mos Eisley Cantina"
         }
       ]
    },
    {
      "email": "andy@example.com",
      "id": "USR8154748ae6bd4e278a7cddd38a662e4e",
      "created_at": "2011-06-09T14:12:57.842-04:00",
      "role": "admin",
      "first_name": "Andy",
      "last_name": "Powell",
      "name": "Andy Powell",
      "companies": [
          {
                "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
                "name": "Widget Shop"
              },
              {
                "id": "COM8154748ae6bd4e278a7cddd38a662e4e",
                "name": "Bob's Burgers"
              },
              {
                "id": "COM8154748ae6bd4e278a7cddd38a662z4z",
                "name": "Mos Eisley Cantina"
              }
            ]
    },
    {
      "email": "elliott@example.com",
      "id": "USR8154748ae6bd4e278a7cddd38a662z4z",
      "created_at": "2013-08-10T11:18:00.001-04:00",
      "role": "admin",
      "first_name": "Elliott",
      "last_name": "Wood",
      "name": "Elliott Wood",
      "companies": [
          {
                "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
                "name": "Widget Shop"
              },
              {
                "id": "COM8154748ae6bd4e278a7cddd38a662e4e",
                "name": "Bob's Burgers"
              },
              {
                "id": "COM8154748ae6bd4e278a7cddd38a662z4z",
                "name": "Mos Eisley Cantina"
              }
            ]
    }
  ]
}
This endpoint returns a paginated array of users within the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/users.json
Request Parameters
This endpoint supports Offset Pagination, Sorting, and Searching.

Name	Type	Required?	Description
company_id	string	optional	Limit response to users belonging to a single company.
Sorting is available for the following fields:

email

created_at

Searching is available for the following fields:

first_name

last_name

email

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
email	string	The email address associated with this user.
id	string	Unique identifier for the user.
created_at	string	The date and time the user was created in UTC (ISO 8601 format).
role	string	The user’s permission within this CallRail account. One of “admin”, “reporting”, or “manager”.
first_name	string	The user’s first name.
last_name	string	The user’s last name.
name	string	Full name of the user formatted for display.
accepted	boolean	true if the user has accepted their invitation.
companies	object	A list of the companies the user has access to, including the id and name.
Retrieving a Single User
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/users/{user_id}.json"
The above command returns a JSON structured object like this:

{
  "email": "kevin@example.com",
  "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
  "created_at": "2011-04-06T16:38:27.505-04:00",
  "role": "admin",
  "first_name": "Kevin",
  "last_name": "Mann",
  "name": "Kevin Mann",
  "companies": [
    {
      "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Widget Shop"
    },
    {
      "id": "COM8154748ae6bd4e278a7cddd38a662e4e",
      "name": "Bob's Burgers"
    },
    {
      "id": "COM8154748ae6bd4e278a7cddd38a662z4z",
      "name": "Mos Eisley Cantina"
    }
  ]
}
This endpoint returns a single user object in the target account.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/users/{user_id}.json
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
email	string	The email address associated with this user.
id	string	Unique identifier for the user.
created_at	string	The date and time the user was created in UTC (ISO 8601 format).
role	string	Whether or not the user is active or disabled.
first_name	string	The user’s first name.
last_name	string	The user’s last name.
name	string	Full name of the user formatted for display.
companies	object	A list of the companies the user has access to, including the id and name.
Creating a User
curl -H "Authorization: Token token={api_token}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
          "first_name": "Bob",
          "last_name": "Belcher",
          "email": "bob@example.com",
          "role": "reporting",
          "companies": [252993629, 189409482]
        }' \
        "https://api.callrail.com/v3/a/{account_id}/users.json"
The above command returns a JSON structured object like this:

{
  "email": "bob@example.com",
  "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
  "created_at": "2017-01-13T13:01:17.320-05:00",
  "role": "reporting",
  "first_name": "Bob",
  "last_name": "Belcher",
  "name": "Bob Belcher",
  "companies": [
    {
      "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Widget Shop 2"
    },
    {
      "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Widget Shop"
    }
  ]
}
This endpoint creates a single user object in the target account. When the user is created, an email will be sent to them with a prompt to set their password.

Please note that only tokens belonging to administrators can be used to create users in this endpoint. Tokens owned by managers and reporting are not able to be used to create new users.

API Endpoint
Method	URL
POST	/v3/a/{account_id}/users.json
Request Body
The request body below is standard for all Users.

Name	Type	Required?	Description
first_name	string	required	The user’s first name.
last_name	string	required	The user’s last name.
email	string	required	The email address the user will use to log in to CallRail and receive call or text message notifications.
role	string	required	What level of access the user should have to your CallRail Account or Companies. One of “admin”, “reporting”, or “manager”.
Additional fields in the request body are needed based on User Role. See User Roles
Manager, Reporting, and Notification

Name	Type	Required?	Description
companies	array	required	A list of company IDs that the user should be able to access.
Notification users must be granted access to a Company before they can be subscribed to email notifications within that Company.
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
email	string	The email address associated with this user.
id	string	Unique identifier for the User.
created_at	string	The date and time the user was created in UTC (ISO 8601 format).
role	string	The user’s permission within this CallRail account.
first_name	number	The user’s first name.
last_name	string	The user’s last name.
name	string	The full name of the user formatted for display.
companies	JSON	JSON array of all companies the user is associated with.
Updating a User
curl -H "Authorization: Token token={api_token}" \
     -X PUT \
     -H "Content-Type: application/json" \
     -d '{
          "first_name": "Gene",
          "email": "gene@example.com",
          "current_password": "password1234" // Do not use this password //
        }' \
        "https://api.callrail.com/v3/a/{account_id}/users/{user_id}.json"
The above command returns JSON structured object like this:

{
  "email": "gene@example.com",
  "id": "USR8154748ae6bd4e278a7cddd38a662f4f",
  "created_at": "2017-01-13T13:01:17.320-05:00",
  "role": "reporting",
  "first_name": "Gene",
  "last_name": "Belcher",
  "name": "Gene Belcher",
  "companies": [
    {
      "id": "COM8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Widget Shop 2"
    },
    {
      "id": "COM8154748ae6bd4e278a7cddd38a662e4e",
      "name": "Widget Shop"
    }
  ]
}
This endpoint updates a single user object in the target account. Updates can only be made for users that have accepted their invitation. Only administrators can make updates to other user’s companies. first_name, last_name, and email can only be managed for the user associated with the API Key used in the request. API requests to manage other users’ names or email will result in an error.

Please note that passwords can no longer be managed via the API, regardless of the user making the request. Passwords can only be reset or changed in the app UI. Please refer to our support articles for instructions on how to change or reset your password.

API Endpoint
Method	URL
PUT	/v3/a/{account_id}/users/{user_id}.json
Request Body
The request body below is standard for all Users.

Name	Type	Required?	Description
first_name	string	optional	The user’s first name. Names can only be managed for the user associated with the API Key used in the request. API requests to manage other user’s names will result in an error.
last_name	string	optional	The user’s last name. Names can only be managed for the user associated with the API Key used in the request. API requests to manage other user’s names will result in an error.
email	string	optional	The email address the user will use to log in to CallRail and receive call or text message notifications. The user’s current_password must be provided in the request in order to update their email address. Email can only be managed for the user associated with the API Key used in the request. API requests to manage other user’s email will result in an error.
current_password	string	optional	The password used to log in to CallRail. Passwords cannot be updated via the API - they can only be reset or changed in the app UI. Please refer to our support articles for instructions on how to change or reset your password.
companies	array	optional	A list of company IDs that the user should be able to access. To remove a user from one or more companies, only include company IDs the user should be able to access. Account Administrator users have access to all companies in the account. Company access can only be managed for users with roles of manager, reporting, or notification. See User Roles
Notification users must be granted access to a Company before they can be subscribed to email notifications within that Company.
Response Field
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
email	string	The email address associated with this user.
id	string	Unique identifier for the User.
created_at	string	The date and time the user was created in UTC (ISO 8601 format).
role	string	The user’s permission within this CallRail account; one of “admin”, “reporting”, or “manager”.
first_name	number	The user’s first name.
last_name	string	The user’s last name.
name	string	The full name of the user formatted for display.
companies	JSON	JSON array of all companies the user is associated with. Includes the company id and company name.
Deleting a User
curl -H "Authorization: Token token={api_token}" \
     -X DELETE \
     "https://api.callrail.com/v3/a/{account_id}/users/{user_id}.json"
The above command does not return any response data.

This endpoint deletes a user in the target account. Only Account Administrators can perform this action.

API Endpoint
Method	URL
DELETE	/v3/a/{account_id}/users/{user_id}.json
Response Fields
When successful, the HTTP response code will indicate 204 No Content and no JSON response will be returned.

Leads
Listing All Leads
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{account_id}/leads.json"
The above command returns JSON structured like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 1,
  "total_records": 2,
  "leads": [
    {
      "id": "PER8154748ae6bd4e278a7cddd38a662f4f",
      "name": "Jane Smith",
      "phone": "+14045551234",
      "email": "jane@example.com",
      "created_at": "2024-01-15T10:30:00.000Z",
      "company_id": "COM1234567890abcdef",
      "company_name": "Acme Corp"
    },
    {
      "id": "PER9265859bf7ce5f389b8deee49b773g5g",
      "name": "John Doe",
      "phone": "+14045555678",
      "email": "john@example.com",
      "created_at": "2024-01-14T08:15:00.000Z",
      "company_id": "COM1234567890abcdef",
      "company_name": "Acme Corp"
    }
  ]
}
This endpoint returns a paginated list of all leads in the target account. All available fields are returned by default — use the fields parameter to limit which fields are included.

API Endpoint
Method	URL
GET	/v3/a/{account_id}/leads.json
Request Parameters
This endpoint supports Offset Pagination, Sorting, and Field Selection.

Name	Type	Required?	Description
company_id	string	optional	Limit results to leads belonging to a single company.
Sorting is available for the following fields:

created_at (default: descending)
name
email
Response Fields
When successful, the HTTP response code will indicate 200 OK.

Name	Type	Description
id	string	Unique identifier for the lead.
name	string	Full name of the lead.
phone	string	Lead’s phone number in E.164 format.
email	string	Lead’s email address.
created_at	string	Timestamp of when the lead was created (ISO 8601, UTC).
company_id	string	Unique identifier for the company the lead belongs to.
company_name	string	Name of the company the lead belongs to.
Lead Timelines
Retrieving a Single Lead Timeline
curl -H "Authorization: Token token={api_token}" \
     -X GET \
     "https://api.callrail.com/v3/a/{agency_id}/leads/{lead_id}/timeline.json"
The above command returns a JSON structured object like this:

{
  "page": 1,
  "per_page": 100,
  "total_pages": 2,
  "total_records": 120,
  "lead": {
    "customer_name": "John Doe",
    "customer_phone_number": "+15551234567",
    "total_interactions": 8,
    "first_touch": {
      "touchpoint_type": "organic_search",
      "source": "google",
      "medium": "organic",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "last_touch": {
      "touchpoint_type": "direct",
      "created_at": "2024-02-01T14:20:00Z"
    },
    "lead_creation": {
      "touchpoint_type": "organic_search",
      "source": "google",
      "lead_creation_time": "2024-01-15T10:35:00Z"
    },
    "lead_qualification": {
      "touchpoint_type": "paid_search",
      "source": "google",
      "created_at": "2024-01-20T09:15:00Z"
    },
    "tags": [
      {
        "id": "TAG123",
        "name": "Hot Lead",
        "color": "red"
      }
    ],
    "convert_assist": {
      "id": "CAI123",
      "created_at": "2024-02-01T14:20:00Z",
      "last_interaction_id": "CALL456",
      "last_interaction_type": "call",
      "interaction_count": 3,
      "status": "answered",
      "answers": [
        {
          "answer_key": "intent",
          "answer_text": "Looking to purchase"
        }
      ]
    },
    "voice_assist": true,
    "transcript": true,
    "source": "google",
    "medium": "organic",
    "campaign": null,
    "landing_page_url": "https://example.com/",
    "referrer_url": null,
    "click_id": null
  },
  "timeline": [
    {
      "type": "call",
      "id": "CALL123",
      "event_date": "2024-02-01T14:20:00Z",
      "customer_name": "John Doe",
      "customer_phone_number": "+15551234567",
      "direction": "inbound",
      "duration": 300,
      "answered": true
    },
    {
      "type": "form_submission",
      "id": "FORM456",
      "event_date": "2024-01-20T09:15:00Z",
      "form_name": "Contact Us",
      "form_url": "https://example.com/contact",
      "form_fields": {
        "name": "John Doe",
        "email": "john@example.com",
        "message": "I'm interested in your services"
      },
      "form_submission_url": "https://example.com/thank-you"
    },
    {
      "type": "sms",
      "id": "SMS789",
      "event_date": "2024-01-18T11:30:00Z",
      "message_content": "Hello, I have a question about pricing",
      "message_phone_number": "+15551234567",
      "message_type": "sms",
      "thread_id": "SMS789"
    },
    {
      "type": "chat",
      "id": "CHAT321",
      "event_date": "2024-01-16T16:45:00Z",
      "chat_subject": "Product inquiry",
      "chat_id": "CHAT321",
      "conversation_participant_phone_number": "+15551234567"
    },
    {
      "type": "milestone",
      "id": "TOUCH654",
      "event_date": "2024-01-15T10:30:00Z",
      "milestone_type": "lead_created",
      "touchpoint_type": "organic_search"
    }
  ]
}
This endpoint returns a paginated timeline of all events and interactions for a specific lead, along with lead summary information including attribution touchpoints and AI insights.

API Endpoint
Method	URL
GET	/v3/a/{agency_id}/leads/{lead_id}/timeline.json
Request Parameters
This endpoint supports Offset Pagination, Sorting, and Field Selection.

Name	Type	Required?	Description
page	integer	optional	Page number for pagination. Default: 1
per_page	integer	optional	Number of records per page. Default: 100, Min: 1, Max: 250
fields	string	optional	Comma-separated list of fields to include in timeline events.
Sorting is available for the following fields:

event_date (default: descending - newest first)
created_at (ascending - oldest first)
Field Selection allows you to specify which fields to include in the timeline events response. Available fields vary by event type and include all fields from the respective decorators.

Response Fields
When successful, the HTTP response code will indicate 200 OK.

Pagination Fields
Name	Type	Description
page	integer	Current page number.
per_page	integer	Number of records per page.
total_pages	integer	Total number of pages available.
total_records	integer	Total number of timeline events.
Lead Object Fields
Name	Type	Description
customer_name	string	Name of the lead/customer.
customer_phone_number	string	Phone number in E.164 format.
total_interactions	integer	Total number of interactions for this lead.
first_touch	object	Information about the first touchpoint, including touchpoint_type, source, medium, and created_at.
last_touch	object	Information about the most recent touchpoint.
lead_creation	object	Touchpoint that created the lead. Includes lead_creation_time timestamp.
lead_qualification	object	Touchpoint that qualified the lead.
tags	array	Tags associated with any of the lead’s interactions. Includes id, name, and color.
convert_assist	object	AI-generated insights about lead conversion potential. Includes id, created_at, last_interaction_id, last_interaction_type, interaction_count, status, and answers array.
voice_assist	boolean	Whether any of the lead’s calls were handled by Voice Assist.
transcript	boolean	Whether any of the lead’s calls have a transcript.
source	string	Traffic source from the lead’s first touchpoint (e.g. google).
medium	string	Traffic medium from the lead’s first touchpoint (e.g. cpc).
campaign	string	Campaign name from the lead’s first touchpoint.
landing_page_url	string	Landing page URL from the lead’s first touchpoint.
referrer_url	string	Referrer URL from the lead’s first touchpoint.
click_id	object	Click ID parameters parsed from the first touchpoint’s landing page URL. May include gclid, gbraid, wbraid, msclkid, and fbclid. Returns null if none are present.
Timeline Event Fields
Each event in the timeline array includes the following common fields:

Name	Type	Description
type	string	Event type. One of: call, form_submission, sms, chat, or milestone.
id	string	Unique identifier for the event.
event_date	string	Timestamp when the event occurred in UTC (ISO 8601 format).
Call Events include additional fields:

customer_name - Name of the caller
customer_phone_number - Phone number of the caller
direction - inbound or outbound
duration - Call duration in seconds
answered - Whether the call was answered
recording - Recording URL if available
start_time - Call start timestamp
tracking_phone_number - The tracking number used
Form Submission Events include additional fields:

Name	Type	Description
form_name	string	Name of the form.
form_url	string	URL where the form was submitted.
form_fields	object	Form field data submitted.
form_submission_url	string	URL user was redirected to after submission.
SMS Events include additional fields:

Name	Type	Description
message_content	string	Content of the first message in the thread.
message_phone_number	string	Customer’s phone number.
message_type	string	Always sms.
thread_id	string	ID of the SMS thread.
Chat Events include additional fields:

Name	Type	Description
chat_id	string	Unique chat identifier.
chat_subject	string	Subject or title of the chat.
conversation_participant_phone_number	string	Participant’s phone number.
Milestone Events include additional fields:

Name	Type	Description
milestone_type	string	Type of milestone (e.g., lead_created, lead_qualified).
touchpoint_type	string	Type of touchpoint that triggered the milestone.
MCP
Overview
CallRail’s Model Context Protocol (MCP) server lets you connect your CallRail account directly to AI assistants like Claude and ChatGPT. Once connected, you can ask questions about your call data, analyze performance, and trace lead journeys in plain language — without writing API queries or exporting reports.

The MCP server is a read-only interface by default. It surfaces your existing CallRail data through a set of tools that the AI assistant uses automatically based on your questions.

The CallRail MCP server requires a CallRail account and a supported AI assistant subscription. See the connecting sections below for plan requirements.
Connecting
Claude.ai
Available on Claude Pro, Max, Team, and Enterprise plans.

Navigate to Settings → Connectors → Add custom connector in Claude.ai.
Enter the MCP server URL provided by your CallRail account team.
Follow the OAuth prompt to log in with your CallRail credentials and authorize access.
Once connected, the assistant has access to your CallRail data for the duration of the session, scoped to your user’s permissions.

Claude Desktop
Add the following to your claude_desktop_config.json:

{
  "mcpServers": {
    "callrail": {
      "url": "https://{MCP_SERVER_URL}/mcp"
    }
  }
}
Replace {MCP_SERVER_URL} with the server URL provided by your CallRail account team. Claude Desktop will prompt you to complete the OAuth flow on first connection.

ChatGPT
Available on ChatGPT Plus, Pro, Business, Enterprise, and Education plans.

In ChatGPT, navigate to Settings → Beta features and enable Developer Mode.
Open a new conversation and select Tools → Add MCP server.
Enter the MCP server URL provided by your CallRail account team.
Follow the OAuth prompt to log in with your CallRail credentials and authorize access.
ChatGPT MCP support is currently in beta. Refer to OpenAI’s documentation for the most current setup steps.
Authentication
The MCP server uses OAuth 2.0 to authenticate users against CallRail. When your AI assistant connects, it redirects you to CallRail’s login page to grant access. No API keys are required — the session is scoped automatically to your CallRail user account and respects your existing account permissions.

Data returned by MCP tools is scoped to your user’s access level, the same as the CallRail interface. Accounts or companies you don’t have access to will not appear in responses.
Privacy & Support
CallRail’s privacy policy is available at callrail.com/privacy-policy. The MCP server acts as a proxy to the CallRail API and does not store or transmit call data beyond what is required to serve requests.

For support, contact your CallRail account team or visit callrail.com/support.

Available Tools
The MCP server exposes the following tools.

Account
Tool	Description
get_account	Returns all accounts accessible to the authenticated user. Call this at the start of a session to resolve your account ID.
Calls
Tool	Description
list_calls	Returns individual call records with filtering by date, tracker, company, tag, and more.
get_call	Returns details for a single call by ID.
get_calls_summary	Returns aggregate call counts grouped by source, campaign, company, or other dimensions. Use this for analytics rather than list_calls.
get_calls_timeseries	Returns call volume over time, bucketed by day, week, or month.
get_call_recording	Returns the recording URL for a call.
get_call_page_views	Returns the page view history associated with a call session.
Companies
Tool	Description
list_companies	Returns all companies in the account.
get_company	Returns details for a single company by ID.
Conversations
Tool	Description
list_conversations	Returns SMS thread summaries — use to find threads needing attention.
get_conversation	Returns the full message history for a specific SMS thread.
Form Submissions
Tool	Description
get_forms_summary	Returns aggregate form submission counts.
list_form_submissions	Returns individual form submission records.
get_form_submission	Returns details for a single form submission by ID.
Leads
Tool	Description
get_person_timeline	Returns a lead’s full activity history across calls, form submissions, and SMS threads. Accepts a phone number or person ID.
SMS Threads
Tool	Description
list_sms_threads	Returns current SMS thread state — use to find threads needing attention.
get_sms_thread	Returns the full message exchange for a specific thread.
Tags
Tool	Description
list_tags	Returns all tags defined in the account.
Trackers
Tool	Description
list_trackers	Returns all tracking numbers in the account.
get_tracker	Returns details for a single tracker by ID.
Users
Tool	Description
list_users	Returns all users in the account.
get_user	Returns details for a single user by ID.
Write Tools
Write tools execute immediately and some actions are irreversible. Confirm intent before proceeding when using an AI assistant.
Tool	Description
create_call	Creates a call record.
update_call	Updates a call record, including tagging, noting, or marking as spam.
create_company	Creates a new company.
update_company	Updates an existing company.
send_text_message	Sends an SMS message from a CallRail tracking number.
update_form_submission	Updates a form submission record.
create_tag	Creates a new tag.
update_tag	Updates an existing tag.
delete_tag	Deletes a tag.
create_source_tracker	Creates a new source tracking number.
create_session_tracker	Creates a new session tracking number.
create_user	Creates a new user.
update_user	Updates an existing user.
delete_user	Deletes a user.
Usage Examples
The following examples show typical prompts and the tools the assistant uses to fulfill them.

Get a call volume summary
“How many calls did I receive last week, broken down by source?”

The assistant calls get_account to resolve your account, then get_calls_summary with a date range and source grouping. You get a breakdown of call counts per source (organic search, paid, direct, etc.) without the assistant pulling individual call records.

Look up recent calls for a tracking number
“Show me the last 10 calls from my Google Ads tracking number.”

The assistant calls list_trackers to find the tracker ID matching “Google Ads”, then list_calls filtered by that tracker. Each result includes the caller, duration, call date, and lead score.

Trace a lead’s full history
“What’s the full history for the lead who called from 404-555-0192?”

The assistant calls get_person_timeline with the phone number. The response spans all calls, form submissions, and SMS threads associated with that number in chronological order, without requiring separate lookups across resources.

Review an SMS conversation
“Show me the SMS thread with the lead who texted in yesterday.”

The assistant calls list_sms_threads to find recent threads, then get_sms_thread to retrieve the full message exchange, including who sent each message and when.

Webhooks
Introduction
Webhooks are notifications sent out by CallRail for certain events that happen in your account. They allow software developers to send real-time call notifications to web applications and reporting systems. These are most useful when you wish to be notified automatically when something happens, rather than having to poll the API.

Once webhooks is set up, it sends an HTTP POST request to a URL endpoint of your choice. There are four types of webhooks for calls:

Pre-Call
Call Routing Complete
Post-Call
Call Modified
Additionally, there are webhooks for Text Messages and Form Submissions.

You can create a webhook from inside your account. When doing so, you’ll specify the URL that should receive the data, as well as the events that trigger the webhook. You can also create and configure a webhook through CallRail’s API.

All attributes are available in the JSON POST body, which is the recommended format for any new development. A limited number of attributes are available in the query string because of the legacy version of our API. Currently, additions and updates are only made to the JSON POST body; therefore, we recommend parsing the JSON POST body and ignoring the query string parameters according to the currently-supported version of our API.

Responding
Your endpoint should respond with a HTTP status code of 2xx to indicate that the data was received properly. In general, a response status code other than 2xx indicates that the webhook was unable to complete the requested action.

When a non-2xx response is received, you may notice missing webhooks or calls on your end. CallRail does not resend webhooks, so missing calls might be your first indication of a problem. Repeated failed webhooks could result in an automated disabling of the webhook integration.

Common reasons for invalid response codes include errors in the receiving endpoint’s URL (typos or invalid URLs), as well as the receiving server not accepting URLs over a certain amount of characters.

Events
Below are the events that are currently available to trigger a webhook.

Pre-Call
The pre-call webhook executes the moment an inbound phone call is received by CallRail. Your server will receive the call information before the call is connected, allowing you to develop real-time systems for your representatives, such as screen-pops or CRM database lookups.

Because the pre-call webhook executes before the call is connected, it contains less information than the post-call webhook. For example, the post-call webhook will contain the call duration, whether the call was answered, and a link to the recording (if applicable).

This webhook sends the call object in the POST body, formatted as JSON as specified in the call endpoint. See Retrieving a Single Call for details. Additional fields are returned in the JSON and GET request line because of our Legacy API; however, we encourage users to build requests using the parameters outlined in this version of our API documentation for support purposes.

Call Routing Complete
The call routing complete webhook executes the moment an inbound phone call has been routed to its destination.

Because the call routing complete webhook executes before the call is completed, it contains less information than the post-call webhook. For example, the post-call webhook will contain the call duration, a link to the recording (if applicable), and tags and/or qualified status applied through keypad scoring.

The call routing complete webhook will contain more information than the pre-call webhook, and can be used to supplement information displayed to users handling a call while it is ongoing.

This webhook sends the call object in the POST body, formatted as JSON as specified in the call endpoint. See Retrieving a Single Call for details. Additional fields are returned in the JSON and GET request line because of our Legacy API; however, we encourage users to build requests using the parameters outlined in this version of our API documentation for support purposes.

Post-Call Webhook
The post-call webhook executes after an inbound phone call has completed and its recording and transcription have completed and attached. It contains the full data about the call.

This webhook should not be expected to be real-time, and has a maximum delay of 20 minutes after the hangup before it fires. The Post-Call Webhook will wait until recording, transcription, and call summaries (when applicable) have attached to the call before firing. This event has a maximum timeout of 20 minutes, at which time it will fire even if recording-related data is missing. Although this is a relatively rare occurrence, we recommend implementing the Call Modified webhook to avoid missing any recording, transcription, or call summary data.

This webhook sends the call object in the POST body, formatted as JSON as specified in the call endpoint. See Retrieving a Single Call for details. For legacy purposes some additional fields are returned in the JSON and in the GET request line, but new implementations are strongly encouraged not to rely upon parameters other than the ones currently documented.

Call Modified
Please note that the fields in the call modified webhook will already contain the modified information. The "changes" key will then contain an array of the fields modified.

 {
  ...
  "note":"this is a note written after the call was completed",
  ...
  "changes":["note"]
}
Call modified webhooks are sent when a call has changed after it’s ended. For example, if you add a tag or a note to a call after the call has ended, you’d use a call modified webhook to retrieve the latest version of the call. This webhook also contains a field called changes that notes which fields changed (like “note”, ”recording”, ”tag”). Please note, this webhook also fires when a call has been marked as spam.

The Post-Call Webhook will wait until recording, transcription, and call summaries (when applicable) have attached to the call before firing. That event has a maximum timeout of 20 minutes, at which time it will fire even if recording-related data is missing. Although this is a relatively rare occurrence, we recommend implementing the Call Modified webhook to avoid missing any recording, transcription, or call summary data.

Call modified webhooks send the call object in the POST body, formatted as JSON as specified in the call endpoint. See Retrieving a Single Call for details. Additional fields are returned in the JSON and GET request line because of our Legacy API; however, we encourage users to build requests using the parameters outlined in this version of our API documentation for support purposes.

Key	Description
changes	An array of the changes to the call that triggered the call modified webhook appended to the end of the normal response fields. These fields include tags, note, value, transcription_text, call_summary, recording_duration, auto_score, and manual_score.
Outbound Post Call
Outbound post-call webhooks are sent after an outbound phone call has ended. The primary difference between Post Call Webhooks and Outbound Post Call Webhooks is that it is sent only after an outbound call has completed. As such, the call_type field will be set to "outbound".

This webhook sends the call object in the POST body, formatted as JSON as specified in the call endpoint. See Retrieving a Single Call for details. Additional fields are returned in the JSON and GET request line because of our Legacy API; however, we encourage users to build requests using the parameters outlined in this version of our API documentation for support purposes.

Outbound Call Modified
An outbound call modified webhook is sent when an outbound call has changed after it has ended. For example, if you add a tag or note to an outbound call, you’d use an outbound call modified webhook to retrieve the latest version of the call with the most recent information attached.

This webhook sends the call object in the POST body, formatted as JSON as specified in the call endpoint. See Retrieving a Single Call for details. For legacy purposes, some additional fields are returned in the JSON and in the GET request line, but new implementations are strongly encouraged not to rely upon parameters other than the ones currently documented.

Text Message Received
Text message webhooks are sent after a text message is received.

  {
   "id":879204976,
   "resource_id": "SCI0c14896tw1b64fb970ab62aaf4fbefd9",
   "source_number":"770-555-5555",
   "destination_number":"770-123-4567",
   "content":"CallRail is the best! ",
   "message_type":"sms",
   "media_urls":[],
   "timestamp":"2017-10-23T15:57:18.826-04:00",
   "lead_status": null,
   "conversation_id": "crpLH",
   "company_resource_id": "COM834847e9f4bb4f9h8ll29eb173fe658e",
   "person_resource_id": "PERb122rc301ec45f5yy021d4jj180c1a79"
  }

Text message webhooks send after a text message is received by one of your tracking numbers. This webhook includes all information about the message, including the ID for the message, as well as the contents of the message.

Key	Description
id	Unique identifier for a specific text.
resource_id	Unique alphanumeric identifier for the text message.
source_number	The phone number that sent the text message.
destination_number	The tracking number that was texted.
content	The content of the text message.
message_type	The type of text message. One of sms or mms.
media_urls	For MMS messages, an array of URLs for media attached to the message. Empty array for SMS messages. These links are not long-lived and are intended for immediate use to download the media to your own storage mechanism.
timestamp	Timestamp of when the text was received with Time Zone offset.
lead_status	The current lead status of the text conversation, at the time of this this text message. One of good_lead, not_a_lead, previously_marked_good_lead, or null.
conversation_id	Unique identifier for SMS conversation.
company_resource_id	Unique identifier for the company associated with the text message.
person_resource_id	Unique identifier for the person associated with the text message.
Text Message Sent
Text message webhooks sent after a text message is sent.

 {
   "id":980561249,
   "resource_id": "SCI0c14896tw1b64fb970ab62aaf4fbefd9",
   "agent":"Keith Rail",
   "source_number":"770-123-4567",
   "destination_number":"770-555-5555",
   "content":"Well, that is good to know!",
   "message_type":"sms",
   "media_urls":[],
   "timestamp":"2017-10-23T16:00:53.286-04:00",
   "lead_status": null,
   "conversation_id": "crpLH",
   "company_resource_id": "COM834847e9f4bb4f9h8ll29eb173fe658e",
   "person_resource_id": "PERb122rc301ec45f5yy021d4jj180c1a79"
 }

Text message sent webhooks send after a text message is sent by one of your tracking numbers. This webhook includes all information about the message, including the ID for the message, as well as the contents of the message.

Key	Description
id	Also Unique identifier for a specific text.
resource_id	Unique alphanumeric identifier for the text message.
agent	Name of the user who sent the text message.
source_number	The phone number that sent the text message.
destination_number	The number that was texted.
content	The content of the text message.
message_type	The type of text message. One of sms or mms.
media_urls	For MMS messages, an array of URLs for media attached to the message. Empty array for SMS messages. These links are not long-lived and are intended for immediate use to download the media to your own storage mechanism.
timestamp	Timestamp of when the text was sent with Time Zone offset.
lead_status	The current lead status of the text conversation, at the time of this this text message. One of good_lead, not_a_lead, previously_marked_good_lead, or null.
conversation_id	Unique identifier for SMS conversation.
company_resource_id	Unique identifier for the company associated with the text message.
person_resource_id	Unique identifier for the person associated with the text message.
Form Submission
{
  "id":123456789,
  "company_id":987654321,
  "form_data":
    {
      "form_field1":"this is the message",
      "form_field2":"support@callrail.com",
      "form_field3":"John Q. Customer"
    },
  "form_url":"http://www.example.com/form",
  "landing_page_url":"http://www.example.com/",
  "referrer":"direct",
  "referring_url":"www.google.com",
  "submitted_at":"2017-10-24T09:40:18.000-04:00",
  "first_form":true,
  "source":"Google Organic",
  "keywords":"clinic hospital",
  "campaign":"Website",
  "medium":"Organic",
  "utm_source":"search",
  "utm_medium":"organic",
  "utm_campaign":"Google Organic"
}

Form Submission webhooks send whenever a form is submitted to your website. To retrieve this information, you should have Form Tracking active. This webhook sends information gathered from the form submission, including all recognized form fields.

Key	Description
id	Unique identifier for a specific form submission.
company_id	Unique identifier of the company receiving the form submission.
form_data	The contents of the form submission, broken down by form field.
form_url	The url of the page from which the form was submitted.
landing_page_url	The URL the visitor first landed on.
referrer	The URL that referred the visitor to your website.
submitted_at	Timestamp of when the form was submitted.
referring_url	The referrer’s webpage.
first_form	Boolean denoting whether or not this is the first form submitted by this visitor.
source	The marketing source that led to the form submission.
keywords	The keywords the visitor searched for. Keywords only provided from paid ad sources.
campaign	The name of the campaign the form submission belongs to.
medium	“PPC” or “Organic”.
utm_source	utm_source as captured from the landing page parameter.
utm_medium	utm_medium as captured from the landing page parameter.
utm_campaign	utm_campaign as captured from the landing page parameter.
Convert Assist Complete
Convert Assist webhooks are sent after each interaction has finished processing Convert Assist AI answers.

{
  "person_resource_id": "PERb122rc301ec45f5yy021d4jj180c1a79",
  "last_interaction_resource_id": "CALc14896tw1b64fb970ab62aaf4fbefd9",
  "last_interaction_type": "Call",
  "answers": [
    {
      "answer_key": "Action plan",
      "answer_text": "1. Confirm the reservation\n2. Send the confirmation email\n3. Follow up with the customer"
    },
    {
      "answer_key": "Smart follow-up",
      "answer_text": "Dear Bob, I wanted to follow up on our conversation. Please let me know if you have any questions."
    },
    {
      "answer_key": "Coaching",
      "answer_text": "Positive:\n 1. Confirmed the reservation\n 2. Sent the confirmation email\nNegative:\n 1. Did not follow up with the customer"
    }
  ],
  "interaction_count": 5,
  "timestamp": "2024-10-23T16:00:53.286-04:00"
}
CallRail’s Convert Assist product leverages our artificial intelligence technology to lower response times and improve lead-to-sale conversion. With Convert Assist, users get next steps, follow-up messaging, and coaching on every lead with a recorded call in CallRail. Content for Convert Assist is generated automatically after the call is completed and can be accessed within moments after the call is ended. Visit our support article to learn more.

Key	Description
person_resource_id	Unique identifier for the person associated with the interaction.
last_interaction_resource_id	Unique identifier for the last interaction.
last_interaction_type	Type of the last interaction (e.g., text, call).
answers	The AI generated answers for each of the Convert Assist prompts.
interaction_count	The number of interactions processed.
timestamp	Timestamp of when the interaction was processed Time Zone offset.
Security
For security reasons, you may want to ensure that requests received by your server are sent by CallRail. CallRail includes a Signature header to verify that the request your server has received is valid.

Validating Payloads
If you’re using Ruby, generating the signature to validate the request would look something like this:

  hmac = OpenSSL::HMAC.digest(OpenSSL::Digest.new('sha1'), YOUR_COMPANY_SIGNING_KEY, request_payload)
  signature = Base64.strict_encode64(hmac)
To test your signature computation, use the JSON request body below with a test signing key of 072e77e426f92738a72fe23c4d1953b4. Your computation should return a signature of UZAHbUdfm3GqL7qzilGozGzWV64=

{"answered":false,"business_phone_number":"","call_type":"voicemail","company_id":155920786,"company_name":"Boost Marketing","company_time_zone":"America/Los_Angeles","created_at":"2018-02-19T13:41:00.252-05:00","customer_city":"Rochester","customer_country":"US","customer_name":"Kaylah Mills","customer_phone_number":"+12148654559","customer_state":"PA","device_type":"","direction":"inbound","duration":"13","first_call":false,"formatted_call_type":"Voicemail","formatted_customer_location":"Rochester, PA","formatted_business_phone_number":"","formatted_customer_name":"Kaylah Mills","prior_calls":16,"formatted_customer_name_or_phone_number":"Kaylah Mills","formatted_customer_phone_number":"214-865-4559","formatted_duration":"13s","formatted_tracking_phone_number":"404-555-8514","formatted_tracking_source":"Google Paid","formatted_value":"--","good_lead_call_id":715587840,"good_lead_call_time":"2016-06-17T10:23:33.363-04:00","id":766970532,"lead_status":"previously_marked_good_lead","note":"","recording":"https://app.callrail.com/calls/766970532/recording/redirect?access_key=aaaaccccddddeeee","recording_duration":8,"source_name":"Google AdWords","start_time":"2018-02-19T13:41:00.236-05:00","tags":[],"total_calls":17,"tracking_phone_number":"+14045558514","transcription":"","value":"","voicemail":true,"tracker_id":354024023,"keywords":"","medium":"","referring_url":"","landing_page_url":"","last_requested_url":"","referrer_domain":"","conversational_transcript":"","utm_source":"google","utm_medium":"cpc","utm_term":"","utm_content":"","utm_campaign":"Google AdWords","utma":"","utmb":"","utmc":"","utmv":"","utmz":"","ga":"","gclid":"","integration_data":[{"integration":"Webhooks","data":null}],"keywords_spotted":"","recording_player":"https://app.callrail.com/calls/766970532/recording?access_key=aaaabbbbccccdddd","speaker_percent":"","call_highlights":[],"callercity":"Rochester","callercountry":"US","callername":"Kaylah Mills","callernum":"+12148654559","callerstate":"PA","callsource":"google_paid","campaign":"","custom":"","datetime":"2018-02-19 18:41:00","destinationnum":"","ip":"","kissmetrics_id":"","landingpage":"","referrer":"","referrermedium":"","score":1,"tag":"","trackingnum":"+14045558514","timestamp":"2018-02-19T13:41:00.236-05:00"}
CallRail generates a secret, random token for every company that can be viewed on the Webhooks configuration page inside the application. The token is used with the request payload to generate a hash signature that is passed as a request header in the webhook request. You can use the secret token on your server to recompute the same hash based on the request payload. If your computed signature matches the header that CallRail sends, the request is valid!

The CallRail signature is computed with an HMAC digest of the content of the request. Each webhook request will include a timestamp field based on the data in the request that you can compare to the current time to prevent an unauthorized system from replaying requests.

Swap.js
Getting Started
While most users will not need to do anything beyond installing swap.js on their website, CallRail’s Dynamic Number Insertion script provides a set of options and methods which might be useful to those with advanced use cases.

Dynamic Number Insertion
<body>
  <div>
    <!-- the following phone number will be replaced -->
    <a href="tel:+15551231234">Call me at 555-123-1234</a>
  </div>
  <div data-calltrk-noswap>
    <!-- content inside this element will not be affected -->
    <a href="tel:+15551231234">..</a>
  </div>
</body>
HTML Markup
By default, swap.js replaces any phone numbers on your page that match a configured swap target. If part of a page should not be processed for phone numbers, you can tell swap.js to ignore it by adding a data-calltrk-noswap attribute. When this attribute is present, swap.js will ignore any content inside of that element or it’s children.

This is useful if you wish to show the original number on part of the page, or to improve performance given a page with large sections that do not contain any phone numbers.


/* If this function is called after the page has initially loaded,
 * swap.js have already swapped the numbers and will not know to
 * process the new element. */
function addCallLink() {
  var callLink = document.createElement('div');
  callLink.innerHTML = 'Call us now at 555-123-1234';
  document.body.appendChild(callLink);

  /* At this point, the element is in the DOM and on the page, but the
   * original swap target phone number is being displayed.
   * We can invoke CallTrk.swap() manually to attempt a swap.
   * For performance reasons we can instruct swap.js to only look at
   * the modified element, but if the parameter is omitted the entire
   * page will be re-scanned. */
  CallTrk.swap(callLink);
}

/* This example uses getSwapNumbers to manually perform number swapping.
 * This method may be required if your site is a single-page application
 * and DOM content is managed by a templating engine. */
function addCallLink() {
  CallTrk.getSwapNumbers(['5551231234'], function(result) {
    var callLink = document.createElement('div');
    /* Use the result to fill in the tracking phone number ourselves.
     * Note that you'll likely want to reformat this number to
     * an expected display format for your locale. */
    callLink.innerHTML = "Call us now at " + result['5551231234'];
    document.body.appendChild(callLink);
  });
}
Javascript API
CallTrk.swap(nodeOrSelector)
This function causes swap.js to re-scan the DOM and attempt to swap phone numbers again. The parameter is optional. If the parameter is omitted, processing starts at document.body.

If a DOM node is provided as the parameter, the scope will be limited to that node and its children.

If a CSS selector is provided as the parameter, any matching nodes and their children will be searched. Note that swap.js does not depend on jQuery, and therefore the selector is used via document.querySelectorAll(). This is a native Javascript function, and may not support everything supported by jQuery selectors. Behavior may also vary across browsers.

CallTrk.getSwapNumbers(numbers, callback)
This function provides access to the swap settings for the current page. It is provided for situations in which the Dynamic Number Insertion needs to be performed manually. One common use case is within single-page applications, where a templating engine controls the DOM and would otherwise replace numbers swapped by normal swap.js operations.

This method accepts an array of phone numbers (formatted as 10-digit numbers with no separators), and provides a callback mechanism to swap numbers. Numbers provided as a parameter are appended to a list of numbers already found on the page. The swap mechanism is asynchronous, since a request to CallRail servers may be required to obtain tracking phone numbers in some cases.

The callback function is supplied with one parameter, which is an object with keys representing swap targets and values representing the tracking number to be displayed in its place. Your callback function should handle number insertion or replacement, including any desired formatting.

Note that getSwapNumbers immediately returns the current list of known swap replacements, which may or may not include replacements for all queried numbers. Since numbers may load asynchronously, it is strongly recommended that you use the callback mechanism rather than relying on the return value of this function.

Also note that if no suitable replacements are found, some values from the queried number list may not have a corresponding value in the result provided to your callback function. This can happen if you provide an unknown swap target in the numbers array, but can also happen if your keyword pool is temporarily exhausted.

Form Submission
<body>
  <!-- this form will not be captured -->
  <form action="/search" method="get" data-cr-no-capture>
    <input type="text" placeholder="Search...">
    <input type="submit">
  </form>

  <form action="/request-quote" method="post">
    <input type="text" name="Email">
    <textarea name="Comments"></textarea>
    <!-- this form will be captured,
         but the captcha will be excluded. -->
    <input type="text" name="captcha" data-cr-no-capture>
    <input type="submit">
  </form>
</body>
HTML Markup
When Form Submission is configured, swap.js will capture all forms submitted on a page and submit them to CallRail.

If there are forms you don’t wish to be included, you can mark them with a data-cr-no-capture attribute.

Additionally, you can mark specific <input> tags inside a form with this attribute to prevent it from being submitted along with the rest of the form.

CallTrk.captureForm('#contact-form', function() {
  alert('thank you for your submission!'); 
});

/* or with a form element directly: */
var form = document.querySelector('#contact-form');

CallTrk.captureForm(form, function() {
  alert('thank you for your submission!');
});
Javascript API
CallRail’s Form Submission functionality works automatically for a wide variety of forms; however, sometimes it may be necessary to manually trigger form submissions.

CallTrk.captureForm(nodeOrSelector, callback)
Given a DOM <form> Node or a document.querySelector() String that resolves to a <form>, report the form contents to CallRail, and then trigger the given callback.

EXAMPLES
Grapher - Ruby on Rails
Grapher is intended for anyone who wants to see an example of how to consume CallRail’s API. This example source code includes explanitory comments and a detailed Readme. Code can be found here.