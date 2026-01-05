# Robokit TCP API (Scraped)

This document aggregates Robokit API notes from the Feishu scrape under `scraped/wiki_all/`.
Source index: `scraped/wiki_topics.md`.
Some pages may be missing content if the scrape captured only navigation shells.

## Robot API basics

### API (root)
No readable content found in scrape for this page.

### API overview (Feishu)
No readable content found in scrape for this page.

### Overview (robot API)
No readable content found in scrape for this page.

### API introduction
Robokit opens relevant APIs for robot operations to users. The entire set of APIs uses the TCP request/response Q&A approach, where the robot acts as a server to accept requests from the Client and respond to the Client. API requests consist of a header and a data area. The header is of fixed length and is used to identify basic information about the data packet, as well as the length and type of the data area. The data area is serialized JSON data, and deserialization based on the type information in the header can yield the corresponding JSON object. API responses also consist of a header and a data area. The header is a fixed-length byte obtained based on the request (the relationship between the response header and the corresponding request header is described below), and the data area is also serialized JSON data.
#### API Testing and Routines
We have open-sourced the API testing tool on Github, Source , which is written in Qt, and its source code can be used as a reference example. The compiled single Windows executable file can also be downloaded from Release .
If you need a C# routine, please click this link .
#### API Category
APIs are divided into six categories, namely Robot Status API, Robot Control API, Robot Navigation API, Robot Configuration API, Other API, and Robot Push API.
- 1. Robot Status API : Used to query various status variables of the robot, such as position, velocity, alarm information, etc.

### API message structure
#### API Structure
|Name|Content|Length (byte)|Description|
|---|---|---|---|
|Message Synchronization Header|0x5A|1 ( uint8 )|Message synchronization header, used to determine the start of the message header.|
|Protocol Version|1|1 ( uint8 )|The major version number of the protocol. RBK3.4 Fill0x01 RBK3.5 fill with 0x02|
|Serial Number||2 ( uint16 )|The sequence number of the request and response (0 ~ 65535), this field is the same for the request packet and the response packet, and the API user fills in the sequence number themselves. The robot uses this sequence number for the response to each request.|
|DataTotalLength||4( uint32 )|Data total length, that is, the total data length that needs to be processed by Robokit.|
|Message Type (Number)||2( uint16 )|identifies the type of the message, i.e., the API number, details are shown in the following text Chapters of each API|
|Internal Use Area||6( uint8[6] )|For internal use within the program (no need to pay attention to the content of this area, as its content may not be 0 and may change). The 3rd and 4th positions serve as the routing area length (APIs that include both the routing area and data use this data). The 5th position is used as the compression type, and the meaning of the number is shown in Compression Type (if compression is selected, the length of the json area is the length before compression).|
|Data Area||Depends on the length of the data area in the header|JSON serialized data content (if it contains both the routing area and data, it is the concatenated string of the routing area and data).|
```text
#include <stdint.h>
struct ProtocolHeader {
    uint8_t  m_sync;
    uint8_t  m_version;
    uint16_t m_number;
    uint32_t m_length;
```

### API error code
API Error codes, represented by the "ret_code" field in the JSON object of the response data, are used to indicate unsuccessful request execution or errors. If the ret_code is 0 or absent, it means there is no error. If it is not 0, it indicates an error. The error codes are listed in the table below.
The error code will only appear in the JSON data of the response section.
|ErrorCode|Name|Description|
|---|---|---|
|40000|req_unavailable|Request unavailable|
|40001|param_missing|Required request parameter missing|
|40002|param_type_error|Request parameter type error|
|40003|param_illegal|Illegal request parameter|
|40004|mode_error|Mode error|
|40005|illegal_map_name|Illegal map name|
|40006|programming_dsp|Programming firmware|
|40007|program_dsp_error|Firmware programming error|
|40008|illegal_filename|Illegal filename|
|40010|shutdown_error|Shutdown command error|
|40011|reboot_error|Reboot command error|
|40012|dispatching|Dispatching system control|
|40013|robod_error|Robod error|
|40014|robod_warning|Robod warning|
|40015|manual_charging|Manual charging in progress, cannot move|
|40016|emc_status|EMC status activated|
|40020|locked|Control seized by another entity|
|40050|map_parse_error_|Map parsing error|
|40051|map_not_exists|Map does not exist|
|40052|load_map_error|Load map error|
|40053|load_mapobj_error|Reload map error|
|40054|empty_map|Empty map|
|40055|file_not_exists|File does not exist|
|40056|map_convert_error|Map conversion failed|

### API usage tutorial
This guide introduces the use of this TCP API protocol to control the robot for continuous path navigation (This is the most common way).
#### Path Navigation Process
- 1. Start the Robot
- 2. Wait for the robot to boot complete (After the robot is successfully connected using TCP, the boot is completed)
- 3. Perform relocation 2002
- 4. Query location status and wait for relocating completion 1021
- 5. Confirm Positioning Correct 2003 ( 3.4.6.18 versions above do not need to call the Confirm Positioning API again )
- 6. Perform path navigation 3051
- 7. Query navigation status and wait for navigation to complete 1020
- 8. Repeat steps 6 and 7 to achieve continuous path navigation
Note:
If the location was correct and did not move after the robot was turned off the last time, then step 3 can be omitted after the robot is turned on. After querying that the relocating is completed, directly confirm that the location is correct.

### Best practices
No readable content found in scrape for this page.

### Appendix
No readable content found in scrape for this page.

### Matters need attention
- 1. International units are used, such as m, rad, m/s, etc, except those of some specified values.
- 2. The API number of response is the API number of request + 10000 (0x2710), and the request corresponds to the response respectively.
- 3. Avoid sending any non-ACSII characters, especially operations related to map names, because map names containing Chinese characters will be considered illegal.
- 4. The order of the keys in the JSON Object returned in each data area is not guaranteed, because JSON does not specify this.
- 5. If there is a key-value in the JSON Object which is not mentioned in the API response data area, you can ignore it directly.

## Transport and protocol layers

### TCP/IP API
No readable content found in scrape for this page.

### TCP client mode
(3.4.6.13 + available)
The TCPClient in the model file contains five settings: ip, port, timeout time, whether to reconnect, and the number of reconnections. When the timeout time is 0, the timeout time is not set.
After setting and saving the upload in the model file, Robokit will attempt to connect to the IP and port in the settings. After the connection is successful, it will actively send a message in JSON format with the following fields. The server level needs to respond to a message that conforms to the RBK message format. The response message is not processed and only represents receipt. After the connection is successful, the server level can actively send a request API.
|Field name|Type|Description|
|---|---|---|
|name|string|Robot name|
|ip|string|Client ip|
|port|number|Client port|
#### Request
Same server mode
#### Response
Same server mode

### ModbusTcp API
No readable content found in scrape for this page.

### Modbus overview
#### About Modbus
The Modbus TCP service of the robot can be accessed via both the intranet IP (192.168.192.5) and the extranet IP. The network port uses the standard Modbus port 502 . During operation, external devices act as the master device, while the robot acts as the slave device for communication. External devices are responsible for pulling data from the robot.
Theoretically, the number of external devices communicating with the robot simultaneously via Modbus is unlimited. Each external device is handled by a separate process. As long as the connection is successful, data can be read from or written to the robot. Setting modbusSlaveId to -1 in the robot parameter configuration indicates that the slaveid of Modbus messages is not checked.
To prevent anomalies caused by high-speed data read and write operations, the robot uses data caching during communication. It is possible that within a very short period, the information obtained by Modbus may not match the actual state of the robot. Please avoid high-speed data read and write operations.
#### How to use Modbus RTU?
#### Overview
Modbus industrial fieldbus can be mainly divided into two types according to different implementation methods at the data link layer: Modbus Serial (RTU, ASCII) and TCP.
#### Modbus Serial Bus
The implementation of Modbus serial bus is mainly achieved through serial communication, with no special requirements or restrictions on the communication method. Mainstream serial physical buses are all acceptable, such as RS232, RS422, RS485, etc. The communication mode of the serial bus is the leader/follower communication mode (the follower will not send any messages to the leader unless accessed, and followers cannot communicate with each other); the host has two communication modes with the follower (broadcast and unicast, which we will explain in detail in the message format below)
#### Modbus RTU
#### Detailed Explanation of Leader/Follower Communication
Note that Modbus followers have a unique follower node address on the network. The addressing range of the leader is (0 - 255), where 0 represents the broadcast address. The specific address allocation is as follows:

## State, telemetry, and health

### Robot status API
No readable content found in scrape for this page.

