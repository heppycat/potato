// app.js - Focus Tracker - Mobile Optimized

// ==================== DATA LAYER ====================

const STORAGE_KEY = 'focus_activity_v1';
const DURATION_KEY = 'focus_timer_duration_minutes';

/**
 * Load activity data from localStorage
 * @returns {Object} Activity data object
 */
function loadActivityData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

/**
 * Save activity data to localStorage
 * @param {Object} data - Activity data to save
 */
function saveActivityData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Reset all activity data
 */
function resetActivityData() {
    if (confirm('Reset all activity data? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        const activityData = {};
        renderYearCalendar(activityData);
        saveActivityData(activityData);
        showToast('All activity data has been reset');
    }
}

/**
 * Load timer duration from localStorage
 * @returns {number} Timer duration in minutes
 */
function loadTimerDuration() {
    const duration = localStorage.getItem(DURATION_KEY);
    return duration ? parseInt(duration, 10) : 40; // Default 40 minutes
}

/**
 * Save timer duration to localStorage
 * @param {number} minutes - Duration in minutes
 */
function saveTimerDuration(minutes) {
    localStorage.setItem(DURATION_KEY, String(minutes));
}

/**
 * Validate duration input
 * @param {string} value - Input value
 * @returns {number|null} Valid minutes or null
 */
function validateDurationInput(value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 240) { // 1 minute to 4 hours
        return null;
    }
    return num;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * @returns {string} Today's date
 */
function getTodayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Increment today's loop count by 1
 * @returns {Object} Updated activity data
 */
function incrementToday() {
    const data = loadActivityData();
    const today = getTodayISO();
    data[today] = (data[today] || 0) + 1;
    saveActivityData(data);
    return data;
}

// ==================== UI HELPERS ====================

/**
 * Show a temporary toast message
 * @param {string} message - Message to display
 */
function showToast(message) {
    // Remove existing toast
    const existingToast = document.getElementById('app-toast');
    if (existingToast) existingToast.remove();
    
    // Create toast
    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 12px 20px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-color);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-size: 0.9rem;
        animation: slideUp 0.3s ease;
        white-space: nowrap;
        max-width: 90vw;
        text-align: center;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// Add CSS for toast animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(100%); opacity: 0; }
    }
