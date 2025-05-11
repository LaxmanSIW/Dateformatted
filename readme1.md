# JavaScript Utilities

This repository contains two powerful JavaScript utility modules for handling dates, times, and event scheduling.

## 1. Date Formatter Module

A lightweight date formatting utility that supports customizable tokens within curly braces.

### Features
- Case-sensitive token support
- Custom date/time formats
- 12/24-hour time formats
- Month/Day names (full and abbreviated)
- Smart error handling

### Basic Usage
```javascript
const formatDate = require('./dateFormatter.js');
const date = new Date(2025, 4, 11, 14, 30, 0);

// Basic date formatting
formatDate(date, '{YYYY}-{MM}-{DD}');     // "2025-05-11"
formatDate(date, '{hh}:{mm} {A}');        // "02:30 PM"
```

### Available Tokens
| Token | Output | Example |
|-------|---------|---------|
| {YYYY} | Full year | 2025 |
| {YY} | Short year | 25 |
| {MMMM} | Full month | May |
| {MMM} | Short month | May |
| {MM} | Padded month | 05 |
| {M} | Month number | 5 |
| {DDDD} | Full day name | Sunday |
| {DDD} | Short day name | Sun |
| {DD} | Padded day | 11 |
| {D} | Day number | 11 |
| {HH} | 24h padded hour | 14 |
| {H} | 24h hour | 14 |
| {hh} | 12h padded hour | 02 |
| {h} | 12h hour | 2 |
| {mm} | Padded minutes | 30 |
| {m} | Minutes | 30 |
| {ss} | Padded seconds | 00 |
| {s} | Seconds | 0 |
| {A} | Upper meridiem | PM |
| {a} | Lower meridiem | pm |

## 2. Event Scheduler Module

A robust event scheduling system that manages events, their dependencies, and timing calculations.

### Features
- Event dependency management
- Enabler job scheduling
- Average time calculations
- Actual vs. estimated time tracking
- Cross-job dependencies
- Detailed reporting

### Basic Usage
```javascript
const { EventScheduler } = require('./scheduler_code.js');

// Initialize scheduler
const scheduler = new EventScheduler(new Date());

// Add an enabler job
scheduler.addEnablerJob('job1', 
    { hours: 10, minutes: 27 }, // Average start time
    9,                         // Scheduled hour (24-hour format)
    0                         // Days to add (0 = today, 1 = tomorrow, etc.)
);

// Add an event
scheduler.addEvent(
    'event1',                  // Event ID
    'job1',                    // Enabler job ID
    { hours: 8, minutes: 12 }, // Average start
    { hours: 8, minutes: 19 }, // Average end
    { hours: 0, minutes: 7 },  // Duration
    null,                      // Actual start (optional)
    null,                      // Actual end (optional)
    []                         // Predecessor events
);
```

### Key Concepts

1. **Enabler Jobs**
   - Base jobs that enable events to start
   - Have scheduled and average start times
   - Support scheduling for future days using `addDays` parameter
   - Can have multiple associated events

2. **Events**
   - Belong to enabler jobs
   - Have average start/end times
   - Can have predecessors
   - Track actual and estimated times

3. **Dependencies**
   - Events can depend on other events
   - Cross-job dependencies supported
   - Prevents circular dependencies

### Main Operations

1. **Adding Components**
   ```javascript
   // Add enabler job
   scheduler.addEnablerJob(id, avgStart, scheduleTime, addDays);
   // Example: Schedule job for tomorrow
   scheduler.addEnablerJob('job1', { hours: 9, minutes: 0 }, 8, 1);
   
   // Add event
   scheduler.addEvent(id, enablerJobId, avgStart, avgEnd, duration, 
                     actualStart, actualEnd, predecessors);
   ```

2. **Time Management**
   ```javascript
   // Update actual times
   scheduler.updateEventActualTimes(eventId, actualStart, actualEnd);
   
   // Refresh estimates
   scheduler.refreshEstimatedTimes(newDate, forceRecalculate);
   ```

3. **Reporting**
   ```javascript
   // Get detailed report
   const report = scheduler.getDetailedReport();
   
   // Get event times
   const actualTimes = scheduler.getEventActualTimes(eventId);
   const estimatedTimes = scheduler.getEventEstimatedTimes(eventId);
   ```

### Error Handling

Both modules include robust error handling:

- Date Formatter:
  - Invalid tokens return "NA"
  - Unclosed braces preserved as-is
  - Case-sensitive validation

- Event Scheduler:
  - Validates enabler job existence
  - Checks for circular dependencies
  - Handles missing predecessor events

## Installation

1. Clone the repository
2. Include the needed modules:
```javascript
const formatDate = require('./dateFormatter.js');
const { EventScheduler } = require('./scheduler_code.js');
```

## Examples

### Date Formatting
```javascript
const date = new Date(2025, 4, 11, 14, 30, 0);

// Basic formats
formatDate(date, '{YYYY}-{MM}-{DD}');           // "2025-05-11"
formatDate(date, 'Time: {hh}:{mm} {A}');        // "Time: 02:30 PM"

// Complex format
formatDate(date, '[{DDDD}, {MMMM} {DD}, {YYYY} @ {hh}:{mm}:{ss} {A}]');
// "[Sunday, May 11, 2025 @ 02:30:00 PM]"
```

### Event Scheduling
```javascript
const scheduler = new EventScheduler(new Date());

// Set up jobs and events
// Schedule a job for today (addDays = 0)
scheduler.addEnablerJob('job1', { hours: 9, minutes: 0 }, 8, 0);
// Schedule a job for tomorrow (addDays = 1)
scheduler.addEnablerJob('job2', { hours: 14, minutes: 0 }, 12, 1);
// Schedule a job for the day after tomorrow (addDays = 2)
scheduler.addEnablerJob('job3', { hours: 8, minutes: 0 }, 7, 2);

// Add an event
scheduler.addEvent('event1', 'job1', 
    { hours: 9, minutes: 30 }, 
    { hours: 10, minutes: 0 },
    { hours: 0, minutes: 30 }
);

// Get schedule report
const report = scheduler.getDetailedReport();
```

## License

This project is available under the MIT License.