### Query robot information
#### Request
- Number: 1000 (0x03E8)
- Name: robot_status_info_req
- Description: Query robot information
- JSON Data Area: None
#### Request Example
Data area length is 0, only contains the packet header:
```text
5A 01 00 01 00 00 00 00 03 E8 00 00 00 00 00 00
```
#### Response
- Number: 11000 (0x2AF8)
- Name: robot_status_info_res
- Description: Response for querying robot information
- JSON Data Area: See the table below
If there are AttributeValue Pairs in the JSON Object of the response data area that are not mentioned in the API, they can be directly ignored without needing to concern about their meanings, and this will not be repeated below
|Field Name|Type|Description|Can be defaulted|
|---|---|---|---|
|id|string|Robot ID|Yes|
|vehicle_id|string|Robot Name|Yes|
|robot_note|string|Robot Remarks|Yes|
|version|string|Robokit Version Number|Yes|

### Query robot operation information
#### Request
- Number: 1002 (0x03EA)
- Name: robot_status_run_req
- Description: Query the operating status information of the robot (such as running time, mileage, etc.)
- JSON Data Area: None
#### Request Example
Data area length is 0, only contains the packet header:
```text
5A 01 00 01 00 00 00 00 03 EA 00 00 00 00 00 00
```
#### Response
- Number: 11002 (0x2AFA)
- Name: robot_status_run_res
- Description: Response to querying the operating status information of the robot
- JSON Data Area: See the table below
If the JSON object in the response data contains key-value pairs not mentioned in the API, they can be ignored and their meaning does not need to be considered. This will not be repeated below.
|Field Name|Type|Description|Can be defaulted|
|---|---|---|---|
|odo|number|Cumulative driving mileage, unit: m|Yes|
|today_odo|number|Today's cumulative driving mileage, unit: m|Yes|
|time|number|This running time (from power-on to the current time), unit: ms|Yes|
|total_time|number|Cumulative running time, unit: ms|Yes|
|controller_temp|number|Controller temperature, Unit:|Yes|

### Query robot location
The coordinate of the robot in the world coordinate system .
#### Request
- API number: 1004 (0x03EC)
- Name: robot_status_loc_req
- Description: Robot location inquiry
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 EC 00 00 00 00 00 00
```
#### Response
- API number: 11004 (0x2AFC)
- Name: robot_status_loc_res
- Description: Response of robot location inquiry .
- JSON data area: See table below
If there is a key-value in the JSON Object which is not mentioned in the API response data area, you can ignore it directly, which also applies for the following content.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|x|number|The x coordinate of the robot, unit: m|YES|
|y|number|The y coordinate of the robot, unit: m|YES|
|angle|number|The angle coordinate of the robot, unit: rad|YES|
|confidence|number|Confidence of robot's localization, range [0, 1]|YES|

### Query robot speed
#### Request
- Number: 1005 (0x03ED)
- Name: robot_status_speed_req
- Description: Query robot speed
- JSON Data Area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 ED 00 00 00 00 00 00
```
#### Response
- Number: 11005 (0x2AFD)
- Name: robot_status_speed_res
- Description: Response to querying robot speed
- JSON Data Area: See the table below
If there are AttributeValue Pairs in the JSON Object of the response data area that are not mentioned in the API, they can be directly ignored without needing to concern about their meanings, and this will not be repeated below
|Field Name|Type|Description|Can be defaulted|
|---|---|---|---|
|vx|number|The actual velocity of the robot in the x-direction of the robot coordinate system, with the unit of m/s|Yes|
|vy|number|The actual velocity of the robot in the y-direction of the robot coordinate system, with the unit of m/s|Yes|
|w|number|The actual angular velocity of the robot in the robot coordinate system (i.e., clockwise rotation is negative, counterclockwise rotation is positive), unit: rad/s|Yes|

### Query robot battery status
#### Request
- API number: 1007 (0x03EF)
- Name: robot_status_battery_req
- Description: Robot battery status inquiry
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|simple|boolean|Whether to response only simple data, true = yes, false = no, and default is no.|YES|
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 EF 00 00 00 00 00 00
```
```text
// Response only simple data.
// {"simple":true}
5A 01 00 01 00 00 00 0F 03 EF 00 00 00 00 00 00
7B 22 73 69 6D 70 6C 65 22 3A 74 72 75 65 7D
```
#### Response
- API number: 11007 (0x2AFF)
- Name: robot_status_battery_res
- Description: Response of robot battery status inquiry
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|battery_level|number|Robot battery level, range [0, 1]|YES|
|battery_temp|number|Robot battery temperature, unit:|YES|

### Query robot motor status
#### Request
- API number: 1040 (0x0410)
- Name: robot_status_motor_req
- Description: Robot motor status inquiry
- JSON data area: See table below.
|Field name|Type|Description|Whether Default|
|---|---|---|---|
|motor_names|array[string]|Get the specified motor status information according to the motor name. If this field is defaulted (empty), it means to query all motor status information.|YES|
#### Request Example
- 1. Get the status information of the motor named "motor1"
```text
5A 01 00 01 00 00 00 1B 04 10 00 00 00 00 00 00
```
```text
// {"motor_names": ["motor1"]}
5A 01 00 01 00 00 00 1B 04 10 00 00 00 00 00 00 7B 22 6D 6F 74 6F 72 5F 6E 61 6D 65 73 22 3A 20 5B 22 6D 6F 74 6F 72 31 22 5D 7D
```
- 2. Get all motor status information
```text
5A 01 00 01 00 00 00 00 04 10 00 00 00 00 00 00
```

### Query robot alarm status
#### Request
- API number: 1050 (0x041A)
- Name: robot_status_alarm_req
- Description: Robot alarm status inquiry
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 04 1A 00 00 00 00 00 00
```
#### Response
- API number: 11050 (0x2B2A)
- Name: robot_status_alarm_res
- Description: resonse of robot dispatching status inquiry
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|fatals|array[object]|Fatal alarm array, all Fatal alarms will appear in the data, see the object format below.|Yes|
|errors|array[object]|Error alarm array, all Error alarms will appear in the data, see the object format below.|Yes|
|warnings|array[object]|Warning alarm array, all Warning alarm will appear in the data, the object format is described below.|Yes|
|notices|array[object]|Notice alarm array, all Warning alarm will appear in the data, the object format is described below.|Yes|
|ret_code|number|API error code|Yes|
|create_on|string|API upload timestamp|Yes|

### Query robot I/O status
#### Request
- API number: 1013 (0x03F5)
- Name: robot_status_io_req
- Description: Robot I/O status inquiry
- JSON data area: None
#### Requset Example
```text
5A 01 00 01 00 00 00 00 03 F5 00 00 00 00 00 00
```
#### Response
- API number: 11013 (0x2B05)
- Name: robot_status_io_res
- Description: Response of robot I/O status inquiry
- JSON data area: See table below.
|Field name|Type|Description|Whether Default|
|---|---|---|---|
|DI|array[Object]|id: corresponding id number source: normal = normal DI virtual = virtual DI modbus = modbus DI status: indicates high or low level true = high level false = low level valid: Whether the corresponding DI is enabled true = enabled false = disabled|YES|
|DO|array[Object]|id: corresponding id number source: normal = normal DO modbus = modbus DO status: indicates high or low level true = high level false = low level|YES|

### Query robot ultrasonic status
#### Request
- API number: 1016 (0x03F8)
- Name: robot_status_ultrasonic_req
- Description: Robot ultrasonic status inquiry
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 F8 00 00 00 00 00 00
```
#### Response
- API number: 11016 (0x2B08)
- Name: robot_status_ultrasonic_res
- Description: Response of robot ultrasonic status inquiry
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|ultrasonic_nodes|array[object]|Ultrasonic data, see below for data examples|YES|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|Error message|YES|
object form is as follows:
```text
{
    "id": 0,      // ultrasonic node ID
    "dist": 0.2,  // the distance that the ultrasonic detected(Unit:m)
    "valid": true // valid or not
}
```

### Query robot localization status
#### Request
- Number: 1021 (0x03FD)
- Name: robot_status_reloc_req
- Description: Query the current positioning status of the robot
- JSON Data Area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 FD 00 00 00 00 00 00
```
#### Response
- Number: 11021 (0x2B0D)
- Name: robot_status_reloc_res
- Description: Response for querying the current positioning status of the robot
- JSON Data Area: See the table below
If there are AttributeValue Pairs in the JSON Object of the response data area that are not mentioned in the API, they can be directly ignored without the need to concern about their meanings, and this will not be repeated below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|reloc_status|number|0 = RELOC_INIT(Relocation Initialization in Progress) 1 = RELOC_SUCCESS (Relocation Successful) 2 = RELOC_RELOCING (Relocating)|Yes|
|ret_code|number|API Error Code|Yes|
|create_on|string|API Upload Timestamp|Yes|
|err_msg|string|Error Message|Yes|

## Navigation and motion control

### Robot navigation API
No readable content found in scrape for this page.

