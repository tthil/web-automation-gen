/**
 * Session List Component
 * Manages the list of saved sessions, providing filtering, search, and CRUD operations
 */
class SessionListManager {
  constructor() {
    // DOM Elements
    this.sessionsList = document.getElementById('sessionsList');
    this.categoryFilter = document.getElementById('categoryFilter');
    this.sessionSearch = document.getElementById('sessionSearch');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.sortSessionsBtn = document.getElementById('sortSessionsBtn');
    
    // State
    this.sessions = [];
    this.filteredSessions = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.sortOrder = 'desc'; // 'desc' = newest first
    this.selectedSessionId = null;
    
    // Initialize the component
    this.init();
  }
  
  /**
   * Initialize the component
   */
  init() {
    this.bindEvents();
    this.loadSessions();
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Filter change
    this.categoryFilter.addEventListener('change', () => {
      this.currentFilter = this.categoryFilter.value;
      this.filterAndRenderSessions();
      this.announceForScreenReaders(`Sessions filtered by ${this.currentFilter === 'all' ? 'all categories' : this.currentFilter || 'uncategorized'}`);
    });
    
    // Search input
    this.sessionSearch.addEventListener('input', () => {
      this.searchTerm = this.sessionSearch.value;
      this.filterAndRenderSessions();
    });
    
    // Clear search
    this.clearSearchBtn.addEventListener('click', () => {
      this.sessionSearch.value = '';
      this.searchTerm = '';
      this.filterAndRenderSessions();
      this.announceForScreenReaders('Search cleared');
    });
    
    // Sort order toggle
    this.sortSessionsBtn.addEventListener('click', () => {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      this.filterAndRenderSessions();
      
      // Update sort button icon
      const icon = this.sortSessionsBtn.querySelector('i');
      if (this.sortOrder === 'asc') {
        icon.className = 'fas fa-sort-alpha-up';
        this.announceForScreenReaders('Sorted oldest first');
      } else {
        icon.className = 'fas fa-sort-alpha-down';
        this.announceForScreenReaders('Sorted newest first');
      }
    });
    
    // Global events that should be handled
    document.addEventListener('session:created', () => this.loadSessions());
    document.addEventListener('session:updated', () => this.loadSessions());
    document.addEventListener('session:deleted', () => this.loadSessions());
  }
  
