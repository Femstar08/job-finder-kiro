import { Response } from 'express';
import { JobPreferencesService } from '../services/JobPreferencesService';
import { CreateJobPreferencesRequest, UpdateJobPreferencesRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class JobPreferencesController {
  private jobPreferencesService: JobPreferencesService;

  constructor() {
    this.jobPreferencesService = new JobPreferencesService();
  }

  createPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const preferencesData: CreateJobPreferencesRequest = req.body;
      console.log('Creating preferences for user:', req.user.id);
      console.log('Preferences data:', JSON.stringify(preferencesData, null, 2));

      // Additional validation
      await this.jobPreferencesService.validatePreferencesData(preferencesData);

      const preferences = await this.jobPreferencesService.createPreferences(req.user.id, preferencesData);

      res.status(201).json({
        message: 'Job preferences created successfully',
        data: preferences
      });
    } catch (error: any) {
      console.error('Error createPreferences:', error);
      throw error;
    }
  });

  getUserPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const preferences = await this.jobPreferencesService.getUserPreferences(req.user.id);

    res.json({
      message: 'Job preferences retrieved successfully',
      data: preferences
    });
  });

  getPreferencesById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const preferences = await this.jobPreferencesService.getPreferencesById(id, req.user.id);

    res.json({
      message: 'Job preferences retrieved successfully',
      data: preferences
    });
  });

  getActivePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const preferences = await this.jobPreferencesService.getActivePreferences(req.user.id);

    res.json({
      message: 'Active job preferences retrieved successfully',
      data: preferences
    });
  });

  updatePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const updates: UpdateJobPreferencesRequest = req.body;

    // Additional validation
    await this.jobPreferencesService.validatePreferencesData(updates);

    const updatedPreferences = await this.jobPreferencesService.updatePreferences(id, req.user.id, updates);

    res.json({
      message: 'Job preferences updated successfully',
      data: updatedPreferences
    });
  });

  toggleActive = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const updatedPreferences = await this.jobPreferencesService.togglePreferencesActive(id, req.user.id);

    res.json({
      message: `Job preferences ${updatedPreferences.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedPreferences
    });
  });

  deletePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    await this.jobPreferencesService.deletePreferences(id, req.user.id);

    res.json({
      message: 'Job preferences deleted successfully'
    });
  });

  duplicatePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const { profileName } = req.body;

    if (!profileName) {
      return res.status(400).json({
        error: 'Profile name is required for duplication',
        code: 'MISSING_PROFILE_NAME'
      });
    }

    const duplicatedPreferences = await this.jobPreferencesService.duplicatePreferences(
      id,
      req.user.id,
      profileName
    );

    res.status(201).json({
      message: 'Job preferences duplicated successfully',
      data: duplicatedPreferences
    });
  });

  getPreferencesStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const stats = await this.jobPreferencesService.getUserPreferencesStats(req.user.id);

    res.json({
      message: 'Job preferences statistics retrieved successfully',
      data: stats
    });
  });

  // N8N endpoint to get all active preferences (no authentication required for internal use)
  getAllActivePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const preferences = await this.jobPreferencesService.getAllActivePreferences();

    res.json({
      message: 'All active job preferences retrieved successfully',
      data: preferences
    });
  });
}