### Query navigation status
#### Request
- Number: 1020 (0x03FC)
- Name: robot_status_task_req
- Description: Query the robot's current navigation status, navigation stations, navigation-related paths (stations already passed, stations yet to be passed), etc.
- JSON Data Area: See the table below
|Field Name|Type|Description|Defaultable|
|---|---|---|---|
|simple|boolean|Whether to return only simple data, true = yes, false = no, default is no|Yes|
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 FC 00 00 00 00 00 00
```
```text
// Only return simple data
// {"simple":true}
5A 01 00 01 00 00 00 0F 03 FC 00 00 00 00 00 00
7B 22 73 69 6D 70 6C 65 22 3A 74 72 75 65 7D
```
#### Response
- Number: 11020 (0x2B0C)
- Name: robot_status_task_req
- Description: Response to query the current navigation status of the robot
- JSON Data Area: See the table below

### Path navigation
Path navigation is for a given target station, with the robot automatically planning the path for operation, during which it will pass through other intermediate stations but will not stop.
Note:
- 1. This interface is only used in single-vehicle scenarios such as task chains and verification tests. It cannot be used in scheduling scenarios. In scheduling scenarios, dangerous situations such as discontinuous speed and failure to follow the path may occur.
- 2. If the current task is not completed, after issuing a new navigation task using this API, the current task will be cancelled, and the newly issued task will be executed immediately.
- 3. This API does not enforce the task_id field.
- 4. task_id cannot be repeated.
- 5. If you want to implement the function of appending navigation tasks, you can use the API for navigating to a specified path.
- 6. After this API issues a valid task, the robot will automatically clear the following error codes:
Warning Level:
54901 , 54231 , 54027 , 54208, 54028 , 54070 , 55300 , 54313
Error Level:
53000 , 52114 , 52115 , 52200 , 52201 , 52202 , 52203 , 52204 , 52300 , 52400 , 52600 , 52700 , 52701 , 52702 , 52703 , 52704 , 52705 , 52706 , 52708 , 52710 , 52713 , 52714 , 52715 , 52800 , 52803 , 52950 , 52951 , 52952 , 52309 , 52801 , 52161 , 52162 , 52168 , 52179 , 52961 , 52164 , 52165 , 52166 , 52167 , 52963 , 52716 , 52717 , 52803 , 52804 , 52805 , 52032, 52044, 52313
#### Request
- Number: 3051 (0x0BEB)
- Name: robot_task_gotarget_req
- Description: Path Navigation
- JSON Data Area: See the table below
Precautions: Usually, this API needs to be used in conjunction with Query the navigation status of the robot to query the current arrival status of the robot
#### 1. Pure fixed path navigation
```text
// Example 1.1 The robot travels along the LM2->LM1 route to LM1.
```

### Designated path navigation
The designated path navigation is to send a set of station sequences to the robot, and the robot will navigate according to this sequence (no longer planning its own path), without stopping at intermediate sites.
Note:
- 1. Robokit 3.3 and above must contain three elements: source_id represents the start of the route, id represents the end of the route, and task_id represents the unique number of the task.
- 2. source_id and id must have a direct connection between the route, can not jump point, otherwise the robot will report an error.
- 3. ID If not SELF_POSITION , source_id cannot be SELF_POSITION .
- 4. ID and source_id can be both SELF_POSITION .
- 5. This API requires a mandatory task_id .
- 6. task_id cannot be repeated.
- 7. If the current robot is performing a task, the new task will be automatically appended to the current task. If the current task fails or is cancelled, the new task will also be cancelled. If the current task is completed, the new task will be executed in the order it was received.
- 8. Specified path navigation also supports navigation tasks with operation, execute scripts, see Path Navigation .
- 9. If the robot performs a specified path navigation task and appends a new task, the route of the new task and the route of the last task are not connected (for example, the end point of the path of the last task and the starting point of the path of the new task are not the same point), but jump. If the jump distance is greater than OutPathDist , it will cause an error outside the route, otherwise it will directly navigate to a disconnected route.
#### Request
- Code: 3066 (0x0BFA)
- Name: robot_task_gotargetlist_req
- Description: Designated path navigation
- JSON data area: see request example
Reference path navigation 3051, where task_id, id, source_id are required fields and cannot be omitted.
Note: Usually this api needs to cooperate with the Robot Task Status Package Inquiry , to query the current robot to point status

### Translation
#### Request
- API number: 3055 (0x0BEF)
- Name: robot_task_translate_req
- Description: Translation; Move a fixed distance in a straight line at a fixed speed.
- JSON data area: See table below.
Note:
- 1. 3055 (translation), 3056 (rotation), 3057, and 3058 cannot be performed simultaneously
- 2. If the current task is not completed, after issuing a new navigation task using this API, the current task will be cancelled and the newly issued task will be executed immediately.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|dist|number|Linear movement distance, absolute value, unit: m|NO|
|vx|number|The movement speed for X direction in the robot coordinate system, positive is forward, negative is backward, unit: m/s|YES|
|vy|number|The movement speed for Y direction in the robot coordinate system, positive is to the left, negative is to the right, unit: m/s|YES|
|mode|number|0 = mileage mode (Motion based on mileage), 1 = localization mode, default is mileage mode|YES|
If vx and vy both have values, then will use composition of velocities.
Mileage mode does not require precise localization, but it may produce large errors for long-distance movements. The error increases with distance. The localization mode requires stable localization in the current environment, and the error is related to the current environment and localization accuracy.

### Rotation
#### Request
- API number: 3056 (0x0BF0)
- Name: robot_task_turn_req
- Description: Rotation, rotate a fixed angle at a fixed angular speed
- JSON data area: See table below.
Note:
3055(Translation), 3056(Rotation), 3057 cannot be performed simultaneously
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|angle|number|Rotation angle (robot coordinate system), absolute value, unit: rad, can be greater than 2|NO|
|vw|number|Angular speed of rotation (robot coordinate system), positive for counterclockwise rotation, negative for clockwise rotation, unit: rad/s|NO|
|mode|number|0 = mileage mode (Motion based on mileage), 1 = localization mode, default is mileage mode|YES|
The mileage mode does not require precise localization, but for a large rotation angle, a large error may occur, and the error increases as the rotation angle increases. The localization mode requires stable localization in the current environment, and the error is related to the current environment and localization accuracy.
#### Request Example
```text
{"angle":3.14,"vw":1.6}
// rotate 3.14 rad with rotation speed 1.6rad/s
5A 01 00 01 00 00 00 17 0B F0 00 00 00 00 00 00
7B 22 61 6E 67 6C 65 22 3A 33 2E 31 34 2C 22 76
77 22 3A 31 2E 36 7D
```

### Circular motion
#### Request
- API number: 3058 (0x0BF2)
- Name: robot_task_circular_req
- Description: Circular motion
- JSON data area: See table below.
Note:
3055 (translation), 3056 (rotation), 3057 (spin), 3058 cannot be performed simultaneously.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|rot_radius|number|Rotation radius, unit m; the center of the rotation circle located on the left side of the robot coordinate system is positive, and the right side is negative.|YES|
|rot_degree|number|Rotation angle, unit|YES|
|rot_speed|number|Rotation speed, the unit is rad/s, negative number means clockwise.|YES|
|mode|number|0 = mileage mode (move according to mileage), 1 = positioning mode, the default is the mileage mode.|YES|
#### Request Example
```text
{"rot_radius":1,"rot_degree":360,"rot_speed":0.5, "mode":0}
// Rotate 360 degrees with a rotation radius of 1m, 0.5 rad/s
5A 01 00 01 00 00 00 00 0B F1 00 00 00 00 00 00
7B 22 72 6F 74 5F 72 61 64 69 75 73 22 3A 31 2C 22 72 6F 74 5F 64 65 67 72 65 65 22 3A 33 36 30 2C 22 72 6F 74 5F 73 70 65 65 64 22 3A 30 2E 35 2C 20 22 6D 6F 64 65 22 3A 30 7D
```

### Enable/disable paths
3.4.6.13+
#### Request
- Code: 3059 (0x0BF3)
- Name: robot_task_path_req
- Description: Enable and disable paths.
- JSON data area: See table below. a. Disable path Field name Type Description Can default disablePath json string Disabled path name, json string format is {"id": "path name"} No b. Enable path Field name Type Description Can default enablePath json string Enabled path name, json string format is {"id": "path name"} No c. Check the path
- a. Disable path
|Field name|Type|Description|Can default|
|---|---|---|---|
|disablePath|json string|Disabled path name, json string format is {"id": "path name"}|No|
- b. Enable path
|Field name|Type|Description|Can default|
|---|---|---|---|
|enablePath|json string|Enabled path name, json string format is {"id": "path name"}|No|
- c. Check the path
See request example.
#### Request example
- 1. Disable path.
```text
{"disablePath":{"id":"LM1-LM2"}}
```
- 2. Enable path.
```text
{"enablePath":{"id":"LM1-LM2"}}
```
- 3. Check the path.

### Pause navigation
#### Request
- API number: 3001 (0x0BB9)
- Name: robot_task_pause_req
- Description: Pause navigation
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 0B B9 00 00 00 00 00 00
```
#### Response
- API number: 13001 (0x32C9)
- Name: robot_task_pause_res
- Description: Response of pause navigation
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|error message|YES|
#### Response Example
```text
{
 "ret_code": 0
}
```