  /**
   * Load sessions from the server
   */
  async loadSessions() {
    try {
      // Show loading state
      this.sessionsList.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading sessions...</div>';
      
      const response = await fetch('/api/sessions');
      
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status}`);
      }
      
      const data = await response.json();
      this.sessions = data.sessions || [];
      
      // Update category filter options
      this.updateCategoryOptions();
      
      // Filter, sort, and render sessions
      this.filterAndRenderSessions();
      
      // Announce for screen readers
      this.announceForScreenReaders(`${this.sessions.length} sessions loaded`);
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.sessionsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Failed to load sessions</div>';
      this.showToast('Failed to load sessions', 'error');
    }
  }
  
  /**
   * Update category filter options based on available categories in sessions
   */
  updateCategoryOptions() {
    // Keep the first two default options: "All Categories" and "Uncategorized"
    const defaultOptions = [
      { value: 'all', label: 'All Categories' },
      { value: '', label: 'Uncategorized' }
    ];
    
    // Extract unique categories from sessions
    const categories = [...new Set(
      this.sessions
        .filter(session => session.category)
        .map(session => session.category)
    )].sort();
    
    // Combine default options with found categories
    const options = [
      ...defaultOptions,
      ...categories.map(category => ({ value: category, label: category }))
    ];
    
    // Get current selected value to preserve selection if possible
    const currentValue = this.categoryFilter.value;
    
    // Clear and rebuild the select options
    this.categoryFilter.innerHTML = '';
    
    // Add the options to the select element
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      this.categoryFilter.appendChild(optionElement);
    });
    
    // Try to restore the previous selection if it exists in the new options
    if (options.some(opt => opt.value === currentValue)) {
      this.categoryFilter.value = currentValue;
    } else {
      this.categoryFilter.value = 'all';
      this.currentFilter = 'all';
    }
  }
  
  /**
   * Filter and render sessions based on current filter and search term
   */
  filterAndRenderSessions() {
    // Apply category filter
    let filtered = this.sessions;
    
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(session => {
        if (this.currentFilter === '') {
          // Special case for "Uncategorized"
          return !session.category;
        }
        return session.category === this.currentFilter;
      });
    }
    
    // Apply search term
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(session => {
        return (
          session.name.toLowerCase().includes(searchTermLower) ||
          (session.description && session.description.toLowerCase().includes(searchTermLower)) ||
          (session.url && session.url.toLowerCase().includes(searchTermLower)) ||
          (session.category && session.category.toLowerCase().includes(searchTermLower))
        );
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at);
      const dateB = new Date(b.createdAt || b.created_at);
      
      if (this.sortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
    
    this.filteredSessions = filtered;
    this.renderSessionsList(filtered);
  }
  
  /**
   * Render the sessions list
   * @param {Array} sessions - The sessions to render
   */
  renderSessionsList(sessions) {
    // Clear existing content
    this.sessionsList.innerHTML = '';
    
    if (!sessions || sessions.length === 0) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'no-sessions';
      emptyState.innerHTML = `
        <i class="fas fa-folder-open"></i>
        <p>No sessions available</p>
      `;
      this.sessionsList.appendChild(emptyState);
      return;
    }
    
    // Create session cards for each session
    sessions.forEach(session => {
      const sessionCard = this.createSessionCard(session);
      this.sessionsList.appendChild(sessionCard);
    });
  }
  
  /**
   * Create a session card element
   * @param {Object} session - The session data
   * @returns {HTMLElement} The session card element
   */
  createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-card';
    card.dataset.sessionId = session.id;
    
    // Add selected class if this is the selected session
    if (session.id === this.selectedSessionId) {
      card.classList.add('selected');
    }
    
    // Format date
    const createdAt = new Date(session.createdAt || session.created_at);
    const formattedDate = createdAt.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const connectionQuality = this.getConnectionQuality(session);
    
    card.innerHTML = `
      <div class="session-header">
        <div class="session-title">${this.escapeHtml(session.name || 'Unnamed Session')}</div>
        ${session.category ? `<div class="session-category">${this.escapeHtml(session.category)}</div>` : ''}
      </div>
      <div class="session-body">
        ${session.url ? `
          <div class="session-url">
            <i class="fas fa-link"></i>
            ${this.escapeHtml(session.url)}
          </div>
        ` : ''}
        <div class="session-date">
          <i class="far fa-calendar-alt"></i>
          ${formattedDate}
        </div>
        ${session.description ? `
          <div class="session-description">
            ${this.escapeHtml(session.description)}
          </div>
        ` : ''}
        ${connectionQuality ? `
          <div class="session-connection ${connectionQuality.class}">
            <div class="connection-dot"></div>
            ${connectionQuality.label}
          </div>
        ` : ''}
      </div>
      <div class="session-footer">
        <button class="session-button replay" data-action="replay" aria-label="Replay ${session.name}">
          <i class="fas fa-play"></i> Replay
        </button>
        <button class="session-button edit" data-action="edit" aria-label="Edit ${session.name}">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="session-button view" data-action="view" aria-label="View details for ${session.name}">
          <i class="fas fa-info-circle"></i> Details
        </button>
        <button class="session-button delete" data-action="delete" aria-label="Delete ${session.name}">
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      </div>
    `;
    
    // Add event listeners to the card
    this.addCardEventListeners(card, session);
    
    return card;
  }
  
  /**
   * Add event listeners to a session card
   * @param {HTMLElement} card - The card element
   * @param {Object} session - The session data
   */
  addCardEventListeners(card, session) {
    // Handle card selection
    card.addEventListener('click', (e) => {
      // Don't select if clicking on a button
      if (e.target.closest('button')) {
        return;
      }
      
      this.selectSession(session.id);
    });
    
    // Action buttons
    const buttons = card.querySelectorAll('.session-button');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const action = button.dataset.action;
        this.handleSessionAction(action, session);
      });
    });
  }
  
  /**
   * Handle a session action (replay, edit, delete)
   * @param {string} action - The action to perform
   * @param {Object} session - The session data
   */
  handleSessionAction(action, session) {
    switch (action) {
      case 'replay':
        this.replaySession(session);
        break;
      case 'edit':
        this.editSession(session);
        break;
      case 'view':
        this.viewSessionDetails(session);
        break;
      case 'delete':
        this.confirmDeleteSession(session);
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  }
  
  /**
   * Select a session
   * @param {string} sessionId - The ID of the session to select
   */
  selectSession(sessionId) {
    // Deselect previous selection
    const previousSelected = this.sessionsList.querySelector('.session-card.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }
    
    // Select new session if not already selected
    if (this.selectedSessionId !== sessionId) {
      this.selectedSessionId = sessionId;
      const newSelected = this.sessionsList.querySelector(`.session-card[data-session-id="${sessionId}"]`);
      if (newSelected) {
        newSelected.classList.add('selected');
      }
      
      // Dispatch selection event
      const session = this.sessions.find(s => s.id === sessionId);
      if (session) {
        const event = new CustomEvent('session:selected', { detail: session });
        document.dispatchEvent(event);
        this.announceForScreenReaders(`Selected session: ${session.name}`);
      }
    } else {
      // Deselect if clicked again
      this.selectedSessionId = null;
    }
  }
  
  /**
   * Replay a session
   * @param {Object} session - The session to replay
   */
  replaySession(session) {
    // Trigger replay event
    const event = new CustomEvent('session:replay', { detail: session });
    document.dispatchEvent(event);
    
    this.showToast(`Replaying session: ${session.name}`, 'success');
    this.announceForScreenReaders(`Started replaying session: ${session.name}`);
  }
  
  /**
   * Edit a session
   * @param {Object} session - The session to edit
   */
  editSession(session) {
    // Trigger edit event
    const event = new CustomEvent('session:edit', { detail: session });
    document.dispatchEvent(event);
  }
  
  /**
   * View detailed metrics for a session
   * @param {Object} session - The session to view
   */
  viewSessionDetails(session) {
    // Trigger view details event
    const event = new CustomEvent('session:view-details', { detail: session });
    document.dispatchEvent(event);
    
    // If connection metrics module is available, open metrics modal
    if (typeof openConnectionMetrics === 'function') {
      openConnectionMetrics(session.id);
    }
  }
  
  /**
   * Confirm and delete a session
   * @param {Object} session - The session to delete
   */
  confirmDeleteSession(session) {
    if (confirm(`Are you sure you want to delete the session "${session.name}"? This cannot be undone.`)) {
      this.deleteSession(session.id);
    }
  }
  
  /**
   * Delete a session
   * @param {string} sessionId - The ID of the session to delete
   */
  async deleteSession(sessionId) {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }
      
      // Remove from local array and update UI
      this.sessions = this.sessions.filter(s => s.id !== sessionId);
      
      // If the deleted session was selected, clear the selection
      if (this.selectedSessionId === sessionId) {
        this.selectedSessionId = null;
      }
      
      // Refilter and render
      this.filterAndRenderSessions();
      
      // Trigger deleted event
      const event = new CustomEvent('session:deleted', { detail: { sessionId } });
      document.dispatchEvent(event);
      
      this.showToast('Session deleted successfully', 'success');
      this.announceForScreenReaders('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      this.showToast('Failed to delete session', 'error');
    }
  }
  
  /**
   * Get connection quality indicator based on session metrics
   * @param {Object} session - The session data
   * @returns {Object|null} Connection quality object or null
   */
  getConnectionQuality(session) {
    // If no connection metrics or events, return null
    if (!session.connectionMetrics) {
      return null;
    }
    
    const metrics = session.connectionMetrics;
    
    // Determine connection quality based on metrics
    if (metrics.disconnectionCount === 0 && metrics.qualityScore >= 90) {
      return { class: 'connection-good', label: 'Good Connection' };
    } else if (metrics.disconnectionCount <= 2 && metrics.qualityScore >= 70) {
      return { class: 'connection-warning', label: 'Fair Connection' };
    } else if (metrics.disconnectionCount > 2 || metrics.qualityScore < 70) {
      return { class: 'connection-poor', label: 'Poor Connection' };
    }
    
    return null;
  }
  
  /**
   * Escape HTML special characters
   * @param {string} html - The HTML to escape
   * @returns {string} The escaped HTML
   */
  escapeHtml(html) {
    if (!html) return '';
    
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  
  /**
   * Show a toast notification
   * @param {string} message - The message to show
   * @param {string} type - The notification type
   */
  showToast(message, type = 'info') {
    // Dispatch toast event for the main app to handle
    const event = new CustomEvent('app:show-toast', { 
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Announce a message for screen readers
   * @param {string} message - The message to announce
   */
  announceForScreenReaders(message) {
    if (typeof window.announceToScreenReader === 'function') {
      window.announceToScreenReader(message);
    }
  }
}

// Initialize the session list manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sessionListManager = new SessionListManager();
});
