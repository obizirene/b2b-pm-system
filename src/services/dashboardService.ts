import { DashboardMetrics, ProjectSummary } from '@/types';
import { clientService } from './clientService';
import { projectService } from './projectService';
import { taskService } from './taskService';
import { issueService } from './issueService';
import { changeRequestService } from './changeRequestService';

export const dashboardService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const clients = await clientService.getClients();
    const masterProjects = await projectService.getMasterProjects();
    const allSubProjects = await projectService.getSubProjects();
    const allIssues = await issueService.getIssues();
    const allCRs = await changeRequestService.getChangeRequests();
    const allTasks = await taskService.getTasks();

    const todayStr = new Date().toISOString().split('T')[0]; // Current date YYYY-MM-DD

    const projectSummaries: ProjectSummary[] = masterProjects.map((project) => {
      const client = clients.find((c) => c.id === project.clientId);
      const projectSubProjects = allSubProjects.filter((s) => s.masterProjectId === project.id);
      const projectTasks = allTasks.filter((t) => t.masterProjectId === project.id);
      const projectIssues = allIssues.filter((i) => i.masterProjectId === project.id);
      const projectCRs = allCRs.filter((cr) => cr.masterProjectId === project.id);

      // Sum hours
      let totalEst = projectSubProjects.reduce((acc, s) => acc + s.estimatedHours, 0);
      let totalAct = projectSubProjects.reduce((acc, s) => acc + s.actualHours, 0);

      if (projectTasks.length > 0) {
        totalEst += projectTasks.reduce((acc, t) => acc + t.estimatedHours, 0);
        totalAct += projectTasks.reduce((acc, t) => acc + t.actualHours, 0);
      }

      // Progress % calculation
      let overallProgressPercent = 0;
      if (projectSubProjects.length > 0) {
        const sumProg = projectSubProjects.reduce((acc, s) => acc + s.progressPercent, 0);
        overallProgressPercent = Math.round(sumProg / projectSubProjects.length);
      }

      // Unresolved bugs count (open / in_progress)
      const unresolvedBugsCount = projectIssues.filter(
        (i) => i.status === 'open' || i.status === 'in_progress'
      ).length;

      // Active CRs count (submitted / in_progress)
      const activeCRsCount = projectCRs.filter(
        (cr) => cr.approvalStatus === 'submitted' || cr.implementStatus === 'in_progress'
      ).length;

      // Delay Warning Calculation
      // Delay alert if today > targetEndDate AND project status !== 'completed'
      let isDelayed = false;
      let delayDays = 0;

      if (project.status !== 'completed' && project.targetEndDate) {
        const targetDate = new Date(project.targetEndDate);
        const todayDate = new Date(todayStr);
        if (todayDate > targetDate) {
          isDelayed = true;
          const diffTime = Math.abs(todayDate.getTime() - targetDate.getTime());
          delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      return {
        masterProjectId: project.id,
        masterProjectName: project.name,
        masterProjectCode: project.code,
        clientName: client ? client.name : 'Unknown Client',
        status: project.status,
        totalEstimatedHours: totalEst,
        totalActualHours: totalAct,
        overallProgressPercent,
        unresolvedBugsCount,
        activeCRsCount,
        isDelayed,
        delayDays,
        targetEndDate: project.targetEndDate,
        actualEndDate: project.actualEndDate,
      };
    });

    const activeProjects = masterProjects.filter((p) => p.status === 'active').length;
    const delayedProjectsCount = projectSummaries.filter((s) => s.isDelayed).length;
    const totalCriticalBugs = allIssues.filter(
      (i) => i.severity === 'critical' && (i.status === 'open' || i.status === 'in_progress')
    ).length;
    const pendingCRsCount = allCRs.filter((cr) => cr.approvalStatus === 'submitted').length;

    return {
      totalClients: clients.length,
      activeProjects,
      delayedProjectsCount,
      totalCriticalBugs,
      pendingCRsCount,
      projectSummaries,
    };
  },
};