### Resume navigation
#### Request
- API number: 3002 (0x0BBA)
- Name: robot_task_resume_req
- Description: Resume navigation
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 0B BA 00 00 00 00 00 00
```
#### Response
- API number: 13002 (0x32CA)
- Name: robot_task_resume_res
- Description: Response of resume navigation
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|error message|YES|
#### Response Example
```text
{
 "ret_code": 0
}
```

### Cancel navigation
#### Request
- API number: 3003 (0x0BBB)
- Name: robot_task_cancel_req
- Description: Cancel navigation
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 0B BB 00 00 00 00 00 00
```
#### Response
- API number: 13003 (0x32CB)
- Name: robot_task_cancel_res
- Description: Response of cancel navigation
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|error message|YES|
#### Response Example
```text
{
 "ret_code": 0
}
```

### Get navigation path
The request only returns the planned path to the target point using path navigation, without actually performing navigation.
#### Request
- Code: 3053 (0x0BED)
- Name: robot_task_target_path_req
- Description: Get the path of the path navigation
- JSON data area: see table below
|Field name|Type|Description|Can default|
|---|---|---|---|
|id|string|ID of the target site|No|
|return_stations|object|Return the storage bin information bound to the site|Yes|
#### Request example
Example 1: Query the path to AP25.
```text
5A 01 00 01 00 00 00 0D 0B ED 00 00 00 00 00 00
// path inquiry to AP25 {"id":"AP25"}, and the data area after serialization is:
7B 22 69 64 22 3A 22 41 50 32 35 22 7D
```
Example 2: Query the path to "LM2" and return the storage bin information corresponding to the point on the path.
```text
{"id":"LM2","return_stations":true}
```
#### Response

### Clear navigation path
Clear the site sequence issued by the specified path navigation [3066], and the robot will stop moving
#### Request
- Number: 3067 (0x0BFB)
- Name: robot_task_cleartargetlist_req
- Description: Clear the specified navigation path
- JSON Data Area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 0B FB 00 00 00 00 00 00
```
#### Response
- Number: 13067 (0x330B)
- Name: robot_task_cleartargetlist_res
- Description: Clear the response of the specified navigation path
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|ret_code|number|API Error Code|Yes|
|create_on|string|API Upload Timestamp|Yes|
|err_msg|string|Error Message|Yes|
#### Response Example

### Clear navigation path by task ID
3.3.5.76 < rbk
Clear the site sequence issued by task_id in the specified path navigation 3066 . Tasks after task_id (excluding task_id ) will be cancelled, and the robot will complete the movement task of task_id , but will not execute the point action of task_id
#### Request
- Number: 3068 (0x0BFC)
- Name: robot_task_safeclearmovements_req
- Description: Clear the specified navigation path based on the task ID
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|task_id|string|Task ID in 3066 API|No|
Note: If task_id is empty or does not exist, the robot will not respond.
#### Request Example
```text
{
 "task_id": "12344321"
}
```
#### Response
- Number: 13068 (0x330C)
- Name: robot_task_safeclearmovements_res
- Description: Clear the response of the specified navigation path based on the task ID
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|

### Query path between two points
#### Request
- Code: 1303 (0x0517)
- Name: robot_status_get_path_req
- Description: Query the path between any two points.
- JSON data area: See table below.
- RBK Version: 3.4.5.26 +
|Field name|Type|Description|Can default|
|---|---|---|---|
|target_id|string|End of the route|No|
|source_id|string|Starting point of route|No|
#### Request example
```text
//{"source_id": "LM1", "target_id":  "LM10"}
5A 01 00 01 00 00 00 00 05 17 00 00 00 00 00 00
7B 22 73 6F 75 72 63 65 5F 69 64 22 3A 20 22 4C
4D 31 22 2C 20 22 74 61 72 67 65 74 5F 69 64 22
3A 20 20 22 4C 4D 31 30 22 7D
```
#### Response
- Code: 11303 (2c27)
- Name: robot_status_info_res
- Description: Response to query the path between any two points
- JSON data area: see table below
If there is a key-value Attribute - Value Pair in the JSON Object of the response data area that is not mentioned in the API, it can be ignored directly without paying attention to its meaning. It will not be repeated in the following text.

## Task execution (robot-side)

### Implement scheduling
#### 1. Channel
This agreement involves two types of communication channels
#### 1.1 Request response channel
The robot acts as a TCP server level, and the scheduler acts as a TCP client. The scheduler sends tasks serially, and the robot responds. Serial means that the scheduler will not send the next task until it sends and receives a response.
#### 1.2 Robot data reporting channel
The robot acts as a TCP server level, and the scheduler acts as a TCP client. When the scheduler connects to the robot through this channel, the robot actively pushes the robot's data and status to the scheduler at the specified frequency.
#### 2. Communications Protocol
#### 2.1 Issue navigation tasks to robots
Port: 19206. This port belongs to the request response channel.
API Number: 3066
#### 2.2 Check the status of navigation tasks
Port: 19204. This port belongs to the request response channel.
Request number: 1110
#### 2.3 Control

### Query robot task status
#### Request
- Number: 1110 (0x456)
- Name: robot_status_task_status_package_req
- Description: Query the status of the robot task
- JSON Data Area: See the table below
|Field Name|Type|Description|Defaultable|
|---|---|---|---|
|task_ids|array[string]|Specify the task_id of the task to be queried in the array. If the array is empty, the response will also be empty; If this field is omitted, the status of the most recently completed task and the status of all incomplete tasks of the robot will be returned.|Yes|
#### Request Example
```text
// Query the last completed task and all uncompleted tasks
5A 01 00 01 00 00 00 00 04 56 00 00 00 00 00 00
```
```text
// Query task status with task_id SEER78909
// {"task_ids": ["SEER78909"]}
5A 01 00 01 00 00 00 1B 04 56 00 00 00 00 00 00
7B 22 74 61 73 6B 5F 69 64 73 22 3A 20 5B 22 53 45 45 52 37 38 39 30 39 22 5D 7D
```
#### Response
- Number: 11110 (0x2B66)
- Name: robot_status_task_status_package_res

### Query robot task list
#### Request
- Number: 1026(0x0402)
- Name: robot_status_tasklist_req
- Description: Query the robot task list
- JSON Data Area: None
#### Request Example
```text
5A 01 00 00 00 00 00 00 04 02 04 02 00 00 00 00
```
#### Response
- Number: 11026(0x2B12)
- Name: robot_status_tasklist_res
- Description: Response for querying the robot task list
- JSON Data Area: See the table below
|Field Name|Type|Description|Defaultable|
|---|---|---|---|
|tasklist_status|json|Task List Status|No|
#### Response Example
```text
{
 "create_on": "2025-09-26T14:34:23.191+0800",
 "ret_code": 0,
 "tasklist_status": {
 "actionGroupId": 0,
 "actionIds": [
 ],
 "loop": false,
 "taskId": 0,
 "taskListName": "",
 "taskListStatus": 0
 }
}
```

### Query robot task chain
#### Request
- API number: 3101 (0x0C1D)
- Name: robot_tasklist_status_req
- DEscription: Query the task chain.
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|with_robot_status|boolean|If it is true, the status data of the robot is returned. In the current status data, only the electric quantity information is available.|YES|
|task_list_name|string|Name of the task chain to be queried; This task chain is the last executed one (in the executing state). If the task chain can be queried, the details are returned; if not, the taskListStatus returns 404.|YES|
#### Request Example
```text
{"task_list_name":"task_20210428203859635","with_robot_status":False}
// Query the information of task chain task_20210428203859635,
// task_20210428203859635 may the last task chain executed before shutdown,
// or the task chain being executing.
5A 01 00 01 00 00 00 48 0C 1D 00 00 00 00 00 00
7B 22 74 61 73 6B 5F 6C 69 73 74 5F 6E 61 6D 65
22 3A 20 22 74 61 73 6B 5F 32 30 32 31 30 34 32
38 32 30 33 38 35 39 36 33 35 22 2C 20 22 77 69
74 68 5F 72 6F 62 6F 74 5F 73 74 61 74 75 73 22
3A 20 66 61 6C 73 65 7D
```
#### Response

### Query robot task chain list
#### Request
- Code: 3115 (0x0C2B)
- Name: robot_tasklist_list_req
- Description: Query all task chains of the robot
- JSON data area: None
#### Request example
No
#### Response
- Code: 13115 (0x333B)
- Name: robot_tasklist_list_res
- Description: Query the response of all task chains of the robot
- JSON data area: see table below
|Field name|Type|Description|Can default|
|---|---|---|---|
|tasklists|string array|Task chain list|Yes|
|ret_code|number|API error code|Yes|
|create_on|string|API upload timestamp|Yes|
|err_msg|string|Error message|Yes|
#### Response example
```text
{
 "create_on": "2022-11-24T17:57:37.153Z",
 "ret_code": 0,
 "tasklists": ["21-01-04-B-08-01-01", "task_20210720020304790"]
}
```

### Execute pre-stored tasks
#### Request
- API number: 3106 (0x0C22)
- Name: robot_tasklist_name_req
- Description: Execute pre-stored tasks
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|name|string|The name of the pre-stored tasks (uploaded with Roboshop)|No|
#### Request Example
```text
{"name":"task_666"}
// Execute the task_666 tasklist which pre-stored in robot
5A 01 00 01 00 00 00 13 0C 22 00 00 00 00 00 00
7B 22 6E 61 6D 65 22 3A 22 74 61 73 6B 5F 36 36
36 22 7D
```
#### Response
- API number: 13106 (0x3332)
- Name: robot_tasklist_name_res
- Description: Response of execute pre-stored tasks
- JSON data area: See table below
|Field Name|Type|Description|Description|
|---|---|---|---|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|error message|YES|

### Configure robot dispatchable status
#### Request
- FunctionChange the order receiving status of the specified robot .
- Method POST
- Description of interface /dispatchable
```text
POST "http://host:8088/dispatchable"
```
#### Request Data
|Name|Type|Description|Required|
|---|---|---|---|
|vehicles|string array|Array of vehicles names that need to change the order status|Yes|
|type|string|Order status type dispatchable= vehicles can take orders undispatchable_unignore= vechicles cannot take orders, but it takes up resources undispatchable_ignore= vechicles cannot take orders, and it don't take up resources|Yes|
Whether the vehicle occupies resources refers to whether the cehicle that is not currently accepting orders is visible to other vehicles.
- If the resource is occupied, that is, other vehicles can see the current vehicle, and will not collide with the vehicle during driving (the vehicle will be regarded as an obstacle).
- If it does not occupy resources, that is, other vehicles cannot see the current vehicle, it may collide with the vehicle while driving.
In general, if the vehicle breaks down and need to leave the field, but the vehicle is not int the work area at this time, it can be set the to undispatchable_ignore . If it is simply artificial to prevent the vehicle from accepting orders, it can be set to undispatchable_unignore At this time, the vehicles can be regarded as an obstacle to other vehicles.
#### Request Example
```text
{
    "vehicles": ["car1", "car2"],
    "type": "undispatchable_unignore"        // vechicles cannot take orders, but it takes up resources
}
```

## Maps, localization, and coordinate frames

### Coordinate system
In Robokit, there are two sets of coordinate system, namely the global coordinate system and the robot coordinate system . The global coordinate system is the right-handed coordinate system, that is, the coordinate system of the map and the operations related to the map and the location all use the global coordinate system. For example, the position of the robot (x, y, r) describes the x coordinate, y coordinate, and r angle of the robot in the global coordinate system. For the movement of the robot itself, you need to refer to the robot coordinate system. The robot coordinate system is the right-hand coordinate system.
#### Global Coordinate System
The global coordinate system is the right-handed coordinate system.
#### Origin of Global Coordinate System
Open a map in Roboshop to see the origin of the global coordinate system of the map. You can also change the position of the origin in the map arbitrarily through the coordinate transformation tool.
#### Robot Coordinate System
The robot coordinate system is the right-handed coordinate system.
#### Origin of Robot Coordinate System

### Get scan data
No readable content found in scrape for this page.

### Start map scanning
Note:
If you want to receive real-time map scanning data, please listen on UDP port 19301, and the data format is binary rbk.protocol.Message_MapLog . (After 3.4.6.17, port 19210 is used for active upload)
Note:
To receive real-time map scanning image frames, request HTTP port 9301, url: http://ip:9301/slam , method: Get , content-type : image/png .
#### Request
- Number: 6100 (0x17D4)
- Name: robot_other_slam_req
- Description: Start map scanning
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|slam_type|int|Map Scanning Type: 1 = 2D map scanning 2 = 2D real-time map scanning (real_time must be true) 3 = 3D map scanning 4 = 3D real-time map scanning (real_time needs to be true)|Yes|
|real_time|bool|Whether to enable real-time map scanning data transmission, default is false|Yes|
|screen_width|number|Screen Width (Pixels)|Yes|
|screen_height|number|Screen height (pixels)|Yes|
#### Request Example

### Load map to robot
#### Request
- API number: 4010 (0x0FAA)
- Name: robot_config_uploadmap_req
- Description: Push map to robot.
- JSON data area: See it below.
The content in the data area is the entire json format map. For details, please refer to Smap Map Format File Parsing .
#### Request Example
Omitted.
#### Response
- API number: 14010 (0x36BA)
- Name: robot_config_uploadmap_res
- Description: Response of push map to robot
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|Error message|YES|
#### Response Example
Omitted.

### Upload and switch map
#### Request
- Number: 2025 (0x07E9)
- Name: robot_control_upload_and_loadmap_req
- Description: Upload and switch to load the map
- JSON Data Area: See Below
When uploading a 2D map the content in the data area is the entire map in JSON format. For details on the map format, please refer to Appendix C: Map Format
When uploading a 3D map, the content in the data area is a Compressed Packet. For details on the map format, please refer to 3D
After parsing the map as valid, it will update the current_map in the status query to the new map, and after completing the response, switch the map loading status to "Map Loaded Successfully".
#### Request Example
#### Response
- Number: 12025 (0x2EF9)
- Name: robot_control_upload_and_loadmap_res
- Description: Response for uploading and switching to load a map
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|ret_code|number|API Error Code|Yes|
|create_on|string|API Upload Timestamp|Yes|

### Switch loaded map
#### Request
- Number: 2022 (0x07E6)
- Name: robot_control_loadmap_req
- Description: Switch the loaded map
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|map_name|string|Name of the map to switch to (cannot contain illegal characters such as Chinese characters, can only use 0-9, a-z, A-Z, -, _)|No|
After parsing the map and ensuring its legality, the current_map in the status query will be updated to the new map. After the response is completed, the map loading status will be switched to "Map Loaded Successfully".
#### Request Example
```text
5A 01 00 01 00 00 00 15 07 E6 00 00 00 00 00 00
{"map_name":"middle"}
// Serialized hexadecimal is:
7B 22 6D 61 70 5F 6E 61 6D 65 22 3A 22 6D 69 64 64 6C 65 22 7D
```
#### Response
- Number: 12022 (0x2EF6)
- Name: robot_control_loadmap_res
- Description: Response to switching the loaded map
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|ret_code|number|API Error Code|Yes|

### Delete map in robot
#### Request
- API number: 4012 (0x0FAC)
- Name: robot_config_removemap_req
- Description: Delete map in robot
- JSON data area: See table below.
|Field name|Type|Description|Whether Default|
|---|---|---|---|
|map_name|string|Map name (cannot contain illegal characters such as Chinese, can only use 0-9, a-z, A-Z, -, _)|NO|
#### Request Example
```text
{"map_name":"20210126173805395"}
// Remove the map named 20210126173805395 in robot
5A 01 00 01 00 00 00 20 0F AC 00 00 00 00 00 00
7B 22 6D 61 70 5F 6E 61 6D 65 22 3A 22 32 30 32
31 30 31 32 36 31 37 33 38 30 35 33 39 35 22 7D
```
#### Response
- API number: 14012 (0x36BC)
- Name: robot_config_removemap_res
- Description: Response of deleting map in robot
- JSON data area: See table below.
|Field name|Type|Description|Whether Default|
|---|---|---|---|
|ret_code|number|API error code|YES|

### Query loaded and stored maps
#### Request
- Number: 1300 (0x0514)
- Name: robot_status_map_req
- Description: Query the maps loaded by the robot and the stored maps
- JSON Data Area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 05 14 00 00 00 00 00 00
```
#### Response
- Number: 11300 (0x2C24)
- Name: robot_status_map_res
- Description: Response for querying the map loaded by the robot and the stored map
- JSON Data Area: See the table below
|Field Name|Type|Description|can be defaulted|
|---|---|---|---|
|current_map|string|Currently loaded map|Yes|
|current_map_md5|string|MD5 value of the currently loaded map|Yes|
|maps|array[string]|An array consisting of all map names stored on the robot|Yes|
|map_files_info|array[json]|Map information array, including map name, map size, and last modified timestamp|is(added in 3.4.6)|
|ret_code|number|API Error Code|Yes|

