import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  FileCopy,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material';
import { JobPreferences } from '../../types';

interface JobPreferencesCardProps {
  preferences: JobPreferences;
  onEdit: (preferences: JobPreferences) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (id: string, newName: string) => void;
}

const JobPreferencesCard: React.FC<JobPreferencesCardProps> = ({
  preferences,
  onEdit,
  onDelete,
  onToggleActive,
  onDuplicate,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(preferences);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(preferences.id);
    handleMenuClose();
  };

  const handleToggleActive = () => {
    onToggleActive(preferences.id);
    handleMenuClose();
  };

  const handleDuplicateClick = () => {
    setDuplicateName(`${preferences.profileName} (Copy)`);
    setDuplicateDialogOpen(true);
    handleMenuClose();
  };

  const handleDuplicateConfirm = () => {
    if (duplicateName.trim()) {
      onDuplicate(preferences.id, duplicateName.trim());
      setDuplicateDialogOpen(false);
      setDuplicateName('');
    }
  };

  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false);
    setDuplicateName('');
  };

  const formatSalaryRange = (range: { min?: number; max?: number; currency: string }) => {
    if (!range.min && !range.max) return 'Not specified';

    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('en-US').format(amount);
    };

    if (range.min && range.max) {
      return `${range.currency} ${formatAmount(range.min)} - ${formatAmount(range.max)}`;
    } else if (range.min) {
      return `${range.currency} ${formatAmount(range.min)}+`;
    } else if (range.max) {
      return `Up to ${range.currency} ${formatAmount(range.max)}`;
    }

    return 'Not specified';
  };

  const formatLocation = (location: JobPreferences['location']) => {
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country) parts.push(location.country);

    let locationStr = parts.join(', ');
    if (location.remote) {
      locationStr = locationStr ? `${locationStr}, Remote` : 'Remote';
    }

    return locationStr || 'Any location';
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          backgroundColor: preferences.isActive ? '#f8f9fa' : '#ffffff',
          border: preferences.isActive ? '2px solid #4caf50' : '1px solid #e0e0e0',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                {preferences.profileName}
                {preferences.isActive && (
                  <Chip
                    label="Active"
                    size="small"
                    color="success"
                    sx={{ ml: 2 }}
                  />
                )}
              </Typography>
            </Box>
            <IconButton onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Job Title:</strong> {preferences.jobTitle || 'Any'}
            </Typography>

            {preferences.keywords.length > 0 && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Keywords:</strong> {preferences.keywords.join(', ')}
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Location:</strong> {formatLocation(preferences.location)}
            </Typography>

            <Typography component="div" variant="body2" color="text.secondary" gutterBottom>
              <strong>Contract Types:</strong>
              <Box component="span" sx={{ ml: 1 }}>
                {preferences.contractTypes?.map((type) => (
                  <Chip
                    key={type}
                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Salary Range:</strong> {formatSalaryRange(preferences.salaryRange || { currency: 'GBP' })}
            </Typography>

            {preferences.contractTypes?.includes('contract') && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Day Rate:</strong> {formatSalaryRange(preferences.dayRateRange || { currency: 'GBP' })}
              </Typography>
            )}

            <Typography component="div" variant="body2" color="text.secondary" gutterBottom>
              <strong>Experience:</strong>
              <Box component="span" sx={{ ml: 1 }}>
                {preferences.experienceLevel?.map((level) => (
                  <Chip
                    key={level}
                    label={level.charAt(0).toUpperCase() + level.slice(1)}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            </Typography>

            <Typography component="div" variant="body2" color="text.secondary">
              <strong>Company Size:</strong>
              <Box component="span" sx={{ ml: 1 }}>
                {preferences.companySize?.map((size) => (
                  <Chip
                    key={size}
                    label={size.charAt(0).toUpperCase() + size.slice(1)}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(preferences.createdAt).toLocaleDateString()}
              {preferences.updatedAt !== preferences.createdAt && (
                <> • Updated: {new Date(preferences.updatedAt).toLocaleDateString()}</>
              )}
            </Typography>

            {!preferences.isActive && (
              <Chip
                label="Inactive"
                size="small"
                variant="outlined"
                color="default"
              />
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.isActive}
                onChange={handleToggleActive}
                color="primary"
              />
            }
            label={preferences.isActive ? 'Active' : 'Inactive'}
          />

          <Box>
            <Button
              size="small"
              startIcon={<Edit />}
              onClick={handleEdit}
              sx={{ mr: 1 }}
            >
              Edit
            </Button>
            <Button
              size="small"
              startIcon={<FileCopy />}
              onClick={handleDuplicateClick}
            >
              Duplicate
            </Button>
          </Box>
        </CardActions>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDuplicateClick}>
          <FileCopy sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={handleToggleActive}>
          {preferences.isActive ? <ToggleOff sx={{ mr: 1 }} /> : <ToggleOn sx={{ mr: 1 }} />}
          {preferences.isActive ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={duplicateDialogOpen} onClose={handleDuplicateCancel}>
        <DialogTitle>Duplicate Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Profile Name"
            fullWidth
            variant="outlined"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDuplicateCancel}>Cancel</Button>
          <Button onClick={handleDuplicateConfirm} variant="contained">
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobPreferencesCard;