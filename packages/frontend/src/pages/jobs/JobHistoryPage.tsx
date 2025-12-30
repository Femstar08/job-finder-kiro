import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../../services/api';
import { handleApiError } from '../../services/api';
import { ApplicationStatus } from '../../types';
import JobMatchCard from '../../components/jobs/JobMatchCard';
import JobFilters, { JobFiltersState } from '../../components/jobs/JobFilters';
import JobStatistics from '../../components/jobs/JobStatistics';
import Pagination from '../../components/common/Pagination';

const JobHistoryPage: React.FC = () => {
  const [filters, setFilters] = useState<JobFiltersState>({
    search: '',
    status: 'all',
    sourceWebsite: '',
    sortBy: 'foundAt',
    sortOrder: 'desc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch job matches with filters and pagination
  const { data: jobMatchesData, isLoading: isLoadingMatches, error: matchesError } = useQuery({
    queryKey: ['job-matches', filters, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.sourceWebsite) params.append('sourceWebsite', filters.sourceWebsite);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());

      const response = await jobsApi.getMatches(params.toString());
      return response.data.data;
    },
  });

  // Fetch job statistics
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
    queryKey: ['job-statistics'],
    queryFn: async () => {
      const response = await jobsApi.getStatistics();
      return response.data.data;
    },
  });

  // Get unique source websites for filter dropdown
  const sourceWebsites = useMemo(() => {
    if (!jobMatchesData?.matches) return [];
    const websites = new Set(jobMatchesData.matches.map(match => match.sourceWebsite));
    return Array.from(websites).sort();
  }, [jobMatchesData?.matches]);

  // Sort and filter matches locally for better UX
  const sortedMatches = useMemo(() => {
    if (!jobMatchesData?.matches) return [];

    let matches = [...jobMatchesData.matches];

    // Apply sorting
    matches.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'foundAt':
          aValue = new Date(a.foundAt).getTime();
          bValue = new Date(b.foundAt).getTime();
          break;
        case 'jobTitle':
          aValue = a.jobTitle.toLowerCase();
          bValue = b.jobTitle.toLowerCase();
          break;
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'applicationStatus':
          const statusOrder = { 'offered': 0, 'interviewed': 1, 'applied': 2, 'rejected': 3, 'not_applied': 4 };
          aValue = statusOrder[a.applicationStatus];
          bValue = statusOrder[b.applicationStatus];
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return matches;
  }, [jobMatchesData?.matches, filters.sortBy, filters.sortOrder]);

  const handleFiltersChange = (newFilters: JobFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleStatusUpdate = (jobId: string, newStatus: ApplicationStatus) => {
    // The mutation in JobMatchCard will handle the update and invalidate queries
    console.log(`Job ${jobId} status updated to ${newStatus}`);
  };

  if (matchesError) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">
            Error loading job history: {handleApiError(matchesError)}
          </Alert>
        </Box>
      </Container>
    );
  }

  const totalPages = jobMatchesData ? Math.ceil(jobMatchesData.total / pageSize) : 0;

  return (
    <Container maxWidth="lg">
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Job History
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          View and manage your job matches and application status
        </Typography>

        {/* Job Statistics */}
        {statistics && (
          <JobStatistics
            statistics={statistics}
            isLoading={isLoadingStats}
          />
        )}

        {/* Filters */}
        <JobFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          sourceWebsites={sourceWebsites}
          totalResults={jobMatchesData?.total || 0}
          isLoading={isLoadingMatches}
        />

        {/* Loading state */}
        {isLoadingMatches && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        )}

        {/* Job matches list */}
        {!isLoadingMatches && jobMatchesData && (
          <>
            {sortedMatches.length > 0 ? (
              <Box>
                {sortedMatches.map((match) => (
                  <JobMatchCard
                    key={match.id}
                    jobMatch={match}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={jobMatchesData.total}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  disabled={isLoadingMatches}
                />
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {filters.search || filters.status !== 'all' || filters.sourceWebsite
                    ? 'No job matches found for your current filters'
                    : 'No job matches found'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {filters.search || filters.status !== 'all' || filters.sourceWebsite
                    ? 'Try adjusting your search criteria or clearing the filters'
                    : 'Job matches will appear here when the N8N workflow finds jobs that match your preferences'
                  }
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default JobHistoryPage;