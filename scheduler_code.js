/**
 * Event Scheduler System
 * Calculates estimated start and end times for events based on enabler jobs,
 * predecessor events, and current time.
 */

class EventScheduler {
    constructor(cycleDate = new Date()) {
      this.cycleDate = cycleDate; // Date for scheduling cycle
      this.systemDate = new Date(); // Actual current system date
      this.enablerJobs = new Map(); // Map of enabler job ID to enabler job object
      this.events = new Map(); // Map of event ID to event object
      this.enablerAvgTimesCalculated = false; // Flag to track if enabler average times have been calculated
    }
    
    /**
     * Add an enabler job to the system
     * @param {string} id - Unique identifier for the enabler job
     * @param {Object} avgStart - Average start time {hours, minutes}
     * @param {number} scheduleTime - Hour when the job is scheduled to run (24-hour format)
     */
    addEnablerJob(id, avgStart, scheduleTime) {
      this.enablerJobs.set(id, {
        id,
        avgStart,
        scheduleTime,
        events: [], // List of event IDs associated with this enabler job
        estimatedStart: null // Will be calculated later
      });
      // Reset the flag since we've added a new enabler job
      this.enablerAvgTimesCalculated = false;
    }
    
    /**
     * Add an event to the system
     * @param {string} id - Unique identifier for the event
     * @param {string} enablerJobId - ID of the associated enabler job
     * @param {Object} avgStart - Average start time {hours, minutes}
     * @param {Object} avgEnd - Average end time {hours, minutes}
     * @param {Object} duration - Duration {hours, minutes, seconds}
     * @param {Date|null} actualStart - Actual start time if available
     * @param {Date|null} actualEnd - Actual end time if available
     * @param {Array<string>} predecessors - Array of event IDs that are predecessors
     */
    addEvent(id, enablerJobId, avgStart, avgEnd, duration, actualStart = null, actualEnd = null, predecessors = []) {
      if (!this.enablerJobs.has(enablerJobId)) {
        throw new Error(`Enabler job ${enablerJobId} does not exist`);
      }
      
      const event = {
        id,
        enablerJobId,
        avgStart,
        avgEnd,
        duration,
        actualStart,
        actualEnd,
        predecessors,
        estimatedStart: null,
        estimatedEnd: null
      };
      
      this.events.set(id, event);
      this.enablerJobs.get(enablerJobId).events.push(id);
    }
    
    /**
     * Update actual start and end times for a specific event
     * @param {string} eventId - ID of the event to update
     * @param {Date|null} actualStart - Actual start time
     * @param {Date|null} actualEnd - Actual end time
     * @returns {boolean} - True if the event was updated, false if not found
     */
    updateEventActualTimes(eventId, actualStart, actualEnd) {
      if (!this.events.has(eventId)) {
        console.warn(`Event ${eventId} not found`);
        return false;
      }
      
      const event = this.events.get(eventId);
      event.actualStart = actualStart;
      event.actualEnd = actualEnd;
      
      // No need to recalculate enabler jobs times when updating event actual times
      return true;
    }
    
    /**
     * Get actual start and end times for a specific event
     * @param {string} eventId - ID of the event
     * @returns {Object|null} - Object containing actualStart and actualEnd, or null if event not found
     */
    getEventActualTimes(eventId) {
      if (!this.events.has(eventId)) {
        console.warn(`Event ${eventId} not found`);
        return null;
      }
      
      const event = this.events.get(eventId);
      return {
        id: eventId,
        actualStart: event.actualStart,
        actualEnd: event.actualEnd
      };
    }
    
    /**
     * Get estimated start and end times for a specific event
     * @param {string} eventId - ID of the event
     * @returns {Object|null} - Object containing estimatedStart and estimatedEnd, or null if event not found
     */
    getEventEstimatedTimes(eventId) {
      if (!this.events.has(eventId)) {
        console.warn(`Event ${eventId} not found`);
        return null;
      }
      
      const event = this.events.get(eventId);
      return {
        id: eventId,
        estimatedStart: event.estimatedStart,
        estimatedEnd: event.estimatedEnd
      };
    }
    
