import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../../services/api';
import { handleApiError } from '../../services/api';

const DashboardPage: React.FC = () => {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await jobsApi.getDashboard();
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error">
          Error loading dashboard: {handleApiError(error)}
        </Typography>
      </Box>
    );
  }

  const stats = dashboardData?.statistics;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome to your Job Finder dashboard. Here's an overview of your job search activity.
      </Typography>

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Matches
              </Typography>
              <Typography variant="h4">
                {stats?.totalMatches || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Applied Jobs
              </Typography>
              <Typography variant="h4">
                {stats?.appliedJobs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Interviews
              </Typography>
              <Typography variant="h4">
                {stats?.interviewedJobs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Profiles
              </Typography>
              <Typography variant="h4">
                {stats?.activeProfiles || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Matches */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Job Matches
            </Typography>
            {dashboardData?.recentMatches && dashboardData.recentMatches.length > 0 ? (
              <Box>
                {dashboardData.recentMatches.map((match) => (
                  <Box key={match.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {match.jobTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {match.company} • {match.location} • {match.sourceWebsite}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Found: {new Date(match.foundAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                No recent job matches found. Make sure you have active job preferences set up.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;