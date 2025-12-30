import { BaseRepository } from './BaseRepository';
import { JobMatch, ApplicationStatus, N8NJobFound } from '../../types';
import crypto from 'crypto';

export class JobMatchRepository extends BaseRepository {
  async create(preferenceId: string, jobData: N8NJobFound): Promise<JobMatch> {
    // Generate job hash for duplicate detection
    const jobHash = this.generateJobHash(jobData);

    const query = `
      INSERT INTO jf_job_matches (
        preference_id, job_title, company, location, salary, 
        contract_type, job_url, source_website, job_description, 
        requirements, job_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      preferenceId,
      jobData.title,
      jobData.company || null,
      jobData.location || null,
      jobData.salary || null,
      jobData.contractType || null,
      jobData.url,
      jobData.sourceWebsite,
      jobData.description || null,
      jobData.requirements || null,
      jobHash
    ];

    const result = await this.query(query, values);
    return this.mapRowToJobMatch(result.rows[0]);
  }

  async findByPreferenceId(
    preferenceId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: ApplicationStatus;
      sourceWebsite?: string;
      search?: string;
    }
  ): Promise<{ matches: JobMatch[]; total: number }> {
    let whereConditions = ['preference_id = $1'];
    let values: any[] = [preferenceId];
    let paramIndex = 2;

    // Add filters
    if (filters?.status) {
      whereConditions.push(`application_status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (filters?.sourceWebsite) {
      whereConditions.push(`source_website = $${paramIndex}`);
      values.push(filters.sourceWebsite);
      paramIndex++;
    }

    if (filters?.search) {
      whereConditions.push(`(
        job_title ILIKE $${paramIndex} OR 
        company ILIKE $${paramIndex} OR 
        job_description ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM jf_job_matches
      WHERE ${whereClause}
    `;
    const countResult = await this.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT *
      FROM jf_job_matches
      WHERE ${whereClause}
      ORDER BY found_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.query(dataQuery, [...values, limit, offset]);

    return {
      matches: dataResult.rows.map(row => this.mapRowToJobMatch(row)),
      total
    };
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: ApplicationStatus;
      sourceWebsite?: string;
      search?: string;
    }
  ): Promise<{ matches: JobMatch[]; total: number }> {
    let whereConditions = ['jp.user_id = $1'];
    let values: any[] = [userId];
    let paramIndex = 2;

    // Add filters
    if (filters?.status) {
      whereConditions.push(`jm.application_status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (filters?.sourceWebsite) {
      whereConditions.push(`jm.source_website = $${paramIndex}`);
      values.push(filters.sourceWebsite);
      paramIndex++;
    }

    if (filters?.search) {
      whereConditions.push(`(
        jm.job_title ILIKE $${paramIndex} OR 
        jm.company ILIKE $${paramIndex} OR 
        jm.job_description ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM jf_job_matches jm
      JOIN jf_job_preferences jp ON jm.preference_id = jp.id
      WHERE ${whereClause}
    `;
    const countResult = await this.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT jm.*, jp.profile_name
      FROM jf_job_matches jm
      JOIN jf_job_preferences jp ON jm.preference_id = jp.id
      WHERE ${whereClause}
      ORDER BY jm.found_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.query(dataQuery, [...values, limit, offset]);

    return {
      matches: dataResult.rows.map(row => ({
        ...this.mapRowToJobMatch(row),
        profileName: row.profile_name
      })),
      total
    };
  }

  async findById(id: string): Promise<JobMatch | null> {
    const query = 'SELECT * FROM jf_job_matches WHERE id = $1';
    const result = await this.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJobMatch(result.rows[0]);
  }

  async updateApplicationStatus(id: string, status: ApplicationStatus): Promise<JobMatch> {
    const query = `
      UPDATE jf_job_matches
      SET application_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.query(query, [status, id]);

    if (result.rows.length === 0) {
      throw new Error('Job match not found');
    }

    return this.mapRowToJobMatch(result.rows[0]);
  }

  async markAlertSent(id: string): Promise<void> {
    const query = `
      UPDATE jf_job_matches
      SET alert_sent = true
      WHERE id = $1
    `;

    await this.query(query, [id]);
  }

  async checkDuplicate(jobHash: string): Promise<boolean> {
    const query = 'SELECT 1 FROM jf_job_matches WHERE job_hash = $1';
    const result = await this.query(query, [jobHash]);
    return result.rows.length > 0;
  }

  async checkDuplicateByUrl(url: string): Promise<JobMatch | null> {
    const query = 'SELECT * FROM jf_job_matches WHERE job_url = $1 ORDER BY found_at DESC LIMIT 1';
    const result = await this.query(query, [url]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJobMatch(result.rows[0]);
  }

  async findSimilarJobs(jobData: N8NJobFound, threshold: number = 0.8): Promise<JobMatch[]> {
    // Find jobs with similar titles and companies from the same website
    const query = `
      SELECT *, 
        similarity(job_title, $1) as title_similarity,
        similarity(COALESCE(company, ''), $2) as company_similarity
      FROM jf_job_matches
      WHERE source_website = $3
        AND (
          similarity(job_title, $1) > $4 OR
          (company IS NOT NULL AND similarity(company, $2) > $4)
        )
      ORDER BY title_similarity DESC, company_similarity DESC
      LIMIT 10
    `;

    const result = await this.query(query, [
      jobData.title,
      jobData.company || '',
      jobData.sourceWebsite,
      threshold
    ]);

    return result.rows.map(row => this.mapRowToJobMatch(row));
  }

  async checkBatchDuplicates(jobHashes: string[]): Promise<string[]> {
    if (jobHashes.length === 0) return [];

    const placeholders = jobHashes.map((_, index) => `$${index + 1}`).join(',');
    const query = `SELECT job_hash FROM jf_job_matches WHERE job_hash IN (${placeholders})`;

    const result = await this.query(query, jobHashes);
    return result.rows.map(row => row.job_hash);
  }

  async getDuplicateJobsByPreference(preferenceId: string): Promise<JobMatch[]> {
    const query = `
      SELECT jm1.*
      FROM jf_job_matches jm1
      JOIN jf_job_matches jm2 ON jm1.job_hash = jm2.job_hash
      WHERE jm1.preference_id = $1
        AND jm1.id != jm2.id
      ORDER BY jm1.found_at DESC
    `;

    const result = await this.query(query, [preferenceId]);
    return result.rows.map(row => this.mapRowToJobMatch(row));
  }

  async consolidateDuplicateJobs(keepJobId: string, duplicateJobIds: string[]): Promise<void> {
    if (duplicateJobIds.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update the kept job with consolidated information
      const updateQuery = `
        UPDATE jf_job_matches 
        SET 
          alert_sent = (
            SELECT bool_or(alert_sent) 
            FROM jf_job_matches 
            WHERE id = ANY($1) OR id = $2
          ),
          application_status = COALESCE(
            (SELECT application_status 
             FROM jf_job_matches 
             WHERE id = ANY($1) AND application_status != 'not_applied' 
             LIMIT 1),
            application_status
          )
        WHERE id = $2
      `;

      await client.query(updateQuery, [duplicateJobIds, keepJobId]);

      // Delete duplicate jobs
      const deleteQuery = `DELETE FROM jf_job_matches WHERE id = ANY($1)`;
      await client.query(deleteQuery, [duplicateJobIds]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getJobStatistics(userId: string): Promise<{
    totalMatches: number;
    appliedJobs: number;
    interviewedJobs: number;
    rejectedJobs: number;
    offeredJobs: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN jm.application_status = 'applied' THEN 1 END) as applied_jobs,
        COUNT(CASE WHEN jm.application_status = 'interviewed' THEN 1 END) as interviewed_jobs,
        COUNT(CASE WHEN jm.application_status = 'rejected' THEN 1 END) as rejected_jobs,
        COUNT(CASE WHEN jm.application_status = 'offered' THEN 1 END) as offered_jobs
      FROM jf_job_matches jm
      JOIN jf_job_preferences jp ON jm.preference_id = jp.id
      WHERE jp.user_id = $1
    `;

    const result = await this.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalMatches: parseInt(row.total_matches),
      appliedJobs: parseInt(row.applied_jobs),
      interviewedJobs: parseInt(row.interviewed_jobs),
      rejectedJobs: parseInt(row.rejected_jobs),
      offeredJobs: parseInt(row.offered_jobs)
    };
  }

  async getRecentMatches(userId: string, limit: number = 5): Promise<JobMatch[]> {
    const query = `
      SELECT jm.*
      FROM jf_job_matches jm
      JOIN jf_job_preferences jp ON jm.preference_id = jp.id
      WHERE jp.user_id = $1
      ORDER BY jm.found_at DESC
      LIMIT $2
    `;

    const result = await this.query(query, [userId, limit]);
    return result.rows.map(row => this.mapRowToJobMatch(row));
  }

  async getMatchesBySourceWebsite(userId: string): Promise<Record<string, number>> {
    const query = `
      SELECT jm.source_website, COUNT(*) as count
      FROM jf_job_matches jm
      JOIN jf_job_preferences jp ON jm.preference_id = jp.id
      WHERE jp.user_id = $1
      GROUP BY jm.source_website
      ORDER BY count DESC
    `;

    const result = await this.query(query, [userId]);

    const stats: Record<string, number> = {};
    result.rows.forEach(row => {
      stats[row.source_website] = parseInt(row.count);
    });

    return stats;
  }

  async deleteOldMatches(daysOld: number = 90): Promise<number> {
    const query = `
      DELETE FROM jf_job_matches
      WHERE found_at < NOW() - INTERVAL '${daysOld} days'
    `;

    const result = await this.query(query);
    return result.rowCount || 0;
  }

  private generateJobHash(jobData: N8NJobFound): string {
    // Create a more sophisticated hash that handles variations
    const normalizedTitle = this.normalizeJobTitle(jobData.title);
    const normalizedCompany = this.normalizeCompanyName(jobData.company || '');
    const normalizedUrl = this.normalizeJobUrl(jobData.url);

    const hashInput = `${normalizedUrl}|${normalizedTitle}|${normalizedCompany}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private normalizeJobTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private normalizeCompanyName(company: string): string {
    return company
      .toLowerCase()
      .replace(/\b(inc|ltd|llc|corp|corporation|company|co)\b\.?/g, '') // Remove common suffixes
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private normalizeJobUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters and normalize
      const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      return cleanUrl.toLowerCase();
    } catch {
      // If URL parsing fails, just normalize the string
      return url.toLowerCase().replace(/[?#].*$/, ''); // Remove query params and fragments
    }
  }

  // Generate alternative hashes for fuzzy duplicate detection
  generateFuzzyHashes(jobData: N8NJobFound): string[] {
    const hashes: string[] = [];

    // Primary hash
    hashes.push(this.generateJobHash(jobData));

    // Hash without company (for jobs posted by multiple agencies)
    const hashWithoutCompany = crypto.createHash('sha256')
      .update(`${this.normalizeJobUrl(jobData.url)}|${this.normalizeJobTitle(jobData.title)}`)
      .digest('hex');
    hashes.push(hashWithoutCompany);

    // Hash with simplified title (remove seniority levels)
    const simplifiedTitle = this.normalizeJobTitle(jobData.title)
      .replace(/\b(senior|junior|lead|principal|staff)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (simplifiedTitle !== this.normalizeJobTitle(jobData.title)) {
      const hashWithSimplifiedTitle = crypto.createHash('sha256')
        .update(`${this.normalizeJobUrl(jobData.url)}|${simplifiedTitle}|${this.normalizeCompanyName(jobData.company || '')}`)
        .digest('hex');
      hashes.push(hashWithSimplifiedTitle);
    }

    return [...new Set(hashes)]; // Remove duplicates
  }

  private mapRowToJobMatch(row: any): JobMatch {
    return {
      id: row.id,
      preferenceId: row.preference_id,
      jobTitle: row.job_title,
      company: row.company,
      location: row.location,
      salary: row.salary,
      contractType: row.contract_type,
      jobUrl: row.job_url,
      sourceWebsite: row.source_website,
      jobDescription: row.job_description,
      requirements: row.requirements,
      foundAt: row.found_at,
      applicationStatus: row.application_status,
      alertSent: row.alert_sent,
      jobHash: row.job_hash
    };
  }

  // Data retention methods
  async findOldJobMatches(cutoffDate: Date, limit: number = 1000): Promise<JobMatch[]> {
    const query = `
      SELECT *
      FROM jf_job_matches
      WHERE found_at < $1
        AND archived_at IS NULL
      ORDER BY found_at ASC
      LIMIT $2
    `;

    const result = await this.query(query, [cutoffDate, limit]);
    return result.rows.map(row => this.mapRowToJobMatch(row));
  }

  async archiveJobMatches(jobMatchIds: string[]): Promise<number> {
    if (jobMatchIds.length === 0) return 0;

    const placeholders = jobMatchIds.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      UPDATE jf_job_matches
      SET archived_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
        AND archived_at IS NULL
    `;

    const result = await this.query(query, jobMatchIds);
    return result.rowCount || 0;
  }

  async cleanupOrphanedJobMatches(): Promise<number> {
    const query = `
      DELETE FROM jf_job_matches
      WHERE preference_id NOT IN (
        SELECT id FROM jf_job_preferences
      )
    `;

    const result = await this.query(query);
    return result.rowCount || 0;
  }

  async getRetentionStatistics(retentionDays: number): Promise<{
    totalJobMatches: number;
    jobMatchesNearExpiry: number;
    archivedJobMatches: number;
    oldestJobMatch?: Date;
    newestJobMatch?: Date;
  }> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - retentionDays);

    const query = `
      SELECT 
        COUNT(*) as total_job_matches,
        COUNT(CASE WHEN found_at < $1 THEN 1 END) as job_matches_near_expiry,
        COUNT(CASE WHEN archived_at IS NOT NULL THEN 1 END) as archived_job_matches,
        MIN(found_at) as oldest_job_match,
        MAX(found_at) as newest_job_match
      FROM jf_job_matches
    `;

    const result = await this.query(query, [expiryDate]);
    const row = result.rows[0];

    return {
      totalJobMatches: parseInt(row.total_job_matches),
      jobMatchesNearExpiry: parseInt(row.job_matches_near_expiry),
      archivedJobMatches: parseInt(row.archived_job_matches),
      oldestJobMatch: row.oldest_job_match ? new Date(row.oldest_job_match) : undefined,
      newestJobMatch: row.newest_job_match ? new Date(row.newest_job_match) : undefined,
    };
  }
}