### Query robot map loading status
#### Request
- API number: 1022 (0x03FE)
- Name: robot_status_loadmap_req
- Description: Robot map loading status inquiry
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 FE 00 00 00 00 00 00
```
#### Response
- API number: 11022 (0x2B0E)
- Name: robot_status_loadmap_res
- Description: Response of robot map loading status inquiry
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|loadmap_status|number|0 = FAILED(Failed to load map), 1 = SUCCESS(Map loading succeeded), 2 = LOADING(Loading map)|YES|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|Error message|YES|
Note:
The map loading status (1022) is used to indicate whether the current map is loaded successfully. When the robot has just booted or the map switching operation occurs, the map loading status will be indicated as LOADING, and the relocation operation cannot be performed at this time. You must wait for the map loading status to change to SUCCESS before relocating.

### Query station info in loaded map
#### Request
- API number: 1301 (0x0515)
- Name: robot_status_station_re s
- Description: Station information of currently loaded map inquiry
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 05 15 00 00 00 00 00 00
```
#### Response
- API number: 11301 (0x2C25)
- Name: robot_status_station_res
- Description: Response of station information of currently loaded map inquiry
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|stations|array[object]|S tation array, if there are no stations in the map, it will be an empty array, see object form below|YES|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|Eerror message|YES|
The form of object in the following:
```text
{
    "id": "LM1",        // station id
    "type": "LocationMark", // Station type: LocationMark, ChargePoint ...
    "x": 1.23,          // The x coordinate (m) of the station in the world coordinate system
    "y": 4.56,          // The y coordinate (m) of the station in the world coordinate system
    "r": 1.57,          // The orientation angle (rad) of the station in the world coordinate system
    "desc": "xxxxx"     // Remarks of the station, if it is Chinese, it is Unicode encoding, such as: \u5907\u6ce8
}
```

### Query map list MD5
#### Request
- API number: 1302 (0x0516)
- Name: obot_status_mapmd5_req
- Description: Map MD5 inquiry
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|map_names|array[string]|list of map need to be queried, ensure that all the maps in the list exist in the robot|NO|
#### Request Example
```text
// {'map_names': ['default.smap']}
5A 01 00 01 00 00 00 1F 05 16 00 00 00 00 00 00
7B 22 6D 61 70 5F 6E 61 6D 65 73 22 3A 20 5B 22
64 65 66 61 75 6C 74 2E 73 6D 61 70 22 5D 7D
```
#### Response
- API number: 11302 (0x2C26)
- Name: robot_status_mapmd5_res
- Description: response of map MD5 inquiry
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|map_info|array[object]|The MD5 value and name of the map, see below for an example of the data|YES|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|Error message|YES|
#### Response Example

### Query the cost map
#### Request
- Code: 1513 (0x05E9)
- Name: robot_status_costmap_req
- Description: Query robot cost map
- JSON data area: None
#### Request example
```text
5A 01 00 00 00 00 00 00 05 E9 06 E1 00 00 00 00
```
#### Response
- Code: 11513 (0x2CF9)
- Name: robot_status_costmap_res
- Description: Response to query robot cost map
- Data Area: Serialized Message_Grid

### 3D map format
#### 1. File Format
The 3D map has a suffix of smap, which is actually a Compressed Packet containing three files:
- info.json
- 0.smap
- 0.3dsmap
Used to describe the map and its metadata. All three files should be located in the root directory of the Compressed Packet.
#### 2. Document Description
#### 1. info.json
- Type: JSON formatted text file
- Function: Store basic information of data packets
- JSON data:
|Field Name|Type|Description|Defaultable|
|---|---|---|---|
|zipName|string|20250606165847531-3D|No|
Example:
```text
{
 "zipName": "20250606165847531-3D"
}
```
#### 2. 0.smap
- Type: JSON formatted text file
- Content: 2D format map, see Appendix C: Map Format
#### 3. 0.3dsmap File
- Type: Binary file serialized by ProtoBuf
- Content: 3D Map Information
- Format: Message_Map3D
```text
syntax = "proto3";
```

### Smap map format parsing
#### 1. GitHub repository
We have stored map format description files, various map sample files, and code examples for reading and parsing maps using Protobuf (v3.6.1.3) in our public GitHub repository for your reference and testing purposes. The repository address is: https://github.com/seer-robotics/smap
#### 2. Introduction
The .smap file is a custom map file format developed by SEER Robotics. It is essentially a standard JSON format text file and is readable. You can open it using text editing software such as VS Code or Sublime Text to view the specific file contents, as shown below:
This JSON-formatted file is generated using Protobuf. In the program, the map exists in the form of Protobuf structures and is exported as JSON format only when saved as a file.
For users who wish to parse the map themselves, they can either use Protobuf or simply use JSON libraries to directly parse the map files.
For detailed information about JSON, please refer to the JSON official website , where various JSON libraries commonly used in programming languages are also listed.
Note :
- 1. The units of coordinate points in the map are in meters and will retain three or more decimal places, precise to 0.001m.
- 2. The coordinate system of the map is the world coordinate system.
#### 3. Protobuf format for maps
Please refer to the official Google documentation for Protobuf3.
Protobuf's repository address is https://github.com/protocolbuffers/protobuf

## Control ownership and configuration

### Robot control API
No readable content found in scrape for this page.

### Robot configuration API
No readable content found in scrape for this page.

### Preempt control
Note:
Preempt control
#### Request
- API number: 4005 (0x0FA5)
- Name: robot_config_lock_req
- Description: Preempt control
- JSON data area: See table below.
|Field name|Type|Description|Whether Default|
|---|---|---|---|
|nick_name|string|Control preemptor name|NO|
#### Request Example
```text
{"nick_name":"srd-seer-mizhan"}
// preemptor name is srd-seer-mizhan
5A 01 00 01 00 00 00 1F 0F A5 00 00 00 00 00 00
7B 22 6E 69 63 6B 5F 6E 61 6D 65 22 3A 22 73 72
64 2D 73 65 65 72 2D 6D 69 7A 68 61 6E 22 7D
```
#### Response
- API number: 14005 (0x36B5)
- Name: robot_config_lock_res
- Description: Response of preempt control
- JSON data area: See table below
|Field name|Type|Description|Whether default|
|---|---|---|---|
|ret_code|number|API error code|YES|

