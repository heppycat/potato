// app.js - Focus Tracker - Calendar Heatmap 2026 with Editable Timer and Reset

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
    if (confirm('Are you sure you want to reset ALL activity data? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        const activityData = {};
        renderYearCalendar(activityData);
        saveActivityData(activityData);
        alert('All activity data has been reset.');
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
    timerDisplay.contentEditable = true;
    timerDisplay.style.cursor = 'text';
    timerDisplay.style.border = '1px solid #30363d';
    timerDisplay.style.padding = '4px';
    timerDisplay.style.borderRadius = '4px';
    
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
}

/**
 * Stop editing timer duration
 */
function stopEditingDuration() {
    if (!isEditing) return;
    
    isEditing = false;
    timerDisplay.contentEditable = false;
    timerDisplay.style.cursor = 'default';
    timerDisplay.style.border = 'none';
    timerDisplay.style.padding = '0';
    
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
    
    if (e.key === 'Enter') {
        e.preventDefault();
        stopEditingDuration();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        isEditing = false;
        timerDisplay.contentEditable = false;
        timerDisplay.style.cursor = 'default';
        timerDisplay.style.border = 'none';
        timerDisplay.style.padding = '0';
        updateTimerDisplay();
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
}

/**
 * Handle timer completion (00:00)
 */
function handleTimerComplete() {
    // Stop the timer
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    
    // Provide subtle visual feedback
    timerDisplay.style.transform = 'scale(1.1)';
    timerDisplay.style.color = '#39d353';
    setTimeout(() => {
        timerDisplay.style.transform = 'scale(1)';
        timerDisplay.style.color = '';
    }, 300);
    
    // Update data
    const updatedData = incrementToday();
    
    // Update heatmap
    updateTodayCell(updatedData);
    
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
    const monthContainer = document.querySelector(`.month-container[data-month="${month}"]`);
    if (!monthContainer) return;
    
    const monthGrid = monthContainer.querySelector('.month-grid');
    monthGrid.innerHTML = '';
    
    const daysInMonth = getDaysInMonth(month);
    const firstDay = getFirstDayOfWeek(month);
    
    // Create empty padding cells for days before the 1st
    // Using Monday-first calendar (0 = Monday, 6 = Sunday)
    // We need to convert from Sunday-first (getDay()) to Monday-first
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
        
        // Add tooltip
        if (count > 0) {
            cell.title = `${dateStr}: ${count} loop${count !== 1 ? 's' : ''}`;
        } else {
            cell.title = `${dateStr}: No activity`;
        }
        
        monthGrid.appendChild(cell);
    }
}

/**
 * Render the entire year calendar
 * @param {Object} activityData - Activity data
 */
function renderYearCalendar(activityData) {
    // Render each month
    for (let month = 0; month < 12; month++) {
        renderMonthCalendar(month, activityData);
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
        
        // Update tooltip
        if (count > 0) {
            todayCell.title = `${today}: ${count} loop${count !== 1 ? 's' : ''}`;
        } else {
            todayCell.title = `${today}: No activity`;
        }
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
    }
}

// ==================== RESET UI ====================

/**
 * Add reset button to the UI
 */
function addResetButton() {
    // Check if reset button already exists
    if (document.getElementById('reset-heatmap-btn')) return;
    
    const timerControls = document.getElementById('timer-controls');
    
    // Create reset button
    const resetHeatmapBtn = document.createElement('button');
    resetHeatmapBtn.id = 'reset-heatmap-btn';
    resetHeatmapBtn.textContent = 'Reset Heatmap';
    resetHeatmapBtn.style.marginLeft = '16px';
    resetHeatmapBtn.style.backgroundColor = '#da3633';
    resetHeatmapBtn.style.color = 'white';
    resetHeatmapBtn.style.border = '1px solid #30363d';
    resetHeatmapBtn.style.borderRadius = '6px';
    resetHeatmapBtn.style.padding = '8px 16px';
    resetHeatmapBtn.style.fontSize = '1rem';
    resetHeatmapBtn.style.fontWeight = '500';
    resetHeatmapBtn.style.cursor = 'pointer';
    resetHeatmapBtn.style.transition = 'all 250ms ease';
    
    // Add hover effect
    resetHeatmapBtn.addEventListener('mouseenter', () => {
        resetHeatmapBtn.style.backgroundColor = '#f85149';
        resetHeatmapBtn.style.transform = 'translateY(-1px)';
    });
    
    resetHeatmapBtn.addEventListener('mouseleave', () => {
        resetHeatmapBtn.style.backgroundColor = '#da3633';
        resetHeatmapBtn.style.transform = 'translateY(0)';
    });
    
    // Add click event
    resetHeatmapBtn.addEventListener('click', resetActivityData);
    
    // Add to UI
    timerControls.appendChild(resetHeatmapBtn);
}

// ==================== EVENT LISTENERS ====================

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Timer display click for editing
timerDisplay.addEventListener('click', handleTimerDisplayClick);

// Keyboard events for editing
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
        // Update timer when tab becomes visible again
        updateRemainingTime();
    }
});

// Check for midnight every minute
setInterval(checkMidnightRollover, 60000);

// ==================== INITIALIZATION ====================

/**
 * Initialize the application
 */
function init() {
    // Load activity data
    const activityData = loadActivityData();
    
    // Load timer duration
    totalDuration = loadTimerDuration() * 60;
    remainingTime = totalDuration;
    
    // Initialize timer display
    updateTimerDisplay();
    
    // Render year calendar
    renderYearCalendar(activityData);
    
    // Add reset button
    addResetButton();
    
    // Set initial midnight check date
    localStorage.setItem('last_check_date', getTodayISO());
}

// Start the app
init();
