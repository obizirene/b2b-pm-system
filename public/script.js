    const TODAY = '2026-09-09';

    // 階層標題清洗輔助函式 (去除手動輸入之「第一階:」、「第一階段:」、「第二階:」、「1.」、「1.1」等前綴)
    function cleanTierTitle(str) {
      if (!str) return '';
      return str
        .replace(/^第[一二三四五六七八九十\d]+(階段|時期|層級|大功能|小功能|階段期|[階段期層級項])[:：\s]*/gi, '')
        .replace(/^第[一二三四五六七八九十\d]+[階段期層級項][:：\s]*/gi, '')
        .replace(/^(\d+(\.\d+)*)[:：\s\.\-、]+/g, '')
        .trim();
    }

    // 階段與模組階層資料清洗規格化 (防止 Firebase RTDB 因空陣列而遺失 modules 或 tasks 屬性，確保各階層皆有可用陣列)
    function sanitizePhases() {
      if (!state.phases) {
        state.phases = [];
        return;
      }
      if (!Array.isArray(state.phases)) {
        state.phases = Object.values(state.phases);
      }
      state.phases.forEach(phase => {
        if (!phase.modules) phase.modules = [];
        if (!Array.isArray(phase.modules)) {
          phase.modules = Object.values(phase.modules);
        }
        phase.modules.forEach(module => {
          if (!module.tasks) module.tasks = [];
          if (!Array.isArray(module.tasks)) {
            module.tasks = Object.values(module.tasks);
          }

          // Ensure all tasks have subTasks array
          module.tasks.forEach(t => {
            if (!t.subTasks) t.subTasks = [];
            if (!Array.isArray(t.subTasks)) {
              t.subTasks = Object.values(t.subTasks);
            }
          });

          // Legacy Data Migration: Move any top-level Bug/CR tasks under a Level 3 feature task
          const rootTasks = [];
          module.tasks.forEach(t => {
            if (t.type === 'Bug' || t.type === '需求變更') {
              let parentTask = null;
              if (t.parentTaskId) {
                parentTask = module.tasks.find(p => p.id === t.parentTaskId);
              }
              if (!parentTask) {
                // Find first Feature/Optimization task in module
                parentTask = module.tasks.find(p => p.type === '功能' || p.type === '優化');
              }
              if (parentTask) {
                t.parentTaskId = parentTask.id;
                if (!parentTask.subTasks.some(st => st.id === t.id)) {
                  parentTask.subTasks.push(t);
                }
                return; // Don't keep in root module.tasks
              } else {
                // If no feature task exists, convert this task to '功能' so it stays valid at Level 3
                t.type = '功能';
              }
            }
            rootTasks.push(t);
          });
          module.tasks = rootTasks;
        });
      });
    }

    // 官方行政院國定假日與上班日資料庫 (涵蓋 2025, 2026, 2027 官方放假日與補行上班日)
    function getDefaultTaiwanHolidays() {
      return [
        // 2025 年 (民國 114 年)
        { id: 'h-2025-01-01', date: '2025-01-01', name: '中華民國開國紀念日 (元旦)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '元旦放假 1 天' },
        { id: 'h-2025-01-27', date: '2025-01-27', name: '農曆春節 (調整放假)', category: '彈性放假', isHoliday: true, isWorkingDay: false, note: '除夕前一日調整放假，2/8 補上班' },
        { id: 'h-2025-01-28', date: '2025-01-28', name: '農曆除夕', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '除夕放假 1 天' },
        { id: 'h-2025-01-29', date: '2025-01-29', name: '春節初一', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節假期' },
        { id: 'h-2025-01-30', date: '2025-01-30', name: '春節初二', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節假期' },
        { id: 'h-2025-01-31', date: '2025-01-31', name: '春節初三', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節假期' },
        { id: 'h-2025-02-08', date: '2025-02-08', name: '春節補行上班日', category: '補行上班', isHoliday: false, isWorkingDay: true, note: '補行上班 (補 1/27 調整放假)' },
        { id: 'h-2025-02-28', date: '2025-02-28', name: '和平紀念日 (228)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '和平紀念日連假 3 天' },
        { id: 'h-2025-04-03', date: '2025-04-03', name: '兒童節 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '兒童節補假' },
        { id: 'h-2025-04-04', date: '2025-04-04', name: '民族掃墓節 (清明節)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '清明連假' },
        { id: 'h-2025-05-01', date: '2025-05-01', name: '勞動節', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '勞工放假 1 天' },
        { id: 'h-2025-05-30', date: '2025-05-30', name: '端午節 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '端午節 5/31 適逢週六，5/30 補假 1 天' },
        { id: 'h-2025-10-06', date: '2025-10-06', name: '中秋節', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '中秋連假 3 天' },
        { id: 'h-2025-10-10', date: '2025-10-10', name: '國慶日', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '雙十國慶連假 3 天' },

        // 2026 年 (民國 115 年)
        { id: 'h-2026-01-01', date: '2026-01-01', name: '中華民國開國紀念日 (元旦)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '元旦放假 1 天' },
        { id: 'h-2026-02-16', date: '2026-02-16', name: '農曆除夕', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '農曆除夕放假 1 天' },
        { id: 'h-2026-02-17', date: '2026-02-17', name: '春節初一', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節初一' },
        { id: 'h-2026-02-18', date: '2026-02-18', name: '春節初二', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節初二' },
        { id: 'h-2026-02-19', date: '2026-02-19', name: '春節初三', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節初三' },
        { id: 'h-2026-02-20', date: '2026-02-20', name: '春節補假', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節補假 1 天' },
        { id: 'h-2026-02-27', date: '2026-02-27', name: '和平紀念日 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '2/28 週六，2/27 補假 1 天' },
        { id: 'h-2026-04-03', date: '2026-04-03', name: '兒童節 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '兒童節清明 4 天連假' },
        { id: 'h-2026-04-06', date: '2026-04-06', name: '民族掃墓節 (清明補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '清明補假 1 天' },
        { id: 'h-2026-05-01', date: '2026-05-01', name: '勞動節', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '勞動節 3 天連假' },
        { id: 'h-2026-06-19', date: '2026-06-19', name: '端午節', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '端午連假 3 天' },
        { id: 'h-2026-09-25', date: '2026-09-25', name: '中秋節', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '中秋連假 3 天' },
        { id: 'h-2026-10-09', date: '2026-10-09', name: '國慶日 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '10/10 週六，10/9 補假 1 天' },

        // 2027 年 (民國 116 年)
        { id: 'h-2027-01-01', date: '2027-01-01', name: '中華民國開國紀念日 (元旦)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '元旦 3 天連假' },
        { id: 'h-2027-02-05', date: '2027-02-05', name: '農曆除夕', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '除夕放假 1 天' },
        { id: 'h-2027-02-08', date: '2027-02-08', name: '春節初一補假', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節連假' },
        { id: 'h-2027-02-09', date: '2027-02-09', name: '春節初二補假', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節連假' },
        { id: 'h-2027-02-10', date: '2027-02-10', name: '春節初三補假', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '春節連假' },
        { id: 'h-2027-03-01', date: '2027-03-01', name: '和平紀念日 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '2/28 週日，3/1 補假 1 天' },
        { id: 'h-2027-04-02', date: '2027-04-02', name: '兒童節 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '清明連假 4 天' },
        { id: 'h-2027-04-05', date: '2027-04-05', name: '民族掃墓節 (清明節)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '清明節放假' },
        { id: 'h-2027-04-30', date: '2027-04-30', name: '勞動節 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '5/1 適逢週六，4/30 補假 1 天' },
        { id: 'h-2027-06-09', date: '2027-06-09', name: '端午節', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '端午節放假 1 天' },
        { id: 'h-2027-09-15', date: '2027-09-15', name: '中秋節', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '中秋節放假 1 天' },
        { id: 'h-2027-10-08', date: '2027-10-08', name: '國慶日 (補假)', category: '國定假日', isHoliday: true, isWorkingDay: false, note: '10/10 適逢週日，10/8 補假 1 天' }
      ];
    }

    // 上班日 (工作日) 判定核心函式
    function isDateWorkingDay(dateStr) {
      if (!dateStr) return true;
      const holiday = (state.holidays || []).find(h => h && h.date === dateStr);
      if (holiday) {
        if (holiday.isWorkingDay === true) return true; // 補行上班日
        if (holiday.isHoliday === true) return false;   // 國定假日或自訂休假
      }
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const day = d.getDay();
        if (day === 0 || day === 6) return false; // 週六、週日為例休
      }
      return true; // 週一至週五正常上班
    }

    // 計算兩個日期區間內實際上班日 (工作天) 數
    function calculateWorkingDays(startDate, dueDate) {
      if (!startDate || !dueDate) return 0;
      if (startDate > dueDate) return 0;
      let count = 0;
      const sParts = startDate.split('-');
      const eParts = dueDate.split('-');
      let cur = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
      const end = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10));

      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;
        if (isDateWorkingDay(dStr)) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }

    // Core Application State
    const state = {
      currentProjectId: 'prj-bb', // Default to POC-2609-BB-02 BB專案 as in user's video
      currentPage: 'dashboard',
      simulatedRoleId: 'self',
      isSimulatorActive: true,
      ganttScale: 'day', // 'year', 'quarter', 'month', 'week', 'day'

      // Roles & Permission Matrix
      roles: [
        {
          id: 'role-pm',
          name: '專案經理 (PM)',
          isSystem: false,
          isAdmin: false,
          description: '負責全專案排程控管、成員指派、客戶窗口對接、預算與工時審核',
          responsibilities: '專案建立與里程碑、工時簽核、全功能權限無受限，無限制員工與管理權限',
          permissions: ['dashboard_view', 'member_view', 'member_create', 'member_edit', 'member_delete', 'role_view', 'role_edit', 'client_view', 'client_create', 'client_edit', 'client_delete', 'proj_view', 'proj_create', 'proj_edit', 'proj_delete', 'gantt_view', 'gantt_add_phase', 'gantt_add_task', 'gantt_drag', 'gantt_delete', 'gantt_export', 'worklog_view', 'worklog_create', 'worklog_edit', 'worklog_delete', 'task_view', 'task_create', 'task_edit', 'task_schedule_edit', 'task_complete_permission', 'task_delete', 'issue_view', 'issue_create', 'issue_edit', 'issue_delete', 'issue_comment']
        },
        {
          id: 'role-dept-manager',
          name: '部門主管',
          isSystem: false,
          isAdmin: false,
          description: '負責部門內部人員派工、預估排程與工時填寫、任務驗收審核與部門工時成本檢視',
          responsibilities: '部門任務管理、審核預估排程工時、簽核驗收、成員排程調配與部門成本分析',
          permissions: ['dashboard_view', 'member_view', 'proj_view', 'gantt_view', 'gantt_add_phase', 'gantt_add_task', 'gantt_drag', 'worklog_view', 'worklog_create', 'worklog_edit', 'worklog_delete', 'task_view', 'task_create', 'task_edit', 'task_schedule_edit', 'task_complete_permission', 'issue_view', 'issue_create', 'issue_edit', 'issue_delete', 'issue_comment', 'dept_view', 'salary_view']
        },
        {
          id: 'role-dev',
          name: '全端工程師',
          isSystem: false,
          isAdmin: false,
          description: '開發核心模組 API、前後端功能實作、資料庫架構設計與單元測試驗證',
          responsibilities: '專注第三階段 API、資料庫與模組撰寫，負責技術文件、工時填報與瑕疵修復能力',
          permissions: ['dashboard_view', 'proj_view', 'gantt_view', 'gantt_drag', 'worklog_view', 'worklog_create', 'worklog_edit', 'task_view', 'task_create', 'task_edit', 'task_schedule_edit', 'issue_view', 'issue_create', 'issue_edit', 'issue_comment']
        },
        {
          id: 'role-ui',
          name: 'UI/UX 設計師',
          isSystem: false,
          isAdmin: false,
          description: '視覺原型、UI 切版與流程規劃建構，可編輯其所屬任務與工時項目',
          responsibilities: '視覺模型、UI 切版與響應式切版建置，可編輯所屬任務與工時項目',
          permissions: ['dashboard_view', 'proj_view', 'gantt_view', 'gantt_drag', 'worklog_view', 'worklog_create', 'worklog_edit', 'task_view', 'task_edit', 'task_schedule_edit', 'issue_view', 'issue_create', 'issue_comment']
        },
        {
          id: 'role-qa',
          name: 'QA 測試工程師',
          isSystem: false,
          isAdmin: false,
          description: '專案測試、驗收標準審核、提出問題瑕疵記錄與檢視整體運作項目',
          responsibilities: '獨立提出專案測試之 Bug 瑕疵、測試進程追蹤或對話記錄、可編輯問題與提報檢討項目',
          permissions: ['dashboard_view', 'proj_view', 'gantt_view', 'worklog_view', 'worklog_create', 'task_view', 'issue_view', 'issue_create', 'issue_edit', 'issue_delete', 'issue_comment']
        },
        {
          id: 'role-client',
          name: '客戶窗口',
          isSystem: false,
          isAdmin: false,
          description: '外部客戶對接窗口，僅可查看專案進度、檢視問題與發布需求',
          responsibilities: '外部客戶對接窗口，僅可查看專案進度、檢視問題與發布需求',
          permissions: ['dashboard_view', 'proj_view', 'gantt_view', 'issue_view', 'issue_create', 'issue_comment']
        },
        {
          id: 'role-admin',
          name: '系統管理員',
          isSystem: true,
          isAdmin: true,
          description: '全功能最高管理員權限，擁有全系統所有模組與管理功能',
          responsibilities: '系統日常維護、資料庫備份與最高階授權（全部權限開啟）',
          permissions: ['dashboard_view', 'member_view', 'member_create', 'member_edit', 'member_delete', 'role_view', 'role_edit', 'client_view', 'client_create', 'client_edit', 'client_delete', 'proj_view', 'proj_create', 'proj_edit', 'proj_delete', 'gantt_view', 'gantt_add_phase', 'gantt_add_task', 'gantt_drag', 'gantt_delete', 'gantt_export', 'worklog_view', 'worklog_create', 'worklog_edit', 'worklog_delete', 'task_view', 'task_create', 'task_edit', 'task_schedule_edit', 'task_complete_permission', 'task_delete', 'issue_view', 'issue_create', 'issue_edit', 'issue_delete', 'issue_comment', 'dept_view', 'dept_edit', 'salary_view', 'salary_edit']
        }
      ],

      // Departments Organization Structure & Permissions Matrix
      departments: [
        {
          id: 'dept-rd',
          code: 'RD',
          name: '研發部 (R&D Department)',
          managerId: 'user-4',
          managerName: '黃系統架構師 (Kevin Huang)',
          description: '負責產品核心系統架構開發、API設計與新技術研發實作',
          managerPermissions: [
            'dashboard_view', 'member_view', 'proj_view', 'gantt_view', 'gantt_add_phase', 
            'gantt_add_task', 'gantt_drag', 'worklog_view', 'worklog_create', 'worklog_edit', 
            'worklog_delete', 'task_view', 'task_create', 'task_edit', 'task_schedule_edit', 
            'task_complete_permission', 'issue_view', 'issue_create', 'issue_edit', 'issue_delete', 
            'issue_comment', 'dept_view', 'salary_view'
          ],
          employeePermissions: [
            'dashboard_view', 'proj_view', 'gantt_view', 'gantt_drag', 'worklog_view', 
            'worklog_create', 'worklog_edit', 'task_view', 'task_edit', 'issue_view', 
            'issue_create', 'issue_comment'
          ]
        },
        {
          id: 'dept-pmo',
          code: 'PMO',
          name: '專案管理部 (PMO Department)',
          managerId: 'user-1',
          managerName: '陳專案經理 (Alex Chen)',
          description: '負責跨部門專案排程管控、資源分攤、業主對接與驗收審核',
          managerPermissions: [
            'dashboard_view', 'member_view', 'member_create', 'member_edit', 'role_view', 
            'client_view', 'client_create', 'client_edit', 'proj_view', 'proj_create', 
            'proj_edit', 'gantt_view', 'gantt_add_phase', 'gantt_add_task', 'gantt_drag', 
            'gantt_delete', 'worklog_view', 'worklog_create', 'worklog_edit', 'worklog_delete', 
            'task_view', 'task_create', 'task_edit', 'task_schedule_edit', 'task_complete_permission', 
            'task_delete', 'issue_view', 'issue_create', 'issue_edit', 'issue_delete', 
            'issue_comment', 'dept_view', 'dept_edit', 'salary_view', 'salary_edit'
          ],
          employeePermissions: [
            'dashboard_view', 'member_view', 'client_view', 'proj_view', 'gantt_view', 
            'gantt_add_task', 'worklog_view', 'worklog_create', 'task_view', 'task_edit', 
            'issue_view', 'issue_create'
          ]
        },
        {
          id: 'dept-design',
          code: 'DESIGN',
          name: '設計部 (Design Department)',
          managerId: 'user-3',
          managerName: '王UI設計師 (David Wang)',
          description: '負責使用者體驗 (UX) 規劃、視覺介面 (UI) 設計與繪製原型切版',
          managerPermissions: [
            'dashboard_view', 'member_view', 'proj_view', 'gantt_view', 'gantt_add_task', 
            'worklog_view', 'worklog_create', 'worklog_edit', 'task_view', 'task_create', 
            'task_edit', 'task_schedule_edit', 'issue_view', 'issue_create', 'issue_edit'
          ],
          employeePermissions: [
            'dashboard_view', 'proj_view', 'gantt_view', 'worklog_view', 'worklog_create', 
            'task_view', 'task_edit', 'issue_view', 'issue_create'
          ]
        }
      ],

      // Members (Matching Video)
      members: [
        { id: 'user-admin', name: 'irene', systemRoleId: 'role-pm', role: '專案經理 (PM)', jobGradeId: 'grade-pm-mgr', salaryGradeId: 'grade-pm-mgr', departmentId: 'dept-pmo', departmentName: '專案管理部 (PMO Department)', email: 'obizirene@gmail.com', phone: '+886 912-111-222', monthlySalary: 95000, hourlyRate: 666, effectiveDate: '2026-01-01', salaryNotes: '資深專案主管' },
        { id: 'user-1', name: '陳專案經理 (Alex Chen)', systemRoleId: 'role-pm', role: '專案經理 (PM)', jobGradeId: 'grade-pm-sr', salaryGradeId: 'grade-pm-sr', departmentId: 'dept-pmo', departmentName: '專案管理部 (PMO Department)', email: 'alex.chen@company.com', phone: '+886 922-222-333', monthlySalary: 85000, hourlyRate: 596, effectiveDate: '2026-01-01', salaryNotes: 'PMO 部門主管' },
        { id: 'user-2', name: '林資深工程師 (Sarah Lin)', systemRoleId: 'role-dev', role: '全端工程師', jobGradeId: 'grade-eng-sr', salaryGradeId: 'grade-eng-sr', departmentId: 'dept-rd', departmentName: '研發部 (R&D Department)', email: 'sarah.lin@company.com', phone: '+886 933-333-444', monthlySalary: 80000, hourlyRate: 561, effectiveDate: '2026-01-01', salaryNotes: '資深全端工程師' },
        { id: 'user-3', name: '王UI設計師 (David Wang)', systemRoleId: 'role-ui', role: 'UI/UX 設計師', jobGradeId: 'grade-des-mgr', salaryGradeId: 'grade-des-mgr', departmentId: 'dept-design', departmentName: '設計部 (Design Department)', email: 'david.wang@company.com', phone: '+886 933-444-555', monthlySalary: 90000, hourlyRate: 631, effectiveDate: '2026-01-01', salaryNotes: '設計部主管' },
        { id: 'user-4', name: '黃系統架構師 (Kevin Huang)', systemRoleId: 'role-dev', role: '全端工程師', jobGradeId: 'grade-eng-mgr', salaryGradeId: 'grade-eng-mgr', departmentId: 'dept-rd', departmentName: '研發部 (R&D Department)', email: 'kevin.huang@company.com', phone: '+886 944-555-666', monthlySalary: 100000, hourlyRate: 701, effectiveDate: '2026-01-01', salaryNotes: '研發部主管' },
        { id: 'user-5', name: 'Irene', systemRoleId: 'role-pm', role: '專案經理 (PM)', jobGradeId: 'grade-eng-sr', salaryGradeId: 'grade-eng-sr', departmentId: 'dept-rd', departmentName: '研發部 (R&D Department)', email: 'ccshcm20@gmail.com', phone: '+886 988-777-666', monthlySalary: 80000, hourlyRate: 561, effectiveDate: '2026-01-01', salaryNotes: '全端工程師' }
      ],

      // Clients (Matching Video: AAA & BBB)
      clients: [
        { id: 'cli-aaa', name: 'AAA', code: '24578910', contactPerson: 'Amy', email: 'abc@gmail.com', phone: '123456677' },
        { id: 'cli-bbb', name: 'BBB', code: '24578995', contactPerson: 'Ben', email: 'bbb@gmail.com', phone: '12345689' }
      ],

      // Projects (Matching Video)
      projects: [
        {
          id: 'prj-srs',
          clientId: 'cli-aaa',
          name: '亞太環境科技(如果需要保固)_2024資源回收e管理程式升級',
          code: 'INT-2409-AA-01',
          type: '外部專案 (EXT)',
          description: '資源回收系統升級與雲端報表管理機制',
          status: '進行中',
          startDate: '2026-08-01',
          targetEndDate: '2026-09-30',
          teamMembers: ['user-admin', 'user-1', 'user-2', 'user-3', 'user-4']
        },
        {
          id: 'prj-bb',
          clientId: 'cli-bbb',
          name: 'BB專案',
          code: 'POC-2609-BB-02',
          type: '概念驗證 (POC)',
          description: 'BB專案驗收與測試模組核心流程排程',
          status: '進行中',
          startDate: '2026-08-01',
          targetEndDate: '2026-09-30',
          teamMembers: ['user-admin', 'user-1', 'user-2', 'user-3', 'user-4']
        }
      ],

      // Phases, Modules & Tasks (Tree Model matching Video)
      phases: [
        // Phases for BB專案 (prj-bb)
        {
          id: 'phase-1',
          projectId: 'prj-bb',
          name: '第一階段: 需求確認與規劃',
          expanded: true,
          modules: [
            {
              id: 'mod-1-1',
              name: '需求分析與規格文件 (SRS)',
              expanded: true,
              tasks: [
                { id: 'task-1-1-1', projectId: 'prj-bb', phaseId: 'phase-1', moduleId: 'mod-1-1', wbs: '1.1.1', title: '處理核心架構與SRS規格書', type: '需求變更', assignee: '陳專案經理 (Alex Chen)', expectedDeliveryDate: '2026-08-16', estHours: 8, actHours: 8, startDate: '2026-08-16', dueDate: '2026-08-16', status: '已完成', severity: '無' },
                { id: 'task-1-1-2', projectId: 'prj-bb', phaseId: 'phase-1', moduleId: 'mod-1-1', wbs: '1.1.2', title: '系統架構概念程式規格', type: '功能', assignee: '黃系統架構師 (Kevin Huang)', expectedDeliveryDate: '2026-08-15', estHours: 80, actHours: 0, startDate: '2026-08-06', dueDate: '2026-08-15', status: '待測試', severity: '無' },
                { id: 'task-1-1-3', projectId: 'prj-bb', phaseId: 'phase-1', moduleId: 'mod-1-1', wbs: '1.1.3', title: '專案啟動會議 (kick-off)', type: '功能', assignee: '陳專案經理 (Alex Chen)', expectedDeliveryDate: '2026-08-05', estHours: 40, actHours: 0, startDate: '2026-08-01', dueDate: '2026-08-05', status: '進行中', severity: '無' }
              ]
            }
          ]
        },
        {
          id: 'phase-2',
          projectId: 'prj-bb',
          name: '第二階段: 程式撰寫與實作',
          expanded: true,
          modules: [
            {
              id: 'mod-2-1',
              name: '前端 UI 及專案 API 開發',
              expanded: true,
              tasks: [
                { id: 'task-2-1-1', projectId: 'prj-bb', phaseId: 'phase-2', moduleId: 'mod-2-1', wbs: '2.1.1', title: '撰寫前端與環境建構 API 開發', type: '功能', assignee: '林資深工程師 (Sarah Lin)', expectedDeliveryDate: '2026-08-30', estHours: 88, actHours: 0, startDate: '2026-08-20', dueDate: '2026-08-30', status: '待執行', severity: '無' },
                { id: 'task-2-1-2', projectId: 'prj-bb', phaseId: 'phase-2', moduleId: 'mod-2-1', wbs: '2.1.2', title: 'UI/UX 響應式介面設計及切版', type: '功能', assignee: '王UI設計師 (David Wang)', expectedDeliveryDate: '2026-08-25', estHours: 128, actHours: 0, startDate: '2026-08-10', dueDate: '2026-08-25', status: '進行中', severity: '無' }
              ]
            }
          ]
        },
        {
          id: 'phase-3',
          projectId: 'prj-bb',
          name: '第三階段: 系統測試與交付驗收',
          expanded: true,
          modules: [
            {
              id: 'mod-3-1',
              name: 'QA 檢測與上線部署',
              expanded: true,
              tasks: [
                { id: 'task-3-1-1', projectId: 'prj-bb', phaseId: 'phase-3', moduleId: 'mod-3-1', wbs: '3.1.1', title: '系統整合測試與 Issue 修正', type: '功能', assignee: '黃系統架構師 (Kevin Huang)', expectedDeliveryDate: '2026-09-05', estHours: 48, actHours: 0, startDate: '2026-08-31', dueDate: '2026-09-05', status: '規劃中', severity: '無' }
              ]
            }
          ]
        },
        {
          id: 'phase-4',
          projectId: 'prj-bb',
          name: 'aaaa',
          expanded: true,
          modules: [
            {
              id: 'mod-4-1',
              name: 'a-00',
              expanded: true,
              tasks: []
            }
          ]
        },
        {
          id: 'phase-5',
          projectId: 'prj-bb',
          name: 'bbbb',
          expanded: true,
          modules: [
            {
              id: 'mod-5-1',
              name: '連線核心核心模組',
              expanded: true,
              tasks: []
            }
          ]
        },

        // Phases for 亞太環境科技 (prj-srs)
        {
          id: 'phase-srs-1',
          projectId: 'prj-srs',
          name: '第一階段: 需求規格與保固合約',
          expanded: true,
          modules: [
            {
              id: 'mod-srs-1',
              name: '資源回收系統 SRS 規格定義',
              expanded: true,
              tasks: [
                { id: 'task-srs-1', projectId: 'prj-srs', phaseId: 'phase-srs-1', moduleId: 'mod-srs-1', wbs: '1.1', title: '保固條款研議與需求對接', type: '功能', assignee: '陳專案經理 (Alex Chen)', estHours: 40, actHours: 13.5, startDate: '2026-08-01', dueDate: '2026-08-15', status: '進行中', severity: '無' },
                { id: 'task-srs-2', projectId: 'prj-srs', phaseId: 'phase-srs-1', moduleId: 'mod-srs-1', wbs: '1.2', title: '資源回收 e 管理模組重構', type: '優化', assignee: '林資深工程師 (Sarah Lin)', estHours: 64, actHours: 12, startDate: '2026-08-16', dueDate: '2026-08-30', status: '進行中', severity: '無' }
              ]
            }
          ]
        }
      ],

      // Work Logs
      workLogs: [
        { id: 'log-1', taskId: 'task-1-1-1', userName: '陳專案經理 (Alex Chen)', date: '2026-08-16', hours: 8, notes: '完成核心架構審核與 SRS 規格確認' },
        { id: 'log-2', taskId: 'task-srs-1', userName: '陳專案經理 (Alex Chen)', date: '2026-08-05', hours: 13.5, notes: '完成亞太環境科技保固條款對接與規格初版' },
        { id: 'log-3', taskId: 'task-srs-2', userName: '林資深工程師 (Sarah Lin)', date: '2026-08-22', hours: 4, notes: '資源回收模組架構重整與測試' }
      ],

      // Issues & QA Testing Tracker (New module from video)
      issues: [
        {
          id: 'issue-1',
          projectId: 'prj-bb',
          taskId: 'task-2-1-2',
          category: '問題瑕疵',
          title: '甘特圖橫條在小解析度下文字溢出問題',
          assignee: '王UI設計師 (David Wang)',
          status: '已確認',
          dueDate: '2026-09-15',
          descriptionHtml: '<div>測試發現當瀏覽器寬度小於 1024px 時，甘特圖橫條內的任務標題會被截斷或溢出邊界。</div>',
          attachments: []
        },
        {
          id: 'issue-2',
          projectId: 'prj-srs',
          taskId: 'task-srs-2',
          category: '驗收測試',
          title: '報表匯出 Excel 中文字編碼檢核',
          assignee: '黃系統架構師 (Kevin Huang)',
          status: '處理中',
          dueDate: '2026-09-20',
          descriptionHtml: '<div>請確認匯出 CSV/Excel 時有加上 UTF-8 BOM，避免 Windows Excel 開啟時產生亂碼。</div>',
          attachments: []
        }
      ],

      // Holidays & Working Days Database
      holidays: getDefaultTaiwanHolidays()
    };

    // Helper: Flat list of tasks (includes Level 3 tasks and Level 4 sub-tasks)
    function getFlatTasks() {
      sanitizePhases();
      const flat = [];
      state.phases.forEach(p => {
        (p.modules || []).forEach(m => {
          (m.tasks || []).forEach(t => {
            if (!t.projectId) t.projectId = p.projectId;
            if (!t.phaseId) t.phaseId = p.id;
            if (!t.moduleId) t.moduleId = m.id;
            flat.push(t);

            (t.subTasks || []).forEach(st => {
              if (!st.projectId) st.projectId = p.projectId;
              if (!st.phaseId) st.phaseId = p.id;
              if (!st.moduleId) st.moduleId = m.id;
              if (!st.parentTaskId) st.parentTaskId = t.id;
              flat.push(st);
            });
          });
        });
      });
      return flat;
    }

    state.tasks = getFlatTasks();

    let currentTaskFilter = 'all';
    let currentUploadedFiles = []; // Temporary storage for modal file attachments

    // Firebase Config
    const firebaseConfig = {
      apiKey: "AIzaSyAZ2a5LUIQdGhMXmXB3SXP4hVhoJ9yStnY",
      authDomain: "b2b-pm-system.firebaseapp.com",
      databaseURL: "https://b2b-pm-system-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "b2b-pm-system",
      storageBucket: "b2b-pm-system.firebasestorage.app",
      messagingSenderId: "1007117767261",
      appId: "1:1007117767261:web:85c8300c793d0ed84073b4",
      measurementId: "G-7X261E9G4W"
    };

    let firebaseDb = null;
    let isRemoteSyncing = false;
    let hasLoadedCloudData = false;

    // Restore from LocalStorage if available
    try {
      const saved = localStorage.getItem('b2b_pm_state_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.projects && parsed.projects.length > 0) {
          Object.assign(state, parsed);
        }
      }
    } catch(e) {}
    if (!state.holidays || state.holidays.length === 0) {
      state.holidays = getDefaultTaiwanHolidays();
    } else if (!Array.isArray(state.holidays)) {
      state.holidays = Object.values(state.holidays);
    }
    if (!state.jobGrades || state.jobGrades.length === 0) {
      state.jobGrades = getDefaultJobGrades();
    }
    sanitizeRoles();
    sanitizePhases();

    let currentAuthUser = null;

    function populateLoginMemberQuickSelect() {
      const select = document.getElementById('login-quick-member-select');
      if (!select) return;
      select.innerHTML = '<option value="">-- 請選擇欲登入的團隊成員 --</option>' +
        (state.members || []).map(m => `<option value="${m.id}">${m.name} (${m.role}) - ${m.email}</option>`).join('');
    }

    function onLoginMemberSelect(memberId) {
      if (!memberId) return;
      const m = state.members.find(x => x.id === memberId);
      if (m) {
        const emailInput = document.getElementById('login-input-email');
        const passInput = document.getElementById('login-input-password');
        if (emailInput) emailInput.value = m.email;
        if (passInput) passInput.value = '123456';
      }
    }

    function openLoginModal() {
      populateLoginMemberQuickSelect();
      openModal('modal-login');
    }

    function loginWithCredentials() {
      const emailInput = document.getElementById('login-input-email');
      const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
      
      if (!email) {
        alert('請輸入登入 Email！');
        return;
      }

      let matchedMember = state.members.find(m => m.email && m.email.toLowerCase().trim() === email);
      if (!matchedMember && (email.includes('irene') || email.includes('admin') || email === 'obilirene@gmail.com')) {
        matchedMember = state.members.find(m => m.name.toLowerCase().includes('irene')) || {
          id: 'user-admin', name: 'irene', role: '專案經理 (PM)', email: 'obilirene@gmail.com', phone: '+886 912-111-222'
        };
      }

      if (matchedMember) {
        currentAuthUser = {
          uid: matchedMember.id,
          email: matchedMember.email,
          displayName: matchedMember.name,
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedMember.name)}&background=2563eb&color=fff`,
          memberInfo: matchedMember
        };
        try {
          localStorage.setItem('b2b_logged_user', JSON.stringify(currentAuthUser));
        } catch(e) {}

        const isIrene = matchedMember.name.toLowerCase().includes('irene');
        if (isIrene) {
          state.simulatedRoleId = 'self';
        } else {
          const matchedRole = state.roles.find(r => r.name === matchedMember.role || (r.name && matchedMember.role && (r.name.includes(matchedMember.role) || matchedMember.role.includes(r.name))));
          if (matchedRole) {
            state.simulatedRoleId = matchedRole.id;
          }
        }

        updateUserUI(currentAuthUser, matchedMember);
        updateRoleSimulatorOptions();
        applyRolePermissions();
        renderAll();

        closeModal('modal-login');
        showToast(`登入成功！歡迎回來，${matchedMember.name}（${matchedMember.role}）！`);
      } else {
        alert(`⛔ 存取被拒絕！\n\n您輸入的帳號 Email (${email}) 未在系統「員工管理」授權名冊中。\n請向專案經理 (PM) 確認是否已於員工管理完成建檔。`);
      }
    }

    // User Auth & UI
    function checkUserAuthorization(user) {
      if (!user) {
        if (!currentAuthUser) {
          initAuthUser();
        }
        return;
      }

      const email = (user.email || '').toLowerCase().trim();
      let matchedMember = state.members.find(m => m.email && m.email.toLowerCase().trim() === email);

      if (!matchedMember && (email.includes('irene') || email.includes('admin') || email === 'obilirene@gmail.com')) {
        matchedMember = { id: 'user-admin', name: 'irene', role: '專案經理 (PM)', email: user.email, phone: '+886 912-111-222' };
        state.members.unshift(matchedMember);
        renderMembersTable();
        syncToFirebase();
      }

      if (matchedMember) {
        currentAuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || matchedMember.name,
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedMember.name)}&background=2563eb&color=fff`,
          memberInfo: matchedMember
        };
        try {
          localStorage.setItem('b2b_logged_user', JSON.stringify(currentAuthUser));
        } catch(e) {}

        const isIrene = matchedMember.name.toLowerCase().includes('irene');
        if (isIrene) {
          state.simulatedRoleId = 'self';
        } else {
          const matchedRole = state.roles.find(r => r.name === matchedMember.role || (r.name && matchedMember.role && (r.name.includes(matchedMember.role) || matchedMember.role.includes(r.name))));
          if (matchedRole) state.simulatedRoleId = matchedRole.id;
        }

        closeModal('modal-login');
        updateUserUI(currentAuthUser, matchedMember);
        updateRoleSimulatorOptions();
        applyRolePermissions();
        renderAll();
        showToast(`歡迎回來，${matchedMember.name}！`);
      } else {
        currentAuthUser = null;
        updateUserUI(null, null);
        openLoginModal();
        if (typeof firebase !== 'undefined' && firebase.auth) {
          firebase.auth().signOut().then(() => {
            alert(`⛔ 存取被拒絕！\n\n您的 Gmail 帳號 (${user.email}) 未在系統「員工管理」授權清單中。\n\n請先由專案經理 (PM) 在系統「員工管理」新增您的 Email，始可登入存取！`);
          });
        }
      }
    }

    function loginWithGoogle() {
      if (window.location.protocol === 'file:') {
        alert("【本機檔案模式限制】\n\nGoogle SSO 驗證依賴 OAuth 安全機制，強制要求 http:// 或 https:// 協定，不支援本機 file:///。\n\n建議您：\n1. 直接使用登入視窗上方的「⚡ 快速切換成員身分」或「帳號密碼登入」\n2. 或啟動本地 HTTP 伺服器 (執行 server.ps1) 透過 http://localhost:8080 開啟！");
        return;
      }
      if (typeof firebase === 'undefined' || !firebase.auth) {
        alert("Firebase Auth 尚未初始化或於本機端受限，建議直接使用「帳號密碼登入」或「快速切換成員」登入！");
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then((result) => {
          showToast('Google 驗證成功，正在檢測權限...');
          if (result && result.user) {
            checkUserAuthorization(result.user);
          }
        })
        .catch((error) => {
          console.error("Google SSO Error:", error);
          if (error.code !== 'auth/popup-closed-by-user') {
            alert('Google 登入失敗：' + error.message + '\n\n本機環境建議直接使用上方「帳號密碼」或「快速切換成員」登入！');
          }
        });
    }

    function logoutUser() {
      currentAuthUser = null;
      try {
        localStorage.removeItem('b2b_logged_user');
      } catch(e) {}
      updateUserUI(null, null);
      openLoginModal();
      showToast('已成功登出系統');
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().catch(err => console.error("SignOut error:", err));
      }
    }

    function updateUserUI(user, member) {
      const userBlock = document.getElementById('sidebar-user-block');
      const headerUserBadge = document.getElementById('header-user-badge');

      if (user && member) {
        const sysRole = getMemberSystemRole(member);
        const roleBadgeText = sysRole ? sysRole.name : (member.role || '一般成員');
        const photo = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2563eb&color=fff`;
        if (userBlock) {
          userBlock.innerHTML = `
            <div style="padding: 10px 12px; background: rgba(15,23,42,0.8); border: 1px solid #334155; border-radius: 8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:10px; font-weight:800; color:#10b981;">● 已登入身分</span>
                <span class="badge badge-purple" style="font-size:10px; padding:2px 6px;">${roleBadgeText}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <img src="${photo}" style="width:32px; height:32px; border-radius:50%; border:2px solid #3b82f6; object-fit:cover; flex-shrink: 0;">
                <div style="min-width:0; flex:1;">
                  <div style="font-weight: 700; color: white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:12px;" title="${member.name}">${member.name}</div>
                  <div style="font-size:10px; color:#94a3b8; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.email}</div>
                </div>
              </div>
              <div style="display: flex; gap: 6px; margin-top: 8px;">
                <button class="btn btn-secondary btn-xs" onclick="openLoginModal()" style="flex:1; justify-content:center; background:rgba(255,255,255,0.06); color:#cbd5e1; border-color:#475569; font-size:11px;">切換帳號</button>
                <button class="btn btn-danger-outline btn-xs" onclick="logoutUser()" style="flex:1; justify-content:center; background:rgba(244,63,94,0.1); border-color:rgba(244,63,94,0.3); color:#f43f5e; font-size:11px;">登出</button>
              </div>
              <div style="color: #10b981; font-size: 10px; margin-top: 6px;" id="firebase-status-badge">● Firebase Online (已即時連線)</div>
            </div>
          `;
        }
        if (headerUserBadge) {
          headerUserBadge.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; background:#eff6ff; padding:4px 12px; border-radius:999px; border:1px solid #bfdbfe; cursor:pointer;" onclick="openLoginModal()" title="點擊切換帳號或登出">
              <span style="font-size:12px;">👤</span>
              <span style="font-weight:700; font-size:12px; color:var(--slate-800);">${member.name}</span>
              <span class="badge badge-success" style="font-size:10px; padding:2px 6px;">已驗證</span>
            </div>
          `;
        }
      } else {
        if (userBlock) {
          userBlock.innerHTML = `
            <div style="padding: 10px 12px; background: rgba(15,23,42,0.8); border: 1px solid #334155; border-radius: 8px;">
              <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:4px;">系統登入狀態</div>
              <div style="font-size:12px; color:#f87171; font-weight:700; margin-bottom:8px;">🔒 尚未登入帳號</div>
              <button class="btn btn-primary btn-sm" onclick="openLoginModal()" style="width:100%; justify-content:center; font-weight:700;">🔑 立即登入系統</button>
              <div style="color: #10b981; font-size: 10px; margin-top: 6px;" id="firebase-status-badge">● Firebase Online (已即時連線)</div>
            </div>
          `;
        }
        if (headerUserBadge) {
          headerUserBadge.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; background:#f1f5f9; padding:4px 12px; border-radius:999px; border:1px solid #cbd5e1; cursor:pointer;" onclick="openLoginModal()" title="點擊登入帳號">
              <span style="font-size:12px;">👤</span>
              <span style="font-weight:700; font-size:12px; color:#64748b;">訪客身分</span>
              <span class="badge badge-purple" style="font-size:10px;">請登入</span>
            </div>
          `;
        }
      }
    }

    function initAuthUser() {
      try {
        const saved = localStorage.getItem('b2b_logged_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            const member = state.members.find(m => m.email && m.email.toLowerCase() === parsed.email.toLowerCase()) || parsed.memberInfo;
            if (member) {
              currentAuthUser = parsed;
              currentAuthUser.memberInfo = member;
              updateUserUI(currentAuthUser, member);
              return;
            }
          }
        }
      } catch(e) {}

      // Default initial login as irene
      const defaultMember = state.members.find(m => m.name && m.name.toLowerCase().includes('irene')) || state.members[0];
      if (defaultMember) {
        currentAuthUser = {
          uid: defaultMember.id,
          email: defaultMember.email,
          displayName: defaultMember.name,
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultMember.name)}&background=2563eb&color=fff`,
          memberInfo: defaultMember
        };
        updateUserUI(currentAuthUser, defaultMember);
      }
    }

    // Firebase DB Setup
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        const dbUrl = firebaseConfig.databaseURL || "https://b2b-pm-system-default-rtdb.asia-southeast1.firebasedatabase.app";
        try {
          firebaseDb = firebase.database();
        } catch(eDb) {
          try {
            firebaseDb = firebase.app().database(dbUrl);
          } catch(eDb2) {
            console.warn("Firebase Database init fallback:", eDb2);
          }
        }

        firebaseDb.ref('.info/connected').on('value', (snap) => {
          const statusEl = document.getElementById('firebase-status-badge');
          if (snap.val() === true) {
            if (statusEl) {
              statusEl.innerHTML = "● Firebase Online (已即時連線)";
              statusEl.style.color = "#10b981";
            }
          } else {
            if (statusEl) {
              statusEl.innerHTML = "○ Firebase Offline (連線中/本機備份)";
              statusEl.style.color = "#f59e0b";
            }
          }
        });

        firebaseDb.ref('b2b_state_v2').on('value', (snapshot) => {
          if (snapshot.exists()) {
            const remoteData = snapshot.val();
            if (remoteData) {
              isRemoteSyncing = true;
              state.members = remoteData.members || state.members;
              state.clients = remoteData.clients || state.clients;
              state.projects = remoteData.projects || state.projects;
              if (remoteData.phases) {
                state.phases = Array.isArray(remoteData.phases) ? remoteData.phases : Object.values(remoteData.phases);
              }
              state.workLogs = remoteData.workLogs || state.workLogs;
              state.issues = remoteData.issues || state.issues;
              if (remoteData.roles) {
                state.roles = Array.isArray(remoteData.roles) ? remoteData.roles : Object.values(remoteData.roles);
              }
              if (remoteData.holidays) {
                state.holidays = Array.isArray(remoteData.holidays) ? remoteData.holidays : Object.values(remoteData.holidays);
              }
              if (remoteData.departments) {
                state.departments = Array.isArray(remoteData.departments) ? remoteData.departments : Object.values(remoteData.departments);
              }
              if (remoteData.jobGrades) {
                state.jobGrades = Array.isArray(remoteData.jobGrades) ? remoteData.jobGrades : Object.values(remoteData.jobGrades);
              }
              if (!state.holidays || state.holidays.length === 0) {
                state.holidays = getDefaultTaiwanHolidays();
              }
              sanitizeRoles();
              sanitizePhases();
              sanitizeJobGradesAndMembers();
              if (remoteData.currentProjectId) state.currentProjectId = remoteData.currentProjectId;
              hasLoadedCloudData = true;
              renderAll(true);
              isRemoteSyncing = false;
            }
          } else {
            hasLoadedCloudData = true;
            syncToFirebase();
          }
        });

        firebase.auth().onAuthStateChanged((user) => {
          checkUserAuthorization(user);
        });
      }
    } catch(e) {
      console.warn("Firebase Init fallback to LocalStorage", e);
    }

    function syncToFirebase() {
      if (isRemoteSyncing) return;
      try {
        localStorage.setItem('b2b_pm_state_v2', JSON.stringify(state));
      } catch(e) {}

      if (firebaseDb) {
        firebaseDb.ref('b2b_state_v2').set({
          members: state.members,
          clients: state.clients,
          projects: state.projects,
          phases: state.phases,
          workLogs: state.workLogs,
          issues: state.issues,
          roles: state.roles,
          holidays: state.holidays,
          departments: state.departments,
          jobGrades: state.jobGrades,
          currentProjectId: state.currentProjectId
        }).catch(err => console.error("Firebase Sync Error:", err));
      }
    }

    // Toast
    function showToast(msg) {
      const c = document.getElementById('toast-container');
      if (!c) return;
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<span>✨</span><span>${msg}</span>`;
      c.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }

    // Active Project Management & 2-Tier Scoping Mechanism
    let currentSidebarTier = 1;

    function toggleSidebarCollapse() {
      const sidebar = document.querySelector('.sidebar');
      const btn = document.getElementById('sidebar-collapse-btn');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        if (btn) btn.innerHTML = isCollapsed ? '▶' : '◀';
        showToast(isCollapsed ? '側邊欄已收合' : '側邊欄已展開');
      }
    }

    function enterProjectTier(projectId) {
      if (!projectId) projectId = state.currentProjectId || (state.projects[0] ? state.projects[0].id : '');
      state.currentProjectId = projectId;
      currentSidebarTier = 2;

      // Switch to Tier 2 Sidebar UI
      const tier1 = document.getElementById('sidebar-tier-1');
      const tier2 = document.getElementById('sidebar-tier-2');
      if (tier1) tier1.style.display = 'none';
      if (tier2) tier2.style.display = 'block';

      // Update Tier 2 Project Box
      const p = getCurrentProject();
      if (p) {
        const codeEl = document.getElementById('tier2-proj-code');
        const titleEl = document.getElementById('tier2-proj-title');
        const clientEl = document.getElementById('tier2-proj-client');
        const selectEl = document.getElementById('tier2-project-select');

        if (codeEl) codeEl.innerText = p.code;
        if (titleEl) titleEl.innerText = p.name;
        if (clientEl) clientEl.innerText = '所屬客戶: ' + getClientName(p.clientId);
        if (selectEl) {
          selectEl.innerHTML = state.projects.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.code} ${x.name}</option>`).join('');
        }
      }

      syncToFirebase();
      renderAll();
      const tier2Pages = ['gantt', 'worklogs', 'tasks', 'issues'];
      let targetPage = state.currentPage;
      if (!targetPage || !tier2Pages.includes(targetPage) || !hasPermission(pagePermMap[targetPage])) {
        targetPage = tier2Pages.find(m => hasPermission(pagePermMap[m])) || 'gantt';
      }
      navTo(targetPage);
      showToast(`已進入專案空間：「${p ? p.name : projectId}」！`);
    }

    function exitProjectTier() {
      currentSidebarTier = 1;
      const tier1 = document.getElementById('sidebar-tier-1');
      const tier2 = document.getElementById('sidebar-tier-2');
      if (tier2) tier2.style.display = 'none';
      if (tier1) tier1.style.display = 'block';

      const defaultTier1Target = ['dashboard', 'projects', 'members', 'roles', 'clients'].find(m => hasPermission(pagePermMap[m])) || 'dashboard';
      navTo(defaultTier1Target);
      showToast('已返回企業總覽與內部管理');
    }

    function switchActiveProject(projectId) {
      if (!projectId) return;
      state.currentProjectId = projectId;
      syncToFirebase();
      renderAll();
      const p = state.projects.find(x => x.id === projectId);
      showToast(`已切換操作專案至：「${p ? p.name : projectId}」！`);
    }

    function getCurrentProject() {
      return state.projects.find(p => p.id === state.currentProjectId) || state.projects[0];
    }

    // ================= TIER 1 SEARCHABLE PROJECT DROPDOWN =================
    let isSidebarProjDropdownOpen = false;
    let sidebarProjSearchQuery = '';

    function toggleSidebarProjectDropdown(e) {
      if (e) e.stopPropagation();
      if (isSidebarProjDropdownOpen) {
        closeSidebarProjectDropdown();
      } else {
        openSidebarProjectDropdown();
      }
    }

    function openSidebarProjectDropdown() {
      isSidebarProjDropdownOpen = true;
      const panel = document.getElementById('sidebar-project-dropdown');
      const arrow = document.getElementById('sidebar-project-search-arrow');
      if (panel) panel.style.display = 'block';
      if (arrow) arrow.classList.add('open');
      renderSidebarProjectDropdownItems();
    }

    function closeSidebarProjectDropdown() {
      isSidebarProjDropdownOpen = false;
      const panel = document.getElementById('sidebar-project-dropdown');
      const arrow = document.getElementById('sidebar-project-search-arrow');
      if (panel) panel.style.display = 'none';
      if (arrow) arrow.classList.remove('open');
      updateSidebarProjectInputDisplay();
    }

    function updateSidebarProjectInputDisplay() {
      const input = document.getElementById('sidebar-project-search-input');
      const clearBtn = document.getElementById('sidebar-project-search-clear');
      const currP = getCurrentProject();
      if (!input) return;

      if (!isSidebarProjDropdownOpen) {
        if (sidebarProjSearchQuery) {
          input.value = sidebarProjSearchQuery;
          if (clearBtn) clearBtn.style.display = 'block';
        } else if (currP) {
          input.value = `${currP.code} ${currP.name}`;
          if (clearBtn) clearBtn.style.display = 'none';
        } else {
          input.value = '';
          if (clearBtn) clearBtn.style.display = 'none';
        }
      }
    }

    function onSidebarProjectSearchInput(val) {
      sidebarProjSearchQuery = (val || '').trim();
      const clearBtn = document.getElementById('sidebar-project-search-clear');
      if (clearBtn) clearBtn.style.display = sidebarProjSearchQuery ? 'block' : 'none';
      if (!isSidebarProjDropdownOpen) openSidebarProjectDropdown();
      renderSidebarProjectDropdownItems();
    }

    function clearSidebarProjectSearch(e) {
      if (e) e.stopPropagation();
      sidebarProjSearchQuery = '';
      const input = document.getElementById('sidebar-project-search-input');
      const clearBtn = document.getElementById('sidebar-project-search-clear');
      if (input) {
        input.value = '';
        input.focus();
      }
      if (clearBtn) clearBtn.style.display = 'none';
      renderSidebarProjectDropdownItems();
    }

    function handleSidebarProjectSearchKey(e) {
      if (e.key === 'Escape') {
        clearSidebarProjectSearch(e);
        closeSidebarProjectDropdown();
      } else if (e.key === 'Enter') {
        const filtered = getFilteredSidebarProjects();
        if (filtered.length > 0) {
          onSelectSidebarProject(filtered[0].id);
        }
      }
    }

    function getFilteredSidebarProjects() {
      const q = (sidebarProjSearchQuery || '').toLowerCase();
      if (!q) return state.projects || [];
      return (state.projects || []).filter(p => {
        const code = (p.code || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const client = (getClientName(p.clientId) || '').toLowerCase();
        return code.includes(q) || name.includes(q) || client.includes(q);
      });
    }

    function renderSidebarProjectDropdownItems() {
      const container = document.getElementById('sidebar-project-dropdown-items');
      if (!container) return;

      const filtered = getFilteredSidebarProjects();
      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="padding: 12px 8px; text-align: center; color: #64748b; font-size: 11px;">
            🔍 無符合的專案
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(p => {
        const isCurrent = p.id === state.currentProjectId;
        return `
          <div class="sidebar-proj-dropdown-item ${isCurrent ? 'active' : ''}" onclick="onSelectSidebarProject('${p.id}')">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:10px; font-family:monospace; color:#38bdf8; font-weight:700;">${p.code}</span>
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:10px; color:#94a3b8;">${getClientName(p.clientId)}</span>
                <span style="font-size:12px; color:#60a5fa; font-weight:800;">➜</span>
              </div>
            </div>
            <div style="font-size:12px; font-weight:600; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.name}">
              ${isCurrent ? '<span style="color:#10b981; font-size:10px; margin-right:4px;">●</span>' : ''}${p.name}
            </div>
          </div>
        `;
      }).join('');
    }

    function onSelectSidebarProject(projectId) {
      sidebarProjSearchQuery = '';
      closeSidebarProjectDropdown();
      enterProjectTier(projectId);
    }

    function renderSidebarProjectQuickList() {
      updateSidebarProjectInputDisplay();
      if (isSidebarProjDropdownOpen) {
        renderSidebarProjectDropdownItems();
      }
    }

    // Close project dropdown on outside click
    document.addEventListener('click', function(e) {
      const container = document.getElementById('sidebar-project-quick-list');
      if (container && !container.contains(e.target)) {
        if (isSidebarProjDropdownOpen) {
          closeSidebarProjectDropdown();
        }
      }
    });

    function updateProjectSelectors() {
      const currP = getCurrentProject();
      if (!currP) return;

      // 1. Render Tier 1 Quick project list
      renderSidebarProjectQuickList();

      // 2. Tier 2 Select & Banners
      const tier2Select = document.getElementById('tier2-project-select');
      if (tier2Select) {
        tier2Select.innerHTML = state.projects.map(p => 
          `<option value="${p.id}" ${p.id === currP.id ? 'selected' : ''}>${p.code} ${p.name}</option>`
        ).join('');
      }

      document.querySelectorAll('.banner-project-select').forEach(sel => {
        sel.innerHTML = state.projects.map(p => 
          `<option value="${p.id}" ${p.id === currP.id ? 'selected' : ''}>${p.code} ${p.name}</option>`
        ).join('');
      });

      // Update banner labels
      const clientName = getClientName(currP.clientId);
      ['gantt', 'worklogs', 'tasks', 'issues'].forEach(prefix => {
        const titleEl = document.getElementById(`${prefix}-banner-title`);
        const clientEl = document.getElementById(`${prefix}-banner-client`);
        if (titleEl) titleEl.innerText = `${currP.code} • ${currP.name}`;
        if (clientEl) clientEl.innerText = `(所屬客戶: ${clientName})`;
      });

      // Update Tier 2 info
      const codeEl = document.getElementById('tier2-proj-code');
      const titleEl = document.getElementById('tier2-proj-title');
      const clientEl = document.getElementById('tier2-proj-client');
      if (codeEl) codeEl.innerText = currP.code;
      if (titleEl) titleEl.innerText = currP.name;
      if (clientEl) clientEl.innerText = '所屬客戶: ' + clientName;
    }

    // Role Simulator
    function toggleRoleSimulator(isActive) {
      state.isSimulatorActive = isActive;
      showToast(isActive ? '已啟用測試角色 UI 模擬器' : '已關閉測試角色 UI 模擬器');
      renderAll();
    }

    const pagePermMap = {
      dashboard: 'dashboard_view',
      members: 'member_view',
      roles: 'role_view',
      clients: 'client_view',
      projects: 'proj_view',
      gantt: 'gantt_view',
      worklogs: 'worklog_view',
      tasks: 'task_view',
      issues: 'issue_view',
      holidays: 'role_view',
      departments: 'dept_view',
      salaries: 'salary_view'
    };

    function hasPermission(permissionKey) {
      if (state.isSimulatorActive && state.simulatedRoleId !== 'self') {
        const role = (state.roles || []).find(r => r && (r.id === state.simulatedRoleId || r.name === state.simulatedRoleId));
        if (!role) return true;
        if (isSystemAdminRole(role) || role.id === 'role-pm' || (role.name && role.name.includes('PM'))) return true;
        let perms = Array.isArray(role.permissions) ? role.permissions : (role.permissions ? Object.values(role.permissions) : []);
        
        // If simulated role is role-dept-manager or Department Manager
        if (state.simulatedRoleId === 'role-dept-manager' || state.simulatedRoleId === '部門主管') {
          const deptMgrRole = (state.roles || []).find(r => r && (r.id === 'role-dept-manager' || r.name === '部門主管'));
          if (deptMgrRole) {
            const deptPerms = Array.isArray(deptMgrRole.permissions) ? deptMgrRole.permissions : Object.values(deptMgrRole.permissions || {});
            perms = [...new Set([...perms, ...deptPerms])];
          }
        }
        return perms.includes(permissionKey);
      }

      if (currentAuthUser && currentAuthUser.memberInfo) {
        const member = currentAuthUser.memberInfo;
        const sysRole = getMemberSystemRole(member);
        
        // Admin or PM role gets full permissions
        if (member.id === 'user-admin' || (member.name && member.name.toLowerCase().includes('irene')) || isSystemAdminRole(sysRole) || sysRole?.id === 'role-pm' || sysRole?.name?.includes('PM')) {
          return true;
        }

        let perms = [];
        if (sysRole) {
          perms = Array.isArray(sysRole.permissions) ? sysRole.permissions : (sysRole.permissions ? Object.values(sysRole.permissions) : []);
        }

        if (isDepartmentManager(member) || sysRole?.id === 'role-dept-manager' || sysRole?.name === '部門主管') {
          const deptMgrRole = (state.roles || []).find(r => r && (r.id === 'role-dept-manager' || r.name === '部門主管'));
          if (deptMgrRole) {
            const deptPerms = Array.isArray(deptMgrRole.permissions) ? deptMgrRole.permissions : Object.values(deptMgrRole.permissions || {});
            perms = [...new Set([...perms, ...deptPerms])];
          }
        }

        return perms.includes(permissionKey);
      }
      return true;
    }

    function getCurrentUserName() {
      if (state.isSimulatorActive && state.simulatedRoleId !== 'self') {
        const simRole = state.roles.find(r => r.id === state.simulatedRoleId);
        if (simRole) {
          if (currentAuthUser && currentAuthUser.memberInfo && currentAuthUser.memberInfo.role === simRole.name) {
            return currentAuthUser.memberInfo.name;
          }
          const m = state.members.find(m => m.role === simRole.name);
          return m ? m.name : (currentAuthUser ? (currentAuthUser.memberInfo?.name || currentAuthUser.displayName) : simRole.name);
        }
      }
      return currentAuthUser ? (currentAuthUser.memberInfo?.name || currentAuthUser.displayName) : 'irene';
    }

    function getTaskAssignees(taskOrAssignees) {
      if (!taskOrAssignees) return [];
      if (Array.isArray(taskOrAssignees)) {
        return taskOrAssignees.filter(Boolean);
      }
      if (typeof taskOrAssignees === 'object') {
        if (Array.isArray(taskOrAssignees.assignees) && taskOrAssignees.assignees.length > 0) {
          return taskOrAssignees.assignees.filter(Boolean);
        }
        if (typeof taskOrAssignees.assignee === 'string' && taskOrAssignees.assignee.trim()) {
          return taskOrAssignees.assignee.split(/[,、，]/).map(s => s.trim()).filter(Boolean);
        }
        return [];
      }
      if (typeof taskOrAssignees === 'string') {
        return taskOrAssignees.split(/[,、，]/).map(s => s.trim()).filter(Boolean);
      }
      return [];
    }

    function getTaskEstimator(task) {
      if (!task) return '';
      if (typeof task === 'string') return task.trim();
      if (task.estimator && typeof task.estimator === 'string' && task.estimator.trim()) {
        return task.estimator.trim();
      }
      const assignees = getTaskAssignees(task);
      return assignees.length > 0 ? assignees[0] : '';
    }

    function checkSingleMemberMatchesCurrentUser(memberStr) {
      if (!memberStr) return false;
      const cleanAssignee = memberStr.trim().toLowerCase();

      // 1. 真實登入使用者比對
      if (currentAuthUser) {
        const authName = (currentAuthUser.displayName || '').trim().toLowerCase();
        const authEmail = (currentAuthUser.email || '').trim().toLowerCase();
        const memberInfo = currentAuthUser.memberInfo;
        const memberName = (memberInfo?.name || '').trim().toLowerCase();
        const memberEmail = (memberInfo?.email || '').trim().toLowerCase();

        if (authName && (cleanAssignee.includes(authName) || authName.includes(cleanAssignee))) return true;
        if (memberName && (cleanAssignee.includes(memberName) || memberName.includes(cleanAssignee))) return true;

        const assignedMember = state.members.find(m => {
          const mName = (m.name || '').trim().toLowerCase();
          return mName && (cleanAssignee.includes(mName) || mName.includes(cleanAssignee));
        });
        if (assignedMember) {
          if (memberInfo && memberInfo.id === assignedMember.id) return true;
          if (authEmail && assignedMember.email && authEmail === assignedMember.email.toLowerCase().trim()) return true;
          if (memberEmail && assignedMember.email && memberEmail === assignedMember.email.toLowerCase().trim()) return true;
        }
      }

      // 2. 測試角色切換 (Role Simulator) 模式比對
      if (state.isSimulatorActive && state.simulatedRoleId !== 'self') {
        const simRole = state.roles.find(r => r.id === state.simulatedRoleId);
        if (simRole) {
          const assignedMember = state.members.find(m => {
            const mName = (m.name || '').trim().toLowerCase();
            return mName && (cleanAssignee.includes(mName) || mName.includes(cleanAssignee));
          });
          if (assignedMember && (assignedMember.role === simRole.name || assignedMember.role.includes(simRole.name) || simRole.name.includes(assignedMember.role))) {
            return true;
          }
          if (state.simulatedRoleId === 'role-dev') {
            if (cleanAssignee.includes('工程師') || cleanAssignee.includes('sarah') || cleanAssignee.includes('kevin') || (assignedMember && assignedMember.role.includes('工程師'))) {
              return true;
            }
          }
          if (state.simulatedRoleId === 'role-ui') {
            if (cleanAssignee.includes('設計') || cleanAssignee.includes('ui') || (assignedMember && assignedMember.role.includes('設計'))) {
              return true;
            }
          }
          if (state.simulatedRoleId === 'role-qa') {
            if (cleanAssignee.includes('qa') || cleanAssignee.includes('測試') || (assignedMember && assignedMember.role.includes('測試'))) {
              return true;
            }
          }
        }
      }

      // 3. 一般文字模糊比對
      const currentUserName = getCurrentUserName();
      if (currentUserName && (currentUserName.toLowerCase().includes(cleanAssignee) || cleanAssignee.includes(currentUserName.toLowerCase()))) {
        return true;
      }

      return false;
    }

    function checkIsTaskAssignee(taskOrAssignees) {
      const assignees = getTaskAssignees(taskOrAssignees);
      if (assignees.length === 0) return false;
      return assignees.some(m => checkSingleMemberMatchesCurrentUser(m));
    }

    function checkIsTaskEstimator(taskOrEstimator) {
      const estimator = typeof taskOrEstimator === 'object' ? getTaskEstimator(taskOrEstimator) : (taskOrEstimator || '');
      if (!estimator) return false;
      return checkSingleMemberMatchesCurrentUser(estimator);
    }

    function isCurrentRoleManager() {
      if (state.isSimulatorActive && state.simulatedRoleId !== 'self') {
        return state.simulatedRoleId === 'role-pm' || state.simulatedRoleId === 'role-admin' || state.simulatedRoleId === 'role-dept-manager' || state.simulatedRoleId === '部門主管';
      }
      if (currentAuthUser && currentAuthUser.memberInfo) {
        const r = currentAuthUser.memberInfo.role;
        if (r.includes('PM') || r.includes('專案經理') || r.includes('管理員') || r.includes('主管')) return true;
        if (isDepartmentManager(currentAuthUser.memberInfo)) return true;
      }
      return true;
    }

    function isDepartmentManager(member) {
      if (!member) return false;
      const isManagerOfDept = (state.departments || []).some(d => 
        d.managerId === member.id || 
        d.managerName === member.name || 
        (member.name && d.managerName && d.managerName.includes(member.name)) ||
        (d.managerName && member.name && member.name.includes(d.managerName))
      );
      const isPmOrAdmin = member.role === '專案經理 (PM)' || member.role === '系統管理員' || member.role === 'PM';
      return isManagerOfDept || isPmOrAdmin;
    }

    function getDepartmentManagerName(dept) {
      if (!dept) return '未指定';
      if (dept.managerId) {
        const m = (state.members || []).find(x => x.id === dept.managerId);
        if (m && m.name) return m.name;
      }
      if (dept.managerName) {
        const m = (state.members || []).find(x => x.name === dept.managerName || (x.name && x.name.includes(dept.managerName)) || (dept.managerName && dept.managerName.includes(x.name)));
        if (m && m.name) return m.name;
        return dept.managerName;
      }
      return '未指定';
    }

    function getTaskBadgeClass(status) {
      if (status === '已完成') return 'badge-success';
      if (status === '待測試') return 'badge-purple';
      if (status === '進行中') return 'badge-info';
      if (status === '待執行') return 'badge-warning';
      if (status === '待評估') return 'badge-warning';
      return 'badge-slate'; // 規劃中
    }

    function applyRolePermissions() {
      // 1. Sidebar module buttons visibility
      const btnDashboard = document.getElementById('nav-btn-dashboard');
      const btnMembers = document.getElementById('nav-btn-members');
      const btnDepartments = document.getElementById('nav-btn-departments');
      const btnSalaries = document.getElementById('nav-btn-salaries');
      const btnRoles = document.getElementById('nav-btn-roles');
      const btnClients = document.getElementById('nav-btn-clients');
      const btnProjects = document.getElementById('nav-btn-projects');
      const btnGantt = document.getElementById('nav-btn-gantt');
      const btnWorklogs = document.getElementById('nav-btn-worklogs');
      const btnTasks = document.getElementById('nav-btn-tasks');
      const btnIssues = document.getElementById('nav-btn-issues');

      const canDashboard = hasPermission('dashboard_view');
      const canMembers = hasPermission('member_view');
      const canDepartments = hasPermission('dept_view');
      const canSalaries = hasPermission('salary_view');
      const canRoles = hasPermission('role_view');
      const canClients = hasPermission('client_view');
      const canProjects = hasPermission('proj_view');
      const canGantt = hasPermission('gantt_view');
      const canWorklogs = hasPermission('worklog_view');
      const canTasks = hasPermission('task_view');
      const canIssues = hasPermission('issue_view');

      if (btnDashboard) btnDashboard.style.display = canDashboard ? '' : 'none';
      if (btnMembers) btnMembers.style.display = canMembers ? '' : 'none';
      if (btnDepartments) btnDepartments.style.display = canDepartments ? '' : 'none';
      if (btnSalaries) btnSalaries.style.display = canSalaries ? '' : 'none';
      if (btnRoles) btnRoles.style.display = canRoles ? '' : 'none';
      if (btnClients) btnClients.style.display = canClients ? '' : 'none';
      if (btnProjects) btnProjects.style.display = canProjects ? '' : 'none';
      if (btnGantt) btnGantt.style.display = canGantt ? '' : 'none';
      if (btnWorklogs) btnWorklogs.style.display = canWorklogs ? '' : 'none';
      if (btnTasks) btnTasks.style.display = canTasks ? '' : 'none';
      if (btnIssues) btnIssues.style.display = canIssues ? '' : 'none';

      // 2. Section titles in Tier 1 & Tier 2
      const secInternal = document.getElementById('nav-section-internal');
      if (secInternal) secInternal.style.display = (canMembers || canDepartments || canSalaries || canRoles || canClients) ? '' : 'none';

      const secProject = document.getElementById('nav-section-project');
      if (secProject) secProject.style.display = canProjects ? '' : 'none';

      const quickList = document.getElementById('sidebar-project-quick-list');
      if (quickList) quickList.style.display = canProjects ? '' : 'none';

      const secTier2 = document.getElementById('nav-section-tier2');
      if (secTier2) secTier2.style.display = (canGantt || canWorklogs || canTasks || canIssues) ? '' : 'none';

      // If in Tier 2 and none of Tier 2 modules are permitted, exit to Tier 1
      if (currentSidebarTier === 2 && !canGantt && !canWorklogs && !canTasks && !canIssues) {
        exitProjectTier();
      }

      // 3. Current active page permission check
      const allPages = ['dashboard', 'members', 'roles', 'clients', 'projects', 'gantt', 'worklogs', 'tasks', 'issues', 'holidays', 'departments', 'salaries'];
      let activePage = allPages.find(p => {
        const el = document.getElementById('page-' + p);
        return el && el.style.display !== 'none';
      });

      if (activePage && pagePermMap[activePage] && !hasPermission(pagePermMap[activePage])) {
        const allowedPage = allPages.find(p => hasPermission(pagePermMap[p]));
        if (allowedPage) {
          navTo(allowedPage);
        } else {
          allPages.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) el.style.display = 'none';
          });
        }
      }

      // 4. Action buttons on pages
      const btnAddDept = document.getElementById('btn-add-department');
      if (btnAddDept) btnAddDept.style.display = hasPermission('dept_edit') ? '' : 'none';

      const btnAddProjDash = document.getElementById('btn-add-project-dash');
      if (btnAddProjDash) btnAddProjDash.style.display = hasPermission('proj_create') ? '' : 'none';

      const btnAddMember = document.getElementById('btn-add-member');
      if (btnAddMember) btnAddMember.style.display = hasPermission('member_create') ? '' : 'none';

      const btnAddRole = document.getElementById('btn-add-role');
      if (btnAddRole) btnAddRole.style.display = hasPermission('role_edit') ? '' : 'none';

      const btnAddClient = document.getElementById('btn-add-client');
      if (btnAddClient) btnAddClient.style.display = hasPermission('client_create') ? '' : 'none';

      const btnAddProjTable = document.getElementById('btn-add-project-table');
      if (btnAddProjTable) btnAddProjTable.style.display = hasPermission('proj_create') ? '' : 'none';

      const btnGanttAddPhase = document.getElementById('btn-gantt-add-phase');
      if (btnGanttAddPhase) btnGanttAddPhase.style.display = hasPermission('gantt_add_phase') ? '' : 'none';

      const btnGanttInlineAddPhase = document.getElementById('btn-gantt-inline-add-phase');
      if (btnGanttInlineAddPhase) btnGanttInlineAddPhase.style.display = hasPermission('gantt_add_phase') ? '' : 'none';

      const btnGanttExport = document.getElementById('btn-gantt-export');
      if (btnGanttExport) btnGanttExport.style.display = hasPermission('gantt_export') ? '' : 'none';

      const btnTasksExport = document.getElementById('btn-tasks-export');
      if (btnTasksExport) btnTasksExport.style.display = hasPermission('gantt_export') ? '' : 'none';

      const btnAddWorklog = document.getElementById('btn-add-worklog');
      if (btnAddWorklog) btnAddWorklog.style.display = hasPermission('worklog_create') ? '' : 'none';

      const btnAddTask = document.getElementById('btn-add-task');
      if (btnAddTask) btnAddTask.style.display = hasPermission('task_create') ? '' : 'none';

      const btnAddIssue = document.getElementById('btn-add-issue');
      if (btnAddIssue) btnAddIssue.style.display = hasPermission('issue_create') ? '' : 'none';

      updateTaskBasicFieldsPermissions();
    }

    function updateTaskBasicFieldsPermissions() {
      const taskId = document.getElementById('form-task-id')?.value;
      const status = document.getElementById('form-task-status')?.value || '規劃中';
      const isNewTask = !taskId;
      const isManager = isCurrentRoleManager();
      const canPublish = isManager || hasPermission('task_publish') || hasPermission('task_create') || hasPermission('task_edit');
      const isDraftOrPlanning = isNewTask || !status || status === '規劃中' || status === '草稿' || status.includes('規') || status.includes('草');

      const editable = isDraftOrPlanning && canPublish;

      const fieldIds = [
        'form-task-title-input',
        'form-task-type',
        'form-task-severity',
        'form-task-project',
        'form-task-phase',
        'form-task-module',
        'form-task-desc',
        'form-task-dept-1',
        'form-task-dept-2',
        'form-task-expected-date'
      ];

      fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.disabled = !editable;
        }
      });
    }

    function toggleRoleSimulator(checked) {
      state.isSimulatorActive = checked;
      const headerChk = document.getElementById('header-simulator-toggle');
      if (headerChk) headerChk.checked = checked;
      applyRolePermissions();
      renderAll();
      showToast(checked ? '角色權限模擬器已啟動' : '角色權限模擬器已關閉（全權限模式）');
    }

    function onRoleSimulatorChange(roleValue) {
      state.simulatedRoleId = roleValue;
      if (roleValue !== 'self') {
        state.isSimulatorActive = true;
        const headerChk = document.getElementById('header-simulator-toggle');
        if (headerChk) headerChk.checked = true;
      }
      const headerSelect = document.getElementById('header-role-simulator-select');
      const rolesPageSelect = document.getElementById('roles-page-simulator-select');
      if (headerSelect) headerSelect.value = roleValue;
      if (rolesPageSelect) rolesPageSelect.value = roleValue;

      const roleObj = state.roles.find(r => r.id === roleValue);
      const roleName = roleObj ? roleObj.name : '本人身分';
      showToast(`已切換視角身分至：「${roleName}」！`);
      applyRolePermissions();
      renderAll();
    }

    function updateRoleSimulatorOptions() {
      const headerSelect = document.getElementById('header-role-simulator-select');
      const rolesPageSelect = document.getElementById('roles-page-simulator-select');
      const currentVal = state.simulatedRoleId || 'self';
      const optionsHtml = '<option value="self">本人身分 (全端 PM / 登入身份)</option>' + 
        (state.roles || []).map(r => `<option value="${r.id}">${r.name}</option>`).join('');

      if (headerSelect) {
        headerSelect.innerHTML = optionsHtml;
        headerSelect.value = currentVal;
      }
      if (rolesPageSelect) {
        rolesPageSelect.innerHTML = optionsHtml;
        rolesPageSelect.value = currentVal;
      }
    }

    // ================= HTML5 History API 乾淨路由輔助函式 =================
    function getPathFromPage(pageId) {
      if (pageId === 'dashboard') return '/';
      if (pageId === 'tasks') return '/board';
      return '/' + pageId;
    }

    function getPageFromPath(pathname) {
      if (!pathname) return null;
      let clean = pathname.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
      if (!clean || clean === 'index.html' || clean === 'dashboard') return 'dashboard';

      const validPages = ['dashboard', 'members', 'roles', 'clients', 'projects', 'gantt', 'worklogs', 'tasks', 'issues', 'holidays', 'departments', 'salaries'];
      if (validPages.includes(clean)) return clean;

      // 友好別名對應 (如 /board -> tasks)
      if (clean === 'board' || clean === 'task' || clean === 'kanban') return 'tasks';
      if (clean === 'worklog' || clean === 'timesheet') return 'worklogs';
      if (clean === 'issue' || clean === 'bugs' || clean === 'bug') return 'issues';
      if (clean === 'member' || clean === 'employee' || clean === 'users') return 'members';
      if (clean === 'role' || clean === 'permissions') return 'roles';
      if (clean === 'client' || clean === 'customer') return 'clients';
      if (clean === 'project' || clean === 'proj') return 'projects';
      if (clean === 'holiday' || clean === 'calendar') return 'holidays';
      if (clean === 'department' || clean === 'dept' || clean === 'departments') return 'departments';
      if (clean === 'salary' || clean === 'salaries' || clean === 'cost') return 'salaries';

      return null;
    }

    function updateBrowserUrl(pageId) {
      if (typeof window === 'undefined' || !window.history || !window.history.pushState) return;
      if (window.location.protocol === 'file:') return; // 本機檔案模式跳過 pushState 以免安全性報錯
      const targetPath = getPathFromPage(pageId);
      if (window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ pageId: pageId }, '', targetPath);
        } catch (e) {
          console.warn('HTML5 pushState warning:', e);
        }
      }
    }

    // Navigation (支援 pushState 歷史紀錄更新)
    function navTo(pageId, btn, push = true) {
      if (pagePermMap[pageId] && !hasPermission(pagePermMap[pageId])) {
        showToast('您目前的角色無權限訪問該模組！');
        return;
      }
      state.currentPage = pageId;

      if (['dashboard', 'members', 'roles', 'clients', 'projects', 'holidays', 'departments', 'salaries'].includes(pageId)) {
        if (currentSidebarTier === 2) {
          currentSidebarTier = 1;
          const tier1 = document.getElementById('sidebar-tier-1');
          const tier2 = document.getElementById('sidebar-tier-2');
          if (tier2) tier2.style.display = 'none';
          if (tier1) tier1.style.display = 'block';
        }
      } else if (['gantt', 'worklogs', 'tasks', 'issues'].includes(pageId)) {
        if (currentSidebarTier === 1) {
          currentSidebarTier = 2;
          const tier1 = document.getElementById('sidebar-tier-1');
          const tier2 = document.getElementById('sidebar-tier-2');
          if (tier1) tier1.style.display = 'none';
          if (tier2) tier2.style.display = 'block';
          updateProjectSelectors();
        }
      }

      const pages = ['dashboard', 'members', 'roles', 'clients', 'projects', 'gantt', 'worklogs', 'tasks', 'issues', 'holidays', 'departments', 'salaries'];
      pages.forEach(p => {
        const el = document.getElementById('page-' + p);
        if (el) el.style.display = 'none';
      });
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

      const target = document.getElementById('page-' + pageId);
      if (target) target.style.display = (pageId === 'gantt') ? 'flex' : 'block';

      const targetBtn = btn || document.getElementById('nav-btn-' + pageId);
      if (targetBtn) targetBtn.classList.add('active');

      if (pageId === 'gantt') renderGraphicalGantt();
      if (pageId === 'tasks') renderTasksTable();
      if (pageId === 'worklogs') renderWorkLogsTable();
      if (pageId === 'issues') renderIssuesTable();
      if (pageId === 'holidays') renderHolidaysTable();
      if (pageId === 'departments') renderDepartmentsTable();
      if (pageId === 'salaries') renderSalariesPage();

      if (push) {
        updateBrowserUrl(pageId);
      }
    }

    // 初始化路由與綁定 popstate 事件
    function initRoute() {
      // 綁定 window popstate 支援瀏覽器上一頁與下一頁操作
      window.addEventListener('popstate', (event) => {
        const pageId = (event.state && event.state.pageId) || getPageFromPath(window.location.pathname) || 'dashboard';
        navTo(pageId, null, false);
      });

      // 初始化時解析 window.location.pathname
      const targetPage = getPageFromPath(window.location.pathname);
      if (targetPage && targetPage !== 'dashboard') {
        if (['gantt', 'worklogs', 'tasks', 'issues'].includes(targetPage)) {
          if (!state.currentProjectId && state.projects && state.projects.length) {
            state.currentProjectId = state.projects[0].id;
          }
        }
        navTo(targetPage, null, false);
      } else {
        navTo('dashboard', null, false);
      }
    }

    function renderAll(skipCloudSync = false) {
      try { sanitizeJobGradesAndMembers(); } catch (e) { console.error('sanitizeJobGradesAndMembers error:', e); }
      try { state.tasks = getFlatTasks(); } catch (e) { console.error('getFlatTasks error:', e); }
      try { recalculateActualHoursFromWorkLogs(); } catch (e) { console.error('recalculateActualHours error:', e); }
      try {
        updateRoleSimulatorOptions();
        applyRolePermissions();
        updateProjectSelectors();
        updateBadges();
      } catch (e) { console.error('UI update error:', e); }

      try { if (!currentAuthUser) initAuthUser(); } catch (e) { console.error('initAuthUser error:', e); }

      try { renderDashboard(); } catch (e) { console.error('renderDashboard error:', e); }
      try { renderMembersTable(); } catch (e) { console.error('renderMembersTable error:', e); }
      try { renderRolesTable(); } catch (e) { console.error('renderRolesTable error:', e); }
      try { renderClientsTable(); } catch (e) { console.error('renderClientsTable error:', e); }
      try { renderProjectsTable(); } catch (e) { console.error('renderProjectsTable error:', e); }
      try { renderGraphicalGantt(); } catch (e) { console.error('renderGraphicalGantt error:', e); }
      try { renderWorkLogsTable(); } catch (e) { console.error('renderWorkLogsTable error:', e); }
      try { renderTasksTable(); } catch (e) { console.error('renderTasksTable error:', e); }
      try { renderIssuesTable(); } catch (e) { console.error('renderIssuesTable error:', e); }
      try { renderHolidaysTable(); } catch (e) { console.error('renderHolidaysTable error:', e); }
      try { renderDepartmentsTable(); } catch (e) { console.error('renderDepartmentsTable error:', e); }
      try { renderSalariesPage(); } catch (e) { console.error('renderSalariesPage error:', e); }

      if (!skipCloudSync) {
        try { syncToFirebase(); } catch (e) { console.error('syncToFirebase error:', e); }
      }
    }

    function recalculateActualHoursFromWorkLogs() {
      state.tasks.forEach(task => {
        const logs = (state.workLogs || []).filter(w => w.taskId === task.id && Number(w.hours) > 0);
        if (logs.length > 0) {
          const sum = logs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
          task.actHours = sum;

          // 滾動調整實際開始日為第一筆填寫工時之日期
          const dates = logs.map(l => l.date).filter(Boolean).sort();
          if (dates.length > 0) {
            task.startDate = dates[0];
          }

          // 執行者填寫工時後自動將狀態切換為「進行中」
          if (['待執行', '規劃中', '待評估'].includes(task.status)) {
            task.status = '進行中';
          }
        }
      });
    }

    function updateBadges() {
      const currP = getCurrentProject();
      const pTasks = state.tasks.filter(t => t.projectId === currP.id);
      const pIssues = state.issues.filter(i => i.projectId === currP.id);
      const pLogs = state.workLogs.filter(l => {
        const t = state.tasks.find(x => x.id === l.taskId);
        return t && t.projectId === currP.id;
      });

      document.getElementById('badge-members-count').innerText = state.members.length;
      document.getElementById('badge-roles-count').innerText = state.roles.length;
      document.getElementById('badge-clients-count').innerText = state.clients.length;
      document.getElementById('badge-projects-count').innerText = state.projects.length;
      const badgeHolidays = document.getElementById('badge-holidays-count');
      if (badgeHolidays) badgeHolidays.innerText = (state.holidays || []).length;
      const badgeDepts = document.getElementById('badge-departments-count');
      if (badgeDepts) badgeDepts.innerText = (state.departments || []).length;
      const badgeSalaries = document.getElementById('badge-salaries-count');
      if (badgeSalaries) badgeSalaries.innerText = (state.members || []).length;
      const badgeTasks = document.getElementById('badge-tasks-count');
      const badgeWorklogs = document.getElementById('badge-worklogs-count');
      const badgeIssues = document.getElementById('badge-issues-count');
      if (badgeTasks) badgeTasks.innerText = pTasks.length;
      if (badgeWorklogs) badgeWorklogs.innerText = pLogs.length;
      if (badgeIssues) badgeIssues.innerText = pIssues.length;

      // Tier 2 Sidebar Badges
      const t2Logs = document.getElementById('tier2-badge-worklogs');
      const t2Tasks = document.getElementById('tier2-badge-tasks');
      const t2Issues = document.getElementById('tier2-badge-issues');
      if (t2Logs) t2Logs.innerText = pLogs.length;
      if (t2Tasks) t2Tasks.innerText = pTasks.length;
      if (t2Issues) t2Issues.innerText = pIssues.length;

      // Filter tabs in Tasks Page
      document.getElementById('tab-cnt-all').innerText = pTasks.length;
      document.getElementById('tab-cnt-feature').innerText = pTasks.filter(t => (t.type || '功能') === '功能').length;
      document.getElementById('tab-cnt-opt').innerText = pTasks.filter(t => t.type === '優化').length;
      document.getElementById('tab-cnt-bug').innerText = pTasks.filter(t => t.type === 'Bug').length;
      document.getElementById('tab-cnt-cr').innerText = pTasks.filter(t => t.type === '需求變更').length;
    }

    // Getters
    function getClientName(clientId) {
      const c = state.clients.find(x => x.id === clientId);
      return c ? c.name : (clientId || '未知客戶');
    }

    function getProjectName(projectId) {
      const p = state.projects.find(x => x.id === projectId);
      return p ? p.name : (projectId || '未知專案');
    }

    function getMemberName(memberId) {
      const m = state.members.find(x => x.id === memberId);
      return m ? m.name : memberId;
    }

    function getTaskTitle(taskId) {
      if (!taskId) return '';
      const t = state.tasks.find(x => x.id === taskId);
      return t ? t.title : taskId;
    }

    // Modal Helpers
    function openModal(id) {
      const m = document.getElementById(id);
      if (m) m.classList.add('open');
    }
    function closeModal(id) {
      if (id === 'modal-task' && typeof closeDateRangePicker === 'function') {
        closeDateRangePicker();
      }
      const m = document.getElementById(id);
      if (m) m.classList.remove('open');
    }
    function handleOverlayClick(e, id) {
      // 點擊彈窗外部區域不自動關閉彈窗（須點擊 ✕ 或取消按鈕），防止編輯中途誤觸關閉
      return;
    }

    // ================= 1. DASHBOARD =================
    function renderDashboard() {
      const delayedProjects = state.projects.filter(p => p.status !== '已完工' && p.targetEndDate && TODAY > p.targetEndDate);
      const banner = document.getElementById('dashboard-delay-banner');
      if (delayedProjects.length > 0) {
        banner.style.display = 'block';
        banner.innerHTML = `
          <div style="font-weight:800; color:#9f1239; font-size:13px;">⚠️ 專案進度延誤警示 (目前有 ${delayedProjects.length} 個主專案已逾期)</div>
          ${delayedProjects.map(p => `
            <div style="margin-top:4px; font-size:12px; color:#be123c;">
              • 主專案 <strong>${p.name} (${p.code})</strong> 預計完工日為 <strong>${p.targetEndDate}</strong>！
            </div>
          `).join('')}
        `;
      } else {
        banner.style.display = 'none';
      }

      document.getElementById('kpi-clients').innerText = state.clients.length;
      document.getElementById('kpi-members').innerText = state.members.length;
      document.getElementById('kpi-projects').innerText = state.projects.filter(p => p.status === '進行中').length;
      document.getElementById('kpi-delayed').innerText = delayedProjects.length;
      document.getElementById('kpi-bugs').innerText = state.issues.filter(i => i.status !== '已關閉' && i.status !== '已修復').length;

      const totalLoggedHours = state.workLogs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
      document.getElementById('kpi-worklogs-hours').innerText = totalLoggedHours + 'h';

      const container = document.getElementById('dashboard-project-cards');
      container.innerHTML = state.projects.map(p => {
        const pTasks = state.tasks.filter(t => t.projectId === p.id);
        const estH = pTasks.reduce((acc, t) => acc + (Number(t.estHours) || 0), 0);
        const actH = pTasks.reduce((acc, t) => acc + (Number(t.actHours) || 0), 0);
        const doneTasks = pTasks.filter(t => t.status === '已完成').length;
        const progress = pTasks.length > 0 ? Math.round((doneTasks / pTasks.length) * 100) : 0;
        const isCurrent = p.id === state.currentProjectId;

        const pBugs = state.issues.filter(i => i.projectId === p.id && i.status !== '已關閉').length;
        const pCRs = pTasks.filter(t => t.type === '需求變更' && t.status !== '已完成').length;

        const teamMemberNames = (p.teamMembers || []).map(id => getMemberName(id)).join(', ');

        return `
          <div class="card" style="border:${isCurrent ? '2px solid #3b82f6' : '1px solid #e2e8f0'}; position:relative;">
            ${isCurrent ? `<span style="position:absolute; top:12px; right:12px; background:#eff6ff; color:#2563eb; font-weight:800; font-size:11px; padding:2px 8px; border-radius:4px; border:1px solid #bfdbfe;">★ 目前操作專案</span>` : ''}
            <div style="margin-bottom:12px;">
              <div style="font-size:11px; font-family:monospace; font-weight:700; color:var(--primary);">${p.code} • ${getClientName(p.clientId)}</div>
              <h3 style="font-size:16px; font-weight:800; margin-top:3px; color:#0f172a;">${p.name}</h3>
              <div style="font-size:11px; color:#64748b; margin-top:4px;">👥 專案團隊: <strong>${teamMemberNames || 'irene, 陳專案經理, 林資深工程師, 王UI設計師, 黃系統架構師'}</strong></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:4px;">
                <span>整體完工進度</span><span>${progress}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progress}%;"></div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:16px; padding-top:16px; border-top:1px solid #f1f5f9; text-align:center; font-size:12px;">
              <div style="background:#f8fafc; padding:8px; border-radius:6px;">
                <div style="font-weight:800; font-family:monospace;">${actH} / ${estH || 392}h</div>
                <div style="font-size:10px; color:#64748b;">預估 vs 實際工時</div>
              </div>
              <div style="background:#fffbeb; padding:8px; border-radius:6px; cursor:pointer;" onclick="navTo('issues')">
                <div style="font-weight:800; color:var(--warning);">${pBugs} 個</div>
                <div style="font-size:10px; color:#b45309;">未解決 Bug</div>
              </div>
              <div style="background:#eff6ff; padding:8px; border-radius:6px; cursor:pointer;" onclick="navTo('tasks')">
                <div style="font-weight:800; color:var(--primary);">${pCRs} 件</div>
                <div style="font-size:10px; color:#1e40af;">進行中 CR</div>
              </div>
            </div>

            <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
              ${hasPermission('proj_edit') ? `<button class="btn btn-secondary btn-sm" onclick="editProject('${p.id}')">編輯專案</button>` : ''}
              <button class="btn btn-primary btn-sm" onclick="enterProjectTier('${p.id}')">進入專案工作區 ➜</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // ================= 2. MEMBERS MANAGEMENT =================
    function renderMembersTable() {
      try {
        const tbody = document.getElementById('members-table-body');
        if (!tbody) return;
        const members = state.members || [];
        tbody.innerHTML = members.map(m => {
          if (!m) return '';
          const assignedProjects = (state.projects || []).filter(p => (p.teamMembers || []).includes(m.id));
          const dept = (state.departments || []).find(d => 
            d.id === m.departmentId || d.code === m.departmentId || d.name === m.departmentId || d.name === m.departmentName
          );
          const managedDept = (state.departments || []).find(d => 
            d.managerId === m.id || (d.managerName && m.name && (d.managerName === m.name || d.managerName.includes(m.name) || m.name.includes(d.managerName)))
          );
          const effectiveDept = dept || managedDept;
          const isDeptManager = !!managedDept && (!dept || managedDept.id === dept.id);

          const deptBadgeHtml = effectiveDept ? 
            `<span class="badge ${isDeptManager ? 'badge-warning' : 'badge-info'}" style="font-size:11px; font-weight:700;">${isDeptManager ? '👑 部門主管' : '👤 部門成員'} (${effectiveDept.code || 'DEPT'})</span><div style="font-size:11px; color:#64748b; margin-top:2px;">${effectiveDept.name}</div>` : 
            '<span style="color:#94a3b8; font-size:12px;">未分派部門</span>';

          const sysRole = getMemberSystemRole(m);
          const grade = getMemberJobGrade(m);
          const metrics = calculateJobGradeMetrics(grade || { monthlySalary: 60000 });

          return `
            <tr>
              <td>
                <div style="font-weight:700; color:#0f172a;">${m.name || '未命名'}</div>
                <div style="font-size:11px; color:#94a3b8; font-family:monospace;">ID: ${m.id}</div>
              </td>
              <td>${deptBadgeHtml}</td>
              <td>
                <span class="badge badge-purple" style="font-weight:700;">🔑 ${sysRole ? sysRole.name : (m.role || '一般成員')}</span>
              </td>
              <td style="font-family:monospace; font-weight:700; color:#047857;">
                NT$ ${metrics.monthlySalary.toLocaleString()} <small style="color:#64748b; font-weight:normal;">/月</small>
                <div style="font-size:11px; color:#2563eb; font-weight:normal;">[${grade ? grade.category : '職級'}] ${grade ? grade.name : '標準職級'} (人/時成本 NT$ ${metrics.overheadHourlyCost}/h)</div>
              </td>
              <td style="font-family:monospace; color:#2563eb;">${m.email || '-'}</td>
              <td style="font-family:monospace; color:#475569;">${m.phone || '-'}</td>
              <td>
                <span class="badge badge-slate">${assignedProjects.length} 個專案</span>
              </td>
              <td style="text-align: right;">
                ${hasPermission('member_edit') ? `<button class="btn btn-secondary btn-xs" onclick="editMember('${m.id}')">編輯</button>` : ''}
                ${hasPermission('member_delete') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteMember('${m.id}')">刪除</button>` : ''}
              </td>
            </tr>
          `;
        }).join('');
      } catch (e) {
        console.error('Error rendering members table:', e);
      }
    }

    function openMemberModal(id = null) {
      try {
        document.getElementById('form-member-id').value = id || '';
        document.getElementById('modal-member-title').innerText = id ? '編輯員工成員資料' : '新增團隊員工 / 成員';

        // 1. Populate Field A: System Role (系統操作權限)
        const roleSelect = document.getElementById('form-member-role');
        if (roleSelect) {
          const roles = state.roles || [];
          roleSelect.innerHTML = roles.map(r => `<option value="${r.id}">🔑 ${r.name}</option>`).join('');
        }

        // 2. Populate Field B: Salary Grade (薪資職級)
        const gradeSelect = document.getElementById('form-member-jobgrade');
        if (gradeSelect) {
          const grades = state.jobGrades || getDefaultJobGrades();
          gradeSelect.innerHTML = grades.map(g => {
            const m = calculateJobGradeMetrics(g);
            return `<option value="${g.id}">[${g.category}] ${g.name} (月薪 NT$ ${m.monthlySalary.toLocaleString()} | 人時成本 NT$ ${m.overheadHourlyCost}/h)</option>`;
          }).join('');
        }

        // 3. Populate Department select
        const deptSelect = document.getElementById('form-member-department');
        if (deptSelect) {
          deptSelect.innerHTML = '<option value="">-- 未指派部門 --</option>' +
            (state.departments || []).map(d => `<option value="${d.id}">${d.name} (${d.code})</option>`).join('');
        }

        if (id) {
          const m = (state.members || []).find(x => x.id === id);
          if (m) {
            document.getElementById('form-member-name').value = m.name || '';
            const sysRole = getMemberSystemRole(m);
            if (roleSelect && sysRole) roleSelect.value = sysRole.id;
            const grade = getMemberJobGrade(m);
            if (gradeSelect && grade) gradeSelect.value = grade.id;
            if (deptSelect) deptSelect.value = m.departmentId || '';
            document.getElementById('form-member-email').value = m.email || '';
            document.getElementById('form-member-phone').value = m.phone || '';
          }
        } else {
          document.getElementById('form-member-name').value = '';
          if (roleSelect && state.roles && state.roles[0]) {
            roleSelect.value = state.roles[0].id;
          }
          if (gradeSelect && state.jobGrades && state.jobGrades[0]) {
            gradeSelect.value = state.jobGrades[0].id;
          }
          if (deptSelect) deptSelect.value = '';
          document.getElementById('form-member-email').value = '';
          document.getElementById('form-member-phone').value = '';
        }
        openModal('modal-member');
      } catch (e) {
        console.error('Error opening member modal:', e);
      }
    }

    function saveMember() {
      try {
        const id = document.getElementById('form-member-id').value;
        const name = document.getElementById('form-member-name').value.trim();
        
        // Field A: System Role
        const systemRoleId = document.getElementById('form-member-role')?.value || '';
        const roleObj = (state.roles || []).find(r => r.id === systemRoleId || r.name === systemRoleId) || (state.roles || [])[0];
        const role = roleObj ? roleObj.name : '一般成員';

        // Field B: Salary Job Grade
        const jobGradeId = document.getElementById('form-member-jobgrade')?.value || '';
        const gradeObj = (state.jobGrades || []).find(g => g.id === jobGradeId) || (state.jobGrades || [])[0];
        const metrics = calculateJobGradeMetrics(gradeObj || { monthlySalary: 60000 });
        const monthlySalary = metrics.monthlySalary;
        const hourlyRate = metrics.overheadHourlyCost;

        const departmentId = document.getElementById('form-member-department')?.value || '';
        const deptObj = (state.departments || []).find(d => d.id === departmentId || d.code === departmentId);
        const departmentName = deptObj ? deptObj.name : '';
        const email = document.getElementById('form-member-email').value.trim();
        const phone = document.getElementById('form-member-phone').value.trim();

        if (!name || !email) {
          alert('請填寫員工姓名與授權 Email！');
          return;
        }

        if (!Array.isArray(state.members)) state.members = [];

        if (id) {
          const m = state.members.find(x => x.id === id);
          if (m) {
            const oldName = m.name;

            // Check if this member is currently a manager of any department
            const managedDept = (state.departments || []).find(d => 
              d.managerId === id || (d.managerName && m.name && (d.managerName === m.name || d.managerName.includes(m.name)))
            );

            // If member is a manager and being transferred to a different department (or unassigned)
            if (managedDept && departmentId !== managedDept.id) {
              const ok = confirm(`該員工（${m.name}）目前擔任 [${managedDept.name}] 主管，調離部門將自動解除其主管職位，是否確認調動？`);
              if (!ok) return;

              // User confirmed: unassign manager from former department
              managedDept.managerId = '';
              managedDept.managerName = '';
            }

            m.name = name;
            m.systemRoleId = roleObj ? roleObj.id : systemRoleId;
            m.role = role;
            m.jobGradeId = gradeObj ? gradeObj.id : jobGradeId;
            m.salaryGradeId = gradeObj ? gradeObj.id : jobGradeId;
            m.departmentId = departmentId;
            m.departmentName = departmentName;
            m.monthlySalary = monthlySalary;
            m.hourlyRate = hourlyRate;
            m.email = email;
            m.phone = phone;

            // Synchronize department managerName & managerId if this member is still a manager
            (state.departments || []).forEach(d => {
              if (d.managerId === id || d.managerName === oldName || (oldName && d.managerName && d.managerName.includes(oldName))) {
                if (d.managerId === id) {
                  d.managerName = name;
                }
              }
            });

            // Synchronize tasks estimator / assignee if member name changed
            if (oldName && oldName !== name) {
              (state.phases || []).forEach(phase => {
                (phase.modules || []).forEach(mod => {
                  (mod.tasks || []).forEach(t => {
                    if (t.estimator && (t.estimator === oldName || t.estimator.includes(oldName))) {
                      t.estimator = t.estimator.replace(oldName, name);
                    }
                    if (t.assignee && (t.assignee === oldName || t.assignee.includes(oldName))) {
                      t.assignee = t.assignee.replace(oldName, name);
                    }
                    if (Array.isArray(t.assignees)) {
                      t.assignees = t.assignees.map(a => a === oldName ? name : a);
                    }
                  });
                });
              });
            }
          }
          showToast('員工資料已成功更新！');
        } else {
          state.members.push({
            id: 'user-' + Date.now(),
            name,
            systemRoleId: roleObj ? roleObj.id : systemRoleId,
            role,
            jobGradeId: gradeObj ? gradeObj.id : jobGradeId,
            salaryGradeId: gradeObj ? gradeObj.id : jobGradeId,
            departmentId,
            departmentName,
            monthlySalary,
            hourlyRate,
            email,
            phone,
            effectiveDate: TODAY,
            salaryNotes: ''
          });
          showToast('已新增團隊成員！');
        }

        sanitizeJobGradesAndMembers();
        syncToFirebase();
        closeModal('modal-member');
        renderAll();
      } catch (e) {
        console.error('Error in saveMember:', e);
        alert('儲存員工資料發生異常，請重試！');
      }
    }

    function editMember(id) { openMemberModal(id); }
    function deleteMember(id) {
      if (confirm('確定要刪除此成員嗎？')) {
        state.members = state.members.filter(m => m.id !== id);
        renderAll();
        showToast('成員已刪除');
      }
    }

    // ================= 2.1 DEPARTMENT MANAGEMENT (部門管理) =================
    let currentDeptPermTab = 'mgr'; // 'mgr' or 'emp'

    function renderDepartmentsTable() {
      const tbody = document.getElementById('departments-table-body');
      if (!tbody) return;
      tbody.innerHTML = (state.departments || []).map(dept => {
        const managerName = getDepartmentManagerName(dept);
        const deptMembers = (state.members || []).filter(m => 
          m.departmentId === dept.id || 
          m.departmentName === dept.name || 
          m.departmentId === dept.code ||
          dept.managerId === m.id ||
          (dept.managerName && m.name && (dept.managerName === m.name || dept.managerName.includes(m.name)))
        );

        return `
          <tr>
            <td>
              <div style="font-weight:700; color:#0f172a; font-size:14px;">${dept.name}</div>
            </td>
            <td>
              <span class="badge badge-warning" style="font-weight:700;">👑 ${managerName}</span>
            </td>
            <td>
              <span class="badge badge-info" style="font-size:12px;">👥 ${deptMembers.length} 位成員</span>
            </td>
            <td style="text-align: right;">
              ${hasPermission('dept_edit') ? `<button class="btn btn-secondary btn-xs" onclick="openDepartmentModal('${dept.id}')">編輯</button>` : ''}
              ${hasPermission('dept_edit') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteDepartment('${dept.id}')">刪除</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    }

    function switchDeptPermTab(tabType) {
      // Legacy fallback
    }

    function buildPermMatrixHtml(prefix, selectedPerms = []) {
      return '';
    }

    function toggleDeptGroupCheckboxes(prefix, groupName, isCheck) {
      // Legacy fallback
    }

    function openDepartmentModal(id = null) {
      document.getElementById('form-dept-id').value = id || '';
      const titleEl = document.getElementById('modal-dept-title');
      const delBtn = document.getElementById('btn-delete-dept');
      if (titleEl) titleEl.innerText = id ? '🏛️ 編輯部門主管設定' : '🏛️ 新增部門與主管設定';
      if (delBtn) delBtn.style.display = id ? 'inline-block' : 'none';

      const mgrSelect = document.getElementById('form-dept-manager');
      let dept = id ? (state.departments || []).find(d => d.id === id) : null;

      if (dept) {
        document.getElementById('form-dept-name').value = dept.name || '';

        // Filter members belonging strictly to this department
        const deptMembers = (state.members || []).filter(m => 
          m && (m.departmentId === dept.id || m.departmentName === dept.name || m.departmentId === dept.code)
        );

        if (mgrSelect) {
          if (deptMembers.length > 0) {
            mgrSelect.disabled = false;
            mgrSelect.innerHTML = '<option value="">-- 待指定主管 --</option>' + 
              deptMembers.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join('');
            mgrSelect.value = dept.managerId || '';
          } else {
            mgrSelect.disabled = true;
            mgrSelect.innerHTML = '<option value="" selected>（此部門尚無成員，請先至員工管理指派成員）</option>';
          }
        }
      } else {
        // Creating a new department - no members belong to a non-existent department yet
        document.getElementById('form-dept-name').value = '';
        if (mgrSelect) {
          mgrSelect.disabled = true;
          mgrSelect.innerHTML = '<option value="" selected>（新建立部門尚無成員，建立後請先至員工管理指派成員）</option>';
        }
      }

      openModal('modal-department');
    }

    function saveDepartment() {
      const id = document.getElementById('form-dept-id').value;
      const name = document.getElementById('form-dept-name').value.trim();
      const mgrSelect = document.getElementById('form-dept-manager');
      const managerId = (!mgrSelect || mgrSelect.disabled) ? '' : (mgrSelect.value || '');
      const managerObj = managerId ? (state.members || []).find(m => m.id === managerId) : null;
      const managerName = managerObj ? managerObj.name : '';

      if (!name) {
        alert('請填寫部門名稱！');
        return;
      }

      if (!state.departments) state.departments = [];

      let dept;
      if (id) {
        dept = state.departments.find(d => d.id === id);
        if (dept) {
          const oldName = dept.name;
          dept.name = name;
          dept.managerId = managerId;
          dept.managerName = managerName;

          // Update member departmentName references
          (state.members || []).forEach(m => {
            if (m.departmentId === id || m.departmentName === oldName) {
              m.departmentName = name;
            }
          });
        }
        showToast(`部門「${name}」主管與設定已成功更新！`);
      } else {
        const code = 'DEPT-' + (state.departments.length + 1);
        dept = {
          id: 'dept-' + Date.now(),
          code,
          name,
          managerId,
          managerName
        };
        state.departments.push(dept);
        showToast(`已成功建立部門「${name}」！`);
      }

      if (managerObj && dept) {
        managerObj.departmentId = dept.id;
        managerObj.departmentName = dept.name;
      }

      sanitizeDepartmentsAndMembers();
      syncToFirebase();
      closeModal('modal-department');
      renderAll();
    }

    function deleteDepartmentFromModal() {
      const id = document.getElementById('form-dept-id').value;
      if (id) deleteDepartment(id);
    }

    function deleteDepartment(id) {
      const dept = (state.departments || []).find(d => d.id === id);
      if (!dept) return;
      if (confirm(`確定要刪除部門「${dept.name} (${dept.code})」嗎？`)) {
        state.departments = state.departments.filter(d => d.id !== id);
        (state.members || []).forEach(m => {
          if (m.departmentId === id) {
            m.departmentId = '';
            m.departmentName = '';
          }
        });
        syncToFirebase();
        closeModal('modal-department');
        renderAll();
        showToast(`已刪除部門「${dept.name}」！`);
      }
    }

    // ================= 2.2 SALARY & COST MANAGEMENT (薪資與成本管理) =================
    let currentSalarySubTab = 'emp'; // 'emp', 'proj', 'dept'

    function switchSalarySubTab(tabName) {
      currentSalarySubTab = tabName;
      ['emp', 'proj', 'dept'].forEach(t => {
        const btn = document.getElementById('tab-salary-' + t);
        const sec = document.getElementById('salary-subtab-' + t);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (sec) sec.style.display = (t === tabName) ? 'block' : 'none';
      });
      renderSalariesPage();
    }

    function getDefaultJobGrades() {
      return [
        // 工程類
        { id: 'grade-eng-mgr', category: '工程類', name: '工程主管', monthlySalary: 100000 },
        { id: 'grade-eng-sr', category: '工程類', name: '資深工程師', monthlySalary: 80000 },
        { id: 'grade-eng-mid', category: '工程類', name: '一般工程師', monthlySalary: 60000 },
        { id: 'grade-eng-jr', category: '工程類', name: '助理工程師', monthlySalary: 45000 },
        // 前端類
        { id: 'grade-fe-mgr', category: '前端類', name: '前端主管', monthlySalary: 95000 },
        { id: 'grade-fe-sr', category: '前端類', name: '資深前端', monthlySalary: 78000 },
        { id: 'grade-fe-mid', category: '前端類', name: '一般前端', monthlySalary: 58000 },
        { id: 'grade-fe-jr', category: '前端類', name: '助理前端', monthlySalary: 42000 },
        // 設計類
        { id: 'grade-des-mgr', category: '設計類', name: '設計主管', monthlySalary: 90000 },
        { id: 'grade-des-sr', category: '設計類', name: '資深設計師', monthlySalary: 72000 },
        { id: 'grade-des-mid', category: '設計類', name: '一般設計師', monthlySalary: 52000 },
        { id: 'grade-des-jr', category: '設計類', name: '助理設計師', monthlySalary: 38000 },
        // 專案類
        { id: 'grade-pm-mgr', category: '專案類', name: '專案主管', monthlySalary: 95000 },
        { id: 'grade-pm-sr', category: '專案類', name: '資深專案', monthlySalary: 75000 },
        { id: 'grade-pm-mid', category: '專案類', name: '一般專案', monthlySalary: 58000 },
        { id: 'grade-pm-jr', category: '專案類', name: '助理專案', monthlySalary: 42000 }
      ];
    }

    function calculateJobGradeMetrics(grade) {
      const monthlySalary = Number(grade?.monthlySalary) || 0;
      const annualSalary = Math.round(monthlySalary * 13);
      const baseHourlyRate = Math.round(annualSalary / 1996.8); // annualSalary / (12 * 20.8 * 8)
      const dailyRate = baseHourlyRate * 8;
      const overheadHourlyCost = Math.round(baseHourlyRate * 1.4);
      const billingHourlyRate = Math.round(overheadHourlyCost * 1.5);
      const profitHourly = billingHourlyRate - overheadHourlyCost;
      const profitMargin = '33.33%';

      return {
        monthlySalary,
        annualSalary,
        dailyRate,
        baseHourlyRate,
        overheadHourlyCost,
        billingHourlyRate,
        profitHourly,
        profitMargin
      };
    }

    function getMemberSystemRole(m) {
      if (!m) return (state.roles || [])[0] || { id: 'role-pm', name: '專案經理 (PM)', permissions: [] };
      const roles = state.roles || [];

      // 1. Irene / Admin override (Ensures PM role)
      const nameLower = (m.name || '').toLowerCase();
      const emailLower = (m.email || '').toLowerCase();
      if (m.id === 'user-admin' || nameLower.includes('irene') || emailLower.includes('irene') || emailLower.includes('obizirene') || emailLower.includes('obilirene')) {
        const pmRole = roles.find(r => r.id === 'role-pm' || r.name.includes('PM') || r.name.includes('專案經理'));
        if (pmRole) return pmRole;
      }

      // 2. Check systemRoleId
      if (m.systemRoleId) {
        const found = roles.find(r => r.id === m.systemRoleId || r.name === m.systemRoleId);
        if (found) return found;
      }

      // 3. Check m.role matching state.roles
      if (m.role) {
        const found = roles.find(r => r.name === m.role || r.id === m.role || (m.role && m.role.includes(r.name)) || (r.name && r.name.includes(m.role)));
        if (found) return found;
      }

      return roles.find(r => r.id === 'role-pm') || roles[0] || { id: 'role-pm', name: '專案經理 (PM)', permissions: [] };
    }

    function getMemberJobGrade(m) {
      if (!m) return null;
      const grades = state.jobGrades || getDefaultJobGrades();

      // 1. Explicit ID match
      const targetId = m.jobGradeId || m.salaryGradeId;
      if (targetId) {
        const found = grades.find(g => g.id === targetId);
        if (found) return found;
      }

      // 2. Explicit Job Grade Name match
      if (m.jobGradeName) {
        const found = grades.find(g => g.name === m.jobGradeName);
        if (found) return found;
      }

      // 3. Map System Role to reasonable default Job Grade if not assigned
      if (m.role) {
        if (m.role.includes('PM') || m.role.includes('專案經理')) {
          const found = grades.find(g => g.id === 'grade-pm-mgr' || g.name === '專案主管');
          if (found) return found;
        }
        if (m.role.includes('部門主管')) {
          const found = grades.find(g => g.id === 'grade-eng-mgr' || g.name === '工程主管');
          if (found) return found;
        }
        const found = grades.find(g => g.name === m.role || (m.role && m.role.includes(g.name)) || (g.name && g.name.includes(m.role)));
        if (found) return found;
      }

      return grades[0] || null;
    }

    function sanitizeJobGradesAndMembers() {
      try {
        if (!state.jobGrades || state.jobGrades.length === 0) {
          state.jobGrades = getDefaultJobGrades();
        }
        if (!Array.isArray(state.members)) {
          state.members = [];
        }
        state.members.forEach(m => {
          if (!m) return;

          // Ensure Irene is obizirene@gmail.com with systemRoleId = 'role-pm'
          if (m.id === 'user-admin' || (m.name && m.name.toLowerCase().includes('irene'))) {
            m.email = 'obizirene@gmail.com';
            m.systemRoleId = 'role-pm';
            m.role = '專案經理 (PM)';
          } else {
            const sysRole = getMemberSystemRole(m);
            if (sysRole) {
              m.systemRoleId = sysRole.id;
              m.role = sysRole.name;
            }
          }

          const grade = getMemberJobGrade(m);
          if (grade) {
            m.jobGradeId = grade.id;
            m.salaryGradeId = grade.id;
            m.jobGradeName = grade.name;
            const metrics = calculateJobGradeMetrics(grade);
            m.monthlySalary = metrics.monthlySalary;
            m.hourlyRate = metrics.overheadHourlyCost;
          }
        });
      } catch (e) {
        console.error('Error in sanitizeJobGradesAndMembers:', e);
      }
    }

    function getMemberJobGradeMetrics(m) {
      const grade = getMemberJobGrade(m);
      if (grade) {
        return { grade, metrics: calculateJobGradeMetrics(grade) };
      }
      const defaultMetrics = calculateJobGradeMetrics({ monthlySalary: 60000 });
      return { grade: { name: '一般成員', monthlySalary: 60000, category: '其他' }, metrics: defaultMetrics };
    }

    function renderSalariesPage() {
      const canView = hasPermission('salary_view');
      const pageSalaries = document.getElementById('page-salaries');
      if (!pageSalaries) return;

      const members = state.members || [];
      
      // Calculate Global KPIs
      const totalMonthlyBudget = members.reduce((sum, m) => {
        const { metrics } = getMemberJobGradeMetrics(m);
        return sum + metrics.monthlySalary;
      }, 0);

      const avgHourlyRate = members.length > 0 ? Math.round((members.reduce((sum, m) => {
        const { metrics } = getMemberJobGradeMetrics(m);
        return sum + metrics.overheadHourlyCost;
      }, 0)) / members.length) : 375;

      // Historical Total Project Labor Cost
      let totalLaborCost = 0;
      const projCostMap = {}; // projId -> { estHours, actHours, estCost, actCost }

      (state.projects || []).forEach(p => {
        projCostMap[p.id] = { estHours: 0, actHours: 0, estCost: 0, actCost: 0 };
      });

      (state.tasks || []).forEach(t => {
        const pId = t.projectId;
        if (!projCostMap[pId]) projCostMap[pId] = { estHours: 0, actHours: 0, estCost: 0, actCost: 0 };
        
        const estH = Number(t.estHours) || 0;
        projCostMap[pId].estHours += estH;

        // Estimate cost based on assignee
        const assignees = getTaskAssignees(t);
        let taskHourlyRate = 450;
        if (assignees.length > 0) {
          const m = members.find(x => x.name === assignees[0] || assignees[0].includes(x.name));
          if (m) {
            const { metrics } = getMemberJobGradeMetrics(m);
            taskHourlyRate = metrics.overheadHourlyCost;
          }
        }
        projCostMap[pId].estCost += (estH * taskHourlyRate);
      });

      (state.workLogs || []).forEach(w => {
        const t = (state.tasks || []).find(x => x.id === w.taskId);
        const pId = t ? t.projectId : state.currentProjectId;
        const hours = Number(w.hours) || 0;

        let memberRate = 450;
        const m = members.find(x => x.name === w.userName || x.id === w.userId);
        if (m) {
          const { metrics } = getMemberJobGradeMetrics(m);
          memberRate = metrics.overheadHourlyCost;
        }
        const cost = hours * memberRate;
        totalLaborCost += cost;

        if (projCostMap[pId]) {
          projCostMap[pId].actHours += hours;
          projCostMap[pId].actCost += cost;
        }
      });

      // Find top cost project
      let topCostProjName = '暫無紀錄';
      let maxCost = -1;
      Object.keys(projCostMap).forEach(pId => {
        if (projCostMap[pId].actCost > maxCost) {
          maxCost = projCostMap[pId].actCost;
          topCostProjName = getProjectName(pId);
        }
      });

      const kpiMonthly = document.getElementById('kpi-total-monthly-salary');
      const kpiAvgRate = document.getElementById('kpi-avg-hourly-rate');
      const kpiTotalCost = document.getElementById('kpi-total-labor-cost');
      const kpiTopProj = document.getElementById('kpi-top-cost-project');

      if (kpiMonthly) kpiMonthly.innerText = `NT$ ${totalMonthlyBudget.toLocaleString()}`;
      if (kpiAvgRate) kpiAvgRate.innerText = `NT$ ${avgHourlyRate}/h`;
      if (kpiTotalCost) kpiTotalCost.innerText = `NT$ ${totalLaborCost.toLocaleString()}`;
      if (kpiTopProj) kpiTopProj.innerText = topCostProjName;

      // Render Tab 1: Job Grade Salary Matrix Table
      const empTbody = document.getElementById('salaries-emp-table-body');
      if (empTbody) {
        if (!canView) {
          empTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:#64748b;">🔒 薪資專區屬機密資料，您目前無檢視權限 (salary_view)</td></tr>`;
        } else {
          const grades = state.jobGrades || getDefaultJobGrades();
          empTbody.innerHTML = grades.map(g => {
            const m = calculateJobGradeMetrics(g);
            const deptLabel = (g.category || '一般').replace(/類$/, '部');

            return `
              <tr>
                <td><span class="badge badge-info" style="font-size:11px; font-weight:700;">${deptLabel}</span></td>
                <td><div style="font-weight:700; color:#0f172a; font-size:14px;">${g.name}</div></td>
                <td style="font-family:monospace;">
                  <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-weight:700; color:#047857; font-size:12px;">NT$</span>
                    <input type="number" 
                           id="input-salary-${g.id}" 
                           class="form-input form-input-sm" 
                           style="width:90px; font-family:monospace; font-weight:800; color:#047857; padding:4px 8px;" 
                           value="${m.monthlySalary}" 
                           ${hasPermission('salary_edit') ? '' : 'disabled'} 
                           oninput="handleGradeSalaryInput('${g.id}', this.value)" 
                           onchange="handleGradeSalaryChange('${g.id}', this.value)">
                  </div>
                </td>
                <td style="font-family:monospace; font-weight:700; color:#475569;"><span id="cell-annual-${g.id}">NT$ ${m.annualSalary.toLocaleString()}</span></td>
                <td style="font-family:monospace;"><span id="cell-daily-${g.id}">NT$ ${m.dailyRate.toLocaleString()}</span></td>
                <td style="font-family:monospace;"><span id="cell-hourly-${g.id}">NT$ ${m.baseHourlyRate}/h</span></td>
                <td style="font-family:monospace; font-weight:700; color:#2563eb;"><span id="cell-cost-${g.id}">NT$ ${m.overheadHourlyCost}/h</span></td>
                <td style="font-family:monospace; font-weight:700; color:#d97706;"><span id="cell-billing-${g.id}">NT$ ${m.billingHourlyRate}/h</span></td>
                <td style="text-align:right; white-space:nowrap;">
                  <div style="display:inline-flex; justify-content:flex-end; align-items:center; gap:6px;">
                    ${hasPermission('salary_edit') ? `<button class="btn btn-secondary btn-xs" onclick="openJobGradeModal('${g.id}')">編輯</button>` : ''}
                    ${hasPermission('salary_edit') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteJobGrade('${g.id}')">刪除</button>` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // Render Tab 2: Project Labor Cost Analysis Table
      const projTbody = document.getElementById('salaries-proj-table-body');
      if (projTbody) {
        if (!canView) {
          projTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#64748b;">🔒 成本分析屬機密資料，您目前無檢視權限</td></tr>`;
        } else {
          projTbody.innerHTML = (state.projects || []).map(p => {
            const data = projCostMap[p.id] || { estHours: 0, actHours: 0, estCost: 0, actCost: 0 };
            const diffCost = data.estCost - data.actCost;
            const isOverBudget = diffCost < 0;
            const execRate = data.estCost > 0 ? Math.round((data.actCost / data.estCost) * 100) : 0;

            return `
              <tr>
                <td>
                  <div style="font-weight:700; color:#0f172a;">${p.name}</div>
                  <div style="font-size:11px; color:#2563eb; font-family:monospace;">${p.code} • ${getClientName(p.clientId)}</div>
                </td>
                <td style="font-family:monospace; font-weight:700;">${data.estHours} h</td>
                <td style="font-family:monospace; font-weight:700; color:#2563eb;">${data.actHours} h</td>
                <td style="font-family:monospace; font-weight:700;">NT$ ${data.estCost.toLocaleString()}</td>
                <td style="font-family:monospace; font-weight:800; color:#0f172a;">NT$ ${data.actCost.toLocaleString()}</td>
                <td style="font-family:monospace; font-weight:800; color:${isOverBudget ? '#dc2626' : '#047857'};">
                  ${isOverBudget ? '⚠️ 超支 NT$ ' + Math.abs(diffCost).toLocaleString() : '🟢 結餘 NT$ ' + diffCost.toLocaleString()}
                </td>
                <td>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="badge ${isOverBudget ? 'badge-danger' : 'badge-success'}">${execRate}%</span>
                    <span style="font-size:11px; color:#64748b;">${p.status}</span>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // Render Tab 3: Department Labor Cost Analysis Table
      const deptTbody = document.getElementById('salaries-dept-table-body');
      if (deptTbody) {
        if (!canView) {
          deptTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#64748b;">🔒 部門工時成本屬機密資料，您目前無檢視權限</td></tr>`;
        } else {
          deptTbody.innerHTML = (state.departments || []).map(dept => {
            const deptMembers = members.filter(m => m.departmentId === dept.id || m.departmentName === dept.name);
            const deptMonthlyTotal = deptMembers.reduce((sum, m) => {
              const { metrics } = getMemberJobGradeMetrics(m);
              return sum + metrics.monthlySalary;
            }, 0);
            
            // Total hours & labor cost by department members
            let deptHours = 0;
            let deptLaborCost = 0;

            deptMembers.forEach(m => {
              const { metrics } = getMemberJobGradeMetrics(m);
              const hourly = metrics.overheadHourlyCost;
              const logs = (state.workLogs || []).filter(w => w.userName === m.name || w.userId === m.id);
              const loggedH = logs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
              deptHours += loggedH;
              deptLaborCost += (loggedH * hourly);
            });

            const costShare = totalLaborCost > 0 ? Math.round((deptLaborCost / totalLaborCost) * 100) : 0;
            const managerName = getDepartmentManagerName(dept);

            return `
              <tr>
                <td>
                  <div style="font-weight:700; color:#0f172a;">${dept.name}</div>
                  <div style="font-size:11px; color:#2563eb; font-family:monospace;">${dept.code}</div>
                </td>
                <td><span class="badge badge-warning">👑 ${managerName}</span></td>
                <td><span class="badge badge-info">👥 ${deptMembers.length} 人</span></td>
                <td style="font-family:monospace; font-weight:700; color:#047857;">NT$ ${deptMonthlyTotal.toLocaleString()}</td>
                <td style="font-family:monospace; font-weight:700;">${deptHours} h</td>
                <td style="font-family:monospace; font-weight:800; color:#b45309;">NT$ ${deptLaborCost.toLocaleString()}</td>
                <td>
                  <div class="progress-bar-bg" style="width:100px; display:inline-block; vertical-align:middle; margin-right:6px;">
                    <div class="progress-bar-fill" style="width:${costShare}%;"></div>
                  </div>
                  <span style="font-size:11px; font-weight:700; font-family:monospace;">${costShare}%</span>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }

    function updateSalariesKPIs() {
      const members = state.members || [];
      const totalMonthlyBudget = members.reduce((sum, m) => {
        const { metrics } = getMemberJobGradeMetrics(m);
        return sum + metrics.monthlySalary;
      }, 0);

      const avgHourlyRate = members.length > 0 ? Math.round((members.reduce((sum, m) => {
        const { metrics } = getMemberJobGradeMetrics(m);
        return sum + metrics.overheadHourlyCost;
      }, 0)) / members.length) : 375;

      let totalLaborCost = 0;
      (state.workLogs || []).forEach(w => {
        let memberRate = 450;
        const m = members.find(x => x.name === w.userName || x.id === w.userId);
        if (m) {
          const { metrics } = getMemberJobGradeMetrics(m);
          memberRate = metrics.overheadHourlyCost;
        }
        totalLaborCost += (Number(w.hours) || 0) * memberRate;
      });

      const kpiMonthly = document.getElementById('kpi-total-monthly-salary');
      const kpiAvgRate = document.getElementById('kpi-avg-hourly-rate');
      const kpiTotalCost = document.getElementById('kpi-total-labor-cost');

      if (kpiMonthly) kpiMonthly.innerText = `NT$ ${totalMonthlyBudget.toLocaleString()}`;
      if (kpiAvgRate) kpiAvgRate.innerText = `NT$ ${avgHourlyRate}/h`;
      if (kpiTotalCost) kpiTotalCost.innerText = `NT$ ${totalLaborCost.toLocaleString()}`;
    }

    function handleGradeSalaryInput(gradeId, value) {
      const numVal = Math.max(0, Number(value) || 0);
      if (!state.jobGrades) {
        state.jobGrades = getDefaultJobGrades();
      }
      const grade = state.jobGrades.find(g => g.id === gradeId);
      if (!grade) return;

      grade.monthlySalary = numVal;
      const m = calculateJobGradeMetrics(grade);

      const elAnnual = document.getElementById(`cell-annual-${gradeId}`);
      const elDaily = document.getElementById(`cell-daily-${gradeId}`);
      const elHourly = document.getElementById(`cell-hourly-${gradeId}`);
      const elCost = document.getElementById(`cell-cost-${gradeId}`);
      const elBilling = document.getElementById(`cell-billing-${gradeId}`);
      const elProfit = document.getElementById(`cell-profit-${gradeId}`);

      if (elAnnual) elAnnual.innerText = `NT$ ${m.annualSalary.toLocaleString()}`;
      if (elDaily) elDaily.innerText = `NT$ ${m.dailyRate.toLocaleString()}`;
      if (elHourly) elHourly.innerText = `NT$ ${m.baseHourlyRate}/h`;
      if (elCost) elCost.innerText = `NT$ ${m.overheadHourlyCost}/h`;
      if (elBilling) elBilling.innerText = `NT$ ${m.billingHourlyRate}/h`;
      if (elProfit) elProfit.innerText = `+ NT$ ${m.profitHourly}/h`;

      updateSalariesKPIs();
    }

    function handleGradeSalaryChange(gradeId, value) {
      const numVal = Math.max(0, Number(value) || 0);
      if (!state.jobGrades) {
        state.jobGrades = getDefaultJobGrades();
      }
      const grade = state.jobGrades.find(g => g.id === gradeId);
      if (grade) {
        grade.monthlySalary = numVal;
      }
      saveState();
      if (typeof syncToFirebase === 'function') {
        syncToFirebase();
      }
    }

    function openJobGradeModal(id = null) {
      document.getElementById('form-grade-id').value = id || '';
      const titleEl = document.getElementById('modal-job-grade-title');
      const delBtn = document.getElementById('btn-delete-grade');
      if (titleEl) titleEl.innerText = id ? '💼 編輯標準職級與薪資基準' : '💼 新增標準職級與薪資基準';
      if (delBtn) delBtn.style.display = id ? 'inline-block' : 'none';

      let grade = null;
      if (id) {
        grade = (state.jobGrades || []).find(g => g.id === id);
      }

      if (grade) {
        document.getElementById('form-grade-category').value = grade.category || '工程類';
        document.getElementById('form-grade-name').value = grade.name || '';
        document.getElementById('form-grade-salary').value = grade.monthlySalary || 60000;
      } else {
        document.getElementById('form-grade-category').value = '工程類';
        document.getElementById('form-grade-name').value = '';
        document.getElementById('form-grade-salary').value = 60000;
      }

      openModal('modal-job-grade');
    }

    function saveJobGrade() {
      const id = document.getElementById('form-grade-id').value;
      const category = document.getElementById('form-grade-category').value;
      const name = document.getElementById('form-grade-name').value.trim();
      const monthlySalary = Number(document.getElementById('form-grade-salary').value) || 60000;

      if (!name) {
        alert('請填寫職級名稱！');
        return;
      }

      if (!state.jobGrades) state.jobGrades = getDefaultJobGrades();

      if (id) {
        const grade = state.jobGrades.find(g => g.id === id);
        if (grade) {
          grade.category = category;
          grade.name = name;
          grade.monthlySalary = monthlySalary;
        }
        showToast(`職級「${name}」月薪基準已成功更新！`);
      } else {
        const newGrade = {
          id: 'grade-' + Date.now(),
          category,
          name,
          monthlySalary
        };
        state.jobGrades.push(newGrade);
        showToast(`已成功新增職級「${name}」！`);
      }

      sanitizeJobGradesAndMembers();
      syncToFirebase();
      closeModal('modal-job-grade');
      renderAll();
    }

    function quickEditGradeSalary(id) {
      const grade = (state.jobGrades || []).find(g => g.id === id);
      if (!grade) return;
      const val = prompt(`請輸入職級「${grade.name}」的新月薪基準 (NT$):`, grade.monthlySalary);
      if (val !== null && val.trim() !== '') {
        const num = Number(val);
        if (!isNaN(num) && num > 0) {
          grade.monthlySalary = num;
          sanitizeJobGradesAndMembers();
          syncToFirebase();
          renderAll();
          showToast(`「${grade.name}」月薪已更新為 NT$ ${num.toLocaleString()}`);
        } else {
          alert('請輸入有效的月薪數字！');
        }
      }
    }

    function deleteJobGradeFromModal() {
      const id = document.getElementById('form-grade-id').value;
      if (id) deleteJobGrade(id);
    }

    function deleteJobGrade(id) {
      const grade = (state.jobGrades || []).find(g => g.id === id);
      if (!grade) return;
      if (confirm(`確定要刪除職級「${grade.name}」嗎？`)) {
        state.jobGrades = (state.jobGrades || []).filter(g => g.id !== id);
        sanitizeJobGradesAndMembers();
        syncToFirebase();
        closeModal('modal-job-grade');
        renderAll();
        showToast(`已刪除職級「${grade.name}」`);
      }
    }

    function openSalaryModal(userId) {
      const m = (state.members || []).find(x => x.id === userId);
      if (!m) return;

      document.getElementById('form-salary-user-id').value = m.id;
      document.getElementById('form-salary-user-name').value = `${m.name} (${m.role})`;
      
      const monthly = Number(m.monthlySalary) || 60000;
      const hourly = Number(m.hourlyRate) || Math.round(monthly / 160);

      document.getElementById('form-salary-monthly').value = monthly;
      document.getElementById('form-salary-hourly').value = hourly;
      document.getElementById('form-salary-effective').value = m.effectiveDate || TODAY;

      const dept = (state.departments || []).find(d => d.id === m.departmentId || d.name === m.departmentId);
      document.getElementById('form-salary-dept').value = dept ? dept.name : (m.departmentName || '未分派');
      document.getElementById('form-salary-notes').value = m.salaryNotes || '';

      openModal('modal-salary');
    }

    function saveSalary() {
      const userId = document.getElementById('form-salary-user-id').value;
      const monthlySalary = Number(document.getElementById('form-salary-monthly').value) || 60000;
      const hourlyRate = Number(document.getElementById('form-salary-hourly').value) || Math.round(monthlySalary / 160);
      const effectiveDate = document.getElementById('form-salary-effective').value || TODAY;
      const salaryNotes = document.getElementById('form-salary-notes').value.trim();

      const m = (state.members || []).find(x => x.id === userId);
      if (m) {
        m.monthlySalary = monthlySalary;
        m.hourlyRate = hourlyRate;
        m.effectiveDate = effectiveDate;
        m.salaryNotes = salaryNotes;
        showToast(`成員「${m.name}」薪資已更新為 月薪 NT$ ${monthlySalary.toLocaleString()} (折算時薪 NT$ ${hourlyRate}/h)！`);
      }

      syncToFirebase();
      closeModal('modal-salary');
      renderAll();
    }

    // ================= 3. ROLES MANAGEMENT =================
    function getAllSystemPermissions() {
      return [
        'dashboard_view',
        'member_view', 'member_create', 'member_edit', 'member_delete',
        'role_view', 'role_edit',
        'client_view', 'client_create', 'client_edit', 'client_delete',
        'proj_view', 'proj_create', 'proj_edit', 'proj_delete',
        'gantt_view', 'gantt_add_phase', 'gantt_add_task', 'gantt_drag', 'gantt_delete', 'gantt_export',
        'worklog_view', 'worklog_create', 'worklog_edit', 'worklog_delete',
        'task_view', 'task_create', 'task_edit', 'task_schedule_edit', 'task_complete_permission', 'task_delete',
        'issue_view', 'issue_create', 'issue_edit', 'issue_delete', 'issue_comment'
      ];
    }

    function isSystemAdminRole(r) {
      if (!r) return false;
      const id = typeof r === 'string' ? r : (r.id || '');
      const name = typeof r === 'string' ? r : (r.name || '');
      return id === 'role-admin' || name === '系統管理員';
    }

    function sanitizeJobGradesAndMembers() {
      if (!state.jobGrades || !Array.isArray(state.jobGrades) || state.jobGrades.length === 0) {
        state.jobGrades = getDefaultJobGrades();
      }
      if (!state.members || !Array.isArray(state.members)) {
        state.members = [];
      }

      state.members.forEach(m => {
        if (!m) return;
        const { grade, metrics } = getMemberJobGradeMetrics(m);
        if (grade && grade.id) {
          m.jobGradeId = grade.id;
          m.role = grade.name;
        }
        m.monthlySalary = metrics.monthlySalary;
        m.hourlyRate = metrics.overheadHourlyCost;
      });

      sanitizeDepartmentsAndMembers();
    }

    function sanitizeDepartmentsAndMembers() {
      if (!state.departments) {
        state.departments = [];
      } else if (!Array.isArray(state.departments)) {
        state.departments = Object.values(state.departments);
      }
      if (!state.members) {
        state.members = [];
      } else if (!Array.isArray(state.members)) {
        state.members = Object.values(state.members);
      }

      // 1. Bidirectional sync between department manager and member
      state.departments.forEach(dept => {
        if (!dept) return;

        if (!dept.managerId && !dept.managerName) {
          dept.managerId = '';
          dept.managerName = '';
          return;
        }

        let mgr = null;
        if (dept.managerId) {
          mgr = state.members.find(m => m && m.id === dept.managerId);
        }
        if (!mgr && dept.managerName) {
          mgr = state.members.find(m => 
            m && (m.name === dept.managerName || 
            (m.name && m.name.includes(dept.managerName)) || 
            (dept.managerName && dept.managerName.includes(m.name)))
          );
        }

        if (mgr) {
          mgr.departmentId = dept.id;
          mgr.departmentName = dept.name;
          dept.managerId = mgr.id;
          dept.managerName = mgr.name;
        } else {
          dept.managerId = '';
          dept.managerName = '';
        }
      });

      // 2. Normalize members departmentId & departmentName to match state.departments
      state.members.forEach(m => {
        if (!m) return;
        if (m.departmentId || m.departmentName) {
          const matchedDept = state.departments.find(d => 
            d && (d.id === m.departmentId || 
            d.code === m.departmentId || 
            d.name === m.departmentId || 
            d.name === m.departmentName)
          );
          if (matchedDept) {
            m.departmentId = matchedDept.id;
            m.departmentName = matchedDept.name;
          }
        }
      });
    }

    function sanitizeRoles() {
      if (!state.roles) {
        state.roles = [];
      } else if (!Array.isArray(state.roles)) {
        state.roles = Object.values(state.roles);
      }
      const allPerms = getAllSystemPermissions();

      // Deduplicate roles by ID or Name
      const seen = new Set();
      state.roles = state.roles.filter(r => {
        if (!r) return false;
        const key = r.id || r.name;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      let adminRole = state.roles.find(r => r && (r.id === 'role-admin' || r.name === '系統管理員'));
      if (adminRole) {
        adminRole.id = 'role-admin';
        adminRole.name = '系統管理員';
        adminRole.isSystem = true;
        adminRole.isAdmin = true;
        adminRole.permissions = [...allPerms];
      } else {
        adminRole = {
          id: 'role-admin',
          name: '系統管理員',
          isSystem: true,
          isAdmin: true,
          description: '全功能最高管理員權限，擁有全系統所有模組與管理功能',
          responsibilities: '系統日常維護、資料庫備份與最高階授權（全部權限開啟）',
          permissions: [...allPerms]
        };
        state.roles.push(adminRole);
      }

      state.roles.forEach(r => {
        if (!r) return;
        if (r.id !== 'role-admin' && r.name !== '系統管理員') {
          r.isSystem = false;
          r.isAdmin = false;
          if (!r.permissions) {
            r.permissions = [];
          } else if (!Array.isArray(r.permissions)) {
            r.permissions = Object.values(r.permissions);
          }
        }
      });
    }

    function renderRolesTable() {
      const tbody = document.getElementById('roles-table-body');
      if (!tbody) return;
      sanitizeRoles();
      tbody.innerHTML = state.roles.map(r => {
        const isAdmin = isSystemAdminRole(r);
        const permCount = (r.permissions || []).length;
        return `
          <tr>
            <td>
              <div style="font-weight:800; color:#0f172a; display:flex; align-items:center; gap:6px;">
                <span style="cursor:pointer;" onclick="editRoleMatrix('${r.id}')" title="點擊直接編輯此角色與權限">${r.name}</span>
                ${isAdmin ? `<span class="badge badge-purple" style="font-size:10px;">系統管理員 (全權限)</span>` : `<span class="badge badge-info" style="font-size:10px;">自訂角色</span>`}
              </div>
            </td>
            <td style="color:#475569; font-size:12px; max-width:240px;">${r.description || '-'}</td>
            <td style="color:#64748b; font-size:12px; max-width:280px;">${r.responsibilities || '-'}</td>
            <td>
              <span class="badge badge-success" style="font-weight:700;">已授權矩陣: ${permCount} 項${isAdmin ? ' (全開)' : ''}</span>
            </td>
            <td style="text-align: right; white-space:nowrap;">
              ${hasPermission('role_edit') ? `<button class="btn btn-primary btn-xs" onclick="editRoleMatrix('${r.id}')">⚙️ 編輯矩陣 Matrix</button>` : ''}
              ${(!isAdmin && hasPermission('role_edit')) ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteRole('${r.id}')" style="margin-left:4px;">🗑️ 刪除</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    }

    function openRoleMatrixModal(roleId = null) {
      document.getElementById('form-role-id').value = roleId || '';
      document.getElementById('modal-role-matrix-title').innerText = roleId ? '編輯角色權限 Matrix' : '新增自訂角色權限 Matrix';

      const adminBanner = document.getElementById('modal-role-admin-banner');
      const deleteBtn = document.getElementById('modal-role-delete-btn');
      const nameInput = document.getElementById('form-role-name');
      const descInput = document.getElementById('form-role-desc');
      const respInput = document.getElementById('form-role-resp');

      if (roleId) {
        const r = (state.roles || []).find(x => x && (x.id === roleId || x.name === roleId || (roleId === 'role-pm' && (x.id === 'role-pm' || (x.name && x.name.includes('PM'))))));
        if (r) {
          document.getElementById('form-role-id').value = r.id;
          const isAdmin = isSystemAdminRole(r);
          if (adminBanner) adminBanner.style.display = isAdmin ? 'block' : 'none';
          if (deleteBtn) deleteBtn.style.display = (!isAdmin && hasPermission('role_edit')) ? 'inline-flex' : 'none';
          if (nameInput) {
            nameInput.value = r.name || '';
            nameInput.readOnly = isAdmin;
          }
          if (descInput) descInput.value = r.description || '';
          if (respInput) respInput.value = r.responsibilities || '';

          const rawPerms = isAdmin ? getAllSystemPermissions() : (r.permissions || []);
          const permsArr = Array.isArray(rawPerms) ? rawPerms : (rawPerms ? Object.values(rawPerms) : []);
          const permSet = new Set(permsArr);
          document.querySelectorAll('.matrix-chk').forEach(chk => {
            chk.checked = permSet.has(chk.value);
            chk.disabled = isAdmin;
          });
        }
      } else {
        if (adminBanner) adminBanner.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (nameInput) {
          nameInput.value = '';
          nameInput.readOnly = false;
        }
        if (descInput) descInput.value = '';
        if (respInput) respInput.value = '';
        document.querySelectorAll('.matrix-chk').forEach(chk => {
          chk.checked = true;
          chk.disabled = false;
        });
      }
      openModal('modal-role-matrix');
    }

    function toggleAllMatrixCheckboxes(checked) {
      const id = document.getElementById('form-role-id').value;
      if (id && isSystemAdminRole(id)) {
        showToast('「系統管理員」擁有最高權限，全功能權限不可關閉');
        return;
      }
      document.querySelectorAll('.matrix-chk').forEach(chk => {
        if (!chk.disabled) chk.checked = checked;
      });
    }

    function toggleGroupMatrix(groupName, checked) {
      const id = document.getElementById('form-role-id').value;
      if (id && isSystemAdminRole(id)) {
        showToast('「系統管理員」擁有最高權限，全功能權限不可關閉');
        return;
      }
      document.querySelectorAll(`.matrix-chk[data-group="${groupName}"]`).forEach(chk => {
        if (!chk.disabled) chk.checked = checked;
      });
    }

    function saveRoleMatrix() {
      const id = document.getElementById('form-role-id').value;
      const name = document.getElementById('form-role-name').value.trim();
      const desc = document.getElementById('form-role-desc').value.trim();
      const resp = document.getElementById('form-role-resp').value.trim();

      if (!name) {
        alert('請填寫角色名稱！');
        return;
      }

      const selectedPermissions = [];
      document.querySelectorAll('.matrix-chk:checked').forEach(chk => {
        selectedPermissions.push(chk.value);
      });

      let r = null;
      if (id) {
        r = (state.roles || []).find(x => x && (x.id === id || x.name === id || (id === 'role-pm' && (x.id === 'role-pm' || (x.name && x.name.includes('PM'))))));
      }
      if (!r && name) {
        r = (state.roles || []).find(x => x && (x.name === name || (name.includes('PM') && (x.id === 'role-pm' || (x.name && x.name.includes('PM'))))));
      }

      if (r) {
        const isAdmin = isSystemAdminRole(r);
        r.name = isAdmin ? '系統管理員' : name;
        r.description = desc || r.description;
        r.responsibilities = resp || r.responsibilities;
        r.permissions = isAdmin ? getAllSystemPermissions() : [...selectedPermissions];
        if (!r.id) r.id = id || ('role-' + Date.now());
        showToast(`已更新角色「${r.name}」授權權限矩陣（已儲存 ${r.permissions.length} 項權限）！`);
      } else {
        const newRoleId = id || ('role-' + Date.now());
        state.roles.push({
          id: newRoleId,
          name,
          isSystem: false,
          isAdmin: false,
          description: desc || '自訂專案角色權限',
          responsibilities: resp || desc || '依授權矩陣執行相關功能操作',
          permissions: [...selectedPermissions]
        });
        showToast(`已建立新自訂角色「${name}」！`);
      }

      // Persist to localStorage immediately
      try {
        localStorage.setItem('b2b_pm_state_v2', JSON.stringify(state));
      } catch(e) {}

      closeModal('modal-role-matrix');
      updateRoleSimulatorOptions();
      applyRolePermissions();
      syncToFirebase();
      renderAll();
    }

    function editRoleMatrix(id) { openRoleMatrixModal(id); }

    function deleteRole(id) {
      const r = state.roles.find(x => x.id === id);
      if (!r) return;
      if (isSystemAdminRole(r)) {
        alert('⛔「系統管理員」為全系統最高管理員，不可刪除！');
        return;
      }

      const assignedMembers = state.members.filter(m => m.role === r.name);
      let confirmMsg = `確定要刪除角色「${r.name}」嗎？\n\n此操作無法復原。`;
      if (assignedMembers.length > 0) {
        confirmMsg += `\n\n⚠️ 提醒：目前有 ${assignedMembers.length} 位員工（${assignedMembers.map(m => m.name).join(', ')}）職稱設為此角色。`;
      }

      if (confirm(confirmMsg)) {
        state.roles = state.roles.filter(x => x.id !== id);
        if (state.simulatedRoleId === id) {
          state.simulatedRoleId = 'self';
        }
        updateRoleSimulatorOptions();
        applyRolePermissions();
        syncToFirebase();
        renderAll();
        showToast(`已成功刪除角色「${r.name}」！`);
      }
    }

    function onModalDeleteCurrentRole() {
      const id = document.getElementById('form-role-id').value;
      if (!id) return;
      closeModal('modal-role-matrix');
      deleteRole(id);
    }

    // ================= 4. CLIENTS MANAGEMENT =================
    function renderClientsTable() {
      const tbody = document.getElementById('clients-table-body');
      if (!tbody) return;
      tbody.innerHTML = state.clients.map(c => `
        <tr>
          <td>
            <div style="font-weight:700; color:#2563eb;">統編: ${c.code}</div>
            <div style="font-weight:800; color:#0f172a; margin-top:2px;">${c.name}</div>
          </td>
          <td style="font-weight:600;">${c.contactPerson}</td>
          <td style="font-family:monospace; color:#475569;">${c.email}</td>
          <td style="font-family:monospace; color:#64748b;">${c.phone || '-'}</td>
          <td style="text-align: right;">
            ${hasPermission('client_edit') ? `<button class="btn btn-secondary btn-xs" onclick="editClient('${c.id}')">編輯</button>` : ''}
            ${hasPermission('client_delete') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteClient('${c.id}')">刪除</button>` : ''}
          </td>
        </tr>
      `).join('');
    }

    function openClientModal(id = null) {
      document.getElementById('form-client-id').value = id || '';
      document.getElementById('modal-client-title').innerText = id ? '編輯客戶資料' : '新增客戶資料';
      if (id) {
        const c = state.clients.find(x => x.id === id);
        if (c) {
          document.getElementById('form-client-name').value = c.name;
          document.getElementById('form-client-code').value = c.code;
          document.getElementById('form-client-contact').value = c.contactPerson;
          document.getElementById('form-client-email').value = c.email;
          document.getElementById('form-client-phone').value = c.phone || '';
        }
      } else {
        document.getElementById('form-client-name').value = '奧斯企業';
        document.getElementById('form-client-code').value = '24578937';
        document.getElementById('form-client-contact').value = '';
        document.getElementById('form-client-email').value = '';
        document.getElementById('form-client-phone').value = '';
      }
      openModal('modal-client');
    }

    function saveClient() {
      const id = document.getElementById('form-client-id').value;
      const name = document.getElementById('form-client-name').value.trim();
      const code = document.getElementById('form-client-code').value.trim();
      const contactPerson = document.getElementById('form-client-contact').value.trim();
      const email = document.getElementById('form-client-email').value.trim();
      const phone = document.getElementById('form-client-phone').value.trim();

      if (!name || !code) {
        alert('請填寫客戶公司名稱與統一編號！');
        return;
      }

      if (id) {
        const c = state.clients.find(x => x.id === id);
        if (c) {
          c.name = name;
          c.code = code;
          c.contactPerson = contactPerson;
          c.email = email;
          c.phone = phone;
        }
        showToast('客戶資料已更新！');
      } else {
        state.clients.push({ id: 'cli-' + Date.now(), name, code, contactPerson, email, phone });
        showToast('客戶資料建立成功！');
      }
      closeModal('modal-client');
      renderAll();
    }

    function editClient(id) { openClientModal(id); }
    function deleteClient(id) {
      if (confirm('確定要刪除此客戶嗎？')) {
        state.clients = state.clients.filter(c => c.id !== id);
        renderAll();
        showToast('客戶已刪除');
      }
    }

    // ================= 4.1 HOLIDAYS & WORKING DAYS MANAGEMENT =================
    const WEEKDAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    function renderHolidaysTable() {
      const tbody = document.getElementById('holidays-table-body');
      if (!tbody) return;

      const yearFilter = document.getElementById('holiday-year-filter')?.value || '2026';
      let list = [...(state.holidays || [])];

      if (yearFilter !== 'all') {
        list = list.filter(h => h.date && h.date.startsWith(yearFilter));
      }

      // Sort by date ascending
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#94a3b8;">目前篩選年度無設定之假日或補班日紀錄</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(h => {
        let weekText = '';
        if (h.date) {
          const parts = h.date.split('-');
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            weekText = WEEKDAY_NAMES[d.getDay()] || '';
          }
        }

        let catBadge = 'badge-info';
        if (h.category === '國定假日') catBadge = 'badge-purple';
        else if (h.category === '彈性放假') catBadge = 'badge-warning';
        else if (h.category === '補行上班') catBadge = 'badge-success';

        let workdayHtml = '';
        if (h.isWorkingDay) {
          workdayHtml = `<span style="display:inline-flex; align-items:center; gap:4px; color:#15803d; font-weight:700; background:#dcfce7; padding:2px 8px; border-radius:9999px; font-size:11px;">🟢 補上班 (計為工作日)</span>`;
        } else {
          workdayHtml = `<span style="display:inline-flex; align-items:center; gap:4px; color:#b91c1c; font-weight:700; background:#fee2e2; padding:2px 8px; border-radius:9999px; font-size:11px;">🔴 放假日 (不計入上班日)</span>`;
        }

        return `
          <tr>
            <td style="font-family:monospace; font-weight:700; color:#0f172a; font-size:13px;">
              ${h.date} <span style="font-size:11px; color:#64748b; font-weight:600; margin-left:4px;">(${weekText})</span>
            </td>
            <td>
              <strong style="color:#1e3a8a; font-size:13px;">${h.name}</strong>
            </td>
            <td>
              <span class="badge ${catBadge}">${h.category || '國定假日'}</span>
            </td>
            <td>${workdayHtml}</td>
            <td style="color:#475569; font-size:12px;">${h.note || '-'}</td>
            <td style="text-align:right; white-space:nowrap;">
              <button class="btn btn-secondary btn-xs" onclick="openHolidayModal('${h.id}')">編輯</button>
              <button class="btn btn-danger-outline btn-xs" onclick="deleteHoliday('${h.id}')">刪除</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function openHolidayModal(holidayId = null) {
      document.getElementById('form-holiday-id').value = holidayId || '';
      const titleEl = document.getElementById('modal-holiday-title');
      const deleteBtn = document.getElementById('modal-holiday-delete-btn');
      const dateInput = document.getElementById('form-holiday-date');
      const nameInput = document.getElementById('form-holiday-name');
      const catSelect = document.getElementById('form-holiday-category');
      const workTypeSelect = document.getElementById('form-holiday-workday-type');
      const noteInput = document.getElementById('form-holiday-note');

      if (holidayId) {
        const h = (state.holidays || []).find(x => x.id === holidayId);
        if (h) {
          if (titleEl) titleEl.innerText = `編輯假日：${h.name}`;
          if (deleteBtn) deleteBtn.style.display = 'inline-flex';
          dateInput.value = h.date || '';
          nameInput.value = h.name || '';
          catSelect.value = h.category || '國定假日';
          workTypeSelect.value = h.isWorkingDay ? 'work' : 'holiday';
          noteInput.value = h.note || '';
        }
      } else {
        if (titleEl) titleEl.innerText = '新增假日 / 補上班日';
        if (deleteBtn) deleteBtn.style.display = 'none';
        dateInput.value = '';
        nameInput.value = '';
        catSelect.value = '國定假日';
        workTypeSelect.value = 'holiday';
        noteInput.value = '';
      }
      openModal('modal-holiday');
    }

    function onHolidayCategoryChange(cat) {
      const workTypeSelect = document.getElementById('form-holiday-workday-type');
      if (!workTypeSelect) return;
      if (cat === '補行上班') {
        workTypeSelect.value = 'work';
      } else {
        workTypeSelect.value = 'holiday';
      }
    }

    function saveHoliday() {
      const id = document.getElementById('form-holiday-id').value;
      const date = document.getElementById('form-holiday-date').value.trim();
      const name = document.getElementById('form-holiday-name').value.trim();
      const category = document.getElementById('form-holiday-category').value;
      const workType = document.getElementById('form-holiday-workday-type').value;
      const note = document.getElementById('form-holiday-note').value.trim();

      if (!date || !name) {
        alert('請填寫日期與節日名稱！');
        return;
      }

      if (!state.holidays) state.holidays = [];

      const isWorkingDay = (workType === 'work');
      const isHoliday = (workType === 'holiday');

      if (id) {
        const h = state.holidays.find(x => x.id === id);
        if (h) {
          h.date = date;
          h.name = name;
          h.category = category;
          h.isWorkingDay = isWorkingDay;
          h.isHoliday = isHoliday;
          h.note = note;
          showToast(`已更新「${name}」假日設定！`);
        }
      } else {
        const newId = 'h-' + date + '-' + Date.now().toString().slice(-4);
        state.holidays.push({
          id: newId,
          date,
          name,
          category,
          isWorkingDay,
          isHoliday,
          note
        });
        showToast(`已新增「${name}」設定！`);
      }

      closeModal('modal-holiday');
      syncToFirebase();
      renderAll();
    }

    function deleteHoliday(id) {
      const h = (state.holidays || []).find(x => x.id === id);
      if (!h) return;
      if (confirm(`確定要刪除「${h.name} (${h.date})」的假日設定嗎？`)) {
        state.holidays = (state.holidays || []).filter(x => x.id !== id);
        showToast(`已刪除「${h.name}」！`);
        syncToFirebase();
        renderAll();
      }
    }

    function deleteCurrentHoliday() {
      const id = document.getElementById('form-holiday-id').value;
      if (!id) return;
      closeModal('modal-holiday');
      deleteHoliday(id);
    }

    function resetTaiwanOfficialHolidays() {
      if (confirm('確定要重新帶入行政院 2025、2026、2027 年官方公告之國定假日與補班日嗎？\n\n系統將為您自動補齊官方行事曆資料。')) {
        const defaults = getDefaultTaiwanHolidays();
        if (!state.holidays || state.holidays.length === 0) {
          state.holidays = [...defaults];
        } else {
          const dateMap = new Map();
          state.holidays.forEach(h => dateMap.set(h.date, h));
          defaults.forEach(dh => {
            if (!dateMap.has(dh.date)) {
              state.holidays.push(dh);
            }
          });
        }
        showToast('已成功帶入行政院官方國定假日資料！');
        syncToFirebase();
        renderAll();
      }
    }

    // ================= 5. PROJECTS MANAGEMENT =================
    function renderProjectsTable() {
      const tbody = document.getElementById('projects-table-body');
      if (!tbody) return;
      tbody.innerHTML = state.projects.map(p => {
        const pTasks = state.tasks.filter(t => t.projectId === p.id);
        const estH = pTasks.reduce((acc, t) => acc + (Number(t.estHours) || 0), 0);
        const actH = pTasks.reduce((acc, t) => acc + (Number(t.actHours) || 0), 0);
        const isCurrent = p.id === state.currentProjectId;
        const memberNames = (p.teamMembers || []).map(mId => getMemberName(mId)).join(', ');

        return `
          <tr style="${isCurrent ? 'background:#eff6ff;' : ''}">
            <td>
              <div style="font-weight:700; color:var(--primary); font-family:monospace;">${p.code}</div>
              <div style="font-weight:800; color:#0f172a; margin-top:2px;">${p.name}</div>
            </td>
            <td>
              <span class="badge badge-purple">${getClientName(p.clientId)}</span>
            </td>
            <td style="font-size:12px; color:#475569; max-width:280px;">${memberNames || '無員工作分派'}</td>
            <td style="font-family:monospace; font-weight:700;">${actH} / ${estH || 392}h</td>
            <td style="font-family:monospace;">${p.targetEndDate || '-'}</td>
            <td>
              <span class="badge ${p.status === '進行中' ? 'badge-success' : 'badge-slate'}">${p.status}</span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-primary btn-xs" onclick="enterProjectTier('${p.id}')">
                ${isCurrent ? '★ 進入工作區 ➜' : '進入專案 ➜'}
              </button>
              ${hasPermission('proj_edit') ? `<button class="btn btn-secondary btn-xs" onclick="editProject('${p.id}')" style="margin-left:4px;">編輯</button>` : ''}
              ${hasPermission('proj_delete') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteProject('${p.id}')" style="margin-left:4px;">刪除</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    }

    function openProjectModal(id = null) {
      document.getElementById('form-project-id').value = id || '';
      document.getElementById('modal-project-title').innerText = id ? '編輯主專案' : '新增主專案';

      const clientSelect = document.getElementById('form-project-client');
      clientSelect.innerHTML = state.clients.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');

      const memberBoxes = document.getElementById('form-project-members-checkboxes');
      memberBoxes.innerHTML = state.members.map(m => `
        <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
          <input type="checkbox" class="proj-member-chk" value="${m.id}">
          <span>${m.name} (${m.role})</span>
        </label>
      `).join('');

      if (id) {
        const p = state.projects.find(x => x.id === id);
        if (p) {
          document.getElementById('form-project-name').value = p.name;
          document.getElementById('form-project-type').value = p.type || '外部專案 (EXT)';
          document.getElementById('form-project-client').value = p.clientId;
          document.getElementById('form-project-code').value = p.code;
          document.getElementById('form-project-desc').value = p.description || '';
          document.getElementById('form-project-start').value = p.startDate || TODAY;
          document.getElementById('form-project-end').value = p.targetEndDate || '2026-09-30';
          document.getElementById('form-project-status').value = p.status || '進行中';

          const memSet = new Set(p.teamMembers || []);
          document.querySelectorAll('.proj-member-chk').forEach(chk => {
            chk.checked = memSet.has(chk.value);
          });
        }
      } else {
        document.getElementById('form-project-name').value = '';
        document.getElementById('form-project-type').value = '外部專案 (EXT)';
        document.getElementById('form-project-code').value = 'PROJ-03';
        document.getElementById('form-project-desc').value = '';
        document.getElementById('form-project-start').value = TODAY;
        document.getElementById('form-project-end').value = '2026-09-30';
        document.getElementById('form-project-status').value = '進行中';
        document.querySelectorAll('.proj-member-chk').forEach(chk => chk.checked = true);
      }
      openModal('modal-project');
    }

    function saveProject() {
      const id = document.getElementById('form-project-id').value;
      const name = document.getElementById('form-project-name').value.trim();
      const type = document.getElementById('form-project-type').value;
      const clientId = document.getElementById('form-project-client').value;
      const code = document.getElementById('form-project-code').value.trim();
      const desc = document.getElementById('form-project-desc').value.trim();
      const startDate = document.getElementById('form-project-start').value;
      const targetEndDate = document.getElementById('form-project-end').value;
      const status = document.getElementById('form-project-status').value;

      if (!name || !code) {
        alert('請填寫主專案名稱與專案編號！');
        return;
      }

      const teamMembers = [];
      document.querySelectorAll('.proj-member-chk:checked').forEach(chk => teamMembers.push(chk.value));

      if (id) {
        const p = state.projects.find(x => x.id === id);
        if (p) {
          p.name = name; p.type = type; p.clientId = clientId; p.code = code;
          p.description = desc; p.startDate = startDate; p.targetEndDate = targetEndDate;
          p.status = status; p.teamMembers = teamMembers;
        }
        showToast('主專案已更新！');
      } else {
        const newProjId = 'prj-' + Date.now();
        state.projects.push({
          id: newProjId, name, type, clientId, code, description: desc,
          startDate, targetEndDate, status, teamMembers
        });
        state.currentProjectId = newProjId; // Automatically switch to new project
        showToast('主專案建立成功，已切換至該專案！');
      }
      syncToFirebase();
      closeModal('modal-project');
      renderAll();
    }

    function editProject(id) { openProjectModal(id); }
    function deleteProject(id) {
      if (confirm('確定刪除此專案嗎？')) {
        state.projects = state.projects.filter(p => p.id !== id);
        if (state.currentProjectId === id && state.projects.length > 0) {
          state.currentProjectId = state.projects[0].id;
        }
        renderAll();
        showToast('專案已刪除');
      }
    }

    // ================= 6. GANTT CHART ENGINE (DRAG & DROP / RESIZING) =================
    let ganttDragState = null;

    function togglePublishToWorkLogs(isChecked) {
      showToast(isChecked ? '已發佈本專案所有排程至工時日誌' : '已取消排程發佈');
    }

    function toggleGanttExpand(type, id) {
      if (type === 'phase') {
        const p = state.phases.find(x => x.id === id);
        if (p) p.expanded = !p.expanded;
      } else if (type === 'module') {
        state.phases.forEach(p => {
          const m = (p.modules || []).find(x => x.id === id);
          if (m) m.expanded = !m.expanded;
        });
      } else if (type === 'task') {
        state.phases.forEach(p => {
          (p.modules || []).forEach(m => {
            const t = (m.tasks || []).find(x => x.id === id);
            if (t) t.expanded = !t.expanded;
          });
        });
      }
      renderGraphicalGantt();
    }

    function recalculateAllWBS(projectId) {
      sanitizePhases();
      const pId = projectId || state.currentProjectId;
      const projectPhases = state.phases.filter(p => p.projectId === pId);
      projectPhases.forEach((phase, pIdx) => {
        (phase.modules || []).forEach((module, mIdx) => {
          (module.tasks || []).forEach((task, tIdx) => {
            task.phaseId = phase.id;
            task.moduleId = module.id;
            task.wbs = `${pIdx + 1}.${mIdx + 1}.${tIdx + 1}`;
            (task.subTasks || []).forEach((st, stIdx) => {
              st.phaseId = phase.id;
              st.moduleId = module.id;
              st.parentTaskId = task.id;
              st.wbs = `${pIdx + 1}.${mIdx + 1}.${tIdx + 1}.${stIdx + 1}`;
            });
          });
        });
      });
      state.tasks = getFlatTasks();
    }

    function inlineAddPhase() {
      const name = prompt('請輸入要新增的第一階名稱 (例如: 測試與部署上線):');
      if (name && name.trim()) {
        const cleanName = cleanTierTitle(name.trim());
        state.phases.push({
          id: 'phase-' + Date.now(),
          projectId: state.currentProjectId,
          name: cleanName,
          expanded: true,
          modules: []
        });
        recalculateAllWBS(state.currentProjectId);
        syncToFirebase();
        renderAll();
        showToast(`已新增第一階「${cleanName}」！`);
      }
    }

    function inlineAddModule(phaseId) {
      const name = prompt('請輸入要新增的第二階名稱 (例如: 核心功能模組):');
      if (name && name.trim()) {
        const p = state.phases.find(x => x.id === phaseId);
        if (p) {
          const cleanName = cleanTierTitle(name.trim());
          if (!p.modules) p.modules = [];
          p.modules.push({
            id: 'mod-' + Date.now(),
            name: cleanName,
            expanded: true,
            tasks: []
          });
          recalculateAllWBS(state.currentProjectId);
          syncToFirebase();
          renderAll();
          showToast(`已新增第二階「${cleanName}」！`);
        }
      }
    }

    function inlineAddTask(phaseId, moduleId) {
      sanitizePhases();
      openTaskModal(null, phaseId, moduleId);
    }

    function inlineAddFeature(phaseId, moduleId) {
      sanitizePhases();
      openTaskModal(null, phaseId, moduleId, null);
    }

    function inlineAddSubTask(phaseId, moduleId, parentTaskId) {
      sanitizePhases();
      openTaskModal(null, phaseId, moduleId, parentTaskId);
    }

    // Inline Edit Titles for Phase & Module
    function startInlineEditTitle(type, id, event) {
      if (event) event.stopPropagation();
      let item = null;
      if (type === 'phase') {
        item = state.phases.find(x => x.id === id);
      } else if (type === 'module') {
        state.phases.forEach(p => {
          const m = (p.modules || []).find(x => x.id === id);
          if (m) item = m;
        });
      }
      if (!item) return;

      const titleEl = document.getElementById(`${type}-title-${id}`);
      if (!titleEl) return;

      const currentText = cleanTierTitle(item.name);
      titleEl.innerHTML = `
        <input 
          type="text" 
          id="input-inline-${type}-${id}" 
          value="${currentText.replace(/"/g, '&quot;')}"
          style="padding:2px 6px; font-size:12px; font-weight:700; border:1px solid #3b82f6; border-radius:4px; outline:none; background:white; color:#0f172a; width:220px;"
          onclick="event.stopPropagation();"
          onkeydown="handleInlineTitleKey(event, '${type}', '${id}', this)"
          onblur="finishInlineTitleEdit('${type}', '${id}', this.value)"
        />
      `;
      const input = document.getElementById(`input-inline-${type}-${id}`);
      if (input) {
        input.focus();
        input.select();
      }
    }

    function handleInlineTitleKey(event, type, id, inputEl) {
      if (event.key === 'Enter') {
        event.preventDefault();
        inputEl.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        renderGraphicalGantt();
      }
    }

    function finishInlineTitleEdit(type, id, val) {
      const trimmed = cleanTierTitle((val || '').trim());
      if (!trimmed) {
        renderGraphicalGantt();
        return;
      }
      if (type === 'phase') {
        const p = state.phases.find(x => x.id === id);
        if (p && p.name !== trimmed) {
          p.name = trimmed;
          showToast(`已更新第一階名稱為「${trimmed}」！`);
        }
      } else if (type === 'module') {
        state.phases.forEach(p => {
          const m = (p.modules || []).find(x => x.id === id);
          if (m && m.name !== trimmed) {
            m.name = trimmed;
            showToast(`已更新第二階名稱為「${trimmed}」！`);
          }
        });
      }
      syncToFirebase();
      renderAll();
    }

    // Inline Deletions
    function inlineDeletePhase(phaseId, event) {
      if (event) event.stopPropagation();
      const p = state.phases.find(x => x.id === phaseId);
      if (!p) return;
      if (confirm(`確定要刪除階段「${cleanTierTitle(p.name)}」及其底下所有大功能與小功能嗎？`)) {
        state.phases = state.phases.filter(x => x.id !== phaseId);
        recalculateAllWBS(state.currentProjectId);
        syncToFirebase();
        renderAll();
        showToast(`已刪除階段「${cleanTierTitle(p.name)}」！`);
      }
    }

    function inlineDeleteModule(phaseId, moduleId, event) {
      if (event) event.stopPropagation();
      const p = state.phases.find(x => x.id === phaseId);
      if (!p) return;
      const m = (p.modules || []).find(x => x.id === moduleId);
      if (!m) return;
      if (confirm(`確定要刪除大功能「${cleanTierTitle(m.name)}」及其底下所有小功能任務嗎？`)) {
        p.modules = (p.modules || []).filter(x => x.id !== moduleId);
        recalculateAllWBS(state.currentProjectId);
        syncToFirebase();
        renderAll();
        showToast(`已刪除大功能「${cleanTierTitle(m.name)}」！`);
      }
    }

    function inlineDeleteTask(phaseId, moduleId, taskId, event) {
      if (event) event.stopPropagation();
      const p = state.phases.find(x => x.id === phaseId);
      if (!p) return;
      const m = (p.modules || []).find(x => x.id === moduleId);
      if (!m) return;
      const t = (m.tasks || []).find(x => x.id === taskId);
      if (!t) return;
      if (confirm(`確定要刪除功能「${t.title}」及其底下所有 Bug/CR 子項目嗎？`)) {
        m.tasks = (m.tasks || []).filter(x => x.id !== taskId);
        recalculateAllWBS(state.currentProjectId);
        syncToFirebase();
        renderAll();
        showToast(`已刪除功能「${t.title}」！`);
      }
    }

    function inlineDeleteSubTask(phaseId, moduleId, taskId, subTaskId, event) {
      if (event) event.stopPropagation();
      const p = state.phases.find(x => x.id === phaseId);
      if (!p) return;
      const m = (p.modules || []).find(x => x.id === moduleId);
      if (!m) return;
      const t = (m.tasks || []).find(x => x.id === taskId);
      if (!t) return;
      const st = (t.subTasks || []).find(x => x.id === subTaskId);
      if (!st) return;
      if (confirm(`確定要刪除 Bug/CR「${st.title}」嗎？`)) {
        t.subTasks = (t.subTasks || []).filter(x => x.id !== subTaskId);
        recalculateAllWBS(state.currentProjectId);
        syncToFirebase();
        renderAll();
        showToast(`已刪除 Bug/CR「${st.title}」！`);
      }
    }

    // Tree Row Drag & Drop Handlers
    let treeDragState = null;

    function onTreeDragStart(e, type, id, pId1, pId2) {
      e.stopPropagation();
      treeDragState = { type, id, pId1, pId2 };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      e.currentTarget.classList.add('tree-row-dragging');
    }

    function onTreeDragOver(e, type, targetId, pId1, pId2) {
      if (!treeDragState || treeDragState.type !== type) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';

      const row = e.currentTarget;
      const rect = row.getBoundingClientRect();
      const relY = e.clientY - rect.top;

      document.querySelectorAll('.gantt-left-row').forEach(el => {
        el.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
      });

      if (relY < rect.height / 2) {
        row.classList.add('drop-indicator-top');
      } else {
        row.classList.add('drop-indicator-bottom');
      }
    }

    function onTreeDragLeave(e) {
      e.currentTarget.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
    }

    function onTreeDragEnd(e) {
      document.querySelectorAll('.gantt-left-row').forEach(el => {
        el.classList.remove('tree-row-dragging', 'drop-indicator-top', 'drop-indicator-bottom');
      });
      treeDragState = null;
    }

    function onTreeDrop(e, targetType, targetId, targetP1, targetP2) {
      e.preventDefault();
      e.stopPropagation();

      if (!treeDragState || treeDragState.type !== targetType || treeDragState.id === targetId) {
        onTreeDragEnd(e);
        return;
      }

      const row = e.currentTarget;
      const rect = row.getBoundingClientRect();
      const isBefore = (e.clientY - rect.top) < (rect.height / 2);
      const currP = getCurrentProject();
      if (!currP) return;

      if (targetType === 'phase') {
        const pList = state.phases.filter(p => p.projectId === currP.id);
        const fromIdx = pList.findIndex(p => p.id === treeDragState.id);
        let toIdx = pList.findIndex(p => p.id === targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = pList.splice(fromIdx, 1);
          if (fromIdx < toIdx) toIdx--;
          if (!isBefore) toIdx++;
          pList.splice(toIdx, 0, moved);

          const otherPhases = state.phases.filter(p => p.projectId !== currP.id);
          state.phases = [...otherPhases, ...pList];
          recalculateAllWBS(currP.id);
          syncToFirebase();
          renderAll();
          showToast('階段順序已調整！');
        }
      } else if (targetType === 'module') {
        let movedMod = null;
        state.phases.forEach(p => {
          const idx = (p.modules || []).findIndex(m => m.id === treeDragState.id);
          if (idx !== -1) {
            movedMod = p.modules.splice(idx, 1)[0];
          }
        });

        const destPhase = state.phases.find(p => p.id === targetP1);
        if (movedMod && destPhase) {
          if (!destPhase.modules) destPhase.modules = [];
          let toIdx = destPhase.modules.findIndex(m => m.id === targetId);
          if (!isBefore) toIdx++;
          destPhase.modules.splice(toIdx, 0, movedMod);

          recalculateAllWBS(currP.id);
          syncToFirebase();
          renderAll();
          showToast('大功能順序已調整！');
        }
      } else if (targetType === 'task') {
        let movedTask = null;
        state.phases.forEach(p => {
          (p.modules || []).forEach(m => {
            const idx = (m.tasks || []).findIndex(t => t.id === treeDragState.id);
            if (idx !== -1) {
              movedTask = m.tasks.splice(idx, 1)[0];
            }
          });
        });

        let destMod = null;
        state.phases.forEach(p => {
          const m = (p.modules || []).find(mod => mod.id === targetP2);
          if (m) destMod = m;
        });

        if (movedTask && destMod) {
          if (!destMod.tasks) destMod.tasks = [];
          let toIdx = destMod.tasks.findIndex(t => t.id === targetId);
          if (!isBefore) toIdx++;
          destMod.tasks.splice(toIdx, 0, movedTask);

          recalculateAllWBS(currP.id);
          syncToFirebase();
          renderAll();
          showToast('小功能順序已調整！');
        }
      }

      onTreeDragEnd(e);
    }

    // Gantt Drag & Resize Handlers
    function startGanttDrag(e, taskId, mode = 'move') {
      e.preventDefault();
      e.stopPropagation();
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      const currentDayPixelWidth = window.currentGanttDayPixelWidth || 28;

      ganttDragState = {
        taskId,
        task,
        mode, // 'move', 'resize-left', 'resize-right'
        initialClientX: e.clientX,
        origStart: new Date((task.startDate || TODAY) + 'T00:00:00'),
        origDue: new Date((task.dueDate || TODAY) + 'T00:00:00'),
        dayPixelWidth: currentDayPixelWidth,
        hasMoved: false
      };

      document.addEventListener('mousemove', onGanttDragMove);
      document.addEventListener('mouseup', onGanttDragEnd);
    }

    function onGanttDragMove(e) {
      if (!ganttDragState) return;
      const deltaX = e.clientX - ganttDragState.initialClientX;
      if (Math.abs(deltaX) > 3) ganttDragState.hasMoved = true;
    }

    function onGanttDragEnd(e) {
      if (!ganttDragState) return;
      const deltaX = e.clientX - ganttDragState.initialClientX;
      const daysShift = Math.round(deltaX / (ganttDragState.dayPixelWidth || 28));

      document.removeEventListener('mousemove', onGanttDragMove);
      document.removeEventListener('mouseup', onGanttDragEnd);

      if (ganttDragState.hasMoved && daysShift !== 0) {
        const t = ganttDragState.task;
        if (ganttDragState.mode === 'move') {
          const s = new Date(ganttDragState.origStart);
          const d = new Date(ganttDragState.origDue);
          s.setDate(s.getDate() + daysShift);
          d.setDate(d.getDate() + daysShift);
          t.startDate = s.toISOString().split('T')[0];
          t.dueDate = d.toISOString().split('T')[0];
        } else if (ganttDragState.mode === 'resize-left') {
          const s = new Date(ganttDragState.origStart);
          s.setDate(s.getDate() + daysShift);
          if (s <= new Date(t.dueDate)) {
            t.startDate = s.toISOString().split('T')[0];
          }
        } else if (ganttDragState.mode === 'resize-right') {
          const d = new Date(ganttDragState.origDue);
          d.setDate(d.getDate() + daysShift);
          if (d >= new Date(t.startDate)) {
            t.dueDate = d.toISOString().split('T')[0];
          }
        }
        renderAll();
        showToast(`已更新「${t.title}」排程為：${t.startDate} ~ ${t.dueDate}`);
      } else if (!ganttDragState.hasMoved) {
        editTask(ganttDragState.taskId);
      }

      ganttDragState = null;
    }

    function setGanttScale(scale) {
      state.ganttScale = scale;
      renderGraphicalGantt();
    }

    function getGroupDateRange(items) {
      let minD = null;
      let maxD = null;
      function process(item) {
        if (!item) return;
        if (item.startDate) {
          const d = new Date(item.startDate + 'T00:00:00');
          if (!isNaN(d.getTime())) {
            if (!minD || d < minD) minD = d;
            if (!maxD || d > maxD) maxD = d;
          }
        }
        if (item.dueDate) {
          const d = new Date(item.dueDate + 'T00:00:00');
          if (!isNaN(d.getTime())) {
            if (!minD || d < minD) minD = d;
            if (!maxD || d > maxD) maxD = d;
          }
        }
      }

      (items || []).forEach(it => {
        process(it);
        if (it.modules && Array.isArray(it.modules)) {
          it.modules.forEach(m => {
            (m.tasks || []).forEach(t => {
              process(t);
              (t.subTasks || []).forEach(st => process(st));
            });
          });
        }
        if (it.tasks && Array.isArray(it.tasks)) {
          it.tasks.forEach(t => {
            process(t);
            (t.subTasks || []).forEach(st => process(st));
          });
        }
        if (it.subTasks && Array.isArray(it.subTasks)) {
          it.subTasks.forEach(st => process(st));
        }
      });

      if (!minD || !maxD) return null;
      const startStr = minD.toISOString().split('T')[0];
      const dueStr = maxD.toISOString().split('T')[0];
      return { startStr, dueStr };
    }

    function renderSummaryBar(x, w, y, height, color, labelText) {
      const endBracketW = 6;
      const bracketH = height + 4;
      return `
        <g class="gantt-summary-bar-group">
          <title>${labelText}</title>
          <rect x="${x}" y="${y}" width="${w}" height="${height}" rx="3" fill="${color}" opacity="0.85"/>
          <polygon points="${x},${y} ${x + endBracketW},${y} ${x},${y + bracketH}" fill="${color}"/>
          <polygon points="${x + w},${y} ${x + w - endBracketW},${y} ${x + w},${y + bracketH}" fill="${color}"/>
        </g>
      `;
    }

    function renderSingleTaskBar(t, rIndex, getX, getW, dayPixelWidth, rowH) {
      if (!t.startDate || !t.dueDate) {
        const x = getX(TODAY);
        const y = rIndex * rowH + 8;
        const placeholderW = Math.max(30, Math.round(dayPixelWidth * 3));
        return `
          <g class="gantt-bar-group" style="cursor:pointer;" onclick="editTask('${t.id}')">
            <title>${t.title} (規劃中，尚未設定排程)&#10;點擊以編輯排程與工時</title>
            <rect x="${x}" y="${y}" width="${placeholderW}" height="24" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,3"/>
            <text x="${x + 6}" y="${y + 16}" font-size="10" font-weight="600" fill="#94a3b8" pointer-events="none" style="user-select:none;">未排程</text>
          </g>
        `;
      }

      const x = getX(t.startDate);
      const w = getW(t.startDate, t.dueDate);
      const y = rIndex * rowH + 8;
      let barColor = '#0284c7';
      let bgFill = '#e0f2fe';
      if (t.status === '已完成') {
        barColor = '#16a34a'; bgFill = '#dcfce7';
      } else if (t.status === '待測試') {
        barColor = '#8b5cf6'; bgFill = '#f3e8ff';
      } else if (t.status === '待執行') {
        barColor = '#d97706'; bgFill = '#fef3c7';
      } else if (t.status === '規劃中') {
        barColor = '#64748b'; bgFill = '#f1f5f9';
      } else {
        barColor = t.type === 'Bug' ? '#d97706' : t.type === '需求變更' ? '#8b5cf6' : '#0284c7';
        bgFill = t.type === 'Bug' ? '#fef3c7' : t.type === '需求變更' ? '#f3e8ff' : '#e0f2fe';
      }

      const showTitle = w >= 36;
      return `
        <g class="gantt-bar-group">
          <title>${t.title} (${t.startDate} ~ ${t.dueDate})&#10;拖曳本體移動排程，拖曳兩端邊緣可調整工期</title>
          <rect x="${x}" y="${y}" width="${w}" height="24" rx="6" fill="${bgFill}" stroke="${barColor}" stroke-width="1.5" onmousedown="startGanttDrag(event, '${t.id}', 'move')"/>
          <rect class="gantt-resize-handle" x="${x}" y="${y}" width="6" height="24" rx="2" onmousedown="startGanttDrag(event, '${t.id}', 'resize-left')"/>
          <rect class="gantt-resize-handle" x="${x + w - 6}" y="${y}" width="6" height="24" rx="2" onmousedown="startGanttDrag(event, '${t.id}', 'resize-right')"/>
          ${showTitle ? `<text x="${x + 8}" y="${y + 16}" font-size="11" font-weight="700" fill="#0f172a" pointer-events="none" style="user-select:none;">${t.title}</text>` : ''}
        </g>
      `;
    }

    function renderGraphicalGantt() {
      const currP = getCurrentProject();
      if (!currP) return;

      const projectPhases = state.phases.filter(p => p.projectId === currP.id);
      const scale = state.ganttScale || 'day';
      const rowH = 40;

      // 1. Update scale switcher buttons UI
      ['year', 'quarter', 'month', 'week', 'day'].forEach(s => {
        const btn = document.getElementById(`btn-scale-${s}`);
        if (btn) {
          if (s === scale) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });

      // 2. Scan all tasks in current project for earliest and latest dates
      let minTaskDate = null;
      let maxTaskDate = null;
      let hasScheduledTasks = false;

          projectPhases.forEach(p => {
        (p.modules || []).forEach(m => {
          (m.tasks || []).forEach(t => {
            if (!isTaskVisibleToCurrentRole(t)) return;
            const checkDate = (dStr) => {
              if (!dStr) return;
              const d = new Date(dStr + 'T00:00:00');
              if (!isNaN(d.getTime())) {
                hasScheduledTasks = true;
                if (!minTaskDate || d < minTaskDate) minTaskDate = d;
                if (!maxTaskDate || d > maxTaskDate) maxTaskDate = d;
              }
            };
            checkDate(t.startDate);
            checkDate(t.dueDate);
            (t.subTasks || []).forEach(st => {
              if (!isTaskVisibleToCurrentRole(st)) return;
              checkDate(st.startDate);
              checkDate(st.dueDate);
            });
          });
        });
      });

      const today = new Date(TODAY + 'T00:00:00');
      if (!minTaskDate) minTaskDate = new Date(today.getFullYear(), today.getMonth(), 1);
      if (!maxTaskDate) maxTaskDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      if (maxTaskDate < minTaskDate) {
        maxTaskDate = new Date(minTaskDate.getFullYear(), minTaskDate.getMonth() + 1, 0);
      }

      // Update range label in toolbar
      const rangeLabelEl = document.getElementById('gantt-range-label');
      if (rangeLabelEl) {
        const y1 = minTaskDate.getFullYear();
        const m1 = String(minTaskDate.getMonth() + 1).padStart(2, '0');
        const d1 = String(minTaskDate.getDate()).padStart(2, '0');
        const y2 = maxTaskDate.getFullYear();
        const m2 = String(maxTaskDate.getMonth() + 1).padStart(2, '0');
        const d2 = String(maxTaskDate.getDate()).padStart(2, '0');
        rangeLabelEl.innerText = hasScheduledTasks ? `排程涵蓋範圍: ${y1}-${m1}-${d1} ~ ${y2}-${m2}-${d2}` : `排程涵蓋範圍: ${y1}-${m1}-${d1} ~ ${y2}-${m2}-${d2} (尚無排程任務)`;
      }

      const leftContainer = document.getElementById('gantt-left-rows');
      const rightContainer = document.getElementById('gantt-timeline-container');
      const headerWrap = document.getElementById('gantt-header-svg-wrap');
      const rightHeader = document.getElementById('gantt-right-header-container');
      const leftBody = document.getElementById('gantt-left-body');

      const prevScrollLeft = rightContainer ? rightContainer.scrollLeft : 0;
      const prevScrollTop = rightContainer ? rightContainer.scrollTop : 0;

      let leftHtml = '';
      let totalTreeRows = 0;

      projectPhases.forEach((phase, pIdx) => {
        totalTreeRows++;
        const pExpanded = phase.expanded !== false;
        leftHtml += `
          <div class="gantt-left-row level-1" 
               draggable="true" 
               ondragstart="onTreeDragStart(event, 'phase', '${phase.id}')" 
               ondragover="onTreeDragOver(event, 'phase', '${phase.id}')" 
               ondragleave="onTreeDragLeave(event)" 
               ondrop="onTreeDrop(event, 'phase', '${phase.id}')" 
               ondragend="onTreeDragEnd(event)">
            <div style="display:flex; align-items:center; gap:6px; overflow:hidden; flex:1; min-width:0;">
              <span class="tree-drag-grip" title="拖曳以調整階段順序">⋮⋮</span>
              <span style="cursor:pointer; font-size:11px; user-select:none;" onclick="toggleGanttExpand('phase', '${phase.id}')">${pExpanded ? '▼' : '▶'}</span>
              <span class="gantt-title-editable" id="phase-title-${phase.id}" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="點擊編輯第一階名稱" onclick="startInlineEditTitle('phase', '${phase.id}', event)"><span style="font-weight:800; color:#1e40af; margin-right:4px;">${pIdx + 1}.</span> ${cleanTierTitle(phase.name)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:2px; flex-shrink:0;">
              ${hasPermission('gantt_add_task') ? `<button class="gantt-icon-btn add-btn" title="新增模組" onclick="event.stopPropagation(); inlineAddModule('${phase.id}')">+</button>` : ''}
              ${hasPermission('gantt_add_phase') ? `<button class="gantt-icon-btn delete-btn" title="刪除此階段" onclick="event.stopPropagation(); inlineDeletePhase('${phase.id}', event)">🗑️</button>` : ''}
            </div>
          </div>
        `;

        if (pExpanded) {
          (phase.modules || []).forEach((module, mIdx) => {
            totalTreeRows++;
            const mExpanded = module.expanded !== false;
            leftHtml += `
              <div class="gantt-left-row level-2" 
                   draggable="true" 
                   ondragstart="onTreeDragStart(event, 'module', '${module.id}', '${phase.id}')" 
                   ondragover="onTreeDragOver(event, 'module', '${module.id}', '${phase.id}')" 
                   ondragleave="onTreeDragLeave(event)" 
                   ondrop="onTreeDrop(event, 'module', '${module.id}', '${phase.id}')" 
                   ondragend="onTreeDragEnd(event)">
                <div style="display:flex; align-items:center; gap:6px; overflow:hidden; flex:1; min-width:0;">
                  <span class="tree-drag-grip" title="拖曳以調整模組順序">⋮⋮</span>
                  <span style="cursor:pointer; font-size:11px; user-select:none;" onclick="toggleGanttExpand('module', '${module.id}')">${mExpanded ? '▼' : '▶'}</span>
                  <span class="gantt-title-editable" id="module-title-${module.id}" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="點擊編輯第二階名稱" onclick="startInlineEditTitle('module', '${module.id}', event)"><span style="font-weight:700; color:#2563eb; margin-right:4px;">${pIdx + 1}.${mIdx + 1}</span> ${cleanTierTitle(module.name)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:2px; flex-shrink:0;">
                  ${hasPermission('gantt_add_task') ? `<button class="gantt-icon-btn add-btn" title="新增功能 / CR" onclick="event.stopPropagation(); inlineAddFeature('${phase.id}', '${module.id}')">+</button>` : ''}
                  ${hasPermission('gantt_add_task') ? `<button class="gantt-icon-btn delete-btn" title="刪除此模組" onclick="event.stopPropagation(); inlineDeleteModule('${phase.id}', '${module.id}', event)">🗑️</button>` : ''}
                </div>
              </div>
            `;

            if (mExpanded) {
              (module.tasks || []).forEach((t, tIdx) => {
                if (!isTaskVisibleToCurrentRole(t)) return;
                totalTreeRows++;
                const tExpanded = t.expanded !== false;
                const hasSubTasks = t.subTasks && t.subTasks.length > 0;
                const l3Badge = t.type === '需求變更'
                  ? `<span style="background:#ffedd5; color:#ea580c; border:1px solid #fed7aa; font-size:9.5px; padding:1px 5px; border-radius:4px; font-weight:700; flex-shrink:0;">CR</span>`
                  : '';
                leftHtml += `
                  <div class="gantt-left-row level-3">
                    <div style="display:flex; align-items:center; gap:6px; overflow:hidden; flex:1; min-width:0; cursor:pointer;" onclick="editTask('${t.id}')">
                      ${hasSubTasks ? `<span style="cursor:pointer; font-size:11px; user-select:none;" onclick="event.stopPropagation(); toggleGanttExpand('task', '${t.id}')">${tExpanded ? '▼' : '▶'}</span>` : `<span style="width:11px; display:inline-block;"></span>`}
                      ${l3Badge}
                      <span style="font-size:10px; color:#2563eb; font-weight:700; font-family:monospace;">${t.wbs || `${pIdx + 1}.${mIdx + 1}.${tIdx + 1}`}</span>
                      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;" title="${t.title}">${t.title}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:3px; flex-shrink:0;">
                      <span class="badge ${getTaskBadgeClass(t.status)}" style="font-size:10px; cursor:pointer;" onclick="editTask('${t.id}')">${t.status}</span>
                      ${hasPermission('gantt_add_task') ? `<button class="gantt-icon-btn add-btn" title="新增 Bug / 優化 子項目" onclick="event.stopPropagation(); inlineAddSubTask('${phase.id}', '${module.id}', '${t.id}')">+</button>` : ''}
                      ${hasPermission('task_delete') ? `<button class="gantt-icon-btn delete-btn" title="刪除此功能/CR" onclick="event.stopPropagation(); inlineDeleteTask('${phase.id}', '${module.id}', '${t.id}', event)">🗑️</button>` : ''}
                    </div>
                  </div>
                `;

                if (tExpanded && hasSubTasks) {
                  (t.subTasks || []).forEach((st, stIdx) => {
                    if (!isTaskVisibleToCurrentRole(st)) return;
                    totalTreeRows++;
                    const typeBadge = st.type === 'Bug' 
                      ? `<span style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; font-size:9.5px; padding:1px 5px; border-radius:4px; font-weight:700; flex-shrink:0;">Bug 瑕疵</span>`
                      : `<span style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-size:9.5px; padding:1px 5px; border-radius:4px; font-weight:700; flex-shrink:0;">優化</span>`;
                    leftHtml += `
                      <div class="gantt-left-row level-4">
                        <div style="display:flex; align-items:center; gap:6px; overflow:hidden; flex:1; min-width:0; cursor:pointer;" onclick="editTask('${st.id}')">
                          ${typeBadge}
                          <span style="font-size:9.5px; color:#475569; font-weight:700; font-family:monospace;">${st.wbs || `${pIdx + 1}.${mIdx + 1}.${tIdx + 1}.${stIdx + 1}`}</span>
                          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#334155;" title="${st.title}">${st.title}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:3px; flex-shrink:0;">
                          <span class="badge ${getTaskBadgeClass(st.status)}" style="font-size:10px; cursor:pointer;" onclick="editTask('${st.id}')">${st.status}</span>
                          ${hasPermission('task_delete') ? `<button class="gantt-icon-btn delete-btn" title="刪除此 Bug/優化" onclick="event.stopPropagation(); inlineDeleteSubTask('${phase.id}', '${module.id}', '${t.id}', '${st.id}', event)">🗑️</button>` : ''}
                        </div>
                      </div>
                    `;
                  });
                }
              });
            }
          });
        }
      });

      if (leftContainer) {
        leftContainer.innerHTML = leftHtml || `<div style="padding:20px; color:#94a3b8; text-align:center;">此專案尚未建立排程階段</div>`;
      }

      // 3. Dynamic Timeline & Coordinate Calculation based on Scale
      const totalBodyHeight = Math.max(totalTreeRows * rowH, 200) + 20;
      let totalWidth = 0;
      let dayPixelWidth = 28;
      let getX = null;
      let getW = null;
      let topHeaderHtml = '';
      let subHeaderHtml = '';
      let gridColsHtml = '';

      if (scale === 'day') {
        const colWidth = 28;
        dayPixelWidth = colWidth;

        const timelineStart = new Date(minTaskDate.getFullYear(), minTaskDate.getMonth(), 1);
        const timelineEnd = new Date(maxTaskDate.getFullYear(), maxTaskDate.getMonth() + 1, 0);

        const totalDays = Math.max(1, Math.round((timelineEnd - timelineStart) / 86400000) + 1);
        totalWidth = totalDays * colWidth;

        getX = function(dateStr) {
          const d = new Date((dateStr || TODAY) + 'T00:00:00');
          const diff = Math.max(0, Math.floor((d - timelineStart) / 86400000));
          return diff * colWidth;
        };

        getW = function(startStr, endStr) {
          const x1 = getX(startStr);
          const x2 = getX(endStr) + colWidth;
          return Math.max(colWidth, x2 - x1);
        };

        const monthBlocks = [];
        let currentMonthBlock = null;

        for (let i = 0; i < totalDays; i++) {
          const d = new Date(timelineStart);
          d.setDate(d.getDate() + i);
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const key = `${y}-${m}`;

          if (!currentMonthBlock || currentMonthBlock.key !== key) {
            currentMonthBlock = { key, year: y, month: m, startIndex: i, count: 1 };
            monthBlocks.push(currentMonthBlock);
          } else {
            currentMonthBlock.count++;
          }

          const dayNum = d.getDate();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          subHeaderHtml += `
            <g>
              <rect x="${i * colWidth}" y="24" width="${colWidth}" height="24" fill="${isWeekend ? '#f1f5f9' : '#ffffff'}" stroke="#e2e8f0" stroke-width="0.5"/>
              <text x="${i * colWidth + colWidth / 2}" y="40" text-anchor="middle" font-size="11" font-weight="${isWeekend ? '400' : '600'}" fill="${isWeekend ? '#94a3b8' : '#475569'}" font-family="monospace" style="user-select:none;">${dayNum}</text>
            </g>
          `;

          gridColsHtml += `
            <rect x="${i * colWidth}" y="0" width="${colWidth}" height="${totalBodyHeight}" fill="${isWeekend ? '#f8fafc' : '#ffffff'}" stroke="#f1f5f9" stroke-width="1"/>
          `;
        }

        monthBlocks.forEach(block => {
          const x = block.startIndex * colWidth;
          const w = block.count * colWidth;
          topHeaderHtml += `
            <g>
              <rect x="${x}" y="0" width="${w}" height="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
              <text x="${x + 10}" y="16" text-anchor="start" font-size="11" font-weight="700" fill="#1e40af" style="user-select:none;">📅 ${block.year}年 ${block.month}月</text>
            </g>
          `;
        });
      } else if (scale === 'week') {
        const colWidth = 70; // 70px per week, 10px per day
        dayPixelWidth = colWidth / 7;

        const timelineStart = new Date(minTaskDate.getFullYear(), minTaskDate.getMonth(), 1);
        const dayOfWeek = timelineStart.getDay() === 0 ? 6 : timelineStart.getDay() - 1;
        timelineStart.setDate(timelineStart.getDate() - dayOfWeek);

        const timelineEnd = new Date(maxTaskDate.getFullYear(), maxTaskDate.getMonth() + 1, 0);
        const endDayOfWeek = timelineEnd.getDay() === 0 ? 6 : timelineEnd.getDay() - 1;
        timelineEnd.setDate(timelineEnd.getDate() + (6 - endDayOfWeek));

        const totalWeeks = Math.max(1, Math.round(((timelineEnd - timelineStart) / 86400000 + 1) / 7));
        totalWidth = totalWeeks * colWidth;

        getX = function(dateStr) {
          const d = new Date((dateStr || TODAY) + 'T00:00:00');
          const diff = Math.max(0, (d - timelineStart) / 86400000);
          return diff * dayPixelWidth;
        };

        getW = function(startStr, endStr) {
          const x1 = getX(startStr);
          const x2 = getX(endStr) + dayPixelWidth;
          return Math.max(dayPixelWidth, x2 - x1);
        };

        const monthBlocks = [];
        let currentMonthBlock = null;

        for (let w = 0; w < totalWeeks; w++) {
          const wStart = new Date(timelineStart);
          wStart.setDate(wStart.getDate() + w * 7);
          const wEnd = new Date(wStart);
          wEnd.setDate(wEnd.getDate() + 6);

          const y = wStart.getFullYear();
          const m = wStart.getMonth() + 1;
          const key = `${y}-${m}`;

          if (!currentMonthBlock || currentMonthBlock.key !== key) {
            currentMonthBlock = { key, year: y, month: m, startIndex: w, count: 1 };
            monthBlocks.push(currentMonthBlock);
          } else {
            currentMonthBlock.count++;
          }

          const weekLabel = `${wStart.getMonth() + 1}/${wStart.getDate()}~${wEnd.getMonth() + 1}/${wEnd.getDate()}`;

          subHeaderHtml += `
            <g>
              <rect x="${w * colWidth}" y="24" width="${colWidth}" height="24" fill="${w % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#e2e8f0" stroke-width="0.5"/>
              <text x="${w * colWidth + colWidth / 2}" y="40" text-anchor="middle" font-size="10" font-weight="600" fill="#475569" font-family="monospace" style="user-select:none;">${weekLabel}</text>
            </g>
          `;

          gridColsHtml += `
            <rect x="${w * colWidth}" y="0" width="${colWidth}" height="${totalBodyHeight}" fill="${w % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#f1f5f9" stroke-width="1"/>
          `;
        }

        monthBlocks.forEach(block => {
          const x = block.startIndex * colWidth;
          const w = block.count * colWidth;
          topHeaderHtml += `
            <g>
              <rect x="${x}" y="0" width="${w}" height="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
              <text x="${x + 10}" y="16" text-anchor="start" font-size="11" font-weight="700" fill="#1e40af" style="user-select:none;">📅 ${block.year}年 ${block.month}月</text>
            </g>
          `;
        });
      } else if (scale === 'month') {
        const colWidth = 90;
        dayPixelWidth = colWidth / 30.5;

        const startY = minTaskDate.getFullYear();
        const startM = minTaskDate.getMonth();
        let endY = maxTaskDate.getFullYear();
        let endM = maxTaskDate.getMonth();

        const monthsList = [];
        let curY = startY;
        let curM = startM;
        while (curY < endY || (curY === endY && curM <= endM)) {
          const daysInM = new Date(curY, curM + 1, 0).getDate();
          monthsList.push({
            year: curY,
            month: curM + 1,
            daysInMonth: daysInM,
            colIndex: monthsList.length
          });
          curM++;
          if (curM > 11) { curY++; curM = 0; }
        }

        totalWidth = monthsList.length * colWidth;

        getX = function(dateStr) {
          const d = new Date((dateStr || TODAY) + 'T00:00:00');
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const mIdx = monthsList.findIndex(item => item.year === y && item.month === m);
          if (mIdx === -1) {
            if (d < new Date(monthsList[0].year, monthsList[0].month - 1, 1)) return 0;
            return totalWidth;
          }
          const dayFraction = Math.max(0, Math.min(1, (d.getDate() - 1) / monthsList[mIdx].daysInMonth));
          return (mIdx + dayFraction) * colWidth;
        };

        getW = function(startStr, endStr) {
          const x1 = getX(startStr);
          const x2 = getX(endStr) + (colWidth / 30.5);
          return Math.max(colWidth / 30.5, x2 - x1);
        };

        const yearBlocks = [];
        let currentYearBlock = null;

        monthsList.forEach((mItem, idx) => {
          if (!currentYearBlock || currentYearBlock.year !== mItem.year) {
            currentYearBlock = { year: mItem.year, startIndex: idx, count: 1 };
            yearBlocks.push(currentYearBlock);
          } else {
            currentYearBlock.count++;
          }

          subHeaderHtml += `
            <g>
              <rect x="${idx * colWidth}" y="24" width="${colWidth}" height="24" fill="${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#e2e8f0" stroke-width="0.5"/>
              <text x="${idx * colWidth + colWidth / 2}" y="40" text-anchor="middle" font-size="11" font-weight="700" fill="#334155" style="user-select:none;">${mItem.month}月</text>
            </g>
          `;

          gridColsHtml += `
            <rect x="${idx * colWidth}" y="0" width="${colWidth}" height="${totalBodyHeight}" fill="${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#f1f5f9" stroke-width="1"/>
          `;
        });

        yearBlocks.forEach(block => {
          const bx = block.startIndex * colWidth;
          const bw = block.count * colWidth;
          topHeaderHtml += `
            <g>
              <rect x="${bx}" y="0" width="${bw}" height="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
              <text x="${bx + 10}" y="16" text-anchor="start" font-size="12" font-weight="800" fill="#1e40af" style="user-select:none;">📅 ${block.year} 年</text>
            </g>
          `;
        });
      } else if (scale === 'quarter') {
        const colWidth = 140;
        dayPixelWidth = colWidth / 91;

        const startY = minTaskDate.getFullYear();
        const startQ = Math.floor(minTaskDate.getMonth() / 3) + 1;
        let endY = maxTaskDate.getFullYear();
        let endQ = Math.floor(maxTaskDate.getMonth() / 3) + 1;

        const quartersList = [];
        let curY = startY;
        let curQ = startQ;
        while (curY < endY || (curY === endY && curQ <= endQ)) {
          const qStart = new Date(curY, (curQ - 1) * 3, 1);
          const qEnd = new Date(curY, curQ * 3, 0);
          const qDays = Math.round((qEnd - qStart) / 86400000) + 1;
          quartersList.push({
            year: curY,
            quarter: curQ,
            qStart,
            qEnd,
            qDays,
            colIndex: quartersList.length
          });
          curQ++;
          if (curQ > 4) { curY++; curQ = 1; }
        }

        totalWidth = quartersList.length * colWidth;

        getX = function(dateStr) {
          const d = new Date((dateStr || TODAY) + 'T00:00:00');
          const y = d.getFullYear();
          const q = Math.floor(d.getMonth() / 3) + 1;
          const qIdx = quartersList.findIndex(item => item.year === y && item.quarter === q);
          if (qIdx === -1) {
            if (d < quartersList[0].qStart) return 0;
            return totalWidth;
          }
          const item = quartersList[qIdx];
          const fraction = Math.max(0, Math.min(1, (d - item.qStart) / (item.qDays * 86400000)));
          return (qIdx + fraction) * colWidth;
        };

        getW = function(startStr, endStr) {
          const x1 = getX(startStr);
          const x2 = getX(endStr) + (colWidth / 91);
          return Math.max(colWidth / 91, x2 - x1);
        };

        const yearBlocks = [];
        let currentYearBlock = null;
        const qLabels = ['', 'Q1 (1~3月)', 'Q2 (4~6月)', 'Q3 (7~9月)', 'Q4 (10~12月)'];

        quartersList.forEach((qItem, idx) => {
          if (!currentYearBlock || currentYearBlock.year !== qItem.year) {
            currentYearBlock = { year: qItem.year, startIndex: idx, count: 1 };
            yearBlocks.push(currentYearBlock);
          } else {
            currentYearBlock.count++;
          }

          subHeaderHtml += `
            <g>
              <rect x="${idx * colWidth}" y="24" width="${colWidth}" height="24" fill="${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#e2e8f0" stroke-width="0.5"/>
              <text x="${idx * colWidth + colWidth / 2}" y="40" text-anchor="middle" font-size="11" font-weight="700" fill="#334155" style="user-select:none;">${qLabels[qItem.quarter]}</text>
            </g>
          `;

          gridColsHtml += `
            <rect x="${idx * colWidth}" y="0" width="${colWidth}" height="${totalBodyHeight}" fill="${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#f1f5f9" stroke-width="1"/>
          `;
        });

        yearBlocks.forEach(block => {
          const bx = block.startIndex * colWidth;
          const bw = block.count * colWidth;
          topHeaderHtml += `
            <g>
              <rect x="${bx}" y="0" width="${bw}" height="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
              <text x="${bx + 10}" y="16" text-anchor="start" font-size="12" font-weight="800" fill="#1e40af" style="user-select:none;">📅 ${block.year} 年</text>
            </g>
          `;
        });
      } else if (scale === 'year') {
        const colWidth = 240;
        dayPixelWidth = colWidth / 365;

        const startY = minTaskDate.getFullYear();
        let endY = Math.max(startY, maxTaskDate.getFullYear());

        const yearsList = [];
        for (let y = startY; y <= endY; y++) {
          const yStart = new Date(y, 0, 1);
          const yEnd = new Date(y, 11, 31);
          const yDays = Math.round((yEnd - yStart) / 86400000) + 1;
          yearsList.push({ year: y, yStart, yEnd, yDays, colIndex: yearsList.length });
        }

        totalWidth = yearsList.length * colWidth;

        getX = function(dateStr) {
          const d = new Date((dateStr || TODAY) + 'T00:00:00');
          const y = d.getFullYear();
          const yIdx = yearsList.findIndex(item => item.year === y);
          if (yIdx === -1) {
            if (d < yearsList[0].yStart) return 0;
            return totalWidth;
          }
          const item = yearsList[yIdx];
          const fraction = Math.max(0, Math.min(1, (d - item.yStart) / (item.yDays * 86400000)));
          return (yIdx + fraction) * colWidth;
        };

        getW = function(startStr, endStr) {
          const x1 = getX(startStr);
          const x2 = getX(endStr) + (colWidth / 365);
          return Math.max(colWidth / 365, x2 - x1);
        };

        topHeaderHtml = `
          <g>
            <rect x="0" y="0" width="${totalWidth}" height="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
            <text x="14" y="16" text-anchor="start" font-size="12" font-weight="800" fill="#1e40af" style="user-select:none;">📅 年度排程全貌 (Yearly Overview)</text>
          </g>
        `;

        yearsList.forEach((yItem, idx) => {
          subHeaderHtml += `
            <g>
              <rect x="${idx * colWidth}" y="24" width="${colWidth}" height="24" fill="${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#e2e8f0" stroke-width="0.5"/>
              <text x="${idx * colWidth + colWidth / 2}" y="40" text-anchor="middle" font-size="12" font-weight="800" fill="#334155" style="user-select:none;">${yItem.year} 年度</text>
            </g>
          `;

          gridColsHtml += `
            <rect x="${idx * colWidth}" y="0" width="${colWidth}" height="${totalBodyHeight}" fill="${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#f1f5f9" stroke-width="1"/>
          `;
        });
      }

      window.currentGanttDayPixelWidth = dayPixelWidth;

      let currentRow = 0;
      let barsHtml = '';

      projectPhases.forEach(phase => {
        const pRow = currentRow++;
        const pExpanded = phase.expanded !== false;

        const pRange = getGroupDateRange([phase]);
        if (pRange && pRange.startStr && pRange.dueStr) {
          const x = getX(pRange.startStr);
          const w = getW(pRange.startStr, pRange.dueStr);
          const y = pRow * rowH + 13;
          barsHtml += renderSummaryBar(x, w, y, 14, '#1e40af', `${cleanTierTitle(phase.name)} (階段總區間)`);
        }

        if (pExpanded) {
          (phase.modules || []).forEach(module => {
            const mRow = currentRow++;
            const mExpanded = module.expanded !== false;

            const mRange = getGroupDateRange(module.tasks || []);
            if (mRange && mRange.startStr && mRange.dueStr) {
              const x = getX(mRange.startStr);
              const w = getW(mRange.startStr, mRange.dueStr);
              const y = mRow * rowH + 14;
              barsHtml += renderSummaryBar(x, w, y, 12, '#2563eb', `${cleanTierTitle(module.name)} (模組總區間)`);
            }

            if (mExpanded) {
              (module.tasks || []).forEach(t => {
                if (!isTaskVisibleToCurrentRole(t)) return;
                const tRow = currentRow++;
                const tExpanded = t.expanded !== false;
                const hasSubTasks = t.subTasks && t.subTasks.length > 0;

                if (hasSubTasks) {
                  const tRange = getGroupDateRange([t]);
                  if (tRange && tRange.startStr && tRange.dueStr) {
                    const x = getX(tRange.startStr);
                    const w = getW(tRange.startStr, tRange.dueStr);
                    const y = tRow * rowH + 15;
                    barsHtml += renderSummaryBar(x, w, y, 10, '#0284c7', `${t.title} (功能總彙總)`);
                  }
                } else {
                  barsHtml += renderSingleTaskBar(t, tRow, getX, getW, dayPixelWidth, rowH);
                }

                if (tExpanded && hasSubTasks) {
                  (t.subTasks || []).forEach(st => {
                    if (!isTaskVisibleToCurrentRole(st)) return;
                    const stRow = currentRow++;
                    barsHtml += renderSingleTaskBar(st, stRow, getX, getW, dayPixelWidth, rowH);
                  });
                }
              });
            }
          });
        }
      });

      // 4. Render Fixed Header SVG
      if (headerWrap) {
        headerWrap.innerHTML = `
          <svg width="${totalWidth}" height="48" style="display:block;">
            ${topHeaderHtml}
            ${subHeaderHtml}
            <line x1="0" y1="24" x2="${totalWidth}" y2="24" stroke="#cbd5e1" stroke-width="1"/>
            <line x1="0" y1="48" x2="${totalWidth}" y2="48" stroke="#cbd5e1" stroke-width="1"/>
          </svg>
        `;
      }

      // 5. Render Scrollable Body SVG
      if (rightContainer) {
        rightContainer.innerHTML = `
          <svg width="${totalWidth}" height="${totalBodyHeight}" style="display:block;">
            ${gridColsHtml}
            ${barsHtml}
          </svg>
        `;
      }

      // 3. Restore Scroll Positions
      if (rightContainer) {
        rightContainer.scrollLeft = prevScrollLeft;
        rightContainer.scrollTop = prevScrollTop;
      }
      if (rightHeader) {
        rightHeader.scrollLeft = prevScrollLeft;
      }
      if (leftBody) {
        leftBody.scrollTop = prevScrollTop;
      }

      // 4. Attach Synchronized Scrolling (Horizontal header sync + Vertical tree sync)
      if (rightContainer) {
        let isSyncing = false;
        rightContainer.onscroll = () => {
          if (rightHeader) rightHeader.scrollLeft = rightContainer.scrollLeft;
          if (!isSyncing && leftBody) {
            isSyncing = true;
            leftBody.scrollTop = rightContainer.scrollTop;
            isSyncing = false;
          }
        };

        if (leftBody) {
          leftBody.onscroll = () => {
            if (!isSyncing && rightContainer) {
              isSyncing = true;
              rightContainer.scrollTop = leftBody.scrollTop;
              isSyncing = false;
            }
          };
        }

        if (rightHeader) {
          rightHeader.onwheel = (e) => {
            if (e.deltaX !== 0) {
              rightContainer.scrollLeft += e.deltaX;
            } else if (e.deltaY !== 0) {
              rightContainer.scrollLeft += e.deltaY;
            }
          };
        }
      }
    }

    // ================= 7. WORK LOGS =================
    function renderWorkLogsTable() {
      const tbody = document.getElementById('worklogs-table-body');
      if (!tbody) return;

      const currP = getCurrentProject();
      // Filter worklogs belonging to current project
      const logs = state.workLogs.filter(l => {
        const t = state.tasks.find(x => x.id === l.taskId);
        return t && t.projectId === currP.id && isTaskVisibleToCurrentRole(t);
      });

      tbody.innerHTML = logs.map(l => {
        const t = state.tasks.find(x => x.id === l.taskId);
        return `
          <tr>
            <td style="font-family:monospace; font-weight:700; color:#0f172a;">${l.date}</td>
            <td>
              <div style="font-weight:700; color:#2563eb;">${t ? t.title : '未知任務'}</div>
              <div style="font-size:11px; color:#64748b;">專案: ${currP.name}</div>
            </td>
            <td style="font-weight:600;">${l.userName}</td>
            <td>
              <span class="badge badge-info" style="font-size:12px; font-weight:800;">${l.hours} 小時</span>
            </td>
            <td style="color:#475569; font-size:12px;">${l.notes || '-'}</td>
            <td style="text-align: right;">
              ${hasPermission('worklog_edit') ? `<button class="btn btn-secondary btn-xs" onclick="editWorkLog('${l.id}')">編輯</button>` : ''}
              ${hasPermission('worklog_delete') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteWorkLog('${l.id}')">刪除</button>` : ''}
            </td>
          </tr>
        `;
      }).join('') || `<tr><td colspan="6" style="text-align:center; padding:24px; color:#94a3b8;">目前專案尚無工時填報紀錄</td></tr>`;

      // Summary grid
      const grid = document.getElementById('member-hours-summary-grid');
      if (grid) {
        grid.innerHTML = state.members.map(m => {
          const mLogs = logs.filter(l => l.userName.includes(m.name.split(' ')[0]));
          const mSum = mLogs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
          return `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:12px; font-weight:700; color:#334155;">${m.name}</div>
              <div style="font-size:18px; font-weight:800; color:#2563eb; margin-top:4px;">${mSum}h</div>
            </div>
          `;
        }).join('');
      }
    }

    function updateWorkLogUserDropdown(taskId, preferredUser = null) {
      const activeUserName = getCurrentUserName();
      const hiddenInput = document.getElementById('form-worklog-user');
      const displayEl = document.getElementById('form-worklog-user-display');
      
      const targetUser = preferredUser || activeUserName;
      if (hiddenInput) hiddenInput.value = targetUser;
      if (displayEl) {
        const m = state.members.find(mem => mem.name === targetUser || targetUser.includes(mem.name) || mem.name.includes(targetUser));
        const roleStr = m ? ` (${m.role})` : '';
        displayEl.innerText = `${targetUser}${roleStr}`;
      }
    }

    function onWorkLogTaskSelectChanged(taskId) {
      updateWorkLogUserDropdown(taskId);
    }

    function openWorkLogModal(id = null) {
      state.tasks = getFlatTasks();
      document.getElementById('form-worklog-id').value = id || '';
      document.getElementById('modal-worklog-title').innerText = id ? '編輯工時日誌' : '填報工時日誌 (Log Work)';

      const currP = getCurrentProject();
      const taskSelect = document.getElementById('form-worklog-task');
      const isManager = isCurrentRoleManager();

      let pTasks = state.tasks.filter(t => t.projectId === currP.id && t.status !== '規劃中');
      if (!isManager) {
        pTasks = pTasks.filter(t => checkIsTaskAssignee(t));
      }

      if (pTasks.length > 0) {
        taskSelect.innerHTML = pTasks.map(t => `<option value="${t.id}">[${t.wbs || t.type}] ${t.title} (${t.status})</option>`).join('');
      } else {
        taskSelect.innerHTML = `<option value="">${isManager ? '（此專案目前尚無已進入執行/測試之任務）' : '（目前尚無指派給您的執行中任務）'}</option>`;
      }

      if (id) {
        const l = state.workLogs.find(x => x.id === id);
        if (l) {
          taskSelect.value = l.taskId;
          document.getElementById('form-worklog-date').value = l.date;
          document.getElementById('form-worklog-hours').value = l.hours;
          document.getElementById('form-worklog-notes').value = l.notes || '';
          updateWorkLogUserDropdown(l.taskId, l.userName);
        }
      } else {
        document.getElementById('form-worklog-date').value = TODAY;
        document.getElementById('form-worklog-hours').value = '4';
        document.getElementById('form-worklog-notes').value = '';
        const initialTaskId = taskSelect.value;
        updateWorkLogUserDropdown(initialTaskId);
      }
      openModal('modal-worklog');
    }

    function saveWorkLog() {
      const id = document.getElementById('form-worklog-id').value;
      const taskId = document.getElementById('form-worklog-task').value;
      const date = document.getElementById('form-worklog-date').value;
      const hours = Number(document.getElementById('form-worklog-hours').value) || 0;
      
      const activeUserName = getCurrentUserName();
      const hiddenInputVal = document.getElementById('form-worklog-user')?.value;
      const userName = (hiddenInputVal || activeUserName || '').trim();
      const notes = document.getElementById('form-worklog-notes').value.trim();

      if (!taskId) {
        alert('請選擇欲填報工時的任務！');
        return;
      }

      const task = state.tasks.find(t => t.id === taskId);
      if (!task) {
        alert('找不到對應的任務！');
        return;
      }

      if (!userName) {
        alert('無法取得填報人員姓名！請確認目前登入狀態。');
        return;
      }

      if (!date || hours <= 0) {
        alert('請確實填寫填報日期與有效投入工時（必須大於 0 小時）！');
        return;
      }

      // 權限檢查：只有此任務指派之執行人員（或主管）才能記錄個人工時
      const isManager = isCurrentRoleManager();
      const assignees = getTaskAssignees(task);
      const isUserAssigned = assignees.length > 0
        ? assignees.some(u => checkSingleMemberMatchesCurrentUser(u) || u === userName || u.includes(userName) || userName.includes(u))
        : (task.estimator && (checkSingleMemberMatchesCurrentUser(task.estimator) || task.estimator === userName || task.estimator.includes(userName) || userName.includes(task.estimator)));

      if (!isUserAssigned && !isManager) {
        alert(`⚠️ 權限不足：您（${userName}）非此任務指派之執行人員，無法記錄工時！`);
        return;
      }

      if (id) {
        const l = state.workLogs.find(x => x.id === id);
        if (l) {
          l.taskId = taskId; l.date = date; l.hours = hours; l.userName = userName; l.notes = notes;
        }
        showToast('工時記錄已更新！');
      } else {
        state.workLogs.push({ id: 'log-' + Date.now(), taskId, date, hours, userName, notes });
        showToast('工時填報成功！');
      }

      // 更新任務實際累積工時、滾動實際開始日與狀態
      recalculateActualHoursFromWorkLogs();

      syncToFirebase();
      closeModal('modal-worklog');
      renderAll();
    }

    function editWorkLog(id) { openWorkLogModal(id); }
    function deleteWorkLog(id) {
      if (confirm('確定刪除此工時記錄嗎？')) {
        state.workLogs = state.workLogs.filter(l => l.id !== id);
        recalculateActualHoursFromWorkLogs();
        syncToFirebase();
        renderAll();
        showToast('工時已刪除');
      }
    }

    // ================= 8. TASKS & ISSUES =================
    function setTaskFilter(type, btn) {
      currentTaskFilter = type;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
      if (btn) btn.classList.add('active-tab');
      renderTasksTable();
    }

    function renderTasksTable() {
      const container = document.getElementById('tasks-hierarchical-container');
      if (!container) return;

      const currP = getCurrentProject();
      const projectPhases = state.phases.filter(p => p.projectId === currP.id);
      const searchKeyword = (document.getElementById('tasks-search-input')?.value || '').toLowerCase().trim();

      let html = '';

      projectPhases.forEach((phase, pIdx) => {
        let phaseModulesHtml = '';
        let phaseItemCount = 0;

        (phase.modules || []).forEach((module, mIdx) => {
          let moduleTasks = (module.tasks || []).filter(t => {
            if (!isTaskVisibleToCurrentRole(t)) return false;
            if (currentTaskFilter !== 'all' && t.type !== currentTaskFilter) return false;
            if (searchKeyword) {
              const matchTitle = (t.title || '').toLowerCase().includes(searchKeyword);
              const matchAssignee = (t.assignee || '').toLowerCase().includes(searchKeyword);
              const matchEstimator = (t.estimator || '').toLowerCase().includes(searchKeyword);
              return matchTitle || matchAssignee || matchEstimator;
            }
            return true;
          });

          phaseItemCount += moduleTasks.length;

          if (moduleTasks.length > 0) {
            const taskRows = moduleTasks.map(t => {
              const typeBadge = t.type === 'Bug' ? 'badge-danger' : t.type === '需求變更' ? 'badge-purple' : 'badge-info';
              const workDaysCount = calculateWorkingDays(t.startDate, t.dueDate);
              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-weight:700; color:#2563eb; font-size:11px;">${t.wbs || '★'}</span>
                      <strong style="color:#0f172a;">${t.title}</strong>
                    </div>
                  </td>
                  <td><span class="badge ${typeBadge}">${t.type}</span></td>
                  <td>${currP.name}</td>
                  <td>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                      ${
                        (() => {
                          const assignees = getTaskAssignees(t);
                          if (assignees.length === 0) return '<span style="color:#94a3b8; font-size:12px;">未指派</span>';
                          return assignees.map(a => `<span class="badge badge-info" style="font-size:11px; padding:2px 6px;">${a}</span>`).join(' ');
                        })()
                      }
                    </div>
                    ${t.estimator ? `<div style="font-size:11px; color:#475569; margin-top:4px;"><span style="color:#2563eb; font-weight:700;">🔍 評估:</span> ${t.estimator}</div>` : ''}
                  </td>
                  <td>${t.severity || '無'}</td>
                  <td style="font-family:monospace; font-size:12px;">
                    <div>${t.startDate} ~ ${t.dueDate}</div>
                    <div style="font-size:11px; color:#15803d; font-weight:700;">共 ${workDaysCount} 個工作天</div>
                  </td>
                  <td style="font-family:monospace; font-weight:700;">${t.estHours} / ${t.actHours} 小時</td>
                  <td><span class="badge ${getTaskBadgeClass(t.status)}">${t.status}</span></td>
                  <td style="text-align: right; white-space:nowrap;">
                    ${hasPermission('task_edit') ? `<button class="btn btn-secondary btn-xs" onclick="editTask('${t.id}')">編輯</button>` : ''}
                    ${hasPermission('task_delete') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteTask('${t.id}')">刪除</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('');

            phaseModulesHtml += `
              <div style="margin-bottom:14px; background:white; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <div style="background:#f1f5f9; padding:8px 14px; font-weight:700; font-size:12px; color:#1e3a8a; display:flex; justify-content:space-between; align-items:center;">
                  <span>📁 ${pIdx + 1}.${mIdx + 1} ${cleanTierTitle(module.name)}</span>
                  <span class="badge badge-info">${moduleTasks.length} 個項目</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>任務/議題名稱</th>
                      <th>類型</th>
                      <th>所屬主專案</th>
                      <th>指派執行人 / 評估人</th>
                      <th>危害等級</th>
                      <th>開始~截止日期</th>
                      <th>預估/實際工時</th>
                      <th>狀態</th>
                      <th style="text-align:right;">操作項目</th>
                    </tr>
                  </thead>
                  <tbody>${taskRows}</tbody>
                </table>
              </div>
            `;
          }
        });

        if (phaseModulesHtml) {
          html += `
            <div class="card" style="padding:16px; border-left:4px solid #2563eb;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="font-size:14px; font-weight:800; color:#1e40af;">📂 ${pIdx + 1}. ${cleanTierTitle(phase.name)}</h3>
                <span class="badge badge-purple">${phaseItemCount} 個項目</span>
              </div>
              ${phaseModulesHtml}
            </div>
          `;
        }
      });

      container.innerHTML = html || `<div class="card" style="text-align:center; padding:36px; color:#94a3b8;">此專案目前無符合篩選條件之任務與議題</div>`;
    }

    let isEditingModalTaskTitle = false;

    function setModalTaskTitle(title, isNew = false) {
      isEditingModalTaskTitle = false;
      const container = document.getElementById('modal-task-title-wrapper');
      if (!container) return;
      const hasTitle = Boolean(title && title.trim());
      const displayTitle = hasTitle ? title.trim() : (isNew ? '未命名任務 (點擊輸入名稱)' : '未命名項目');
      container.innerHTML = `
        <span class="task-modal-title-editable" id="modal-task-title" onclick="startModalTaskTitleEdit(event)" title="點擊直接編輯項目名稱">
          <span id="modal-task-title-text" style="${!hasTitle ? 'color: #64748b; font-weight: 600;' : ''}">${displayTitle}</span>
        </span>
      `;
    }

    function startModalTaskTitleEdit(event) {
      if (event) event.stopPropagation();
      const container = document.getElementById('modal-task-title-wrapper');
      if (!container) return;
      isEditingModalTaskTitle = true;
      let currentVal = document.getElementById('form-task-title')?.value || '';
      if (!currentVal) {
        const textVal = document.getElementById('modal-task-title-text')?.innerText || '';
        if (textVal && !textVal.includes('點擊輸入') && !textVal.includes('新增任務')) {
          currentVal = textVal;
        }
      }
      
      container.innerHTML = `
        <input 
          type="text" 
          id="modal-task-title-input" 
          class="modal-task-title-input" 
          placeholder="請輸入項目名稱..."
          onclick="event.stopPropagation();"
          onkeydown="handleModalTaskTitleKey(event, this)"
          onblur="finishModalTaskTitleEdit(this.value)"
        />
      `;
      const input = document.getElementById('modal-task-title-input');
      if (input) {
        input.value = currentVal;
        input.focus();
        input.select();
      }
    }

    function handleModalTaskTitleKey(event, inputEl) {
      if (event.key === 'Enter') {
        event.preventDefault();
        inputEl.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        isEditingModalTaskTitle = false;
        const currentFormVal = document.getElementById('form-task-title')?.value || '';
        const isNew = !document.getElementById('form-task-id')?.value;
        setModalTaskTitle(currentFormVal, isNew);
      }
    }

    function finishModalTaskTitleEdit(newVal) {
      if (!isEditingModalTaskTitle) return;
      isEditingModalTaskTitle = false;
      const trimmed = (newVal || '').trim();
      const formInput = document.getElementById('form-task-title');
      const isNew = !document.getElementById('form-task-id')?.value;
      
      const finalTitle = trimmed || (formInput ? formInput.value.trim() : '') || (isNew ? '新增任務 / 排程項目' : '未命名項目');

      if (formInput && trimmed) {
        formInput.value = trimmed;
      }
      const bodyInput = document.getElementById('form-task-title-input');
      if (bodyInput) {
        bodyInput.value = trimmed;
      }
      setModalTaskTitle(finalTitle, isNew);

      // If existing task, sync immediately into state and background
      const taskId = document.getElementById('form-task-id')?.value;
      if (taskId && trimmed) {
        const t = state.tasks.find(x => x.id === taskId);
        if (t && t.title !== trimmed) {
          t.title = trimmed;
          state.phases.forEach(p => {
            (p.modules || []).forEach(m => {
              const mt = (m.tasks || []).find(x => x.id === taskId);
              if (mt) mt.title = trimmed;
            });
          });
          syncToFirebase();
          renderGraphicalGantt();
          if (typeof renderTasksTable === 'function') renderTasksTable();
          showToast(`已更新項目名稱為「${trimmed}」！`);
        }
      }
    }

    function onFormTaskTitleInput(val) {
      if (isEditingModalTaskTitle) return;
      const textEl = document.getElementById('modal-task-title-text');
      const isNew = !document.getElementById('form-task-id')?.value;
      const hasVal = Boolean(val && val.trim());
      if (textEl) {
        textEl.innerText = hasVal ? val.trim() : (isNew ? '未命名任務 (點擊輸入名稱)' : '未命名項目');
        textEl.style.color = hasVal ? '' : '#64748b';
        textEl.style.fontWeight = hasVal ? '' : '600';
      }
      const hiddenInput = document.getElementById('form-task-title');
      if (hiddenInput) hiddenInput.value = val;
    }

    function onTaskTypeChange(typeVal) {
      updateTaskTypeSeverityState(typeVal);
    }

    function updateTaskTypeSeverityState(typeVal) {
      const isBug = (typeVal === 'Bug');
      const sevGroup = document.getElementById('form-group-task-severity');
      const row = document.getElementById('row-task-status-severity');
      if (sevGroup) {
        sevGroup.style.display = isBug ? 'block' : 'none';
      }
      if (row) {
        row.style.gridTemplateColumns = isBug ? '1fr 1fr' : '1fr';
      }
      if (!isBug) {
        const sevSelect = document.getElementById('form-task-severity');
        if (sevSelect) sevSelect.value = '無';
      }
    }

    const WEEKDAYS_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    const bookingPickerState = {
      viewYear: new Date().getFullYear(),
      viewMonth: new Date().getMonth(), // 0-indexed
      isSelectingEnd: false,
      isOpen: false,
      disabled: false
    };

    function formatBookingDateDisplay(dateStr) {
      if (!dateStr) return { dateText: '-- 年 -- 月 -- 日', weekText: '尚未選擇' };
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { dateText: dateStr, weekText: '' };
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m - 1, d);
      const weekText = !isNaN(dt.getTime()) ? WEEKDAYS_ZH[dt.getDay()] : '';
      return {
        dateText: `${y}年${m}月${d}日`,
        weekText: weekText
      };
    }

    function updateScheduleRangeSummary() {
      const startVal = document.getElementById('form-task-start')?.value || '';
      const dueVal = document.getElementById('form-task-due')?.value || '';
      updateBookingRangeDisplay(startVal, dueVal);
    }

    function updateBookingRangeDisplay(startVal, dueVal) {
      const startInfo = formatBookingDateDisplay(startVal);
      const dueInfo = formatBookingDateDisplay(dueVal);

      const startTextEl = document.getElementById('booking-text-start-date');
      const startWeekEl = document.getElementById('booking-text-start-week');
      const dueTextEl = document.getElementById('booking-text-end-date');
      const dueWeekEl = document.getElementById('booking-text-end-week');
      const badge = document.getElementById('badge-range-days');
      const summaryTextEl = document.getElementById('booking-picker-summary-text');

      if (startTextEl) startTextEl.innerText = startInfo.dateText;
      if (startWeekEl) startWeekEl.innerText = startInfo.weekText;
      if (dueTextEl) dueTextEl.innerText = dueInfo.dateText;
      if (dueWeekEl) dueWeekEl.innerText = dueInfo.weekText;

      let diffDays = 0;
      let isInvalid = false;

      if (startVal && dueVal) {
        const d1 = new Date(startVal + 'T00:00:00');
        const d2 = new Date(dueVal + 'T00:00:00');
        const diffMs = d2 - d1;
        diffDays = Math.round(diffMs / 86400000) + 1;
        if (diffDays <= 0) isInvalid = true;
      }

      if (badge) {
        if (!startVal && !dueVal) {
          badge.innerText = '未設定區間';
          badge.style.background = '#f1f5f9';
          badge.style.color = '#64748b';
          badge.style.borderColor = '#cbd5e1';
        } else if (startVal && !dueVal) {
          badge.innerText = `自 ${startVal} 起`;
          badge.style.background = '#fef3c7';
          badge.style.color = '#b45309';
          badge.style.borderColor = '#fde68a';
        } else if (!startVal && dueVal) {
          badge.innerText = `至 ${dueVal} 止`;
          badge.style.background = '#fef3c7';
          badge.style.color = '#b45309';
          badge.style.borderColor = '#fde68a';
        } else if (isInvalid) {
          badge.innerText = '⚠️ 結束早於開始';
          badge.style.background = '#fee2e2';
          badge.style.color = '#b91c1c';
          badge.style.borderColor = '#fecaca';
        } else {
          const workDays = calculateWorkingDays(startVal, dueVal);
          badge.innerText = `共 ${workDays} 個工作天 (上班日)`;
          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          badge.style.borderColor = '#86efac';
        }
      }

      if (summaryTextEl) {
        if (!startVal && !dueVal) {
          summaryTextEl.innerText = '請在日曆上點選預估開始日期';
          summaryTextEl.style.color = '#64748b';
        } else if (startVal && !dueVal) {
          summaryTextEl.innerText = `已選擇開始日：${startVal} (${startInfo.weekText})，請點選結束日期`;
          summaryTextEl.style.color = '#b45309';
        } else if (isInvalid) {
          summaryTextEl.innerText = `⚠️ 結束時間 (${dueVal}) 不能早於開始時間 (${startVal})`;
          summaryTextEl.style.color = '#b91c1c';
        } else {
          const workDays = calculateWorkingDays(startVal, dueVal);
          summaryTextEl.innerText = `${startVal} (${startInfo.weekText}) ～ ${dueVal} (${dueInfo.weekText}) · 共 ${workDays} 個工作天 (上班日) / 含例休共 ${diffDays} 天`;
          summaryTextEl.style.color = '#15803d';
        }
      }
    }

    function toggleDateRangePicker(e) {
      if (e) e.stopPropagation();
      if (bookingPickerState.disabled) return;
      if (bookingPickerState.isOpen) {
        closeDateRangePicker();
      } else {
        openDateRangePicker();
      }
    }

    function openDateRangePicker() {
      if (bookingPickerState.disabled) return;
      const startVal = document.getElementById('form-task-start')?.value;
      if (startVal) {
        const parts = startVal.split('-');
        if (parts.length === 3) {
          bookingPickerState.viewYear = parseInt(parts[0], 10);
          bookingPickerState.viewMonth = parseInt(parts[1], 10) - 1;
        }
      } else {
        const now = new Date();
        bookingPickerState.viewYear = now.getFullYear();
        bookingPickerState.viewMonth = now.getMonth();
      }
      bookingPickerState.isSelectingEnd = false;
      bookingPickerState.isOpen = true;

      const field = document.getElementById('booking-date-range-field');
      const popover = document.getElementById('booking-picker-popover');
      if (field) field.classList.add('is-open');
      if (popover) popover.style.display = 'block';

      renderDualMonthCalendar();
      updateScheduleRangeSummary();
      setTimeout(() => {
        const modalBody = document.querySelector('#modal-task .modal-body');
        if (modalBody && popover) {
          const popoverBottom = popover.offsetTop + popover.offsetHeight;
          if (popoverBottom > modalBody.scrollTop + modalBody.clientHeight) {
            modalBody.scrollTo({ top: popoverBottom - modalBody.clientHeight + 40, behavior: 'smooth' });
          }
        }
      }, 10);
    }

    function closeDateRangePicker() {
      bookingPickerState.isOpen = false;
      bookingPickerState.isSelectingEnd = false;
      const field = document.getElementById('booking-date-range-field');
      const popover = document.getElementById('booking-picker-popover');
      if (field) field.classList.remove('is-open');
      if (popover) popover.style.display = 'none';
    }

    function navPickerMonth(direction) {
      bookingPickerState.viewMonth += direction;
      const d = new Date(bookingPickerState.viewYear, bookingPickerState.viewMonth, 1);
      bookingPickerState.viewYear = d.getFullYear();
      bookingPickerState.viewMonth = d.getMonth();
      renderDualMonthCalendar();
    }

    function renderDualMonthCalendar() {
      const yearL = bookingPickerState.viewYear;
      const monthL = bookingPickerState.viewMonth;

      const dRight = new Date(yearL, monthL + 1, 1);
      const yearR = dRight.getFullYear();
      const monthR = dRight.getMonth();

      const titleL = document.getElementById('booking-month-title-left');
      const titleR = document.getElementById('booking-month-title-right');
      if (titleL) titleL.innerText = `${yearL}年 ${monthL + 1}月`;
      if (titleR) titleR.innerText = `${yearR}年 ${monthR + 1}月`;

      renderMonthGrid('booking-cal-grid-left', yearL, monthL);
      renderMonthGrid('booking-cal-grid-right', yearR, monthR);
    }

    function renderMonthGrid(containerId, year, month) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const startVal = document.getElementById('form-task-start')?.value || '';
      const dueVal = document.getElementById('form-task-due')?.value || '';

      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      let html = weekdays.map(w => `<div class="booking-weekday-header">${w}</div>`).join('');

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        html += `<div class="booking-day-cell is-empty"></div>`;
      }

      const todayStr = getTodayDateStr();

      for (let day = 1; day <= daysInMonth; day++) {
        const mStr = String(month + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${mStr}-${dStr}`;

        let classes = ['booking-day-cell'];
        if (dateStr === todayStr) classes.push('is-today');

        // Check holiday status
        const holiday = (state.holidays || []).find(h => h && h.date === dateStr);
        let holidayTag = '';
        let cellTitle = dateStr;

        if (holiday) {
          cellTitle = `${dateStr} (${holiday.name} - ${holiday.isWorkingDay ? '補上班日' : '放假'})`;
          if (holiday.isWorkingDay) {
            classes.push('is-makeup-work');
            holidayTag = `<span style="display:block; font-size:9px; line-height:1; color:#16a34a; font-weight:800; transform:scale(0.85); margin-top:1px;">班</span>`;
          } else if (holiday.isHoliday) {
            classes.push('is-holiday');
            holidayTag = `<span style="display:block; font-size:9px; line-height:1; color:#dc2626; font-weight:800; transform:scale(0.85); margin-top:1px;">休</span>`;
          }
        }

        if (startVal && dueVal) {
          if (dateStr === startVal && dateStr === dueVal) {
            classes.push('is-single');
          } else if (dateStr === startVal) {
            classes.push('is-start');
          } else if (dateStr === dueVal) {
            classes.push('is-end');
          } else if (dateStr > startVal && dateStr < dueVal) {
            classes.push('in-range');
          }
        } else if (startVal && !dueVal) {
          if (dateStr === startVal) {
            classes.push('is-single');
          }
        }

        html += `<div class="${classes.join(' ')}" data-date="${dateStr}" title="${cellTitle}" onclick="onBookingDateCellClick('${dateStr}')" onmouseenter="onBookingDateCellHover('${dateStr}')" style="flex-direction:column; justify-content:center; gap:0;"><span>${day}</span>${holidayTag}</div>`;
      }

      container.innerHTML = html;
    }

    function getTodayDateStr() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function onBookingDateCellClick(dateStr) {
      if (bookingPickerState.disabled) return;
      const startInput = document.getElementById('form-task-start');
      const dueInput = document.getElementById('form-task-due');
      if (!startInput || !dueInput) return;

      if (!bookingPickerState.isSelectingEnd) {
        startInput.value = dateStr;
        dueInput.value = '';
        bookingPickerState.isSelectingEnd = true;
        updateBookingRangeDisplay(dateStr, '');
        renderDualMonthCalendar();
      } else {
        if (dateStr < startInput.value) {
          startInput.value = dateStr;
          dueInput.value = '';
          bookingPickerState.isSelectingEnd = true;
          updateBookingRangeDisplay(dateStr, '');
          renderDualMonthCalendar();
        } else {
          dueInput.value = dateStr;
          bookingPickerState.isSelectingEnd = false;
          updateBookingRangeDisplay(startInput.value, dateStr);
          renderDualMonthCalendar();
          setTimeout(() => {
            closeDateRangePicker();
          }, 220);
        }
      }
    }

    function onBookingDateCellHover(dateStr) {
      if (!bookingPickerState.isSelectingEnd || bookingPickerState.disabled) return;
      const startVal = document.getElementById('form-task-start')?.value;
      if (!startVal) return;

      const cells = document.querySelectorAll('.booking-day-cell[data-date]');
      cells.forEach(cell => {
        const cellDate = cell.getAttribute('data-date');
        cell.classList.remove('is-start', 'is-end', 'is-single', 'in-range', 'is-hover-range');

        if (cellDate === startVal) {
          if (dateStr > startVal) {
            cell.classList.add('is-start');
          } else {
            cell.classList.add('is-single');
          }
        } else if (cellDate === dateStr && dateStr > startVal) {
          cell.classList.add('is-end');
        } else if (cellDate > startVal && cellDate < dateStr) {
          cell.classList.add('is-hover-range');
        }
      });

      const summaryTextEl = document.getElementById('booking-picker-summary-text');
      if (summaryTextEl) {
        if (dateStr >= startVal) {
          const d1 = new Date(startVal + 'T00:00:00');
          const d2 = new Date(dateStr + 'T00:00:00');
          const days = Math.round((d2 - d1) / 86400000) + 1;
          const workDays = calculateWorkingDays(startVal, dateStr);
          const endInfo = formatBookingDateDisplay(dateStr);
          summaryTextEl.innerText = `選取範圍：${startVal} 至 ${dateStr} (${endInfo.weekText}) · 共 ${workDays} 個工作天 (含放假共 ${days} 天)`;
          summaryTextEl.style.color = '#15803d';
        } else {
          summaryTextEl.innerText = `點擊將重新設定開始日為：${dateStr}`;
          summaryTextEl.style.color = '#b45309';
        }
      }
    }

    function clearPickerSelection() {
      const startInput = document.getElementById('form-task-start');
      const dueInput = document.getElementById('form-task-due');
      if (startInput) startInput.value = '';
      if (dueInput) dueInput.value = '';
      bookingPickerState.isSelectingEnd = false;
      updateBookingRangeDisplay('', '');
      renderDualMonthCalendar();
    }

    function onScheduleRangeChanged(which) {
      updateScheduleRangeSummary();
      if (bookingPickerState.isOpen) {
        renderDualMonthCalendar();
      }
    }

    function applyScheduleQuickRange(days) {
      const startInput = document.getElementById('form-task-start');
      const dueInput = document.getElementById('form-task-due');
      if (!startInput || !dueInput || bookingPickerState.disabled) return;

      let baseDate = startInput.value ? new Date(startInput.value + 'T00:00:00') : new Date();
      if (isNaN(baseDate.getTime())) baseDate = new Date();

      const y = baseDate.getFullYear();
      const m = String(baseDate.getMonth() + 1).padStart(2, '0');
      const d = String(baseDate.getDate()).padStart(2, '0');
      const startStr = `${y}-${m}-${d}`;

      const endDate = new Date(baseDate);
      endDate.setDate(endDate.getDate() + (days - 1));
      const ey = endDate.getFullYear();
      const em = String(endDate.getMonth() + 1).padStart(2, '0');
      const ed = String(endDate.getDate()).padStart(2, '0');
      const endStr = `${ey}-${em}-${ed}`;

      startInput.value = startStr;
      dueInput.value = endStr;
      bookingPickerState.isSelectingEnd = false;
      updateBookingRangeDisplay(startStr, endStr);

      if (bookingPickerState.isOpen) {
        bookingPickerState.viewYear = baseDate.getFullYear();
        bookingPickerState.viewMonth = baseDate.getMonth();
        renderDualMonthCalendar();
      }
    }

    function applyScheduleQuickPreset(preset) {
      const startInput = document.getElementById('form-task-start');
      const dueInput = document.getElementById('form-task-due');
      if (!startInput || !dueInput || bookingPickerState.disabled) return;

      if (preset === 'clear') {
        clearPickerSelection();
        return;
      }

      const now = new Date();
      const currentDay = now.getDay(); // 0: Sun, 1: Mon...
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

      if (preset === 'this_week') {
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        startInput.value = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
        dueInput.value = `${friday.getFullYear()}-${String(friday.getMonth()+1).padStart(2,'0')}-${String(friday.getDate()).padStart(2,'0')}`;
      } else if (preset === 'next_week') {
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + diffToMonday + 7);
        const nextFriday = new Date(nextMonday);
        nextFriday.setDate(nextMonday.getDate() + 4);

        startInput.value = `${nextMonday.getFullYear()}-${String(nextMonday.getMonth()+1).padStart(2,'0')}-${String(nextMonday.getDate()).padStart(2,'0')}`;
        dueInput.value = `${nextFriday.getFullYear()}-${String(nextFriday.getMonth()+1).padStart(2,'0')}-${String(nextFriday.getDate()).padStart(2,'0')}`;
      }

      bookingPickerState.isSelectingEnd = false;
      updateBookingRangeDisplay(startInput.value, dueInput.value);

      if (bookingPickerState.isOpen) {
        bookingPickerState.viewYear = now.getFullYear();
        bookingPickerState.viewMonth = now.getMonth();
        renderDualMonthCalendar();
      }
    }

    function onTaskEstimatingDeptsChange() {
      const dept1Id = document.getElementById('form-task-dept-1')?.value || '';
      const dept2Id = document.getElementById('form-task-dept-2')?.value || '';
      
      const dept1 = (state.departments || []).find(d => d.id === dept1Id);
      const dept2 = (state.departments || []).find(d => d.id === dept2Id);
      const estimatorText = [dept1?.name, dept2?.name].filter(Boolean).join(', ');
      
      const hiddenEst = document.getElementById('form-task-estimator');
      if (hiddenEst) hiddenEst.value = estimatorText;

      const currentAssignees = getSelectedTaskAssignees();
      renderTaskAssigneesCheckboxes(currentAssignees);

      const status = document.getElementById('form-task-status')?.value || '規劃中';
      updateTaskScheduleSectionState(status, estimatorText);
      updateTaskModalHeaderAndFooterActions(status, estimatorText, currentAssignees);
    }

    function onTaskEstimatorChange(newEstimator) {
      onTaskEstimatingDeptsChange();
    }

    function renderTaskAssigneesCheckboxes(selectedNames = []) {
      const wrap = document.getElementById('task-assignees-selection-wrap');
      if (!wrap) return;

      const dept1Id = document.getElementById('form-task-dept-1')?.value || '';
      const dept2Id = document.getElementById('form-task-dept-2')?.value || '';
      const selectedDeptIds = [dept1Id, dept2Id].filter(Boolean);

      if (selectedDeptIds.length === 0) {
        wrap.innerHTML = `<div style="width:100%; font-size:11px; color:#475569; font-weight:600; padding:10px; background:#f1f5f9; border-radius:6px; text-align:center;">💡 提示：請先選取【任務評估】部門，將自動帶出該部門之指派與排程評估卡片</div>`;
        updateTaskAssigneesCountBadge();
        updateTaskBasicFieldsPermissions();
        return;
      }

      const currentUserMember = (currentAuthUser && currentAuthUser.memberInfo) ? currentAuthUser.memberInfo : null;
      const isManager = isCurrentRoleManager();
      const isAdminOrPm = hasPermission('task_edit') || isManager;

      const taskId = document.getElementById('form-task-id')?.value;
      const currentTask = taskId ? state.tasks.find(t => t.id === taskId) : null;
      const evaluations = currentTask?.evaluations || {};
      const taskStatus = document.getElementById('form-task-status')?.value || '規劃中';
      const isDraftPhase = (taskStatus === '規劃中' || !taskId);

      let html = '';

      selectedDeptIds.forEach((deptId, idx) => {
        const dept = (state.departments || []).find(d => d.id === deptId);
        if (!dept) return;

        const deptMembers = state.members.filter(m => m.departmentId === dept.id || m.departmentName === dept.name);
        const isCurrentUserDeptManager = currentUserMember ? (dept.managerId === currentUserMember.id || dept.managerName === currentUserMember.name) : false;
        const deptEval = evaluations[deptId] || {};
        const isDeptSubmitted = deptEval.submitted === true;

        let canEditThisDept = true;
        if (isDraftPhase) {
          canEditThisDept = false; // 新增/規劃階段不在此指派
        } else if (taskStatus === '待評估') {
          if (isDeptSubmitted) {
            canEditThisDept = false; // Submitted evaluation is locked!
          } else if (!isAdminOrPm && currentUserMember) {
            canEditThisDept = isCurrentUserDeptManager; // Scoped to manager's own department
          }
        } else {
          canEditThisDept = (isAdminOrPm || isManager) && !isDeptSubmitted;
        }

        const deptBadge = isDeptSubmitted 
          ? `<span class="badge badge-success" style="font-size:10px;">🔒 已送出評估 (${deptEval.submittedBy || '主管'})</span>`
          : `<span class="badge badge-warning" style="font-size:10px;">⏳ 待評估中</span>`;

        // Pre-fill department assignees
        const deptAssigneeList = (deptEval.assignees && deptEval.assignees.length > 0)
          ? deptEval.assignees
          : (idx === 0 ? selectedNames : []);
        const deptAssigneeSet = new Set(deptAssigneeList.map(s => s.trim()));

        // Pre-fill dates & hours
        const deptStartVal = deptEval.startDate || (currentTask?.startDate || '');
        const deptDueVal = deptEval.dueDate || (currentTask?.dueDate || '');
        const deptHoursVal = (deptEval.estHours !== undefined && deptEval.estHours !== null) ? deptEval.estHours : (currentTask?.estHours || '');

        html += `
          <div class="dept-eval-card" data-dept-id="${dept.id}" style="width:100%; background:white; padding:12px; border-radius:8px; border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #e2e8f0;">
              <span style="font-weight:700; font-size:13px; color:#1e40af;">🏢 部門 ${idx + 1}: ${dept.name} ${deptBadge}</span>
              <span style="font-size:11px; color:#64748b;">👑 主管: ${dept.managerName || '未指定'}</span>
            </div>

            <div style="margin-bottom:10px;">
              <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:6px;">👥 共同指派執行人員 (Assignees) *</div>
              ${isDraftPhase ? `
                <div style="font-size:11px; color:#475569; background:#f1f5f9; padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0;">
                  💡 提示：新增/規劃階段無法指定執行人員，發布至【待評估】後將由主管「${dept.managerName || '部門主管'}」進行評估與指定
                </div>
              ` : `
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                  ${deptMembers.length > 0 ? deptMembers.map(m => {
                    const isChecked = deptAssigneeSet.has(m.name.trim());
                    const isDisabled = !canEditThisDept;
                    return `
                      <label class="assignee-pill ${isChecked ? 'active' : ''}" style="opacity:${isDisabled ? '0.65' : '1'}; cursor:${isDisabled ? 'not-allowed' : 'pointer'};">
                        <input type="checkbox" name="task-assignee-cb" value="${m.name}" data-dept-id="${dept.id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} onchange="onTaskAssigneeCheckboxChange()">
                        <span>${m.name} <small style="color:${isChecked ? '#3b82f6' : '#64748b'};">(${m.role})</small></span>
                      </label>
                    `;
                  }).join('') : '<span style="font-size:11px; color:#94a3b8;">此部門尚無設定成員</span>'}
                </div>
              `}
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px; background:#f8fafc; padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0; align-items:end;">
              <div>
                <label style="font-size:11px; font-weight:700; color:#475569; display:block; margin-bottom:4px;">📅 部門預估排程時間區段 (預估起訖時間)</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="date" id="dept-start-${dept.id}" class="form-input form-input-sm" value="${deptStartVal}" ${!canEditThisDept ? 'disabled' : ''} style="font-size:12px; padding:4px 8px;" onchange="onDeptScheduleInputChange('${dept.id}')">
                  <span style="font-size:11px; color:#64748b;">至</span>
                  <input type="date" id="dept-due-${dept.id}" class="form-input form-input-sm" value="${deptDueVal}" ${!canEditThisDept ? 'disabled' : ''} style="font-size:12px; padding:4px 8px;" onchange="onDeptScheduleInputChange('${dept.id}')">
                </div>
              </div>
              <div>
                <label style="font-size:11px; font-weight:700; color:#475569; display:block; margin-bottom:4px;">⏱️ 預估工時 (小時)</label>
                <input type="number" id="dept-hours-${dept.id}" class="form-input form-input-sm" placeholder="例如 8" value="${deptHoursVal}" ${!canEditThisDept ? 'disabled' : ''} style="font-size:12px; padding:4px 8px;" onchange="onDeptScheduleInputChange('${dept.id}')">
              </div>
            </div>
          </div>
        `;
      });

      wrap.innerHTML = html;
      updateTaskAssigneesCountBadge();
      updateTaskBasicFieldsPermissions();
    }

    function onDeptScheduleInputChange(deptId) {
      updateTaskAssigneesCountBadge();
    }

    function getSelectedTaskAssignees() {
      const cbs = document.querySelectorAll('input[name="task-assignee-cb"]:checked');
      return Array.from(cbs).map(cb => cb.value.trim()).filter(Boolean);
    }

    function onTaskAssigneeCheckboxChange() {
      const selected = getSelectedTaskAssignees();
      document.getElementById('form-task-assignee').value = selected.join(', ');
      document.querySelectorAll('input[name="task-assignee-cb"]').forEach(cb => {
        const pill = cb.closest('.assignee-pill');
        if (pill) {
          if (cb.checked) {
            pill.classList.add('active');
          } else {
            pill.classList.remove('active');
          }
        }
      });
      updateTaskAssigneesCountBadge();
      const status = document.getElementById('form-task-status')?.value || '規劃中';
      const estimator = document.getElementById('form-task-estimator')?.value || '';
      updateTaskScheduleSectionState(status, estimator);
      updateTaskStatusDropdownPermissions(status, selected);
      updateTaskModalHeaderAndFooterActions(status, estimator, selected);
    }

    function toggleAllTaskAssignees(checkAll) {
      if (!isCurrentRoleManager() && !hasPermission('task_edit')) return;
      document.querySelectorAll('input[name="task-assignee-cb"]').forEach(cb => {
        if (!cb.disabled) cb.checked = checkAll;
      });
      onTaskAssigneeCheckboxChange();
    }

    function setTaskModalStatus(newStatus) {
      const hiddenInput = document.getElementById('form-task-status');
      const badgeEl = document.getElementById('form-task-status-badge');
      if (hiddenInput) hiddenInput.value = newStatus;
      if (badgeEl) {
        badgeEl.innerText = newStatus;
        badgeEl.className = `badge ${getTaskBadgeClass(newStatus)}`;
        badgeEl.style.fontSize = '13px';
        badgeEl.style.fontWeight = '700';
        badgeEl.style.padding = '6px 14px';
      }
    }

    function isTaskVisibleToCurrentRole(task) {
      if (!task) return false;
      return true;
    }

    function updateTaskBasicFieldsPermissions() {
      const status = document.getElementById('form-task-status')?.value || '規劃中';
      const isManager = isCurrentRoleManager();
      const canEditTask = hasPermission('task_edit');
      
      // 基礎內容：PM/主管或具備編輯權限者可隨時編輯；非 PM 角色僅在「規劃中」階段可編輯
      const canEditBasic = (isManager || canEditTask) || (status === '規劃中');

      // 1. Core Metadata Selects & Inputs
      const projSel = document.getElementById('form-task-project');
      const phaseSel = document.getElementById('form-task-phase');
      const modSel = document.getElementById('form-task-module');
      const titleInput = document.getElementById('form-task-title-input');
      const typeSel = document.getElementById('form-task-type');
      const estimatorSel = document.getElementById('form-task-estimator');
      const expDateInput = document.getElementById('form-task-expected-date');
      const severitySel = document.getElementById('form-task-severity');

      if (projSel) projSel.disabled = !canEditBasic;
      if (phaseSel) phaseSel.disabled = !canEditBasic;
      if (modSel) modSel.disabled = !canEditBasic;
      if (titleInput) {
        titleInput.disabled = !canEditBasic;
        titleInput.style.background = canEditBasic ? 'white' : '#f1f5f9';
        titleInput.style.cursor = canEditBasic ? 'text' : 'not-allowed';
      }
      if (typeSel) typeSel.disabled = !canEditBasic;
      if (estimatorSel) estimatorSel.disabled = !canEditBasic;
      if (expDateInput) expDateInput.disabled = !canEditBasic;
      if (severitySel) severitySel.disabled = !canEditBasic;

      // 2. Assignees Selection Checkboxes & Controls
      const assigneeCbs = document.querySelectorAll('input[name="task-assignee-cb"]');
      assigneeCbs.forEach(cb => {
        cb.disabled = !canEditBasic;
        const pill = cb.closest('.assignee-pill');
        if (pill) {
          pill.style.opacity = canEditBasic ? '1' : '0.65';
          pill.style.cursor = canEditBasic ? 'pointer' : 'not-allowed';
        }
      });

      const btnSelectAll = document.getElementById('btn-select-all-assignees');
      const btnClearAll = document.getElementById('btn-clear-assignees');
      if (btnSelectAll) {
        btnSelectAll.disabled = !canEditBasic;
        btnSelectAll.style.opacity = canEditBasic ? '1' : '0.4';
        btnSelectAll.style.cursor = canEditBasic ? 'pointer' : 'not-allowed';
      }
      if (btnClearAll) {
        btnClearAll.disabled = !canEditBasic;
        btnClearAll.style.opacity = canEditBasic ? '1' : '0.4';
        btnClearAll.style.cursor = canEditBasic ? 'pointer' : 'not-allowed';
      }

      // 3. Modal Header Title Inline Editing
      const titleTextEl = document.getElementById('modal-task-title-text');
      const editIconEl = document.getElementById('modal-task-title-edit-icon');
      if (titleTextEl) {
        if (canEditBasic) {
          titleTextEl.style.cursor = 'pointer';
          titleTextEl.setAttribute('onclick', 'startModalTaskTitleEdit()');
        } else {
          titleTextEl.style.cursor = 'default';
          titleTextEl.removeAttribute('onclick');
        }
      }
      if (editIconEl) {
        editIconEl.style.display = canEditBasic ? 'inline' : 'none';
      }
    }

    function updateTaskAssigneesCountBadge() {
      const count = getSelectedTaskAssignees().length;
      const badge = document.getElementById('task-assignees-count-badge');
      if (badge) {
        badge.innerText = `已選 ${count} 人`;
        badge.className = count > 0 ? 'badge badge-info' : 'badge badge-slate';
      }
    }

    function onTaskEstimatorChange(newEstimator) {
      const status = document.getElementById('form-task-status')?.value || '規劃中';
      const currentAssignees = getSelectedTaskAssignees();
      
      // Re-render assignees checkboxes filtered by new estimator's department
      renderTaskAssigneesCheckboxes(currentAssignees);

      const validAssignees = getSelectedTaskAssignees();
      const assigneeInput = document.getElementById('form-task-assignee');
      if (assigneeInput) assigneeInput.value = validAssignees.join(', ');

      updateTaskScheduleSectionState(status, newEstimator);
      updateTaskStatusDropdownPermissions(status, validAssignees);
      updateTaskModalHeaderAndFooterActions(status, newEstimator, validAssignees);
    }

    function onTaskAssigneeChange(newAssignee) {
      // Legacy fallback
      onTaskAssigneeCheckboxChange();
    }

    function updateTaskModalHeaderAndFooterActions(status, estimator, assignees) {
      const container = document.getElementById('modal-task-header-actions');
      const btnSave = document.getElementById('btn-save-task');

      const isManager = isCurrentRoleManager();
      const isEstimator = checkIsTaskEstimator(estimator);
      const isAssignee = checkIsTaskAssignee(assignees);

      if (btnSave) {
        const canEditBasic = (status === '規劃中') && (isManager || hasPermission('task_edit'));
        const canEditSchedule = (status === '待評估') && (isEstimator || isManager || hasPermission('task_edit'));
        const canEditManager = isManager || hasPermission('task_edit');
        const canEditAssignee = isAssignee && status === '進行中';

        const canSave = canEditBasic || canEditSchedule || canEditManager || canEditAssignee;

        if (canSave) {
          btnSave.style.display = 'inline-block';
          btnSave.innerText = (status === '規劃中' || status === '待評估') ? '💾 儲存草稿' : '💾 儲存';
        } else {
          btnSave.style.display = 'none';
        }
      }

      if (!container) return;

      let html = '';

      if (status === '規劃中') {
        if (isManager || hasPermission('task_edit')) {
          html = `<button type="button" class="btn btn-primary btn-sm" onclick="publishTaskFromModal()" style="font-weight:600;">🚀 發布</button>`;
        }
      } else if (status === '待評估') {
        const taskId = document.getElementById('form-task-id')?.value;
        const currentTask = taskId ? state.tasks.find(t => t.id === taskId) : null;
        const evaluations = currentTask?.evaluations || {};

        const dept1Id = document.getElementById('form-task-dept-1')?.value || '';
        const dept2Id = document.getElementById('form-task-dept-2')?.value || '';
        const selectedDeptIds = [dept1Id, dept2Id].filter(Boolean);

        const currentUserMember = (currentAuthUser && currentAuthUser.memberInfo) ? currentAuthUser.memberInfo : null;
        const isAdminOrPm = hasPermission('task_edit') || isManager;

        let buttonsHtml = '';

        if (selectedDeptIds.length > 0) {
          selectedDeptIds.forEach(deptId => {
            const dept = (state.departments || []).find(d => d.id === deptId);
            if (!dept) return;
            const isDeptSubmitted = evaluations[deptId]?.submitted === true;

            if (isDeptSubmitted) {
              buttonsHtml += `<span class="badge badge-success" style="padding:6px 10px; font-size:12px; margin-left:4px;">🔒 ${dept.name} 已評估</span>`;
            } else {
              const isCurrentUserDeptManager = currentUserMember ? (dept.managerId === currentUserMember.id || dept.managerName === currentUserMember.name) : false;
              const canSubmitThisDept = isAdminOrPm || isCurrentUserDeptManager;

              if (canSubmitThisDept) {
                buttonsHtml += `<button type="button" class="btn btn-primary btn-sm" onclick="submitTaskEvaluationFromModal('${deptId}')" style="font-weight:600; margin-left:4px;">📋 送出【${dept.name}】評估</button>`;
              }
            }
          });
        }
        
        if (!buttonsHtml) {
          if (isEstimator || isManager || isAdminOrPm) {
            buttonsHtml = `<button type="button" class="btn btn-primary btn-sm" onclick="submitTaskEvaluationFromModal()" style="font-weight:600;">📋 送出評估</button>`;
          }
        }

        html = buttonsHtml;
      } else if (status === '待執行') {
        if (isManager || hasPermission('task_edit')) {
          html = `<button type="button" class="btn btn-primary btn-sm" onclick="startTaskExecutionFromModal()" style="font-weight:600;">▶️ 開始執行</button>`;
        }
      } else if (status === '進行中') {
        if (isAssignee || isManager || hasPermission('task_edit')) {
          html = `<button type="button" class="btn btn-success btn-sm" onclick="completeTaskExecutionFromModal()" style="font-weight:600;">✨ 執行完成</button>`;
        }
      } else if (status === '待測試') {
        if (isManager || hasPermission('task_complete_permission')) {
          html = `<button type="button" class="btn btn-success btn-sm" onclick="completeTaskFinalFromModal()" style="font-weight:600;">🎉 任務完成</button>`;
        }
      }

      container.innerHTML = html;
    }

    function publishTaskFromModal() {
      setTaskModalStatus('待評估');
      saveTask();
    }

    function submitTaskEvaluationFromModal(targetDeptId = null) {
      const taskId = document.getElementById('form-task-id')?.value;
      const dept1Id = document.getElementById('form-task-dept-1')?.value || '';
      const dept2Id = document.getElementById('form-task-dept-2')?.value || '';
      const selectedDeptIds = [dept1Id, dept2Id].filter(Boolean);

      if (!targetDeptId && selectedDeptIds.length > 0) {
        targetDeptId = selectedDeptIds[0];
      }

      const dept = (state.departments || []).find(d => d.id === targetDeptId);
      const deptName = dept ? dept.name : '該部門';

      const deptStart = document.getElementById(`dept-start-${targetDeptId}`)?.value || '';
      const deptDue = document.getElementById(`dept-due-${targetDeptId}`)?.value || '';
      const deptHoursVal = document.getElementById(`dept-hours-${targetDeptId}`)?.value;
      const deptHours = deptHoursVal !== '' ? Number(deptHoursVal) : 0;

      const deptAssigneesCbs = document.querySelectorAll(`input[name="task-assignee-cb"][data-dept-id="${targetDeptId}"]:checked`);
      const deptAssignees = Array.from(deptAssigneesCbs).map(cb => cb.value.trim()).filter(Boolean);

      if (deptAssignees.length === 0) {
        if (!confirm(`⚠️ 尚未為「${deptName}」選擇指派執行人員，確定要送出評估嗎？`)) return;
      }

      if (!deptStart || !deptDue) {
        if (!confirm(`⚠️ 尚未填寫「${deptName}」的預估起訖時間，確定要送出評估嗎？`)) return;
      }

      if (deptHours <= 0) {
        if (!confirm(`⚠️ 尚未填寫「${deptName}」的預估工時，確定要送出評估嗎？`)) return;
      }

      let currentTask = taskId ? state.tasks.find(t => t.id === taskId) : null;
      if (!currentTask) {
        currentTask = { id: taskId || ('task-' + Date.now()), evaluations: {} };
      }
      if (!currentTask.evaluations) {
        currentTask.evaluations = {};
      }

      const currentUserMember = (currentAuthUser && currentAuthUser.memberInfo) ? currentAuthUser.memberInfo : null;
      const currentUserName = currentUserMember ? currentUserMember.name : (getCurrentUserName() || '主管');

      if (targetDeptId) {
        currentTask.evaluations[targetDeptId] = {
          submitted: true,
          submittedBy: currentUserName,
          submittedAt: new Date().toISOString(),
          assignees: deptAssignees,
          startDate: deptStart,
          dueDate: deptDue,
          estHours: deptHours
        };
      }

      // Check if ALL designated departments have submitted
      const allSubmitted = selectedDeptIds.length > 0 && selectedDeptIds.every(id => currentTask.evaluations[id]?.submitted === true);

      // Aggregate overall task values across all evaluated departments
      const allStarts = selectedDeptIds.map(id => currentTask.evaluations[id]?.startDate).filter(Boolean);
      const allDues = selectedDeptIds.map(id => currentTask.evaluations[id]?.dueDate).filter(Boolean);
      
      allStarts.sort();
      allDues.sort();

      const minStart = allStarts[0] || deptStart;
      const maxDue = allDues[allDues.length - 1] || deptDue;
      const totalEstHours = selectedDeptIds.reduce((sum, id) => sum + (Number(currentTask.evaluations[id]?.estHours) || 0), 0);
      const combinedAssignees = Array.from(new Set(selectedDeptIds.flatMap(id => currentTask.evaluations[id]?.assignees || [])));

      // Sync to hidden overall fields
      const hiddenStart = document.getElementById('form-task-start');
      const hiddenDue = document.getElementById('form-task-due');
      const hiddenHours = document.getElementById('form-task-est-hours');
      const hiddenAssignee = document.getElementById('form-task-assignee');

      if (hiddenStart) hiddenStart.value = minStart;
      if (hiddenDue) hiddenDue.value = maxDue;
      if (hiddenHours) hiddenHours.value = totalEstHours;
      if (hiddenAssignee) hiddenAssignee.value = combinedAssignees.join(', ');

      if (allSubmitted || selectedDeptIds.length === 0) {
        setTaskModalStatus('待執行');
        showToast(`🎉 「${deptName}」評估已送出！所有評估部門皆已完成，任務狀態已自動轉換為「待執行」。`);
      } else {
        setTaskModalStatus('待評估');
        showToast(`📋 「${deptName}」評估已成功送出！等待其他部門主管完成評估...`);
      }

      saveTask();
    }

    function startTaskExecutionFromModal() {
      setTaskModalStatus('進行中');
      saveTask();
    }

    function completeTaskExecutionFromModal() {
      setTaskModalStatus('待測試');
      saveTask();
    }

    function completeTaskFinalFromModal() {
      setTaskModalStatus('已完成');
      saveTask();
    }

    function updateTaskScheduleSectionState(status, estimator) {
      const scheduleSec = document.getElementById('section-task-schedule');
      const badgeLock = document.getElementById('badge-schedule-lock');
      const startInput = document.getElementById('form-task-start');
      const dueInput = document.getElementById('form-task-due');
      const hoursInput = document.getElementById('form-task-est-hours');
      const bookingField = document.getElementById('booking-date-range-field');
      const presetBtns = document.querySelectorAll('.btn-range-quick');
      if (!scheduleSec || !startInput || !dueInput || !hoursInput) return;

      const isManager = isCurrentRoleManager();
      const isEstimator = checkIsTaskEstimator(estimator);

      let canEdit = false;
      let badgeText = '';
      let badgeStyle = '';

      if (status === '規劃中') {
        if (isManager) {
          canEdit = true;
          badgeText = '✏️ 主管權限可填寫預估排程與工時';
          badgeStyle = 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';
        } else {
          canEdit = false;
          badgeText = `🔒 PM 規劃階段 (發布至「待評估」後由評估人「${estimator || '未指定'}」填寫排程與工時)`;
          badgeStyle = 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
        }
      } else if (status === '待評估') {
        if (isEstimator || isManager) {
          canEdit = true;
          badgeText = isManager ? '✏️ 主管權限可填寫預估排程與工時' : `✏️ 請評估人「${estimator || '您'}」填寫預估排程與工時`;
          badgeStyle = 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;';
        } else {
          canEdit = false;
          badgeText = `🔒 鎖定 (僅限任務評估人「${estimator || '未指定'}」或主管填寫)`;
          badgeStyle = 'background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;';
        }
      } else if (status === '待執行' || status === '進行中' || status === '待測試') {
        if (isManager) {
          canEdit = true;
          badgeText = '✏️ 主管權限可調整預估排程與工時';
          badgeStyle = 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';
        } else {
          canEdit = false;
          badgeText = `🔒 ${status} (唯讀模式)`;
          badgeStyle = 'background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;';
        }
      } else {
        canEdit = false;
        badgeText = `🔒 已完成 (唯讀模式)`;
        badgeStyle = 'background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;';
      }

      startInput.disabled = !canEdit;
      dueInput.disabled = !canEdit;
      hoursInput.disabled = !canEdit;
      bookingPickerState.disabled = !canEdit;

      if (!canEdit) {
        closeDateRangePicker();
      }

      presetBtns.forEach(btn => {
        btn.disabled = !canEdit;
        btn.style.opacity = canEdit ? '1' : '0.4';
        btn.style.cursor = canEdit ? 'pointer' : 'not-allowed';
      });

      if (canEdit) {
        scheduleSec.style.background = '#f8fafc';
        scheduleSec.style.borderColor = '#93c5fd';
        if (bookingField) {
          bookingField.classList.remove('locked');
          bookingField.title = '點擊展開/收合雙月份日曆選擇器';
        }
        hoursInput.style.background = 'white';
        hoursInput.style.cursor = 'default';
      } else {
        scheduleSec.style.background = '#f1f5f9';
        scheduleSec.style.borderColor = '#e2e8f0';
        if (bookingField) {
          bookingField.classList.add('locked');
          bookingField.title = '目前鎖定中，無編輯排程工時權限';
        }
        hoursInput.style.background = '#e2e8f0';
        hoursInput.style.cursor = 'not-allowed';
      }

      if (badgeLock) {
        badgeLock.style.display = 'inline-block';
        badgeLock.innerText = badgeText;
        badgeLock.setAttribute('style', `font-size:11px; padding:3px 8px; border-radius:4px; font-weight:700; display:inline-block; ${badgeStyle}`);
      }
    }

    document.addEventListener('click', function(e) {
      if (!bookingPickerState.isOpen) return;
      const wrap = document.getElementById('task-schedule-range-wrap');
      if (wrap && !wrap.contains(e.target)) {
        closeDateRangePicker();
      }
    });

    function updateTaskStatusDropdownPermissions(currentStatus, assignees) {
      const statusSelect = document.getElementById('form-task-status');
      if (!statusSelect || !statusSelect.options) return;

      const canComplete = hasPermission('task_complete_permission');
      const isManager = isCurrentRoleManager();
      const isAssignee = checkIsTaskAssignee(assignees);

      Array.from(statusSelect.options).forEach(opt => {
        if (opt.value === '已完成') {
          if (!canComplete) {
            opt.disabled = true;
            opt.text = '已完成 (需主管審核 🔒)';
          } else {
            opt.disabled = false;
            opt.text = '已完成 (Completed)';
          }
        } else if (opt.value === '待測試') {
          if (!isAssignee && !isManager && currentStatus === '進行中') {
            opt.disabled = true;
            opt.text = '待測試 (僅限被指派人/主管 🔒)';
          } else {
            opt.disabled = false;
            opt.text = '待測試 (Pending Testing)';
          }
        } else {
          opt.disabled = false;
        }
      });
    }

    function onTaskStatusChange(newStatus) {
      if (newStatus === '已完成' && !hasPermission('task_complete_permission')) {
        alert('⚠️ 您目前無「審核任務驗收結案 (切換為已完成)」權限，無法將任務設為已完成！');
        const hiddenInput = document.getElementById('form-task-status');
        if (hiddenInput) hiddenInput.value = '待測試';
        return;
      }
      const estimator = document.getElementById('form-task-estimator')?.value || '';
      const assignees = getSelectedTaskAssignees();
      updateTaskScheduleSectionState(newStatus, estimator);
      updateTaskStatusDropdownPermissions(newStatus, assignees);
      updateTaskModalHeaderAndFooterActions(newStatus, estimator, assignees);
    }

    function setupTaskModalHierarchy(level, phaseId, moduleId, parentTaskId) {
      const parentIdEl = document.getElementById('form-task-parent-id');
      if (parentIdEl) parentIdEl.value = parentTaskId || '';
      const levelEl = document.getElementById('form-task-level');
      if (levelEl) levelEl.value = level;

      const projEl = document.getElementById('form-task-project');
      if (projEl) projEl.value = state.currentProjectId;
      const phaseEl = document.getElementById('form-task-phase');
      if (phaseEl) phaseEl.value = phaseId || '';
      const modEl = document.getElementById('form-task-module');
      if (modEl) modEl.value = moduleId || '';

      const banner = document.getElementById('form-task-hierarchy-banner');
      const bannerPath = document.getElementById('hierarchy-banner-path');
      const typeSelect = document.getElementById('form-task-type');

      let currProj = getCurrentProject();
      let phase = state.phases.find(p => p.id === phaseId);
      let module = phase ? (phase.modules || []).find(m => m.id === moduleId) : null;
      let parentTask = parentTaskId ? state.tasks.find(t => t.id === parentTaskId) : null;

      const projName = currProj ? currProj.name : '專案';
      const pName = phase ? cleanTierTitle(phase.name) : '階段';
      const mName = module ? cleanTierTitle(module.name) : '模組';

      if (level === 4 || parentTaskId) {
        if (banner && bannerPath) {
          banner.style.display = 'block';
          const tName = parentTask ? parentTask.title : '功能/CR';
          bannerPath.innerHTML = `<strong>${projName}</strong> ➜ <strong>${pName}</strong> ➜ <strong>${mName}</strong> ➜ <strong style="color:#2563eb;">${tName}</strong>`;
        }
        if (typeSelect) {
          typeSelect.innerHTML = `
            <option value="Bug">Bug 瑕疵</option>
            <option value="優化">優化 (Optimization)</option>
          `;
        }
      } else {
        if (banner && bannerPath) {
          banner.style.display = 'block';
          bannerPath.innerHTML = `<strong>${projName}</strong> ➜ <strong>${pName}</strong> ➜ <strong style="color:#2563eb;">${mName}</strong>`;
        }
        if (typeSelect) {
          typeSelect.innerHTML = `
            <option value="功能">功能 (Feature)</option>
            <option value="需求變更">需求變更 (CR)</option>
          `;
        }
      }
    }

    function openTaskModal(taskId = null, prefillPhaseId = null, prefillModuleId = null, parentTaskId = null) {
      try {
        sanitizePhases();
        state.tasks = getFlatTasks();
        closeDateRangePicker();
        const idEl = document.getElementById('form-task-id');
        if (idEl) idEl.value = taskId || '';

        const projSelect = document.getElementById('form-task-project');
        if (projSelect) {
          projSelect.innerHTML = state.projects.map(p => `<option value="${p.id}" ${p.id === state.currentProjectId ? 'selected' : ''}>${p.name}</option>`).join('');
        }

        // Populate Estimating Departments dropdowns (#form-task-dept-1 and #form-task-dept-2)
        const dept1Select = document.getElementById('form-task-dept-1');
        const dept2Select = document.getElementById('form-task-dept-2');
        if (dept1Select && dept2Select) {
          const depts = state.departments || [];
          const deptOptsHtml = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
          dept1Select.innerHTML = `<option value="">-- 請選擇主評估部門 --</option>` + deptOptsHtml;
          dept2Select.innerHTML = `<option value="">-- 請選擇副評估部門 (可選) --</option>` + deptOptsHtml;
        }

        // Populate Estimator select (Restricted to Department Managers)
        const estimatorSelect = document.getElementById('form-task-estimator');
        if (estimatorSelect) {
          let managerMembers = state.members.filter(m => isDepartmentManager(m));
          if (taskId) {
            const t = state.tasks.find(x => x.id === taskId);
            if (t) {
              const tEst = getTaskEstimator(t);
              if (tEst && !managerMembers.some(m => m.name === tEst)) {
                const existingEstMember = state.members.find(m => m.name === tEst);
                if (existingEstMember) managerMembers.push(existingEstMember);
              }
            }
          }
          estimatorSelect.innerHTML = '<option value="">-- 請指定任務評估人 (僅限主管) --</option>' + 
            managerMembers.map(m => {
              const dept = (state.departments || []).find(d => d.id === m.departmentId);
              const deptLabel = dept ? ` [${dept.name.split(' ')[0]}]` : '';
              return `<option value="${m.name}">${m.name} (${m.role})${deptLabel}</option>`;
            }).join('');
        }

        onTaskProjectSelectChanged(state.currentProjectId);

        let taskStatus = '規劃中';
        let taskEstimator = '';
        let taskAssignees = [];

        let activeLevel = 3;
        let activeParentTaskId = parentTaskId || null;

        if (taskId) {
          const t = state.tasks.find(x => x.id === taskId);
          if (t) {
            if (t.parentTaskId) {
              activeLevel = 4;
              activeParentTaskId = t.parentTaskId;
            } else {
              activeLevel = 3;
            }
            prefillPhaseId = t.phaseId;
            prefillModuleId = t.moduleId;
          }
        } else if (parentTaskId) {
          activeLevel = 4;
        }

        setupTaskModalHierarchy(activeLevel, prefillPhaseId, prefillModuleId, activeParentTaskId);

        if (taskId) {
          const t = state.tasks.find(x => x.id === taskId);
          if (t) {
            if (projSelect) projSelect.value = t.projectId || state.currentProjectId;
            onTaskProjectSelectChanged(t.projectId || state.currentProjectId);
            const phaseSel = document.getElementById('form-task-phase');
            if (phaseSel) {
              phaseSel.value = t.phaseId;
              onTaskPhaseSelectChanged(t.phaseId);
            }
            const modSel = document.getElementById('form-task-module');
            if (modSel) modSel.value = t.moduleId;
            const wbsEl = document.getElementById('form-task-wbs');
            if (wbsEl) wbsEl.value = t.wbs || '';
            const titleEl = document.getElementById('form-task-title');
            if (titleEl) titleEl.value = t.title || '';
            const typeEl = document.getElementById('form-task-type');
            if (typeEl) typeEl.value = t.type || (activeLevel === 4 ? 'Bug' : '功能');

            if (dept1Select && dept2Select) {
              if (t.estimatingDeptIds && Array.isArray(t.estimatingDeptIds) && t.estimatingDeptIds.length > 0) {
                dept1Select.value = t.estimatingDeptIds[0] || '';
                dept2Select.value = t.estimatingDeptIds[1] || '';
              } else {
                const estMember = state.members.find(m => m.name === getTaskEstimator(t));
                const deptId = estMember?.departmentId || (state.departments?.[0]?.id || '');
                dept1Select.value = deptId;
                dept2Select.value = '';
              }
            }

            taskEstimator = getTaskEstimator(t);
            if (estimatorSelect) estimatorSelect.value = taskEstimator;

            taskAssignees = getTaskAssignees(t);
            renderTaskAssigneesCheckboxes(taskAssignees);
            const assigneeEl = document.getElementById('form-task-assignee');
            if (assigneeEl) assigneeEl.value = taskAssignees.join(', ');

            const expDateEl = document.getElementById('form-task-expected-date');
            if (expDateEl) expDateEl.value = t.expectedDeliveryDate || '';
            const startEl = document.getElementById('form-task-start');
            if (startEl) startEl.value = t.startDate || '';
            const dueEl = document.getElementById('form-task-due');
            if (dueEl) dueEl.value = t.dueDate || '';
            const hoursEl = document.getElementById('form-task-est-hours');
            if (hoursEl) hoursEl.value = (t.estHours !== undefined && t.estHours !== null && t.estHours !== '') ? t.estHours : '';
            taskStatus = t.status || '進行中';
            setTaskModalStatus(taskStatus);
            const sevEl = document.getElementById('form-task-severity');
            if (sevEl) sevEl.value = t.severity || '無';
            setModalTaskTitle(t.title, false);
            updateScheduleRangeSummary();
            updateTaskTypeSeverityState(t.type || (activeLevel === 4 ? 'Bug' : '功能'));
          }
        } else {
          updateModalTaskAutoWBS();
          const titleEl = document.getElementById('form-task-title');
          if (titleEl) titleEl.value = '';
          const typeEl = document.getElementById('form-task-type');
          if (typeEl) typeEl.value = activeLevel === 4 ? 'Bug' : '功能';

          if (dept1Select && dept2Select) {
            const depts = state.departments || [];
            dept1Select.value = depts[0]?.id || '';
            dept2Select.value = '';
          }

          // Default estimator to current user (if manager) or first manager
          const managerMembers = state.members.filter(m => isDepartmentManager(m));
          const currentUserName = (currentAuthUser && currentAuthUser.memberInfo) ? currentAuthUser.memberInfo.name : '';
          const defaultEstimator = (currentUserName && managerMembers.some(m => m.name === currentUserName)) 
            ? currentUserName 
            : (managerMembers[0]?.name || '');
          if (estimatorSelect) estimatorSelect.value = defaultEstimator;
          taskEstimator = defaultEstimator;

          onTaskEstimatingDeptsChange();
          renderTaskAssigneesCheckboxes([]);
          const assigneeEl = document.getElementById('form-task-assignee');
          if (assigneeEl) assigneeEl.value = '';

          const expDateEl = document.getElementById('form-task-expected-date');
          if (expDateEl) expDateEl.value = '';
          const startEl = document.getElementById('form-task-start');
          if (startEl) startEl.value = '';
          const dueEl = document.getElementById('form-task-due');
          if (dueEl) dueEl.value = '';
          const hoursEl = document.getElementById('form-task-est-hours');
          if (hoursEl) hoursEl.value = '';
          taskStatus = '規劃中';
          setTaskModalStatus(taskStatus);
          const sevEl = document.getElementById('form-task-severity');
          if (sevEl) sevEl.value = '無';
          setModalTaskTitle('', true);
          updateScheduleRangeSummary();
          updateTaskTypeSeverityState(activeLevel === 4 ? 'Bug' : '功能');
        }
        onTaskEstimatingDeptsChange();
        updateTaskScheduleSectionState(taskStatus, taskEstimator);
        updateTaskStatusDropdownPermissions(taskStatus, taskAssignees);
        updateTaskModalHeaderAndFooterActions(taskStatus, taskEstimator, taskAssignees);
        updateTaskBasicFieldsPermissions();
      } catch (err) {
        console.error('Error initializing task modal:', err);
      } finally {
        openModal('modal-task');
      }
      setTimeout(() => {
        if (!taskId) startModalTaskTitleEdit();
      }, 120);
    }

    function onTaskProjectSelectChanged(pId) {
      const pPhases = state.phases.filter(p => p.projectId === pId);
      const phaseSel = document.getElementById('form-task-phase');
      phaseSel.innerHTML = pPhases.map((p, idx) => `<option value="${p.id}">${idx + 1}. ${cleanTierTitle(p.name)}</option>`).join('');
      if (pPhases.length > 0) {
        onTaskPhaseSelectChanged(pPhases[0].id);
      }
    }

    function updateModalTaskAutoWBS() {
      const isNew = !document.getElementById('form-task-id').value;
      if (!isNew) return;
      const phaseId = document.getElementById('form-task-phase').value;
      const moduleId = document.getElementById('form-task-module').value;
      const p = state.phases.find(x => x.id === phaseId);
      const m = p ? (p.modules || []).find(x => x.id === moduleId) : null;
      if (p && m) {
        const pIdx = state.phases.filter(x => x.projectId === (p.projectId || state.currentProjectId)).indexOf(p) + 1;
        const mIdx = (p.modules || []).indexOf(m) + 1;
        const nextNum = (m.tasks || []).length + 1;
        document.getElementById('form-task-wbs').value = `${pIdx}.${mIdx}.${nextNum}`;
      }
    }

    function onTaskPhaseSelectChanged(phaseId) {
      const phase = state.phases.find(p => p.id === phaseId);
      const modSel = document.getElementById('form-task-module');
      if (phase && phase.modules && phase.modules.length > 0) {
        const pIdx = state.phases.filter(x => x.projectId === (phase.projectId || state.currentProjectId)).indexOf(phase) + 1;
        modSel.innerHTML = phase.modules.map((m, mIdx) => `<option value="${m.id}">${pIdx}.${mIdx + 1} ${cleanTierTitle(m.name)}</option>`).join('');
      } else {
        modSel.innerHTML = `<option value="">無大功能 (請先在甘特圖新增)</option>`;
      }
      updateModalTaskAutoWBS();
    }

    function saveTask() {
      try {
        if (isEditingModalTaskTitle) {
          const titleInput = document.getElementById('modal-task-title-input');
          if (titleInput) finishModalTaskTitleEdit(titleInput.value);
        }
        const id = document.getElementById('form-task-id').value;
        const projectId = document.getElementById('form-task-project')?.value || state.currentProjectId;
        let phaseId = document.getElementById('form-task-phase')?.value;
        let moduleId = document.getElementById('form-task-module')?.value;
        const wbs = (document.getElementById('form-task-wbs')?.value || '').trim();
        
        let title = (document.getElementById('form-task-title')?.value || document.getElementById('modal-task-title-text')?.innerText || '').trim();
        if (title.includes('點擊輸入') || title.includes('未命名任務') || title.includes('新增任務')) {
          title = '';
        }
        if (!title) {
          alert('請填寫項目名稱！');
          startModalTaskTitleEdit();
          return;
        }

        const type = document.getElementById('form-task-type')?.value || '功能';
        const dept1Id = document.getElementById('form-task-dept-1')?.value || '';
        const dept2Id = document.getElementById('form-task-dept-2')?.value || '';
        const estimatingDeptIds = [dept1Id, dept2Id].filter(Boolean);

        let estimator = (document.getElementById('form-task-estimator')?.value || '').trim();
        if (!estimator) {
          estimator = (currentAuthUser && currentAuthUser.memberInfo) ? currentAuthUser.memberInfo.name : (state.members[0]?.name || '系統管理員');
        }

        const assignees = getSelectedTaskAssignees();
        const assignee = assignees.join(', ');
        const expectedDeliveryDate = document.getElementById('form-task-expected-date')?.value || '';
        const startDate = document.getElementById('form-task-start')?.value || '';
        const dueDate = document.getElementById('form-task-due')?.value || '';
        const estHours = (document.getElementById('form-task-est-hours')?.value !== '') ? Number(document.getElementById('form-task-est-hours')?.value) : 0;
        let status = document.getElementById('form-task-status')?.value || '規劃中';
        const severity = (type === 'Bug') ? (document.getElementById('form-task-severity')?.value || '無') : '無';

        // 檢查審核權限
        if (status === '已完成' && !hasPermission('task_complete_permission')) {
          alert('⚠️ 您目前無「審核任務驗收結案 (切換為已完成)」權限，需由專案經理 (PM) 審核結案！');
          return;
        }

        sanitizePhases();

        let phase = state.phases.find(p => p.id === phaseId);
        if (!phase) {
          const projectPhases = state.phases.filter(p => p.projectId === projectId);
          if (projectPhases.length > 0) {
            phase = projectPhases[0];
            phaseId = phase.id;
          } else {
            phase = {
              id: 'phase-' + Date.now(),
              projectId: projectId,
              name: '需求分析與規劃',
              expanded: true,
              modules: []
            };
            state.phases.push(phase);
            phaseId = phase.id;
          }
        }

        if (!phase.modules) phase.modules = [];
        let targetMod = phase.modules.find(m => m.id === moduleId);
        if (!targetMod) {
          if (phase.modules.length > 0) {
            targetMod = phase.modules[0];
          } else {
            targetMod = { id: 'mod-' + Date.now(), name: '通用核心模組', tasks: [] };
            phase.modules.push(targetMod);
          }
          moduleId = targetMod.id;
        }
        if (!targetMod.tasks) targetMod.tasks = [];

        const parentTaskId = document.getElementById('form-task-parent-id')?.value || '';
        const levelVal = document.getElementById('form-task-level')?.value || '3';

        if (parentTaskId || levelVal === '4') {
          let parentTask = null;
          state.phases.forEach(p => {
            (p.modules || []).forEach(m => {
              const pt = (m.tasks || []).find(t => t.id === parentTaskId);
              if (pt) parentTask = pt;
            });
          });

          if (!parentTask) {
            parentTask = (targetMod.tasks || []).find(t => t.id === parentTaskId);
          }

          if (parentTask) {
            if (!parentTask.subTasks) parentTask.subTasks = [];
            const subType = (type === 'Bug' || type === '優化') ? type : 'Bug';

            if (id) {
              let existingSubTask = null;
              state.phases.forEach(p => {
                (p.modules || []).forEach(m => {
                  (m.tasks || []).forEach(t => {
                    const idx = (t.subTasks || []).findIndex(st => st.id === id);
                    if (idx !== -1) {
                      existingSubTask = t.subTasks[idx];
                      if (t.id !== parentTask.id) {
                        t.subTasks.splice(idx, 1);
                      }
                    }
                  });
                });
              });

              if (existingSubTask) {
                existingSubTask.projectId = projectId;
                existingSubTask.phaseId = phase.id;
                existingSubTask.moduleId = targetMod.id;
                existingSubTask.parentTaskId = parentTask.id;
                existingSubTask.wbs = wbs;
                existingSubTask.title = title;
                existingSubTask.type = subType;
                existingSubTask.estimator = estimator;
                existingSubTask.estimatingDeptIds = estimatingDeptIds;
                existingSubTask.assignees = assignees;
                existingSubTask.assignee = assignee;
                existingSubTask.expectedDeliveryDate = expectedDeliveryDate;
                existingSubTask.startDate = startDate;
                existingSubTask.dueDate = dueDate;
                existingSubTask.estHours = estHours;
                existingSubTask.status = status;
                existingSubTask.severity = severity;
                if (!parentTask.subTasks.some(st => st.id === id)) {
                  parentTask.subTasks.push(existingSubTask);
                }
              } else {
                const newSubTask = {
                  id, projectId, phaseId: phase.id, moduleId: targetMod.id, parentTaskId: parentTask.id, wbs, title, type: subType, estimator, estimatingDeptIds, evaluations: {}, assignees, assignee, expectedDeliveryDate, startDate, dueDate, estHours, actHours: 0, status, severity
                };
                parentTask.subTasks.push(newSubTask);
              }
              showToast(`子項目「${title}」已成功更新！`);
            } else {
              const newSubTask = {
                id: 'subtask-' + Date.now(),
                projectId,
                phaseId: phase.id,
                moduleId: targetMod.id,
                parentTaskId: parentTask.id,
                wbs,
                title,
                type: subType,
                estimator,
                estimatingDeptIds,
                evaluations: {},
                assignees,
                assignee,
                expectedDeliveryDate,
                startDate,
                dueDate,
                estHours,
                actHours: 0,
                status,
                severity
              };
              parentTask.subTasks.push(newSubTask);
              showToast(`子項目「${title}」建立成功！`);
            }
          }
        } else {
          if (id) {
            let existingTask = null;
            state.phases.forEach(p => {
              (p.modules || []).forEach(m => {
                const idx = (m.tasks || []).findIndex(t => t.id === id);
                if (idx !== -1) {
                  existingTask = m.tasks[idx];
                  if (m.id !== targetMod.id || p.id !== phase.id) {
                    m.tasks.splice(idx, 1);
                  }
                }
              });
            });

            if (existingTask) {
              existingTask.projectId = projectId;
              existingTask.phaseId = phase.id;
              existingTask.moduleId = targetMod.id;
              existingTask.wbs = wbs;
              existingTask.title = title;
              existingTask.type = type;
              existingTask.estimator = estimator;
              existingTask.estimatingDeptIds = estimatingDeptIds;
              if (!existingTask.evaluations) existingTask.evaluations = {};
              existingTask.assignees = assignees;
              existingTask.assignee = assignee;
              existingTask.expectedDeliveryDate = expectedDeliveryDate;
              existingTask.startDate = startDate;
              existingTask.dueDate = dueDate;
              existingTask.estHours = estHours;
              existingTask.status = status;
              existingTask.severity = severity;

              if (!targetMod.tasks.some(t => t.id === id)) {
                targetMod.tasks.push(existingTask);
              }
            } else {
              const newTask = {
                id, projectId, phaseId: phase.id, moduleId: targetMod.id, wbs, title, type, estimator, estimatingDeptIds, evaluations: {}, assignees, assignee, expectedDeliveryDate, startDate, dueDate, estHours, actHours: 0, status, severity, subTasks: []
              };
              targetMod.tasks.push(newTask);
            }
            showToast(`任務「${title}」已成功更新！`);
          } else {
            const newTask = {
              id: 'task-' + Date.now(),
              projectId,
              phaseId: phase.id,
              moduleId: targetMod.id,
              wbs,
              title,
              type,
              estimator,
              estimatingDeptIds,
              evaluations: {},
              assignees,
              assignee,
              expectedDeliveryDate,
              startDate,
              dueDate,
              estHours,
              actHours: 0,
              status,
              severity,
              subTasks: []
            };
            targetMod.tasks.push(newTask);
            showToast(`任務「${title}」建立成功！`);
          }
        }

        recalculateAllWBS(projectId);
        syncToFirebase();
        closeModal('modal-task');
        renderAll();
      } catch (err) {
        console.error("儲存任務錯誤:", err);
        alert("儲存任務時發生未預期的錯誤: " + (err.message || err));
      }
    }

    function editTask(id) { openTaskModal(id); }
    function deleteTask(id) {
      if (confirm('確定刪除此項目嗎？')) {
        sanitizePhases();
        state.phases.forEach(p => {
          (p.modules || []).forEach(m => {
            m.tasks = (m.tasks || []).filter(t => t.id !== id);
            (m.tasks || []).forEach(t => {
              if (t.subTasks) {
                t.subTasks = t.subTasks.filter(st => st.id !== id);
              }
            });
          });
        });
        recalculateAllWBS(state.currentProjectId);
        syncToFirebase();
        renderAll();
        showToast('項目已刪除');
      }
    }

    // ================= 9. ISSUES & QA TESTING TRACKER =================
    function renderIssuesTable() {
      const tbody = document.getElementById('issues-table-body');
      if (!tbody) return;

      const currP = getCurrentProject();
      const searchKeyword = (document.getElementById('issues-search-input')?.value || '').toLowerCase().trim();

      const pIssues = state.issues.filter(i => {
        if (i.projectId !== currP.id) return false;
        if (searchKeyword) {
          const matchTitle = (i.title || '').toLowerCase().includes(searchKeyword);
          const matchAssignee = (i.assignee || '').toLowerCase().includes(searchKeyword);
          return matchTitle || matchAssignee;
        }
        return true;
      });

      tbody.innerHTML = pIssues.map(i => {
        const attachCount = (i.attachments || []).length;
        const statusBadge = i.status === '已關閉' || i.status === '已修復' ? 'badge-success' : i.status === '處理中' ? 'badge-info' : 'badge-warning';
        return `
          <tr>
            <td style="font-family:monospace; font-weight:700;">${TODAY}</td>
            <td><span class="badge badge-purple">${i.category || '問題瑕疵'}</span></td>
            <td>
              <div style="font-weight:800; color:#0f172a;">${i.title}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">${i.descriptionHtml ? i.descriptionHtml.replace(/<[^>]*>?/gm, '').substring(0, 40) + '...' : ''}</div>
              ${attachCount > 0 ? `<div style="margin-top:4px;"><span class="badge badge-slate">📎 ${attachCount} 個附件</span></div>` : ''}
            </td>
            <td>${currP.name}</td>
            <td style="font-weight:600;">${i.assignee || '未指派'}</td>
            <td><span class="badge ${statusBadge}">${i.status}</span></td>
            <td style="font-family:monospace;">${i.dueDate || '-'}</td>
            <td style="text-align: right; white-space:nowrap;">
              ${hasPermission('issue_edit') ? `<button class="btn btn-secondary btn-xs" onclick="editIssue('${i.id}')">檢視 / 編輯</button>` : ''}
              ${hasPermission('issue_delete') ? `<button class="btn btn-danger-outline btn-xs" onclick="deleteIssue('${i.id}')">刪除</button>` : ''}
            </td>
          </tr>
        `;
      }).join('') || `<tr><td colspan="8" style="text-align:center; padding:24px; color:#94a3b8;">此專案尚無任何提報之問題或測試追蹤項目</td></tr>`;
    }

    function openIssueModal(issueId = null) {
      document.getElementById('form-issue-id').value = issueId || '';
      document.getElementById('modal-issue-title').innerText = issueId ? '編輯問題與測試追蹤' : '提報問題與測試追蹤 (HTML 富文本 / 附件)';

      const projSelect = document.getElementById('form-issue-project');
      projSelect.innerHTML = state.projects.map(p => `<option value="${p.id}" ${p.id === state.currentProjectId ? 'selected' : ''}>${p.name}</option>`).join('');

      const assigneeSelect = document.getElementById('form-issue-assignee');
      assigneeSelect.innerHTML = state.members.map(m => `<option value="${m.name}">${m.name} (${m.role})</option>`).join('');

      onIssueProjectSelectChanged(state.currentProjectId);

      currentUploadedFiles = [];

      if (issueId) {
        const i = state.issues.find(x => x.id === issueId);
        if (i) {
          projSelect.value = i.projectId;
          onIssueProjectSelectChanged(i.projectId);
          document.getElementById('form-issue-task').value = i.taskId || '';
          document.getElementById('form-issue-category').value = i.category || '問題瑕疵';
          document.getElementById('form-issue-title-input').value = i.title;
          document.getElementById('form-issue-assignee').value = i.assignee;
          document.getElementById('form-issue-status').value = i.status || '已確認';
          document.getElementById('issue-editor-content').innerHTML = i.descriptionHtml || '';
          currentUploadedFiles = [...(i.attachments || [])];
        }
      } else {
        document.getElementById('form-issue-category').value = '問題瑕疵';
        document.getElementById('form-issue-title-input').value = '';
        document.getElementById('form-issue-status').value = '已確認';
        document.getElementById('issue-editor-content').innerHTML = '';
      }
      renderAttachmentPills();
      openModal('modal-issue');
    }

    function onIssueProjectSelectChanged(pId) {
      const pTasks = state.tasks.filter(t => t.projectId === pId && isTaskVisibleToCurrentRole(t));
      const taskSelect = document.getElementById('form-issue-task');
      taskSelect.innerHTML = `<option value="">(無關聯任務)</option>` + pTasks.map(t => `<option value="${t.id}">[${t.wbs || t.type}] ${t.title}</option>`).join('');
    }

    function execEditorCmd(cmd, val = null) {
      document.execCommand(cmd, false, val);
      document.getElementById('issue-editor-content').focus();
    }

    function triggerEditorImage() {
      document.getElementById('editor-image-file').click();
    }

    function insertEditorImageFile(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        execEditorCmd('insertImage', e.target.result);
      };
      reader.readAsDataURL(file);
    }

    function triggerAttachmentSelect() {
      document.getElementById('issue-file-input').click();
    }

    function handleDragOver(e) {
      e.preventDefault();
      document.getElementById('issue-dropzone').classList.add('dragover');
    }

    function handleDragLeave(e) {
      document.getElementById('issue-dropzone').classList.remove('dragover');
    }

    function handleFileDrop(e) {
      e.preventDefault();
      document.getElementById('issue-dropzone').classList.remove('dragover');
      handleAttachmentFiles(e.dataTransfer.files);
    }

    function handleAttachmentFiles(files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        currentUploadedFiles.push({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type
        });
      }
      renderAttachmentPills();
    }

    function renderAttachmentPills() {
      const c = document.getElementById('issue-attachments-list');
      if (!c) return;
      c.innerHTML = currentUploadedFiles.map((f, idx) => `
        <span class="attachment-pill">
          <span>📄 ${f.name} (${f.size})</span>
          <button type="button" onclick="removeAttachmentFile(${idx})" style="background:none; border:none; color:#f43f5e; cursor:pointer; font-weight:800;">✕</button>
        </span>
      `).join('');
    }

    function removeAttachmentFile(idx) {
      currentUploadedFiles.splice(idx, 1);
      renderAttachmentPills();
    }

    function saveIssue() {
      const id = document.getElementById('form-issue-id').value;
      const projectId = document.getElementById('form-issue-project').value;
      const taskId = document.getElementById('form-issue-task').value;
      const category = document.getElementById('form-issue-category').value;
      const title = document.getElementById('form-issue-title-input').value.trim();
      const assignee = document.getElementById('form-issue-assignee').value;
      const status = document.getElementById('form-issue-status').value;
      const descriptionHtml = document.getElementById('issue-editor-content').innerHTML;

      if (!title) {
        alert('請填寫問題標題！');
        return;
      }

      if (id) {
        const i = state.issues.find(x => x.id === id);
        if (i) {
          i.projectId = projectId; i.taskId = taskId; i.category = category;
          i.title = title; i.assignee = assignee; i.status = status;
          i.descriptionHtml = descriptionHtml; i.attachments = [...currentUploadedFiles];
        }
        showToast('問題追蹤項目已更新！');
      } else {
        state.issues.push({
          id: 'issue-' + Date.now(),
          projectId, taskId, category, title, assignee, status,
          dueDate: '2026-09-30',
          descriptionHtml,
          attachments: [...currentUploadedFiles]
        });
        showToast('問題與測試記錄已成功發佈！');
      }
      syncToFirebase();
      closeModal('modal-issue');
      renderAll();
    }

    function editIssue(id) { openIssueModal(id); }
    function deleteIssue(id) {
      if (confirm('確定刪除此問題紀錄嗎？')) {
        state.issues = state.issues.filter(i => i.id !== id);
        renderAll();
        showToast('問題記錄已刪除');
      }
    }

    // ================= EXPORT & BACKUP =================
    function exportExcelReports() {
      const currP = getCurrentProject();
      const pTasks = state.tasks.filter(t => t.projectId === currP.id);

      let csvContent = "\uFEFF專案名稱,任務WBS,任務名稱,類型,評估人,共同執行人員,開始日期,截止日期,預估工時,實際工時,狀態\n";
      pTasks.forEach(t => {
        const assignees = getTaskAssignees(t).join('; ');
        csvContent += `"${currP.name}","${t.wbs || ''}","${t.title}","${t.type || '功能'}","${t.estimator || ''}","${assignees}","${t.startDate || ''}","${t.dueDate || ''}",${t.estHours || 0},${t.actHours || 0},"${t.status}"\n`;
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currP.code}_Tasks_Report_${TODAY}.csv`;
      a.click();
      showToast('已成功匯出專案 CSV 任務報表！');
    }

    function exportJSONBackup() {
      const jsonStr = JSON.stringify(state, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `B2B_PM_Full_Backup_${TODAY}.json`;
      a.click();
      showToast('已下載系統完整 JSON 備份檔！');
    }

    function triggerJSONImport() {
      document.getElementById('json-file-input').click();
    }

    function importJSONBackup(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.projects && imported.phases) {
            Object.assign(state, imported);
            renderAll();
            showToast('備份資料成功還原！');
          } else { alert('無效的備份 JSON 檔案！'); }
        } catch(err) { alert('解析備份檔案失敗: ' + err); }
      };
      reader.readAsText(file);
    }

    // Launch initial render safely
    initAuthUser();
    renderAll(true);
    initRoute();
    if (window.location.hash === '#modal-login') {
      openLoginModal();
    } else if (window.location.hash === '#tier2') {
      enterProjectTier('proj-1');
    } else if (window.location.hash === '#tier2-bb') {
      enterProjectTier('prj-bb');
    } else if (window.location.hash === '#tier2-bb-scrolled-h') {
      enterProjectTier('prj-bb');
      const rc = document.getElementById('gantt-timeline-container');
      const rh = document.getElementById('gantt-right-header-container');
      if (rc) rc.scrollLeft = 380;
      if (rh) rh.scrollLeft = 380;
    } else if (window.location.hash === '#tier2-bb-scrolled-v') {
      enterProjectTier('prj-bb');
      const rc = document.getElementById('gantt-timeline-container');
      const lb = document.getElementById('gantt-left-body');
      if (rc) rc.scrollTop = 120;
      if (lb) lb.scrollTop = 120;
    } else if (window.location.hash === '#proj-dropdown') {
      openSidebarProjectDropdown();
    } else if (window.location.hash === '#task-edit-view') {
      enterProjectTier('prj-bb');
      const firstTask = state.tasks.find(x => x.projectId === 'prj-bb') || state.tasks[0];
      if (firstTask) openTaskModal(firstTask.id);
    } else if (window.location.hash === '#task-edit-inline') {
      enterProjectTier('prj-bb');
      const firstTask = state.tasks.find(x => x.projectId === 'prj-bb') || state.tasks[0];
      if (firstTask) {
        openTaskModal(firstTask.id);
        startModalTaskTitleEdit();
      }
    } else if (window.location.hash === '#task-edit-changed') {
      enterProjectTier('prj-bb');
      const firstTask = state.tasks.find(x => x.projectId === 'prj-bb') || state.tasks[0];
      if (firstTask) {
        openTaskModal(firstTask.id);
        startModalTaskTitleEdit();
        finishModalTaskTitleEdit('處理核心架構與SRS規格書 (新規格修訂)');
      }
    } else if (window.location.hash === '#test-task-modal-clean') {
      enterProjectTier('prj-bb');
      const t = state.tasks.find(x => x.id === 'task-1-1-1');
      if (t) openTaskModal(t.id);
    } else if (window.location.hash === '#test-task-modal-bug') {
      enterProjectTier('prj-bb');
      const t = state.tasks.find(x => x.id === 'task-1-1-1');
      if (t) {
        openTaskModal(t.id);
        document.getElementById('form-task-type').value = 'Bug';
        onTaskTypeChange('Bug');
      }
    } else if (window.location.hash === '#test-task-modal-feature') {
      enterProjectTier('prj-bb');
      const t = state.tasks.find(x => x.id === 'task-1-1-1');
      if (t) {
        openTaskModal(t.id);
        document.getElementById('form-task-type').value = '功能';
        onTaskTypeChange('功能');
      }
    } else if (window.location.hash === '#test-debug-engineer-pending') {
      enterProjectTier('prj-bb');
      const p = state.phases.find(x => x.projectId === 'prj-bb');
      const m = p.modules[0];
      const testTaskId = 'task-test-eng';
      let testTask = m.tasks.find(x => x.id === testTaskId);
      if (!testTask) {
        testTask = {
          id: testTaskId,
          projectId: 'prj-bb',
          phaseId: p.id,
          moduleId: m.id,
          wbs: '1.1.99',
          title: '工程師排程填寫測試 (指派林資深工程師)',
          type: '功能',
          assignee: '林資深工程師 (Sarah Lin)',
          expectedDeliveryDate: '2026-09-20',
          startDate: '',
          dueDate: '',
          estHours: '',
          status: '待執行'
        };
        m.tasks.push(testTask);
        state.tasks = getFlatTasks();
      }
      onRoleSimulatorChange('role-dev');
      openTaskModal(testTaskId);
    } else if (window.location.hash === '#test-debug-engineer-pending-huang') {
      enterProjectTier('prj-bb');
      const p = state.phases.find(x => x.projectId === 'prj-bb');
      const m = p.modules[0];
      const testTaskId = 'task-test-eng-huang';
      let testTask = m.tasks.find(x => x.id === testTaskId);
      if (!testTask) {
        testTask = {
          id: testTaskId,
          projectId: 'prj-bb',
          phaseId: p.id,
          moduleId: m.id,
          wbs: '1.1.98',
          title: '工程師排程填寫測試 (指派黃系統架構師)',
          type: '功能',
          assignee: '黃系統架構師 (Kevin Huang)',
          expectedDeliveryDate: '2026-09-20',
          startDate: '',
          dueDate: '',
          estHours: '',
          status: '待執行'
        };
        m.tasks.push(testTask);
        state.tasks = getFlatTasks();
      }
      onRoleSimulatorChange('role-dev');
      openTaskModal(testTaskId);
    } else if (window.location.hash === '#test-login-engineer-pending') {
      enterProjectTier('prj-bb');
      const m = state.members.find(x => x.name.includes('黃系統架構師'));
      if (m) {
        currentAuthUser = {
          uid: m.id,
          email: m.email,
          displayName: m.name,
          photoURL: '',
          memberInfo: m
        };
        state.isSimulatorActive = false;
        state.simulatedRoleId = 'self';
        updateUserUI(currentAuthUser, m);
        applyRolePermissions();
      }
      const p = state.phases.find(x => x.projectId === 'prj-bb');
      const mod = p.modules[0];
      const testTaskId = 'task-test-login-eng';
      let testTask = mod.tasks.find(x => x.id === testTaskId);
      if (!testTask) {
        testTask = {
          id: testTaskId,
          projectId: 'prj-bb',
          phaseId: p.id,
          moduleId: mod.id,
          wbs: '1.1.97',
          title: '真實登入工程師排程填寫測試',
          type: '功能',
          assignee: '黃系統架構師 (Kevin Huang)',
          expectedDeliveryDate: '2026-09-20',
          startDate: '',
          dueDate: '',
          estHours: '',
          status: '待執行'
        };
        mod.tasks.push(testTask);
        state.tasks = getFlatTasks();
      }
      openTaskModal(testTaskId);
    } else if (window.location.hash === '#test-task-planning-locked') {
      enterProjectTier('prj-bb');
      const t = state.tasks.find(x => x.id === 'task-3-1-1');
      if (t) openTaskModal(t.id);
    } else if (window.location.hash === '#test-worklog-filter') {
      enterProjectTier('prj-bb');
      openWorkLogModal();
    } else if (window.location.hash === '#test-role-matrix-perms') {
      openRoleMatrixModal('role-pm');
      const box = document.getElementById('role-matrix-scroll-body');
      if (box) box.scrollTop = 380;
    } else if (window.location.hash === '#test-new-task-modal') {
      enterProjectTier('prj-bb');
      const p = state.phases.find(x => x.projectId === 'prj-bb') || state.phases[0];
      const m = p && p.modules ? p.modules[0] : null;
      inlineAddTask(p.id, m ? m.id : null);
    } else if (window.location.hash === '#test-scale-day') {
      enterProjectTier('prj-bb');
      setGanttScale('day');
    } else if (window.location.hash === '#test-scale-week') {
      enterProjectTier('prj-bb');
      setGanttScale('week');
    } else if (window.location.hash === '#test-scale-month') {
      enterProjectTier('prj-bb');
      setGanttScale('month');
    } else if (window.location.hash === '#test-scale-quarter') {
      enterProjectTier('prj-bb');
      setGanttScale('quarter');
    } else if (window.location.hash === '#test-scale-year') {
      enterProjectTier('prj-bb');
      setGanttScale('year');
    } else if (window.location.hash === '#test-dynamic-range-spanning') {
      enterProjectTier('prj-bb');
      const p = state.phases.find(x => x.projectId === 'prj-bb') || state.phases[0];
      if (p && p.modules && p.modules[0]) {
        p.modules[0].tasks.push({
          id: 'task-test-early',
          projectId: 'prj-bb',
          phaseId: p.id,
          moduleId: p.modules[0].id,
          wbs: '1.1.9',
          title: '先期啟動需求 (2026年5月)',
          type: '功能',
          assignee: '陳專案經理 (Alex Chen)',
          startDate: '2026-05-08',
          dueDate: '2026-05-25',
          estHours: 40,
          status: '已完成'
        });
        p.modules[0].tasks.push({
          id: 'task-test-late',
          projectId: 'prj-bb',
          phaseId: p.id,
          moduleId: p.modules[0].id,
          wbs: '1.1.10',
          title: '跨年長期維運驗收 (2027年1月)',
          type: '功能',
          assignee: '林資深工程師 (Sarah Lin)',
          startDate: '2026-12-15',
          dueDate: '2027-01-20',
          estHours: 80,
          status: '進行中'
        });
        state.tasks = getFlatTasks();
        setGanttScale('month');
      }
    } else if (window.location.hash === '#test-scale-day-scrolled-end') {
      enterProjectTier('prj-bb');
      setGanttScale('day');
      setTimeout(() => {
        const rc = document.getElementById('gantt-timeline-container');
        if (rc) rc.scrollLeft = 99999;
      }, 100);
    } else if (window.location.hash === '#test-scale-day-october') {
      enterProjectTier('prj-bb');
      const p = state.phases.find(x => x.projectId === 'prj-bb') || state.phases[0];
      if (p && p.modules && p.modules[0]) {
        p.modules[0].tasks.push({
          id: 'task-test-oct',
          projectId: 'prj-bb',
          phaseId: p.id,
          moduleId: p.modules[0].id,
          wbs: '1.1.99',
          title: '十月份階段任務 (2026-10-20)',
          type: '功能',
          assignee: '陳專案經理 (Alex Chen)',
          startDate: '2026-10-01',
          dueDate: '2026-10-20',
          estHours: 40,
          status: '進行中'
        });
        state.tasks = getFlatTasks();
        setGanttScale('day');
        setTimeout(() => {
          const rc = document.getElementById('gantt-timeline-container');
          if (rc) rc.scrollLeft = 99999;
        }, 100);
      }
    } else if (window.location.hash === '#test-roles-page') {
      navTo('roles');
    } else if (window.location.hash === '#test-role-pm-modal') {
      navTo('roles');
      openRoleMatrixModal('role-pm');
    } else if (window.location.hash === '#test-role-admin-modal') {
      navTo('roles');
      openRoleMatrixModal('role-admin');
    }