`;
document.head.appendChild(toastStyles);

// ==================== TIMER LAYER ====================

let timerInterval = null;
let totalDuration = loadTimerDuration() * 60; // in seconds
let remainingTime = totalDuration;
let startTime = null;
let isRunning = false;
let isEditing = false;

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

/**
 * Format seconds to MM:SS display
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format minutes to editable display
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted minutes
 */
function formatEditableTime(minutes) {
    return `${String(minutes).padStart(2, '0')}:00`;
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    if (isEditing) {
        // Show editable format (MM:00)
        const minutes = Math.floor(remainingTime / 60);
        timerDisplay.textContent = formatEditableTime(minutes);
    } else {
        // Show normal countdown format (MM:SS)
        timerDisplay.textContent = formatTime(remainingTime);
    }
}

/**
 * Calculate remaining time based on timestamp
 */
function updateRemainingTime() {
    if (!startTime || !isRunning) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const newRemaining = Math.max(0, totalDuration - elapsedSeconds);
    
    remainingTime = newRemaining;
    updateTimerDisplay();
    
    if (remainingTime <= 0) {
        handleTimerComplete();
    }
}

/**
 * Start editing timer duration
 */
function startEditingDuration() {
    if (isRunning || isEditing) return;
    
    isEditing = true;
    timerDisplay.classList.add('editing');
    timerDisplay.contentEditable = true;
    
    // Show minutes only (no seconds)
    updateTimerDisplay();
    
    // Focus and select text
    setTimeout(() => {
        timerDisplay.focus();
        const range = document.createRange();
        range.selectNodeContents(timerDisplay);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }, 10);
    
    // Vibrate on mobile if supported
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

/**
 * Stop editing timer duration
 */
function stopEditingDuration() {
    if (!isEditing) return;
    
    isEditing = false;
    timerDisplay.classList.remove('editing');
    timerDisplay.contentEditable = false;
    
    // Parse the new duration
    const text = timerDisplay.textContent.trim();
    const colonIndex = text.indexOf(':');
    const minutesStr = colonIndex !== -1 ? text.substring(0, colonIndex) : text;
    const minutes = validateDurationInput(minutesStr);
    
    if (minutes !== null && minutes !== Math.floor(totalDuration / 60)) {
        // Duration changed
        totalDuration = minutes * 60;
        remainingTime = totalDuration;
        saveTimerDuration(minutes);
        showToast(`Timer set to ${minutes} minutes`);
    }
    
    // Reset timer display to normal format
    updateTimerDisplay();
}

/**
 * Handle timer display click for editing
 */
function handleTimerDisplayClick() {
    if (!isRunning) {
        startEditingDuration();
    }
}

/**
 * Handle keyboard events for editing
 */
function handleTimerDisplayKeydown(e) {
    if (!isEditing) return;
    
    if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        stopEditingDuration();
    }
}

/**
 * Start the timer
 */
function startTimer() {
    if (isRunning || isEditing) return;
    
    isRunning = true;
    startTime = Date.now() - ((totalDuration - remainingTime) * 1000);
    
    timerInterval = setInterval(updateRemainingTime, 100);
    updateTimerDisplay();
    startBtn.disabled = true;
    
    // Vibrate feedback
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
    }
}

/**
 * Pause the timer
 */
function pauseTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;
    
    // Update remaining time one last time
    updateRemainingTime();
    startBtn.disabled = false;
    
    // Vibrate feedback
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
}

/**
 * Reset the timer to current duration
 */
function resetTimer() {
    if (isEditing) return;
    
    pauseTimer();
    remainingTime = totalDuration;
    updateTimerDisplay();
    startBtn.disabled = false;
    
    // Vibrate feedback
    if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
    }
}

/**
 * Handle timer completion (00:00)
 */
function handleTimerComplete() {
    // Stop the timer
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    
    // Provide visual and haptic feedback
    timerDisplay.style.transform = 'scale(1.1)';
    timerDisplay.style.color = '#39d353';
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    setTimeout(() => {
        timerDisplay.style.transform = 'scale(1)';
        timerDisplay.style.color = '';
    }, 300);
    
    // Update data
    const updatedData = incrementToday();
    
    // Update heatmap
    updateTodayCell(updatedData);
    
    // Show completion message
    showToast('Focus session completed! ✓');
    
    // Reset timer
    setTimeout(() => {
        remainingTime = totalDuration;
        updateTimerDisplay();
        startBtn.disabled = false;
    }, 500);
}

// ==================== CALENDAR HEATMAP LAYER ====================

const YEAR = 2026;
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get number of days in a month
 * @param {number} month - Month (0-11)
 * @returns {number} Days in month
 */
function getDaysInMonth(month) {
    // February check (accounting for leap year - 2026 is not a leap year)
    if (month === 1) return 28;
    
    // Months with 30 days: April, June, September, November
    if ([3, 5, 8, 10].includes(month)) return 30;
    
    // All others have 31 days
    return 31;
}

/**
 * Get day of week for first day of month (0 = Sunday, 1 = Monday, etc.)
 * @param {number} month - Month (0-11)
 * @returns {number} Day of week
 */
function getFirstDayOfWeek(month) {
    return new Date(YEAR, month, 1).getDay();
}

/**
 * Get intensity class based on loop count
 * @param {number} count - Loop count
 * @returns {string} CSS class name
 */
function getIntensityClass(count) {
    if (!count || count === 0) return 'empty';
    if (count === 1) return 'level-1';
    if (count <= 3) return 'level-2';
    if (count <= 5) return 'level-3';
    return 'level-4';
}

/**
 * Format date to YYYY-MM-DD
 * @param {number} month - Month (0-11)
 * @param {number} day - Day of month
 * @returns {string} Formatted date
 */
function formatDate(month, day) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${YEAR}-${monthStr}-${dayStr}`;
}

