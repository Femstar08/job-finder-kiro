import { BaseRepository } from './BaseRepository';
import { JobPreferences, CreateJobPreferencesRequest, UpdateJobPreferencesRequest } from '../../types';

export class JobPreferencesRepository extends BaseRepository {
  async create(userId: string, preferencesData: CreateJobPreferencesRequest): Promise<JobPreferences> {
    const row = {
      user_id: userId,
      profile_name: preferencesData.profileName,
      job_title: preferencesData.jobTitle || null,
      keywords: preferencesData.keywords,
      location: preferencesData.location,
      contract_types: preferencesData.contractTypes,
      salary_range: preferencesData.salaryRange,
      day_rate_range: preferencesData.dayRateRange,
      experience_levels: preferencesData.experienceLevel,
      company_sizes: preferencesData.companySize
    };

    const { data, error } = await this.db
      .from('jf_job_preferences')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Database Create Error:', error);
      throw new Error(error.message);
    }

    return this.mapRowToJobPreferences(data);
  }

  async findByUserId(userId: string): Promise<JobPreferences[]> {
    const { data, error } = await this.db
      .from('jf_job_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(row => this.mapRowToJobPreferences(row));
  }

  async findById(id: string, userId: string): Promise<JobPreferences | null> {
    const { data, error } = await this.db
      .from('jf_job_preferences')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }

    return this.mapRowToJobPreferences(data);
  }

  async findActiveByUserId(userId: string): Promise<JobPreferences[]> {
    const { data, error } = await this.db
      .from('jf_job_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(row => this.mapRowToJobPreferences(row));
  }

  async findAllActive(): Promise<JobPreferences[]> {
    const { data, error } = await this.db
      .from('jf_job_preferences')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(row => this.mapRowToJobPreferences(row));
  }

  async update(id: string, userId: string, updates: UpdateJobPreferencesRequest): Promise<JobPreferences> {
    const allowedUpdates: Record<string, any> = {};

    if (updates.profileName !== undefined) allowedUpdates.profile_name = updates.profileName;
    if (updates.jobTitle !== undefined) allowedUpdates.job_title = updates.jobTitle;
    if (updates.keywords !== undefined) allowedUpdates.keywords = updates.keywords;
    if (updates.location !== undefined) allowedUpdates.location = updates.location;
    if (updates.contractTypes !== undefined) allowedUpdates.contract_types = updates.contractTypes;
    if (updates.salaryRange !== undefined) allowedUpdates.salary_range = updates.salaryRange;
    if (updates.dayRateRange !== undefined) allowedUpdates.day_rate_range = updates.dayRateRange;
    if (updates.experienceLevel !== undefined) allowedUpdates.experience_levels = updates.experienceLevel;
    if (updates.companySize !== undefined) allowedUpdates.company_sizes = updates.companySize;

    if (Object.keys(allowedUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const { data, error } = await this.db
      .from('jf_job_preferences')
      .update(allowedUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRowToJobPreferences(data);
  }

  async toggleActive(id: string, userId: string): Promise<JobPreferences> {
    // First fetch current state
    const current = await this.findById(id, userId);
    if (!current) throw new Error('Job preferences not found');

    const { data, error } = await this.db
      .from('jf_job_preferences')
      .update({ is_active: !current.isActive })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRowToJobPreferences(data);
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('jf_job_preferences')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  async countByUserId(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('jf_job_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return count || 0;
  }

  async countActiveByUserId(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('jf_job_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return count || 0;
  }

  private mapRowToJobPreferences(row: any): JobPreferences {
    return {
      id: row.id,
      userId: row.user_id,
      profileName: row.profile_name,
      jobTitle: row.job_title,
      keywords: row.keywords || [],
      location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
      contractTypes: row.contract_types || [],
      salaryRange: typeof row.salary_range === 'string' ? JSON.parse(row.salary_range) : row.salary_range,
      dayRateRange: typeof row.day_rate_range === 'string' ? JSON.parse(row.day_rate_range) : row.day_rate_range,
      experienceLevel: row.experience_levels || [],
      companySize: row.company_sizes || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async healthCheck(): Promise<void> {
    // Simple health check - try to query the database
    const query = 'SELECT 1';
    await this.query(query);
  }
}