    /**
     * Get average times for events based on current date only (independent of current time)
     * This calculates when events would run based on their average times and the current date,
     * without considering the current time constraints
     * @returns {Object} - Map of event IDs to their average time objects
     */
    getEventsAverageTimes() {
      const result = {};
      const today = new Date(this.cycleDate);
      today.setHours(0, 0, 0, 0);
      
      // First, calculate enabler job average times once
      const enablerAvgTimes = new Map();
      for (const [jobId, job] of this.enablerJobs.entries()) {
        const enablerAvgStart = new Date(today);
        enablerAvgStart.setHours(job.avgStart.hours, job.avgStart.minutes, 0, 0);
        
        const scheduleTime = new Date(today);
        scheduleTime.setHours(job.scheduleTime, 0, 0, 0);
        
        // If enabler's average start is earlier than its schedule time, it's for the next day
        if (enablerAvgStart < scheduleTime) {
          enablerAvgStart.setDate(enablerAvgStart.getDate() + 1);
        }
        
        enablerAvgTimes.set(jobId, enablerAvgStart);
      }
      
      // Now process all events using the cached enabler times
      for (const [id, event] of this.events.entries()) {
        const enablerAvgStart = enablerAvgTimes.get(event.enablerJobId);
        
        // Calculate event's average start and end times
        const eventAvgStart = new Date(today);
        eventAvgStart.setHours(event.avgStart.hours, event.avgStart.minutes, 0, 0);
        
        const eventAvgEnd = new Date(today);
        eventAvgEnd.setHours(event.avgEnd.hours, event.avgEnd.minutes, 0, 0);
        
        // If event's average start is earlier than enabler's average start, it's for the next day
        if (event.predecessors.length === 0 && eventAvgStart < enablerAvgStart) {
          eventAvgStart.setDate(eventAvgStart.getDate() + 1);
          eventAvgEnd.setDate(eventAvgEnd.getDate() + 1);
        }
        
        // For events with predecessors, we would need to consider their average end times
        // but we'll simplify this for now to just report the raw average times
        
        result[id] = {
          avgStart: eventAvgStart,
          avgEnd: eventAvgEnd,
          enablerAvgStart: enablerAvgStart
        };
      }
      
      return result;
    }
    
    /**
     * Refresh all estimated times based on current actual times and cycle date
     * @param {Date} [newCycleDate=null] - Optional new cycle date to use
     * @param {boolean} [forceRecalculateEnablerTimes=false] - Force recalculation of enabler times
     */
    refreshEstimatedTimes(newCycleDate = null, forceRecalculateEnablerTimes = false) {
      // Update system date to current time
      this.systemDate = new Date();
      
      // Update cycle date if provided
      if (newCycleDate) {
        this.cycleDate = newCycleDate;
        // If date changes, we need to recalculate enabler times
        this.enablerAvgTimesCalculated = false;
      }
      
      // If forcing recalculation or enabler times aren't calculated yet
      if (forceRecalculateEnablerTimes) {
        this.enablerAvgTimesCalculated = false;
      }
      
      // Recalculate all estimated times
      this.calculateEstimatedTimes();
    }
    