/**
 * Create calendar grid for a month
 * @param {number} month - Month index (0-11)
 * @param {Object} activityData - Activity data
 */
function renderMonthCalendar(month, activityData) {
    const monthContainer = document.createElement('div');
    monthContainer.className = 'month-container';
    monthContainer.dataset.month = month;
    monthContainer.dataset.year = YEAR;
    
    // Month label
    const monthLabel = document.createElement('div');
    monthLabel.className = 'month-label';
    monthLabel.textContent = MONTH_NAMES[month];
    monthContainer.appendChild(monthLabel);
    
    // Month grid
    const monthGrid = document.createElement('div');
    monthGrid.className = 'month-grid';
    
    const daysInMonth = getDaysInMonth(month);
    const firstDay = getFirstDayOfWeek(month);
    
    // Create empty padding cells for days before the 1st
    // Using Monday-first calendar (0 = Monday, 6 = Sunday)
    let startOffset = firstDay === 0 ? 6 : firstDay - 1; // Convert to Monday-first
    
    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty-padding';
        monthGrid.appendChild(emptyCell);
    }
    
    // Create cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        const dateStr = formatDate(month, day);
        const count = activityData[dateStr] || 0;
        
        cell.dataset.date = dateStr;
        cell.dataset.count = count;
        cell.classList.add(getIntensityClass(count));
        
        // Add tooltip on desktop, tap feedback on mobile
        if ('ontouchstart' in window) {
            cell.addEventListener('click', () => {
                if (count > 0) {
                    showToast(`${dateStr}: ${count} focus session${count !== 1 ? 's' : ''}`);
                } else {
                    showToast(`${dateStr}: No activity`);
                }
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(30);
            });
        } else {
            if (count > 0) {
                cell.title = `${dateStr}: ${count} session${count !== 1 ? 's' : ''}`;
            } else {
                cell.title = `${dateStr}: No activity`;
            }
        }
        
        monthGrid.appendChild(cell);
    }
    
    monthContainer.appendChild(monthGrid);
    return monthContainer;
}

/**
 * Render the entire year calendar
 * @param {Object} activityData - Activity data
 */
function renderYearCalendar(activityData) {
    const heatmapCalendar = document.getElementById('heatmap-calendar');
    heatmapCalendar.innerHTML = '';
    
    // Render each month
    for (let month = 0; month < 12; month++) {
        const monthElement = renderMonthCalendar(month, activityData);
        heatmapCalendar.appendChild(monthElement);
    }
}

/**
 * Update today's cell only
 * @param {Object} activityData - Updated activity data
 */
function updateTodayCell(activityData) {
    const today = getTodayISO();
    
    // Check if today is in 2026
    if (!today.startsWith('2026-')) return;
    
    // Find today's cell
    const todayCell = document.querySelector(`.calendar-cell[data-date="${today}"]`);
    if (todayCell) {
        const count = activityData[today] || 0;
        todayCell.dataset.count = count;
        
        // Remove existing intensity classes
        todayCell.classList.remove('empty', 'level-1', 'level-2', 'level-3', 'level-4');
        
        // Add correct intensity class
        todayCell.classList.add(getIntensityClass(count));
    }
}

/**
 * Check for midnight rollover
 */
function checkMidnightRollover() {
    const lastCheckDate = localStorage.getItem('last_check_date') || getTodayISO();
    const today = getTodayISO();
    
    if (lastCheckDate !== today) {
        // Day has changed, reload heatmap to show today as new day
        localStorage.setItem('last_check_date', today);
        const activityData = loadActivityData();
        renderYearCalendar(activityData);
        showToast('New day! Good morning 🌅');
    }
}

// ==================== DEMO FUNCTIONS ====================

/**
 * Generate demo data for showcasing
 */
