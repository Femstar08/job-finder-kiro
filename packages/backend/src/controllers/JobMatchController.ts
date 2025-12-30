import { Request, Response } from 'express';
import { JobMatchService } from '../services/JobMatchService';
import { ApplicationStatus } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

// Default user ID for no-auth mode
const DEFAULT_USER_ID = 'default-user';

export class JobMatchController {
  private jobMatchService: JobMatchService;

  constructor() {
    this.jobMatchService = new JobMatchService();
  }

  getUserJobMatches = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as ApplicationStatus;
    const sourceWebsite = req.query.sourceWebsite as string;
    const search = req.query.search as string;

    const filters = {
      ...(status && { status }),
      ...(sourceWebsite && { sourceWebsite }),
      ...(search && { search })
    };

    const result = await this.jobMatchService.getUserJobMatches(
      req.user.id,
      page,
      limit,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    res.json({
      message: 'Job matches retrieved successfully',
      data: result
    });
  });

  getJobMatchById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const jobMatch = await this.jobMatchService.getJobMatchById(id, req.user.id);

    res.json({
      message: 'Job match retrieved successfully',
      data: jobMatch
    });
  });

  updateApplicationStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const { applicationStatus } = req.body;

    const updatedJobMatch = await this.jobMatchService.updateApplicationStatus(
      id,
      req.user.id,
      applicationStatus
    );

    res.json({
      message: 'Application status updated successfully',
      data: updatedJobMatch
    });
  });

  getJobStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const statistics = await this.jobMatchService.getJobStatistics(req.user.id);

    res.json({
      message: 'Job statistics retrieved successfully',
      data: statistics
    });
  });

  getRecentJobMatches = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const recentMatches = await this.jobMatchService.getRecentJobMatches(req.user.id, limit);

    res.json({
      message: 'Recent job matches retrieved successfully',
      data: recentMatches
    });
  });

  getJobMatchesBySource = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const sourceStats = await this.jobMatchService.getJobMatchesBySourceWebsite(req.user.id);

    res.json({
      message: 'Job matches by source retrieved successfully',
      data: sourceStats
    });
  });

  getDashboardData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get comprehensive dashboard data
    const [statistics, recentMatches, sourceStats] = await Promise.all([
      this.jobMatchService.getJobStatistics(req.user.id),
      this.jobMatchService.getRecentJobMatches(req.user.id, 5),
      this.jobMatchService.getJobMatchesBySourceWebsite(req.user.id)
    ]);

    res.json({
      message: 'Dashboard data retrieved successfully',
      data: {
        statistics,
        recentMatches,
        sourceStats
      }
    });
  });
}