    /**
     * Calculate estimated times for all events
     */
    calculateEstimatedTimes() {
      // First, calculate enabler job start times if not already calculated
      // or after date change
      if (!this.enablerAvgTimesCalculated) {
        for (const [id, job] of this.enablerJobs.entries()) {
          job.estimatedStart = this._calculateEnablerJobStartTime(job);
        }
        this.enablerAvgTimesCalculated = true;
      }
      
      // Then, calculate event times in a topological order
      const visitedEvents = new Set();
      const allEvents = Array.from(this.events.keys());
      
      // Process events without predecessors first, then those with predecessors
      while (visitedEvents.size < this.events.size) {
        let progress = false;
        
        for (const eventId of allEvents) {
          if (visitedEvents.has(eventId)) continue;
          
          const event = this.events.get(eventId);
          const allPredsVisited = event.predecessors.every(predId => 
            !this.events.has(predId) || visitedEvents.has(predId)
          );
          
          if (allPredsVisited) {
            this._calculateEventEstimatedTimes(event);
            visitedEvents.add(eventId);
            progress = true;
          }
        }
        
        if (!progress) {
          // If we didn't make progress in this iteration, there might be a cycle
          console.warn("Possible cycle in event dependencies. Breaking calculation.");
          
          // Process remaining events even if their predecessors aren't all processed
          for (const eventId of allEvents) {
            if (!visitedEvents.has(eventId)) {
              const event = this.events.get(eventId);
              this._calculateEventEstimatedTimes(event);
              visitedEvents.add(eventId);
            }
          }
          break;
        }
      }
    }
    
    /**
     * Calculate the estimated start time for an enabler job
     * @param {Object} job - The enabler job
     * @returns {Date} - Estimated start time
     */
    _calculateEnablerJobStartTime(job) {
      const cycleDay = new Date(this.cycleDate);
      cycleDay.setHours(0, 0, 0, 0);
      
      const avgStartTime = new Date(cycleDay);
      avgStartTime.setHours(job.avgStart.hours, job.avgStart.minutes, 0, 0);
      
      const scheduleTime = new Date(cycleDay);
      scheduleTime.setHours(job.scheduleTime, 0, 0, 0);
      
      // If average start time is earlier than schedule time, it must be for the next day
      if (avgStartTime < scheduleTime) {
        avgStartTime.setDate(avgStartTime.getDate() + 1);
      }
      
      // If the calculated time is before the cycle date, use cycle date
      if (avgStartTime < this.cycleDate) {
        return new Date(this.cycleDate);
      }
      
      return avgStartTime;
    }
    
    /**
     * Calculate estimated start and end times for an event
     * @param {Object} event - The event
     */
    _calculateEventEstimatedTimes(event) {
      // If actual times exist, use them instead of calculating estimates
      if (event.actualStart && event.actualEnd) {
        event.estimatedStart = new Date(event.actualStart);
        event.estimatedEnd = new Date(event.actualEnd);
        return;
      }
      
      const enablerJob = this.enablerJobs.get(event.enablerJobId);
      const enablerStartTime = enablerJob.estimatedStart;
      
      // Get the maximum end time of all predecessors
      let maxPredEndTime = null;
      if (event.predecessors.length > 0) {
        for (const predId of event.predecessors) {
          if (!this.events.has(predId)) continue;
          
          const pred = this.events.get(predId);
          const predEndTime = pred.actualEnd || pred.estimatedEnd;
          
          if (predEndTime && (!maxPredEndTime || predEndTime > maxPredEndTime)) {
            maxPredEndTime = new Date(predEndTime);
          }
        }
      }
      
      // Create base date for cycle day
      const cycleDay = new Date(this.cycleDate);
      cycleDay.setHours(0, 0, 0, 0);
      
      // Calculate event's average times based on cycle date
      const eventAvgStart = new Date(cycleDay);
      eventAvgStart.setHours(event.avgStart.hours, event.avgStart.minutes, 0, 0);
      
      // Determine the preliminary estimated start time
      let estimatedStart;
      
      if (event.predecessors.length === 0) {
        // For events without predecessors, they can start after the enabler job
        if (eventAvgStart < enablerStartTime) {
          // Average time is before enabler job, so schedule for tomorrow
          estimatedStart = new Date(eventAvgStart);
          estimatedStart.setDate(estimatedStart.getDate() + 1);
        } else {
          // Average time is after enabler job, so can use that
          estimatedStart = new Date(eventAvgStart);
        }
      } else {
        // Events with predecessors should start after the latest predecessor
        if (maxPredEndTime) {
          estimatedStart = new Date(Math.max(eventAvgStart.getTime(), maxPredEndTime.getTime()));
        } else {
          // If there are no valid predecessor end times, use enabler start time
          estimatedStart = new Date(Math.max(eventAvgStart.getTime(), enablerStartTime.getTime()));
        }
      }
      
      // Make sure we don't schedule anything before the cycle date
      if (estimatedStart < this.cycleDate) {
        estimatedStart = new Date(this.cycleDate);
      }
      
      // Calculate the estimated end time
      const durationMs = 
        (event.duration.hours * 60 * 60 * 1000) + 
        (event.duration.minutes * 60 * 1000) + 
        (event.duration.seconds * 1000);
      
      const estimatedEnd = new Date(estimatedStart.getTime() + durationMs);
      
      event.estimatedStart = estimatedStart;
      event.estimatedEnd = estimatedEnd;
    }
    
