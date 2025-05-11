# Event Scheduler System

A JavaScript-based event scheduling system that calculates estimated start and end times for events based on enabler jobs, predecessor events, and current time.

## Features

- Schedule events with dependencies and time constraints
- Manage enabler jobs that control when events can start
- Track actual and estimated start/end times
- Handle cross-job dependencies
- Generate detailed reports of event schedules
- Calculate average times for events

## Installation

```bash
npm install event-scheduler-system  # Coming soon
```

For now, you can directly include the `scheduler_code.js` file in your project:

```javascript
const { EventScheduler } = require('./scheduler_code.js');
```

## Basic Usage

### Creating a Scheduler

```javascript
// Initialize with current time or a specific date
const currentDate = new Date();
const scheduler = new EventScheduler(currentDate);
```

### Adding Enabler Jobs

Enabler jobs are prerequisites that control when events can start.

```javascript
scheduler.addEnablerJob(
    'job1',                    // Unique ID for the job
    { hours: 10, minutes: 27 }, // Average start time
    9                          // Scheduled hour (24-hour format)
);
```

### Adding Events

Events can be added with or without dependencies on other events.

```javascript
scheduler.addEvent(
    'event1',                  // Unique ID for the event
    'job1',                    // Associated enabler job ID
    { hours: 8, minutes: 12 }, // Average start time
    { hours: 8, minutes: 19 }, // Average end time
    { hours: 0, minutes: 7, seconds: 0 }, // Duration
    null,                      // Actual start time (optional)
    null,                      // Actual end time (optional)
    []                         // Predecessor event IDs (optional)
);
```

### Managing Event Times

Update actual event times:

```javascript
scheduler.updateEventActualTimes(
    'event1',
    new Date(), // actualStart
    new Date()  // actualEnd
);
```

Get event times:

```javascript
// Get actual times
const actualTimes = scheduler.getEventActualTimes('event1');

// Get estimated times
const estimatedTimes = scheduler.getEventEstimatedTimes('event1');
```

### Refreshing Estimates

```javascript
// Refresh with current settings
scheduler.refreshEstimatedTimes();

// Refresh with a new date
const newDate = new Date();
scheduler.refreshEstimatedTimes(newDate);

// Force recalculation of enabler times
scheduler.refreshEstimatedTimes(null, true);
```

### Generating Reports

```javascript
// Get a detailed report of all events and jobs
const report = scheduler.getDetailedReport();

// Get all events with their estimated times
const events = scheduler.getEventsWithEstimatedTimes();

// Get average times for all events
const avgTimes = scheduler.getEventsAverageTimes();
```

## Advanced Usage

### Event Dependencies

Events can depend on other events using the predecessors array:

```javascript
// Event that depends on event1
scheduler.addEvent(
    'event2',
    'job1',
    { hours: 11, minutes: 0 },
    { hours: 11, minutes: 15 },
    { hours: 0, minutes: 15, seconds: 0 },
    null,
    null,
    ['event1'] // This event will start after event1 completes
);
```

### Cross-Job Dependencies

Events can depend on events from different enabler jobs:

```javascript
scheduler.addEvent(
    'event4',
    'job2',
    { hours: 16, minutes: 0 },
    { hours: 16, minutes: 5 },
    { hours: 0, minutes: 5, seconds: 0 },
    null,
    null,
    ['event3', 'event2'] // Dependencies from different jobs
);
```

## Data Structures

### Enabler Job Object

```javascript
{
    id: string,
    avgStart: { hours: number, minutes: number },
    scheduleTime: number,
    events: string[],
    estimatedStart: Date
}
```

### Event Object

```javascript
{
    id: string,
    enablerJobId: string,
    avgStart: { hours: number, minutes: number },
    avgEnd: { hours: number, minutes: number },
    duration: { hours: number, minutes: number, seconds: number },
    actualStart: Date | null,
    actualEnd: Date | null,
    predecessors: string[],
    estimatedStart: Date | null,
    estimatedEnd: Date | null
}
```

## Error Handling

The system includes basic error handling:

- Throws an error when adding an event with non-existent enabler job
- Warns when accessing non-existent events
- Detects and handles circular dependencies in event predecessors

## Notes

- All times are handled in 24-hour format
- Dates are handled using JavaScript's native Date object
- The system automatically adjusts schedules to prevent events from being scheduled in the past
- Events with actual times will use those times instead of calculating estimates

## Examples

See the `runExample()` function in the source code for a complete working example of the scheduler system in action.