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
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { JobPreferences } from '../../types';

interface ProfileOverviewProps {
  preferences: JobPreferences[];
  isLoading?: boolean;
}

const ProfileOverview: React.FC<ProfileOverviewProps> = ({ preferences, isLoading = false }) => {
  const activeProfiles = preferences.filter(p => p.isActive);
  const inactiveProfiles = preferences.filter(p => !p.isActive);

  const getProfileCompleteness = (profile: JobPreferences): number => {
    let score = 0;
    let maxScore = 8;

    // Profile name (required) - 1 point
    if (profile.profileName) score += 1;

    // Job title - 1 point
    if (profile.jobTitle) score += 1;

    // Keywords - 1 point
    if (profile.keywords.length > 0) score += 1;

    // Location - 1 point
    if (profile.location?.city || profile.location?.state || profile.location?.country || profile.location?.remote) {
      score += 1;
    }

    // Contract types - 1 point
    if (profile.contractTypes?.length > 0) score += 1;

    // Salary range - 1 point
    if (profile.salaryRange?.min || profile.salaryRange?.max) score += 1;

    // Experience level - 1 point
    if (profile.experienceLevel?.length > 0) score += 1;

    // Company size - 1 point
    if (profile.companySize?.length > 0) score += 1;

    return Math.round((score / maxScore) * 100);
  };

  const averageCompleteness = preferences.length > 0
    ? Math.round(preferences.reduce((sum, p) => sum + getProfileCompleteness(p), 0) / preferences.length)
    : 0;

  const getMostRecentProfile = () => {
    if (preferences.length === 0) return null;
    return preferences.reduce((latest, current) =>
      new Date(current.updatedAt) > new Date(latest.updatedAt) ? current : latest
    );
  };

  const recentProfile = getMostRecentProfile();

  if (isLoading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profile Overview
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
          Profile Overview
        </Typography>

        <Grid container spacing={3}>
          {/* Total profiles */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <WorkIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="primary">
                {preferences.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Profiles
              </Typography>
            </Box>
          </Grid>

          {/* Active profiles */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" component="div" sx={{ color: 'success.main' }}>
                {activeProfiles.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
            </Box>
          </Grid>

          {/* Inactive profiles */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <CancelIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h4" component="div" color="text.disabled">
                {inactiveProfiles.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive
              </Typography>
            </Box>
          </Grid>

          {/* Average completeness */}
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <ScheduleIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="info.main">
                {averageCompleteness}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg. Complete
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Profile completeness details */}
        {preferences.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Profile Completeness
            </Typography>
            {preferences.map((profile) => {
              const completeness = getProfileCompleteness(profile);
              return (
                <Box key={profile.id} mb={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        {profile.profileName}
                      </Typography>
                      {profile.isActive && (
                        <Chip label="Active" size="small" color="success" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {completeness}%
                    </Typography>
                  </Box>
                  <Tooltip title={`${completeness}% complete`}>
                    <LinearProgress
                      variant="determinate"
                      value={completeness}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: completeness >= 80 ? 'success.main' :
                            completeness >= 60 ? 'warning.main' : 'error.main'
                        }
                      }}
                    />
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Recent activity */}
        {recentProfile && (
          <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
            <Typography variant="subtitle2" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>{recentProfile.profileName}</strong> was last updated on{' '}
              {new Date(recentProfile.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          </Box>
        )}

        {/* Quick tips */}
        {preferences.length > 0 && averageCompleteness < 80 && (
          <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
            <Typography variant="subtitle2" gutterBottom color="warning.main">
              💡 Tips to improve your profiles:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Add specific job titles and keywords to get more targeted matches
              • Set salary ranges to filter out unsuitable positions
              • Specify location preferences including remote work options
              • Define experience levels and company size preferences
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileOverview;