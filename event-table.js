class EventTable {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    this.tableData = data;
    this.sortField = null;
    this.sortAsc = true;
    this.filters = {};
    this.filterPopups = {};
    
    this.columnDefs = [
      { field: 'event', label: 'Event Name', type: 'string', visible: true },
      { field: 'avgTime', label: 'Average Time', type: 'date', visible: true },
      { field: 'estTime', label: 'Estimated Time', type: 'date', visible: true },
      { field: 'type', label: 'Type', type: 'enum', values: ['Batch', 'Report', 'Sync', 'Backup'], visible: true },
      { field: 'status', label: 'Status', type: 'enum', values: ['Completed', 'Pending', 'Failed'], visible: true },
      { field: 'priority', label: 'Priority', type: 'enum', values: ['High', 'Medium', 'Low'], visible: true },
      { field: 'onTime', label: 'Completed On Time?', type: 'enum', values: ['On Time', 'Delay'], visible: true },
    ];

    this.init();
  }

  init() {
    this.setupTable();
    this.setupEventListeners();
    this.render();
  }

  setupTable() {
    // Create table structure
    this.container.innerHTML = `
      <div class="evt-container">
        <h1 class="evt-title">Event Status Dashboard</h1>
        <button class="evt-reset-filters-btn" id="resetFiltersBtn">Reset Filters</button>
        <div class="evt-column-panel-toggle" id="columnPanelToggle">
          <svg class="evt-three-dot" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="19" cy="12" r="2"/>
          </svg>
        </div>        <div class="evt-column-panel collapsed" id="columnPanel">
          <div class="evt-column-panel-content">
            <h2 class="evt-column-panel-header">
              Column Visibility
              <div class="evt-column-panel-close" id="columnPanelClose">
                <svg viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="19" cy="12" r="2"/>
                </svg>
              </div>
            </h2>
            <ul class="evt-column-panel-list" id="columnList"></ul>
          </div>
        </div>
        <div class="evt-table-responsive">
          <table class="evt-table" id="event-table">
            <thead>
              <tr></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;

    // Render column list
    this.renderColumnPanel();
  }

  formatDateTime(dt) {
    if (!dt) return '';
    const d = new Date(dt.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dt;
    return d.toISOString().slice(0,16).replace('T',' ');
  }

  createFilterPopup(field) {
    const popup = document.createElement('div');
    popup.className = 'evt-filter-popup';
    const col = this.columnDefs.find(c => c.field === field);
      let html = `<label>${col.label}</label>`;
    if (col.type === 'enum') {
      html += `<select class="evt-filter-input"><option value="">All</option>
        ${col.values.map(v => `<option value="${v}">${v}</option>`).join('')}
      </select>`;
    } else if (col.type === 'date') {
      html += `
        <input type="datetime-local" class="evt-filter-from" placeholder="From">
        <input type="datetime-local" class="evt-filter-to" placeholder="To">
      `;
    } else {
      html += `<input type="text" class="evt-filter-input" placeholder="Filter ${col.label}...">`;
    }
    
    html += `<div class="evt-filter-actions">
      <button type="button" class="evt-apply-btn">Apply</button>
      <button type="button" class="evt-clear-btn">Clear</button>
    </div>`;
    
    popup.innerHTML = html;
      popup.innerHTML = html;

    // Add event listeners for the filter controls
    const applyBtn = popup.querySelector('.evt-apply-btn');
    const clearBtn = popup.querySelector('.evt-clear-btn');
    
    applyBtn.onclick = () => {
      if (col.type === 'date') {
        const fromDate = popup.querySelector('.evt-filter-from').value;
        const toDate = popup.querySelector('.evt-filter-to').value;
        if (fromDate || toDate) {
          this.filters[field] = { from: fromDate, to: toDate };
        }
      } else {
        const value = popup.querySelector('.evt-filter-input').value;
        if (value) {
          this.filters[field] = value;
        }
      }
      this.render();
      popup.classList.remove('active');
    };
    
    clearBtn.onclick = () => {
      delete this.filters[field];
      if (col.type === 'date') {
        popup.querySelector('.evt-filter-from').value = '';
        popup.querySelector('.evt-filter-to').value = '';
      } else {
        popup.querySelector('.evt-filter-input').value = '';
      }
      this.render();
      popup.classList.remove('active');
    };
    return popup;
  }

  setupEventListeners() {    // Close popups when clicking outside
    document.addEventListener('click', (e) => {
      // If clicking outside both filter popup and gear icon
      if (!e.target.closest('.evt-filter-popup') && !e.target.closest('.evt-header-gear')) {
        Object.values(this.filterPopups).forEach(popup => {
          popup.classList.remove('active');
        });
      }
      
      // If clicking outside column panel and its toggle
      if (!e.target.closest('#columnPanel') && !e.target.closest('#columnPanelToggle')) {
        columnPanel.classList.add('collapsed');
      }
    });

    // Reset filters button
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
      this.filters = {};
      this.render();
    });
    const columnPanelToggle = document.getElementById('columnPanelToggle');
    const columnPanel = document.getElementById('columnPanel');
    
    columnPanelToggle.onclick = (e) => {
      e.stopPropagation();
      columnPanel.classList.remove('collapsed');
    };

    // Add click handler for column panel close button
    const columnPanelClose = document.getElementById('columnPanelClose');
    columnPanelClose.onclick = (e) => {
      e.stopPropagation();
      columnPanel.classList.add('collapsed');
    };

    // Close column panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#columnPanel') && !e.target.closest('#columnPanelToggle')) {
        columnPanel.classList.add('collapsed');
      }
    });
  }
  closeAllPopups() {
    // Close filter popups
    Object.values(this.filterPopups).forEach(popup => {
      popup.classList.remove('active');
    });
    
    // Close column panel
    const columnPanel = document.getElementById('columnPanel');
    if (columnPanel) {
      columnPanel.classList.add('collapsed');
    }
  }

  render() {
    this.renderHeaders();
    this.renderBody();
  }

  renderHeaders() {
    const thead = document.querySelector('#event-table thead tr');
    thead.innerHTML = this.columnDefs
      .filter(col => col.visible)
      .map(col => `
        <th data-field="${col.field}">
          ${col.label}
          <span class="evt-header-actions">
            <svg class="evt-header-icon evt-header-sort" data-sort="${col.field}" viewBox="0 0 16 16">
              <path d="M8 5l4 4H4z"/>
            </svg>
            ${col.type !== 'onTime' ? `
              <svg class="evt-header-icon evt-header-gear" data-filter="${col.field}" viewBox="0 0 20 20">
                <path d="M10 13.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm7.43-3.5c0-.46-.04-.91-.1-1.35l1.7-1.33a.5.5 0 0 0 .12-.64l-1.6-2.77a.5.5 0 0 0-.6-.23l-2 .8a7.03 7.03 0 0 0-1.17-.68l-.3-2.13A.5.5 0 0 0 13 1h-3a.5.5 0 0 0-.5.42l-.3 2.13c-.41.17-.8.39-1.17.68l-2-.8a.5.5 0 0 0-.6.23l-1.6 2.77a.5.5 0 0 0 .12.64l1.7 1.33c-.06.44-.1.89-.1 1.35z"/>
              </svg>
            ` : ''}
          </span>
          <div class="evt-resizer"></div>
        </th>
      `).join('');

    this.setupHeaderEventListeners();
  }

  setupHeaderEventListeners() {
    // Sort handlers
    document.querySelectorAll('.evt-header-sort').forEach(sort => {
      sort.onclick = (e) => {
        const field = sort.getAttribute('data-sort');
        if (this.sortField === field) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortField = field;
          this.sortAsc = true;
        }
        this.render();
      };
    });    // Filter handlers
    document.querySelectorAll('.evt-header-gear').forEach(gear => {
      gear.onclick = (e) => {
        e.stopPropagation();
        const field = gear.getAttribute('data-filter');
        let popup = this.filterPopups[field];
        
        // Toggle behavior for filter popup
        if (popup && popup.classList.contains('active')) {
          popup.classList.remove('active');
        } else {
          // Close all popups first (including column panel)
          this.closeAllPopups();
          
          // Create popup if it doesn't exist
          if (!popup) {
            popup = this.createFilterPopup(field);
            this.filterPopups[field] = popup;
            document.body.appendChild(popup);
          }
          
          // Position and show popup
          const rect = gear.closest('th').getBoundingClientRect();
          popup.style.left = (rect.left + window.scrollX) + 'px';
          popup.style.top = (rect.bottom + window.scrollY) + 'px';
          popup.classList.add('active');
        }
      };
    });

    // Column resize handlers
    document.querySelectorAll('.evt-resizer').forEach(resizer => {
      const th = resizer.parentElement;
      let startX, startWidth;

      resizer.addEventListener('mousedown', (e) => {
        startX = e.pageX;
        startWidth = th.offsetWidth;
        document.body.style.cursor = 'col-resize';
        
        const onMouseMove = (e2) => {
          const width = Math.max(150, startWidth + (e2.pageX - startX));
          th.style.width = width + 'px';
          th.style.minWidth = width + 'px';
        };
        
        const onMouseUp = () => {
          document.body.style.cursor = '';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  renderBody() {
    const tbody = document.querySelector('#event-table tbody');
    tbody.innerHTML = '';

    let filtered = [...this.tableData];    // Apply filters
    Object.entries(this.filters).forEach(([field, filterValue]) => {
      const col = this.columnDefs.find(c => c.field === field);
      filtered = filtered.filter(row => {
        if (!filterValue) return true;
        
        if (col.type === 'date') {
          const rowDate = new Date(row[field].replace(' ', 'T'));
          if (filterValue.from && rowDate < new Date(filterValue.from)) return false;
          if (filterValue.to && rowDate > new Date(filterValue.to)) return false;
          return true;
        } else if (col.type === 'enum') {
          return filterValue === row[field];
        } else {
          return row[field].toString().toLowerCase().includes(filterValue.toLowerCase());
        }
      });
    });

    // Apply sorting
    if (this.sortField) {
      filtered.sort((a, b) => {
        let aVal = a[this.sortField];
        let bVal = b[this.sortField];
        if (this.columnDefs.find(col => col.field === this.sortField).type === 'date') {
          aVal = new Date(aVal.replace(' ', 'T'));
          bVal = new Date(bVal.replace(' ', 'T'));
        }
        if (typeof aVal === 'string') {
          return this.sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return this.sortAsc ? aVal - bVal : bVal - aVal;
      });
    }

    filtered.forEach(row => {
      const isOnTime = new Date(row.avgTime.replace(' ', 'T')) <= new Date(row.estTime.replace(' ', 'T'));
      const tr = document.createElement('tr');
      
      const cells = this.columnDefs
        .filter(col => col.visible)
        .map(col => {
          if (col.field === 'avgTime' || col.field === 'estTime') {
            return `<td>${this.formatDateTime(row[col.field])}</td>`;
          }
          if (col.field === 'onTime') {
            return `<td><span class="evt-${isOnTime ? 'on-time' : 'delay'}">${isOnTime ? 'On Time' : 'Delay'}</span></td>`;
          }
          if (col.field === 'priority') {
            return `<td><span class="evt-priority-${row[col.field].toLowerCase()}">${row[col.field]}</span></td>`;
          }
          return `<td>${row[col.field]}</td>`;
        }).join('');
      
      tr.innerHTML = cells;
      tbody.appendChild(tr);
    });
  }  renderColumnPanel() {
    const columnList = document.getElementById('columnList');
    const columnPanel = document.getElementById('columnPanel');

    columnList.innerHTML = this.columnDefs.map(col => `
      <li class="evt-column-panel-item" draggable="true" data-field="${col.field}">
        <svg class="evt-drag-handle" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        <label>
          <input type="checkbox" ${col.visible ? 'checked' : ''} data-field="${col.field}">
          ${col.label}
          <span class="evt-column-type">${col.type}</span>
        </label>
      </li>
    `).join('');

    // Add event listeners for checkboxes
    columnList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const field = checkbox.getAttribute('data-field');
        const colDef = this.columnDefs.find(col => col.field === field);
        if (colDef) {
          colDef.visible = checkbox.checked;
          this.render();
        }
      });
    });

    // Setup drag and drop
    let draggedItem = null;
    
    columnList.querySelectorAll('.evt-column-panel-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === item) return;
        
        const rect = item.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        if (e.clientY < midpoint) {
          if (item.previousElementSibling !== draggedItem) {
            columnList.insertBefore(draggedItem, item);
          }
        } else {
          if (item.nextElementSibling !== draggedItem) {
            columnList.insertBefore(draggedItem, item.nextElementSibling);
          }
        }
      });

      item.addEventListener('dragend', () => {
        // Update columnDefs order based on new DOM order
        const newOrder = Array.from(columnList.querySelectorAll('.evt-column-panel-item'))
          .map(item => item.getAttribute('data-field'));
        
        this.columnDefs.sort((a, b) => {
          return newOrder.indexOf(a.field) - newOrder.indexOf(b.field);
        });
        
        this.render();
      });
    });
  }
}

// Export the class
window.EventTable = EventTable;
