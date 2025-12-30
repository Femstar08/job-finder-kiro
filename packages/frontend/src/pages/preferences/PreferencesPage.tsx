import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
  Container,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesApi, handleApiError } from '../../services/api';
import { JobPreferences, JobPreferencesFormData } from '../../types';
import JobPreferencesForm from '../../components/preferences/JobPreferencesForm';
import JobPreferencesCard from '../../components/preferences/JobPreferencesCard';
import ProfileOverview from '../../components/preferences/ProfileOverview';

const PreferencesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPreference, setEditingPreference] = useState<JobPreferences | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const response = await preferencesApi.getAll();
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: preferencesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      setCreateDialogOpen(false);
      showSnackbar('Job preferences created successfully!', 'success');
    },
    onError: (error) => {
      showSnackbar(handleApiError(error), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobPreferencesFormData> }) =>
      preferencesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      setEditingPreference(null);
      showSnackbar('Job preferences updated successfully!', 'success');
    },
    onError: (error) => {
      showSnackbar(handleApiError(error), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: preferencesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      showSnackbar('Job preferences deleted successfully!', 'success');
    },
    onError: (error) => {
      showSnackbar(handleApiError(error), 'error');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: preferencesApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      showSnackbar('Job preferences status updated!', 'success');
    },
    onError: (error) => {
      showSnackbar(handleApiError(error), 'error');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, profileName }: { id: string; profileName: string }) =>
      preferencesApi.duplicate(id, profileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      showSnackbar('Job preferences duplicated successfully!', 'success');
    },
    onError: (error) => {
      showSnackbar(handleApiError(error), 'error');
    },
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreate = async (data: JobPreferencesFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = (preference: JobPreferences) => {
    setEditingPreference(preference);
  };

  const handleUpdate = async (data: JobPreferencesFormData) => {
    if (editingPreference) {
      await updateMutation.mutateAsync({ id: editingPreference.id, data });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job preference profile?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleActive = async (id: string) => {
    await toggleMutation.mutateAsync(id);
  };

  const handleDuplicate = async (id: string, newName: string) => {
    await duplicateMutation.mutateAsync({ id, profileName: newName });
  };

  const convertPreferenceToFormData = (preference: JobPreferences): JobPreferencesFormData => {
    return {
      profileName: preference.profileName,
      jobTitle: preference.jobTitle || '',
      keywords: preference.keywords.join(', '),
      location: {
        city: preference.location.city || '',
        state: preference.location.state || '',
        country: preference.location.country || '',
        remote: preference.location.remote,
      },
      contractTypes: preference.contractTypes,
      salaryRange: {
        min: preference.salaryRange.min?.toString() || '',
        max: preference.salaryRange.max?.toString() || '',
        currency: preference.salaryRange.currency,
      },
      dayRateRange: {
        min: preference.dayRateRange.min?.toString() || '',
        max: preference.dayRateRange.max?.toString() || '',
        currency: preference.dayRateRange.currency,
      },
      experienceLevel: preference.experienceLevel,
      companySize: preference.companySize,
    };
  };

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
          Error loading preferences: {handleApiError(error)}
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box mt={4}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Job Preferences
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your job search profiles and criteria
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Profile
          </Button>
        </Box>

        {/* Profile Overview */}
        <ProfileOverview preferences={preferences || []} isLoading={isLoading} />

        {preferences && preferences.length > 0 ? (
          <Box>
            <Typography variant="h6" component="h2" gutterBottom>
              Your Profiles
            </Typography>
            {preferences.map((preference) => (
              <JobPreferencesCard
                key={preference.id}
                preferences={preference}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onDuplicate={handleDuplicate}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No job preferences found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first job search profile to start receiving job alerts
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Your First Profile
            </Button>
          </Box>
        )}

        {/* Create Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Job Preferences</DialogTitle>
          <DialogContent>
            <JobPreferencesForm
              onSubmit={handleCreate}
              onCancel={() => setCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
              submitLabel="Create Profile"
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={!!editingPreference}
          onClose={() => setEditingPreference(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Edit Job Preferences</DialogTitle>
          <DialogContent>
            {editingPreference && (
              <JobPreferencesForm
                initialData={convertPreferenceToFormData(editingPreference)}
                onSubmit={handleUpdate}
                onCancel={() => setEditingPreference(null)}
                isLoading={updateMutation.isPending}
                submitLabel="Update Profile"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default PreferencesPage;