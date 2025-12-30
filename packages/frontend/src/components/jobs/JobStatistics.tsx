import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Work as WorkIcon,
  Send as SendIcon,
  RecordVoiceOver as InterviewIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { JobStatistics as JobStatsType } from '../../types';

interface JobStatisticsProps {
  statistics: JobStatsType;
  isLoading?: boolean;
}

const JobStatistics: React.FC<JobStatisticsProps> = ({ statistics, isLoading = false }) => {
  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateApplicationRate = () => {
    if (statistics.totalMatches === 0) return 0;
    return Math.round((statistics.appliedJobs / statistics.totalMatches) * 100);
  };

  const calculateSuccessRate = () => {
    if (statistics.appliedJobs === 0) return 0;
    return Math.round((statistics.offeredJobs / statistics.appliedJobs) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'offered': return '#4caf50';
      case 'interviewed': return '#ff9800';
      case 'applied': return '#2196f3';
      case 'rejected': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (isLoading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Job Statistics
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Job Statistics
        </Typography>

        <Grid container spacing={2}>
          {/* Total matches */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <WorkIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="primary">
                {statistics.totalMatches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Matches
              </Typography>
            </Box>
          </Grid>

          {/* Applied jobs */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <SendIcon sx={{ fontSize: 32, color: getStatusColor('applied'), mb: 1 }} />
              <Typography variant="h4" component="div" sx={{ color: getStatusColor('applied') }}>
                {statistics.appliedJobs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Applied
              </Typography>
              <Tooltip title="Percentage of matches you've applied to">
                <Chip
                  label={`${calculateApplicationRate()}%`}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Tooltip>
            </Box>
          </Grid>

          {/* Interviewed */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <InterviewIcon sx={{ fontSize: 32, color: getStatusColor('interviewed'), mb: 1 }} />
              <Typography variant="h4" component="div" sx={{ color: getStatusColor('interviewed') }}>
                {statistics.interviewedJobs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Interviewed
              </Typography>
            </Box>
          </Grid>

          {/* Offered */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <CheckCircleIcon sx={{ fontSize: 32, color: getStatusColor('offered'), mb: 1 }} />
              <Typography variant="h4" component="div" sx={{ color: getStatusColor('offered') }}>
                {statistics.offeredJobs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Offered
              </Typography>
              <Tooltip title="Success rate from applications to offers">
                <Chip
                  label={`${calculateSuccessRate()}%`}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* Additional stats row */}
        <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center" gap={1}>
                <CancelIcon sx={{ color: getStatusColor('rejected') }} />
                <Typography variant="body2">
                  <strong>{statistics.rejectedJobs}</strong> Rejected
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center" gap={1}>
                <WorkIcon sx={{ color: 'primary.main' }} />
                <Typography variant="body2">
                  <strong>{statistics.activeProfiles}</strong> Active Profile{statistics.activeProfiles !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center" gap={1}>
                <ScheduleIcon sx={{ color: 'text.secondary' }} />
                <Typography variant="body2">
                  Last run: <strong>{formatDate(statistics.lastExecutionAt)}</strong>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Progress bars for visual representation */}
        <Box mt={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Application Progress
          </Typography>
          <Box mb={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption">Application Rate</Typography>
              <Typography variant="caption">{calculateApplicationRate()}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateApplicationRate()}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption">Success Rate</Typography>
              <Typography variant="caption">{calculateSuccessRate()}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateSuccessRate()}
              color="success"
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default JobStatistics;