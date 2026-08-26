/**
 * Simple structured logger for latency instrumentation
 */
export function createLatencyLogger(serviceName) {
    return {
        /**
         * Log latency information in JSON format
         * @param {string} eventName - Name of the event being logged
         * @param {Object} additionalData - Additional data to include in the log
         */
        log(eventName, additionalData = {}) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                service: serviceName,
                event: eventName,
                ...additionalData
            };
            console.log(JSON.stringify(logEntry));
        }
    };
}