### Release control
Note:
You can only release the control that you have preempted, and you cannot release the control of others. If you want to gain control, you must preempt it.
#### Request
- API number: 4006 (0x0FA6)
- Name: robot_config_unlock_req
- Description: Release control.
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 0F A6 00 00 00 00 00 00
```
#### Response
- API number: 14006 (0x36B6)
- Name: robot_config_unlock_res
- Description: Response of releasing control
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|
|err_msg|string|Error message|YES|
#### Response Example

### Query robot parameters
#### Request
- API number: 1400 (0x0578)
- Name: robot_status_params_req
- Description: Robot parameters inquiry
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|plugin|string|The name of the plug-in. If it defaults (empty), it indicates to inquire all the parameters of all plug-ins.|YES|
|param|string|Parameter name. If plugin exists, but param defaults (empty), it means to inquire all the parameters of the plugin . Otherwise it is to inquire the specified parameters of the plugin .|YES|
#### Data Example:
Inquiring the MaxAcc parameter of the MoveFactory plug-in is shown in the following.
```text
{
 "plugin": "MoveFactory",
 "param": "MaxAcc"
}
```
#### Request Example
Omitted.
#### Response
- API number: 11400 (0x2C88)
- Name: robot_status_params_res
- Description: Response of robot parameters inquiry
- JSON data area: see below.

### Query current control owner
#### Request
- API number: 1060 (0x0424)
- Name: robot_status_current_lock_req
- Description: Robot current lock inquiry
- JSON data area: None
#### Request Example
```text
5A 01 00 01 00 00 00 00 03 EF 00 00 00 00 00 00
```
#### Response
- API number: 11060 (0x2B34)
- Name: robot_status_current_lock_res
- Description: Response of robot current lock inquiry
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|locked|boolean|Whether current control is locked|NO|
|ip|string|Control owner IP address|YES|
|port|Interger|Control owner port number|YES|
|type|uint8_t|Types of control right owner 0x00=default 0x02=roboshop 0xDD=srd|YES|
|nick_name|string|Control owner nickname|YES|
|time_t|number|Timestamp of locked control (s)|YES|
|desc|string|Description of control right owner|YES|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|

### Set robot params temporarily
Note:
Refer to Query Robot Parameters to set params.
#### Request
- API number: 4100 (0x1004)
- Name: robot_config_setparams_req
- Description: set- robot params temporarily
- JSON data area: See table below
Note:
Request data is JSON object, keys are different plugin names, values as params which need to be modified in the plugin,are JSON object.
#### Set params in NetProtocol and MoveFactory
#### Request Example
```text
{
        "NetProtocol": {
                "RobotName": "RD-TEST-1",                // robot name
                "RobotNote": "test car1"                // robot note
        },
        "MoveFactory": {
                "3DCameraHole": true                        // navigation whether to use 3D camera to detect holes
        }
}
```
#### Response
- API number: 14100 (0x3714)
- Name: robot_config_setparams_res

### Set robot params permanently
Note:
Refer to Query Robot Parameters to set params.
#### Request
- API number: 4101 (0x1005)
- Name: robot_config_saveparams_req
- Description: Set Robot Params Permanently
- JSON data area: See table below
Note:
Request data is JSON object, keys are different plugin names, values as params which need to be modified in the plugin,are JSON object.
#### Set params in NetProtocol and MoveFactory
#### Request Example
```text
{
        "NetProtocol": {
                "RobotName": "RD-TEST-1",                // robot name
                "RobotNote": "test car1"                // robot note
        },
        "MoveFactory": {
                "3DCameraHole": true                        // navigation whether to use 3D camera to detect holes
        }
}
```
#### Response
- API number: 14101 (0x3715)
- Name: robot_config_saveparams_res

### Restore robot params
Note:
Refer to Query Robot Parameters to set params which need to restore .
#### Request
- API number: 4102 (0x1006)
- Name: robot_config_reloadparams_req
- Description: restore robot params
- JSON data area: See table below
Note:
Request data is JSON object, keys are different plugin names, values as params which need to be modified in the plugin,are JSON object.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|params|string array|list of params which need to restore. If it's null, restore all params in the plugin.|YES|
|plugin|string|plugin name|YES|
#### Restore params in NetProtocol and MoveFactory
#### Request Example
```text
[
  {
    "params": [
      "RobotNote"                                        // Param name
    ],
    "plugin": "NetProtocol"                        // Plugin name
  },
  {
    "params": [
      "3DCameraHole"
```

### Configure ultrasonic
#### Request
- API number: 4130 (0x1022)
- Name: robot_config_ultrasonic_req
- Description: Configure ultrasonic.
- JSON data area: See table below.
Note :
Configure whether the ultrasonic of a certain ID is enabled.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|id|number|ID of ultrasonic|NO|
|valid|boolean|Whether to enable, false = disable, true = enable|NO|
#### Request Example
```text
5A 01 00 01 00 00 00 16 10 22 00 00 00 00 00 00
{"id":0,"valid":false}
// The hexadecimal after serialization is:
7B 22 69 64 22 3A 30 2C 22 76 61 6C 69 64 22 3A
66 61 6C 73 65 7D
```
#### Response
- API number: 14130 (0x3732)
- Name: robot_config_ultrasonic_res
- Description: Response of configuring ultrasonic

### Configure DI
#### Request
- Code: 4140 (0x102C)
- Name: robot_config_DI_req
- Description: Configuring DI
- JSON data area: see table below
Note:
Is DI enabled for configuring a certain ID?
|Field name|Type|Description|Can default|
|---|---|---|---|
|id|number|DI's id|No|
|valid|boolean|Enable or not, false = disabled, true = enabled|No|
#### Request example
```text
{
 "id":1,
 "valid":true
}
```
#### Response
- Code: 14140 (0x373C)
- Name: robot_config_DI_res
- Description: Configure the response of DI
- JSON data area: see table below
|Field name|Type|Description|Can default|
|---|---|---|---|

### Reset GNSS configuration
#### Request
- API numer: 4460 (0x116c)
- Name: robot_config_reset_gnss_req
- Descriptoin: reset GNSS configuration
- JSON data area:See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|id|string|GNSS id|YES|
#### Request Example
```text
// reset GNSS config which id is g1
// {"id":"g1"}
5A 01 00 00 00 00 00 0B 11 6C 11 6C 00 00 00 00
7B 22 69 64 22 3A 22 67 31 22 7D
```
#### Response
- API number: 14460 (0x387c)
- Name: robot_config_reset_gnss_res
- Description: response of resetting GNSS config
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|status|bool|Configuration status: Configuration failure =false configuration succeeds =true|YES|
|ret_code|number|API error code|YES|

### Set GNSS to rover mode
#### Request
- API number: 4462 (0x116e)
- Name: robot_config_set_gnss_rover_req
- Description: Set GNSS to Rover mode
- JSON data area: See table below .
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|id|string|GNSS id|YES|
#### Request Example
```text
// {"id":"g1"}
5A 01 00 00 00 00 00 0B 11 6C 11 6E 00 00 00 00
7B 22 69 64 22 3A 22 67 31 22 7D
```
#### Response
- API number: 14462 (0x387e)
- Name: robot_config_set_gnss_rover_res
- Description: R esponse to set GNSS to Rover mode .
- JSON data area:See table below .
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|status|bool|Configuration status: Configuration failure =false configuration succeeds =true|YES|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|

### Set GNSS baudrate
#### Request
- API number: 4461 (0x116d)
- Name: robot_config_set_gnss_baudrate_req
- Description: set gnss baudrate
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|id|string|GNSS id|YES|
#### Request Example
```text
// {"id":"g1"}
5A 01 00 00 00 00 00 0B 11 6C 11 6D 00 00 00 00
7B 22 69 64 22 3A 22 67 31 22 7D
```
#### Response
- API number: 14461 (0x387d)
- Name: robot_config_set_gnss_baudrate_res
- Description: response of setting gnss baudrate
- JSON data area:See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|status|bool|Configuration status: Configuration failure =false configuration succeeds =true|YES|
|ret_code|number|API error code|YES|
|create_on|string|API upload timestamp|YES|

### Set driver params
Note:
Refer to Query Driver Params to set params.
#### Request
- API number: 4400 (0x1130)
- Name: robot_config_send_canframe_req
- Description: set driver params
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|channel|uint32|port to be used, 1 or 2|YES|
|id|uint32|canid of sending messagesuch as 0x601|YES|
|dlc|uint32|data length of sending message, normally 8|YES|
|extend|bool|whether the message is extended, normally false|YES|
|data|string|message data area,such as "40 40 60 00 00 00 00 00", t he value is a hexadecimal number separated by Spaces|YES|
#### Request Example
#### Response
- API number: 14400 (0x3840)
- Name: robot_config_send_canframe_res
- Description: response of setting driver params

## Events, push, and MQTT

### Robot push API
No readable content found in scrape for this page.

### Robot push
Note:
This API is used for the robot to actively push data to the connected Client.
If there are AttributeValue Pairs in the JSON Object of the response data area that are not mentioned in the API, they can be directly ignored without needing to concern about their meanings, and this will not be repeated below.
- Number: 19301 (0x4B65)
- Name: robot_push
- Description: Robot Data Push
- JSON Data Area: See the table below
|Field Name|Type|Description|Defaultable|
|---|---|---|---|
|controller_temp|number|Controller Temperature, Unit: C|Yes|
|x|number|The x-coordinate of the robot, unit: m|Yes|
|y|number|The y-coordinate of the robot, unit: m|Yes|
|angle|number|Angle coordinate of the robot, unit: rad|Yes|
|current_station|string|ID of the nearest site to the robot. This check is strict: the robot must be very close to a site. The distance can be adjusted via the CurrentPointDist parameter, which defaults to 0.3m. If the robot is farther than this distance from all sites, this field will be an empty string. To obtain the last completed site, you can take the last element of the finished_path array. Note: In the example shown in the figure above, when the robot moves from AP1 to AP2 and gets close to AP3 in the middle, current_station will return 3.|Yes|
|vx|number|The actual speed of the robot in the x - direction of the robot coordinate system, with the unit of m/s|Yes|
|vy|number|The actual velocity of the robot in the y - direction of the robot coordinate system, with the unit of m/s|Yes|
|w|number|The actual angular velocity of the robot in the robot coordinate system (i.e., clockwise rotation is negative, counterclockwise rotation is positive), unit: rad/s|Yes|
|steer|number|Current steering wheel angle of the single steering wheel robot, unit: rad|Yes|
|blocked|boolean|Is the robot blocked?|Yes|
|battery_level|number|Robot battery level, Range [0, 1]|Yes|
|charging|boolean|Is the battery charging?|Yes|
|emergency|boolean|true indicates that the emergency stop button is in the activated state (pressed), and false indicates that the emergency stop button is in the non-activated state (pulled out)|Yes|
|DI|array[Object]|id: corresponding ID number source: source normal = normal DI virtual = virtual DI modbus = modbus DI status: indicates high or low level true = high level false = low level valid: whether the corresponding DI is enabled true = enabled false = disabled|Yes|
|DO|array[Object]|id: corresponding ID number source: source normal = normal DO modbus = modbus DO status: indicates high or low level true = high level false = low level|Yes|
|fatals|array[Object]|Alarm Code Fatal array, all occurrences of Fatal alarms will appear in the data|Yes|
|errors|array[Object]|Alarm Code Error array, all Error alarms that occur will appear in the data|Yes|
|warnings|array[Object]|Alarm Code Warning array, all occurrences of Warning alarms will appear in the data|Yes|
|notices|array[Object]|Notice array, all occurrences of Notice alarms will appear in the data|Yes|
|current_map|string|Current map name|Yes|
|vehicle_id|string|Robot Name|Yes|
|create_on|string|Timestamp (2020-10-28T14:29:32.153Z)|Yes|
|requestVoltage|double|Voltage requested for charging. These two variables are in camel case, so don't change them for now to be compatible with the old version of the program|Forklift cannot be defaulted|
|requestCurrent|double|Current requested for charging|Forklift cannot be defaulted|
|brake|boolean|Whether to brake|Yes|

### Configure robot push port
#### Request
- API number: 4091 (0x0FFB)
- Name: robot_config_push_req
- Description: Configure robot push port 19301.
- JSON data area: See table below.
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|interval|interger|Message push interval (ms)|YES|
|included_fields|array[string]|Set the fields included in the message.|YES|
|excluded_fields|array[string]|Set excluded fields in messages.|YES|
|persistent|bool|Set whether the configuration is persisted (valid after a restart)|YES|
Warning
include_fields and exclude_fields cannot be set at the same time
#### Request Example
```text
// Set interval and include_fields at the same time.
{"interval":2000,"included_fields":["vx","vy"]}
5A 01 00 01 00 00 00 2F 0F FB 00 00 00 00 00 00
7B 22 69 6E 74 65 72 76 61 6C 22 3A 32 30 30 30
2C 22 69 6E 63 6C 75 64 65 64 5F 66 69 65 6C 64
73 22 3A 5B 22 76 78 22 2C 22 76 79 22 5D 7D
```
#### Response

### Set robot push port
#### Request
- API number: 9300
- Name: robot_push_config_req
- Description: set the robot push port
- JSON data area: See table below
|Field Name|Type|Description|Whether Default|
|---|---|---|---|
|interval|Interger|interval of message sending(ms)|YES|
|included_fields|array[string]|set fields messages included|YES|
|excluded_fields|array[string]|set fields messages excluded|YES|
Warning:
include_fields and exclude_fields cannot be set simultaneously
#### Request Example
```text
// 1set interval to 2000 ms
{"interval":2000}
// 2set include_fields
{"included_fields":["vx","vy"]}
// 3) set exclude_fields
{"exclude_fields":["blocked"]}
// 4) set interval and include_fields
{"interval":2000,"included_fields":["vx","vy"]}
```
#### Response

### Upload handle custom binding event
#### Request
- Code: 4470 (0x1176)
- Name: robot_config_joystick_bind_keymap_req
- Description: Upload handle custom binding event
- JSON data area: see table below
|Field name|Type|Description|Can default|
|---|---|---|---|
|keymap|json|Display bindable events and binding results|No|
#### Request example
```text
{
  "bindListPress": { // When the button is pressed
    "B": { // Example shows only one button
      "combination": { // When used in conjunction with the LB enable key
        "action": "noBind",
        // Bind Action
        "actions": { // List, representing bindable actions
          "cancelNavigation": {
            "desc": "Cancel navigation"
          },
          "confirmLoc": {
            "desc": "Confirm location"
          },
          "gotoInitPoint": {
            "desc": "Go to init point"
          },
          "gotoNextPoint": {
            "desc": "Go to next point"
          },
          "gotoPreviousPoint": {
            "desc": "Go to previous point"
          },
          "noBind": {
            "desc": "No bind"
          },
          "pauseOrContinueNavigation": {
            "desc": "Pause or continue navigation"
          },
          "setDI": {
            "desc": "Set DI"
          }
        }
      },
```

### Status callback for join order
#### Configuration
C urrently, the status callback for join order and Reporting Completion of Action Blocks sharing the same model file for HttpPost. When making a status callback for join orders, the includedFields and failBlock do not take effect. Other configuration options behave consistently. The additionalJSON item has the highest priority and will definitely appear in the message if configured.
#### Default callback configuration ID
In the Other menu of the parameter settings, the SimpleOrderStatePosterId item represents the default ID for status change callback configurations. If it is not empty, join orders that have not been individually set with a status change callback configuration will use the configuration corresponding to this ID to report status.
#### Set the callback configuration ID when issuing join order s
When issuing join orders, add a statePoster item in JSON to set the status change callback configuration for that join order.
Example of complete order data:
If the statePoster field is not included when issuing join orders, the default callback configuration ID from the parameter settings will be used.
#### Sample response data

### MQTT
No readable content found in scrape for this page.

### MQTT subscribe (topic from request)
- topic topic
```text
function MQTTSubscribe(topic: string): string;
```
- topicstring topic
null
- 1. application-biz.yml MQTT
```text
#  MQTT
mqttConfigView:
  enable: true
  pubConfig:
    # url
    broker: tcp://broker.emqx.io:1883
    # MQTTpub
    topics:
      - Examples/1/123
    # message012
    qos: 2
    #
    clientId: RDS-Pub
    #  null
    username: null
    # , null
    password: null
    # session,falsetrue
    cleanSession: false
    # (seconds)
    connectionTimeout: 30
    # (seconds)
    keepAliveInterval: 60
    #
    automaticReconnect: true
    # Topic name
```

### MQTT subscribe (topic from config)
- topic
```text
function MQTTSubscribe(): string;
```
null
- 1. application-biz.yml MQTT
```text
#  MQTT
mqttConfigView:
 enable: true
 pubConfig:
 # url
 broker: tcp://broker.emqx.io:1883
 # MQTTpub
 topics:
 - Examples/1/123
 # message012
 qos: 2
 #
 clientId: RDS-Pub
 #  null
 username: null
 # , null
 password: null
 # session,falsetrue
 cleanSession: false
 # (seconds)
 connectionTimeout: 30
 # (seconds)
 keepAliveInterval: 60
 #
 automaticReconnect: true
 # Topic name
 retained: false
 # publishpublish
```

### MQTT publish (topic from request)
- topic
```text
function MQTTPublish(topic: string, message: string): void;
```
- topicstring topic messagestring
- topicstring topic
- messagestring
- 1. application-biz.yml MQTT
```text
#  MQTT
mqttConfigView:
  enable: true
  pubConfig:
    # url
    broker: tcp://broker.emqx.io:1883
    # MQTTpub
    topics:
      - Examples/1/123
    # message012
    qos: 2
    #
    clientId: RDS-Pub
    #  null
    username: null
    # , null
    password: null
    # session,falsetrue
    cleanSession: false
    # (seconds)
    connectionTimeout: 30
    # (seconds)
    keepAliveInterval: 60
    #
    automaticReconnect: true
    # Topic name
```

### MQTT publish (topic from config)
#### MQTT
- topic
```text
function MQTTPublish(message: string): void;
```
- messagestring
- 1. application-biz.yml MQTT
```text
#  MQTT
mqttConfigView:
  enable: true
  pubConfig:
    # url
    broker: tcp://broker.emqx.io:1883
    # MQTTpub
    topics:
      - Examples/1/123
    # message012
    qos: 2
    #
    clientId: RDS-Pub
    #  null
    username: null
    # , null
    password: null
    # session,falsetrue
    cleanSession: false
    # (seconds)
    connectionTimeout: 30
    # (seconds)
    keepAliveInterval: 60
    #
    automaticReconnect: true
    # Topic name
```

## Missing Or Empty Pages

- API (root) (EvOMwPyJZiQIbmkLvCTct64Qnrb)
- API overview (Feishu) (ACmiwbkpBilQ0bkmOR2cJ2Lenvf)
- Overview (robot API) (MiuMwbcaTiDofPkyMTRcAE9fnUf)
- Best practices (Ybz9whWDUi2nk2kepD9cYp76n1e)
- Appendix (CDGmwE5bEifjoqktKZocd8pPnZc)
- TCP/IP API (GVSPwCb0ui2GyXkOjuYcy1i9nSe)
- ModbusTcp API (MXLUwtFtSiOotckpQbxce9LynQB)
- Robot status API (BAKswyH5biNRHgk2piNcULZWnZd)
- Robot navigation API (ADDSw6LfBivhnnkMQvccu5nqnmd)
- Get scan data (GD4ywq4i9iV3rqkHBelcbgu5nBh)
- Robot control API (LIQlwZE9ZiXKGWkRicLcGNqfnic)
- Robot configuration API (ANBgwMCDJiiTiJkY3SJc6VWPnab)
- Robot push API (V0XtwaktpiQLqHkJU5YcLGFkn1c)
- MQTT (LD1CwUmdXiTwY2kc2sQcp5nJnJe)