function generateDemoData() {
    const data = {};
    
    // Create realistic patterns
    for (let month = 0; month < 12; month++) {
        const daysInMonth = getDaysInMonth(month);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(YEAR, month, day);
            const dayOfWeek = date.getDay();
            const dateStr = formatDate(month, day);
            
            // Realistic activity patterns
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekdays
                // More activity mid-week
                if (dayOfWeek === 2 || dayOfWeek === 3) { // Tue, Wed
                    data[dateStr] = Math.random() < 0.8 ? 2 + Math.floor(Math.random() * 4) : 0;
                } else { // Mon, Thu, Fri
                    data[dateStr] = Math.random() < 0.7 ? 1 + Math.floor(Math.random() * 3) : 0;
                }
            } else { // Weekends
                data[dateStr] = Math.random() < 0.3 ? 1 : 0;
            }
            
            // Add some streaks
            if (month === 2 && day >= 10 && day <= 20) { // March streak
                data[dateStr] = 4 + Math.floor(Math.random() * 3);
            }
            if (month === 6 && day >= 5 && day <= 15) { // July streak
                data[dateStr] = 5 + Math.floor(Math.random() * 3);
            }
            
            // Recent days have activity
            const today = new Date();
            const demoDate = new Date(YEAR, month, day);
            const diffDays = Math.floor((today - demoDate) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
                data[dateStr] = 2 + Math.floor(Math.random() * 4);
            }
        }
    }
    
    return data;
}

/**
 * Load demo data
 */
function loadDemoData() {
    if (confirm('Load demo data with realistic patterns? This will overwrite your current data.')) {
        const demoData = generateDemoData();
        saveActivityData(demoData);
        renderYearCalendar(demoData);
        showToast('Demo data loaded! Check March & July for streaks');
        
        // Scroll to show demo patterns
        setTimeout(() => {
            const heatmap = document.getElementById('heatmap-calendar');
            if (heatmap) {
                heatmap.scrollLeft = 180; // Scroll to March
            }
        }, 500);
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Timer buttons
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    // Timer display editing
    timerDisplay.addEventListener('click', handleTimerDisplayClick);
    timerDisplay.addEventListener('keydown', handleTimerDisplayKeydown);
    
    // Stop editing when clicking outside
    document.addEventListener('click', (e) => {
        if (isEditing && e.target !== timerDisplay) {
            stopEditingDuration();
        }
    });
    
    // Handle tab visibility change
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isRunning) {
            updateRemainingTime();
        }
    });
    
    // Handle mobile keyboard dismissal
    timerDisplay.addEventListener('blur', stopEditingDuration);
}

// ==================== INITIALIZATION ====================

/**
 * Setup button event handlers
 */
function setupButtons() {
    const resetHeatmapBtn = document.getElementById('reset-heatmap-btn');
    const demoBtn = document.getElementById('demo-btn');
    
    if (resetHeatmapBtn) {
        resetHeatmapBtn.addEventListener('click', resetActivityData);
    }
    
    if (demoBtn) {
        demoBtn.addEventListener('click', loadDemoData);
    }
}

/**
 * Initialize the application
 */
function init() {
    // Load data
    const activityData = loadActivityData();
    
    // Load timer duration
    totalDuration = loadTimerDuration() * 60;
    remainingTime = totalDuration;
    
    // Setup UI
    updateTimerDisplay();
    renderYearCalendar(activityData);
    setupEventListeners();
    setupButtons();
    
    // Set initial midnight check date
    localStorage.setItem('last_check_date', getTodayISO());
    
    // Check for midnight every minute
    setInterval(checkMidnightRollover, 60000);
    
    // Add PWA installation prompt for mobile
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .catch(err => console.log('ServiceWorker registration failed: ', err));
        });
    }
    
    // Show welcome message on first visit
    if (!localStorage.getItem('welcome_shown')) {
        setTimeout(() => {
            showToast('Welcome! Tap timer to edit duration, tap days for details');
            localStorage.setItem('welcome_shown', 'true');
        }, 1000);
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
