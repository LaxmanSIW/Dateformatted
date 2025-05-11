/**
 * Date Formatter Module
 * Provides various date formatting options
 */

// Standalone date formatter function
function formatDate(date = new Date(), formatStr) {
    // Define format tokens with exact case matching
    const formatTokens = {
        // Year tokens
        'YYYY': date.getFullYear(),
        'YY': date.getFullYear().toString().slice(-2),
        
        // Month tokens
        'MMMM': ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()],
        'MMM': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()],
        'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
        'M': date.getMonth() + 1,
        
        // Day tokens
        'DDDD': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()],
        'DDD': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        'DD': date.getDate().toString().padStart(2, '0'),
        'D': date.getDate(),
        
        // Hour tokens (24-hour)
        'HH': date.getHours().toString().padStart(2, '0'),
        'H': date.getHours(),
        
        // Hour tokens (12-hour)
        'hh': (date.getHours() % 12 || 12).toString().padStart(2, '0'),
        'h': date.getHours() % 12 || 12,
        
        // Minute tokens
        'mm': date.getMinutes().toString().padStart(2, '0'),
        'm': date.getMinutes(),
        
        // Second tokens
        'ss': date.getSeconds().toString().padStart(2, '0'),
        's': date.getSeconds(),
        
        // AM/PM tokens
        'A': date.getHours() >= 12 ? 'PM' : 'AM',
        'a': date.getHours() >= 12 ? 'pm' : 'am'
    };

    let result = '';
    let i = 0;
    
    while (i < formatStr.length) {
        // Look for opening brace
        if (formatStr[i] === '{') {
            let tokenStart = i + 1;
            let tokenEnd = tokenStart;
            
            // Find closing brace
            while (tokenEnd < formatStr.length && formatStr[tokenEnd] !== '}') {
                tokenEnd++;
            }
            
            if (tokenEnd < formatStr.length) {
                // Extract token exactly as it appears
                const token = formatStr.slice(tokenStart, tokenEnd).trim();
                
                // Handle empty token
                if (!token) {
                    result += 'NA';
                    i = tokenEnd + 1;
                    continue;
                }

                // Direct token lookup - no case conversion
                const value = formatTokens[token];
                if (value !== undefined) {
                    result += value;
                } else {
                    result += 'NA';
                }
                
                i = tokenEnd + 1; // Move past closing brace
            } else {
                // No closing brace found, add everything as is
                result += formatStr.slice(i);
                break;
            }
        } else {
            // Non-token character, add as is
            result += formatStr[i];
            i++;
        }
    }

    return result;
}

// Test cases to verify case sensitivity
const testDate = new Date(2025, 4, 11, 14, 30, 0); // May 11, 2025, 14:30:00

console.log('\nTesting case sensitivity:');
console.log('24-hour format {HH}:{mm} =>', formatDate(testDate, '{HH}:{mm}')); // Should be "14:30"
console.log('12-hour format {hh}:{mm} =>', formatDate(testDate, '{hh}:{mm}')); // Should be "02:30"
console.log('Lowercase {hh} vs uppercase {HH}:', 
    formatDate(testDate, '{hh} vs {HH}')); // Should be "02 vs 14"

console.log('\nTesting invalid case variations:');
console.log('Wrong case {Hh}:{Mm} =>', formatDate(testDate, '{Hh}:{Mm}')); // Should be "NA:NA"
console.log('Wrong case {MMMM} vs {mmmm} =>', 
    formatDate(testDate, '{MMMM} vs {mmmm}')); // Should be "May vs NA"

console.log('\nComplex format with exact case:');
console.log('[{DDDD}, {MMMM} {DD}, {YYYY} @ {hh}:{mm}:{ss} {A}] =>', 
    formatDate(testDate, '[{DDDD}, {MMMM} {DD}, {YYYY} @ {hh}:{mm}:{ss} {A}]'));

module.exports = formatDate;