    /**
     * Get all events with their estimated times
     * @returns {Array} - Array of events with estimated times
     */
    getEventsWithEstimatedTimes() {
      const result = [];
      for (const event of this.events.values()) {
        result.push({
          id: event.id,
          enablerJobId: event.enablerJobId,
          estimatedStart: event.estimatedStart,
          estimatedEnd: event.estimatedEnd,
          actualStart: event.actualStart,
          actualEnd: event.actualEnd,
          predecessors: event.predecessors
        });
      }
      return result;
    }
    
    /**
     * Get detailed report of all events with their times
     * @returns {Object} - Structured report of enabler jobs and events
     */
    getDetailedReport() {
      const report = {
        systemTime: this.systemDate.toISOString(),
        cycleTime: this.cycleDate.toISOString(),
        enablerJobs: {},
        events: {}
      };
      
      for (const [id, job] of this.enablerJobs.entries()) {
        report.enablerJobs[id] = {
          avgStart: `${job.avgStart.hours}:${job.avgStart.minutes.toString().padStart(2, '0')}`,
          scheduleTime: job.scheduleTime,
          estimatedStart: job.estimatedStart ? job.estimatedStart.toISOString() : null,
          events: job.events
        };
      }
      
      for (const [id, event] of this.events.entries()) {
        report.events[id] = {
          enablerJobId: event.enablerJobId,
          avgStart: `${event.avgStart.hours}:${event.avgStart.minutes.toString().padStart(2, '0')}`,
          avgEnd: `${event.avgEnd.hours}:${event.avgEnd.minutes.toString().padStart(2, '0')}`,
          duration: `${event.duration.hours}h ${event.duration.minutes}m ${event.duration.seconds}s`,
          predecessors: event.predecessors,
          actualStart: event.actualStart ? event.actualStart.toISOString() : null,
          actualEnd: event.actualEnd ? event.actualEnd.toISOString() : null, 
          estimatedStart: event.estimatedStart ? event.estimatedStart.toISOString() : null,
          estimatedEnd: event.estimatedEnd ? event.estimatedEnd.toISOString() : null
        };
      }
      
      return report;
    }
  }
  
  // Example usage
  function runExample() {
    // Create scheduler with current time set to 9:30 AM
    const currentDate = new Date();
    currentDate.setHours(9, 30, 0, 0);
    const scheduler = new EventScheduler(currentDate);
    
    // Add enabler jobs
    scheduler.addEnablerJob('job1', { hours: 10, minutes: 27 }, 9); // Average start 10:27 AM, scheduled for 9 AM
    scheduler.addEnablerJob('job2', { hours: 14, minutes: 0 }, 12); // Average start 2 PM, scheduled for 12 PM
    
    // Add events for job1
    scheduler.addEvent('event1', 'job1', 
      { hours: 8, minutes: 12 }, // avg start
      { hours: 8, minutes: 19 }, // avg end
      { hours: 0, minutes: 7, seconds: 0 }, // duration
      null, null, [] // actual start, actual end, predecessors
    );
    
    scheduler.addEvent('event2', 'job1', 
      { hours: 11, minutes: 0 }, 
      { hours: 11, minutes: 15 },
      { hours: 0, minutes: 15, seconds: 0 }, 
      null, null, ['event1'] // depends on event1
    );
    
    // Add events for job2
    scheduler.addEvent('event3', 'job2', 
      { hours: 15, minutes: 0 }, 
      { hours: 15, minutes: 30 },
      { hours: 0, minutes: 30, seconds: 0 }, 
      null, null, []
    );
    
    scheduler.addEvent('event4', 'job2', 
      { hours: 16, minutes: 0 }, 
      { hours: 16, minutes: 5 },
      { hours: 0, minutes: 5, seconds: 0 }, 
      null, null, ['event3', 'event2'] // cross-job dependency
    );
    
    // Event with actual times already set
    const actualStartDate = new Date(currentDate);
    actualStartDate.setHours(9, 0, 0, 0);
    const actualEndDate = new Date(currentDate);
    actualEndDate.setHours(9, 10, 0, 0);
    
    scheduler.addEvent('event5', 'job1', 
      { hours: 12, minutes: 0 }, 
      { hours: 12, minutes: 10 },
      { hours: 0, minutes: 10, seconds: 0 }, 
      actualStartDate, actualEndDate, []
    );
    
    // Calculate all estimated times
    scheduler.calculateEstimatedTimes();
    
    // Example of updating actual times and refreshing estimates
    console.log("Initial scheduling:");
    console.log(JSON.stringify(scheduler.getDetailedReport(), null, 2));
    
    // Update actual times for event1
    const event1ActualStart = new Date(currentDate);
    event1ActualStart.setHours(10, 0, 0, 0);
    const event1ActualEnd = new Date(currentDate);
    event1ActualEnd.setHours(10, 10, 0, 0);
    scheduler.updateEventActualTimes('event1', event1ActualStart, event1ActualEnd);
    
    // Refresh estimated times - note we're not forcing enabler recalculation
    scheduler.refreshEstimatedTimes();
    
    console.log("\nAfter updating event1 actual times:");
    console.log(JSON.stringify(scheduler.getDetailedReport(), null, 2));
    
    // Example of updating with a different date - this will trigger enabler recalculation
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    console.log("\nRefreshing with new date (next day):");
    scheduler.refreshEstimatedTimes(nextDay);
    console.log(JSON.stringify(scheduler.getDetailedReport(), null, 2));
    
    // Force enabler recalculation even without date change
    console.log("\nForcing enabler recalculation:");
    scheduler.refreshEstimatedTimes(null, true);
    
    // Example of getting actual times for an event
    const event1Times = scheduler.getEventActualTimes('event1');
    console.log("\nActual times for event1:");
    console.log(JSON.stringify(event1Times, null, 2));
    
    // Example of getting estimated times for an event
    const event2Times = scheduler.getEventEstimatedTimes('event2');
    console.log("\nEstimated times for event2:");
    console.log(JSON.stringify(event2Times, null, 2));
    
    // Example of getting average times for all events (independent of current time)
    console.log("\nAverage times for all events (based only on date):");
    const avgTimes = scheduler.getEventsAverageTimes();
    
    // Format the average times for better readability
    const formattedAvgTimes = {};
    for (const [eventId, timeObj] of Object.entries(avgTimes)) {
      formattedAvgTimes[eventId] = {
        avgStart: timeObj.avgStart.toISOString(),
        avgEnd: timeObj.avgEnd.toISOString(),
        enablerAvgStart: timeObj.enablerAvgStart.toISOString()
      };
    }
    console.log(JSON.stringify(formattedAvgTimes, null, 2));
    
    // Return the final report
    return scheduler.getDetailedReport();
  }
  
  // Run the example and print the report
  const report = runExample();
  console.log("Final Complete Report:");
  console.log(JSON.stringify(report, null, 2));

  // Export the class for use in other modules
  module.exports = { EventScheduler };
