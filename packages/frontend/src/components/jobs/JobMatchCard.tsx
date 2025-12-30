import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Link,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  OpenInNew as OpenInNewIcon,
  Work as WorkIcon,
  LocationOn as LocationOnIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { JobMatch, ApplicationStatus } from '../../types';
import { jobsApi } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface JobMatchCardProps {
  jobMatch: JobMatch;
  onStatusUpdate?: (id: string, status: ApplicationStatus) => void;
}

const statusColors: Record<ApplicationStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  not_applied: 'default',
  applied: 'info',
  interviewed: 'warning',
  rejected: 'error',
  offered: 'success',
};

const statusLabels: Record<ApplicationStatus, string> = {
  not_applied: 'Not Applied',
  applied: 'Applied',
  interviewed: 'Interviewed',
  rejected: 'Rejected',
  offered: 'Offered',
};

const JobMatchCard: React.FC<JobMatchCardProps> = ({ jobMatch, onStatusUpdate }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: ApplicationStatus) => {
      const response = await jobsApi.updateApplicationStatus(jobMatch.id, status);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-matches'] });
      queryClient.invalidateQueries({ queryKey: ['job-statistics'] });
      onStatusUpdate?.(jobMatch.id, data.applicationStatus);
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (status: ApplicationStatus) => {
    updateStatusMutation.mutate(status);
    handleMenuClose();
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSalary = (salary?: string) => {
    if (!salary) return null;
    return salary.length > 50 ? `${salary.substring(0, 50)}...` : salary;
  };

  return (
    <Card
      sx={{
        mb: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
        border: jobMatch.applicationStatus === 'offered' ? '2px solid #4caf50' :
          jobMatch.applicationStatus === 'interviewed' ? '2px solid #ff9800' :
            '1px solid #e0e0e0',
      }}
    >
      <CardContent>
        {/* Header with title and actions */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {jobMatch.jobTitle}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <BusinessIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {jobMatch.company || 'Company not specified'}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={statusLabels[jobMatch.applicationStatus]}
              color={statusColors[jobMatch.applicationStatus]}
              size="small"
            />
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              disabled={updateStatusMutation.isPending}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Job details */}
        <Box display="flex" flex-wrap="wrap" gap={2} mb={2}>
          {jobMatch.location && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <LocationOnIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {jobMatch.location}
              </Typography>
            </Box>
          )}

          {jobMatch.contractType && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <WorkIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {jobMatch.contractType}
              </Typography>
            </Box>
          )}

          {jobMatch.salary && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <AttachMoneyIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {formatSalary(jobMatch.salary)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Job description preview */}
        {jobMatch.jobDescription && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {jobMatch.jobDescription}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Footer with metadata and actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Found: {formatDate(jobMatch.foundAt)}
              </Typography>
            </Box>

            <Chip
              label={jobMatch.sourceWebsite}
              size="small"
              variant="outlined"
            />

            {jobMatch.alertSent && (
              <Tooltip title="Alert was sent for this job">
                <Chip
                  label="Alerted"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon />}
            component={Link}
            href={jobMatch.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Job
          </Button>
        </Box>
      </CardContent>

      {/* Status change menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {Object.entries(statusLabels).map(([status, label]) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status as ApplicationStatus)}
            disabled={jobMatch.applicationStatus === status}
            sx={{
              color: jobMatch.applicationStatus === status ? 'text.disabled' : 'inherit',
            }}
          >
            <Chip
              label={label}
              color={statusColors[status as ApplicationStatus]}
              size="small"
              sx={{ mr: 1, minWidth: 80 }}
            />
            {jobMatch.applicationStatus === status && '(Current)'}
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
};

export default JobMatchCard;